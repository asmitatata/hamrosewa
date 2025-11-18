import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const clientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBLfleLHBtL7EiNloFrvIysEf219RmfcU0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "hamrosewa-6e177.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hamrosewa-6e177",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "hamrosewa-6e177.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "307375182093",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:307375182093:web:31636030959a077c9fa044",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-LJG6B2590B",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(clientConfig);
export const auth = getAuth(firebaseApp);
// Ensure sessions persist across refreshes
setPersistence(auth, browserLocalPersistence).catch(() => {});
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(firebaseApp);
