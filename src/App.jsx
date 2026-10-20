import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./Firebase";

import LandingPage from "./Pages/LandingPage";
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import Dashboard from "./Pages/Dashboard";
import SuperAdminDashboard from "./Pages/SuperAdminDashboard";
import { getUserRole } from "./role";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase is the source of truth for authentication.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log(
        "Firebase auth state:",
        currentUser
          ? {
              uid: currentUser.uid,
              email: currentUser.email,
              provider: currentUser.providerData?.map(
                (item) => item.providerId
              ),
            }
          : null
      );

      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-success mb-3"></div>
          <p className="mb-0">Checking Firebase Authentication...</p>
        </div>
      </div>
    );
  }

  const role = getUserRole(user);
  const dashboardPath =
    role === "superadmin" ? "/superadmin" : "/dashboard";

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            user ? <Navigate to={dashboardPath} replace /> : <LandingPage />
          }
        />

        <Route
          path="/login"
          element={
            user ? <Navigate to={dashboardPath} replace /> : <Login />
          }
        />

        <Route
          path="/register"
          element={
            user ? <Navigate to={dashboardPath} replace /> : <Register />
          }
        />

        <Route
          path="/dashboard"
          element={
            user ? (
              role === "superadmin" ? (
                <Navigate to="/superadmin" replace />
              ) : (
                <Dashboard />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/superadmin"
          element={
            user ? (
              role === "superadmin" ? (
                <SuperAdminDashboard />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
