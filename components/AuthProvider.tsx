"use client";

import { ReactNode, useEffect, useState, createContext, useContext } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebaseClient";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";

interface AuthContextShape {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          const basic: any = {
            uid: u.uid,
            name: u.displayName || "",
            email: u.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (u.photoURL) basic.photoURL = u.photoURL;
          await setDoc(ref, basic, { merge: true });
        }
        // Realtime subscribe to profile so Navbar updates when onboarding completes
        unsubProfile = onSnapshot(ref, (docSnap) => {
          setProfile((docSnap.data() as UserProfile) || null);
        });
      } else {
        if (unsubProfile) unsubProfile();
        setProfile(null);
      }
      setLoading(false);
    });
    return () => {
      if (unsubProfile) unsubProfile();
      unsubAuth();
    };
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      // Update Firebase Auth displayName
      await updateProfile(cred.user, { displayName: name });
    }
    // Ensure user doc exists/updates with name
    const ref = doc(db, "users", cred.user.uid);
    const data: any = {
      uid: cred.user.uid,
      name: name || cred.user.displayName || "",
      email: cred.user.email,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };
    if (cred.user.photoURL) data.photoURL = cred.user.photoURL;
    await setDoc(ref, data, { merge: true });
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOutUser, signUpWithEmail, signInWithEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
