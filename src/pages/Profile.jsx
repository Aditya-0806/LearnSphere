import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText, PenLine, UserX } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { formatDate, friendlyError } from '../lib/utils.js';
import Avatar from '../components/Avatar.jsx';
import PostCard from '../components/PostCard.jsx';
import { EmptyState, ErrorState, Loading } from '../components/States.jsx';

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | missing | error
  const [error, setError] = useState('');
  const [tab, setTab] = useState('published');

  const load = useCallback(async () => {
    setState('loading');
    setTab('published');
    const { data: prof, error: profError } = await supabase.from('profiles').select('*').eq('username', username.toLowerCase()).maybeSingle();
    if (profError) {
      setError(friendlyError(profError, 'Could not load this profile.'));
      return setState('error');
    }
    if (!prof) return setState('missing');

    // RLS returns drafts only to their owner, so this single query is safe for everyone.
    const { data: rows, error: postsError } = await supabase
      .from('posts')
      .select('id,title,content,format,tags,status,published_at,updated_at')
      .eq('author_id', prof.id)
      .order('updated_at', { ascending: false });
    if (postsError) {
      setError(friendlyError(postsError, 'Could not load posts.'));
      return setState('error');
    }
    setProfile(prof);
    setPosts((rows || []).map((p) => ({ ...p, author: { username: prof.username, full_name: prof.full_name, avatar_url: prof.avatar_url } })));
    setState('ready');
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === 'loading') return <div className="container page"><Loading label="Loading profile" /></div>;
  if (state === 'error') return <div className="container page"><ErrorState message={error} onRetry={load} /></div>;
  if (state === 'missing') {
    return (
      <div className="container page">
        <EmptyState icon={UserX} title="No one goes by that username">
          <p>Check the spelling, or browse the feed to find people.</p>
          <Link to="/feed" className="btn btn-primary">Go to the feed</Link>
        </EmptyState>
      </div>
    );
  }

  const isOwner = user?.id === profile.id;
  const published = posts.filter((p) => p.status === 'published').sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  const drafts = posts.filter((p) => p.status === 'draft');
  const visible = tab === 'drafts' ? drafts : published;

  return (
    <div className="container page">
      <header className="profile-head card">
        <Avatar name={profile.full_name} username={profile.username} url={profile.avatar_url} size={88} />
        <div className="profile-info">
          <h1>{profile.full_name || `@${profile.username}`}</h1>
          <p className="muted">@{profile.username} · Joined {formatDate(profile.created_at)}</p>
          {profile.bio ? <p className="bio">{profile.bio}</p> : isOwner && <p className="muted">Add a short bio so people know what you are learning.</p>}
        </div>
        {isOwner && (
          <div className="profile-actions">
            <Link to="/settings/profile" className="btn btn-secondary btn-sm">Edit profile</Link>
            <Link to="/write" className="btn btn-primary btn-sm"><PenLine size={16} aria-hidden="true" /> Write</Link>
          </div>
        )}
      </header>

      {isOwner && (
        <div className="tabs" role="tablist" aria-label="Your posts">
          <button type="button" role="tab" aria-selected={tab === 'published'} className={tab === 'published' ? 'active' : ''} onClick={() => setTab('published')}>
            Published ({published.length})
          </button>
          <button type="button" role="tab" aria-selected={tab === 'drafts'} className={tab === 'drafts' ? 'active' : ''} onClick={() => setTab('drafts')}>
            Drafts ({drafts.length})
          </button>
        </div>
      )}
      {!isOwner && <h2 className="section-title">Posts ({published.length})</h2>}

      {visible.length === 0 ? (
        <EmptyState icon={FileText} title={tab === 'drafts' ? 'No drafts' : 'No published posts yet'}>
          {isOwner ? (
            <Link to="/write" className="btn btn-primary">Write your first post</Link>
          ) : (
            <p>{profile.full_name || `@${profile.username}`} has not published anything yet.</p>
          )}
        </EmptyState>
      ) : (
        <div className="post-list">
          {visible.map((p) => (
            <PostCard key={p.id} post={p} showStatus={isOwner} showEdit={isOwner} />
          ))}
        </div>
      )}
    </div>
  );
}
