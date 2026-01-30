import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Landing from '../pages/Landing';
import DashboardHome from '../pages/DashboardHome';
import CompanyList from '../pages/CompanyList';
import CompanyDetail from '../pages/CompanyDetail';
import CompanyBudgets from '../pages/company/CompanyBudgets';
import CompanyExpenses from '../pages/company/CompanyExpenses';
import Profile from '../pages/Profile';
import OAuthCallback from '../pages/OAuthCallback';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';

export default function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />

            {/* Protected Dashboard Routes */}
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <DashboardLayout />
                </ProtectedRoute>
            }>
                <Route index element={<DashboardHome />} />
                <Route path="companies" element={<CompanyList />} />
                <Route path="companies/:id" element={<CompanyDetail />} />
                <Route path="companies/:id/budgets" element={<CompanyBudgets />} />
                <Route path="companies/:id/expenses" element={<CompanyExpenses />} />
                <Route path="profile" element={<Profile />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
