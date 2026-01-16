// src/context/AuthProvider.jsx

import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { getMeApi } from "../api/auth.api";
import { removeToken } from "../utils/token";

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const res = await getMeApi();
      setUser(res.data);
    } catch {
      removeToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;