import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import BudgetPage from "./pages/BudgetPage";
import CompanyPage from "./pages/CompanyPage";
import DashboardPage from "./pages/DashboardPage";
import CompaniesPage from "./pages/CompaniesPage";
import ProfilePage from "./pages/ProfilePage";
import AnalysisPage from "./pages/AnalysisPage";
import DotBackground from "./components/DotBackground";

function App() {
  return (
    <>
      <DotBackground />
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />

        {/* Authenticated Routes wrapped in Layout */}
        <Route
          path="/dashboard"
          element={
            <Layout>
              <DashboardPage />
            </Layout>
          }
        />
        <Route
          path="/companies"
          element={
            <Layout>
              <CompaniesPage />
            </Layout>
          }
        />
        <Route
          path="/company/:companyId"
          element={
            <Layout>
              <CompanyPage />
            </Layout>
          }
        />
        <Route
          path="/company/:companyId/analysis"
          element={
            <Layout>
              <AnalysisPage />
            </Layout>
          }
        />
        <Route
          path="/company/:companyId/budget/:budgetId"
          element={
            <Layout>
              <BudgetPage />
            </Layout>
          }
        />
        <Route
          path="/company/:companyId/budget/:budgetId/analysis"
          element={
            <Layout>
              <AnalysisPage />
            </Layout>
          }
        />
        <Route
          path="/profile"
          element={
            <Layout>
              <ProfilePage />
            </Layout>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
