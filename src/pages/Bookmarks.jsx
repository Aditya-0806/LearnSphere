import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { friendlyError } from '../lib/utils.js';
import PostCard from '../components/PostCard.jsx';
import { EmptyState, ErrorState, Loading } from '../components/States.jsx';

export default function Bookmarks() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    const { data, error: err } = await supabase
      .from('post_interactions')
      .select('created_at, post:posts(id,title,content,format,tags,status,published_at,updated_at,author:profiles(username,full_name,avatar_url))')
      .eq('user_id', user.id)
      .eq('interaction_type', 'bookmark')
      .order('created_at', { ascending: false });
    if (err) {
      setError(friendlyError(err, 'Could not load your bookmarks.'));
      return setState('error');
    }
    setPosts((data || []).map((row) => row.post).filter(Boolean));
    setState('ready');
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Bookmarks</h1>
          <p className="muted">Posts you saved to come back to.</p>
        </div>
      </div>
      {state === 'loading' && <Loading label="Loading bookmarks" />}
      {state === 'error' && <ErrorState message={error} onRetry={load} />}
      {state === 'ready' && posts.length === 0 && (
        <EmptyState icon={Bookmark} title="Nothing saved yet">
          <p>Use Save on any post and it shows up here.</p>
          <Link to="/feed" className="btn btn-primary">Browse the feed</Link>
        </EmptyState>
      )}
      {state === 'ready' && posts.length > 0 && (
        <div className="post-list">
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </div>
  );
}
