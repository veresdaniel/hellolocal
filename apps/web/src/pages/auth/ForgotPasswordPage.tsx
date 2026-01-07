// src/pages/auth/ForgotPasswordPage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../../api/auth.api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const response = await forgotPassword({ email });
      setSuccess(response.message);
      // In development, show the reset token if provided
      if (response.resetToken) {
        setSuccess(`${response.message}\n\nReset token: ${response.resetToken}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>Forgot Password</h1>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 4 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: 12, marginBottom: 16, background: "#efe", color: "#0a0", borderRadius: 4, whiteSpace: "pre-wrap" }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8, fontSize: 16 }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <Link to="/admin/login" style={{ color: "#007bff" }}>
          Back to login
        </Link>
      </div>
    </div>
  );
}

