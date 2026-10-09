/** Access PIN helpers: admin ka banaya hua 6-digit PIN jo student ko test shuru karne se pehle dalna hota hai. */

export const generatePin = (): string => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + (buf[0] % 900000)); // 100000-999999
};

export const normalizePin = (v: unknown): string => String(v ?? '').trim().toLowerCase();

export const pinMatches = (entered: unknown, expected: unknown): boolean =>
  normalizePin(expected) !== '' && normalizePin(entered) === normalizePin(expected);
