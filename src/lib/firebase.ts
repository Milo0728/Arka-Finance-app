"use client";

import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY;
const APPCHECK_DEBUG_TOKEN = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _appCheck: AppCheck | null = null;

function ensureAppCheck(app: FirebaseApp) {
  if (_appCheck || typeof window === "undefined" || !RECAPTCHA_SITE_KEY) return;

  // Debug token lets you hit App Check-protected services from dev without solving reCAPTCHA.
  // In Firebase console → App Check → Apps → Manage debug tokens, paste the value printed
  // in the browser console the first time this runs (or set the token explicitly here).
  if (process.env.NODE_ENV !== "production" && APPCHECK_DEBUG_TOKEN) {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      APPCHECK_DEBUG_TOKEN === "true" ? true : APPCHECK_DEBUG_TOKEN;
  }

  try {
    _appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    // App Check can throw if initialised twice (e.g. React StrictMode); swallow silently.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[Arka] App Check init skipped:", err);
    }
  }
}

export function firebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  ensureAppCheck(_app);
  return _app;
}

export function firebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null;
  if (_auth) return _auth;
  const app = firebaseApp();
  _auth = app ? getAuth(app) : null;
  return _auth;
}

export function firestore(): Firestore | null {
  if (!isFirebaseConfigured) return null;
  if (_db) return _db;
  const app = firebaseApp();
  _db = app ? getFirestore(app) : null;
  return _db;
}

export const googleProvider = new GoogleAuthProvider();
