
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../Firebase";

const API_BASE = "http://localhost:8080/api";

function Dashboard() {
  const navigate = useNavigate();

  // ==========================================
  // DATA
  // ==========================================

  const [students, setStudents] = useState([]);
  const [visits, setVisits] = useState([]);
  const [medicines, setMedicines] = useState([]);

  const [activeSection, setActiveSection] =
    useState("dashboard");

  const [loggedInUser, setLoggedInUser] =
    useState("Administrator");

  const [modal, setModal] = useState(null);

  const [recordSearch, setRecordSearch] =
    useState("");

  // ==========================================
  // FORM STATES
  // ==========================================

  const [studentForm, setStudentForm] =
    useState({
      id: "",
      name: "",
      grade: "",
      contact: "",
    });

  const [visitForm, setVisitForm] =
    useState({
      student: "",
      complaint: "",
      treatment: "",
      status: "Treated",
    });

  const [medicineForm, setMedicineForm] =
    useState({
      id: "",
      name: "",
      category: "",
      stock: "",
      expiry: "",
    });

  // ==========================================
  // FIREBASE AUTHENTICATION
  // ==========================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          navigate("/login", {
            replace: true,
          });
          return;
        }

        setLoggedInUser(
          user.displayName ||
            user.email ||
            "Administrator"
        );
      }
    );

    return () => unsubscribe();
  }, [navigate]);

  // ==========================================
  // LOAD DATA FROM BACKEND
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const sleep = (ms) =>
      new Promise((resolve) =>
        setTimeout(resolve, ms)
      );

    const loadClinicData = async () => {
      let lastError = null;

      for (
        let attempt = 0;
        attempt < 15;
        attempt += 1
      ) {
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

          const data =
            await response.json();

          if (cancelled) return;

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

          return;
        } catch (error) {
          lastError = error;

          await sleep(400);
        }
      }

      if (!cancelled) {
        console.error(
          "Could not load clinic data:",
          lastError
        );

        alert(
          "The clinic backend could not be reached.\n\nPlease make sure the backend is running on localhost:8080."
        );
      }
    };

    loadClinicData();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================
  // COUNTS
  // ==========================================

  const totalStudents =
    students.length;

  const totalVisits =
    visits.length;

  const totalMedicines =
    medicines.length;

  const lowStockMedicines =
    medicines.filter(
      (medicine) =>
        Number(medicine.stock) <= 5
    );

  const lowStock =
    lowStockMedicines.length;

  // ==========================================
  // NAVIGATION
  // ==========================================

  const showSection = (section) => {
    setActiveSection(section);
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = async () => {
    const confirmed =
      window.confirm(
        "Are you sure you want to log out?"
      );

    if (!confirmed) return;

    try {
      await signOut(auth);

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  };

  // ==========================================
  // STUDENT
  // ==========================================

  const openStudentModal = () => {
    setStudentForm({
      id: "",
      name: "",
      grade: "",
      contact: "",
    });

    setModal("student");
  };

  const addStudent = async () => {
    const id =
      studentForm.id.trim();

    const name =
      studentForm.name.trim();

    const grade =
      studentForm.grade.trim();

    const contact =
      studentForm.contact.trim();

    if (!id || !name || !grade) {
      alert(
        "Please complete Student ID, Name, and Grade."
      );
      return;
    }

    const duplicate =
      students.some(
        (student) =>
          String(student.id) === id
      );

    if (duplicate) {
      alert(
        "This Student ID already exists."
      );
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/students`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id,
            name,
            grade,
            contact,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to save student"
        );
      }

      setStudents(
        (current) => [
          ...current,
          result,
        ]
      );

      setModal(null);

      alert(
        "Student added successfully!"
      );
    } catch (error) {
      console.error(
        "Add student error:",
        error
      );

      alert(
        "Student was not saved. Please make sure the backend is running."
      );
    }
  };

  const deleteStudent = async (id) => {
    const student =
      students.find(
        (item) =>
          String(item.id) ===
          String(id)
      );

    if (!student) return;

    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${student.name}?`
      );

    if (!confirmed) return;

    try {
      const response =
        await fetch(
          `${API_BASE}/students/${encodeURIComponent(
            id
          )}`,
          {
            method: "DELETE",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to delete student"
        );
      }

      setStudents(
        (current) =>
          current.filter(
            (item) =>
              String(item.id) !==
              String(id)
          )
      );

      alert(
        "Student deleted successfully."
      );
    } catch (error) {
      console.error(
        "Delete student error:",
        error
      );

      alert(
        "Student could not be deleted. Please make sure the backend is running."
      );
    }
  };

  // ==========================================
  // VISITS
  // ==========================================

  const openVisitModal = () => {
    setVisitForm({
      student: "",
      complaint: "",
      treatment: "",
      status: "Treated",
    });

    setModal("visit");
  };

  const addVisit = async () => {
    const student =
      visitForm.student.trim();

    const complaint =
      visitForm.complaint.trim();

    const treatment =
      visitForm.treatment.trim();

    if (!student || !complaint) {
      alert(
        "Please enter the student name and complaint."
      );
      return;
    }

    const newVisit = {
      id: Date.now(),
      student,
      complaint,
      treatment,
      status:
        visitForm.status,
      date: new Date().toLocaleDateString(),
    };

    try {
      const response =
        await fetch(
          `${API_BASE}/visits`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              newVisit
            ),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to save visit"
        );
      }

      setVisits(
        (current) => [
          ...current,
          result,
        ]
      );

      setModal(null);

      alert(
        "Clinic visit recorded successfully!"
      );
    } catch (error) {
      console.error(
        "Add visit error:",
        error
      );

      alert(
        "Clinic visit was not saved. Please make sure the backend is running."
      );
    }
  };

  const deleteVisit = async (id) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this clinic visit?"
      );

    if (!confirmed) return;

    try {
      const response =
        await fetch(
          `${API_BASE}/visits/${encodeURIComponent(
            id
          )}`,
          {
            method: "DELETE",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to delete visit"
        );
      }

      setVisits(
        (current) =>
          current.filter(
            (item) =>
              String(item.id) !==
              String(id)
          )
      );

      alert(
        "Clinic visit deleted successfully."
      );
    } catch (error) {
      console.error(
        "Delete visit error:",
        error
      );

      alert(
        "Clinic visit could not be deleted. Please make sure the backend is running."
      );
    }
  };

  // ==========================================
  // MEDICINES
  // ==========================================

  const openMedicineModal = () => {
    setMedicineForm({
      id: "",
      name: "",
      category: "",
      stock: "",
      expiry: "",
    });

    setModal("medicine");
  };

  // ==========================================
  // ADD MEDICINE
  // ==========================================

  const addMedicine = async () => {
    const name =
      medicineForm.name.trim();

    const category =
      medicineForm.category.trim();

    const stock =
      Number(medicineForm.stock);

    const expiry =
      medicineForm.expiry || "";

    if (
      !name ||
      !category ||
      medicineForm.stock === ""
    ) {
      alert(
        "Please complete all required fields."
      );
      return;
    }

    if (
      !Number.isFinite(stock) ||
      stock < 0
    ) {
      alert(
        "Stock cannot be negative."
      );
      return;
    }

    const newMedicine = {
      id: Date.now(),
      name,
      category,
      stock,
      expiry,
    };

    try {
      const response =
        await fetch(
          `${API_BASE}/medicines`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              newMedicine
            ),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to save medicine"
        );
      }

      setMedicines(
        (current) => [
          ...current,
          result,
        ]
      );

      setModal(null);

      alert(
        "Medicine added successfully!"
      );
    } catch (error) {
      console.error(
        "Add medicine error:",
        error
      );

      alert(
        "Medicine was not saved. Make sure the backend is running on localhost:8080."
      );
    }
  };

  // ==========================================
  // OPEN EDIT MEDICINE
  // ==========================================

  const editMedicine = (medicine) => {
    setMedicineForm({
      id: String(
        medicine.id
      ),
      name:
        medicine.name || "",
      category:
        medicine.category || "",
      stock:
        medicine.stock ?? "",
      expiry:
        medicine.expiry || "",
    });

    setModal(
      "medicine-edit"
    );
  };

  // ==========================================
  // UPDATE MEDICINE
  // ==========================================

  const updateMedicine =
    async () => {
      const id = String(
        medicineForm.id
      );

      const name =
        medicineForm.name.trim();

      const category =
        medicineForm.category.trim();

      const stock =
        Number(
          medicineForm.stock
        );

      const expiry =
        medicineForm.expiry || "";

      if (
        !id ||
        !name ||
        !category ||
        medicineForm.stock === ""
      ) {
        alert(
          "Please complete all required fields."
        );
        return;
      }

      if (
        !Number.isFinite(
          stock
        ) ||
        stock < 0
      ) {
        alert(
          "Stock cannot be negative."
        );
        return;
      }

      const updatedMedicine = {
        id,
        name,
        category,
        stock,
        expiry,
      };

      try {
        const response =
          await fetch(
            `${API_BASE}/medicines/${encodeURIComponent(
              id
            )}`,
            {
              method: "PUT",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                updatedMedicine
              ),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Failed to update medicine"
          );
        }

        // Immediately update
        // the React table
        setMedicines(
          (current) =>
            current.map(
              (item) =>
                String(item.id) ===
                id
                  ? result
                  : item
            )
        );

        setModal(null);

        alert(
          "Medicine updated successfully!"
        );
      } catch (error) {
        console.error(
          "Update medicine error:",
          error
        );

        alert(
          "Medicine could not be updated. Make sure the backend is running on localhost:8080."
        );
      }
    };

  // ==========================================
  // DELETE MEDICINE
  // ==========================================

  const deleteMedicine =
    async (id) => {
      const medicine =
        medicines.find(
          (item) =>
            String(item.id) ===
            String(id)
        );

      if (!medicine) return;

      const confirmed =
        window.confirm(
          `Are you sure you want to delete ${medicine.name} from the inventory?`
        );

      if (!confirmed) return;

      try {
        const response =
          await fetch(
            `${API_BASE}/medicines/${encodeURIComponent(
              id
            )}`,
            {
              method: "DELETE",
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              result.message ||
              "Failed to delete medicine"
          );
        }

        // Immediately remove
        // from React table
        setMedicines(
          (current) =>
            current.filter(
              (item) =>
                String(item.id) !==
                String(id)
            )
        );

        alert(
          "Medicine deleted successfully."
        );
      } catch (error) {
        console.error(
          "Delete medicine error:",
          error
        );

        alert(
          "Medicine could not be deleted. Check that the backend is running."
        );
      }
    };

  // ==========================================
  // PAGE TITLES
  // ==========================================

  const pageTitles = {
    dashboard: "Dashboard",
    students: "Students",
    visits: "Clinic Visits",
    records: "Medical Records",
    medicines: "Medicines",
    stock: "Stock Management",
    reports: "Reports",
    users: "Users",
    settings: "Settings",
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="dashboard-wrapper">

      {/* ======================================
          SIDEBAR
      ====================================== */}

      <aside className="sidebar">

        <div className="brand">
          <i className="bi bi-heart-pulse-fill me-2"></i>
          School Clinic
        </div>

        <div className="sidebar-brand-sub">
          Management System
        </div>

        <nav className="sidebar-nav">

          <button
            className={`nav-link ${
              activeSection ===
              "dashboard"
                ? "active"
                : ""
            }`}
            onClick={() =>
              showSection(
                "dashboard"
              )
            }
          >
            <i className="bi bi-grid-1x2-fill me-2"></i>
            Dashboard
          </button>

          <button
            className={`nav-link ${
              activeSection ===
              "students"
                ? "active"
                : ""
            }`}
            onClick={() =>
              showSection(
                "students"
              )
            }
          >
            <i className="bi bi-people me-2"></i>
            Students
          </button>

          <button
            className={`nav-link ${
              activeSection ===
              "visits"
                ? "active"
                : ""
            }`}
            onClick={() =>
              showSection(
                "visits"
              )
            }
          >
            <i className="bi bi-heart-pulse me-2"></i>
            Clinic Visits
          </button>

          <button
            className={`nav-link ${
              activeSection ===
              "records"
                ? "active"
                : ""
            }`}
            onClick={() =>
              showSection(
                "records"
              )
            }
          >
            <i className="bi bi-folder2-open me-2"></i>
            Medical Records
          </button>

          <button
            className={`nav-link ${
              activeSection ===
              "medicines"
                ? "active"
                : ""
            }`}
            onClick={() =>
              showSection(
                "medicines"
              )
            }
          >
            <i className="bi bi-capsule me-2"></i>
            Medicines
          </button>

          <button
            className={`nav-link ${
              activeSection ===
              "stock"
                ? "active"
                : ""
            }`}
            onClick={() =>
              showSection(
                "stock"
              )
            }
          >
            <i className="bi bi-box-seam me-2"></i>
            Stock Management
          </button>

          <button
            className={`nav-link ${
              activeSection ===
              "reports"
                ? "active"
                : ""
            }`}
            onClick={() =>
              showSection(
                "reports"
              )
            }
          >
            <i className="bi bi-bar-chart-line me-2"></i>
            Reports
          </button>

          <button
            className={`nav-link ${
              activeSection ===
              "users"
                ? "active"
                : ""
            }`}
            onClick={() =>
              showSection(
                "users"
              )
            }
          >
            <i className="bi bi-person-gear me-2"></i>
            Users
          </button>

          <button
            className={`nav-link ${
              activeSection ===
              "settings"
                ? "active"
                : ""
            }`}
            onClick={() =>
              showSection(
                "settings"
              )
            }
          >
            <i className="bi bi-gear me-2"></i>
            Settings
          </button>

        </nav>
      </aside>

      {/* ======================================
          MAIN
      ====================================== */}

      <main className="main">

        {/* TOPBAR */}

        <div className="topbar">

          <div className="page-heading">

            <h4>
              {
                pageTitles[
                  activeSection
                ]
              }
            </h4>

            <small className="text-muted">
              School Clinic Management System
            </small>

          </div>

          <div className="topbar-actions">

            <button
              className="btn btn-light-green rounded-circle"
              title="Notifications"
              onClick={() =>
                setModal(
                  "notifications"
                )
              }
            >
              <i className="bi bi-bell"></i>
            </button>

            <button
              className="btn btn-green"
              onClick={
                openVisitModal
              }
            >
              <i className="bi bi-plus-lg me-1"></i>
              New Clinic Visit
            </button>

            <div className="user-pill">

              <div className="admin-avatar">
                <i className="bi bi-person"></i>
              </div>

              <div className="d-none d-sm-block">

                <div className="fw-semibold small">
                  {loggedInUser}
                </div>

                <div
                  className="text-muted"
                  style={{
                    fontSize:
                      "11px",
                  }}
                >
                  Admin
                </div>

              </div>

            </div>

            <button
              className="btn btn-outline-danger"
              onClick={logout}
            >
              <i className="bi bi-box-arrow-right me-1"></i>
              Logout
            </button>

          </div>
        </div>

        {/* ======================================
            CONTENT
        ====================================== */}

        <div className="content">

          {/* ====================================
              DASHBOARD
          ==================================== */}

          {activeSection ===
            "dashboard" && (
            <div className="page-view">

              {/* STAT CARDS */}

              <div className="row g-4 mb-4">

                <StatCard
                  title="Total Students"
                  number={totalStudents.toLocaleString()}
                  label="Registered students"
                />

                <StatCard
                  title="Clinic Visits"
                  number={
                    totalVisits
                  }
                  label="Recorded visits"
                />

                <StatCard
                  title="Medicines"
                  number={
                    totalMedicines
                  }
                  label="Medicine items"
                />

                <StatCard
                  title="Low Stock"
                  number={
                    lowStock
                  }
                  label="Need attention"
                />

              </div>

              {/* QUICK ACTIONS */}

              <div className="card p-4 mb-4">

                <h5 className="fw-bold mb-3">
                  Quick Actions
                </h5>

                <div className="row g-3">

                  <QuickAction
                    icon="bi-person-plus"
                    title="Add Student"
                    description="Register a new student"
                    onClick={
                      openStudentModal
                    }
                  />

                  <QuickAction
                    icon="bi-heart-pulse"
                    title="Record Visit"
                    description="Record a clinic visit"
                    onClick={
                      openVisitModal
                    }
                  />

                  <QuickAction
                    icon="bi-capsule"
                    title="Add Medicine"
                    description="Add medicine to inventory"
                    onClick={
                      openMedicineModal
                    }
                  />

                </div>
              </div>

              {/* RECENT VISITS */}

              <div className="row g-4">

                <div className="col-lg-7">

                  <div className="card p-4">

                    <div className="d-flex justify-content-between align-items-center mb-3">

                      <h5 className="fw-bold mb-0">
                        Recent Clinic Visits
                      </h5>

                      <button
                        className="btn btn-light-green btn-sm"
                        onClick={() =>
                          showSection(
                            "visits"
                          )
                        }
                      >
                        View All
                      </button>

                    </div>

                    <div className="table-responsive">

                      <table className="table align-middle">

                        <thead>

                          <tr>
                            <th>
                              Student
                            </th>

                            <th>
                              Complaint
                            </th>

                            <th>
                              Date
                            </th>

                            <th>
                              Status
                            </th>
                          </tr>

                        </thead>

                        <tbody>

                          {visits.length ===
                          0 ? (
                            <tr>
                              <td
                                colSpan="4"
                                className="text-center text-muted"
                              >
                                No clinic visits recorded.
                              </td>
                            </tr>
                          ) : (
                            visits
                              .slice(
                                -5
                              )
                              .reverse()
                              .map(
                                (
                                  visit
                                ) => (
                                  <tr
                                    key={
                                      visit.id
                                    }
                                  >

                                    <td>
                                      {
                                        visit.student
                                      }
                                    </td>

                                    <td>
                                      {
                                        visit.complaint
                                      }
                                    </td>

                                    <td>
                                      {
                                        visit.date
                                      }
                                    </td>

                                    <td>
                                      <span className="badge badge-info">
                                        {
                                          visit.status
                                        }
                                      </span>
                                    </td>

                                  </tr>
                                )
                              )
                          )}

                        </tbody>

                      </table>

                    </div>
                  </div>
                </div>

                {/* LOW STOCK */}

                <div className="col-lg-5">

                  <div className="card p-4">

                    <h5 className="fw-bold">
                      Low Stock
                    </h5>

                    <p className="text-muted">
                      Medicines that need attention.
                    </p>

                    {lowStockMedicines.length ===
                    0 ? (
                      <div className="text-muted py-3">
                        No newly added medicines are low in stock.
                      </div>
                    ) : (
                      lowStockMedicines
                        .slice(
                          0,
                          5
                        )
                        .map(
                          (
                            medicine
                          ) => (
                            <div
                              key={
                                medicine.id
                              }
                              className="d-flex justify-content-between border-bottom py-3"
                            >
                              <span>
                                {
                                  medicine.name
                                }
                              </span>

                              <span className="badge badge-low">
                                Low
                              </span>
                            </div>
                          )
                        )
                    )}

                    <button
                      className="btn btn-light-green w-100 mt-3"
                      onClick={() =>
                        showSection(
                          "stock"
                        )
                      }
                    >
                      View Inventory
                      <i className="bi bi-arrow-right ms-1"></i>
                    </button>

                  </div>
                </div>

              </div>

              {/* MEDICINE INVENTORY */}

              <div className="card p-4 mt-4">

                <div className="d-flex justify-content-between align-items-center">

                  <div>

                    <h5 className="fw-bold mb-1">
                      Medicine Inventory
                    </h5>

                    <p className="text-muted mb-0">
                      Manage medicines and stock.
                    </p>

                  </div>

                  <button
                    className="btn btn-green btn-sm"
                    onClick={
                      openMedicineModal
                    }
                  >
                    <i className="bi bi-plus-lg me-1"></i>
                    Add Medicine
                  </button>

                </div>

              </div>

            </div>
          )}

          {/* ====================================
              STUDENTS
          ==================================== */}

          {activeSection ===
            "students" && (
            <StudentsSection
              students={
                students
              }
              onAdd={
                openStudentModal
              }
              onDelete={
                deleteStudent
              }
            />
          )}

          {/* ====================================
              VISITS
          ==================================== */}

          {activeSection ===
            "visits" && (
            <VisitsSection
              visits={
                visits
              }
              onAdd={
                openVisitModal
              }
              onDelete={
                deleteVisit
              }
            />
          )}

          {/* ====================================
              MEDICAL RECORDS
          ==================================== */}

          {activeSection ===
            "records" && (
            <MedicalRecords
              visits={
                visits
              }
              search={
                recordSearch
              }
              setSearch={
                setRecordSearch
              }
            />
          )}

          {/* ====================================
              MEDICINES
          ==================================== */}

          {(activeSection ===
            "medicines" ||
            activeSection ===
              "stock") && (
            <InventorySection
              medicines={
                medicines
              }
              onAdd={
                openMedicineModal
              }
              onEdit={
                editMedicine
              }
              onDelete={
                deleteMedicine
              }
            />
          )}

          {/* ====================================
              REPORTS
          ==================================== */}

          {activeSection ===
            "reports" && (
            <ReportsSection
              students={
                totalStudents
              }
              visits={
                totalVisits
              }
              medicines={
                totalMedicines
              }
              lowStock={
                lowStock
              }
            />
          )}

          {/* ====================================
              USERS
          ==================================== */}

          {activeSection ===
            "users" && (
            <div className="card p-4">

              <h5 className="fw-bold">
                User Management
              </h5>

              <div className="p-3 rounded-3 my-3 user-info">

                <div className="d-flex align-items-center gap-3">

                  <div className="admin-avatar">
                    <i className="bi bi-person"></i>
                  </div>

                  <div>

                    <strong>
                      {
                        loggedInUser
                      }
                    </strong>

                    <br />

                    <small className="text-muted">
                      System Administrator
                    </small>

                  </div>

                </div>

              </div>

              <button
                className="btn btn-light-green"
                onClick={() =>
                  alert(
                    "Administrator has full system access."
                  )
                }
              >
                <i className="bi bi-shield-check me-1"></i>
                Check Permissions
              </button>

            </div>
          )}

          {/* ====================================
              SETTINGS
          ==================================== */}

          {activeSection ===
            "settings" && (
            <SettingsSection
              onClear={
                async () => {
                  const confirmed =
                    window.confirm(
                      "WARNING!\n\nThis will delete ALL students, clinic visits, and medicines from the backend.\n\nAre you sure?"
                    );

                  if (
                    !confirmed
                  )
                    return;

                  try {
                    const response =
                      await fetch(
                        `${API_BASE}/clinic-data`,
                        {
                          method:
                            "DELETE",
                        }
                      );

                    const result =
                      await response.json();

                    if (
                      !response.ok
                    ) {
                      throw new Error(
                        result.message ||
                          "Failed to clear data"
                      );
                    }

                    setStudents(
                      []
                    );

                    setVisits(
                      []
                    );

                    setMedicines(
                      []
                    );

                    alert(
                      "All clinic data has been deleted from the backend."
                    );
                  } catch (error) {
                    console.error(
                      "Clear data error:",
                      error
                    );

                    alert(
                      "The clinic data could not be cleared. Make sure the backend is running."
                    );
                  }
                }
              }
            />
          )}

        </div>
      </main>

      {/* ======================================
          ADD STUDENT MODAL
      ====================================== */}

      {modal ===
        "student" && (
        <Modal
          title="Add New Student"
          onClose={() =>
            setModal(null)
          }
          onSave={
            addStudent
          }
          saveText="Add Student"
        >

          <FormField
            label="Student ID"
            type="text"
            placeholder="2026-001"
            value={
              studentForm.id
            }
            onChange={(value) =>
              setStudentForm(
                {
                  ...studentForm,
                  id: value,
                }
              )
            }
          />

          <FormField
            label="Full Name"
            type="text"
            placeholder="Juan Dela Cruz"
            value={
              studentForm.name
            }
            onChange={(value) =>
              setStudentForm(
                {
                  ...studentForm,
                  name: value,
                }
              )
            }
          />

          <FormField
            label="Grade & Section"
            type="text"
            placeholder="Grade 7-A"
            value={
              studentForm.grade
            }
            onChange={(value) =>
              setStudentForm(
                {
                  ...studentForm,
                  grade: value,
                }
              )
            }
          />

          <FormField
            label="Contact Number"
            type="text"
            placeholder="09XXXXXXXXX"
            value={
              studentForm.contact
            }
            onChange={(value) =>
              setStudentForm(
                {
                  ...studentForm,
                  contact: value,
                }
              )
            }
          />

        </Modal>
      )}

      {/* ======================================
          VISIT MODAL
      ====================================== */}

      {modal ===
        "visit" && (
        <Modal
          title="Record Clinic Visit"
          onClose={() =>
            setModal(null)
          }
          onSave={
            addVisit
          }
          saveText="Save Visit"
        >

          <FormField
            label="Student Name"
            type="text"
            placeholder="Student name"
            value={
              visitForm.student
            }
            onChange={(value) =>
              setVisitForm(
                {
                  ...visitForm,
                  student: value,
                }
              )
            }
          />

          <FormField
            label="Complaint"
            type="text"
            placeholder="Headache, Fever, etc."
            value={
              visitForm.complaint
            }
            onChange={(value) =>
              setVisitForm(
                {
                  ...visitForm,
                  complaint: value,
                }
              )
            }
          />

          <div className="mb-3">

            <label className="form-label">
              Treatment
            </label>

            <textarea
              className="form-control"
              rows="3"
              placeholder="Treatment given"
              value={
                visitForm.treatment
              }
              onChange={(e) =>
                setVisitForm(
                  {
                    ...visitForm,
                    treatment:
                      e.target.value,
                  }
                )
              }
            ></textarea>

          </div>

          <div className="mb-3">

            <label className="form-label">
              Status
            </label>

            <select
              className="form-select"
              value={
                visitForm.status
              }
              onChange={(e) =>
                setVisitForm(
                  {
                    ...visitForm,
                    status:
                      e.target.value,
                  }
                )
              }
            >

              <option value="Treated">
                Treated
              </option>

              <option value="Observation">
                Observation
              </option>

              <option value="Referred">
                Referred
              </option>

            </select>

          </div>

        </Modal>
      )}

      {/* ======================================
          ADD MEDICINE MODAL
      ====================================== */}

      {modal ===
        "medicine" && (
        <Modal
          title="Add Medicine"
          onClose={() =>
            setModal(null)
          }
          onSave={
            addMedicine
          }
          saveText="Add Medicine"
        >

          <FormField
            label="Medicine Name"
            type="text"
            placeholder="Paracetamol"
            value={
              medicineForm.name
            }
            onChange={(value) =>
              setMedicineForm(
                {
                  ...medicineForm,
                  name: value,
                }
              )
            }
          />

          <FormField
            label="Category"
            type="text"
            placeholder="Pain Reliever"
            value={
              medicineForm.category
            }
            onChange={(value) =>
              setMedicineForm(
                {
                  ...medicineForm,
                  category:
                    value,
                }
              )
            }
          />

          <FormField
            label="Stock Quantity"
            type="number"
            placeholder="50"
            value={
              medicineForm.stock
            }
            onChange={(value) =>
              setMedicineForm(
                {
                  ...medicineForm,
                  stock: value,
                }
              )
            }
          />

          <FormField
            label="Expiration Date"
            type="date"
            value={
              medicineForm.expiry
            }
            onChange={(value) =>
              setMedicineForm(
                {
                  ...medicineForm,
                  expiry: value,
                }
              )
            }
          />

        </Modal>
      )}

      {/* ======================================
          EDIT MEDICINE MODAL
      ====================================== */}

      {modal ===
        "medicine-edit" && (
        <Modal
          title="Edit Medicine"
          onClose={() =>
            setModal(null)
          }
          onSave={
            updateMedicine
          }
          saveText="Save Changes"
        >

          <FormField
            label="Medicine Name"
            type="text"
            placeholder="Paracetamol"
            value={
              medicineForm.name
            }
            onChange={(value) =>
              setMedicineForm(
                {
                  ...medicineForm,
                  name: value,
                }
              )
            }
          />

          <FormField
            label="Category"
            type="text"
            placeholder="Pain Reliever"
            value={
              medicineForm.category
            }
            onChange={(value) =>
              setMedicineForm(
                {
                  ...medicineForm,
                  category:
                    value,
                }
              )
            }
          />

          <FormField
            label="Stock Quantity"
            type="number"
            placeholder="50"
            value={
              medicineForm.stock
            }
            onChange={(value) =>
              setMedicineForm(
                {
                  ...medicineForm,
                  stock: value,
                }
              )
            }
          />

          <FormField
            label="Expiration Date"
            type="date"
            value={
              medicineForm.expiry
            }
            onChange={(value) =>
              setMedicineForm(
                {
                  ...medicineForm,
                  expiry: value,
                }
              )
            }
          />

        </Modal>
      )}

      {/* ======================================
          NOTIFICATIONS
      ====================================== */}

      {modal ===
        "notifications" && (
        <Modal
          title="Notifications"
          onClose={() =>
            setModal(null)
          }
          onSave={() =>
            setModal(null)
          }
          saveText="Close"
        >

          <div className="notification-box warning">

            <i className="bi bi-exclamation-triangle me-2"></i>

            <strong>
              Low Stock Alert
            </strong>

            <br />

            {lowStock} medicines need attention.

          </div>

          <div className="notification-box info">

            <i className="bi bi-heart-pulse me-2"></i>

            <strong>
              Clinic Visits
            </strong>

            <br />

            {totalVisits} clinic visits recorded.

          </div>

          <div className="notification-box success">

            <i className="bi bi-check-circle me-2"></i>

            <strong>
              System Status
            </strong>

            <br />

            School clinic system is running normally.

          </div>

        </Modal>
      )}

    </div>
  );
}

