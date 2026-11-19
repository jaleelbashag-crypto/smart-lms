const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// PASSWORD HASHING HELPER (Stores secure salted hashes instead of plain text)
function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plainPassword, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(plainPassword, storedPassword) {
  if (!storedPassword || !storedPassword.includes(":")) {
    return plainPassword === storedPassword;
  }
  const [salt, originalHash] = storedPassword.split(":");
  const verifyHash = crypto.scryptSync(plainPassword, salt, 64).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(originalHash, "hex"),
    Buffer.from(verifyHash, "hex")
  );
}

// 1. REAL SQL DATABASE (SQLite file: educore.db)
const db = new sqlite3.Database("./educore.db");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT,
    course TEXT,
    status TEXT DEFAULT 'Pending',
    attended INTEGER DEFAULT 0,
    totalClasses INTEGER DEFAULT 0,
    resetToken TEXT
  )`);

  db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
    if (row && row.count === 0) {
      const stmt = db.prepare(
        "INSERT INTO users (name, email, password, role, department, course, status, attended, totalClasses) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      stmt.run("System Admin", "admin@educore.edu", hashPassword("Admin@123"), "admin", "Administration", "", "Approved", 0, 0);
      stmt.run("Prof. Rajesh Kumar", "trainer@educore.edu", hashPassword("Trainer@123"), "trainer", "Full-Stack Web Development", "", "Approved", 0, 0);
      stmt.run("Priya Nair", "student@educore.edu", hashPassword("Student@123"), "student", "", "Full-Stack Web Development", "Approved", 18, 20);
      stmt.finalize();
    }
  });
});

// 2. EMAIL TRANSPORTER (Uses your Gmail App Password if configured in terminal, else Ethereal test inbox)
const SENDER_EMAIL = process.env.SENDER_EMAIL || "jaleelbashag@apicalsoftsolution.com";
const SENDER_APP_PASSWORD = process.env.SENDER_APP_PASSWORD || "";

let transporter;
if (SENDER_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: SENDER_EMAIL, pass: SENDER_APP_PASSWORD }
  });
} else {
  nodemailer.createTestAccount().then((testAccount) => {
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
  });
}

// 3. REGISTER STUDENT -> HASH PASSWORD -> SAVE IN SQL DB -> SEND EMAIL
app.post("/api/register", (req, res) => {
  const { name, email, course, password } = req.body;
  const hashed = hashPassword(password);

  db.run(
    "INSERT INTO users (name, email, password, role, course, status) VALUES (?, ?, ?, 'student', ?, 'Pending')",
    [name, email.toLowerCase(), hashed, course],
    async function (err) {
      if (err) {
        return res.status(400).json({ error: "This email is already registered in the database." });
      }

      try {
        const info = await transporter.sendMail({
          from: `"EduCore Smart LMS" <${SENDER_EMAIL}>`,
          to: email,
          subject: `Welcome to EduCore LMS — Registration Confirmed (${course})`,
          html: `
            <h2>Welcome to EduCore Smart LMS, ${name}!</h2>
            <p>Your student account has been successfully registered.</p>
            <ul>
              <li><strong>Registered Email:</strong> ${email}</li>
              <li><strong>Enrolled Course:</strong> ${course}</li>
              <li><strong>Status:</strong> Pending Admin Approval</li>
            </ul>
            <p>Sign in at <a href="http://localhost:3000">http://localhost:3000</a> to access your course chapter PDFs.</p>
          `
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        res.json({
          message: `Registration saved & email sent to ${email}!`,
          previewUrl: previewUrl || null
        });
      } catch (mailErr) {
        res.json({
          message: `Saved to database! (Email skipped: ${mailErr.message})`
        });
      }
    }
  );
});

// 4. LOGIN (VERIFIES HASHED PASSWORD)
app.post("/api/login", (req, res) => {
  const { email, password, role } = req.body;
  db.get(
    "SELECT * FROM users WHERE email = ? AND role = ?",
    [email.toLowerCase(), role],
    (err, user) => {
      if (!user || !verifyPassword(password, user.password)) {
        return res.status(401).json({ error: `Invalid ${role} email or password.` });
      }
      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser });
    }
  );
});

// 5. FORGOT PASSWORD -> SEND RESET LINK EMAIL
app.post("/api/forgot-password", (req, res) => {
  const { email } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email.toLowerCase()], (err, user) => {
    if (!user) {
      return res.status(404).json({ error: "No registered account found with this email." });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const resetLink = `http://localhost:3000/?resetToken=${token}&email=${encodeURIComponent(user.email)}`;

    db.run("UPDATE users SET resetToken = ? WHERE id = ?", [token, user.id], async () => {
      try {
        const info = await transporter.sendMail({
          from: `"EduCore Smart LMS" <${SENDER_EMAIL}>`,
          to: user.email,
          subject: "EduCore LMS — Reset Your Password",
          html: `
            <h3>Password Reset Request</h3>
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Click the button below to change your EduCore LMS password:</p>
            <p><a href="${resetLink}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Change My Password</a></p>
            <p>Or copy this link:<br><a href="${resetLink}">${resetLink}</a></p>
          `
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        res.json({
          message: `Password reset email sent to ${user.email}!`,
          previewUrl: previewUrl || null
        });
      } catch (mailErr) {
        res.status(500).json({ error: `SMTP Error: ${mailErr.message}` });
      }
    });
  });
});

