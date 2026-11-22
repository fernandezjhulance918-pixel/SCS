import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const app = express();
const PORT = Number(process.env.PORT || 8080);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "clinic-data.json");


const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "school_clinic_medicine_db",
  ssl: {
    minVersion: "TLSv1.2",
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.use((req, _res, next) => {
  console.log(`[backend] ${req.method} ${req.url}`);
  next();
});

const clean = (value) => String(value ?? "").trim();

const asId = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const validDate = (value) => {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

const sendError = (res, error, message) => {
  console.error(`[MySQL] ${message}`, error);
  res.status(500).json({
    message,
    error: error.message,
  });
};

// ==========================================
// DATABASE SETUP
// ==========================================

async function ensureSchema() {
  const [columns] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'students'
  `);

  if (!columns.some((c) => c.COLUMN_NAME === "student_code")) {
    await db.query(`
      ALTER TABLE students
      ADD COLUMN student_code VARCHAR(50) NULL AFTER id
    `);
  }

  const [indexes] = await db.query(`
    SELECT INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'students'
    AND INDEX_NAME = 'uq_students_student_code'
  `);

  if (!indexes.length) {
    await db.query(`
      CREATE UNIQUE INDEX uq_students_student_code
      ON students (student_code)
    `);
  }
}

// ==========================================
// IMPORT OLD JSON DATA INTO MYSQL
// ==========================================

function readLegacyData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { students: [], visits: [] };
  }

  try {
    const parsed = JSON.parse(
      fs.readFileSync(DATA_FILE, "utf8") || "{}"
    );

    return {
      students: Array.isArray(parsed.students)
        ? parsed.students
        : [],
      visits: Array.isArray(parsed.visits)
        ? parsed.visits
        : [],
    };
  } catch (error) {
    console.error(
      "[migration] Could not parse clinic-data.json:",
      error.message
    );

    return { students: [], visits: [] };
  }
}

async function migrateLegacyJson() {
  const legacy = readLegacyData();
  let importedStudents = 0;
  let importedVisits = 0;

  for (const s of legacy.students) {
    const code = clean(s.student_code ?? s.id);
    const name = clean(s.name);
    const grade = clean(s.grade);

    if (!code || !name || !grade) continue;

    const [found] = await db.execute(
      "SELECT id FROM students WHERE student_code = ? LIMIT 1",
      [code]
    );

    if (found.length) continue;

    await db.execute(
      `INSERT INTO students
       (student_code, name, grade, contact)
       VALUES (?, ?, ?, ?)`,
      [code, name, grade, clean(s.contact)]
    );

    importedStudents++;
  }

  for (const v of legacy.visits) {
    const student = clean(v.student);
    const complaint = clean(v.complaint);
    const date =
      validDate(v.date) || new Date().toISOString().slice(0, 10);

    if (!student || !complaint) continue;

    const treatment = clean(v.treatment);
    const status = clean(v.status || "Treated");

    const [found] = await db.execute(
      `SELECT id FROM visits
       WHERE student = ?
       AND complaint = ?
       AND COALESCE(treatment, '') = ?
       AND COALESCE(status, '') = ?
       AND date = ?
       LIMIT 1`,
      [student, complaint, treatment, status, date]
    );

    if (found.length) continue;

    await db.execute(
      `INSERT INTO visits
       (student, complaint, treatment, status, date)
       VALUES (?, ?, ?, ?, ?)`,
      [student, complaint, treatment, status, date]
    );

    importedVisits++;
  }

  console.log(
    `[migration] Imported ${importedStudents} students and ${importedVisits} visits.`
  );
  console.log("[migration] Original JSON backup was preserved.");
}

// ==========================================
// ROOT AND HEALTH CHECK
// ==========================================

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    message: "School Clinic API is running",
    port: PORT,
  });
});

app.get("/api/health", async (_req, res) => {
  try {
    await db.query("SELECT 1");

    res.json({
      ok: true,
      mysql: "connected",
      database: "school_clinic_medicine_db",
    });
  } catch (error) {
    sendError(res, error, "MySQL health check failed.");
  }
});

// ==========================================
// LOAD ALL SIX MYSQL TABLES
// ==========================================

app.get("/api/clinic-data", async (_req, res) => {
  try {
    const [
      [students],
      [visits],
      [medicines],
      [medicalRecords],
      [stockManagement],
    ] = await Promise.all([
      db.query("SELECT * FROM students ORDER BY id DESC"),
      db.query("SELECT * FROM visits ORDER BY id DESC"),
      db.query("SELECT * FROM medicines ORDER BY id DESC"),
      db.query("SELECT * FROM medical_records ORDER BY id DESC"),
      db.query(`
        SELECT sm.*, m.name AS medicine_name
        FROM stock_management sm
        LEFT JOIN medicines m ON m.id = sm.medicine_id
        ORDER BY sm.id DESC
      `),
    ]);

    res.json({
      students,
      visits,
      medicines,
      medicalRecords,
      stockManagement,
    });
  } catch (error) {
    sendError(res, error, "Failed to load clinic data from MySQL.");
  }
});

// ==========================================
// STUDENTS
// ==========================================

app.get("/api/students", async (_req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM students ORDER BY id DESC"
    );

    res.json(rows);
  } catch (error) {
    sendError(res, error, "Failed to fetch students.");
  }
});

app.post("/api/students", async (req, res) => {
  try {
    const studentCode = clean(
      req.body.id ?? req.body.student_code
    );
    const name = clean(req.body.name);
    const grade = clean(req.body.grade);
    const contact = clean(req.body.contact);

    if (!studentCode || !name || !grade) {
      return res.status(400).json({
        message: "Student ID, name, and grade are required.",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO students
       (student_code, name, grade, contact)
       VALUES (?, ?, ?, ?)`,
      [studentCode, name, grade, contact]
    );

    const [rows] = await db.execute(
      "SELECT * FROM students WHERE id = ?",
      [result.insertId]
    );

    console.log("[MySQL] STUDENT ADDED:", rows[0]);

    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Student ID already exists.",
      });
    }

    sendError(res, error, "Failed to add student to MySQL.");
  }
});

