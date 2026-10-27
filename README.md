# LearnSphere

> Don't just save what you learn. Understand it, visualize it, and ask questions about it.

LearnSphere is a public, AI-powered knowledge-sharing platform. People publish what they learn from workshops, meetups,
projects and courses. Every published post has three AI tools for readers:

- **AI Explain** – the post explained at Beginner, Intermediate or Advanced level.
- **Generate Diagram** – a Mermaid flowchart / sequence / architecture diagram, with a text fallback.
- **Ask** – a follow-up chat that always receives the post as context and separates "what the post says" from "what the AI adds".

**Stack:** React + Vite (JSX) · Supabase (Postgres, Auth, Row Level Security) · Google Gemini via Vercel serverless functions · Lucide icons · Mermaid.

---

## 1. What is in the box

```text
learnsphere/
├── api/                      Vercel serverless functions (server-side only)
│   ├── _lib/shared.js        Gemini client, post loader, validation, rate limit
│   ├── explain.js            POST /api/explain   { postId, level }
│   ├── diagram.js            POST /api/diagram   { postId }
│   └── chat.js               POST /api/chat      { postId, messages[] }
├── src/
│   ├── components/           Navbar, PostCard, Markdown, AiTools, ChatPanel, MermaidDiagram, ...
│   ├── pages/                Landing, Feed, PostDetail, Editor, Profile, EditProfile, Bookmarks, Login, Signup
│   ├── hooks/                useAuth (Supabase session + profile), useToast
│   ├── lib/                  supabase client, AI client, helpers
│   ├── styles/index.css      All styling
│   ├── App.jsx, main.jsx
├── supabase/schema.sql       Tables, indexes, triggers, RLS policies
├── .env.example              Environment variable placeholders
├── vercel.json               SPA rewrite + function settings
└── vite.config.js            Also serves /api/* locally during `npm run dev`
```

Implemented: sign-up (name, unique username, email, password + confirmation, email verification), login/logout with
persistent sessions, public profiles with editing, public feed with search and tag filters, quick notes and structured posts,
drafts / publish / edit / delete, post detail page, AI Explain, diagrams, contextual chat, likes and bookmarks (with a Bookmarks page).

Not implemented yet (the schema and code are kept ready for them): Event Hubs, Similar Knowledge, Collections, Knowledge Synthesis, Living Portfolios.

---

## 2. Environment variables

| Variable | Where it lives | Public? | Purpose |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Frontend (and read by `/api` too) | Yes, bundled in the browser | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend (and read by `/api` too) | Yes, bundled in the browser | Supabase **anon** or **publishable** key. Safe to expose because RLS protects the data |
| `GEMINI_API_KEY` | **Server only** | **No. Never** | Google Gemini key used by `/api/*` |
| `GEMINI_MODEL` | Server only, optional | No | Defaults to `gemini-flash-latest` |
| `AI_RATE_LIMIT_PER_MIN` | Server only, optional | No | Requests per IP per minute per instance (default 20) |
| `AI_TIMEOUT_MS` | Server only, optional | No | Gemini timeout (default 25000) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Server only, optional | No | Override the Supabase values for `/api` only |

Rules that keep you safe:

- Anything starting with `VITE_` is **copied into the browser bundle**. Never put the Gemini key or the Supabase `service_role` / secret key there.
- The `service_role` key is not needed anywhere in this project. Do not add it.
- Locally, put everything in `.env` (it is git-ignored). On Vercel, add them under **Project → Settings → Environment Variables**.

---

## 3. Setup guide

### Step 1: Create the Supabase project

1. Create a free project at <https://supabase.com>.
2. Open **SQL Editor → New query**, paste the whole of `supabase/schema.sql`, and click **Run**. It is safe to re-run.
3. Open **Project Settings → API** and copy the **Project URL** and the **anon / publishable key**.

### Step 2: Configure authentication

In **Authentication → URL Configuration**:

- **Site URL:** your production URL (for example `https://learnsphere.vercel.app`). While developing, `http://localhost:5173` is fine.
- **Redirect URLs:** add `http://localhost:5173/**` and `https://YOUR-APP.vercel.app/**` (and your custom domain if you have one).

In **Authentication → Providers → Email**, keep **Confirm email** switched on for real use (verification emails send people back to `/login`).
For a quick demo you can switch it off: sign-ups are then logged in immediately.
Supabase's built-in mailer has a low hourly email limit, so configure custom SMTP before a public launch.

### Step 3: Get a Gemini API key

1. Go to <https://aistudio.google.com/apikey> and create a key.
2. Put it in `.env` as `GEMINI_API_KEY` (and later in Vercel).
3. Model names change often. The default is the `gemini-flash-latest` alias. If Google rejects it for your account, set
   `GEMINI_MODEL` to a model listed at <https://ai.google.dev/gemini-api/docs/models> (when this project was written, `gemini-3.8-flash` was the newest Flash model).

If the key is missing, the AI panels show a clear "AI is not configured" message instead of fake output.

### Step 4: Run locally

```bash
npm install
cp .env.example .env        # then fill in the three values
npm run dev                 # http://localhost:5173
```

`npm run dev` also serves the `/api/*` functions, so you do not need the Vercel CLI. Restart it after editing `.env`.

### Step 5: Production build

```bash
npm run build               # outputs ./dist
npm run preview             # serves the built frontend only (no /api, use Vercel for the full app)
```

### Step 6: Push to GitHub

```bash
git init
git add .
git commit -m "LearnSphere MVP"
git branch -M main
git remote add origin https://github.com/YOUR-USER/learnsphere.git
git push -u origin main
```