// ==========================================
// FORM FIELD
// ==========================================

function FormField({
  label,
  type,
  placeholder,
  value,
  onChange,
}) {
  return (
    <div className="mb-3">

      <label className="form-label">
        {label}
      </label>

      <input
        type={type}
        className="form-control"
        placeholder={placeholder}
        min={
          type === "number"
            ? "0"
            : undefined
        }
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
      />

    </div>
  );
}

// ==========================================
// STAT CARD
// ==========================================

function StatCard({
  title,
  number,
  label,
}) {
  return (
    <div className="col-md-3">

      <div className="card p-4">

        <div className="text-muted mb-2">
          {title}
        </div>

        <div className="stat-number">
          {number}
        </div>

        <div className="stat-label">
          {label}
        </div>

      </div>

    </div>
  );
}

// ==========================================
// QUICK ACTION
// ==========================================

function QuickAction({
  icon,
  title,
  description,
  onClick,
}) {
  return (
    <div className="col-md-4">

      <div
        className="quick-action border rounded-3 p-3 d-flex align-items-center gap-3"
        onClick={onClick}
        role="button"
      >

        <div className="action-icon">
          <i
            className={`bi ${icon}`}
          ></i>
        </div>

        <div>

          <strong>
            {title}
          </strong>

          <div className="text-muted small">
            {description}
          </div>

        </div>

      </div>

    </div>
  );
}