app.put("/api/students/:id", async (req, res) => {
  try {
    const id = asId(req.params.id);
    const studentCode = clean(
      req.body.student_code ?? req.body.id
    );
    const name = clean(req.body.name);
    const grade = clean(req.body.grade);
    const contact = clean(req.body.contact);

    if (!id || !studentCode || !name || !grade) {
      return res.status(400).json({
        message: "Valid student ID, name, and grade are required.",
      });
    }

    const [result] = await db.execute(
      `UPDATE students
       SET student_code = ?, name = ?, grade = ?, contact = ?
       WHERE id = ?`,
      [studentCode, name, grade, contact, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Student not found.",
      });
    }

    const [rows] = await db.execute(
      "SELECT * FROM students WHERE id = ?",
      [id]
    );

    res.json(rows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Student ID already exists.",
      });
    }

    sendError(res, error, "Failed to update student.");
  }
});

app.delete("/api/students/:id", async (req, res) => {
  try {
    const id = asId(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "Invalid student record ID.",
      });
    }

    const [rows] = await db.execute(
      "SELECT * FROM students WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Student not found.",
      });
    }

    await db.execute(
      "DELETE FROM medical_records WHERE student_id = ?",
      [id]
    );

    await db.execute(
      "DELETE FROM students WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      deleted: rows[0],
    });
  } catch (error) {
    sendError(res, error, "Failed to delete student.");
  }
});

// ==========================================
// CLINIC VISITS
// ==========================================

app.get("/api/visits", async (_req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM visits ORDER BY id DESC"
    );

    res.json(rows);
  } catch (error) {
    sendError(res, error, "Failed to fetch clinic visits.");
  }
});

