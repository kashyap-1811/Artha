import { Routes, Route } from "react-router-dom";
import Login from "../auth/Login";
import Signup from "../auth/Signup";
import OAuthCallback from "../auth/OAuthCallback";
import Dashboard from "../pages/Dashboard";
import ProtectedRoute from "./ProtectedRoute";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<Dashboard />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;