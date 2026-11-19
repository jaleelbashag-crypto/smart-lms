const API_URL = "http://localhost:3000/api";

const coursesData = [
  {
    title: "Full-Stack Web Development",
    category: "Web Engineering",
    duration: "16 Weeks",
    trainer: "Prof. Rajesh Kumar",
    description: "Master HTML5, CSS3, modern JavaScript, REST APIs, and full-stack deployment from scratch.",
    chapters: [
      { id: 101, chapterNo: "Chapter 1", title: "HTML5 Semantic Structure & Forms", fileName: "Ch1_HTML5_Forms.pdf", summary: "Document structure, semantic tags, and accessible form design." },
      { id: 102, chapterNo: "Chapter 2", title: "Modern CSS3 Flexbox, Grid & Responsive UI", fileName: "Ch2_CSS3_Grid_Flexbox.pdf", summary: "Responsive split-screen layouts, CSS Grid templates, and media queries." },
      { id: 103, chapterNo: "Chapter 3", title: "JavaScript DOM Manipulation & SQL APIs", fileName: "Ch3_JS_DOM_SQL.pdf", summary: "Event listeners, dynamic rendering, Fetch API, and database CRUD operations." }
    ]
  },
  {
    title: "Data Science & Python",
    category: "AI & Analytics",
    duration: "14 Weeks",
    trainer: "Prof. Rajesh Kumar",
    description: "Learn Python programming, Pandas, data visualization, statistical modeling, and machine learning.",
    chapters: [
      { id: 201, chapterNo: "Chapter 1", title: "Python Fundamentals & Data Structures", fileName: "Ch1_Python_Basics.pdf", summary: "Lists, dictionaries, comprehensions, functions, and modular Python scripting." },
      { id: 202, chapterNo: "Chapter 2", title: "Data Wrangling with NumPy & Pandas", fileName: "Ch2_Pandas_DataFrames.pdf", summary: "Cleaning datasets, filtering rows, and statistical aggregations." }
    ]
  },
  {
    title: "Cloud Computing",
    category: "Cloud & DevOps",
    duration: "12 Weeks",
    trainer: "Unassigned",
    description: "Build scalable cloud architectures, CI/CD pipelines, containerization, and serverless deployments.",
    chapters: [
      { id: 301, chapterNo: "Chapter 1", title: "Cloud Service Models (IaaS, PaaS, SaaS)", fileName: "Ch1_Cloud_Fundamentals.pdf", summary: "Core architecture of public/private clouds and virtualization." }
    ]
  },
  {
    title: "UI/UX Product Design",
    category: "Design Systems",
    duration: "10 Weeks",
    trainer: "Prof. Rajesh Kumar",
    description: "Design intuitive user interfaces, wireframes, design tokens, and interactive prototypes.",
    chapters: [
      { id: 401, chapterNo: "Chapter 1", title: "User Research, Personas & Wireframing", fileName: "Ch1_UX_Wireframes.pdf", summary: "Translating user workflows into low-fidelity wireframes." }
    ]
  }
];

let allUsers = [];
let currentRole = "student";
let loggedInUser = null;
let editingEmployeeId = null;
let activeNavTab = "home";
let courseSearchQuery = "";
let selectedCourseTitle = null;
let activePdfChapter = null;

const authSection = document.getElementById("auth-section");
const dashboardSection = document.getElementById("dashboard-section");
const roleTabs = document.querySelectorAll(".role-tab");
const subTabs = document.querySelectorAll(".sub-tab");
const studentToggle = document.getElementById("student-toggle");
const formHeading = document.getElementById("form-heading");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const forgotForm = document.getElementById("forgot-form");
const resetForm = document.getElementById("reset-form");
const loginError = document.getElementById("login-error");

// STRICT VALIDATION RULES
// 1. User Name: Must contain at least ONE Capital letter (A-Z) and be 3+ characters
const capitalNameRegex = /^(?=.*[A-Z])[A-Za-z\s]{3,}$/;
// 2. Email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// 3. Password: At least 8 chars, 1 Capital, 1 Small, 1 Number, 1 Special character
const strongPasswordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function setFieldError(inputId, errId, message) {
  const inputEl = document.getElementById(inputId);
  const errEl = document.getElementById(errId);
  if (message) {
    inputEl.classList.add("invalid");
    errEl.textContent = message;
    return false;
  } else {
    inputEl.classList.remove("invalid");
    errEl.textContent = "";
    return true;
  }
}

