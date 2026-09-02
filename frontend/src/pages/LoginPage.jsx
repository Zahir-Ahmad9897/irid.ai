import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Fingerprint, Loader2, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBanner from '../components/StatusBanner.jsx';

export default function LoginPage() {
  const { login, signup, loginError, loggingIn, isAuthenticated, hasAccount, sessionExpired, clearSessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState({ username: false, password: false, confirmPassword: false });
  const [isSignUp, setIsSignUp] = useState(!hasAccount);
  const [localError, setLocalError] = useState(null);

  const usernameError = touched.username && !username.trim() ? 'Username is required.' : null;
  const passwordError = touched.password && !password ? 'Password is required.' : null;
  const confirmError = isSignUp && touched.confirmPassword && password !== confirmPassword ? 'Passwords do not match.' : null;

  const redirectTo = location.state?.from || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true });
  }, [isAuthenticated, navigate, redirectTo]);

  const toggleMode = () => {
    setIsSignUp((prev) => !prev);
    setLocalError(null);
    setTouched({ username: false, password: false, confirmPassword: false });
    setConfirmPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setTouched({ username: true, password: true, confirmPassword: true });
    if (!username.trim() || !password) return;

    if (isSignUp) {
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) return;
      const ok = await signup(username.trim(), password);
      if (ok) navigate(redirectTo, { replace: true });
    } else {
      const ok = await login(username.trim(), password);
      if (ok) navigate(redirectTo, { replace: true });
    }
  };

  const displayError = localError || loginError;

  return (
    <div className="min-h-screen flex items-center justify-center px-md">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center mb-lg">
          <div className="w-14 h-14 rounded-xl border-brass flex items-center justify-center bg-surface-elevated mb-md animate-float">
            <Fingerprint className="w-7 h-7 text-accent-brass" />
          </div>
          <h1 className="text-headline-lg text-brass">irid.ai</h1>
          <p className="text-body-sm text-on-surface-muted mt-xs">
            {isSignUp ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flat-card p-lg space-y-md">
          {sessionExpired && (
            <StatusBanner
              type="info"
              message="You were signed out after 15 minutes of inactivity."
              onDismiss={clearSessionExpired}
            />
          )}
          {displayError && <StatusBanner type="error" message={displayError} />}

          <div className="space-y-xs">
            <label htmlFor="username" className="block text-label-md text-on-surface">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, username: true }))}
              aria-invalid={usernameError ? 'true' : undefined}
              aria-describedby={usernameError ? 'username-error' : undefined}
              className={`w-full min-h-[44px] px-md py-sm rounded-md input-flat text-body-md ${usernameError ? 'border-red-500' : ''}`}
              required
            />
            {usernameError && (
              <p id="username-error" className="text-sm text-red-500">
                {usernameError}
              </p>
            )}
          </div>

          <div className="space-y-xs">
            <label htmlFor="password" className="block text-label-md text-on-surface">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              aria-invalid={passwordError ? 'true' : undefined}
              aria-describedby={passwordError ? 'password-error' : undefined}
              className={`w-full min-h-[44px] px-md py-sm rounded-md input-flat text-body-md ${passwordError ? 'border-red-500' : ''}`}
              required
            />
            {passwordError && (
              <p id="password-error" className="text-sm text-red-500">
                {passwordError}
              </p>
            )}
          </div>

          {isSignUp && (
            <div className="space-y-xs animate-fade-in">
              <label htmlFor="confirm-password" className="block text-label-md text-on-surface">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                aria-invalid={confirmError ? 'true' : undefined}
                aria-describedby={confirmError ? 'confirm-error' : undefined}
                className={`w-full min-h-[44px] px-md py-sm rounded-md input-flat text-body-md ${confirmError ? 'border-red-500' : ''}`}
                required
              />
              {confirmError && (
                <p id="confirm-error" className="text-sm text-red-500">
                  {confirmError}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loggingIn}
            aria-disabled={loggingIn}
            className="w-full btn-primary py-sm px-6 rounded-lg flex items-center justify-center gap-sm text-body-md min-h-[44px] transition-all duration-150 ease-in-out motion-reduce:transition-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            {loggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isSignUp ? (
              <UserPlus className="w-5 h-5" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            {loggingIn
              ? isSignUp ? 'Creating account…' : 'Signing in…'
              : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <p className="text-caption text-on-surface-muted text-center">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button type="button" onClick={toggleMode} className="text-accent-brass hover:underline font-medium">
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <button type="button" onClick={toggleMode} className="text-accent-brass hover:underline font-medium">
                  Sign up
                </button>
              </>
            )}
          </p>

          <p className="text-caption text-on-surface-muted text-center">
            Sessions auto-lock after 15 minutes of inactivity.
          </p>
        </form>
      </div>
    </div>
  );
}