// ==========================================
// MODAL
// ==========================================

function Modal({
  title,
  children,
  onClose,
  onSave,
  saveText,
}) {
  return (
    <div
      className="modal-backdrop-custom"
      onClick={onClose}
    >

      <div
        className="modal-dialog-custom clinic-form-dialog"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        <div className="modal-content clinic-form-modal">

          <div className="modal-header">

            <h5 className="modal-title fw-bold">
              {title}
            </h5>

            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>

          </div>

          <div className="modal-body clinic-form-body">

            <div className="clinic-form-fields">
              {children}
            </div>

          </div>

          <div className="modal-footer">

            <button
              type="button"
              className="btn btn-light-green"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-green"
              onClick={onSave}
            >
              {saveText}
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

// ==========================================
// STUDENTS SECTION
// ==========================================

function StudentsSection({
  students,
  onAdd,
  onDelete,
}) {
  return (
    <div className="card p-4">

      <div className="d-flex justify-content-between align-items-center mb-3">

        <div>

          <h5 className="fw-bold mb-1">
            Student Records
          </h5>

          <p className="text-muted mb-0">
            Manage registered students.
          </p>

        </div>

        <button
          className="btn btn-green"
          onClick={onAdd}
        >
          <i className="bi bi-person-plus me-1"></i>
          Add Student
        </button>

      </div>

      <div className="table-responsive">

        <table className="table align-middle">

          <thead>

            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Grade</th>
              <th>Contact</th>
              <th>Action</th>
            </tr>

          </thead>

          <tbody>

            {students.length ===
            0 ? (
              <tr>

                <td
                  colSpan="5"
                  className="text-center text-muted"
                >
                  No students added yet.
                </td>

              </tr>
            ) : (
              students.map(
                (student) => (
                  <tr
                    key={
                      student.id
                    }
                  >

                    <td>
                      {
                        student.id
                      }
                    </td>

                    <td>
                      {
                        student.name
                      }
                    </td>

                    <td>
                      {
                        student.grade
                      }
                    </td>

                    <td>
                      {
                        student.contact ||
                        "-"
                      }
                    </td>

                    <td>

                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() =>
                          onDelete(
                            student.id
                          )
                        }
                      >
                        <i className="bi bi-trash me-1"></i>
                        Delete
                      </button>

                    </td>

                  </tr>
                )
              )
            )}

          </tbody>

        </table>

      </div>
    </div>
  );
}

// ==========================================
// VISITS SECTION
// ==========================================

function VisitsSection({
  visits,
  onAdd,
  onDelete,
}) {
  return (
    <div className="card p-4">

      <div className="d-flex justify-content-between align-items-center mb-3">

        <div>

          <h5 className="fw-bold mb-1">
            Clinic Visits
          </h5>

          <p className="text-muted mb-0">
            View recorded clinic visits.
          </p>

        </div>

        <button
          className="btn btn-green"
          onClick={onAdd}
        >
          <i className="bi bi-plus-lg me-1"></i>
          Record Visit
        </button>

      </div>

      <div className="table-responsive">

        <table className="table align-middle">

          <thead>

            <tr>
              <th>Student</th>
              <th>Complaint</th>
              <th>Treatment</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>

          </thead>

          <tbody>

            {visits.length ===
            0 ? (
              <tr>

                <td
                  colSpan="6"
                  className="text-center text-muted"
                >
                  No clinic visits recorded.
                </td>

              </tr>
            ) : (
              visits.map(
                (visit) => (
                  <tr
                    key={
                      visit.id
                    }
                  >

                    <td>
                      {
                        visit.student
                      }
                    </td>

                    <td>
                      {
                        visit.complaint
                      }
                    </td>

                    <td>
                      {
                        visit.treatment ||
                        "-"
                      }
                    </td>

                    <td>
                      {
                        visit.date
                      }
                    </td>

                    <td>

                      <span className="badge badge-info">
                        {
                          visit.status
                        }
                      </span>

                    </td>

                    <td>

                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() =>
                          onDelete(
                            visit.id
                          )
                        }
                      >
                        <i className="bi bi-trash"></i>
                      </button>

                    </td>

                  </tr>
                )
              )
            )}

          </tbody>

        </table>

      </div>
    </div>
  );
}

