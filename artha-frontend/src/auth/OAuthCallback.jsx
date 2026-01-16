import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setToken } from "../utils/token";

const OAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      setToken(token);
      navigate("/dashboard");
    } else {
      // If no token, redirect to login
      navigate("/login");
    }
  }, [navigate]);

  return <h3>Logging in...</h3>;
};

export default OAuthCallback;
