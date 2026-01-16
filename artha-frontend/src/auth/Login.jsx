import { useState } from "react";
import { loginApi } from "../api/auth.api";
import { setToken } from "../utils/token";
import { useNavigate } from "react-router-dom";
import "./auth.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    const res = await loginApi({ email, password });
    setToken(res.data.accessToken);
    navigate("/dashboard");
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>

      <form onSubmit={submit}>
        <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
        <button>Login</button>
      </form>

      <a href="http://localhost:8080/oauth2/authorize/google?redirect_uri=http://localhost:5173/oauth/callback">
        Login with Google
      </a>
    </div>
  );
};

export default Login;