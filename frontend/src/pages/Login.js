import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Please enter email and password"); return; }
    try {
      setLoading(true); setError("");
      const res = await loginUser({ email, password });
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left branding panel */}
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-icon">💊</div>
          <h1>PharmaCare</h1>
          <p>Complete Pharmacy Inventory Management</p>
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 16 }}>
            {["📦 Real-time inventory tracking", "🧾 Professional billing system", "📊 Analytics & reports", "⚠️ Expiry & stock alerts"].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.8)", fontSize: 15 }}>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="login-right">
        <div className="login-box">
          <h2>Welcome back</h2>
          <p>Sign in to your PharmaCare account</p>

          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", color: "#DC2626", fontSize: 13, marginBottom: 16 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="field-label">Email Address</label>
              <input type="email" className="input" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input type="password" className="input" placeholder="Enter your password"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn" disabled={loading}
              style={{ marginTop: 4, padding: "11px", justifyContent: "center", fontSize: 15 }}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <p style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
            PharmaCare v1.0 · Pharmacy Inventory System
          </p>
        </div>
      </div>
    </div>
  );
}
