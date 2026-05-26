import { Navigate } from 'react-router-dom';

// Self-service registration was removed — admins now create accounts via
// /users. This page is kept as a redirect so any stale bookmarks land somewhere
// sensible.
export const RegisterPage: React.FC = () => <Navigate to="/login" replace />;
