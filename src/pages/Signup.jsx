import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { supabase } from '../lib/supabase.js';
import { EMAIL_RE, USERNAME_RE, friendlyError } from '../lib/utils.js';
import Field from '../components/Field.jsx';

export default function Signup() {
  const { user, signUp, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');

  if (!loading && user && !verifyEmail) return <Navigate to="/feed" replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: key === 'username' ? e.target.value.toLowerCase() : e.target.value }));

  function validate() {
    const next = {};
    if (form.fullName.trim().length < 2) next.fullName = 'Enter your full name.';
    if (!USERNAME_RE.test(form.username)) next.username = 'Use 3–20 lowercase letters, numbers or underscores.';
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) next.password = 'Include at least one letter and one number.';
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    return next;
  }

  async function checkUsername() {
    if (!USERNAME_RE.test(form.username)) return;
    const { data, error } = await supabase.rpc('username_available', { p_username: form.username });
    if (!error && data === false) setErrors((prev) => ({ ...prev, username: 'That username is taken. Try another one.' }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const { needsVerification } = await signUp({
        fullName: form.fullName.trim(),
        username: form.username,
        email: form.email.trim(),
        password: form.password,
      });
      if (needsVerification) {
        setVerifyEmail(form.email.trim());
      } else {
        toast.success('Account created. Welcome to LearnSphere!');
        navigate('/feed', { replace: true });
      }
    } catch (err) {
      if (err.field) setErrors({ [err.field]: err.message });
      else setFormError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (verifyEmail) {
    return (
      <div className="auth-page container">
        <div className="card auth-card center">
          <MailCheck size={36} aria-hidden="true" className="accent" />
          <h1>Check your inbox</h1>
          <p>We sent a confirmation link to <strong>{verifyEmail}</strong>. Open it to activate your account, then log in.</p>
          <Link to="/login" className="btn btn-primary">Go to log in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page container">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>Create your account</h1>
        <p className="muted">Free, and takes under a minute.</p>
        {formError && <div className="notice notice-error" role="alert"><p>{formError}</p></div>}
        <Field label="Full name" autoComplete="name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} maxLength={80} />
        <Field
          label="Username"
          autoComplete="username"
          value={form.username}
          onChange={set('username')}
          onBlur={checkUsername}
          error={errors.username}
          hint="Your public handle, for example ada_codes"
          maxLength={20}
        />
        <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <Field label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters with a letter and a number." />
        <Field label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
        <p className="auth-alt">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
