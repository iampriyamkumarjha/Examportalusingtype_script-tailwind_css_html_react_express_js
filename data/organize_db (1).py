import json, sys

src = sys.argv[1] if len(sys.argv) > 1 else "db.json"
dst = sys.argv[2] if len(sys.argv) > 2 else "db_organized.json"
d = json.load(open(src, encoding="utf-8"))

# ---------- 1. STUDENT SECTION  (key = roll number) ----------
student_section = {}
for s in d.get("students", {}).values():
    student_section[s["rollNumber"]] = {
        "profile": {
            "id": s["id"], "name": s["name"], "rollNumber": s["rollNumber"],
            "regNumber": s["regNumber"], "department": s["department"],
            "email": s["email"], "createdAt": s["createdAt"],
        },
        "login": {"password": s["password"]},
        "status": s["status"],
    }

# ---------- 2. ADMIN SECTION ----------
admin_section = d.get("adminConfig", {})

# ---------- 3. TEST SECTION  (key = test code) ----------
test_section = {}
for t in d.get("tests", {}).values():
    test_section[t["code"]] = {
        "info": {k: t[k] for k in ("id", "title", "code", "subject", "paperRef",
                                   "department", "durationMinutes",
                                   "passingPercentage", "markingScheme") if k in t},
        "settings": {k: t[k] for k in ("status", "accessPin", "proctorRules") if k in t},
        "result": {k: t[k] for k in ("resultPublished", "resultPublishedAt",
                                     "resultEmailedAt", "resultEmailedCount") if k in t},
        "updatedAt": t.get("updatedAt"),
        "questions": t["questions"],
    }

# ---------- 4. RESPONSE SECTION  (testCode -> rollNumber) ----------
response_section = {}
for r in d.get("submissions", {}).values():
    code, roll = r["testCode"], r["studentRoll"]
    response_section.setdefault(code, {})[roll] = {
        "submissionId": r["id"],
        "student": {"id": r["studentId"], "name": r["studentName"],
                    "rollNumber": roll, "regNumber": r["studentReg"],
                    "email": r["studentEmail"], "department": r["studentDepartment"]},
        "test": {"id": r["testId"], "title": r["testTitle"], "code": code},
        "score": {"totalMarks": r["totalMarks"], "maxMarks": r["maxMarks"],
                  "percentage": r["percentageScore"], "passed": r["passed"],
                  "correct": r["correctAnswersCount"],
                  "incorrect": r["incorrectAnswersCount"],
                  "unattempted": r["unattemptedCount"]},
        "proctoring": {"isViolation": r["isViolation"],
                       "violationReason": r["violationReason"],
                       "tabSwitchCount": r["tabSwitchCount"]},
        "timeSpentSeconds": r["timeSpentSeconds"],
        "submittedAt": r["submittedAt"],
        "answers": r["answers"],
    }

out = {
    "adminSection": admin_section,
    "studentSection": student_section,
    "testSection": test_section,
    "responseSection": response_section,
}
json.dump(out, open(dst, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print("done ->", dst)
