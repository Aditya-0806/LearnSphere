import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/States.jsx';

export default function NotFound() {
  return (
    <div className="container page">
      <EmptyState icon={Compass} title="Page not found">
        <p>That page does not exist or was moved.</p>
        <Link to="/feed" className="btn btn-primary">Go to the feed</Link>
      </EmptyState>
    </div>
  );
}
