import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { friendlyError, isHttpUrl } from '../lib/utils.js';
import Avatar from '../components/Avatar.jsx';
import Field from '../components/Field.jsx';
import { Loading } from '../components/States.jsx';

export default function EditProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || '');
    setBio(profile.bio || '');
    setAvatarUrl(profile.avatar_url || '');
  }, [profile]);

  if (!profile) return <div className="container page"><Loading label="Loading profile" /></div>;

  async function onSubmit(e) {
    e.preventDefault();
    const next = {};
    if (fullName.trim().length < 2) next.fullName = 'Enter your full name.';
    if (bio.length > 280) next.bio = 'Keep your bio under 280 characters.';
    if (avatarUrl.trim() && !isHttpUrl(avatarUrl.trim())) next.avatarUrl = 'Enter a full image link starting with https://';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), bio: bio.trim(), avatar_url: avatarUrl.trim() || null })
      .eq('id', user.id);
    setSaving(false);
    if (error) return toast.error(friendlyError(error, 'Could not update your profile.'));
    await refreshProfile();
    toast.success('Profile updated.');
    navigate(`/u/${profile.username}`);
  }

  return (
    <div className="container narrow page">
      <div className="page-head"><h1>Edit profile</h1></div>
      <form className="card editor-form" onSubmit={onSubmit} noValidate>
        <div className="avatar-row">
          <Avatar name={fullName} username={profile.username} url={avatarUrl.trim()} size={64} />
          <div>
            <strong>@{profile.username}</strong>
            <p className="muted small">Usernames cannot be changed.</p>
          </div>
        </div>
        <Field label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} maxLength={80} />
        <Field label="Bio" as="textarea" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} error={errors.bio} hint={`${bio.length}/280`} maxLength={280} />
        <Field
          label="Profile photo link (optional)"
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          error={errors.avatarUrl}
          hint="Paste an image link. Leave it empty to use your initials."
          placeholder="https://"
        />
        <div className="editor-actions">
          <Link to={`/u/${profile.username}`} className="btn btn-ghost">Cancel</Link>
          <span className="spacer" />
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        </div>
      </form>
    </div>
  );
}
