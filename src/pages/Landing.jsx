import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, MessageCircle, Network, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { isConfigured } from '../lib/supabase.js';

const SAMPLE = {
  title: 'How refresh tokens keep you logged in',
  author: 'Sample post',
  levels: {
    Beginner:
      'Think of the access token as a day pass and the refresh token as a membership card. The day pass expires quickly, so if someone steals it, it stops working soon. The membership card gets you a fresh pass without typing your password again.',
    Intermediate:
      'Access tokens live for minutes. When one expires the API answers 401, and the client sends its refresh token to the auth server for a new pair. Rotating the refresh token on every use lets the server notice if an old one is replayed.',
    Advanced:
      'Store refresh tokens hashed and grouped into a session family. Rotate on each use and revoke the whole family on reuse of a spent token. Keep access tokens short-lived, and prefer HttpOnly cookies so scripts never read the refresh token.',
  },
};

function SampleDiagram() {
  const box = { fill: 'var(--accent-soft)', stroke: 'var(--accent)', strokeWidth: 1.5 };
  const text = { fontSize: 11, fill: 'var(--ink)', textAnchor: 'middle', fontFamily: 'inherit' };
  return (
    <svg viewBox="0 0 320 104" className="sample-diagram" role="img" aria-label="Diagram: client calls the API, gets a 401, refreshes the token with the auth server, then retries">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="var(--ink-3)" />
        </marker>
      </defs>
      <rect x="6" y="10" width="76" height="34" rx="8" {...box} />
      <text x="44" y="31" {...text}>Client</text>
      <rect x="122" y="10" width="76" height="34" rx="8" {...box} />
      <text x="160" y="31" {...text}>API</text>
      <rect x="238" y="10" width="76" height="34" rx="8" {...box} />
      <text x="276" y="31" {...text}>Auth server</text>
      <line x1="82" y1="27" x2="120" y2="27" stroke="var(--ink-3)" strokeWidth="1.5" markerEnd="url(#arrow)" />
      <path d="M160 44 V74 H62 V46" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#arrow)" />
      <text x="110" y="68" {...text} style={{ fontSize: 10 }}>401 expired</text>
      <path d="M62 74 V92 H276 V46" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" markerEnd="url(#arrow)" />
      <text x="170" y="88" {...text} style={{ fontSize: 10 }}>send refresh token, get new pair</text>
    </svg>
  );
}

const STEPS = [
  { icon: BookOpen, title: 'Share what you learned', text: 'Post a quick note or a structured write-up from a workshop, project, course or experiment.' },
  { icon: Sparkles, title: 'Understand it at your level', text: 'Readers pick Beginner, Intermediate or Advanced and get the same post explained to match.' },
  { icon: Network, title: 'See it as a diagram', text: 'One click turns a post into a flowchart, sequence or architecture diagram.' },
  { icon: MessageCircle, title: 'Ask follow-up questions', text: 'Chat with an AI that has read the post and separates what the author wrote from what it adds.' },
];

export default function Landing() {
  const { user } = useAuth();
  const [level, setLevel] = useState('Beginner');

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>Don’t just save what you learn. Understand it.</h1>
            <p className="lead">
              LearnSphere is a public place to share what you pick up from workshops, meetups, projects and courses. Every post can be
              explained at your level, drawn as a diagram, and questioned.
            </p>
            <div className="hero-actions">
              {isConfigured ? (
                user ? (
                  <>
                    <Link to="/write" className="btn btn-primary btn-lg">Write a post</Link>
                    <Link to="/feed" className="btn btn-secondary btn-lg">Browse the feed</Link>
                  </>
                ) : (
                  <>
                    <Link to="/signup" className="btn btn-primary btn-lg">Create a free account</Link>
                    <Link to="/feed" className="btn btn-secondary btn-lg">Browse the feed</Link>
                  </>
                )
              ) : (
                <Link to="/setup" className="btn btn-primary btn-lg">Finish setup</Link>
              )}
            </div>
          </div>

          <div className="demo-card" aria-label="Sample post showing AI Explain">
            <div className="demo-head">
              <span className="badge">Sample</span>
              <h2>{SAMPLE.title}</h2>
            </div>
            <div className="segmented small" role="radiogroup" aria-label="Explanation level">
              {Object.keys(SAMPLE.levels).map((name) => (
                <label key={name} className={level === name ? 'selected' : ''}>
                  <input type="radio" name="demo-level" checked={level === name} onChange={() => setLevel(name)} />
                  {name}
                </label>
              ))}
            </div>
            <p className="demo-text" aria-live="polite">{SAMPLE.levels[level]}</p>
            <SampleDiagram />
          </div>
        </div>
      </section>

      <section className="container steps" aria-labelledby="how-title">
        <h2 id="how-title">One post, four ways in</h2>
        <div className="steps-grid">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="step">
              <span className="step-icon"><Icon size={20} aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container cta-band">
        <div>
          <h2>Learned something this week? Write it down.</h2>
          <p>Teaching it to someone else is the fastest way to find out whether you understood it.</p>
        </div>
        <Link to={user ? '/write' : '/signup'} className="btn btn-primary btn-lg">
          {user ? 'Write a post' : 'Join LearnSphere'}
        </Link>
      </section>
    </>
  );
}