function clearAllErrors() {
  document.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
  document.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
  loginError.classList.add("hidden");
  loginError.style.color = "";
  loginError.style.background = "";
}

function showOnlyForm(formToShow) {
  [loginForm, registerForm, forgotForm, resetForm].forEach((f) => f.classList.add("hidden"));
  formToShow.classList.remove("hidden");
}

function switchToStudentLogin(prefillEmail = "") {
  roleTabs.forEach((t) => t.classList.toggle("active", t.dataset.role === "student"));
  currentRole = "student";
  studentToggle.classList.remove("hidden");
  formHeading.textContent = "Student Login";
  subTabs.forEach((t) => t.classList.toggle("active", t.dataset.mode === "login"));
  showOnlyForm(loginForm);

  if (prefillEmail) {
    document.getElementById("login-email").value = prefillEmail;
    document.getElementById("login-password").value = "";
    document.getElementById("login-password").focus();
  }
}

// Detect Password Reset Link clicked from Email (?resetToken=...&email=...)
const urlParams = new URLSearchParams(window.location.search);
const resetTokenFromUrl = urlParams.get("resetToken");
const resetEmailFromUrl = urlParams.get("email");
if (resetTokenFromUrl && resetEmailFromUrl) {
  studentToggle.classList.add("hidden");
  document.getElementById("reset-email-label").textContent = `Changing password for: ${resetEmailFromUrl}`;
  showOnlyForm(resetForm);
}

// Role & Sub-tab switching
roleTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    roleTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentRole = tab.dataset.role;
    clearAllErrors();
    const label = currentRole.charAt(0).toUpperCase() + currentRole.slice(1);
    formHeading.textContent = `${label} Login`;
    studentToggle.classList.toggle("hidden", currentRole !== "student");
    showOnlyForm(loginForm);
  });
});

subTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    subTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    clearAllErrors();
    showOnlyForm(tab.dataset.mode === "register" ? registerForm : loginForm);
  });
});

// Forgot Password Navigation
document.getElementById("forgot-link").addEventListener("click", (e) => {
  e.preventDefault();
  clearAllErrors();
  document.getElementById("forgot-msg").classList.add("hidden");
  studentToggle.classList.add("hidden");
  showOnlyForm(forgotForm);
});

document.getElementById("back-to-login-btn").addEventListener("click", () => {
  clearAllErrors();
  if (currentRole === "student") studentToggle.classList.remove("hidden");
  showOnlyForm(loginForm);
});

// REGISTER NEW STUDENT -> SAVE IN SQL DB + SEND EMAIL + REDIRECT TO SIGN IN
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("reg-submit-btn");

  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const course = document.getElementById("reg-course").value;
  const password = document.getElementById("reg-password").value;
  const confirm = document.getElementById("reg-confirm").value;

  const vName = setFieldError(
    "reg-name",
    "err-reg-name",
    !capitalNameRegex.test(name) ? "User name must be 3+ letters and contain at least one CAPITAL letter (e.g., Rahul Sharma)." : ""
  );
  const vEmail = setFieldError("reg-email", "err-reg-email", !emailRegex.test(email) ? "Enter a valid email address." : "");
  const vCourse = setFieldError("reg-course", "err-reg-course", !course ? "Please select a course." : "");
  const vPass = setFieldError(
    "reg-password",
    "err-reg-password",
    !strongPasswordRegex.test(password)
      ? "Password must have 8+ chars: Capital letter, small letter, number & special character (@#$!%)."
      : ""
  );
  const vConfirm = setFieldError("reg-confirm", "err-reg-confirm", confirm !== password || !confirm ? "Passwords do not match." : "");

  if (!vName || !vEmail || !vCourse || !vPass || !vConfirm) return;

  btn.disabled = true;
  btn.textContent = "Registering & Sending Email...";

  try {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, course, password })
    });
    const data = await res.json();

    if (!res.ok) {
      setFieldError("reg-email", "err-reg-email", data.error);
      return;
    }

    registerForm.reset();
    clearAllErrors();
    switchToStudentLogin(email);

    loginError.innerHTML = `
      <div>${data.message}</div>
      ${data.previewUrl ? `<a href="${data.previewUrl}" target="_blank" style="display:inline-block;margin-top:6px;color:#1d4ed8;font-weight:700;text-decoration:underline;">📩 Open Sent Registration Email</a>` : ""}
    `;
    loginError.style.color = "#15803d";
    loginError.style.background = "#f0fdf4";
    loginError.classList.remove("hidden");
  } catch (err) {
    setFieldError("reg-email", "err-reg-email", "Server not running! Start 'node server.js' in terminal and open http://localhost:3000");
  } finally {
    btn.disabled = false;
    btn.textContent = "Register & Send Email";
  }
});

