import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";


app.use(cors());
const app = express();
  
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// ==========================================
// FILE / FOLDER SETUP
// ==========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(
  __dirname,
  "clinic-data.json"
);




// ==========================================
// EMPTY DATABASE
// ==========================================

const EMPTY_DATA = {
  students: [],
  visits: [],
  medicines: [],
};

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

// ==========================================
// REQUEST LOGGER
// ==========================================

app.use((req, _res, next) => {
  console.log(
    `\n[backend] ${req.method} ${req.url}`
  );

  next();
});

// ==========================================
// ENSURE DATA FILE EXISTS
// ==========================================

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(
          EMPTY_DATA,
          null,
          2
        ),
        "utf8"
      );

      console.log(
        "[backend] clinic-data.json created."
      );

      return;
    }

    const raw = fs.readFileSync(
      DATA_FILE,
      "utf8"
    );

    const data = JSON.parse(
      raw || "{}"
    );

    const fixedData = {
      students: Array.isArray(
        data.students
      )
        ? data.students
        : [],

      visits: Array.isArray(
        data.visits
      )
        ? data.visits
        : [],

      medicines: Array.isArray(
        data.medicines
      )
        ? data.medicines
        : [],
    };

    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        fixedData,
        null,
        2
      ),
      "utf8"
    );
  } catch (error) {
    console.error(
      "[backend] Invalid clinic-data.json. Resetting file."
    );

    console.error(error);

    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        EMPTY_DATA,
        null,
        2
      ),
      "utf8"
    );
  }
}

// ==========================================
// READ DATA
// ==========================================

function readData() {
  ensureDataFile();

  try {
    const raw = fs.readFileSync(
      DATA_FILE,
      "utf8"
    );

    const data = JSON.parse(
      raw || "{}"
    );

    return {
      students: Array.isArray(
        data.students
      )
        ? data.students
        : [],

      visits: Array.isArray(
        data.visits
      )
        ? data.visits
        : [],

      medicines: Array.isArray(
        data.medicines
      )
        ? data.medicines
        : [],
    };
  } catch (error) {
    console.error(
      "[backend] Could not read clinic-data.json:",
      error
    );

    return {
      students: [],
      visits: [],
      medicines: [],
    };
  }
}

// ==========================================
// WRITE DATA
// ==========================================

function writeData(data) {
  const cleanData = {
    students: Array.isArray(
      data.students
    )
      ? data.students
      : [],

    visits: Array.isArray(
      data.visits
    )
      ? data.visits
      : [],

    medicines: Array.isArray(
      data.medicines
    )
      ? data.medicines
      : [],
  };

  const tempFile =
    `${DATA_FILE}.tmp`;

  fs.writeFileSync(
    tempFile,
    JSON.stringify(
      cleanData,
      null,
      2
    ),
    "utf8"
  );

  fs.renameSync(
    tempFile,
    DATA_FILE
  );
}

// ==========================================
// ROOT
// ==========================================

app.get(
  "/",
  (_req, res) => {
    res.json({
      ok: true,
      message:
        "School Clinic API is running",
      port: PORT,
    });
  }
);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get(
  "/api/health",
  (_req, res) => {
    res.json({
      ok: true,
    });
  }
);

// ==========================================
// GET ALL CLINIC DATA
// ==========================================

app.get(
  "/api/clinic-data",
  (_req, res) => {
    const data = readData();

    res.json(data);
  }
);

// ==========================================
// STUDENTS
// ==========================================

// GET STUDENTS

app.get(
  "/api/students",
  (_req, res) => {
    const data = readData();

    res.json(
      data.students
    );
  }
);

// ==========================================
// ADD STUDENT
// ==========================================

app.post(
  "/api/students",
  (req, res) => {
    try {
      const data = readData();

      const {
        id,
        name,
        grade,
        contact,
      } = req.body;

      if (
        !id ||
        !String(id).trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Student ID is required.",
          });
      }

      if (
        !name ||
        !String(name).trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Student name is required.",
          });
      }

      if (
        !grade ||
        !String(grade).trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Grade is required.",
          });
      }

      const duplicate =
        data.students.some(
          (student) =>
            String(
              student.id
            ) ===
            String(id)
        );

      if (duplicate) {
        return res
          .status(409)
          .json({
            message:
              "Student ID already exists.",
          });
      }

      const student = {
        id: String(
          id
        ).trim(),

        name: String(
          name
        ).trim(),

        grade: String(
          grade
        ).trim(),

        contact: contact
          ? String(
              contact
            ).trim()
          : "",
      };

      data.students.push(
        student
      );

      writeData(data);

      console.log(
        "\n[backend] STUDENT ADDED:"
      );

      console.log(
        JSON.stringify(
          student,
          null,
          2
        )
      );

      return res
        .status(201)
        .json(student);
    } catch (error) {
      console.error(
        "[backend] Add student error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to add student.",
        });
    }
  }
);

