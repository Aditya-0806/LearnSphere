import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>
          <strong>LearnSphere</strong> – share what you learn, then understand it, see it and question it.
        </p>
        <nav aria-label="Footer">
          <Link to="/feed">Feed</Link>
          <Link to="/signup">Join</Link>
        </nav>
      </div>
    </footer>
  );
}
