// Demo stand-in for 'firebase/auth' (only used when EXPO_PUBLIC_DEMO=1).
export type User = { uid: string; email: string | null; displayName: string | null; photoURL: string | null; getIdToken: () => Promise<string> };

const demoUser: User = {
  uid: 'demo-user',
  email: 'andre@aquastainable.app',
  displayName: 'Andre',
  photoURL: null,
  getIdToken: async () => 'demo-token',
};

let current: User | null = demoUser;
const listeners = new Set<(user: User | null) => void>();
const emit = () => listeners.forEach((listener) => listener(current));

export const getAuth = (_app?: unknown) => ({ get currentUser() { return current; } });

export function onAuthStateChanged(_auth: unknown, callback: (user: User | null) => void) {
  listeners.add(callback);
  setTimeout(() => callback(current), 0);
  return () => listeners.delete(callback);
}

export async function signInWithEmailAndPassword(_auth: unknown, _email: string, _password: string) {
  current = demoUser;
  emit();
  return { user: demoUser };
}

export const createUserWithEmailAndPassword = signInWithEmailAndPassword;

export async function signOut(_auth: unknown) {
  current = null;
  emit();
}