// ==========================================
// DELETE STUDENT
// ==========================================

app.delete(
  "/api/students/:id",
  (req, res) => {
    try {
      const data = readData();

      const id = String(
        req.params.id
      );

      const index =
        data.students.findIndex(
          (student) =>
            String(
              student.id
            ) === id
        );

      if (index === -1) {
        return res
          .status(404)
          .json({
            error:
              "Student not found.",
          });
      }

      const deleted =
        data.students[index];

      data.students.splice(
        index,
        1
      );

      writeData(data);

      console.log(
        "\n[backend] STUDENT DELETED:"
      );

      console.log(
        JSON.stringify(
          deleted,
          null,
          2
        )
      );

      console.log(
        "[backend] Remaining students:"
      );

      console.log(
        JSON.stringify(
          data.students,
          null,
          2
        )
      );

      return res.json({
        ok: true,
        deleted,
        remaining:
          data.students,
      });
    } catch (error) {
      console.error(
        "[backend] Delete student error:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Failed to delete student.",
        });
    }
  }
);

// ==========================================
// VISITS
// ==========================================

// GET VISITS

app.get(
  "/api/visits",
  (_req, res) => {
    const data = readData();

    res.json(
      data.visits
    );
  }
);

// ==========================================
// ADD VISIT
// ==========================================

app.post(
  "/api/visits",
  (req, res) => {
    try {
      const data = readData();

      const body =
        req.body &&
        typeof req.body ===
          "object"
          ? req.body
          : {};

      if (
        !body.student ||
        !String(
          body.student
        ).trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Student name is required.",
          });
      }

      if (
        !body.complaint ||
        !String(
          body.complaint
        ).trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Complaint is required.",
          });
      }

      const visit = {
        id:
          body.id !==
            undefined &&
          body.id !== ""
            ? body.id
            : Date.now(),

        student:
          String(
            body.student
          ).trim(),

        complaint:
          String(
            body.complaint
          ).trim(),

        treatment:
          body.treatment
            ? String(
                body.treatment
              ).trim()
            : "",

        status:
          body.status ||
          "Treated",

        date:
          body.date ||
          new Date().toLocaleDateString(),
      };

      data.visits.push(
        visit
      );

      writeData(data);

      console.log(
        "\n[backend] VISIT ADDED:"
      );

      console.log(
        JSON.stringify(
          visit,
          null,
          2
        )
      );

      return res
        .status(201)
        .json(visit);
    } catch (error) {
      console.error(
        "[backend] Add visit error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to add visit.",
        });
    }
  }
);

// ==========================================
// DELETE VISIT
// ==========================================

app.delete(
  "/api/visits/:id",
  (req, res) => {
    try {
      const data = readData();

      const id = String(
        req.params.id
      );

      const index =
        data.visits.findIndex(
          (visit) =>
            String(
              visit.id
            ) === id
        );

      if (index === -1) {
        return res
          .status(404)
          .json({
            error:
              "Visit not found.",
          });
      }

      const deleted =
        data.visits[index];

      data.visits.splice(
        index,
        1
      );

      writeData(data);

      console.log(
        "\n[backend] VISIT DELETED:"
      );

      console.log(
        JSON.stringify(
          deleted,
          null,
          2
        )
      );

      console.log(
        "[backend] Remaining visits:"
      );

      console.log(
        JSON.stringify(
          data.visits,
          null,
          2
        )
      );

      return res.json({
        ok: true,
        deleted,
        remaining:
          data.visits,
      });
    } catch (error) {
      console.error(
        "[backend] Delete visit error:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Failed to delete visit.",
        });
    }
  }
);

// ==========================================
// MEDICINES
// ==========================================

// GET MEDICINES

app.get(
  "/api/medicines",
  (_req, res) => {
    const data = readData();

    res.json(
      data.medicines
    );
  }
);

// ==========================================
// ADD MEDICINE
// ==========================================

