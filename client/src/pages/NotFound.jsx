import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export default function NotFound() {
  return (
    <div className="not-found">
      <span className="nf-code">404</span>
      <h2>Page not found</h2>
      <p className="muted">The page you’re looking for doesn’t exist or has moved.</p>
      <Link to="/">
        <Button>Go home</Button>
      </Link>
    </div>
  );
}