// SIGN IN
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAllErrors();

  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const password = document.getElementById("login-password").value;

  const vEmail = setFieldError("login-email", "err-login-email", !emailRegex.test(email) ? "Enter a valid email address." : "");
  const vPass = setFieldError("login-password", "err-login-password", password.length < 3 ? "Enter your password." : "");
  if (!vEmail || !vPass) return;

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role: currentRole })
    });
    const data = await res.json();

    if (!res.ok) {
      loginError.textContent = data.error;
      loginError.classList.remove("hidden");
      return;
    }

    loggedInUser = data.user;
    activeNavTab = "home";
    await loadAllUsers();
    authSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    renderDashboard();
  } catch (err) {
    loginError.textContent = "Server offline. Run 'node server.js' and open http://localhost:3000";
    loginError.classList.remove("hidden");
  }
});

// FORGOT PASSWORD -> SEND EMAIL
forgotForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById("forgot-msg");
  const email = document.getElementById("forgot-email").value.trim().toLowerCase();

  if (!setFieldError("forgot-email", "err-forgot-email", !emailRegex.test(email) ? "Enter your registered email." : "")) return;

  const btn = document.getElementById("forgot-submit-btn");
  btn.disabled = true;
  btn.textContent = "Sending Reset Email...";

  try {
    const res = await fetch(`${API_URL}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (!res.ok) {
      msgEl.textContent = data.error;
      msgEl.className = "error-text";
      return;
    }

    msgEl.innerHTML = `
      <div>${data.message}</div>
      ${data.previewUrl ? `<a href="${data.previewUrl}" target="_blank" style="display:inline-block;margin-top:6px;color:#1d4ed8;font-weight:700;text-decoration:underline;">📩 Open Reset Password Email & Click Link</a>` : ""}
    `;
    msgEl.className = "success-text";
  } catch (err) {
    msgEl.textContent = "Server offline. Run 'node server.js'.";
    msgEl.className = "error-text";
  } finally {
    btn.disabled = false;
    btn.textContent = "Send Reset Email";
  }
});

// RESET PASSWORD FROM EMAIL LINK
resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById("reset-msg");
  const newPassword = document.getElementById("reset-new-pass").value;
  const confirmPassword = document.getElementById("reset-confirm-pass").value;

  const vPass = setFieldError(
    "reset-new-pass",
    "err-reset-pass",
    !strongPasswordRegex.test(newPassword)
      ? "Password must have 8+ chars: Capital letter, small letter, number & special character."
      : ""
  );
  const vConf = setFieldError("reset-confirm-pass", "err-reset-confirm", newPassword !== confirmPassword ? "Passwords do not match." : "");
  if (!vPass || !vConf) return;

  const res = await fetch(`${API_URL}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: resetEmailFromUrl, token: resetTokenFromUrl, newPassword })
  });
  const data = await res.json();

  if (res.ok) {
    window.history.replaceState({}, document.title, "/");
    switchToStudentLogin(resetEmailFromUrl);
    loginError.textContent = data.message;
    loginError.style.color = "#15803d";
    loginError.style.background = "#f0fdf4";
    loginError.classList.remove("hidden");
  } else {
    msgEl.textContent = data.error;
    msgEl.classList.remove("hidden");
  }
});

async function loadAllUsers() {
  const res = await fetch(`${API_URL}/users`);
  allUsers = await res.json();
}

function logout() {
  loggedInUser = null;
  editingEmployeeId = null;
  loginForm.reset();
  dashboardSection.classList.add("hidden");
  authSection.classList.remove("hidden");
}

function setNavTab(tab) {
  activeNavTab = tab;
  renderDashboard();
}

// COURSE CHAPTER PDFs VIEWER
function openCourseChapters(title) {
  selectedCourseTitle = title;
  activePdfChapter = null;
  renderDashboard();
}

function closeCourseModal() {
  selectedCourseTitle = null;
  activePdfChapter = null;
  renderDashboard();
}

