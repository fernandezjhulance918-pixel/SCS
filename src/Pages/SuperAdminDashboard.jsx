import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "../Firebase";
import { getUserRole, clearUserSession } from "../role";

const API_BASE = "http://localhost:8080/api";

function SuperAdminDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [visits, setVisits] = useState([]);
  const [medicines, setMedicines] = useState([]);

  const [activeSection, setActiveSection] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          navigate("/login", { replace: true });
          return;
        }

        try {
          const role = getUserRole(currentUser);

          if (role !== "superadmin") {
            navigate("/dashboard", { replace: true });
            return;
          }

          setUser(currentUser);
          setLoading(false);
        } catch (error) {
          console.error("Authentication error:", error);
          setErrorMessage(
            "Unable to verify administrator access."
          );
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const usersRef = collection(db, "users");

    const unsubscribe = onSnapshot(
      usersRef,
      (snapshot) => {
        const userData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setUsers(userData);
      },
      (error) => {
        console.error("Users Firestore error:", error);

        setErrorMessage(
          "Unable to load registered accounts from Firestore."
        );
      }
    );

    return () => unsubscribe();
  }, [user]);

  const loadBackendData = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/clinic-data`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Backend returned ${response.status}`
        );
      }

      const data = await response.json();

      setStudents(
        Array.isArray(data.students)
          ? data.students
          : []
      );

      setVisits(
        Array.isArray(data.visits)
          ? data.visits
          : []
      );

      setMedicines(
        Array.isArray(data.medicines)
          ? data.medicines
          : []
      );

      console.log(
        "[SuperAdmin] Backend data loaded:",
        data
      );
    } catch (error) {
      console.error(
        "[SuperAdmin] Backend connection error:",
        error
      );

      setErrorMessage(
        "Unable to connect to the Express backend. Make sure server.js is running on port 8080."
      );
    }
  };

  useEffect(() => {
    if (!user) return;

    loadBackendData();
  }, [user]);

  const refreshData = async () => {
    setRefreshing(true);
    setErrorMessage("");

    try {
      await loadBackendData();

      console.log(
        "[SuperAdmin] Data refreshed from Express backend."
      );
    } catch (error) {
      console.error("Refresh error:", error);

      setErrorMessage(
        "Unable to refresh backend data."
      );
    } finally {
      setRefreshing(false);
    }
  };

  const addStudent = async (studentData) => {
    try {
      const response = await fetch(
        `${API_BASE}/students`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(studentData),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to add student: ${response.status}`
        );
      }

      const newStudent = await response.json();

      setStudents((current) => [
        ...current,
        newStudent,
      ]);

      console.log(
        "[SuperAdmin] Student added:",
        newStudent
      );

      return newStudent;
    } catch (error) {
      console.error(
        "[SuperAdmin] Add student error:",
        error
      );

      setErrorMessage(
        "Unable to add student."
      );

      return null;
    }
  };

  const deleteStudent = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this student?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_BASE}/students/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to delete student: ${response.status}`
        );
      }

      setStudents((current) =>
        current.filter(
          (item) =>
            String(item.id) !== String(id)
        )
      );

      console.log(
        "[SuperAdmin] Student deleted:",
        id
      );
    } catch (error) {
      console.error(
        "[SuperAdmin] Delete student error:",
        error
      );

      setErrorMessage(
        "Unable to delete student."
      );
    }
  };

  const addVisit = async (visitData) => {
    try {
      const response = await fetch(
        `${API_BASE}/visits`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(visitData),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to add visit: ${response.status}`
        );
      }

      const newVisit = await response.json();

      setVisits((current) => [
        ...current,
        newVisit,
      ]);

      console.log(
        "[SuperAdmin] Visit added:",
        newVisit
      );

      return newVisit;
    } catch (error) {
      console.error(
        "[SuperAdmin] Add visit error:",
        error
      );

      setErrorMessage(
        "Unable to add clinic visit."
      );

      return null;
    }
  };

  const deleteVisit = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this clinic visit?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_BASE}/visits/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to delete visit: ${response.status}`
        );
      }

      setVisits((current) =>
        current.filter(
          (item) =>
            String(item.id) !== String(id)
        )
      );

      console.log(
        "[SuperAdmin] Visit deleted:",
        id
      );
    } catch (error) {
      console.error(
        "[SuperAdmin] Delete visit error:",
        error
      );

      setErrorMessage(
        "Unable to delete clinic visit."
      );
    }
  };

  const addMedicine = async (medicineData) => {
    try {
      const response = await fetch(
        `${API_BASE}/medicines`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(medicineData),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to add medicine: ${response.status}`
        );
      }

      const newMedicine = await response.json();

      setMedicines((current) => [
        ...current,
        newMedicine,
      ]);

      console.log(
        "[SuperAdmin] Medicine added:",
        newMedicine
      );

      return newMedicine;
    } catch (error) {
      console.error(
        "[SuperAdmin] Add medicine error:",
        error
      );

      setErrorMessage(
        "Unable to add medicine."
      );

      return null;
    }
  };

  const deleteMedicine = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this medicine?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_BASE}/medicines/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to delete medicine: ${response.status}`
        );
      }

      setMedicines((current) =>
        current.filter(
          (item) =>
            String(item.id) !== String(id)
        )
      );

      console.log(
        "[SuperAdmin] Medicine deleted:",
        id
      );
    } catch (error) {
      console.error(
        "[SuperAdmin] Delete medicine error:",
        error
      );

      setErrorMessage(
        "Unable to delete medicine."
      );
    }
  };

  const clearBackendData = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all students, visits, and medicines?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_BASE}/clinic-data`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to clear backend data."
        );
      }

      setStudents([]);
      setVisits([]);
      setMedicines([]);

      console.log(
        "[SuperAdmin] All backend clinic data cleared."
      );
    } catch (error) {
      console.error(
        "[SuperAdmin] Clear data error:",
        error
      );

      setErrorMessage(
        "Unable to clear backend data."
      );
    }
  };

  const logout = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) return;

    try {
      await signOut(auth);

      clearUserSession();

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Logout error:", error);

      setErrorMessage(
        "Logout failed. Please try again."
      );
    }
  };

  const filteredUsers = useMemo(() => {
    const search = searchTerm
      .trim()
      .toLowerCase();

    if (!search) {
      return users;
    }

    return users.filter((item) => {
      const name = String(
        item.username ||
          item.name ||
          item.displayName ||
          ""
      ).toLowerCase();

      const email = String(
        item.email || ""
      ).toLowerCase();

      const role = String(
        item.role || ""
      ).toLowerCase();

      return (
        name.includes(search) ||
        email.includes(search) ||
        role.includes(search)
      );
    });
  }, [users, searchTerm]);

  const openSection = (section) => {
    setActiveSection(section);
    setSearchTerm("");
  };

  if (loading || !user) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "100vh" }}
      >
        <div className="text-center">
          <div className="spinner-border text-success mb-3"></div>

          <div className="text-muted">
            Loading Super Admin Dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="super-admin-page">

      <aside className="super-sidebar">

        <div>

          <div className="brand">
            <i className="bi bi-shield-lock-fill me-2"></i>
            Super Admin
          </div>

          <div className="sidebar-brand-sub">
            School Clinic System
          </div>

          <nav className="super-nav">

            <button
              type="button"
              className={`super-nav-link ${
                activeSection === "dashboard"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                openSection("dashboard")
              }
            >
              <i className="bi bi-grid-1x2-fill me-2"></i>
              Dashboard
            </button>

            <button
              type="button"
              className={`super-nav-link ${
                activeSection === "users"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                openSection("users")
              }
            >
              <i className="bi bi-people-fill me-2"></i>
              User Accounts
            </button>

            <button
              type="button"
              className={`super-nav-link ${
                activeSection === "students"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                openSection("students")
              }
            >
              <i className="bi bi-person-vcard-fill me-2"></i>
              Students
            </button>

            <button
              type="button"
              className={`super-nav-link ${
                activeSection === "visits"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                openSection("visits")
              }
            >
              <i className="bi bi-heart-pulse-fill me-2"></i>
              Clinic Visits
            </button>

            <button
              type="button"
              className={`super-nav-link ${
                activeSection === "medicines"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                openSection("medicines")
              }
            >
              <i className="bi bi-capsule me-2"></i>
              Medicines
            </button>

          </nav>

        </div>

        <div className="super-sidebar-bottom">

          <button
            type="button"
            className="super-nav-link"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            <i className="bi bi-hospital me-2"></i>
            Clinic Dashboard
          </button>

          <button
            type="button"
            className="super-nav-link"
            onClick={logout}
          >
            <i className="bi bi-box-arrow-left me-2"></i>
            Logout
          </button>

        </div>

      </aside>

      <main className="super-main">

        <header className="super-topbar">

          <div>
            <h4 className="fw-bold mb-1">
              Super Admin Dashboard
            </h4>

            <small className="text-muted">
              System overview and administrator access
            </small>
          </div>

          <div className="super-user">

            <div className="admin-avatar">
              <i className="bi bi-shield-check"></i>
            </div>

            <div>
              <strong>
                {user.displayName ||
                  "Super Administrator"}
              </strong>

              <small className="d-block text-muted">
                {user.email}
              </small>
            </div>

          </div>

        </header>

        <section className="super-content">

          {errorMessage && (
            <div className="alert alert-danger d-flex justify-content-between align-items-center">

              <span>
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {errorMessage}
              </span>

              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={refreshData}
              >
                Try Again
              </button>

            </div>
          )}

          {activeSection === "dashboard" && (
            <>

              <div className="alert super-welcome border-0">

                <div className="d-flex align-items-center gap-3">

                  <div className="welcome-icon">
                    <i className="bi bi-shield-check"></i>
                  </div>

                  <div>

                    <h5 className="fw-bold mb-1">
                      Welcome,{" "}
                      {user.displayName ||
                        "Super Administrator"}
                    </h5>

                    <p className="mb-0 text-muted">
                      You have super administrator access
                      to the school clinic system.
                    </p>

                  </div>

                </div>

              </div>

              <div className="row g-4 mb-4">

                <div className="col-md-6 col-xl-3">

                  <div className="card super-stat-card h-100">

                    <div className="card-body">

                      <div className="super-stat-icon">
                        <i className="bi bi-people-fill"></i>
                      </div>

                      <small className="text-muted">
                        Registered Accounts
                      </small>

                      <h2 className="fw-bold mb-0">
                        {users.length}
                      </h2>

                    </div>

                  </div>

                </div>

                <div className="col-md-6 col-xl-3">

                  <div className="card super-stat-card h-100">

                    <div className="card-body">

                      <div className="super-stat-icon">
                        <i className="bi bi-person-vcard-fill"></i>
                      </div>

                      <small className="text-muted">
                        Students
                      </small>

                      <h2 className="fw-bold mb-0">
                        {students.length}
                      </h2>

                    </div>

                  </div>

                </div>

                <div className="col-md-6 col-xl-3">

                  <div className="card super-stat-card h-100">

                    <div className="card-body">

                      <div className="super-stat-icon">
                        <i className="bi bi-heart-pulse-fill"></i>
                      </div>

                      <small className="text-muted">
                        Clinic Visits
                      </small>

                      <h2 className="fw-bold mb-0">
                        {visits.length}
                      </h2>

                    </div>

                  </div>

                </div>

                <div className="col-md-6 col-xl-3">

                  <div className="card super-stat-card h-100">

                    <div className="card-body">

                      <div className="super-stat-icon">
                        <i className="bi bi-capsule"></i>
                      </div>

                      <small className="text-muted">
                        Medicines
                      </small>

                      <h2 className="fw-bold mb-0">
                        {medicines.length}
                      </h2>

                    </div>

                  </div>

                </div>

              </div>

              <div className="row g-4">

                <div className="col-lg-8">

                  <div className="card h-100">

                    <div className="card-body p-4">

                      <div className="d-flex justify-content-between align-items-center mb-3">

                        <div>
                          <h5 className="fw-bold mb-1">
                            System Accounts
                          </h5>

                          <small className="text-muted">
                            Accounts stored in Firestore
                          </small>
                        </div>

                        <span className="badge text-bg-success">
                          {users.length} accounts
                        </span>

                      </div>

                      {users.length === 0 ? (

                        <div className="text-center py-5 text-muted">

                          <i className="bi bi-person-x fs-1 d-block mb-2"></i>

                          No Firebase user profiles
                          found in Firestore.

                        </div>

                      ) : (

                        <div className="table-responsive">

                          <table className="table align-middle mb-0">

                            <thead>

                              <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                              </tr>

                            </thead>

                            <tbody>

                              {users
                                .slice(0, 8)
                                .map((item) => (

                                  <tr key={item.id}>

                                    <td>
                                      {item.username ||
                                        item.name ||
                                        item.displayName ||
                                        "—"}
                                    </td>

                                    <td>
                                      {item.email || "—"}
                                    </td>

                                    <td>

                                      <span className="badge bg-success-subtle text-success">
                                        {item.role ||
                                          "User"}
                                      </span>

                                    </td>

                                  </tr>

                                ))}

                            </tbody>

                          </table>

                        </div>

                      )}

                    </div>

                  </div>

                </div>

                <div className="col-lg-4">

                  <div className="card h-100">

                    <div className="card-body p-4">

                      <h5 className="fw-bold mb-1">
                        Quick Access
                      </h5>

                      <p className="text-muted mb-4">
                        Manage clinic system information.
                      </p>

                      <button
                        type="button"
                        className="btn btn-green w-100 py-3 mb-3"
                        onClick={() =>
                          openSection("users")
                        }
                      >
                        <i className="bi bi-people-fill me-2"></i>
                        Manage User Accounts
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-success w-100 py-3 mb-3"
                        onClick={() =>
                          openSection("students")
                        }
                      >
                        <i className="bi bi-person-vcard-fill me-2"></i>
                        View Students
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-success w-100 py-3 mb-3"
                        onClick={() =>
                          openSection("visits")
                        }
                      >
                        <i className="bi bi-heart-pulse-fill me-2"></i>
                        View Clinic Visits
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-success w-100 py-3 mb-3"
                        onClick={() =>
                          openSection("medicines")
                        }
                      >
                        <i className="bi bi-capsule me-2"></i>
                        View Medicines
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-secondary w-100 py-3 mb-3"
                        onClick={refreshData}
                        disabled={refreshing}
                      >
                        <i
                          className={`bi ${
                            refreshing
                              ? "bi-arrow-repeat"
                              : "bi-arrow-clockwise"
                          } me-2`}
                        ></i>

                        {refreshing
                          ? "Refreshing..."
                          : "Refresh Backend Data"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-danger w-100 py-3"
                        onClick={clearBackendData}
                      >
                        <i className="bi bi-trash me-2"></i>
                        Clear Clinic Data
                      </button>

                    </div>

                  </div>

                </div>

              </div>

            </>
          )}

          {activeSection === "users" && (

            <div className="card">

              <div className="card-body p-4">

                <div className="d-flex justify-content-between align-items-center mb-4">

                  <div>

                    <h4 className="fw-bold mb-1">
                      User Accounts
                    </h4>

                    <p className="text-muted mb-0">
                      Firebase/Firestore registered accounts
                    </p>

                  </div>

                  <button
                    type="button"
                    className="btn btn-outline-success"
                    onClick={refreshData}
                    disabled={refreshing}
                  >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Refresh
                  </button>

                </div>

                <div className="input-group mb-4">

                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name, email, or role..."
                    value={searchTerm}
                    onChange={(e) =>
                      setSearchTerm(e.target.value)
                    }
                  />

                </div>

                {filteredUsers.length === 0 ? (

                  <div className="text-center py-5 text-muted">

                    <i className="bi bi-person-x fs-1 d-block mb-2"></i>

                    No matching accounts found.

                  </div>

                ) : (

                  <div className="table-responsive">

                    <table className="table table-hover align-middle">

                      <thead>

                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Provider</th>
                          <th>User ID</th>
                        </tr>

                      </thead>

                      <tbody>

                        {filteredUsers.map((item) => (

                          <tr key={item.id}>

                            <td>
                              {item.username ||
                                item.name ||
                                item.displayName ||
                                "—"}
                            </td>

                            <td>
                              {item.email || "—"}
                            </td>

                            <td>

                              <span className="badge bg-success-subtle text-success">
                                {item.role || "user"}
                              </span>

                            </td>

                            <td>
                              {item.provider ||
                                "Email/Password"}
                            </td>

                            <td>

                              <small className="text-muted">
                                {item.uid ||
                                  item.id}
                              </small>

                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>

            </div>

          )}

          {activeSection === "students" && (

            <div className="card">

              <div className="card-body p-4">

                <div className="d-flex justify-content-between align-items-center mb-4">

                  <div>

                    <h4 className="fw-bold mb-1">
                      Students
                    </h4>

                    <p className="text-muted mb-0">
                      Student records from Express backend
                    </p>

                  </div>

                  <div className="d-flex gap-2">

                    <button
                      type="button"
                      className="btn btn-outline-success"
                      onClick={refreshData}
                      disabled={refreshing}
                    >
                      <i className="bi bi-arrow-clockwise me-2"></i>
                      Refresh
                    </button>

                    <span className="badge text-bg-success d-flex align-items-center">
                      {students.length} students
                    </span>

                  </div>

                </div>

                {students.length === 0 ? (

                  <div className="text-center py-5 text-muted">

                    <i className="bi bi-person-vcard fs-1 d-block mb-2"></i>

                    No student records found.

                  </div>

                ) : (

                  <div className="table-responsive">

                    <table className="table table-hover align-middle">

                      <thead>

                        <tr>
                          <th>Name</th>
                          <th>Student ID</th>
                          <th>Course/Grade</th>
                          <th>Section</th>
                          <th>Action</th>
                        </tr>

                      </thead>

                      <tbody>

                        {students.map((item) => (

                          <tr key={item.id}>

                            <td>
                              {item.name ||
                                item.fullName ||
                                `${item.firstName || ""} ${item.lastName || ""}`.trim() ||
                                "—"}
                            </td>

                            <td>
                              {item.studentId ||
                                item.id ||
                                "—"}
                            </td>

                            <td>
                              {item.course ||
                                item.grade ||
                                item.program ||
                                "—"}
                            </td>

                            <td>
                              {item.section ||
                                "—"}
                            </td>

                            <td>

                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() =>
                                  deleteStudent(item.id)
                                }
                              >
                                <i className="bi bi-trash"></i>
                              </button>

                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>

            </div>

          )}

          {activeSection === "visits" && (

            <div className="card">

              <div className="card-body p-4">

                <div className="d-flex justify-content-between align-items-center mb-4">

                  <div>

                    <h4 className="fw-bold mb-1">
                      Clinic Visits
                    </h4>

                    <p className="text-muted mb-0">
                      Clinic visit records from Express backend
                    </p>

                  </div>

                  <div className="d-flex gap-2">

                    <button
                      type="button"
                      className="btn btn-outline-success"
                      onClick={refreshData}
                      disabled={refreshing}
                    >
                      <i className="bi bi-arrow-clockwise me-2"></i>
                      Refresh
                    </button>

                    <span className="badge text-bg-success d-flex align-items-center">
                      {visits.length} visits
                    </span>

                  </div>

                </div>

                {visits.length === 0 ? (

                  <div className="text-center py-5 text-muted">

                    <i className="bi bi-heart-pulse fs-1 d-block mb-2"></i>

                    No clinic visits found.

                  </div>

                ) : (

                  <div className="table-responsive">

                    <table className="table table-hover align-middle">

                      <thead>

                        <tr>
                          <th>Patient</th>
                          <th>Reason</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>

                      </thead>

                      <tbody>

                        {visits.map((item) => (

                          <tr key={item.id}>

                            <td>
                              {item.patientName ||
                                item.name ||
                                "—"}
                            </td>

                            <td>
                              {item.reason ||
                                item.complaint ||
                                "—"}
                            </td>

                            <td>
                              {item.date ||
                                item.visitDate ||
                                "—"}
                            </td>

                            <td>

                              <span className="badge bg-success-subtle text-success">
                                {item.status ||
                                  "Completed"}
                              </span>

                            </td>

                            <td>

                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() =>
                                  deleteVisit(item.id)
                                }
                              >
                                <i className="bi bi-trash"></i>
                              </button>

                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>

            </div>

          )}

          {activeSection === "medicines" && (

            <div className="card">

              <div className="card-body p-4">

                <div className="d-flex justify-content-between align-items-center mb-4">

                  <div>

                    <h4 className="fw-bold mb-1">
                      Medicines
                    </h4>

                    <p className="text-muted mb-0">
                      Medicine inventory from Express backend
                    </p>

                  </div>

                  <div className="d-flex gap-2">

                    <button
                      type="button"
                      className="btn btn-outline-success"
                      onClick={refreshData}
                      disabled={refreshing}
                    >
                      <i className="bi bi-arrow-clockwise me-2"></i>
                      Refresh
                    </button>

                    <span className="badge text-bg-success d-flex align-items-center">
                      {medicines.length} medicines
                    </span>

                  </div>

                </div>

                {medicines.length === 0 ? (

                  <div className="text-center py-5 text-muted">

                    <i className="bi bi-capsule fs-1 d-block mb-2"></i>

                    No medicines found.

                  </div>

                ) : (

                  <div className="table-responsive">

                    <table className="table table-hover align-middle">

                      <thead>

                        <tr>
                          <th>Medicine</th>
                          <th>Quantity</th>
                          <th>Unit</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>

                      </thead>

                      <tbody>

                        {medicines.map((item) => {

                          const quantity = Number(
                            item.quantity ??
                              item.stock ??
                              0
                          );

                          return (

                            <tr key={item.id}>

                              <td>
                                {item.name ||
                                  item.medicineName ||
                                  "—"}
                              </td>

                              <td>
                                {item.quantity ??
                                  item.stock ??
                                  "—"}
                              </td>

                              <td>
                                {item.unit ||
                                  "pcs"}
                              </td>

                              <td>

                                <span
                                  className={`badge ${
                                    quantity <= 5
                                      ? "bg-danger-subtle text-danger"
                                      : "bg-success-subtle text-success"
                                  }`}
                                >
                                  {quantity <= 5
                                    ? "Low Stock"
                                    : "Available"}
                                </span>

                              </td>

                              <td>

                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() =>
                                    deleteMedicine(
                                      item.id
                                    )
                                  }
                                >
                                  <i className="bi bi-trash"></i>
                                </button>

                              </td>

                            </tr>

                          );

                        })}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default SuperAdminDashboard;