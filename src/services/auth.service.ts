"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";

function requireAuth() {
  const auth = firebaseAuth();
  if (!auth) {
    throw new Error(
      "Firebase is not configured. Copy .env.local.example to .env.local and fill the NEXT_PUBLIC_FIREBASE_* values."
    );
  }
  return auth;
}

export async function registerWithEmail(name: string, email: string, password: string) {
  const auth = requireAuth();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  return cred.user;
}

export async function loginWithEmail(email: string, password: string) {
  const auth = requireAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithGoogle() {
  const auth = requireAuth();
  const cred = await signInWithPopup(auth, new GoogleAuthProvider());
  return cred.user;
}

export async function logout() {
  const auth = requireAuth();
  await signOut(auth);
}

export async function resetPassword(email: string) {
  const auth = requireAuth();
  await sendPasswordResetEmail(auth, email);
}

export function subscribeAuth(callback: (user: User | null) => void) {
  const auth = firebaseAuth();
  if (!auth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, callback);
}
