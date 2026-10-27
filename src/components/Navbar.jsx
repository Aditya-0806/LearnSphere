import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bookmark, LogOut, Menu, PenLine, User, UserCog, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { isConfigured } from '../lib/supabase.js';
import Avatar from './Avatar.jsx';
import Logo from './Logo.jsx';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
    setUserOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onClick(e) {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setUserOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  async function handleLogout() {
    try {
      await signOut();
      toast.success('Logged out.');
      navigate('/');
    } catch {
      toast.error('Could not log out. Please try again.');
    }
  }

  const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand" aria-label="LearnSphere home">
          <Logo />
          <span>LearnSphere</span>
        </Link>

        <button
          type="button"
          className="icon-btn nav-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav id="primary-nav" className={`nav-links${menuOpen ? ' open' : ''}`} aria-label="Primary">
          {isConfigured && (
            <>
              <NavLink to="/feed" className={linkClass}>Feed</NavLink>
              {user && <NavLink to="/bookmarks" className={linkClass}>Bookmarks</NavLink>}
            </>
          )}

          {isConfigured && user && (
            <Link to="/write" className="btn btn-primary btn-sm">
              <PenLine size={16} aria-hidden="true" /> Write
            </Link>
          )}

          {isConfigured && !user && (
            <div className="nav-auth">
              <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Sign up</Link>
            </div>
          )}

          {isConfigured && user && (
            <div className="user-menu" ref={userRef}>
              <button
                type="button"
                className="user-trigger"
                aria-haspopup="menu"
                aria-expanded={userOpen}
                onClick={() => setUserOpen((v) => !v)}
              >
                <Avatar name={profile?.full_name} username={profile?.username} url={profile?.avatar_url} size={34} />
                <span className="sr-only">Account menu</span>
              </button>
              {userOpen && (
                <div className="menu" role="menu">
                  <div className="menu-head">
                    <strong>{profile?.full_name || 'Your account'}</strong>
                    {profile?.username && <span>@{profile.username}</span>}
                  </div>
                  {profile?.username && (
                    <Link role="menuitem" to={`/u/${profile.username}`}><User size={16} aria-hidden="true" /> My profile</Link>
                  )}
                  <Link role="menuitem" to="/settings/profile"><UserCog size={16} aria-hidden="true" /> Edit profile</Link>
                  <Link role="menuitem" to="/bookmarks"><Bookmark size={16} aria-hidden="true" /> Bookmarks</Link>
                  <button role="menuitem" type="button" onClick={handleLogout}><LogOut size={16} aria-hidden="true" /> Log out</button>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
