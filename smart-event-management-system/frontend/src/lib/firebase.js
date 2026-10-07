import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut,
  isSignInWithEmailLink,
  updateProfile,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"];
export const firebaseConfigured = requiredKeys.every((key) => Boolean(firebaseConfig[key]));

let auth = null;

if (firebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

export const firebaseAuth = auth;

const LOGIN_EMAIL_KEY = "eventsphere.firebase.email-link";

function ensureConfigured() {
  if (!firebaseAuth) {
    throw new Error("Firebase Authentication is not configured. Add the VITE_FIREBASE_* environment variables.");
  }
}

export async function registerFirebaseUser(email, password, name) {
  ensureConfigured();
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
  if (name?.trim()) {
    await updateProfile(credential.user, { displayName: name.trim() });
  }
  await sendFirebaseVerificationEmail();
  return credential.user;
}

export async function signInFirebaseUser(email, password) {
  ensureConfigured();
  const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
  return credential.user;
}

export async function sendFirebaseVerificationEmail() {
  ensureConfigured();
  if (!firebaseAuth.currentUser) throw new Error("No signed-in Firebase user.");
  await sendEmailVerification(firebaseAuth.currentUser, {
    url: `${window.location.origin}/verify-email`,
    handleCodeInApp: false,
  });
}

export async function reloadFirebaseUser() {
  ensureConfigured();
  if (!firebaseAuth.currentUser) return null;
  await firebaseAuth.currentUser.reload();
  return firebaseAuth.currentUser;
}

export async function sendFirebasePasswordReset(email) {
  ensureConfigured();
  await sendPasswordResetEmail(firebaseAuth, email.trim().toLowerCase());
}

export async function getFirebaseIdToken(forceRefresh = true) {
  ensureConfigured();
  if (!firebaseAuth.currentUser) throw new Error("No signed-in Firebase user.");
  return firebaseAuth.currentUser.getIdToken(forceRefresh);
}

export async function sendFirebaseEmailLink(email) {
  ensureConfigured();
  const cleanEmail = email.trim().toLowerCase();
  await sendSignInLinkToEmail(firebaseAuth, cleanEmail, {
    url: `${window.location.origin}/login`,
    handleCodeInApp: true,
  });
  localStorage.setItem(LOGIN_EMAIL_KEY, cleanEmail);
}

export function isFirebaseEmailLink() {
  return Boolean(firebaseAuth && isSignInWithEmailLink(firebaseAuth, window.location.href));
}

export async function completeFirebaseEmailLink(email) {
  ensureConfigured();
  const cleanEmail = email.trim().toLowerCase();
  const credential = await signInWithEmailLink(firebaseAuth, cleanEmail, window.location.href);
  localStorage.removeItem(LOGIN_EMAIL_KEY);
  return credential.user;
}

export function getStoredFirebaseLinkEmail() {
  return localStorage.getItem(LOGIN_EMAIL_KEY) || "";
}

export async function signOutFirebase() {
  if (firebaseAuth?.currentUser) await signOut(firebaseAuth);
}
