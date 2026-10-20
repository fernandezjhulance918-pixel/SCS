import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

import { auth, googleProvider } from "../Firebase";
import { saveUserSession } from "../role";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const goToDashboard = (user) => {
    saveUserSession(user);
    const role = localStorage.getItem("userRole");

    navigate(
      role === "superadmin" ? "/superadmin" : "/dashboard",
      { replace: true }
    );
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      goToDashboard(result.user);
    } catch (error) {
      console.error("Firebase email login error:", error);

      const messages = {
        "auth/invalid-credential":
          "Invalid email or password.",
        "auth/user-not-found":
          "No Firebase account exists for this email.",
        "auth/wrong-password":
          "Invalid email or password.",
        "auth/too-many-requests":
          "Too many failed attempts. Please try again later.",
        "auth/network-request-failed":
          "Network error. Check your internet connection.",
        "auth/operation-not-allowed":
          "Email/Password authentication is not enabled in Firebase Console.",
      };

      setMessage(
        messages[error.code] ||
        error.message ||
        "Login failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setMessage("");
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);

      console.log("Google Firebase user:", {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        providerId: result.user.providerData?.[0]?.providerId,
      });

      // A successful Google sign-in creates/returns the Firebase Auth user.
      goToDashboard(result.user);
    } catch (error) {
      console.error("Google Firebase login error:", error);

      const messages = {
        "auth/operation-not-allowed":
          "Google Sign-In is disabled. Enable Google under Firebase Console > Authentication > Sign-in method.",
        "auth/unauthorized-domain":
          "This domain is not authorized. Add localhost (or your deployed domain) under Firebase Console > Authentication > Settings > Authorized domains.",
        "auth/popup-blocked":
          "The Google popup was blocked by the browser. Allow popups for this site.",
        "auth/popup-closed-by-user":
          "Google login was cancelled.",
        "auth/account-exists-with-different-credential":
          "This email already has a Firebase account with a different sign-in method. Log in using that method first.",
        "auth/network-request-failed":
          "Network error. Check your internet connection.",
        "auth/invalid-api-key":
          "The Firebase API key is invalid. Make sure this app uses the Firebase project shown in Firebase Console.",
        "auth/app-not-authorized":
          "This app is not authorized for this Firebase project.",
      };

      setMessage(
        messages[error.code] ||
        error.message ||
        "Google login failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        :root {
          --green: #3d7c49;
          --green-dark: #2f6339;
          --green-soft: #e8f4e9;
          --text: #26352a;
        }

        body {
          min-height: 100vh;
          margin: 0;
          background:
            radial-gradient(circle at top left, rgba(255,255,255,.95), transparent 35%),
            linear-gradient(135deg, #dff5e1, #f6fbf6);
          font-family: Arial, sans-serif;
          color: var(--text);
        }

        .login-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .login-card {
          width: min(440px, 100%);
          border: 0;
          border-radius: 24px;
          box-shadow: 0 18px 50px rgba(47,99,57,.12);
          overflow: hidden;
        }

        .brand-icon {
          width: 76px;
          height: 76px;
          border-radius: 22px;
          background: var(--green-soft);
          color: var(--green);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
          margin: auto;
        }

        .form-control {
          padding: 12px 14px;
          border-radius: 12px;
        }

        .input-group .form-control {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }

        .input-group .btn {
          border-top-right-radius: 12px;
          border-bottom-right-radius: 12px;
        }

        .btn-green {
          background: var(--green);
          color: white;
          border: 0;
          border-radius: 12px;
          padding: 12px;
        }

        .btn-green:hover {
          background: var(--green-dark);
          color: white;
        }

        .google-btn {
          background: #ffffff;
          color: var(--green);
          border: 2px solid var(--green);
          border-radius: 12px;
          padding: 12px;
          transition: .3s;
        }

        .google-btn:hover:not(:disabled) {
          background: var(--green);
          color: white;
        }

        .helper {
          font-size: .9rem;
          color: #718077;
        }
      `}</style>

      <div className="login-shell">
        <div className="card login-card">
          <div className="card-body p-4 p-md-5">
            <div className="text-center mb-4">
              <div className="brand-icon mb-3">
                <i className="bi bi-heart-pulse-fill"></i>
              </div>

              <h2 className="fw-bold text-success mb-1">
                School Clinic
              </h2>

              <p className="helper mb-0">
                Management System
              </p>
            </div>

            {message && (
              <div className="alert alert-danger" role="alert">
                {message}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="email">
                  Email
                </label>

                <div className="input-group">
                  <span className="input-group-text bg-white">
                    <i className="bi bi-envelope"></i>
                  </span>

                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold" htmlFor="password">
                  Password
                </label>

                <div className="input-group">
                  <span className="input-group-text bg-white">
                    <i className="bi bi-lock"></i>
                  </span>

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"}></i>
                  </button>
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="form-check">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    className="form-check-input"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />

                  <label className="form-check-label" htmlFor="rememberMe">
                    Remember me
                  </label>
                </div>

                <Link
                  to="/register"
                  className="text-success text-decoration-none fw-semibold"
                >
                  Create account
                </Link>
              </div>

              <button
                type="submit"
                className="btn btn-green w-100 fw-semibold"
                disabled={loading}
              >
                <i className="bi bi-box-arrow-in-right me-2"></i>
                {loading ? "Signing in..." : "Login"}
              </button>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="google-btn w-100 fw-semibold mt-3"
                disabled={loading}
              >
                <i className="bi bi-google me-2"></i>
                {loading ? "Connecting to Google..." : "Continue with Google Account"}
              </button>
            </form>

            <p className="text-center helper mt-4 mb-0">
              School Clinic Management System
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
