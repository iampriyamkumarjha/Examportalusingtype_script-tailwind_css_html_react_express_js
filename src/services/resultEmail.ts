/**
 * Result email: browser sirf Express server (server.mjs) ko bolta hai,
 * baaki kaam (Firestore se students padhna, Gmail se mail bhejna) server karta hai.
 */
export interface BulkEmailReport {
  total: number;
  sent: number;
  failed: { name: string; email: string; reason: string }[];
  noEmail: string[];
}

export async function requestSendResults(testId: string): Promise<BulkEmailReport> {
  let res: Response;
  try {
    res = await fetch('/api/send-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId }),
    });
  } catch {
    throw new Error('Server se connect nahi ho paya. Terminal mein "npm run dev" chal raha hai?');
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    throw new Error('Email server nahi chal raha. Project ko "npm run dev" se start karo (ye server.mjs chalata hai).');
  }
  if (!res.ok) throw new Error(data?.error || `Server error (${res.status})`);
  return data as BulkEmailReport;
}
