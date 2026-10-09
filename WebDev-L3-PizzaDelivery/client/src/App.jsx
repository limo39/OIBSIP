import { Navigate, Route, Routes } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AdminLayout, UserLayout } from './components/Layouts';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Builder from './pages/Builder';
import Summary from './pages/Summary';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import AdminLogin from './pages/admin/AdminLogin';
import AdminHome from './pages/admin/AdminHome';
import Inventory from './pages/admin/Inventory';
import OrdersAdmin from './pages/admin/OrdersAdmin';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route element={<ProtectedRoute role="user" />}>
          <Route element={<UserLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/build" element={<Builder />} />
            <Route path="/summary" element={<Summary />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute role="admin" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminHome />} />
            <Route path="/admin/inventory" element={<Inventory />} />
            <Route path="/admin/orders" element={<OrdersAdmin />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
