import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import BudgetPage from "./pages/BudgetPage";
import CompanyPage from "./pages/CompanyPage";
import DashboardPage from "./pages/DashboardPage";
import CompaniesPage from "./pages/CompaniesPage";
import ProfilePage from "./pages/ProfilePage";
import AnalysisPage from "./pages/AnalysisPage";
import OAuth2CallbackPage from "./pages/OAuth2CallbackPage";
import PricingPage from "./pages/PricingPage";
import BlogPage from "./pages/BlogPage";
import FeaturesPage from "./pages/FeaturesPage";
import DotBackground from "./components/DotBackground";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <>
      <ScrollToTop />
      <DotBackground />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/oauth-callback" element={<OAuth2CallbackPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/features" element={<FeaturesPage />} />

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
