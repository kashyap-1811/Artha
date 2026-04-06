import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function OAuth2CallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (token) {
      try {
        // Simple JWT decode (header.payload.signature)
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        
        // Save to localStorage (matches AuthPage logic)
        localStorage.setItem("artha_jwt", token);
        if (payload.userId) localStorage.setItem("artha_user_id", payload.userId);
        
        localStorage.setItem("artha_user", JSON.stringify({
          userId: payload.userId || "",
          email: payload.sub || "", // JWT "sub" is the email in our Java JwtUtil
          fullName: payload.name || ""
        }));

        console.log("OAuth2 login successful, redirecting to dashboard...");
        navigate("/dashboard", { state: { justLoggedIn: true } });
      } catch (error) {
        console.error("Error parsing OAuth2 token:", error);
        navigate("/auth", { state: { error: "Authentication failed. Try again." } });
      }
    } else {
      navigate("/auth");
    }
  }, [location, navigate]);

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#09090b',
      color: '#fff',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: '10px' }}>Finalizing login...</h2>
        <p style={{ opacity: 0.6 }}>Please wait while we set up your session.</p>
      </div>
    </div>
  );
}
