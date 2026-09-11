import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = mode === "login" ? await login(email, password) : await register(email, password, name);
    setLoading(false);
    if (res.ok) navigate("/");
    else setError(res.error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md" style={{ height: "auto" }} data-testid="auth-card">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="brand-text">sval.tech</span>
            <span className="text-gray-600">|</span>
            <span className="text-xl font-bold">StudyLocus</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-3">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-xs text-secondary mt-1">
            Sync your study dashboard across all your devices.
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "register" && (
            <input
              className="form-input px-3 py-2.5 text-sm"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="auth-name"
            />
          )}
          <input
            className="form-input px-3 py-2.5 text-sm"
            type={mode === "register" ? "email" : "text"}
            placeholder={mode === "register" ? "Email" : "Email or username"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="auth-email"
          />
          <input
            className="form-input px-3 py-2.5 text-sm"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            data-testid="auth-password"
          />
          {error && <p className="text-red-400 text-xs" data-testid="auth-error">{error}</p>}
          <button type="submit" className="btn-primary font-bold py-2.5 text-sm mt-1" disabled={loading} data-testid="auth-submit">
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-xs text-secondary mt-4">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            className="text-[var(--accent-color)] font-semibold"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            data-testid="auth-switch"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