`.env` is in `.gitignore`, so your secrets are not uploaded. Check with `git status` before committing.

### Step 7: Deploy on Vercel

1. In Vercel choose **Add New → Project** and import the GitHub repo. The Vite preset is detected automatically.
2. Under **Environment Variables** add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `GEMINI_API_KEY` (for Production, Preview and Development).
3. Click **Deploy**. Every push to `main` redeploys.
4. Copy the final URL into Supabase **Site URL / Redirect URLs** (Step 2).

`VITE_` variables are baked in at build time, so **redeploy after changing them**.

---

## 4. How the AI endpoints work

All three endpoints accept `POST` with JSON and return `{ "ok": true, ... }` or `{ "ok": false, "error": { "code", "message" } }`.

| Endpoint | Body | Success fields |
|---|---|---|
| `/api/explain` | `{ postId, level: "beginner" \| "intermediate" \| "advanced" }` | `explanation` (Markdown) |
| `/api/diagram` | `{ postId }` | `title`, `mermaid`, `steps[]` |
| `/api/chat` | `{ postId, messages: [{ role: "user" \| "assistant", content }] }` | `reply` (Markdown) |

Design decisions:

- **The server loads the post itself** from Supabase (published posts only) using the `postId`. Clients cannot send fake "post content", and drafts can never be sent to the AI.
- Post text is wrapped in `<post>` tags and the system prompt tells Gemini to treat it as untrusted data (basic prompt-injection resistance).
- Diagram output is JSON; the server only accepts allow-listed Mermaid diagram types, strips `click` and `%%{init}` lines, and rejects HTML/script content. The browser renders with Mermaid `securityLevel: "strict"` and shows the text `steps` if drawing fails.
- Errors are mapped to safe messages (missing key `503`, quota `429`, timeout `504`, bad key/model `502`). Upstream error bodies and keys are never forwarded.
- A small per-IP rate limit (20 requests/minute per serverless instance) protects your free quota. For stronger protection, add a shared limiter or require login.

---

## 5. Security model (Row Level Security)

- **Profiles:** anyone can read; each user can insert/update only their own row.
- **Posts:** anyone can read `published` posts; authors can also read their own drafts; only the author can insert, update or delete.
- **Interactions:** likes are public (for counts), bookmarks are private; users can only create or remove their own, and only on published posts.
- A trigger creates the profile at sign-up and resolves username collisions; a unique case-insensitive index guarantees unique usernames.
- Only the public anon/publishable key is used in the browser. The Gemini key exists only on the server.

---

## 6. What was tested (and what was not)

Tested in the build environment:

- `npm run build` completes with no errors.
- The three API endpoints were exercised against **mock** Supabase and Gemini servers: success paths, invalid input, missing post, wrong method, missing `GEMINI_API_KEY`, Gemini 429 and 403 handling (no secret leakage), diagram sanitising, and the rate limiter.
- Server-side rendering of the landing page and the "Supabase not configured" screen, plus the Markdown renderer's handling of script tags and `javascript:` links.

**Not** tested (you need to verify these once with your own accounts):

- `supabase/schema.sql` against a live Supabase project, and the sign-up, login, RLS and email-verification flows.
- Real calls to the Gemini API (the default model alias in particular).
- Interactive browser behaviour, including Mermaid drawing in the browser and the mobile layout.
- An actual Vercel deployment.

A quick acceptance run: sign up → verify email → log in → edit profile → write and publish a post → open it from the feed → AI Explain → Generate Diagram → ask a follow-up.

---

## 7. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| "Supabase is not configured yet" screen | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` missing or still the placeholder. Set them and restart `npm run dev` (or redeploy on Vercel). |
| `Could not find the table 'public.posts'` | `schema.sql` was not run. Run it in the SQL Editor. |
| Sign-up works but no email arrives | Check spam; Supabase's default mailer is rate-limited. Add custom SMTP, or turn off **Confirm email** for demos. |
| Verification link goes to the wrong site | Fix **Site URL** and **Redirect URLs** in Supabase Auth settings. |
| "Email not confirmed" on login | Click the link in the confirmation email first. |
| "That username is taken" | Usernames are unique, case-insensitive. Pick another. |
| Publish says you lack permission | You are logged out or not the author. Log in again. |
| AI says "AI is not configured" | `GEMINI_API_KEY` is missing on the server. Add it (Vercel: Environment Variables, then redeploy). |
| AI says the service rejected the request | Invalid key, or `GEMINI_MODEL` is not available to you. Pick a current model from the Gemini docs. |
| AI says busy / quota used up | Free-tier limit reached. Wait a minute or use a billing-enabled key. |
| `/api/...` returns the HTML page on Vercel | Make sure the `api/` folder is at the project root and `vercel.json` is unchanged. |
| 404 when refreshing a page such as `/feed` on Vercel | `vercel.json` rewrites handle this; make sure it was deployed. |
| Diagram shows text steps instead of a drawing | The AI produced Mermaid syntax that failed to parse. Click **Regenerate**. |
| Env change has no effect on Vercel | `VITE_` values are build-time. Redeploy after changing them. |

---

## 8. Roadmap hooks

- **Event Hubs / Collections:** add an `events` / `collections` table plus a join table to `posts`; posts stay independently published.
- **Similar Knowledge:** the `tags` GIN index and trigram indexes are ready; add `pgvector` embeddings later for semantic matches.
- **Knowledge Synthesis / Living Portfolios:** reuse `api/_lib/shared.js` (`callGemini`) and load several posts instead of one.