// 6. RESET PASSWORD FROM EMAIL LINK (STORES NEW HASHED PASSWORD)
app.post("/api/reset-password", (req, res) => {
  const { email, token, newPassword } = req.body;
  db.get(
    "SELECT * FROM users WHERE email = ? AND resetToken = ?",
    [email.toLowerCase(), token],
    (err, user) => {
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset link." });
      }
      const hashedNew = hashPassword(newPassword);
      db.run(
        "UPDATE users SET password = ?, resetToken = NULL WHERE id = ?",
        [hashedNew, user.id],
        () => res.json({ message: "Password changed successfully! Sign in with your new password." })
      );
    }
  );
});

// 7. ADMIN FULL CRUD ENDPOINTS (NEVER EXPOSES RAW PASSWORD)
app.get("/api/users", (req, res) => {
  db.all(
    "SELECT id, name, email, role, department, course, status, attended, totalClasses FROM users",
    [],
    (err, rows) => res.json(rows || [])
  );
});

app.post("/api/users", (req, res) => {
  const { name, email, role, department, password } = req.body;
  const hashed = hashPassword(password);
  db.run(
    "INSERT INTO users (name, email, password, role, department, status) VALUES (?, ?, ?, ?, ?, 'Approved')",
    [name, email.toLowerCase(), hashed, role, department],
    function (err) {
      if (err) return res.status(400).json({ error: "Email already exists in database." });
      res.json({ id: this.lastID });
    }
  );
});

app.put("/api/users/:id", (req, res) => {
  const { name, email, role, department, password, status, attended, totalClasses } = req.body;
  const hashed = password ? hashPassword(password) : null;
  db.run(
    `UPDATE users SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      role = COALESCE(?, role),
      department = COALESCE(?, department),
      password = COALESCE(?, password),
      status = COALESCE(?, status),
      attended = COALESCE(?, attended),
      totalClasses = COALESCE(?, totalClasses)
     WHERE id = ?`,
    [name, email, role, department, hashed, status, attended, totalClasses, req.params.id],
    () => res.json({ success: true })
  );
});

app.delete("/api/users/:id", (req, res) => {
  db.run("DELETE FROM users WHERE id = ?", [req.params.id], () => res.json({ success: true }));
});

// 8. SQLITE3 REGISTRATION COUNT & DATABASE SUMMARY
app.get("/api/stats", (req, res) => {
  db.get(
    `SELECT 
      COUNT(*) AS totalUsers,
      SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) AS totalStudents,
      SUM(CASE WHEN role = 'trainer' THEN 1 ELSE 0 END) AS totalTrainers,
      SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS totalAdmins
     FROM users`,
    [],
    (err, stats) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(stats);
    }
  );
});

app.listen(3000, () => {
  console.log("EduCore Smart LMS running at http://localhost:3000");
});