app.post("/api/visits", async (req, res) => {
  try {
    const student = clean(req.body.student);
    const complaint = clean(req.body.complaint);
    const treatment = clean(req.body.treatment);
    const status = clean(req.body.status) || "Treated";
    const date =
      validDate(req.body.date) || new Date().toISOString().slice(0, 10);

    if (!student || !complaint) {
      return res.status(400).json({
        message: "Student and complaint are required.",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO visits
       (student, complaint, treatment, status, date)
       VALUES (?, ?, ?, ?, ?)`,
      [student, complaint, treatment, status, date]
    );

    const [rows] = await db.execute(
      "SELECT * FROM visits WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    sendError(res, error, "Failed to save clinic visit.");
  }
});

app.put("/api/visits/:id", async (req, res) => {
  try {
    const id = asId(req.params.id);
    const student = clean(req.body.student);
    const complaint = clean(req.body.complaint);
    const treatment = clean(req.body.treatment);
    const status = clean(req.body.status) || "Treated";
    const date =
      validDate(req.body.date) || new Date().toISOString().slice(0, 10);

    if (!id || !student || !complaint) {
      return res.status(400).json({
        message: "Valid visit ID, student, and complaint are required.",
      });
    }

    const [result] = await db.execute(
      `UPDATE visits
       SET student = ?, complaint = ?, treatment = ?, status = ?, date = ?
       WHERE id = ?`,
      [student, complaint, treatment, status, date, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Visit not found.",
      });
    }

    const [rows] = await db.execute(
      "SELECT * FROM visits WHERE id = ?",
      [id]
    );

    res.json(rows[0]);
  } catch (error) {
    sendError(res, error, "Failed to update clinic visit.");
  }
});

app.delete("/api/visits/:id", async (req, res) => {
  try {
    const id = asId(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "Invalid visit ID.",
      });
    }

    const [result] = await db.execute(
      "DELETE FROM visits WHERE id = ?",
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Visit not found.",
      });
    }

    res.json({ success: true });
  } catch (error) {
    sendError(res, error, "Failed to delete clinic visit.");
  }
});

// ==========================================
// MEDICINES
// ==========================================

app.get("/api/medicines", async (_req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM medicines ORDER BY id DESC"
    );

    res.json(rows);
  } catch (error) {
    sendError(res, error, "Failed to fetch medicines.");
  }
});

app.post("/api/medicines", async (req, res) => {
  try {
    const name = clean(req.body.name);
    const category = clean(req.body.category);
    const stock = Number(req.body.stock);
    const expiry = validDate(req.body.expiry);

    if (
      !name ||
      !category ||
      req.body.stock === "" ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      return res.status(400).json({
        message: "Valid medicine name, category, and stock are required.",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO medicines
       (name, category, stock, expiry)
       VALUES (?, ?, ?, ?)`,
      [name, category, stock, expiry]
    );

    const [rows] = await db.execute(
      "SELECT * FROM medicines WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    sendError(res, error, "Failed to add medicine.");
  }
});

app.put("/api/medicines/:id", async (req, res) => {
  try {
    const id = asId(req.params.id);
    const name = clean(req.body.name);
    const category = clean(req.body.category);
    const stock = Number(req.body.stock);
    const expiry = validDate(req.body.expiry);

    if (!id) {
      return res.status(400).json({
        message: "Invalid medicine ID.",
      });
    }

    if (
      !name ||
      !category ||
      req.body.stock === "" ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      return res.status(400).json({
        message: "Valid medicine name, category, and stock are required.",
      });
    }

    const [result] = await db.execute(
      `UPDATE medicines
       SET name = ?, category = ?, stock = ?, expiry = ?
       WHERE id = ?`,
      [name, category, stock, expiry, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Medicine not found.",
      });
    }

    const [rows] = await db.execute(
      "SELECT * FROM medicines WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      medicine: rows[0],
    });
  } catch (error) {
    sendError(res, error, "Failed to update medicine.");
  }
});

app.delete("/api/medicines/:id", async (req, res) => {
  try {
    const id = asId(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "Invalid medicine ID.",
      });
    }

    const [stockRows] = await db.execute(
      "SELECT id FROM stock_management WHERE medicine_id = ? LIMIT 1",
      [id]
    );

    if (stockRows.length) {
      return res.status(409).json({
        message:
          "This medicine has stock history. Keep it in inventory instead of deleting it.",
      });
    }

    const [result] = await db.execute(
      "DELETE FROM medicines WHERE id = ?",
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Medicine not found.",
      });
    }

    res.json({ success: true });
  } catch (error) {
    sendError(res, error, "Failed to delete medicine.");
  }
});