app.post(
  "/api/medicines",
  (req, res) => {
    try {
      const data = readData();

      const {
        name,
        category,
        stock,
        expiry,
      } = req.body;

      // NAME

      if (
        !name ||
        !String(name).trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Medicine name is required.",
          });
      }

      // CATEGORY

      if (
        !category ||
        !String(
          category
        ).trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Medicine category is required.",
          });
      }

      // STOCK

      if (
        stock ===
          undefined ||
        stock === null ||
        stock === ""
      ) {
        return res
          .status(400)
          .json({
            message:
              "Stock quantity is required.",
          });
      }

      const stockNumber =
        Number(stock);

      if (
        !Number.isFinite(
          stockNumber
        ) ||
        stockNumber < 0
      ) {
        return res
          .status(400)
          .json({
            message:
              "Stock must be a valid number greater than or equal to 0.",
          });
      }

      // CREATE MEDICINE

      const medicine = {
        id:
          req.body.id !==
            undefined &&
          req.body.id !== ""
            ? req.body.id
            : Date.now(),

        name:
          String(
            name
          ).trim(),

        category:
          String(
            category
          ).trim(),

        stock:
          stockNumber,

        expiry:
          expiry
            ? String(
                expiry
              )
            : "",
      };

      // SAVE

      data.medicines.push(
        medicine
      );

      writeData(data);

      // TERMINAL

      console.log(
        "\n=========================================="
      );

      console.log(
        "[backend] MEDICINE ADDED"
      );

      console.log(
        "=========================================="
      );

      console.log(
        JSON.stringify(
          medicine,
          null,
          2
        )
      );

      console.log(
        "==========================================\n"
      );

      return res
        .status(201)
        .json(medicine);
    } catch (error) {
      console.error(
        "[backend] Add medicine error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to add medicine.",
        });
    }
  }
);

// ==========================================
// EDIT / UPDATE MEDICINE
// ==========================================

app.put(
  "/api/medicines/:id",
  (req, res) => {
    try {
      const id = String(
        req.params.id
      );

      const data = readData();

      // ==========================================
      // FIND MEDICINE
      // ==========================================

      const medicineIndex =
        data.medicines.findIndex(
          (medicine) =>
            String(
              medicine.id
            ) === id
        );

      if (
        medicineIndex ===
        -1
      ) {
        return res
          .status(404)
          .json({
            message:
              "Medicine not found.",
          });
      }

      // ==========================================
      // OLD MEDICINE
      // ==========================================

      const oldMedicine =
        data.medicines[
          medicineIndex
        ];

      // ==========================================
      // NEW VALUES
      // ==========================================

      const {
        name,
        category,
        stock,
        expiry,
      } = req.body;

      // ==========================================
      // VALIDATE NAME
      // ==========================================

      if (
        !name ||
        !String(name).trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Medicine name is required.",
          });
      }

      // ==========================================
      // VALIDATE CATEGORY
      // ==========================================

      if (
        !category ||
        !String(
          category
        ).trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Medicine category is required.",
          });
      }

      // ==========================================
      // VALIDATE STOCK
      // ==========================================

      if (
        stock ===
          undefined ||
        stock === null ||
        stock === ""
      ) {
        return res
          .status(400)
          .json({
            message:
              "Stock quantity is required.",
          });
      }

      const stockNumber =
        Number(stock);

      if (
        !Number.isFinite(
          stockNumber
        ) ||
        stockNumber < 0
      ) {
        return res
          .status(400)
          .json({
            message:
              "Stock must be a valid number greater than or equal to 0.",
          });
      }

      // ==========================================
      // CREATE NEW MEDICINE
      // ==========================================

      const updatedMedicine = {
        id:
          oldMedicine.id,

        name:
          String(
            name
          ).trim(),

        category:
          String(
            category
          ).trim(),

        stock:
          stockNumber,

        expiry:
          expiry
            ? String(
                expiry
              )
            : "",
      };

      // ==========================================
      // FIND ONLY CHANGED FIELDS
      // ==========================================

      const changedFields = {
        id: oldMedicine.id,
      };

      let hasChanges = false;

      // NAME CHANGED?

      if (
        oldMedicine.name !==
        updatedMedicine.name
      ) {
        changedFields.name =
          updatedMedicine.name;

        hasChanges = true;
      }

      // CATEGORY CHANGED?

      if (
        oldMedicine.category !==
        updatedMedicine.category
      ) {
        changedFields.category =
          updatedMedicine.category;

        hasChanges = true;
      }

      // STOCK CHANGED?

      if (
        Number(
          oldMedicine.stock
        ) !==
        Number(
          updatedMedicine.stock
        )
      ) {
        changedFields.stock =
          updatedMedicine.stock;

        hasChanges = true;
      }

      // EXPIRY CHANGED?

      if (
        String(
          oldMedicine.expiry || ""
        ) !==
        String(
          updatedMedicine.expiry || ""
        )
      ) {
        changedFields.expiry =
          updatedMedicine.expiry;

        hasChanges = true;
      }

      // ==========================================
      // NOTHING WAS CHANGED
      // ==========================================

      if (!hasChanges) {
        console.log(
          "\n[backend] MEDICINE NOT CHANGED"
        );

        console.log(
          "No values were changed."
        );

        return res
          .status(200)
          .json(
            oldMedicine
          );
      }

      // ==========================================
      // SAVE UPDATED MEDICINE
      // ==========================================

      data.medicines[
        medicineIndex
      ] = updatedMedicine;

      writeData(data);

      // ==========================================
      // TERMINAL
      // SHOW ONLY WHAT CHANGED
      // ==========================================

      console.log(
        "\n=========================================="
      );

      console.log(
        "[backend] MEDICINE EDITED"
      );

      console.log(
        "=========================================="
      );

      console.log(
        JSON.stringify(
          changedFields,
          null,
          2
        )
      );

      console.log(
        "==========================================\n"
      );

      // ==========================================
      // RESPONSE
      // ==========================================

      return res
        .status(200)
        .json(
          updatedMedicine
        );

    } catch (error) {
      console.error(
        "[backend] Update medicine error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to update medicine.",

          error:
            error.message,
        });
    }
  }
);

