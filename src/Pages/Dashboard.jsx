
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../Firebase";

const API_BASE = "http://localhost:8080/api";

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("The backend returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(
      data.message || data.error || `Request failed (${response.status})`
    );
  }

  return data;
}

function Dashboard() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [visits, setVisits] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [stockManagement, setStockManagement] = useState([]);

  const [activeSection, setActiveSection] = useState("dashboard");
  const [loggedInUser, setLoggedInUser] = useState("Administrator");
  const [modal, setModal] = useState(null);
  const [recordSearch, setRecordSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [studentForm, setStudentForm] = useState({
    id: "",
    name: "",
    grade: "",
    contact: "",
  });

  const [visitForm, setVisitForm] = useState({
    student: "",
    complaint: "",
    treatment: "",
    status: "Treated",
  });

  const [medicineForm, setMedicineForm] = useState({
    id: "",
    name: "",
    category: "",
    stock: "",
    expiry: "",
  });

  const [medicalRecordForm, setMedicalRecordForm] = useState({
    student_id: "",
    diagnosis: "",
    treatment: "",
    notes: "",
    record_date: new Date().toISOString().slice(0, 10),
  });

  const [stockForm, setStockForm] = useState({
    medicine_id: "",
    movement_type: "Stock In",
    quantity: "",
    reason: "",
  });

  // ==========================================
  // FIREBASE AUTHENTICATION
  // ==========================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      setLoggedInUser(
        user.displayName || user.email || "Administrator"
      );
    });

    return () => unsubscribe();
  }, [navigate]);

  // ==========================================
  // LOAD ALL DATA FROM MYSQL
  // ==========================================

  const loadClinicData = async () => {
    try {
      setLoading(true);

      const data = await apiRequest("/clinic-data");

      setStudents(Array.isArray(data.students) ? data.students : []);
      setVisits(Array.isArray(data.visits) ? data.visits : []);
      setMedicines(Array.isArray(data.medicines) ? data.medicines : []);
      setMedicalRecords(
        Array.isArray(data.medicalRecords) ? data.medicalRecords : []
      );
      setStockManagement(
        Array.isArray(data.stockManagement) ? data.stockManagement : []
      );
    } catch (error) {
      console.error("Load clinic data error:", error);

      alert(
        `Could not load clinic data.\n\n${error.message}\n\nMake sure MySQL and the backend are running.`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinicData();
  }, []);

  // ==========================================
  // COUNTS
  // ==========================================

  const totalStudents = students.length;
  const totalVisits = visits.length;
  const totalMedicines = medicines.length;

  const lowStockMedicines = medicines.filter(
    (medicine) => Number(medicine.stock) <= 5
  );

  const lowStock = lowStockMedicines.length;

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
    if (!window.confirm("Are you sure you want to log out?")) return;

    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      alert(error.message);
    }
  };

  // ==========================================
  // STUDENTS
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
    const id = studentForm.id.trim();
    const name = studentForm.name.trim();
    const grade = studentForm.grade.trim();
    const contact = studentForm.contact.trim();

    if (!id || !name || !grade) {
      alert("Please complete Student ID, Name, and Grade.");
      return;
    }

    const duplicate = students.some(
      (student) => String(student.student_code || student.id) === id
    );

    if (duplicate) {
      alert("This Student ID already exists.");
      return;
    }

    try {
      const result = await apiRequest("/students", {
        method: "POST",
        body: JSON.stringify({ id, name, grade, contact }),
      });

      setStudents((current) => [result, ...current]);
      setModal(null);

      alert("Student successfully saved to MySQL!");
    } catch (error) {
      console.error("Add student error:", error);
      alert(`Student was not saved.\n\n${error.message}`);
    }
  };

  const deleteStudent = async (id) => {
    const student = students.find(
      (item) => String(item.id) === String(id)
    );

    if (!student) return;

    if (!window.confirm(`Are you sure you want to delete ${student.name}?`)) {
      return;
    }

    try {
      await apiRequest(`/students/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      setStudents((current) =>
        current.filter((item) => String(item.id) !== String(id))
      );

      setMedicalRecords((current) =>
        current.filter(
          (record) => String(record.student_id) !== String(id)
        )
      );

      alert("Student deleted successfully.");
    } catch (error) {
      console.error("Delete student error:", error);
      alert(`Student could not be deleted.\n\n${error.message}`);
    }
  };

  // ==========================================
  // CLINIC VISITS
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
    const student = visitForm.student.trim();
    const complaint = visitForm.complaint.trim();
    const treatment = visitForm.treatment.trim();

    if (!student || !complaint) {
      alert("Please enter the student name and complaint.");
      return;
    }

    try {
      const result = await apiRequest("/visits", {
        method: "POST",
        body: JSON.stringify({
          student,
          complaint,
          treatment,
          status: visitForm.status,
          date: new Date().toISOString().slice(0, 10),
        }),
      });

      setVisits((current) => [result, ...current]);
      setModal(null);

      alert("Clinic visit successfully saved to MySQL!");
    } catch (error) {
      console.error("Add visit error:", error);
      alert(`Clinic visit was not saved.\n\n${error.message}`);
    }
  };

  const deleteVisit = async (id) => {
    if (!window.confirm("Are you sure you want to delete this clinic visit?")) {
      return;
    }

    try {
      await apiRequest(`/visits/${id}`, {
        method: "DELETE",
      });

      setVisits((current) =>
        current.filter((visit) => String(visit.id) !== String(id))
      );

      alert("Clinic visit deleted successfully.");
    } catch (error) {
      console.error("Delete visit error:", error);
      alert(`Clinic visit could not be deleted.\n\n${error.message}`);
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

  const addMedicine = async () => {
    const name = medicineForm.name.trim();
    const category = medicineForm.category.trim();
    const stock = Number(medicineForm.stock);
    const expiry = medicineForm.expiry || "";

    if (!name || !category || medicineForm.stock === "") {
      alert("Please complete all required fields.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      alert("Stock must be a whole number and cannot be negative.");
      return;
    }

    try {
      const result = await apiRequest("/medicines", {
        method: "POST",
        body: JSON.stringify({
          name,
          category,
          stock,
          expiry,
        }),
      });

      setMedicines((current) => [result, ...current]);
      setModal(null);

      alert("Medicine successfully saved to MySQL!");
    } catch (error) {
      console.error("Add medicine error:", error);
      alert(`Medicine was not saved.\n\n${error.message}`);
    }
  };

  const editMedicine = (medicine) => {
    setMedicineForm({
      id: String(medicine.id),
      name: medicine.name || "",
      category: medicine.category || "",
      stock: medicine.stock ?? "",
      expiry: medicine.expiry
        ? String(medicine.expiry).slice(0, 10)
        : "",
    });

    setModal("medicine-edit");
  };

  const updateMedicine = async () => {
    const id = String(medicineForm.id).trim();
    const name = medicineForm.name.trim();
    const category = medicineForm.category.trim();
    const stock = Number(medicineForm.stock);
    const expiry = medicineForm.expiry || "";

    if (!id || !name || !category || medicineForm.stock === "") {
      alert("Please complete all required fields.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      alert("Stock must be a whole number and cannot be negative.");
      return;
    }

    try {
      const result = await apiRequest(
        `/medicines/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name,
            category,
            stock,
            expiry,
          }),
        }
      );

      const savedMedicine = result.medicine || result;

      setMedicines((current) =>
        current.map((medicine) =>
          String(medicine.id) === id
            ? { ...medicine, ...savedMedicine }
            : medicine
        )
      );

      setModal(null);

      alert("Medicine updated successfully in MySQL!");
    } catch (error) {
      console.error("Update medicine error:", error);
      alert(`Medicine could not be updated.\n\n${error.message}`);
    }
  };

  const deleteMedicine = async (id) => {
    const medicine = medicines.find(
      (item) => String(item.id) === String(id)
    );

    if (!medicine) return;

    if (
      !window.confirm(
        `Are you sure you want to delete ${medicine.name} from the inventory?`
      )
    ) {
      return;
    }

    try {
      await apiRequest(`/medicines/${id}`, {
        method: "DELETE",
      });

      setMedicines((current) =>
        current.filter((item) => String(item.id) !== String(id))
      );

      alert("Medicine deleted successfully.");
    } catch (error) {
      console.error("Delete medicine error:", error);
      alert(`Medicine could not be deleted.\n\n${error.message}`);
    }
  };

  // ==========================================
  // MEDICAL RECORDS
  // ==========================================

  const openMedicalRecordModal = () => {
    setMedicalRecordForm({
      student_id: "",
      diagnosis: "",
      treatment: "",
      notes: "",
      record_date: new Date().toISOString().slice(0, 10),
    });

    setModal("medical-record");
  };

  const addMedicalRecord = async () => {
    if (
      !medicalRecordForm.student_id ||
      !medicalRecordForm.diagnosis.trim()
    ) {
      alert("Please select a student and enter a diagnosis.");
      return;
    }

    try {
      const result = await apiRequest("/medical-records", {
        method: "POST",
        body: JSON.stringify(medicalRecordForm),
      });

      setMedicalRecords((current) => [result, ...current]);
      setModal(null);

      alert("Medical record successfully saved to MySQL!");
    } catch (error) {
      console.error("Add medical record error:", error);
      alert(`Medical record was not saved.\n\n${error.message}`);
    }
  };

  const deleteMedicalRecord = async (id) => {
    if (!window.confirm("Delete this medical record?")) return;

    try {
      await apiRequest(`/medical-records/${id}`, {
        method: "DELETE",
      });

      setMedicalRecords((current) =>
        current.filter((record) => String(record.id) !== String(id))
      );

      alert("Medical record deleted successfully.");
    } catch (error) {
      console.error("Delete medical record error:", error);
      alert(`Medical record could not be deleted.\n\n${error.message}`);
    }
  };

  // ==========================================
  // STOCK MANAGEMENT
  // ==========================================

  const openStockModal = () => {
    setStockForm({
      medicine_id: medicines[0] ? String(medicines[0].id) : "",
      movement_type: "Stock In",
      quantity: "",
      reason: "",
    });

    setModal("stock");
  };

  const addStockMovement = async () => {
    const quantity = Number(stockForm.quantity);

    if (
      !stockForm.medicine_id ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      alert("Select a medicine and enter a positive whole-number quantity.");
      return;
    }

    try {
      const result = await apiRequest("/stock-management", {
        method: "POST",
        body: JSON.stringify({
          ...stockForm,
          quantity,
        }),
      });

      setStockManagement((current) => [result, ...current]);

      setMedicines((current) =>
        current.map((medicine) =>
          String(medicine.id) === String(result.medicine_id)
            ? { ...medicine, stock: result.new_stock }
            : medicine
        )
      );

      setModal(null);

      alert("Stock movement successfully saved to MySQL!");
    } catch (error) {
      console.error("Stock movement error:", error);
      alert(`Stock movement was not saved.\n\n${error.message}`);
    }
  };

  // ==========================================
  // CLEAR ALL MYSQL DATA
  // ==========================================

  const clearAllData = async () => {
    const confirmed = window.confirm(
      "WARNING!\n\nThis permanently deletes all records from the six MySQL tables:\n\nStudents, Visits, Medical Records, Medicines, and Stock Management.\n\nAre you sure?"
    );

    if (!confirmed) return;

    try {
      await apiRequest("/clinic-data", {
        method: "DELETE",
      });

      setStudents([]);
      setVisits([]);
      setMedicines([]);
      setMedicalRecords([]);
      setStockManagement([]);

      alert("All clinic data has been cleared from MySQL.");
    } catch (error) {
      console.error("Clear data error:", error);
      alert(`Could not clear clinic data.\n\n${error.message}`);
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
      <aside className="sidebar">
        <div className="brand">
          <i className="bi bi-heart-pulse-fill me-2"></i>
          School Clinic
        </div>

        <div className="sidebar-brand-sub">
          Management System
        </div>

        <nav className="sidebar-nav">
          {[
            ["dashboard", "bi-grid-1x2-fill", "Dashboard"],
            ["students", "bi-people", "Students"],
            ["visits", "bi-heart-pulse", "Clinic Visits"],
            ["records", "bi-folder2-open", "Medical Records"],
            ["medicines", "bi-capsule", "Medicines"],
            ["stock", "bi-box-seam", "Stock Management"],
            ["reports", "bi-bar-chart", "Reports"],
            ["users", "bi-person-gear", "Users"],
            ["settings", "bi-gear", "Settings"],
          ].map(([section, icon, label]) => (
            <button
              key={section}
              className={`nav-link ${
                activeSection === section ? "active" : ""
              }`}
              onClick={() => showSection(section)}
            >
              <i className={`bi ${icon} me-2`}></i>
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h4 className="fw-bold mb-1">
              {pageTitles[activeSection]}
            </h4>
            <p className="text-muted mb-0">
              School Clinic Management System
            </p>
          </div>

          <div className="topbar-actions">
            <button
              className="notification-button"
              onClick={() => setModal("notifications")}
              title="Notifications"
            >
              <i className="bi bi-bell"></i>
            </button>

            <button
              className="btn btn-green"
              onClick={openVisitModal}
            >
              <i className="bi bi-plus-lg me-1"></i>
              New Clinic Visit
            </button>

            <div className="user-info">
              <div className="admin-avatar">
                <i className="bi bi-person"></i>
              </div>
              <div>
                <strong>{loggedInUser}</strong>
                <br />
                <small className="text-muted">Admin</small>
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
        </header>

        <div className="content-area">
          {loading ? (
            <div className="card p-5 text-center">
              <div
                className="spinner-border text-success mx-auto mb-3"
                role="status"
              ></div>
              <p className="text-muted mb-0">
                Loading clinic data from MySQL...
              </p>
            </div>
          ) : (
            <>
              {activeSection === "dashboard" && (
                <div>
                  <div className="row g-4 mb-4">
                    <StatCard
                      title="Total Students"
                      number={totalStudents}
                      label="Registered students"
                    />
                    <StatCard
                      title="Clinic Visits"
                      number={totalVisits}
                      label="Recorded visits"
                    />
                    <StatCard
                      title="Medicines"
                      number={totalMedicines}
                      label="Available medicines"
                    />
                    <StatCard
                      title="Low Stock"
                      number={lowStock}
                      label="Need attention"
                    />
                  </div>

                  <div className="row g-4">
                    <QuickAction
                      icon="bi-person-plus"
                      title="Add Student"
                      description="Register a new student"
                      onClick={openStudentModal}
                    />

                    <QuickAction
                      icon="bi-heart-pulse"
                      title="New Clinic Visit"
                      description="Record a clinic visit"
                      onClick={openVisitModal}
                    />

                    <QuickAction
                      icon="bi-capsule"
                      title="Add Medicine"
                      description="Update medicine inventory"
                      onClick={openMedicineModal}
                    />
                  </div>

                  <div className="row g-4 mt-2">
                    <div className="col-lg-7">
                      <div className="card p-4">
                        <h5 className="fw-bold">
                          Recent Clinic Visits
                        </h5>
                        <p className="text-muted">
                          Latest recorded clinic visits.
                        </p>

                        <div className="table-responsive">
                          <table className="table align-middle">
                            <thead>
                              <tr>
                                <th>Student</th>
                                <th>Complaint</th>
                                <th>Date</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visits.slice(0, 5).length === 0 ? (
                                <tr>
                                  <td
                                    colSpan="4"
                                    className="text-center text-muted"
                                  >
                                    No clinic visits recorded.
                                  </td>
                                </tr>
                              ) : (
                                visits.slice(0, 5).map((visit) => (
                                  <tr key={visit.id}>
                                    <td>{visit.student}</td>
                                    <td>{visit.complaint}</td>
                                    <td>{visit.date}</td>
                                    <td>
                                      <span className="badge badge-info">
                                        {visit.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        <button
                          className="btn btn-light-green"
                          onClick={() => showSection("visits")}
                        >
                          View All Visits
                        </button>
                      </div>
                    </div>

                    <div className="col-lg-5">
                      <div className="card p-4">
                        <h5 className="fw-bold">Low Stock</h5>
                        <p className="text-muted">
                          Medicines that need attention.
                        </p>

                        {lowStockMedicines.length === 0 ? (
                          <div className="text-muted py-3">
                            No medicines are low in stock.
                          </div>
                        ) : (
                          lowStockMedicines.slice(0, 5).map((medicine) => (
                            <div
                              key={medicine.id}
                              className="d-flex justify-content-between border-bottom py-3"
                            >
                              <span>{medicine.name}</span>
                              <span className="badge badge-low">
                                {medicine.stock} left
                              </span>
                            </div>
                          ))
                        )}

                        <button
                          className="btn btn-light-green w-100 mt-3"
                          onClick={() => showSection("stock")}
                        >
                          View Inventory
                          <i className="bi bi-arrow-right ms-1"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "students" && (
                <StudentsSection
                  students={students}
                  onAdd={openStudentModal}
                  onDelete={deleteStudent}
                />
              )}

              {activeSection === "visits" && (
                <VisitsSection
                  visits={visits}
                  onAdd={openVisitModal}
                  onDelete={deleteVisit}
                />
              )}

              {activeSection === "records" && (
                <MedicalRecords
                  records={medicalRecords}
                  search={recordSearch}
                  setSearch={setRecordSearch}
                  onAdd={openMedicalRecordModal}
                  onDelete={deleteMedicalRecord}
                />
              )}

              {activeSection === "medicines" && (
                <InventorySection
                  medicines={medicines}
                  onAdd={openMedicineModal}
                  onEdit={editMedicine}
                  onDelete={deleteMedicine}
                />
              )}

              {activeSection === "stock" && (
                <StockManagement
                  medicines={medicines}
                  movements={stockManagement}
                  onAdd={openStockModal}
                />
              )}

              {activeSection === "reports" && (
                <ReportsSection
                  students={totalStudents}
                  visits={totalVisits}
                  medicines={totalMedicines}
                  lowStock={lowStock}
                />
              )}

              {activeSection === "users" && (
                <div className="card p-4">
                  <h5 className="fw-bold">User Management</h5>

                  <div className="p-3 rounded-3 my-3 user-info">
                    <div className="d-flex align-items-center gap-3">
                      <div className="admin-avatar">
                        <i className="bi bi-person"></i>
                      </div>
                      <div>
                        <strong>{loggedInUser}</strong>
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
                      alert("Administrator has full system access.")
                    }
                  >
                    <i className="bi bi-shield-check me-1"></i>
                    Check Permissions
                  </button>
                </div>
              )}

              {activeSection === "settings" && (
                <SettingsSection onClear={clearAllData} />
              )}
            </>
          )}
        </div>
      </main>

      {/* ======================================
          STUDENT MODAL
      ====================================== */}

      {modal === "student" && (
        <Modal
          title="Add New Student"
          onClose={() => setModal(null)}
          onSave={addStudent}
          saveText="Add Student"
        >
          <FormField
            label="Student ID"
            type="text"
            placeholder="2026-001"
            value={studentForm.id}
            onChange={(value) =>
              setStudentForm({ ...studentForm, id: value })
            }
          />

          <FormField
            label="Full Name"
            type="text"
            placeholder="Juan Dela Cruz"
            value={studentForm.name}
            onChange={(value) =>
              setStudentForm({ ...studentForm, name: value })
            }
          />

          <FormField
            label="Grade & Section"
            type="text"
            placeholder="Grade 7-A"
            value={studentForm.grade}
            onChange={(value) =>
              setStudentForm({ ...studentForm, grade: value })
            }
          />

          <FormField
            label="Contact Number"
            type="text"
            placeholder="09XXXXXXXXX"
            value={studentForm.contact}
            onChange={(value) =>
              setStudentForm({ ...studentForm, contact: value })
            }
          />
        </Modal>
      )}

      {/* ======================================
          CLINIC VISIT MODAL
      ====================================== */}

      {modal === "visit" && (
        <Modal
          title="Record Clinic Visit"
          onClose={() => setModal(null)}
          onSave={addVisit}
          saveText="Save Visit"
        >
          <FormField
            label="Student Name"
            type="text"
            placeholder="Student name"
            value={visitForm.student}
            onChange={(value) =>
              setVisitForm({ ...visitForm, student: value })
            }
          />

          <FormField
            label="Complaint"
            type="text"
            placeholder="Headache, Fever, etc."
            value={visitForm.complaint}
            onChange={(value) =>
              setVisitForm({ ...visitForm, complaint: value })
            }
          />

          <div className="mb-3">
            <label className="form-label">Treatment</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Treatment given"
              value={visitForm.treatment}
              onChange={(e) =>
                setVisitForm({
                  ...visitForm,
                  treatment: e.target.value,
                })
              }
            ></textarea>
          </div>

          <div className="mb-3">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={visitForm.status}
              onChange={(e) =>
                setVisitForm({
                  ...visitForm,
                  status: e.target.value,
                })
              }
            >
              <option value="Treated">Treated</option>
              <option value="Observation">Observation</option>
              <option value="Referred">Referred</option>
            </select>
          </div>
        </Modal>
      )}

      {/* ======================================
          ADD MEDICINE MODAL
      ====================================== */}

      {modal === "medicine" && (
        <Modal
          title="Add Medicine"
          onClose={() => setModal(null)}
          onSave={addMedicine}
          saveText="Add Medicine"
        >
          <FormField
            label="Medicine Name"
            type="text"
            placeholder="Paracetamol"
            value={medicineForm.name}
            onChange={(value) =>
              setMedicineForm({ ...medicineForm, name: value })
            }
          />

          <FormField
            label="Category"
            type="text"
            placeholder="Pain Reliever"
            value={medicineForm.category}
            onChange={(value) =>
              setMedicineForm({ ...medicineForm, category: value })
            }
          />

          <FormField
            label="Stock Quantity"
            type="number"
            placeholder="50"
            value={medicineForm.stock}
            onChange={(value) =>
              setMedicineForm({ ...medicineForm, stock: value })
            }
          />

          <FormField
            label="Expiration Date"
            type="date"
            value={medicineForm.expiry}
            onChange={(value) =>
              setMedicineForm({ ...medicineForm, expiry: value })
            }
          />
        </Modal>
      )}

      {/* ======================================
          EDIT MEDICINE MODAL
      ====================================== */}

      {modal === "medicine-edit" && (
        <Modal
          title="Edit Medicine"
          onClose={() => setModal(null)}
          onSave={updateMedicine}
          saveText="Save Changes"
        >
          <FormField
            label="Medicine Name"
            type="text"
            value={medicineForm.name}
            onChange={(value) =>
              setMedicineForm({ ...medicineForm, name: value })
            }
          />

          <FormField
            label="Category"
            type="text"
            value={medicineForm.category}
            onChange={(value) =>
              setMedicineForm({ ...medicineForm, category: value })
            }
          />

          <FormField
            label="Stock Quantity"
            type="number"
            value={medicineForm.stock}
            onChange={(value) =>
              setMedicineForm({ ...medicineForm, stock: value })
            }
          />

          <FormField
            label="Expiration Date"
            type="date"
            value={medicineForm.expiry}
            onChange={(value) =>
              setMedicineForm({ ...medicineForm, expiry: value })
            }
          />
        </Modal>
      )}

      {/* ======================================
          MEDICAL RECORD MODAL
      ====================================== */}

      {modal === "medical-record" && (
        <Modal
          title="Add Medical Record"
          onClose={() => setModal(null)}
          onSave={addMedicalRecord}
          saveText="Save Record"
        >
          <div className="mb-3">
            <label className="form-label">Student</label>
            <select
              className="form-select"
              value={medicalRecordForm.student_id}
              onChange={(e) =>
                setMedicalRecordForm({
                  ...medicalRecordForm,
                  student_id: e.target.value,
                })
              }
            >
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.student_code || student.id})
                </option>
              ))}
            </select>
          </div>

          <FormField
            label="Diagnosis"
            type="text"
            placeholder="Enter diagnosis"
            value={medicalRecordForm.diagnosis}
            onChange={(value) =>
              setMedicalRecordForm({
                ...medicalRecordForm,
                diagnosis: value,
              })
            }
          />

          <FormField
            label="Treatment"
            type="text"
            placeholder="Treatment given"
            value={medicalRecordForm.treatment}
            onChange={(value) =>
              setMedicalRecordForm({
                ...medicalRecordForm,
                treatment: value,
              })
            }
          />

          <FormField
            label="Record Date"
            type="date"
            value={medicalRecordForm.record_date}
            onChange={(value) =>
              setMedicalRecordForm({
                ...medicalRecordForm,
                record_date: value,
              })
            }
          />

          <div className="mb-3">
            <label className="form-label">Notes</label>
            <textarea
              className="form-control"
              rows="3"
              value={medicalRecordForm.notes}
              onChange={(e) =>
                setMedicalRecordForm({
                  ...medicalRecordForm,
                  notes: e.target.value,
                })
              }
            ></textarea>
          </div>
        </Modal>
      )}

      {/* ======================================
          STOCK MOVEMENT MODAL
      ====================================== */}

      {modal === "stock" && (
        <Modal
          title="Record Stock Movement"
          onClose={() => setModal(null)}
          onSave={addStockMovement}
          saveText="Save Movement"
        >
          <div className="mb-3">
            <label className="form-label">Medicine</label>
            <select
              className="form-select"
              value={stockForm.medicine_id}
              onChange={(e) =>
                setStockForm({
                  ...stockForm,
                  medicine_id: e.target.value,
                })
              }
            >
              <option value="">Select medicine</option>
              {medicines.map((medicine) => (
                <option key={medicine.id} value={medicine.id}>
                  {medicine.name} (Current stock: {medicine.stock})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Movement Type</label>
            <select
              className="form-select"
              value={stockForm.movement_type}
              onChange={(e) =>
                setStockForm({
                  ...stockForm,
                  movement_type: e.target.value,
                })
              }
            >
              <option value="Stock In">Stock In</option>
              <option value="Stock Out">Stock Out</option>
            </select>
          </div>

          <FormField
            label="Quantity"
            type="number"
            placeholder="Enter quantity"
            value={stockForm.quantity}
            onChange={(value) =>
              setStockForm({ ...stockForm, quantity: value })
            }
          />

          <FormField
            label="Reason"
            type="text"
            placeholder="Reason for stock movement"
            value={stockForm.reason}
            onChange={(value) =>
              setStockForm({ ...stockForm, reason: value })
            }
          />
        </Modal>
      )}

      {/* ======================================
          NOTIFICATIONS MODAL
      ====================================== */}

      {modal === "notifications" && (
        <Modal
          title="Notifications"
          onClose={() => setModal(null)}
          onSave={() => setModal(null)}
          saveText="Close"
        >
          <div className="notification-box warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            <strong>Low Stock Alert</strong>
            <br />
            {lowStock} medicines need attention.
          </div>

          <div className="notification-box info">
            <i className="bi bi-heart-pulse me-2"></i>
            <strong>Clinic Visits</strong>
            <br />
            {totalVisits} clinic visits recorded.
          </div>

          <div className="notification-box success">
            <i className="bi bi-check-circle me-2"></i>
            <strong>System Status</strong>
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
      <label className="form-label">{label}</label>
      <input
        type={type}
        className="form-control"
        placeholder={placeholder}
        min={type === "number" ? "0" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ==========================================
// STAT CARD
// ==========================================

function StatCard({ title, number, label }) {
  return (
    <div className="col-md-3">
      <div className="card p-4">
        <div className="text-muted mb-2">{title}</div>
        <div className="stat-number">{number}</div>
        <div className="stat-label">{label}</div>
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
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClick();
        }}
      >
        <div className="action-icon">
          <i className={`bi ${icon}`}></i>
        </div>

        <div>
          <strong>{title}</strong>
          <div className="text-muted small">{description}</div>
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
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content clinic-form-modal">
          <div className="modal-header">
            <h5 className="modal-title fw-bold">{title}</h5>

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
          <h5 className="fw-bold mb-1">Student Records</h5>
          <p className="text-muted mb-0">
            Manage registered students.
          </p>
        </div>

        <button className="btn btn-green" onClick={onAdd}>
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
            {students.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-muted">
                  No students added yet.
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id}>
                  <td>{student.student_code || student.id}</td>
                  <td>{student.name}</td>
                  <td>{student.grade}</td>
                  <td>{student.contact || "-"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => onDelete(student.id)}
                    >
                      <i className="bi bi-trash me-1"></i>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
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
          <h5 className="fw-bold mb-1">Clinic Visits</h5>
          <p className="text-muted mb-0">
            View recorded clinic visits.
          </p>
        </div>

        <button className="btn btn-green" onClick={onAdd}>
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
            {visits.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center text-muted">
                  No clinic visits recorded.
                </td>
              </tr>
            ) : (
              visits.map((visit) => (
                <tr key={visit.id}>
                  <td>{visit.student}</td>
                  <td>{visit.complaint}</td>
                  <td>{visit.treatment || "-"}</td>
                  <td>{visit.date}</td>
                  <td>
                    <span className="badge badge-info">
                      {visit.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => onDelete(visit.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// MEDICAL RECORDS SECTION
// ==========================================

function MedicalRecords({
  records,
  search,
  setSearch,
  onAdd,
  onDelete,
}) {
  const results = records.filter((record) =>
    `${record.student_name || ""} ${
      record.student_code || ""
    } ${record.diagnosis || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="card p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="fw-bold mb-1">Medical Records</h5>
          <p className="text-muted mb-0">
            Records saved in the medical_records MySQL table.
          </p>
        </div>

        <button className="btn btn-green" onClick={onAdd}>
          <i className="bi bi-plus-lg me-1"></i>
          Add Medical Record
        </button>
      </div>

      <div className="input-group mb-4">
        <input
          type="text"
          className="form-control"
          placeholder="Search student or diagnosis"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {results.length === 0 ? (
        <p className="text-muted">
          {search
            ? "No matching medical records found."
            : "No medical records have been added yet."}
        </p>
      ) : (
        results.map((record) => (
          <div
            key={record.id}
            className="p-3 mb-2 rounded-3 medical-record"
          >
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <strong>
                  {record.student_name || "Unknown student"}
                </strong>

                <small className="text-muted">
                  {record.student_code
                    ? ` (${record.student_code})`
                    : ""}
                </small>

                <br />
                Diagnosis: {record.diagnosis}

                <br />
                Treatment: {record.treatment || "None"}

                {record.notes ? (
                  <>
                    <br />
                    Notes: {record.notes}
                  </>
                ) : null}

                <br />
                <small>{record.record_date}</small>
              </div>

              <button
                className="btn btn-sm btn-danger"
                onClick={() => onDelete(record.id)}
              >
                <i className="bi bi-trash"></i>
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ==========================================
// MEDICINE INVENTORY
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
          <h5 className="fw-bold mb-1">Medicine Inventory</h5>
          <p className="text-muted mb-0">
            Manage medicines and stock.
          </p>
        </div>

        <button className="btn btn-green" onClick={onAdd}>
          <i className="bi bi-plus-lg me-1"></i>
          Add Medicine
        </button>
      </div>

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Expiration</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {medicines.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center text-muted">
                  No medicines added yet.
                </td>
              </tr>
            ) : (
              medicines.map((medicine) => {
                const lowStock = Number(medicine.stock) <= 5;

                return (
                  <tr key={medicine.id}>
                    <td>
                      <strong>{medicine.name}</strong>
                    </td>
                    <td>{medicine.category}</td>
                    <td>{medicine.stock}</td>
                    <td>{medicine.expiry || "-"}</td>
                    <td>
                      <span
                        className={`badge ${
                          lowStock ? "badge-low" : "badge-good"
                        }`}
                      >
                        {lowStock ? "Low Stock" : "Good Stock"}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => onEdit(medicine)}
                        >
                          <i className="bi bi-pencil me-1"></i>
                          Edit
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => onDelete(medicine.id)}
                        >
                          <i className="bi bi-trash me-1"></i>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// STOCK MANAGEMENT
// ==========================================

function StockManagement({
  medicines,
  movements,
  onAdd,
}) {
  return (
    <div className="card p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="fw-bold mb-1">Stock Management</h5>
          <p className="text-muted mb-0">
            Stock movements are saved in stock_management and update medicine quantities.
          </p>
        </div>

        <button className="btn btn-green" onClick={onAdd}>
          <i className="bi bi-plus-lg me-1"></i>
          Record Movement
        </button>
      </div>

      <h6 className="fw-bold mt-2">Current Medicine Stock</h6>

      <div className="table-responsive mb-4">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Expiry</th>
            </tr>
          </thead>

          <tbody>
            {medicines.length ? (
              medicines.map((medicine) => (
                <tr key={medicine.id}>
                  <td>{medicine.name}</td>
                  <td>{medicine.category}</td>
                  <td>{medicine.stock}</td>
                  <td>{medicine.expiry || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center text-muted">
                  No medicines available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h6 className="fw-bold">Stock Movement History</h6>

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Movement</th>
              <th>Quantity</th>
              <th>Reason</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {movements.length ? (
              movements.map((movement) => (
                <tr key={movement.id}>
                  <td>
                    {movement.medicine_name ||
                      `Medicine #${movement.medicine_id}`}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        movement.movement_type === "Stock In"
                          ? "badge-good"
                          : "badge-low"
                      }`}
                    >
                      {movement.movement_type}
                    </span>
                  </td>
                  <td>{movement.quantity}</td>
                  <td>{movement.reason || "-"}</td>
                  <td>{movement.movement_date}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center text-muted">
                  No stock movements recorded.
                </td>
              </tr>
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
      <div className={`p-4 rounded-3 ${className}`}>
        <small>{title}</small>
        <h2 className="fw-bold">{number}</h2>
      </div>
    </div>
  );
}

// ==========================================
// SETTINGS
// ==========================================

function SettingsSection({ onClear }) {
  const [notifications, setNotifications] = useState(true);
  const [autosave, setAutosave] = useState(true);

  return (
    <div className="card p-4">
      <h5 className="fw-bold mb-4">System Settings</h5>

      <div className="form-check form-switch mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          checked={notifications}
          onChange={(e) => setNotifications(e.target.checked)}
        />

        <label className="form-check-label">
          Enable Notifications
        </label>
      </div>

      <div className="form-check form-switch mb-4">
        <input
          className="form-check-input"
          type="checkbox"
          checked={autosave}
          onChange={(e) => setAutosave(e.target.checked)}
        />

        <label className="form-check-label">
          Enable Auto Save
        </label>
      </div>

      <hr />

      <button className="btn btn-danger" onClick={onClear}>
        <i className="bi bi-trash me-1"></i>
        Clear Saved Test Data
      </button>
    </div>
  );
}

export default Dashboard;