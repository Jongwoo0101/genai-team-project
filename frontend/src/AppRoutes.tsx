import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import EmployeeView from './pages/EmployeeView';
import ManagerDashboard from './pages/ManagerDashboard';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Support from './pages/Support';
import { useAuthStore } from './store/authStore';

export default function AppRoutes() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/support" element={<Support />} />
        
        {/* 인증 보호 루틴 추가 */}
        <Route 
          path="/employee" 
          element={isAuthenticated ? <EmployeeView /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/dashboard" 
          element={isAuthenticated && user?.role === 'MANAGER' ? <ManagerDashboard /> : <Navigate to="/login" replace />} 
        />
      </Route>
    </Routes>
  );
}
