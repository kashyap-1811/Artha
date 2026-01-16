import { useState } from "react";
import { signupApi } from "../api/auth.api";
import "./auth.css";

const Signup = () => {
  const [form, setForm] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    await signupApi(form);
    alert("Signup successful");
  };

  return (
    <div className="auth-container">
      <h2>Signup</h2>
      <form onSubmit={submit}>
        <input placeholder="Name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input type="password" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button onClick={}>Register</button>
      </form>
    </div>
  );
};

export default Signup;