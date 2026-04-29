import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import EmployeeView from './pages/EmployeeView';
import ManagerDashboard from './pages/ManagerDashboard';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/employee" element={<EmployeeView />} />
        <Route path="/dashboard" element={<ManagerDashboard />} />
      </Route>
    </Routes>
  );
}