// ==========================================
// DELETE MEDICINE
// ==========================================

app.delete(
  "/api/medicines/:id",
  (req, res) => {
    try {
      const id = String(
        req.params.id
      );

      const data = readData();

      // ==========================================
      // FIND MEDICINE
      // ==========================================

      const medicineIndex =
        data.medicines.findIndex(
          (medicine) =>
            String(
              medicine.id
            ) === id
        );

      if (
        medicineIndex ===
        -1
      ) {
        return res
          .status(404)
          .json({
            error:
              "Medicine not found.",
          });
      }

      // ==========================================
      // SAVE DELETED MEDICINE
      // ==========================================

      const deletedMedicine =
        data.medicines[
          medicineIndex
        ];

      // ==========================================
      // DELETE
      // ==========================================

      data.medicines.splice(
        medicineIndex,
        1
      );

      // ==========================================
      // SAVE
      // ==========================================

      writeData(data);

      // ==========================================
      // TERMINAL
      // SHOW DELETED + REMAINING
      // ==========================================

      console.log(
        "\n=========================================="
      );

      console.log(
        "[backend] MEDICINE DELETED"
      );

      console.log(
        "=========================================="
      );

      console.log(
        "[backend] DELETED MEDICINE:"
      );

      console.log(
        JSON.stringify(
          deletedMedicine,
          null,
          2
        )
      );

      console.log(
        "[backend] REMAINING MEDICINES:"
      );

      if (
        data.medicines.length ===
        0
      ) {
        console.log(
          "No medicines remaining."
        );
      } else {
        console.log(
          JSON.stringify(
            data.medicines,
            null,
            2
          )
        );
      }

      console.log(
        "==========================================\n"
      );

      return res.json({
        ok: true,

        deleted:
          deletedMedicine,

        remaining:
          data.medicines,
      });

    } catch (error) {
      console.error(
        "[backend] Delete medicine error:",
        error
      );

      return res
        .status(500)
        .json({
          error:
            "Failed to delete medicine.",
        });
    }
  }
);

// ==========================================
// CLEAR ALL CLINIC DATA
// ==========================================

app.delete(
  "/api/clinic-data",
  (_req, res) => {
    try {
      writeData(
        EMPTY_DATA
      );

      console.log(
        "\n=========================================="
      );

      console.log(
        "[backend] ALL CLINIC DATA CLEARED"
      );

      console.log(
        "Students: 0"
      );

      console.log(
        "Visits: 0"
      );

      console.log(
        "Medicines: 0"
      );

      console.log(
        "==========================================\n"
      );

      return res.json({
        ok: true,

        message:
          "All clinic data cleared.",
      });
    } catch (error) {
      console.error(
        "[backend] Clear data error:",
        error
      );

      return res
        .status(500)
        .json({
          ok: false,

          message:
            "Failed to clear clinic data.",
        });
    }
  }
);

// ==========================================
// ERROR HANDLER
// ==========================================

app.use(
  (
    error,
    _req,
    res,
    _next
  ) => {
    console.error(
      "[backend] Request error:",
      error
    );

    res
      .status(500)
      .json({
        error:
          "Internal server error.",
      });
  }
);

// ==========================================
// INITIALIZE DATA FILE
// ==========================================

ensureDataFile();

// ==========================================
// START SERVER
// ==========================================

app.listen(
  PORT,
  () => {
    console.log(
      "\n=========================================="
    );

    console.log(
      "       SCHOOL CLINIC BACKEND"
    );

    console.log(
      "=========================================="
    );

    console.log(
      `Server: http://localhost:${PORT}`
    );

    console.log(
      `Data file: ${DATA_FILE}`
    );

    console.log(
      "Status: READY"
    );

    console.log(
      "Waiting for frontend requests..."
    );

    console.log(
      "==========================================\n"
    );
  }
);