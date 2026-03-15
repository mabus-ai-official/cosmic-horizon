import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<any>;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(username, password);
      navigate("/game");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <img src="/logo.png" alt="Cosmic Horizon" className="auth-logo" />
        <p className="auth-subtitle">Sector Terminal Access</p>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <div className="auth-field">
            <label>Username or Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Connecting..." : "LOGIN"}
          </button>
        </form>
        <p className="auth-link">
          New pilot? <Link to="/register">Register here</Link>
        </p>
      </div>
      <div className="analytics-banner">
        This site uses cookies and analytics to improve your experience. By
        continuing, you consent to data collection.
      </div>
    </div>
  );
}
