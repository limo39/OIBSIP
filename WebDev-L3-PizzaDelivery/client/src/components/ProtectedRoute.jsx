import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { OvenLoading } from './Layouts';

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  if (loading) return <OvenLoading />;
  if (!user) return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} replace />;
  if (user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  return <Outlet />;
}
