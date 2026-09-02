import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { login as loginRequest, signup as signupRequest } from '../api.js';

const AuthContext = createContext(null);
const STORAGE_KEY = 'vv_auth';
const ACCOUNT_KEY = 'vv_has_account';
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

function readStoredAuth() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);
  const [loginError, setLoginError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [hasAccount, setHasAccount] = useState(() => !!localStorage.getItem(ACCOUNT_KEY));
  const timeoutRef = useRef(null);

  const persist = useCallback((value) => {
    setAuth(value);
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const logout = useCallback(
    (expired = false) => {
      persist(null);
      setSessionExpired(expired);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [persist]
  );

  const login = useCallback(
    async (username, password) => {
      setLoggingIn(true);
      setLoginError(null);
      try {
        const res = await loginRequest(username, password);
        const session = {
          token: res?.token || 'demo-token',
          user: res?.user || { name: username, role: 'admin' },
        };
        persist(session);
        setSessionExpired(false);
        localStorage.setItem(ACCOUNT_KEY, '1');
        setHasAccount(true);
        return true;
      } catch (err) {
        // Network failure (no /auth/login endpoint yet) falls back to a demo
        // session so the rest of the UI stays explorable; a real credential
        // rejection (non-2xx JSON error) still blocks sign-in.
        if (err.message?.includes('Could not reach the server')) {
          persist({ token: 'demo-token', user: { name: username, role: 'admin' } });
          setSessionExpired(false);
          localStorage.setItem(ACCOUNT_KEY, '1');
          setHasAccount(true);
          return true;
        }
        setLoginError(err.message || 'Invalid credentials.');
        return false;
      } finally {
        setLoggingIn(false);
      }
    },
    [persist]
  );

  const signup = useCallback(
    async (username, password) => {
      setLoggingIn(true);
      setLoginError(null);
      try {
        const res = await signupRequest(username, password);
        const session = {
          token: res?.token || 'demo-token',
          user: res?.user || { name: username, role: 'admin' },
        };
        persist(session);
        setSessionExpired(false);
        localStorage.setItem(ACCOUNT_KEY, '1');
        setHasAccount(true);
        return true;
      } catch (err) {
        // Network failure fallback — same as login demo mode
        if (err.message?.includes('Could not reach the server')) {
          persist({ token: 'demo-token', user: { name: username, role: 'admin' } });
          setSessionExpired(false);
          localStorage.setItem(ACCOUNT_KEY, '1');
          setHasAccount(true);
          return true;
        }
        setLoginError(err.message || 'Could not create account.');
        return false;
      } finally {
        setLoggingIn(false);
      }
    },
    [persist]
  );

  // 15-minute inactivity auto-logout
  useEffect(() => {
    if (!auth) return undefined;

    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => logout(true), INACTIVITY_LIMIT_MS);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer));
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [auth, logout]);

  const value = useMemo(
    () => ({
      isAuthenticated: !!auth,
      user: auth?.user || null,
      role: auth?.user?.role || null,
      hasAccount,
      login,
      signup,
      logout,
      loginError,
      loggingIn,
      sessionExpired,
      clearSessionExpired: () => setSessionExpired(false),
    }),
    [auth, hasAccount, login, signup, logout, loginError, loggingIn, sessionExpired]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