function openChapterPdf(chapterId) {
  const course = coursesData.find((c) => c.title === selectedCourseTitle);
  if (!course) return;
  activePdfChapter = course.chapters.find((ch) => ch.id === chapterId) || null;
  renderDashboard();
}

function createRealPdfDataUri(courseTitle, chapter) {
  const clean = (str) => str.replace(/[()\\]/g, "");
  const lines = [
    `EduCore Smart LMS - Official Study Material`,
    `Course: ${clean(courseTitle)}`,
    `${clean(chapter.chapterNo)}: ${clean(chapter.title)}`,
    `------------------------------------------------------------`,
    `${clean(chapter.summary)}`
  ];
  let textOps = "BT /F1 13 Tf 50 750 Td 20 TL ";
  lines.forEach((line, idx) => (textOps += idx === 0 ? `(${line}) Tj ` : `T* (${line}) Tj `));
  textOps += "ET";

  const pdfObjects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${textOps.length} >> stream\n${textOps}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj"
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  pdfObjects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += obj + "\n";
  });
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${pdfObjects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((off) => (pdf += `${String(off).padStart(10, "0")} 00000 n \n`));
  pdf += `trailer << /Size ${pdfObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return "data:application/pdf;base64," + btoa(pdf);
}

function renderCourseModal() {
  if (!selectedCourseTitle) return "";
  const course = coursesData.find((c) => c.title === selectedCourseTitle);
  if (!course) return "";
  const pdfUri = activePdfChapter ? createRealPdfDataUri(course.title, activePdfChapter) : "";

  return `
    <div class="modal-backdrop" onclick="if(event.target===this) closeCourseModal()">
      <div class="modal-box">
        <div class="modal-header">
          <div>
            <span class="course-tag">${course.category} • ${course.duration}</span>
            <h3>${course.title} — Chapter PDFs</h3>
          </div>
          <button class="btn-sm btn-red" onclick="closeCourseModal()">✕ Close</button>
        </div>
        ${
          activePdfChapter
            ? `<button class="btn-sm btn-amber" onclick="activePdfChapter=null; renderDashboard()">← Back to Chapters</button>
               <iframe class="pdf-viewer-frame" src="${pdfUri}"></iframe>`
            : course.chapters
                .map(
                  (ch) => `
                <div class="chapter-item">
                  <div class="chapter-info">
                    <span class="pdf-badge">PDF</span>
                    <div><strong>${ch.chapterNo}: ${ch.title}</strong><div style="font-size:12px; color:#64748b;">${ch.summary}</div></div>
                  </div>
                  <div style="display:flex; gap:6px;">
                    <button class="btn-sm btn-blue" onclick="openChapterPdf(${ch.id})">View PDF</button>
                    <a class="btn-sm btn-green" style="text-decoration:none;" href="${createRealPdfDataUri(course.title, ch)}" download="${ch.fileName}">Download</a>
                  </div>
                </div>`
                )
                .join("")
        }
      </div>
    </div>
  `;
}

// DASHBOARD RENDERER
function renderDashboard() {
  const initial = loggedInUser.name.charAt(0).toUpperCase();
  const portalLabel =
    loggedInUser.role === "admin" ? "Admin CRUD Panel" : loggedInUser.role === "trainer" ? "Trainer Workspace" : "My Learning Portal";

  const navbarHTML = `
    <nav class="pro-navbar">
      <div class="nav-brand">
        <div class="nav-logo-box">E</div>
        <h2>EduCore LMS</h2>
      </div>
      <div class="nav-links">
        <button class="nav-link-btn ${activeNavTab === "home" ? "active" : ""}" onclick="setNavTab('home')">Home & Courses</button>
        <button class="nav-link-btn ${activeNavTab === "workspace" ? "active" : ""}" onclick="setNavTab('workspace')">${portalLabel}</button>
      </div>
      <div class="nav-user-area">
        <div class="user-chip">
          <div class="user-avatar">${initial}</div>
          <span style="font-size:13px; font-weight:600;">${loggedInUser.name}</span>
          <span class="nav-role-tag">${loggedInUser.role}</span>
        </div>
        <button class="btn-logout-pro" onclick="logout()">Sign Out</button>
      </div>
    </nav>
  `;

  let bodyHTML = "";
  if (activeNavTab === "home") {
    bodyHTML = renderHomeCoursesView();
  } else if (loggedInUser.role === "admin") {
    bodyHTML = renderAdminView();
  } else if (loggedInUser.role === "trainer") {
    bodyHTML = renderTrainerView();
  } else {
    bodyHTML = renderStudentView();
  }

  dashboardSection.innerHTML = navbarHTML + bodyHTML + renderCourseModal();
}

function buildCourseCardsHTML() {
  const q = courseSearchQuery.trim().toLowerCase();
  const filtered = coursesData.filter(
    (c) => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.trainer.toLowerCase().includes(q)
  );
  return filtered
    .map(
      (c) => `
      <div class="course-card">
        <div>
          <span class="course-tag">${c.category} • ${c.duration} • ${c.chapters.length} PDFs</span>
          <h4>${c.title}</h4>
          <p>${c.description}</p>
        </div>
        <div class="course-meta">
          <span>Instructor: <strong>${c.trainer}</strong></span>
          <button class="btn-sm btn-blue" onclick="openCourseChapters('${c.title}')">View Chapters</button>
        </div>
      </div>` 
      )
    .join("");
}

function renderHomeCoursesView() {
  return `
    <div class="card">
      <div class="catalog-header">
        <div>
          <h3 style="margin-bottom:4px;">Available Institute Courses (${coursesData.length})</h3>
          <p style="font-size:13px; color:#64748b;">Search courses or click "Open Chapters & PDFs" to read study material.</p>
        </div>
        <div class="search-box-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="Search courses..." value="${courseSearchQuery}"
            oninput="courseSearchQuery=this.value; document.getElementById('course-catalog-grid').innerHTML=buildCourseCardsHTML();" />
        </div>
      </div>
      <div id="course-catalog-grid" class="course-grid">${buildCourseCardsHTML()}</div>
    </div>
  `;
}

// ADMIN FULL SQL CRUD VIEW
function renderAdminView() {
  const employees = allUsers.filter((u) => u.role === "trainer" || u.role === "admin");
  const students = allUsers.filter((u) => u.role === "student");

  const empRows = employees
    .map(
      (emp) => `
      <tr>
        <td><strong>${emp.name}</strong><br><small style="color:#64748b">${emp.email}</small></td>
        <td><span class="role-pill">${emp.role}</span></td>
        <td>${emp.department || "General"}</td>
        <td>
          <button class="btn-sm btn-amber" onclick="startEditEmployee(${emp.id})">Edit</button>
          ${emp.id !== loggedInUser.id ? `<button class="btn-sm btn-red" onclick="deleteUserDB(${emp.id})">Delete</button>` : `<small>(You)</small>`}
        </td>
      </tr>`
    )
    .join("");

  const studentRows = students
    .map(
      (s) => `
      <tr>
        <td><strong>${s.name}</strong><br><small style="color:#64748b">${s.email}</small></td>
        <td>${s.course}</td>
        <td><strong>${s.status}</strong></td>
        <td>
          <button class="btn-sm btn-green" onclick="updateStudentStatusDB(${s.id}, 'Approved')">Approve</button>
          <button class="btn-sm btn-amber" onclick="updateStudentStatusDB(${s.id}, 'Rejected')">Reject</button>
          <button class="btn-sm btn-red" onclick="deleteUserDB(${s.id})">Delete</button>
        </td>
      </tr>`
    )
    .join("");

  return `
    <div class="card">
      <h3>${editingEmployeeId ? "Edit Employee in SQL Database" : "Admin Employee CRUD (Add / Edit / Delete Trainers & Admins)"}</h3>
      <div class="crud-form-grid">
        <div><label>Name (Capital Letter Required)</label><input type="text" id="emp-name" placeholder="Dr. Kavita Menon" /></div>
        <div><label>Email</label><input type="email" id="emp-email" placeholder="kavita@educore.edu" /></div>
        <div><label>Role</label><select id="emp-role"><option value="trainer">Trainer</option><option value="admin">Admin</option></select></div>
        <div><label>Department</label><input type="text" id="emp-dept" placeholder="Data Science" /></div>
        <div><label>Strong Password</label><input type="text" id="emp-pass" placeholder="Kavita@123" /></div>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn-primary" onclick="saveEmployeeDB()">${editingEmployeeId ? "Update" : "+ Add Employee"}</button>
          ${editingEmployeeId ? `<button type="button" class="btn-secondary" onclick="editingEmployeeId=null; renderDashboard()">Cancel</button>` : ""}
        </div>
      </div>
      <p id="emp-crud-msg" class="error-text hidden"></p>
      <table>
        <thead><tr><th>Employee</th><th>Role</th><th>Department</th><th>CRUD Actions</th></tr></thead>
        <tbody>${empRows}</tbody>
      </table>
    </div>

    <div class="card">
      <h3>Registered Students (SQL Database Records)</h3>
      <table>
        <thead><tr><th>Student</th><th>Course</th><th>Status</th><th>CRUD Actions</th></tr></thead>
        <tbody>${studentRows}</tbody>
      </table>
    </div>
  `;
}

async function saveEmployeeDB() {
  const name = document.getElementById("emp-name").value.trim();
  const email = document.getElementById("emp-email").value.trim().toLowerCase();
  const role = document.getElementById("emp-role").value;
  const department = document.getElementById("emp-dept").value.trim() || "General";
  const password = document.getElementById("emp-pass").value.trim();
  const msgEl = document.getElementById("emp-crud-msg");

  if (!capitalNameRegex.test(name) || !emailRegex.test(email) || !strongPasswordRegex.test(password)) {
    msgEl.textContent = "Name needs a Capital letter, valid email required, and password needs Capital + Small + Number + Special char (8+ chars).";
    msgEl.classList.remove("hidden");
    return;
  }

  if (editingEmployeeId) {
    await fetch(`${API_URL}/users/${editingEmployeeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role, department, password })
    });
    editingEmployeeId = null;
  } else {
    const res = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role, department, password })
    });
    if (!res.ok) {
      msgEl.textContent = "Email already exists in database.";
      msgEl.classList.remove("hidden");
      return;
    }
  }

  await loadAllUsers();
  renderDashboard();
}

