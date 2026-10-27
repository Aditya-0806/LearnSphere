import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bookmark, Clock, ExternalLink, FileQuestion, Heart, PenLine } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { formatDate, friendlyError, isHttpUrl, readingTime } from '../lib/utils.js';
import Avatar from '../components/Avatar.jsx';
import Markdown from '../components/Markdown.jsx';
import AiTools from '../components/AiTools.jsx';
import { EmptyState, ErrorState, Loading } from '../components/States.jsx';

const SELECT = 'id,author_id,title,content,format,tags,status,source_url,published_at,updated_at,author:profiles(username,full_name,avatar_url,bio)';

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | missing | error
  const [error, setError] = useState('');
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    const { data, error: err } = await supabase.from('posts').select(SELECT).eq('id', id).maybeSingle();
    if (err) {
      // An invalid uuid in the URL is a "not found", not a server error.
      if (/invalid input syntax for type uuid/i.test(err.message)) return setState('missing');
      setError(friendlyError(err, 'Could not load this post.'));
      return setState('error');
    }
    if (!data) return setState('missing');
    setPost(data);
    setState('ready');
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!post || post.status !== 'published') return;
    (async () => {
      const { count } = await supabase
        .from('post_interactions')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', post.id)
        .eq('interaction_type', 'like');
      setLikes(count || 0);
      if (user) {
        const { data } = await supabase.from('post_interactions').select('interaction_type').eq('post_id', post.id).eq('user_id', user.id);
        setLiked(Boolean(data?.some((r) => r.interaction_type === 'like')));
        setBookmarked(Boolean(data?.some((r) => r.interaction_type === 'bookmark')));
      } else {
        setLiked(false);
        setBookmarked(false);
      }
    })();
  }, [post, user]);

  async function toggle(type) {
    if (!user) {
      toast.info('Log in to like and bookmark posts.');
      return navigate('/login', { state: { from: `/posts/${id}` } });
    }
    if (busy) return;
    setBusy(true);
    const active = type === 'like' ? liked : bookmarked;
    try {
      if (active) {
        const { error: err } = await supabase.from('post_interactions').delete().eq('post_id', post.id).eq('user_id', user.id).eq('interaction_type', type);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('post_interactions').insert({ post_id: post.id, user_id: user.id, interaction_type: type });
        if (err) throw err;
      }
      if (type === 'like') {
        setLiked(!active);
        setLikes((n) => n + (active ? -1 : 1));
      } else {
        setBookmarked(!active);
        toast.success(active ? 'Bookmark removed.' : 'Saved to your bookmarks.');
      }
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading') return <div className="container page"><Loading label="Loading post" /></div>;
  if (state === 'error') return <div className="container page"><ErrorState message={error} onRetry={load} /></div>;
  if (state === 'missing') {
    return (
      <div className="container page">
        <EmptyState icon={FileQuestion} title="Post not found">
          <p>It may have been deleted, or it is still a private draft.</p>
          <Link to="/feed" className="btn btn-primary">Back to the feed</Link>
        </EmptyState>
      </div>
    );
  }

  const isOwner = user?.id === post.author_id;
  const isDraft = post.status !== 'published';
  const author = post.author;

  return (
    <div className="container page post-layout">
      <article className="post-article">
        {isDraft && (
          <div className="notice notice-warn" role="status">
            <p>This is a private draft. Only you can see it.</p>
          </div>
        )}
        <header className="post-header">
          <h1>{post.title}</h1>
          <div className="post-byline">
            {author && (
              <Link to={`/u/${author.username}`} className="author-link">
                <Avatar name={author.full_name} username={author.username} url={author.avatar_url} size={40} />
                <span>
                  <strong>{author.full_name || `@${author.username}`}</strong>
                  <small>@{author.username}</small>
                </span>
              </Link>
            )}
            <span className="muted inline-icon">
              {formatDate(post.published_at || post.updated_at)} · <Clock size={14} aria-hidden="true" /> {readingTime(post.content)} min read
            </span>
          </div>
          {post.tags?.length > 0 && (
            <div className="tag-list">
              {post.tags.map((t) => (
                <Link key={t} to={`/feed?tag=${encodeURIComponent(t)}`} className="tag">#{t}</Link>
              ))}
            </div>
          )}
        </header>

        <div className="post-actions">
          {!isDraft && (
            <>
              <button type="button" className={`btn btn-secondary btn-sm${liked ? ' on' : ''}`} onClick={() => toggle('like')} aria-pressed={liked} disabled={busy}>
                <Heart size={16} aria-hidden="true" fill={liked ? 'currentColor' : 'none'} /> {likes}
                <span className="sr-only">{liked ? 'Unlike' : 'Like'}</span>
              </button>
              <button type="button" className={`btn btn-secondary btn-sm${bookmarked ? ' on' : ''}`} onClick={() => toggle('bookmark')} aria-pressed={bookmarked} disabled={busy}>
                <Bookmark size={16} aria-hidden="true" fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? 'Saved' : 'Save'}
              </button>
            </>
          )}
          {isOwner && (
            <Link to={`/write/${post.id}`} className="btn btn-ghost btn-sm"><PenLine size={16} aria-hidden="true" /> Edit</Link>
          )}
        </div>

        <Markdown source={post.content} className="reading" />

        {post.source_url && isHttpUrl(post.source_url) && (
          <p className="source-link">
            <ExternalLink size={15} aria-hidden="true" />
            <a href={post.source_url} target="_blank" rel="noopener noreferrer nofollow">Source: {new URL(post.source_url).hostname}</a>
          </p>
        )}
      </article>

      <aside className="post-aside">
        {isDraft ? (
          <div className="card">
            <h2 className="ai-tools-title">Understand this post</h2>
            <p className="muted">AI Explain, diagrams and chat unlock once the post is published.</p>
          </div>
        ) : (
          <AiTools postId={post.id} />
        )}
      </aside>
    </div>
  );
}
