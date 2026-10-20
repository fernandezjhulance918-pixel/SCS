import { Link } from "react-router-dom";
import PWAInstallButton from "./PWAInstallButton";

function LandingPage() {
  return (
    <div className="landing-page">
      <nav className="navbar navbar-expand-lg bg-white border-bottom">
        <div className="container py-2">
          <Link to="/" className="navbar-brand fw-bold text-success">
            <i className="bi bi-heart-pulse-fill me-2"></i>
            School Clinic
          </Link>

          <div className="d-flex flex-wrap gap-2 justify-content-end">
            <PWAInstallButton />
            <Link to="/login" className="btn btn-outline-success">
              Login
            </Link>
            <Link to="/register" className="btn btn-green">
              Register
            </Link>
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-7">
              <span className="badge rounded-pill bg-success-subtle text-success px-3 py-2 mb-3">
                School Clinic Management System
              </span>

              <h1 className="display-4 fw-bold mb-3">
                Manage your school clinic in one simple system.
              </h1>

              <p className="lead text-muted mb-4">
                Keep student information, clinic visits, medical records,
                medicines, reports, and users organized in one place.
              </p>

              <div className="d-flex flex-wrap gap-2">
                <Link to="/login" className="btn btn-green btn-lg px-4">
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Get Started
                </Link>
                <Link to="/register" className="btn btn-outline-success btn-lg px-4">
                  Create Account
                </Link>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="landing-preview">
                <div className="preview-icon">
                  <i className="bi bi-heart-pulse-fill"></i>
                </div>
                <h4 className="fw-bold mt-3">Clinic Dashboard</h4>
                <p className="text-muted mb-4">
                  View important clinic information and manage daily records
                  with an easy-to-use interface.
                </p>

                <div className="row g-3">
                  <div className="col-6">
                    <div className="preview-card">
                      <i className="bi bi-people-fill"></i>
                      <strong>Students</strong>
                      <small>Manage records</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="preview-card">
                      <i className="bi bi-capsule"></i>
                      <strong>Medicines</strong>
                      <small>Track inventory</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="preview-card">
                      <i className="bi bi-file-medical"></i>
                      <strong>Records</strong>
                      <small>Keep information</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="preview-card">
                      <i className="bi bi-bar-chart-line-fill"></i>
                      <strong>Reports</strong>
                      <small>View summaries</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-5 bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold">Everything you need for the clinic</h2>
            <p className="text-muted mb-0">
              Simple tools for everyday school clinic management.
            </p>
          </div>

          <div className="row g-4">
            <div className="col-md-4">
              <div className="feature-card h-100">
                <div className="feature-icon">
                  <i className="bi bi-person-vcard-fill"></i>
                </div>
                <h5 className="fw-bold">Student Management</h5>
                <p className="text-muted mb-0">
                  Organize student information and clinic history.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="feature-card h-100">
                <div className="feature-icon">
                  <i className="bi bi-clipboard2-pulse-fill"></i>
                </div>
                <h5 className="fw-bold">Clinic Records</h5>
                <p className="text-muted mb-0">
                  Record visits, treatments, and medical information.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="feature-card h-100">
                <div className="feature-icon">
                  <i className="bi bi-shield-check"></i>
                </div>
                <h5 className="fw-bold">Account Access</h5>
                <p className="text-muted mb-0">
                  Sign in with Firebase Authentication and manage access.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-4 border-top bg-white">
        <div className="container text-center text-muted small">
          School Clinic Management System
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
