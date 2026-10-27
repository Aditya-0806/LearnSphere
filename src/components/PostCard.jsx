import { Link } from 'react-router-dom';
import { Clock, PenLine } from 'lucide-react';
import { excerpt, formatDate, readingTime } from '../lib/utils.js';
import Avatar from './Avatar.jsx';

export default function PostCard({ post, showStatus = false, showEdit = false }) {
  const author = post.author;
  const date = post.published_at || post.updated_at;

  return (
    <article className="post-card">
      <div className="post-card-meta">
        {author ? (
          <Link to={`/u/${author.username}`} className="author-link">
            <Avatar name={author.full_name} username={author.username} url={author.avatar_url} size={28} />
            <span>{author.full_name || `@${author.username}`}</span>
          </Link>
        ) : (
          <span />
        )}
        <span className="muted">{formatDate(date)}</span>
      </div>

      <h3 className="post-card-title">
        <Link to={`/posts/${post.id}`}>{post.title || 'Untitled'}</Link>
      </h3>
      <p className="post-card-excerpt">{excerpt(post.content) || 'No content yet.'}</p>

      <div className="post-card-foot">
        <div className="tag-list">
          {showStatus && <span className={`badge badge-${post.status}`}>{post.status === 'draft' ? 'Draft' : 'Published'}</span>}
          {post.format === 'quick_note' && <span className="badge">Quick note</span>}
          {(post.tags || []).slice(0, 4).map((tag) => (
            <Link key={tag} to={`/feed?tag=${encodeURIComponent(tag)}`} className="tag">#{tag}</Link>
          ))}
        </div>
        <div className="post-card-side">
          {showEdit && (
            <Link to={`/write/${post.id}`} className="btn btn-ghost btn-sm">
              <PenLine size={14} aria-hidden="true" /> Edit
            </Link>
          )}
          <span className="muted inline-icon">
            <Clock size={14} aria-hidden="true" /> {readingTime(post.content)} min read
          </span>
        </div>
      </div>
    </article>
  );
}
