import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
    <p className="text-5xl font-bold text-brand-500">404</p>
    <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
    <p className="text-sm text-slate-500">The page you're looking for doesn't exist.</p>
    <Link to="/dashboard" className="btn-primary">Go to dashboard</Link>
  </div>
);
