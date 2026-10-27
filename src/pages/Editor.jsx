import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, PenLine, Save, Send, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { SECTION_FIELDS, composeStructured, emptySections, friendlyError, isHttpUrl } from '../lib/utils.js';
import Field from '../components/Field.jsx';
import Markdown from '../components/Markdown.jsx';
import TagInput from '../components/TagInput.jsx';
import { ErrorState, Loading } from '../components/States.jsx';

export default function Editor() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState('');
  const [existing, setExisting] = useState(null);

  const [format, setFormat] = useState('quick_note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sections, setSections] = useState(emptySections());
  const [tags, setTags] = useState([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from('posts').select('*').eq('id', id).eq('author_id', user.id).maybeSingle();
      if (error) setLoadError(friendlyError(error, 'Could not load this post.'));
      else if (!data) setLoadError('This post does not exist, or you are not its author.');
      else {
        setExisting(data);
        setFormat(data.format);
        setTitle(data.title);
        setContent(data.format === 'quick_note' ? data.content : '');
        setSections({ ...emptySections(), ...(data.sections || {}) });
        setTags(data.tags || []);
        setSourceUrl(data.source_url || '');
      }
      setLoading(false);
    })();
  }, [id, user.id]);

  const body = format === 'structured' ? composeStructured(sections) : content.trim();

  function validate(forPublish) {
    const next = {};
    const t = title.trim();
    if (!t) next.title = 'Add a title.';
    else if (forPublish && t.length < 3) next.title = 'Use at least 3 characters.';
    else if (t.length > 150) next.title = 'Keep the title under 150 characters.';
    if (forPublish && body.length < 20) {
      next.body = format === 'structured' ? 'Fill in at least a few sentences across the sections.' : 'Write at least 20 characters.';
    }
    if (body.length > 20000) next.body = 'This is too long. The limit is 20,000 characters.';
    if (sourceUrl.trim() && !isHttpUrl(sourceUrl.trim())) next.sourceUrl = 'Enter a full link starting with http:// or https://';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save(status) {
    if (!validate(status === 'published')) {
      toast.error('Fix the highlighted fields first.');
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      content: body,
      format,
      sections: format === 'structured' ? sections : null,
      tags,
      source_url: sourceUrl.trim() || null,
      status,
    };
    try {
      let saved;
      if (existing) {
        const { data, error } = await supabase.from('posts').update(payload).eq('id', existing.id).eq('author_id', user.id).select().single();
        if (error) throw error;
        saved = data;
      } else {
        const { data, error } = await supabase.from('posts').insert({ ...payload, author_id: user.id }).select().single();
        if (error) throw error;
        saved = data;
      }
      setExisting(saved);
      if (status === 'published') {
        toast.success(existing?.status === 'published' ? 'Changes saved.' : 'Published!');
        navigate(`/posts/${saved.id}`);
      } else {
        toast.success('Draft saved.');
        if (!id) navigate(`/write/${saved.id}`, { replace: true });
      }
    } catch (err) {
      toast.error(friendlyError(err, 'Could not save your post.'));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!existing || !window.confirm('Delete this post permanently? This cannot be undone.')) return;
    setSaving(true);
    const { error } = await supabase.from('posts').delete().eq('id', existing.id).eq('author_id', user.id);
    setSaving(false);
    if (error) return toast.error(friendlyError(error, 'Could not delete the post.'));
    toast.success('Post deleted.');
    navigate(profile ? `/u/${profile.username}` : '/feed');
  }

  if (loading) return <div className="container page"><Loading label="Loading editor" /></div>;
  if (loadError) return <div className="container page"><ErrorState message={loadError} /></div>;

  const isPublished = existing?.status === 'published';

  return (
    <div className="container narrow page">
      <div className="page-head">
        <div>
          <h1>{existing ? 'Edit post' : 'Write a post'}</h1>
          <p className="muted">{isPublished ? 'This post is live.' : 'Drafts are private until you publish.'}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => setPreview((v) => !v)} aria-pressed={preview}>
          {preview ? <><PenLine size={16} aria-hidden="true" /> Back to editing</> : <><Eye size={16} aria-hidden="true" /> Preview</>}
        </button>
      </div>

      {!existing && (
        <div className="segmented wide" role="radiogroup" aria-label="Post format">
          {[
            { id: 'quick_note', label: 'Quick note', hint: 'A short takeaway' },
            { id: 'structured', label: 'Structured learning', hint: 'Context, explanation, examples' },
          ].map((f) => (
            <label key={f.id} className={format === f.id ? 'selected' : ''}>
              <input type="radio" name="format" value={f.id} checked={format === f.id} onChange={() => setFormat(f.id)} />
              <span>{f.label}</span>
              <small>{f.hint}</small>
            </label>
          ))}
        </div>
      )}

      {preview ? (
        <article className="card preview">
          <h2>{title || 'Untitled'}</h2>
          {body ? <Markdown source={body} className="reading" /> : <p className="muted">Nothing to preview yet.</p>}
        </article>
      ) : (
        <form className="editor-form" onSubmit={(e) => e.preventDefault()} noValidate>
          <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} maxLength={150} placeholder="What did you learn?" />

          {format === 'quick_note' ? (
            <Field
              label="Your note"
              as="textarea"
              rows={9}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              error={errors.body}
              hint="Markdown is supported: **bold**, `code`, lists and ``` code blocks."
              placeholder="Write the takeaway in a few sentences."
            />
          ) : (
            <>
              {SECTION_FIELDS.map((f, i) => (
                <Field
                  key={f.key}
                  label={f.label}
                  as="textarea"
                  rows={i === 2 ? 7 : 4}
                  value={sections[f.key]}
                  onChange={(e) => setSections((s) => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  error={i === 0 ? errors.body : undefined}
                  hint={i === 0 ? 'Markdown is supported in every section. Fill in what applies.' : undefined}
                />
              ))}
            </>
          )}

          <Field label="Tags" hint="Up to 6. Press Enter after each one.">
            {({ id: fieldId }) => <TagInput id={fieldId} value={tags} onChange={setTags} />}
          </Field>
          <Field label="Source link (optional)" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} error={errors.sourceUrl} placeholder="https://" />
        </form>
      )}

      <div className="editor-actions">
        {existing && (
          <button type="button" className="btn btn-danger" onClick={remove} disabled={saving}>
            <Trash2 size={16} aria-hidden="true" /> Delete
          </button>
        )}
        <span className="spacer" />
        {isPublished ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => save('draft')} disabled={saving}>
              <Save size={16} aria-hidden="true" /> Unpublish to draft
            </button>
            <button type="button" className="btn btn-primary" onClick={() => save('published')} disabled={saving}>
              <Send size={16} aria-hidden="true" /> {saving ? 'Saving…' : 'Save changes'}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => save('draft')} disabled={saving}>
              <Save size={16} aria-hidden="true" /> {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => save('published')} disabled={saving}>
              <Send size={16} aria-hidden="true" /> Publish
            </button>
          </>
        )}
      </div>
      {existing && isPublished && (
        <p className="muted small right"><Link to={`/posts/${existing.id}`}>View the live post</Link></p>
      )}
    </div>
  );
}
