export type SessionPayload = {
  accountId: number;
  mode: 'server' | 'local';
};

export const LOCAL_SESSION_KEY = 'lifeos_session';

/** Saves session info locally to browser localStorage. */
export function saveLocalSession(payload: SessionPayload) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(payload));
}

/** Reads and parses local session info from localStorage (with backward compatibility). */
export function readLocalSession(): SessionPayload | null {
  if (typeof window === 'undefined') return null;
  const str = localStorage.getItem(LOCAL_SESSION_KEY);
  if (!str) return null;
  
  try {
    // If it's already a JSON string
    if (str.trim().startsWith('{')) {
      return JSON.parse(str) as SessionPayload;
    }
    
    // Backward compatibility: If it is the old base64url signed token (body.signature)
    const [body] = str.split('.');
    if (!body) return null;
    
    // base64url decode
    const base64 = body.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonStr) as SessionPayload;
  } catch {
    return null;
  }
}

/** Clears local session info from localStorage. */
export function clearLocalSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_SESSION_KEY);
}
