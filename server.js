const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

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
      stmt.run("System Admin", "admin@educore.edu", "Admin@123", "admin", "Administration", "", "Approved", 0, 0);
      stmt.run("Prof. Rajesh Kumar", "trainer@educore.edu", "Trainer@123", "trainer", "Full-Stack Web Development", "", "Approved", 0, 0);
      stmt.run("Priya Nair", "student@educore.edu", "Student@123", "student", "", "Full-Stack Web Development", "Approved", 18, 20);
      stmt.finalize();
    }
  });
});

// 2. AUTOMATIC SMTP TRANSPORTER (Works immediately with zero manual setup!)
let transporterPromise = nodemailer.createTestAccount().then((testAccount) => {
  console.log("SMTP Mail Server Ready:", testAccount.user);
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
});

// 3. REGISTER STUDENT + SAVE IN SQL DB + SEND REGISTRATION EMAIL
app.post("/api/register", (req, res) => {
  const { name, email, course, password } = req.body;

  db.run(
    "INSERT INTO users (name, email, password, role, course, status) VALUES (?, ?, ?, 'student', ?, 'Pending')",
    [name, email.toLowerCase(), password, course],
    async function (err) {
      if (err) {
        return res.status(400).json({ error: "This email is already registered in the database." });
      }

      try {
        const transporter = await transporterPromise;
        const info = await transporter.sendMail({
          from: '"EduCore Smart LMS" <admissions@educore.edu>',
          to: email,
          subject: `Welcome to EduCore LMS — Registration Confirmed (${course})`,
          html: `
            <h2>Welcome to EduCore Smart LMS, ${name}!</h2>
            <p>Your registration has been saved in our SQL database.</p>
            <ul>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Course:</strong> ${course}</li>
              <li><strong>Status:</strong> Pending Admin Approval</li>
            </ul>
            <p>Sign in at <a href="http://localhost:3000">http://localhost:3000</a> to view your chapter PDFs.</p>
          `
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log("Registration Email Sent! View inbox here:", previewUrl);

        res.json({
          message: `Registration saved & email sent to ${email}!`,
          previewUrl
        });
      } catch (mailErr) {
        res.json({ message: "Saved to database, email queued.", previewUrl: null });
      }
    }
  );
});

// 4. LOGIN
app.post("/api/login", (req, res) => {
  const { email, password, role } = req.body;
  db.get(
    "SELECT * FROM users WHERE email = ? AND password = ? AND role = ?",
    [email.toLowerCase(), password, role],
    (err, user) => {
      if (!user) {
        return res.status(401).json({ error: `Invalid ${role} email or password.` });
      }
      res.json({ user });
    }
  );
});

// 5. FORGOT PASSWORD -> SEND RESET EMAIL WITH LINK
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
        const transporter = await transporterPromise;
        const info = await transporter.sendMail({
          from: '"EduCore Smart LMS" <security@educore.edu>',
          to: user.email,
          subject: "EduCore LMS — Reset Your Password",
          html: `
            <h3>Password Reset Request</h3>
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Click the button below to change your EduCore LMS password:</p>
            <p><a href="${resetLink}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Change My Password</a></p>
            <p>Or open this link directly:<br><a href="${resetLink}">${resetLink}</a></p>
          `
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log("Forgot Password Email Sent! View inbox here:", previewUrl);

        res.json({
          message: `Password reset email sent to ${user.email}!`,
          previewUrl
        });
      } catch (e) {
        res.status(500).json({ error: "Could not send password reset email." });
      }
    });
  });
});

// 6. RESET PASSWORD FROM EMAIL LINK
app.post("/api/reset-password", (req, res) => {
  const { email, token, newPassword } = req.body;
  db.get(
    "SELECT * FROM users WHERE email = ? AND resetToken = ?",
    [email.toLowerCase(), token],
    (err, user) => {
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset link." });
      }
      db.run(
        "UPDATE users SET password = ?, resetToken = NULL WHERE id = ?",
        [newPassword, user.id],
        () => res.json({ message: "Password changed successfully! Sign in with your new password." })
      );
    }
  );
});

// 7. ADMIN FULL CRUD ENDPOINTS (CREATE, READ, UPDATE, DELETE)
app.get("/api/users", (req, res) => {
  db.all("SELECT * FROM users", [], (err, rows) => res.json(rows || []));
});

app.post("/api/users", (req, res) => {
  const { name, email, role, department, password } = req.body;
  db.run(
    "INSERT INTO users (name, email, password, role, department, status) VALUES (?, ?, ?, ?, ?, 'Approved')",
    [name, email.toLowerCase(), password, role, department],
    function (err) {
      if (err) return res.status(400).json({ error: "Email already exists in database." });
      res.json({ id: this.lastID });
    }
  );
});

app.put("/api/users/:id", (req, res) => {
  const { name, email, role, department, password, status, attended, totalClasses } = req.body;
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
    [name, email, role, department, password, status, attended, totalClasses, req.params.id],
    () => res.json({ success: true })
  );
});

app.delete("/api/users/:id", (req, res) => {
  db.run("DELETE FROM users WHERE id = ?", [req.params.id], () => res.json({ success: true }));
});

app.listen(3000, () => {
  console.log("EduCore Smart LMS running at http://localhost:3000");
});
