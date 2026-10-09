// server-openrouter.js  —  run with:
//   npm i express
//   OPENROUTER_API_KEY=your_key node server-openrouter.js
// Requires Node 18+ (built-in fetch). Uses the same public/index.html as before.

const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const API_KEY = process.env.OPENROUTER_API_KEY;

// Free models end with ":free". Several are listed so that if one is busy or
// rate-limited, the server automatically tries the next. Check
// https://openrouter.ai/models?max_price=0 for the current free models and
// change this list (or set OPENROUTER_MODELS as a comma-separated list).
const MODELS = (
  process.env.OPENROUTER_MODELS ||
  "openai/gpt-oss-120b:free,meta-llama/llama-3.3-70b-instruct:free,google/gemma-3-27b-it:free"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const ALLOWED_COUNTS = [15, 20, 30];

function buildPrompt(topic, count, difficulty) {
  return `Create a Java multiple-choice test.

Topic: ${topic}
Number of questions: ${count}
Difficulty: ${difficulty}

Rules:
- Exactly ${count} questions, all about the topic above (Java only).
- Each question has exactly 4 options and exactly one correct answer.
- Mix concept questions and "what is the output?" code questions.
- If a question uses code, put the code in the "code" field (plain text, no markdown fences). Otherwise use "".
- "answer" is the index (0-3) of the correct option.
- "explanation" is 1-2 sentences on why the answer is correct.
- No duplicate questions.

Return ONLY valid JSON, no markdown, no extra text, in this shape:
{"topic":"...","questions":[{"question":"...","code":"","options":["A","B","C","D"],"answer":0,"explanation":"..."}]}`;
}

function extractJson(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  return JSON.parse(clean.slice(start, end + 1));
}

function isValid(quiz, count) {
  return (
    quiz &&
    Array.isArray(quiz.questions) &&
    quiz.questions.length === count &&
    quiz.questions.every(
      (q) =>
        typeof q.question === "string" &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        Number.isInteger(q.answer) &&
        q.answer >= 0 &&
        q.answer <= 3
    )
  );
}

async function callModel(model, prompt) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      // Optional headers OpenRouter uses to identify your app
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Java Test Generator",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${model} error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${model} returned an empty response`);
  return text;
}

app.post("/api/generate-test", async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: "OPENROUTER_API_KEY is not set on the server." });

    const topic = String(req.body.topic || "").trim().slice(0, 100);
    const count = Number(req.body.count);
    const difficulty = ["easy", "medium", "hard"].includes(req.body.difficulty)
      ? req.body.difficulty
      : "medium";

    if (!topic) return res.status(400).json({ error: "Enter a topic." });
    if (!ALLOWED_COUNTS.includes(count))
      return res.status(400).json({ error: "Choose 15, 20 or 30 questions." });

    const prompt = buildPrompt(topic, count, difficulty);

    // Try each free model in order until one returns a valid test
    for (const model of MODELS) {
      try {
        const text = await callModel(model, prompt);
        const quiz = extractJson(text);
        if (isValid(quiz, count)) return res.json(quiz);
        console.warn(`${model}: response was not a valid ${count}-question test`);
      } catch (e) {
        console.warn(e.message);
      }
    }
    res.status(502).json({
      error: "Free models are busy or returned an invalid test. Try again in a minute, or choose fewer questions.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong while generating the test." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
