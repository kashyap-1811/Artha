import { Navigate, Route, Routes } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import BudgetPage from "./pages/BudgetPage";
import CompanyPage from "./pages/CompanyPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/company/:companyId" element={<CompanyPage />} />
      <Route path="/company/:companyId/budget/:budgetId" element={<BudgetPage />} />
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}

export default App;