// ==========================================
// MEDICAL RECORDS
// ==========================================

function MedicalRecords({
  visits,
  search,
  setSearch,
}) {
  const results =
    visits.filter(
      (visit) =>
        String(
          visit.student || ""
        )
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    );

  return (
    <div className="card p-4">

      <h5 className="fw-bold mb-3">
        Medical Records
      </h5>

      <div className="input-group mb-4">

        <input
          type="text"
          className="form-control"
          placeholder="Search student name"
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />

        <button className="btn btn-green">
          Search
        </button>

      </div>

      {search === "" ? (
        <p className="text-muted">
          Search for a student's medical history.
        </p>
      ) : results.length ===
        0 ? (
        <div className="alert alert-warning">
          No medical records found.
        </div>
      ) : (
        results.map(
          (record) => (
            <div
              key={
                record.id
              }
              className="p-3 mb-2 rounded-3 medical-record"
            >

              <strong>
                {
                  record.student
                }
              </strong>

              <br />

              Complaint:{" "}
              {
                record.complaint
              }

              <br />

              Treatment:{" "}
              {
                record.treatment ||
                "None"
              }

              <br />

              Status:{" "}
              {
                record.status
              }

              <br />

              <small>
                {
                  record.date
                }
              </small>

            </div>
          )
        )
      )}

    </div>
  );
}

