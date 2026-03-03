import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, signup } from "../api/auth";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("signup");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: ""
  });
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function resetErrors() {
    if (error) setError("");
  }

  function handleSignupFieldChange(event) {
    resetErrors();
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleLoginFieldChange(event) {
    resetErrors();
    const { name, value } = event.target;
    setLoginForm((previous) => ({ ...previous, [name]: value }));
  }

  function storeSession({ token, userId, email, fullName, currency }) {
    if (token) localStorage.setItem("artha_jwt", token);
    if (userId) localStorage.setItem("artha_user_id", userId);
    localStorage.setItem(
      "artha_user",
      JSON.stringify({
        userId: userId || "",
        email: email || "",
        fullName: fullName || ""
      })
    );
  }

  function validateSignup() {
    if (!form.fullName.trim()) {
      setError("Please enter your full name.");
      return false;
    }
    if (!form.email.trim()) {
      setError("Please enter your email.");
      return false;
    }
    if (!form.password.trim()) {
      setError("Please enter your password.");
      return false;
    }
    return true;
  }

  async function handleSignupSubmit(event) {
    event.preventDefault();
    if (!validateSignup()) return;
    setError("");
    setIsLoading(true);
    try {
      const signupResponse = await signup({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password
      });

      let loginResponse = null;
      try {
        loginResponse = await login({
          email: form.email.trim(),
          password: form.password
        });
      } catch {
        loginResponse = null;
      }

      storeSession({
        token: loginResponse?.jwt,
        userId: loginResponse?.userId || signupResponse?.id,
        email: signupResponse?.email || form.email.trim(),
        fullName: form.fullName.trim()
      });

      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.message || "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await login({
        email: loginForm.email.trim(),
        password: loginForm.password
      });

      storeSession({
        token: response?.jwt,
        userId: response?.userId,
        email: loginForm.email.trim(),
        fullName: ""
      });

      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="aurora aurora-top" />
      <div className="aurora aurora-bottom" />

      <section className="auth-card">
        <header className="auth-header">
          <span className="brand-mark" aria-hidden>
            ?
          </span>
          <div className="auth-switch">
            <button
              className={`auth-switch-btn ${mode === "signup" ? "active" : ""}`}
              onClick={() => {
                resetErrors();
                setMode("signup");
              }}
              type="button"
            >
              Sign up
            </button>
            <button
              className={`auth-switch-btn ${mode === "login" ? "active" : ""}`}
              onClick={() => {
                resetErrors();
                setMode("login");
              }}
              type="button"
            >
              Login
            </button>
          </div>
          <span className="step-count">{mode === "signup" ? "Create account" : "Welcome back"}</span>
        </header>

        <div className="avatar-wrap">
          <div className="avatar-core">
            <div className="avatar-head" />
            <div className="avatar-body" />
          </div>
        </div>

        {mode === "signup" && (
          <form className="auth-form" onSubmit={handleSignupSubmit}>
            <label className="field">
              <span className="field-label">Full Name</span>
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleSignupFieldChange}
                placeholder="What should we call you?"
                autoComplete="name"
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Email</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleSignupFieldChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleSignupFieldChange}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                required
              />
            </label>

            <div className="copy-block">
              <h1>What should we call you?</h1>
              <p>This helps us personalize your experience.</p>
            </div>

            <button className="cta" type="submit" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Get started"}
            </button>
          </form>
        )}

        {mode === "login" && (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <label className="field">
              <span className="field-label">Email</span>
              <input
                name="email"
                type="email"
                value={loginForm.email}
                onChange={handleLoginFieldChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <input
                name="password"
                type="password"
                value={loginForm.password}
                onChange={handleLoginFieldChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </label>

            <div className="copy-block">
              <h1>Login to Artha</h1>
              <p>Track budgets, expenses, and approvals from one place.</p>
            </div>

            <button className="cta" type="submit" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Login"}
            </button>
          </form>
        )}

        {error && <p className="error-text">{error}</p>}
      </section>
    </main>
  );
}

export default AuthPage;
