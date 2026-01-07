// src/pages/auth/ResetPasswordPage.tsx
import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { resetPassword } from "../../api/auth.api";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!token) {
      setError("Reset token is missing");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({ token, newPassword });
      setSuccess(true);
      setTimeout(() => {
        navigate("/admin/login");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ maxWidth: 400, margin: "50px auto", padding: 24 }}>
        <h1 style={{ marginBottom: 24 }}>Password Reset Successful</h1>
        <div style={{ padding: 12, marginBottom: 16, background: "#efe", color: "#0a0", borderRadius: 4 }}>
          Your password has been reset. Redirecting to login...
        </div>
        <Link to="/admin/login" style={{ color: "#007bff" }}>
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>Reset Password</h1>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", color: "#c00", borderRadius: 4 }}>
          {error}
        </div>
      )}

      {!token && (
        <div style={{ padding: 12, marginBottom: 16, background: "#ffe", color: "#a60", borderRadius: 4 }}>
          No reset token provided. Please use the link from your email.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4 }}>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: "100%", padding: 8, fontSize: 16 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: "100%", padding: 8, fontSize: 16 }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !token}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: isLoading || !token ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "Resetting..." : "Reset Password"}
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

