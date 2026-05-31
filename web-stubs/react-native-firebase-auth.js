export default () => ({
  onAuthStateChanged: () => () => {},
  signInWithEmailAndPassword: async () => {},
  createUserWithEmailAndPassword: async () => {},
  signInAnonymously: async () => {},
  signOut: async () => {},
  currentUser: null,
  GoogleAuthProvider: { credential: () => ({}) },
  OAuthProvider: { credential: () => ({}) },
});
export const GoogleAuthProvider = { credential: () => ({}) };
export const OAuthProvider = class { constructor() {} addScope() {} };