// ==========================================
// INVENTORY SECTION
// ==========================================

function InventorySection({
  medicines,
  onAdd,
  onEdit,
  onDelete,
}) {
  return (
    <div className="card p-4">

      <div className="d-flex justify-content-between align-items-center mb-3">

        <div>

          <h5 className="fw-bold mb-1">
            Medicine Inventory
          </h5>

          <p className="text-muted mb-0">
            Manage medicines and stock.
          </p>

        </div>

        <button
          className="btn btn-green"
          onClick={onAdd}
        >
          <i className="bi bi-plus-lg me-1"></i>
          Add Medicine
        </button>

      </div>

      <div className="table-responsive">

        <table className="table align-middle">

          <thead>

            <tr>

              <th>
                Medicine
              </th>

              <th>
                Category
              </th>

              <th>
                Stock
              </th>

              <th>
                Expiration
              </th>

              <th>
                Status
              </th>

              <th>
                Action
              </th>

            </tr>

          </thead>

          <tbody>

            {medicines.length ===
            0 ? (
              <tr>

                <td
                  colSpan="6"
                  className="text-center text-muted"
                >
                  No medicines added yet.
                </td>

              </tr>
            ) : (
              medicines.map(
                (medicine) => {

                  const lowStock =
                    Number(
                      medicine.stock
                    ) <= 5;

                  return (
                    <tr
                      key={
                        medicine.id
                      }
                    >

                      <td>
                        <strong>
                          {
                            medicine.name
                          }
                        </strong>
                      </td>

                      <td>
                        {
                          medicine.category
                        }
                      </td>

                      <td>
                        {
                          medicine.stock
                        }
                      </td>

                      <td>
                        {
                          medicine.expiry ||
                          "-"
                        }
                      </td>

                      <td>

                        <span
                          className={`badge ${
                            lowStock
                              ? "badge-low"
                              : "badge-good"
                          }`}
                        >
                          {lowStock
                            ? "Low Stock"
                            : "Good Stock"}
                        </span>

                      </td>

                      <td>

                        <div className="d-flex gap-2">

                          {/* EDIT BUTTON */}

                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() =>
                              onEdit(
                                medicine
                              )
                            }
                            title="Edit medicine"
                          >
                            <i className="bi bi-pencil me-1"></i>
                            Edit
                          </button>

                          {/* DELETE BUTTON */}

                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() =>
                              onDelete(
                                medicine.id
                              )
                            }
                            title="Delete medicine"
                          >
                            <i className="bi bi-trash me-1"></i>
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>
                  );
                }
              )
            )}

          </tbody>

        </table>

      </div>
    </div>
  );
}

