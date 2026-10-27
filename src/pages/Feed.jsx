import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { SUGGESTED_TAGS, friendlyError } from '../lib/utils.js';
import { useAuth } from '../hooks/useAuth.jsx';
import PostCard from '../components/PostCard.jsx';
import { EmptyState, ErrorState, Loading } from '../components/States.jsx';

const PAGE_SIZE = 10;
const SELECT = 'id,title,content,format,tags,status,published_at,updated_at,author:profiles(username,full_name,avatar_url)';

export default function Feed() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tag = params.get('tag') || '';
  const urlQuery = params.get('q') || '';

  const [search, setSearch] = useState(urlQuery);
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const updateParams = useCallback(
    (changes) => {
      const next = new URLSearchParams(params);
      Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  // Debounce typing into the URL.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() !== urlQuery) updateParams({ q: search.trim() });
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchPage = useCallback(
    async (offset) => {
      let query = supabase
        .from('posts')
        .select(SELECT, { count: 'exact' })
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (tag) query = query.contains('tags', [tag]);
      const term = urlQuery.replace(/[,()%*\\:]/g, ' ').trim();
      if (term) query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
      return query;
    },
    [tag, urlQuery]
  );

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setStatus('loading');
    const { data, error: err, count } = await fetchPage(0);
    if (id !== requestId.current) return;
    if (err) {
      setError(friendlyError(err, 'Could not load posts.'));
      setStatus('error');
      return;
    }
    setPosts(data || []);
    setTotal(count || 0);
    setStatus('ready');
  }, [fetchPage]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadMore() {
    setLoadingMore(true);
    const id = requestId.current;
    const { data, error: err } = await fetchPage(posts.length);
    if (id === requestId.current) {
      if (err) setError(friendlyError(err));
      else setPosts((prev) => [...prev, ...(data || [])]);
    }
    setLoadingMore(false);
  }

  const filtersActive = Boolean(tag || urlQuery);
  const tagOptions = tag && !SUGGESTED_TAGS.includes(tag) ? [tag, ...SUGGESTED_TAGS] : SUGGESTED_TAGS;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Learning feed</h1>
          <p className="muted">What people are learning right now.</p>
        </div>
        <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); updateParams({ q: search.trim() }); }}>
          <Search size={18} aria-hidden="true" />
          <label htmlFor="feed-search" className="sr-only">Search posts</label>
          <input id="feed-search" type="search" placeholder="Search titles and content" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
      </div>

      <div className="chip-row" role="group" aria-label="Filter by tag">
        <button type="button" className={`chip${!tag ? ' active' : ''}`} onClick={() => updateParams({ tag: '' })} aria-pressed={!tag}>All</button>
        {tagOptions.map((t) => (
          <button key={t} type="button" className={`chip${tag === t ? ' active' : ''}`} onClick={() => updateParams({ tag: tag === t ? '' : t })} aria-pressed={tag === t}>
            #{t}
          </button>
        ))}
      </div>

      {filtersActive && status === 'ready' && (
        <p className="muted result-line">
          {total} {total === 1 ? 'post' : 'posts'}
          {urlQuery && <> matching “{urlQuery}”</>}
          {tag && <> tagged #{tag}</>}
          {' · '}
          <button type="button" className="link-btn" onClick={() => { setSearch(''); setParams({}, { replace: true }); }}>
            <X size={13} aria-hidden="true" /> Clear filters
          </button>
        </p>
      )}

      {status === 'loading' && <Loading label="Loading posts" />}
      {status === 'error' && <ErrorState message={error} onRetry={load} />}

      {status === 'ready' && posts.length === 0 && (
        <EmptyState icon={BookOpen} title={filtersActive ? 'No posts match those filters' : 'No posts yet'}>
          {filtersActive ? (
            <p>Try a different search or tag.</p>
          ) : (
            <>
              <p>Be the first to share something you learned.</p>
              <Link to={user ? '/write' : '/signup'} className="btn btn-primary">{user ? 'Write a post' : 'Join and write'}</Link>
            </>
          )}
        </EmptyState>
      )}

      {status === 'ready' && posts.length > 0 && (
        <>
          <div className="post-list">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          {posts.length < total && (
            <div className="center-row">
              <button type="button" className="btn btn-secondary" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