// ==========================================
// MEDICAL RECORDS
// ==========================================

app.get("/api/medical-records", async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        mr.*,
        s.student_code,
        s.name AS student_name,
        s.grade
      FROM medical_records mr
      LEFT JOIN students s ON s.id = mr.student_id
      ORDER BY mr.id DESC
    `);

    res.json(rows);
  } catch (error) {
    sendError(res, error, "Failed to fetch medical records.");
  }
});

app.post("/api/medical-records", async (req, res) => {
  try {
    const studentId = asId(req.body.student_id);
    const diagnosis = clean(req.body.diagnosis);
    const treatment = clean(req.body.treatment);
    const notes = clean(req.body.notes);
    const recordDate =
      validDate(req.body.record_date) ||
      new Date().toISOString().slice(0, 10);

    if (!studentId || !diagnosis) {
      return res.status(400).json({
        message: "Select a student and enter a diagnosis.",
      });
    }

    const [student] = await db.execute(
      "SELECT id FROM students WHERE id = ?",
      [studentId]
    );

    if (!student.length) {
      return res.status(404).json({
        message: "Selected student was not found.",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO medical_records
       (student_id, diagnosis, treatment, notes, record_date)
       VALUES (?, ?, ?, ?, ?)`,
      [studentId, diagnosis, treatment, notes, recordDate]
    );

    const [rows] = await db.execute(
      `SELECT
         mr.*,
         s.student_code,
         s.name AS student_name,
         s.grade
       FROM medical_records mr
       LEFT JOIN students s ON s.id = mr.student_id
       WHERE mr.id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    sendError(res, error, "Failed to add medical record.");
  }
});

app.put("/api/medical-records/:id", async (req, res) => {
  try {
    const id = asId(req.params.id);
    const studentId = asId(req.body.student_id);
    const diagnosis = clean(req.body.diagnosis);
    const treatment = clean(req.body.treatment);
    const notes = clean(req.body.notes);
    const recordDate =
      validDate(req.body.record_date) ||
      new Date().toISOString().slice(0, 10);

    if (!id || !studentId || !diagnosis) {
      return res.status(400).json({
        message: "Valid record, student, and diagnosis are required.",
      });
    }

    const [result] = await db.execute(
      `UPDATE medical_records
       SET student_id = ?, diagnosis = ?, treatment = ?,
           notes = ?, record_date = ?
       WHERE id = ?`,
      [studentId, diagnosis, treatment, notes, recordDate, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Medical record not found.",
      });
    }

    const [rows] = await db.execute(
      `SELECT
         mr.*,
         s.student_code,
         s.name AS student_name,
         s.grade
       FROM medical_records mr
       LEFT JOIN students s ON s.id = mr.student_id
       WHERE mr.id = ?`,
      [id]
    );

    res.json(rows[0]);
  } catch (error) {
    sendError(res, error, "Failed to update medical record.");
  }
});

app.delete("/api/medical-records/:id", async (req, res) => {
  try {
    const id = asId(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "Invalid medical record ID.",
      });
    }

    const [result] = await db.execute(
      "DELETE FROM medical_records WHERE id = ?",
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Medical record not found.",
      });
    }

    res.json({ success: true });
  } catch (error) {
    sendError(res, error, "Failed to delete medical record.");
  }
});

// ==========================================
// STOCK MANAGEMENT
// ==========================================

app.get("/api/stock-management", async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        sm.*,
        m.name AS medicine_name
      FROM stock_management sm
      LEFT JOIN medicines m ON m.id = sm.medicine_id
      ORDER BY sm.id DESC
    `);

    res.json(rows);
  } catch (error) {
    sendError(res, error, "Failed to fetch stock history.");
  }
});