// ==========================================
// REPORTS
// ==========================================

function ReportsSection({
  students,
  visits,
  medicines,
  lowStock,
}) {
  return (
    <div className="row g-4">

      <ReportCard
        title="Total Students"
        number={students}
        className="report-green"
      />

      <ReportCard
        title="Clinic Visits"
        number={visits}
        className="report-blue"
      />

      <ReportCard
        title="Medicines"
        number={medicines}
        className="report-yellow"
      />

      <ReportCard
        title="Low Stock"
        number={lowStock}
        className="report-red"
      />

    </div>
  );
}

function ReportCard({
  title,
  number,
  className,
}) {
  return (
    <div className="col-md-6">

      <div
        className={`p-4 rounded-3 ${className}`}
      >

        <small>
          {title}
        </small>

        <h2 className="fw-bold">
          {number}
        </h2>

      </div>

    </div>
  );
}

// ==========================================
// SETTINGS
// ==========================================

function SettingsSection({
  onClear,
}) {
  const [
    notifications,
    setNotifications,
  ] = useState(true);

  const [
    autosave,
    setAutosave,
  ] = useState(true);

  return (
    <div className="card p-4">

      <h5 className="fw-bold mb-4">
        System Settings
      </h5>

      <div className="form-check form-switch mb-3">

        <input
          className="form-check-input"
          type="checkbox"
          checked={
            notifications
          }
          onChange={(e) =>
            setNotifications(
              e.target.checked
            )
          }
        />

        <label className="form-check-label">
          Enable Notifications
        </label>

      </div>

      <div className="form-check form-switch mb-4">

        <input
          className="form-check-input"
          type="checkbox"
          checked={
            autosave
          }
          onChange={(e) =>
            setAutosave(
              e.target.checked
            )
          }
        />

        <label className="form-check-label">
          Enable Auto Save
        </label>

      </div>

      <hr />

      <button
        className="btn btn-danger"
        onClick={onClear}
      >
        <i className="bi bi-trash me-1"></i>
        Clear Saved Test Data
      </button>

    </div>
  );
}

export default Dashboard;

