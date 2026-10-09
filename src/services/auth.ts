/**
 * Teacher / Admin login (server ke saath).
 * Token sirf memory mein rehta hai: page refresh = logout. Students ke paas kabhi token nahi hota.
 * Token har `/api/...` request mein apne aap lag jaata hai, isliye storage/localDb ko badalna nahi padta.
 */

export type StaffRole = 'admin' | 'teacher';
export interface StaffUser {
  role: StaffRole;
  teacherId: string | null;
  name: string;
}
export interface TeacherPublic {
  id: string;
  name: string;
}
export interface TeacherRecord extends TeacherPublic {
  username: string;
  createdAt?: string;
  testCount: number;
}
/** ExamTest par teacher ki jaankari (types.ts badle bina) */
export type TeacherOwned = { teacherId?: string; teacherName?: string };

export const AUTH_EXPIRED_EVENT = 'mce-auth-expired';

let token: string | null = null;
let user: StaffUser | null = null;

// ---- har /api/ request mein token lagao ----
if (typeof window !== 'undefined' && !(window as unknown as { __mceFetchPatched?: boolean }).__mceFetchPatched) {
  (window as unknown as { __mceFetchPatched?: boolean }).__mceFetchPatched = true;
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const isApi = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`);
    if (!isApi || !token) return origFetch(input, init);

    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    const res = await origFetch(input, { ...init, headers });
    if (res.status === 401 && token) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT)); // session khatam
    return res;
  };
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Kuch galat ho gaya. Dobara try karo.');
  return data as T;
}

export const auth = {
  getUser: (): StaffUser | null => user,
  isAdmin: () => user?.role === 'admin',
  isTeacher: () => user?.role === 'teacher',

  /** Home page par dikhne wale teachers ke naam */
  listTeachers: () => call<TeacherPublic[]>('GET', '/api/teachers/public'),

  async login(role: StaffRole, username: string, password: string, teacherId?: string): Promise<StaffUser> {
    const r = await call<{ token: string; role: StaffRole; teacherId: string | null; name: string }>('POST', '/api/auth/login', {
      role,
      teacherId,
      username,
      password,
    });
    token = r.token;
    user = { role: r.role, teacherId: r.teacherId, name: r.name };
    return user;
  },

  async logout(): Promise<void> {
    const had = token;
    // Pehle local clear, taaki aage ki koi bhi request staff ki tarah na jaye
    token = null;
    user = null;
    if (had) {
      try {
        await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${had}` } });
      } catch {
        /* server band ho to bhi logout ho chuka hai */
      }
    }
  },

  /** Local state turant saaf (session expire hone par) */
  forget(): void {
    token = null;
    user = null;
  },

  changePassword: (oldPassword: string, newPassword: string) =>
    call<{ ok: true }>('POST', '/api/auth/password', { oldPassword, newPassword }),

  // ---- sirf admin ----
  admin: {
    list: () => call<TeacherRecord[]>('GET', '/api/admin/teachers'),
    create: (t: { name: string; username: string; password: string }) => call<TeacherRecord>('POST', '/api/admin/teachers', t),
    update: (id: string, t: { name?: string; username?: string; password?: string }) =>
      call<TeacherRecord>('PUT', `/api/admin/teachers/${encodeURIComponent(id)}`, t),
    remove: (id: string) => call<{ ok: true }>('DELETE', `/api/admin/teachers/${encodeURIComponent(id)}`),
  },
};
