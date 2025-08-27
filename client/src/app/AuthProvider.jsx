import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, googleProvider } from "../lib/firebase.js";
import { onIdTokenChanged, signInWithPopup, signOut } from "firebase/auth";

const Ctx = createContext({
  user: null,
  token: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Keeps auth state & ID token fresh
    return onIdTokenChanged(auth, async (u) => {
      setUser(u);
      setToken(u ? await u.getIdToken() : null);
      setLoading(false);
    });
  }, []);

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setToken(null);
  };

  const value = useMemo(
    () => ({ user, token, loading, loginWithGoogle, logout }),
    [user, token, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
