import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import { isConfigured } from './lib/supabase.js';
import Landing from './pages/Landing.jsx';
import Feed from './pages/Feed.jsx';
import PostDetail from './pages/PostDetail.jsx';
import Editor from './pages/Editor.jsx';
import Profile from './pages/Profile.jsx';
import EditProfile from './pages/EditProfile.jsx';
import Bookmarks from './pages/Bookmarks.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import NotFound from './pages/NotFound.jsx';
import SetupNotice from './pages/SetupNotice.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <ScrollToTop />
      <Navbar />
      <main id="main" className="app-main">
        <Routes>
          <Route path="/" element={<Landing />} />
          {!isConfigured ? (
            <Route path="*" element={<SetupNotice />} />
          ) : (
            <>
              <Route path="/feed" element={<Feed />} />
              <Route path="/posts/:id" element={<PostDetail />} />
              <Route path="/u/:username" element={<Profile />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/write" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
              <Route path="/write/:id" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
              <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
              <Route path="/settings/profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </>
          )}
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
