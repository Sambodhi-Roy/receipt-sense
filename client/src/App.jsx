import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login      from './pages/Login';
import Signup     from './pages/Signup';
import Dashboard  from './pages/Dashboard';
import BillsPage  from './pages/BillsPage';
import BudgetPage from './pages/BudgetPage';
import ForecastPage from './pages/ForecastPage';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"   element={<Login />} />
        <Route path="/signup"  element={<Signup />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/bills"     element={<ProtectedRoute><BillsPage /></ProtectedRoute>} />
        <Route path="/budget"    element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />
        <Route path="/forecast"  element={<ProtectedRoute><ForecastPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
