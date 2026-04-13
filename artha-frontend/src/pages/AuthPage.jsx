import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, signup } from "../api/auth";
import SplitAuthLayout from "../components/auth/SplitAuthLayout";
import AnimatedStockChart from "../components/auth/AnimatedStockChart";
import DarkAuthForm, { DarkInput } from "../components/auth/DarkAuthForm";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "");

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // Defaulting to login in split screen
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

      navigate("/dashboard", { state: { justLoggedIn: true } });
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

      navigate("/dashboard", { state: { justLoggedIn: true } });
    } catch (requestError) {
      setError(requestError.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoogleLogin() {
    window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
  }

  return (
    <SplitAuthLayout LeftVisualComponent={<AnimatedStockChart />}>
      <DarkAuthForm
        mode={mode}
        onModeChange={(newMode) => {
          resetErrors();
          setMode(newMode);
        }}
        title={mode === "signup" ? "Create an account" : "Welcome back"}
        subtitle={
          mode === "signup"
            ? "Sign up to access your global financial dashboard."
            : "Sign in to your account"
        }
        error={error}
        isLoading={isLoading}
        onSubmit={mode === "signup" ? handleSignupSubmit : handleLoginSubmit}
        onGoogleLogin={handleGoogleLogin}
      >
        {mode === "signup" ? (
          <>
            <DarkInput
              id="signup_fullName"
              label="Full Name"
              name="fullName"
              value={form.fullName}
              onChange={handleSignupFieldChange}
              placeholder="What should we call you?"
              required
            />
            <DarkInput
               id="signup_email"
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleSignupFieldChange}
              placeholder="you@example.com"
              required
            />
            <DarkInput
               id="signup_password"
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleSignupFieldChange}
              placeholder="At least 6 characters"
              required
            />
          </>
        ) : (
          <>
            <DarkInput
               id="login_email"
              label="Email"
              name="email"
              type="email"
              value={loginForm.email}
              onChange={handleLoginFieldChange}
              placeholder="you@example.com"
              required
            />
            <DarkInput
               id="login_password"
              label="Password"
              name="password"
              type="password"
              value={loginForm.password}
              onChange={handleLoginFieldChange}
              placeholder="Enter your password"
              required
            />
          </>
        )}
      </DarkAuthForm>
    </SplitAuthLayout>
  );
}

export default AuthPage;
