import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';

export default function SetupNotice() {
  return (
    <div className="container narrow page">
      <div className="notice notice-warn setup-notice">
        <Settings size={22} aria-hidden="true" />
        <div>
          <h1>Supabase is not configured yet</h1>
          <p>LearnSphere needs two public variables before accounts and posts can work:</p>
          <pre><code>{`VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key`}</code></pre>
          <ol>
            <li>Copy <code>.env.example</code> to <code>.env</code> and fill in both values from Supabase → Project Settings → API.</li>
            <li>Run <code>supabase/schema.sql</code> in the Supabase SQL Editor.</li>
            <li>Restart <code>npm run dev</code> (on Vercel, add the variables and redeploy).</li>
          </ol>
          <p>The README has the full step-by-step guide.</p>
          <Link to="/" className="btn btn-secondary">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
