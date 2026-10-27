import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { EMAIL_RE, friendlyError } from '../lib/utils.js';
import Field from '../components/Field.jsx';

export default function Login() {
  const { user, signIn, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/feed';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to={redirectTo} replace />;

  async function onSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
      toast.success('Welcome back!');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page container">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>Log in</h1>
        <p className="muted">Pick up where you left off.</p>
        {formError && <div className="notice notice-error" role="alert"><p>{formError}</p></div>}
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
        <p className="auth-alt">New here? <Link to="/signup">Create an account</Link></p>
      </form>
    </div>
  );
}
