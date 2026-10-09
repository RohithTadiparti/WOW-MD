import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { api, apiMessage } from '../lib/api';
import { motion, useReducedMotion } from 'motion/react';
import { CircleNotch, WarningCircle } from '@phosphor-icons/react';
import { useAuth } from '../store/auth';
import SupportContact from '../components/SupportContact';
import PasswordField from '../components/PasswordField';

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const setAuth = useAuth((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  /** Flipped once the server tells us this account has two-factor on. */
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [zohoEnabled, setZohoEnabled] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (new URLSearchParams(location.search).get('sso') !== 'complete') return;
    setLoading(true);
    api.post('/auth/refresh', {})
      .then(({ data }) => {
        setAuth(data);
        nav('/', { replace: true });
      })
      .catch((err) => setError(apiMessage(err, 'Zoho sign-in could not be completed.')))
      .finally(() => setLoading(false));
  }, [location.search, nav, setAuth]);

  useEffect(() => {
    api.get('/auth/login-options')
      .then(({ data }) => setZohoEnabled(Boolean(data?.zohoSso)))
      .catch(() => setZohoEnabled(false));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email,
        password,
        ...(needsMfa ? { mfaCode } : {}),
      });
      setAuth(data);
      nav('/');
    } catch (err) {
      // The global filter nests the thrown payload under 'error', which is
      // where the challenge code lands -- never at the top level (council review).
      const body = (err as AxiosError<{ error?: { code?: string } }>).response?.data?.error;
      if (body?.code === 'MFA_REQUIRED') {
        // Not an error the user caused: ask for the second factor instead.
        setNeedsMfa(true);
        setError('');
      } else {
        setError(apiMessage(err, 'Invalid username, email, mobile number or password.'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[minmax(0,1fr)_1.1fr]" data-testid="login-page">
      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[22rem]"
        >
          <Link to="/" className="mb-10 block font-serif text-[1.7rem] uppercase tracking-[0.2em] text-brand" data-testid="login-logo">
            W<span className="text-gold-deep">O</span>W
            <span className="mt-1 block text-[0.48rem] tracking-[0.28em] text-gold-deep">World of Weddingz</span>
          </Link>

          <h1 className="font-serif text-[2.75rem] font-light leading-[1.05] text-brand" data-testid="login-heading">Welcome back</h1>
          {location.state?.passwordChanged === true && (
            <p role="status" className="rounded-sm bg-brand-light p-3 text-sm text-brand-dark">
              Password changed successfully. Sign in with your new password.
            </p>
          )}
          <p className="page-subtitle mb-8">
            Sign in to pick up where your family left off.
          </p>

          <form onSubmit={submit} data-testid="login-form">
          {error && (
            <p
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-md bg-critical-bg px-3 py-2.5 text-sm text-critical-fg"
              data-testid="login-error"
            >
              <WarningCircle size={17} className="mt-px shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Username, email or mobile number
              </label>
              <input
                id="email"
                className="input"
                type="text"
                inputMode="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
              />
            </div>

            <PasswordField
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              labelAside={
                <Link
                  className="text-[0.8125rem] text-gray-500 underline-offset-2 transition-colors hover:text-brand-strong hover:underline"
                  to="/forgot-password"
                  data-testid="login-forgot-link"
                >
                  Forgot?
                </Link>
              }
            />

            {needsMfa && (
              <div>
                <label className="label" htmlFor="mfaCode">
                  Authentication code
                </label>
                <input
                  id="mfaCode"
                  className="input font-mono tracking-[0.35em]"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  required
                  data-testid="login-mfa-input"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Open your authenticator app and enter the current 6-digit code.
                </p>
              </div>
            )}
          </div>

          <button className="btn mt-6 w-full" disabled={loading} data-testid="login-submit-button">
            {loading && (
              <CircleNotch size={16} className="animate-spin" aria-hidden />
            )}
            {loading ? 'Signing in' : 'Sign in'}
          </button>

          {!needsMfa && zohoEnabled && (
            <a className="btn-outline mt-2 flex w-full justify-center" href="/api/auth/sso/zoho/start" data-testid="login-zoho-btn">
              Sign in with Zoho
            </a>
          )}
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            No account?{' '}
            <Link
              className="font-medium text-brand-strong underline-offset-2 hover:underline"
              to="/register"
              data-testid="login-register-link"
            >
              Register
            </Link>
          </p>

          <div className="mt-4 border-t pt-4" style={{ borderColor: 'rgb(197 160 89 / 0.18)' }}>
            <SupportContact compact />
          </div>
        </motion.div>
      </div>

      {/* ─── Royal Navy & Gold decorative panel ─── */}
      <div className="relative hidden overflow-hidden lg:flex lg:items-end" style={{ borderLeft: '1px solid rgb(197 160 89 / 0.2)' }}>
        <img src="/images/wow-home-hero.webp" alt="A couple beginning a life together beside a palace lake" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgb(5_10_26_/_0.92)] via-[rgb(10_17_40_/_0.45)] to-[rgb(10_17_40_/_0.15)]" />
        {/* Subtle gold pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(rgba(197, 160, 89, 0.6) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative p-12 xl:p-16">
          <span aria-hidden className="mb-7 block h-px w-16 bg-gold-lit" />
          <p className="max-w-[20ch] font-serif text-[2.75rem] font-light italic leading-[1.2] text-white">
            Every family deserves to know who they are talking to.
          </p>
          <p className="mt-6 max-w-[40ch] text-[0.9375rem] leading-relaxed text-white/85">
            A conversation opens only once both families agree to it.
          </p>
        </div>
      </div>
    </div>
  );
}
