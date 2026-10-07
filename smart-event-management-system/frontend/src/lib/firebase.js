import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  setPersistence,
  signInWithEmailLink,
  signOut,
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

const REGISTER_EMAIL_KEY = "eventsphere.firebase.register.email";
const LOGIN_EMAIL_KEY = "eventsphere.firebase.login.email";

export async function sendFirebaseEmailLink(email, flow = "login") {
  if (!firebaseAuth) {
    throw new Error("Firebase Authentication is not configured. Add the VITE_FIREBASE_* environment variables.");
  }

  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    throw new Error("Enter a valid email address.");
  }

  const path = flow === "register" ? "/verify-email" : "/login";
  const actionCodeSettings = {
    url: `${window.location.origin}${path}`,
    handleCodeInApp: true,
  };

  await sendSignInLinkToEmail(firebaseAuth, cleanEmail, actionCodeSettings);
  localStorage.setItem(flow === "register" ? REGISTER_EMAIL_KEY : LOGIN_EMAIL_KEY, cleanEmail);
  return cleanEmail;
}

export function getStoredFirebaseEmail(flow = "login") {
  return localStorage.getItem(flow === "register" ? REGISTER_EMAIL_KEY : LOGIN_EMAIL_KEY) || "";
}

export function clearStoredFirebaseEmail(flow = "login") {
  localStorage.removeItem(flow === "register" ? REGISTER_EMAIL_KEY : LOGIN_EMAIL_KEY);
}

export function isFirebaseEmailLink() {
  return Boolean(firebaseAuth && isSignInWithEmailLink(firebaseAuth, window.location.href));
}

export async function completeFirebaseEmailLink(email) {
  if (!firebaseAuth) {
    throw new Error("Firebase Authentication is not configured.");
  }

  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error("Enter the email address used to request the verification link.");
  }

  const credential = await signInWithEmailLink(firebaseAuth, cleanEmail, window.location.href);
  const idToken = await credential.user.getIdToken(true);
  return { user: credential.user, idToken };
}

export async function signOutFirebase() {
  if (firebaseAuth) {
    await signOut(firebaseAuth);
  }
}