app.post("/api/stock-management", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const medicineId = asId(req.body.medicine_id);
    const movementType = clean(req.body.movement_type);
    const quantity = Number(req.body.quantity);
    const reason = clean(req.body.reason);

    if (
      !medicineId ||
      !["Stock In", "Stock Out"].includes(movementType) ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).json({
        message:
          "Select a medicine, Stock In/Stock Out, and a positive whole-number quantity.",
      });
    }

    await connection.beginTransaction();

    const [medicines] = await connection.execute(
      "SELECT * FROM medicines WHERE id = ? FOR UPDATE",
      [medicineId]
    );

    if (!medicines.length) {
      await connection.rollback();

      return res.status(404).json({
        message: "Medicine not found.",
      });
    }

    const currentStock = Number(medicines[0].stock);

    const newStock =
      movementType === "Stock In"
        ? currentStock + quantity
        : currentStock - quantity;

    if (newStock < 0) {
      await connection.rollback();

      return res.status(400).json({
        message: "Stock Out quantity exceeds available stock.",
      });
    }

    await connection.execute(
      "UPDATE medicines SET stock = ? WHERE id = ?",
      [newStock, medicineId]
    );

    const [insert] = await connection.execute(
      `INSERT INTO stock_management
       (medicine_id, movement_type, quantity, reason, movement_date)
       VALUES (?, ?, ?, ?, NOW())`,
      [medicineId, movementType, quantity, reason || null]
    );

    await connection.commit();

    const [rows] = await db.execute(
      `SELECT
         sm.*,
         m.name AS medicine_name
       FROM stock_management sm
       LEFT JOIN medicines m ON m.id = sm.medicine_id
       WHERE sm.id = ?`,
      [insert.insertId]
    );

    res.status(201).json({
      ...rows[0],
      new_stock: newStock,
    });
  } catch (error) {
    await connection.rollback();
    sendError(res, error, "Failed to save stock movement.");
  } finally {
    connection.release();
  }
});

app.delete("/api/stock-management/:id", async (req, res) => {
  return res.status(409).json({
    message:
      "Stock history entries are retained for audit accuracy. Record an opposite movement to correct a mistake.",
  });
});

// ==========================================
// CLEAR ALL SIX TABLES
// ==========================================

app.delete("/api/clinic-data", async (_req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query("DELETE FROM stock_management");
    await connection.query("DELETE FROM medical_records");
    await connection.query("DELETE FROM visits");
    await connection.query("DELETE FROM students");
    await connection.query("DELETE FROM medicines");

    await connection.commit();

    res.json({
      success: true,
      message: "All six clinic tables were cleared.",
    });
  } catch (error) {
    await connection.rollback();
    sendError(res, error, "Failed to clear clinic data.");
  } finally {
    connection.release();
  }
});

// ==========================================
// ERROR HANDLER
// ==========================================

app.use((error, _req, res, _next) => {
  console.error("[backend] Unhandled request error:", error);

  res.status(500).json({
    message: "Internal server error.",
    error: error.message,
  });
});

// ==========================================
// START SERVER
// ==========================================

async function startServer() {
  try {
    await db.query("SELECT 1");

    console.log(
      "[MySQL] Connected to school_clinic_medicine_db"
    );

    await ensureSchema();
    await migrateLegacyJson();

    app.listen(PORT, () => {
      console.log("==========================================");
      console.log("       SCHOOL CLINIC BACKEND");
      console.log("==========================================");
      console.log(`Server: http://localhost:${PORT}`);
      console.log("Storage: MySQL (all six clinic tables)");
      console.log("Status: READY");
      console.log("==========================================");
    });
  } catch (error) {
    console.error("[backend] Startup failed:", error);
    process.exit(1);
  }
}

startServer();