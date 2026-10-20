import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
} from "firebase/auth";

import { auth, googleProvider } from "../Firebase";
import { saveUserSession } from "../role";

function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage(null);

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanUsername.length < 3) {
      setMessage({ type: "danger", text: "Username must be at least 3 characters." });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "danger", text: "Passwords do not match." });
      return;
    }

    setLoading(true);

    try {
      // IMPORTANT: create the account in Firebase Authentication.
      // Do not use localStorage as the authentication database.
      const credential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      await updateProfile(credential.user, {
        displayName: cleanUsername,
      });

      // Save only convenient session information locally.
      saveUserSession(credential.user);

      setMessage({
        type: "success",
        text: "Firebase account created successfully. Opening the dashboard...",
      });

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Firebase registration error:", error);

      const messages = {
        "auth/email-already-in-use":
          "That email already has a Firebase account. Please log in instead.",
        "auth/invalid-email":
          "Please enter a valid email address.",
        "auth/weak-password":
          "Password is too weak. Use at least 6 characters.",
        "auth/network-request-failed":
          "Network error. Check your internet connection.",
        "auth/operation-not-allowed":
          "Email/Password authentication is not enabled in Firebase Console.",
      };

      setMessage({
        type: "danger",
        text:
          messages[error.code] ||
          error.message ||
          "Firebase registration failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setMessage(null);
    setLoading(true);

    try {
      // Google sign-in also creates a Firebase Authentication user
      // automatically when that Google account has no existing user.
      const result = await signInWithPopup(auth, googleProvider);
      saveUserSession(result.user);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Google registration error:", error);

      const messages = {
        "auth/operation-not-allowed":
          "Google Sign-In is not enabled in Firebase Console.",
        "auth/unauthorized-domain":
          "This website domain is not authorized in Firebase Authentication.",
        "auth/popup-blocked":
          "The Google popup was blocked. Allow popups for this site.",
        "auth/popup-closed-by-user":
          "Google sign-in was cancelled.",
        "auth/account-exists-with-different-credential":
          "This email already has an account using another sign-in method. Log in with that method first.",
      };

      setMessage({
        type: "danger",
        text: messages[error.code] || error.message || "Google sign-in failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="wrap">
        <div className="register-card">
          <div className="card-body p-4 p-md-5">
            <div className="text-center mb-4">
              <div className="brand-icon mb-3">
                <i className="bi bi-person-plus-fill"></i>
              </div>

              <h2 className="fw-bold text-success mb-1">
                Create an Account
              </h2>

              <p className="text-muted mb-0">
                Register an administrator account for the clinic system.
              </p>
            </div>

            {message && (
              <div className={`alert alert-${message.type}`} role="alert">
                {message.text}
              </div>
            )}

            <form onSubmit={handleRegister}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="username" className="form-label fw-semibold">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    className="form-control"
                    placeholder="Enter username"
                    required
                    minLength={3}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label htmlFor="email" className="form-label fw-semibold">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    placeholder="Enter email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label htmlFor="password" className="form-label fw-semibold">
                    Password
                  </label>
                  <input
                    id="password"
                    type={showPasswords ? "text" : "password"}
                    className="form-control"
                    placeholder="Create a password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label
                    htmlFor="confirmPassword"
                    className="form-label fw-semibold"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPasswords ? "text" : "password"}
                    className="form-control"
                    placeholder="Repeat password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-check mt-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="showPasswords"
                  checked={showPasswords}
                  onChange={(e) => setShowPasswords(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="showPasswords">
                  Show passwords
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-green w-100 mt-4 fw-semibold"
                disabled={loading}
              >
                <i className="bi bi-person-check me-1"></i>
                {loading ? "Creating Firebase Account..." : "Register"}
              </button>

              <button
                type="button"
                className="google-btn w-100 fw-semibold mt-3"
                onClick={handleGoogleRegister}
                disabled={loading}
              >
                <i className="bi bi-google me-2"></i>
                Continue with Google Account
              </button>

              <Link
                to="/login"
                className="btn btn-outline-secondary w-100 mt-2"
              >
                Back to Login
              </Link>
            </form>

            <p className="text-center text-muted small mt-4 mb-0">
              Accounts are stored in Firebase Authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
