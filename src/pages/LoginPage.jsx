import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../store/slices/authSlice";

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await dispatch(loginUser({ email, password }));
    if (res.meta.requestStatus === "fulfilled") {
      const mustReset = res.payload?.user?.must_change_password
      if (mustReset) navigate('/reset-password')
      else navigate("/dashboard");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)", display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 16, padding: 40, width: "100%", maxWidth: 400,
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 16, margin: "0 auto 12px",
          }}>Q2P</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Welcome back</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "6px 0 0" }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div style={{ background: "#ef444415", border: "1px solid #ef444444", color: "#ef4444", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="you@example.com"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text)", fontSize: 14, outline: "none" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 40px 10px 12px", color: "var(--text)", fontSize: 14, outline: "none" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 12,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.498 7.978 7.89 4.5 12 4.5c4.19 0 8.581 3.5 9.963 7.178.07.186.07.392 0 .578-1.38 3.678-5.772 7.178-9.963 7.178-4.19 0-8.581-3.5-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            style={{
              background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8,
              padding: "12px", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1, marginTop: 4,
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", margin: "24px 0 16px", gap: 8 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }}></div>
          <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Quick Login</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }}></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <div
            onClick={() => {
              setEmail("sanjib2119@gmail.com");
              setPassword("password123");
            }}
            style={{
              background: "var(--surface-alt)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 6px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.background = "rgba(99, 102, 241, 0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background = "var(--surface-alt)";
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Banker</div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>sanjib2119</div>
          </div>

          <div
            onClick={() => {
              setEmail("");
              setPassword("");
            }}
            style={{
              background: "var(--surface-alt)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 6px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.background = "rgba(99, 102, 241, 0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background = "var(--surface-alt)";
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Customer</div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>Blank</div>
          </div>

          <div
            onClick={() => {
              setEmail("arjunmehta@q2p.com");
              setPassword("852456");
            }}
            style={{
              background: "var(--surface-alt)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 6px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.background = "rgba(99, 102, 241, 0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background = "var(--surface-alt)";
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Underwriter</div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>arjunmehta</div>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", marginTop: 24 }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Register</Link>
        </p>
      </div>
    </div>
  );
}