function startEditEmployee(id) {
  const emp = allUsers.find((u) => u.id === id);
  if (!emp) return;
  editingEmployeeId = id;
  renderDashboard();
  document.getElementById("emp-name").value = emp.name;
  document.getElementById("emp-email").value = emp.email;
  document.getElementById("emp-role").value = emp.role;
  document.getElementById("emp-dept").value = emp.department || "";
  document.getElementById("emp-pass").value = emp.password;
}

async function deleteUserDB(id) {
  if (!confirm("Delete this user permanently from SQL database?")) return;
  await fetch(`${API_URL}/users/${id}`, { method: "DELETE" });
  await loadAllUsers();
  renderDashboard();
}

async function updateStudentStatusDB(id, status) {
  await fetch(`${API_URL}/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  await loadAllUsers();
  renderDashboard();
}

// TRAINER & STUDENT VIEWS
function renderTrainerView() {
  const students = allUsers.filter((u) => u.role === "student");
  return `
    <div class="card">
      <h3>Digital Attendance Tracker (SQL Database Synced)</h3>
      <table>
        <thead><tr><th>Student</th><th>Course</th><th>Attendance</th><th>Mark Today</th></tr></thead>
        <tbody>
          ${students
            .map((s) => {
              const pct = s.totalClasses ? Math.round((s.attended / s.totalClasses) * 100) : 0;
              return `<tr>
                <td>${s.name}</td><td>${s.course}</td><td>${s.attended}/${s.totalClasses} (${pct}%)</td>
                <td>
                  <button class="btn-sm btn-green" onclick="markAttendanceDB(${s.id}, ${s.attended + 1}, ${s.totalClasses + 1})">Present</button>
                  <button class="btn-sm btn-red" onclick="markAttendanceDB(${s.id}, ${s.attended}, ${s.totalClasses + 1})">Absent</button>
                </td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function markAttendanceDB(id, attended, totalClasses) {
  await fetch(`${API_URL}/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attended, totalClasses })
  });
  await loadAllUsers();
  renderDashboard();
}

function renderStudentView() {
  const me = allUsers.find((u) => u.id === loggedInUser.id) || loggedInUser;
  const pct = me.totalClasses ? Math.round((me.attended / me.totalClasses) * 100) : 0;
  return `
    <div class="card">
      <h3>My Academic Overview</h3>
      <p><strong>Enrolled Course:</strong> ${me.course}</p>
      <p><strong>Enrollment Status:</strong> ${me.status}</p>
      <p style="margin-bottom:14px;"><strong>Attendance:</strong> ${me.attended} / ${me.totalClasses} (${pct}%)</p>
      <button class="btn-primary" onclick="openCourseChapters('${me.course}')">Open My Course Chapter PDFs</button>
    </div>
  `;
}