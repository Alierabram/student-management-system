(function() {
  "use strict";

  const TOKEN_KEY = "bugemadesk_token";
  const API_BASE = "/api";
  const PAGE_SIZE = 10;

  const state = {
    page: 1,
    totalPages: 1,
    total: 0,
    currentStudent: null,
    editingId: null,
    pendingDeleteId: null,
    programmeOptions: [],
    departmentOptions: [],
    commandStudents: []
  };

  let commandIndex = 0;
  let commandItems = [];

  const $ = (id) => document.getElementById(id);

  const els = {
    sidebar: $("sidebar"),
    sidebarScrim: $("sidebarScrim"),
    userName: $("userName"),
    userRole: $("userRole"),
    userAvatar: $("userAvatar"),
    logoutBtn: $("logoutBtn"),
    sidebarConnection: $("sidebarConnection"),
    connectionText: $("connectionText"),
    connectionPill: $("connectionPill"),
    sidebarStatus: $("sidebarStatus"),
    menuBtn: $("menuBtn"),
    addStudentBtn: $("addStudentBtn"),
    heroAddBtn: $("heroAddBtn"),
    heroSearchBtn: $("heroSearchBtn"),
    heroPrintBtn: $("heroPrintBtn"),
    heroName: $("heroName"),
    heroTotal: $("heroTotal"),
    heroConnection: $("heroConnection"),
    totalCount: $("totalCount"),
    activeCount: $("activeCount"),
    tuitionClearedCount: $("tuitionClearedCount"),
    programmeCount: $("programmeCount"),
    departmentCount: $("departmentCount"),
    recordCount: $("recordCount"),
    searchInput: $("searchInput"),
    programmeFilter: $("programmeFilter"),
    departmentFilter: $("departmentFilter"),
    yearFilter: $("yearFilter"),
    academicStatusFilter: $("academicStatusFilter"),
    tuitionStatusFilter: $("tuitionStatusFilter"),
    sortFilter: $("sortFilter"),
    clearFiltersBtn: $("clearFiltersBtn"),
    refreshBtn: $("refreshBtn"),
    exportCsvBtn: $("exportCsvBtn"),
    exportJsonBtn: $("exportJsonBtn"),
    printDirectoryBtn: $("printDirectoryBtn"),
    recentList: $("recentList"),
    recentViewAllBtn: $("recentViewAllBtn"),
    programmeChart: $("programmeChart"),
    studentRows: $("studentRows"),
    loadingBar: $("loadingBar"),
    pageSummary: $("pageSummary"),
    pageNumbers: $("pageNumbers"),
    previousPage: $("previousPage"),
    nextPage: $("nextPage"),
    formBackdrop: $("formBackdrop"),
    studentForm: $("studentForm"),
    formTitle: $("formTitle"),
    formDescription: $("formDescription"),
    formError: $("formError"),
    closeFormBtn: $("closeFormBtn"),
    cancelBtn: $("cancelBtn"),
    saveStudentBtn: $("saveStudentBtn"),
    saveStudentLabel: document.getElementById("saveStudentLabel"),
    profileBackdrop: $("profileBackdrop"),
    profileTitle: $("profileTitle"),
    profileRegNo: $("profileRegNo"),
    profileAvatar: $("profileAvatar"),
    profileAcademicBadge: $("profileAcademicBadge"),
    profileTuitionBadge: $("profileTuitionBadge"),
    profileGrid: $("profileGrid"),
    closeProfileBtn: $("closeProfileBtn"),
    profileDoneBtn: $("profileDoneBtn"),
    editProfileBtn: $("editProfileBtn"),
    printSlipBtn: $("printSlipBtn"),
    confirmBackdrop: $("confirmBackdrop"),
    confirmMessage: $("confirmMessage"),
    confirmDeleteBtn: $("confirmDeleteBtn"),
    cancelDeleteBtn: $("cancelDeleteBtn"),
    closeConfirmBtn: $("closeConfirmBtn"),
    toast: $("toast"),
    printDirectory: $("printDirectory"),
    printSlip: $("printSlip"),
    programmeOptionsList: $("programmeOptions"),
    departmentOptionsList: $("departmentOptions"),
    themeToggleBtn: $("themeToggleBtn"),
    commandBackdrop: $("commandBackdrop"),
    commandInput: $("commandInput"),
    commandHint: $("commandHint"),
    commandResults: $("commandResults")
  };

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("bugemadesk_user");
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem("bugemadesk_user");
  }

  function redirectToLogin() {
    window.location.replace("login.html");
  }

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    const token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;
    if (options.body) headers["Content-Type"] = "application/json";

    const response = await fetch(API_BASE + path, { ...options, headers });
    let payload = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = await response.json().catch(() => null);
    } else {
      payload = await response.text().catch(() => "");
    }

    if (response.status === 401) {
      clearAuth();
      redirectToLogin();
      throw new Error("Session expired. Redirecting to sign in.");
    }

    if (!response.ok) {
      throw new Error((payload && payload.error) || "Request failed (" + response.status + ")");
    }
    return payload;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part.charAt(0)).join("").toUpperCase() || "BU";
  }

  function showToast(message, type) {
    els.toast.textContent = message;
    els.toast.className = "toast show " + (type || "success");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      els.toast.className = "toast";
    }, 3200);
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  }

  function toDateInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  }

  function academicBadgeClass(status) {
    return {
      Active: "badge-active",
      "On Probation": "badge-probation",
      Suspended: "badge-suspended",
      Graduated: "badge-graduated",
      Deferred: "badge-deferred"
    }[status] || "badge-neutral";
  }

  function tuitionBadgeClass(status) {
    return {
      Cleared: "badge-cleared",
      Partial: "badge-partial",
      Pending: "badge-pending"
    }[status] || "badge-neutral";
  }

  function renderStats(data) {
    els.totalCount.textContent = data.total;
    els.activeCount.textContent = data.active;
    els.tuitionClearedCount.textContent = data.tuitionCleared;
    els.programmeCount.textContent = data.programmes;
    els.departmentCount.textContent = data.departments;
    if (els.heroTotal) els.heroTotal.textContent = data.total;
  }

  function renderFilterOptions(select, label, values, current) {
    const selected = select.value;
    select.innerHTML = '<option value="">' + escapeHtml(label) + "</option>";
    values.sort((a, b) => a.localeCompare(b)).forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v; opt.textContent = v;
      select.appendChild(opt);
    });
    if (values.includes(selected)) select.value = selected;
  }

  function renderDatalist(datalist, values) {
    datalist.innerHTML = "";
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      datalist.appendChild(opt);
    });
  }

  function getPreferredTheme() {
    return localStorage.getItem("bugemadesk_theme") ||
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }

  function applyTheme(theme) {
    document.body.classList.toggle("dark-theme", theme === "dark");
    localStorage.setItem("bugemadesk_theme", theme);
    if (els.themeToggleBtn) {
      els.themeToggleBtn.textContent = theme === "dark" ? "☀" : "☾";
      els.themeToggleBtn.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
  }

  function toggleTheme() {
    applyTheme(document.body.classList.contains("dark-theme") ? "light" : "dark");
  }

  async function loadRecent() {
    try {
      const result = await api("/students?sort=createdAt:desc&limit=5&page=1");
      renderRecentStudents(result.data);
    } catch (error) {
      els.recentList.innerHTML = '<div class="recent-loading">Recent records unavailable.</div>';
    }
  }

  function renderRecentStudents(students) {
    if (!students || !students.length) {
      els.recentList.innerHTML = '<div class="recent-loading">No registrations yet.</div>';
      return;
    }
    els.recentList.innerHTML = students.map((s) => `
      <button class="recent-item" type="button" data-id="${escapeHtml(s._id)}" aria-label="View ${escapeHtml(s.fullName)}">
        <span class="avatar">${escapeHtml(initials(s.fullName))}</span>
        <span class="recent-info">
          <span class="recent-name">${escapeHtml(s.fullName)}</span>
          <span class="recent-sub">${escapeHtml(s.regNo)} · ${escapeHtml(s.programme)}</span>
        </span>
        <span class="badge ${academicBadgeClass(s.academicStatus)}">${escapeHtml(s.academicStatus)}</span>
      </button>
    `).join("");
  }

  async function loadChart() {
    try {
      const { data } = await api("/students/chart");
      renderProgrammeChart(data);
    } catch (error) {
      els.programmeChart.innerHTML = '<div class="chart-empty">Chart unavailable.</div>';
    }
  }

  function renderProgrammeChart(rows) {
    if (!rows || !rows.length) {
      els.programmeChart.innerHTML = '<div class="chart-empty">No programme data yet.</div>';
      return;
    }
    const max = Math.max(...rows.map(r => r.count), 1);
    els.programmeChart.innerHTML = rows.slice(0, 6).map((row) => {
      const pct = Math.round((row.count / max) * 100);
      return `
        <div class="chart-bar-row" title="${escapeHtml(row.programme)}: ${row.count} students">
          <span class="chart-label">${escapeHtml(row.programme)}</span>
          <span class="chart-track"><span class="chart-fill" style="width: ${pct}%"></span></span>
          <span class="chart-value">${row.count}</span>
        </div>`;
    }).join("");
  }

  function openCommand() {
    els.commandBackdrop.hidden = false;
    document.body.classList.add("modal-open");
    els.commandInput.value = "";
    commandIndex = 0;
    els.commandResults.innerHTML = '<div class="command-result"><span class="recent-loading">Loading…</span></div>';
    api("/students?sort=createdAt:desc&limit=50&page=1")
      .then((result) => { state.commandStudents = result.data; })
      .catch(() => { state.commandStudents = []; })
      .then(() => renderCommandResults(""));
    window.setTimeout(() => els.commandInput.focus(), 30);
  }

  function closeCommand() {
    els.commandBackdrop.hidden = true;
    if (els.formBackdrop.hidden && els.profileBackdrop.hidden && els.confirmBackdrop.hidden) document.body.classList.remove("modal-open");
  }

  function renderCommandResults(query) {
    const q = query.trim().toLowerCase();
    commandItems = [];

    const actions = [
      { label: "Register new student", sub: "Open registration form", icon: "＋", run: () => openForm() },
      { label: "Search records", sub: "Focus the search box", icon: "⌕", run: () => { closeCommand(); els.searchInput.focus(); } },
      { label: "Export CSV", sub: "Download filtered records", icon: "⇩", run: exportCsv },
      { label: "Print directory", sub: "Open print preview", icon: "⎙", run: printDirectory },
      { label: "Toggle dark theme", sub: "Switch appearance", icon: "☾", run: toggleTheme }
    ];
    actions.filter(a => !q || a.label.toLowerCase().includes(q)).forEach(a => {
      commandItems.push({ type: "action", label: a.label, sub: a.sub, icon: a.icon, run: a.run });
    });

    (state.commandStudents || []).filter(s => !q ||
      s.fullName.toLowerCase().includes(q) ||
      s.regNo.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)).slice(0, 6).forEach(s => {
      commandItems.push({ type: "student", label: s.fullName, sub: s.regNo + " · " + s.programme, run: () => { closeCommand(); showProfile(s); } });
    });

    if (!commandItems.length) {
      els.commandResults.innerHTML = '<div class="command-result"><span class="recent-loading">No matches found.</span></div>';
      return;
    }

    commandIndex = Math.min(commandIndex, commandItems.length - 1);
    els.commandResults.innerHTML = commandItems.map((item, i) => `
      <button class="command-result${i === commandIndex ? " active" : ""}" type="button" data-index="${i}">
        <span class="command-result-icon">${item.type === "student" ? escapeHtml(initials(item.label)) : escapeHtml(item.icon)}</span>
        <span class="command-result-body">
          <span class="command-result-name">${escapeHtml(item.label)}</span>
          <span class="command-result-sub">${escapeHtml(item.sub)}</span>
        </span>
        <span class="command-result-go">↵</span>
      </button>
    `).join("");
  }

  function moveCommand(delta) {
    if (!commandItems.length) return;
    commandIndex = (commandIndex + delta + commandItems.length) % commandItems.length;
    updateCommandActive();
  }

  function updateCommandActive() {
    const buttons = els.commandResults.querySelectorAll(".command-result");
    buttons.forEach((btn, i) => btn.classList.toggle("active", i === commandIndex));
    const active = buttons[commandIndex];
    if (active) active.scrollIntoView({ block: "nearest" });
  }

  function runCommand() {
    const item = commandItems[commandIndex];
    if (!item) return;
    closeCommand();
    item.run();
  }

  function setLoading(loading) {
    els.loadingBar.hidden = !loading;
    els.refreshBtn.disabled = loading;
  }

  function renderStudents(students) {
    if (!students.length) {
      els.studentRows.innerHTML = '<tr><td colspan="7" class="empty"><strong>No student records found</strong><span>Adjust your filters or register a new student.</span></td></tr>';
      return;
    }
    els.studentRows.innerHTML = students.map((student) => {
      const name = escapeHtml(student.fullName);
      return `
        <tr>
          <td>
            <div class="student-cell">
              <div class="avatar" aria-hidden="true">${escapeHtml(initials(student.fullName))}</div>
              <div class="student-identity">
                <div class="student-name">${name}</div>
                <div class="student-email">${escapeHtml(student.email)}</div>
              </div>
            </div>
          </td>
          <td><span class="id-text">${escapeHtml(student.regNo)}</span></td>
          <td>
            <span class="course-text">${escapeHtml(student.programme)}</span>
            <span class="muted-text">${escapeHtml(student.department)}</span>
          </td>
          <td>
            <span class="year-tag">Year ${escapeHtml(student.yearOfStudy)}</span>
            <span class="muted-text">${escapeHtml(student.semester)}</span>
          </td>
          <td><span class="badge ${academicBadgeClass(student.academicStatus)}">${escapeHtml(student.academicStatus)}</span></td>
          <td><span class="badge ${tuitionBadgeClass(student.tuitionStatus)}">${escapeHtml(student.tuitionStatus)}</span></td>
          <td>
            <div class="row-actions">
              <button class="row-btn" type="button" data-action="view" data-id="${escapeHtml(student._id)}" aria-label="View ${name}">View</button>
              <button class="row-btn" type="button" data-action="edit" data-id="${escapeHtml(student._id)}" aria-label="Edit ${name}">Edit</button>
              <button class="row-btn row-btn-danger" type="button" data-action="delete" data-id="${escapeHtml(student._id)}" aria-label="Delete ${name}">Delete</button>
            </div>
          </td>
        </tr>`;
    }).join("");
  }

  function renderPagination(pagination) {
    state.page = pagination.page;
    state.totalPages = Math.max(1, pagination.totalPages);
    state.total = pagination.total;
    els.recordCount.textContent = pagination.total + " record" + (pagination.total === 1 ? "" : "s");
    els.pageSummary.textContent = "Page " + pagination.page + " of " + state.totalPages;
    els.previousPage.disabled = pagination.page <= 1;
    els.nextPage.disabled = pagination.page >= state.totalPages;
    renderPageNumbers(pagination.page);
  }

  function renderPageNumbers(current) {
    const pages = [];
    for (let p = 1; p <= state.totalPages; p++) {
      if (p === 1 || p === state.totalPages || Math.abs(p - current) <= 1) pages.push(p);
    }
    els.pageNumbers.innerHTML = pages.map((p, i) => {
      const gap = i > 0 && p - pages[i-1] > 1;
      return (gap ? '<span class="page-gap">…</span>' : "") + `<button class="page-btn${p === current ? " active" : ""}" type="button" data-page="${p}">${p}</button>`;
    }).join("");
  }

  function openForm(student) {
    state.editingId = student ? student._id : null;
    els.studentForm.reset();
    els.formError.textContent = "";
    els.formError.hidden = true;
    els.formTitle.textContent = student ? "Edit student" : "Register student";
    els.formDescription.textContent = student ? "Update the student's academic details." : "Enter the student's academic details.";
    els.saveStudentLabel.textContent = student ? "Save changes" : "Save student";
    if (student) {
      const fields = ["fullName", "regNo", "gender", "dateOfBirth", "email", "phone", "nationality", "programme", "department", "yearOfStudy", "semester", "academicStatus", "tuitionStatus", "guardianName", "guardianPhone", "enrolledDate"];
      fields.forEach((key) => {
        const input = els.studentForm.elements[key];
        if (!input) return;
        if (key === "dateOfBirth" || key === "enrolledDate") input.value = toDateInput(student[key]);
        else input.value = student[key] == null ? "" : student[key];
      });
      els.studentForm.elements.yearOfStudy.value = String(student.yearOfStudy);
    } else {
      els.studentForm.elements.gender.value = "Male";
      els.studentForm.elements.nationality.value = "Ugandan";
      els.studentForm.elements.semester.value = "Semester I";
      els.studentForm.elements.academicStatus.value = "Active";
      els.studentForm.elements.tuitionStatus.value = "Pending";
      els.studentForm.elements.enrolledDate.value = new Date().toISOString().slice(0, 10);
    }
    els.formBackdrop.hidden = false;
    document.body.classList.add("modal-open");
    els.studentForm.elements.fullName.focus();
  }

  function closeForm() {
    els.formBackdrop.hidden = true;
    state.editingId = null;
    if (els.profileBackdrop.hidden && els.confirmBackdrop.hidden) document.body.classList.remove("modal-open");
  }

  function closeProfile() {
    els.profileBackdrop.hidden = true;
    state.currentStudent = null;
    if (els.formBackdrop.hidden && els.confirmBackdrop.hidden) document.body.classList.remove("modal-open");
  }

  function closeConfirm() {
    els.confirmBackdrop.hidden = true;
    state.pendingDeleteId = null;
    if (els.formBackdrop.hidden && els.profileBackdrop.hidden) document.body.classList.remove("modal-open");
  }

  async function loadCurrentUser() {
    try {
      const { user } = await api("/auth/me");
      els.userName.textContent = user.name;
      els.userRole.textContent = user.role;
      els.userAvatar.textContent = initials(user.name);
      els.heroName.textContent = (user.name || "").split(" ")[0] || "Registrar";
    } catch (error) {
      if (error.message !== "Session expired. Redirecting to sign in.") showToast(error.message, "error");
    }
  }

  function queryParams(includePaging = true) {
    const params = new URLSearchParams();
    const q = els.searchInput.value.trim();
    if (q) params.set("q", q);
    const programme = els.programmeFilter.value;
    if (programme) params.set("programme", programme);
    const department = els.departmentFilter.value;
    if (department) params.set("department", department);
    const year = els.yearFilter.value;
    if (year) params.set("yearOfStudy", year);
    const academic = els.academicStatusFilter.value;
    if (academic) params.set("academicStatus", academic);
    const tuition = els.tuitionStatusFilter.value;
    if (tuition) params.set("tuitionStatus", tuition);
    const [sortBy, order] = els.sortFilter.value.split(":");
    params.set("sortBy", sortBy);
    params.set("order", order);
    if (includePaging) {
      params.set("page", state.page);
      params.set("limit", PAGE_SIZE);
    }
    return params;
  }

  async function loadStudents() {
    const requestId = ++loadStudents.requestId;
    setLoading(true);
    try {
      const result = await api("/students?" + queryParams(true));
      if (requestId !== loadStudents.requestId) return;
      renderStudents(result.data);
      renderPagination(result.pagination);
    } catch (error) {
      if (requestId !== loadStudents.requestId) return;
      els.studentRows.innerHTML = '<tr><td colspan="7" class="empty error-state">' + escapeHtml(error.message) + '<span>Confirm MongoDB is running, then refresh.</span></td></tr>';
      showToast(error.message, "error");
    } finally {
      if (requestId === loadStudents.requestId) setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const { data } = await api("/students/stats");
      renderStats(data);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function loadHealth() {
    try {
      await api("/health");
      els.connectionText.textContent = "Database connected";
      els.sidebarConnection.textContent = "CONNECTED";
      els.heroConnection.textContent = "Database connected";
      els.connectionPill.classList.remove("offline");
      els.sidebarStatus.classList.remove("offline-dot");
    } catch (error) {
      els.connectionText.textContent = "Database unavailable";
      els.sidebarConnection.textContent = "OFFLINE";
      els.heroConnection.textContent = "Database offline";
      els.connectionPill.classList.add("offline");
      els.sidebarStatus.classList.add("offline-dot");
    }
  }

  async function loadOptions() {
    try {
      const { data } = await api("/students/options");
      state.programmeOptions = data.programmes || [];
      state.departmentOptions = data.departments || [];
      renderFilterOptions(els.programmeFilter, "All programmes", state.programmeOptions, "programme");
      renderFilterOptions(els.departmentFilter, "All departments", state.departmentOptions, "department");
      renderDatalist(els.programmeOptionsList, state.programmeOptions);
      renderDatalist(els.departmentOptionsList, state.departmentOptions);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function fetchAllStudents(baseParams) {
    const params = new URLSearchParams(baseParams);
    params.set("page", "1");
    params.set("limit", "200");
    const first = await api("/students?" + params);
    const all = first.data.slice();
    for (let page = 2; page <= first.pagination.totalPages; page++) {
      params.set("page", String(page));
      const result = await api("/students?" + params);
      all.push(...result.data);
    }
    return all;
  }

  function buildSlipHtml(student) {
    const generated = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short" }).format(new Date());
    const academicClass = academicBadgeClass(student.academicStatus);
    const tuitionClass = tuitionBadgeClass(student.tuitionStatus);
    return `
      <div class="slip-head">
        <img src="bugema-university-logo.jpg" alt="Bugema University">
        <p class="slip-university">BUGEMA UNIVERSITY</p>
        <h1>Student Registration Slip</h1>
        <p class="slip-subtitle">Campus Administration · Student Management System</p>
      </div>
      <div class="slip-title-row">
        <div>
          <p class="slip-label">Registration number</p>
          <p class="slip-regno">${escapeHtml(student.regNo)}</p>
        </div>
        <div class="slip-badges">
          <span class="badge ${academicClass}">${escapeHtml(student.academicStatus)}</span>
          <span class="badge ${tuitionClass}">Tuition: ${escapeHtml(student.tuitionStatus)}</span>
        </div>
      </div>
      <h2 class="slip-name">${escapeHtml(student.fullName)}</h2>
      <div class="slip-grid">
        ${slipField("Programme", student.programme)}
        ${slipField("Department", student.department)}
        ${slipField("Year of study", "Year " + student.yearOfStudy)}
        ${slipField("Semester", student.semester)}
        ${slipField("Date of birth", formatDate(student.dateOfBirth))}
        ${slipField("Nationality", student.nationality)}
        ${slipField("Email address", student.email)}
        ${slipField("Phone number", student.phone)}
        ${slipField("Guardian name", student.guardianName)}
        ${slipField("Guardian phone", student.guardianPhone)}
        ${slipField("Enrolled on", formatDate(student.enrolledDate))}
      </div>
      <div class="slip-guardian">
        <h3>Emergency guardian contact</h3>
        <div class="slip-grid">
          ${slipField("Guardian name", student.guardianName)}
          ${slipField("Guardian phone", student.guardianPhone)}
        </div>
      </div>
      <div class="slip-footer">
        <div class="slip-signature">Registrar's signature: ______________________</div>
        <div class="slip-signature">Date: ______________________</div>
      </div>
      <p class="slip-note">Generated by BugemaDesk on ${escapeHtml(generated)}. This slip is an official student verification record.</p>
    `;
  }

  function slipField(label, value) {
    return `<div class="slip-field"><span>${escapeHtml(label)}</span><strong>${value == null || value === "" ? "Not provided" : escapeHtml(value)}</strong></div>`;
  }

  function describeFilters() {
    const parts = [];
    const q = els.searchInput.value.trim();
    if (q) parts.push('Search: "' + q + '"');
    const programme = els.programmeFilter.value;
    if (programme) parts.push('Programme: ' + programme);
    const department = els.departmentFilter.value;
    if (department) parts.push('Department: ' + department);
    const year = els.yearFilter.value;
    if (year) parts.push('Year: ' + year);
    const academic = els.academicStatusFilter.value;
    if (academic) parts.push('Academic status: ' + academic);
    const tuition = els.tuitionStatusFilter.value;
    if (tuition) parts.push('Tuition status: ' + tuition);
    return parts.length ? parts.join(' · ') : "All student records";
  }

  function buildDirectoryHtml(students, filters) {
    const generated = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short" }).format(new Date());
    const rows = students.map((s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(s.regNo)}</td>
        <td>${escapeHtml(s.fullName)}</td>
        <td>${escapeHtml(s.programme)}</td>
        <td>${escapeHtml(s.department)}</td>
        <td>${escapeHtml(s.yearOfStudy)}</td>
        <td>${escapeHtml(s.semester)}</td>
        <td>${escapeHtml(s.academicStatus)}</td>
        <td>${escapeHtml(s.tuitionStatus)}</td>
      </tr>`).join("");
    return `
      <div class="print-head">
        <img src="bugema-university-logo.jpg" alt="Bugema University">
        <div>
          <p class="print-university">BUGEMA UNIVERSITY</p>
          <h1>Official Student Directory</h1>
          <p class="print-subtitle">Campus Administration · Student Management System</p>
        </div>
      </div>
      <div class="print-meta">
        <span>Generated: ${escapeHtml(generated)}</span>
        <span>Total records: ${students.length}</span>
      </div>
      <p class="print-filter">Filters applied: ${escapeHtml(filters)}</p>
      <table class="print-table">
        <thead><tr><th>#</th><th>Reg No</th><th>Full name</th><th>Programme</th><th>Department</th><th>Year</th><th>Semester</th><th>Academic status</th><th>Tuition</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="print-footer">
        <div class="print-signature">Registrar's signature: ______________________</div>
        <div class="print-signature">Official stamp: ______________________</div>
        <div class="print-signature">Date: ______________________</div>
      </div>
      <p class="print-note">This directory was generated from the BugemaDesk student records database and reflects the records available at the time of printing.</p>
    `;
  }

  async function exportCsv() {
    try {
      const params = queryParams(false);
      params.set("page", "1");
      params.set("limit", "200");
      const first = await api("/students?" + params);
      const all = first.data.slice();
      for (let page = 2; page <= first.pagination.totalPages; page++) {
        params.set("page", String(page));
        const result = await api("/students?" + params);
        all.push(...result.data);
      }
      const columns = [
        { label: "Registration No", value: s => s.regNo },
        { label: "Full Name", value: s => s.fullName },
        { label: "Gender", value: s => s.gender },
        { label: "Date of Birth", value: s => toDateInput(s.dateOfBirth) },
        { label: "Email", value: s => s.email },
        { label: "Phone", value: s => s.phone },
        { label: "Nationality", value: s => s.nationality },
        { label: "Programme", value: s => s.programme },
        { label: "Department", value: s => s.department },
        { label: "Year of Study", value: s => s.yearOfStudy },
        { label: "Semester", value: s => s.semester },
        { label: "Academic Status", value: s => s.academicStatus },
        { label: "Tuition Status", value: s => s.tuitionStatus },
        { label: "Guardian Name", value: s => s.guardianName },
        { label: "Guardian Phone", value: s => s.guardianPhone },
        { label: "Enrolled Date", value: s => toDateInput(s.enrolledDate) }
      ];
      const header = columns.map((c) => `"${c.label}"`).join(",");
      const rows = all.map((student) => columns.map((col) => {
        let value = col.value(student);
        let text = value == null ? "" : String(value);
        if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
      }).join(","));
      const csv = [header, ...rows].join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "student-records-" + new Date().toISOString().slice(0, 10) + ".csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(all.length + " student record" + (all.length === 1 ? "" : "s") + " exported.");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function exportJson() {
    try {
      const params = queryParams(false);
      params.set("page", "1");
      params.set("limit", "200");
      const first = await api("/students?" + params);
      const all = first.data.slice();
      for (let page = 2; page <= first.pagination.totalPages; page++) {
        params.set("page", String(page));
        const result = await api("/students?" + params);
        all.push(...result.data);
      }
      const payload = {
        system: "BugemaDesk Student Management System",
        exportedAt: new Date().toISOString(),
        filters: describeFilters(),
        count: all.length,
        students: all
      };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "student-records-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(all.length + " student record" + (all.length === 1 ? "" : "s") + " exported.");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function init() {
    if (!getToken()) {
      redirectToLogin();
      return;
    }
    applyTheme(getPreferredTheme());
    wireEvents();
    loadCurrentUser();
    loadHealth();
    loadStats();
    loadOptions();
    loadStudents();
    loadRecent();
    loadChart();
  }

  async function getStudent(id) {
    const response = await api("/students/" + encodeURIComponent(id));
    return response.data;
  }

  function showProfile(student) {
    state.currentStudent = student;
    els.profileTitle.textContent = student.fullName;
    els.profileRegNo.textContent = student.regNo;
    els.profileAvatar.textContent = initials(student.fullName);
    els.profileAcademicBadge.textContent = student.academicStatus;
    els.profileAcademicBadge.className = "badge " + academicBadgeClass(student.academicStatus);
    els.profileTuitionBadge.textContent = student.tuitionStatus;
    els.profileTuitionBadge.className = "badge " + tuitionBadgeClass(student.tuitionStatus);
    els.profileGrid.innerHTML = profileFields(student).map(([label, value]) => `
      <div class="profile-field">
        <dt>${escapeHtml(label)}</dt>
        <dd>${value == null || value === "" ? "Not provided" : escapeHtml(value)}</dd>
      </div>
    `).join("");
    els.profileBackdrop.hidden = false;
    document.body.classList.add("modal-open");
    els.closeProfileBtn.focus();
  }

  function profileFields(student) {
    return [
      ["Registration number", student.regNo],
      ["Email address", student.email],
      ["Phone number", student.phone],
      ["Gender", student.gender],
      ["Nationality", student.nationality],
      ["Programme", student.programme],
      ["Department", student.department],
      ["Year of study", "Year " + student.yearOfStudy],
      ["Semester", student.semester],
      ["Academic status", student.academicStatus],
      ["Tuition status", student.tuitionStatus],
      ["Enrolled on", formatDate(student.enrolledDate)],
      ["Guardian name", student.guardianName],
      ["Guardian phone", student.guardianPhone]
    ];
  }

  async function printDirectory() {
    els.printDirectoryBtn.disabled = true;
    try {
      const students = await fetchAllStudents(queryParams(false));
      if (!students.length) { showToast("There are no records to print.", "error"); return; }
      els.printDirectory.innerHTML = buildDirectoryHtml(students, describeFilters());
      document.body.classList.add("printing-directory");
      window.setTimeout(() => window.print(), 60);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      els.printDirectoryBtn.disabled = false;
    }
  }

  async function printSlip() {
    const student = state.currentStudent;
    if (!student) return;
    els.printSlip.innerHTML = buildSlipHtml(student);
    document.body.classList.add("printing-slip");
    window.setTimeout(() => window.print(), 60);
  }

  function wireEvents() {
    function setSidebarOpen(open) {
      els.sidebar.classList.toggle("is-open", open);
      els.sidebarScrim.hidden = !open;
      els.menuBtn.setAttribute("aria-expanded", String(open));
      els.menuBtn.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      document.body.classList.toggle("navigation-open", open);
      if (open) {
        const firstLink = els.sidebar.querySelector(".nav-link");
        if (firstLink) firstLink.focus();
      } else {
        els.menuBtn.focus();
      }
    }

    els.logoutBtn.addEventListener("click", function () {
      clearAuth();
      redirectToLogin();
    });

    els.menuBtn.addEventListener("click", function () {
      setSidebarOpen(!els.sidebar.classList.contains("is-open"));
    });

    els.sidebarScrim.addEventListener("click", () => setSidebarOpen(false));

    els.sidebar.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        setSidebarOpen(false);
      });
    });

    els.addStudentBtn.addEventListener("click", () => openForm());

    els.closeFormBtn.addEventListener("click", closeForm);
    els.cancelBtn.addEventListener("click", closeForm);
    els.closeProfileBtn.addEventListener("click", closeProfile);
    els.profileDoneBtn.addEventListener("click", closeProfile);
    els.closeConfirmBtn.addEventListener("click", closeConfirm);
    els.cancelDeleteBtn.addEventListener("click", closeConfirm);
    els.profileBackdrop.addEventListener("click", function (event) {
      if (event.target === els.profileBackdrop) closeProfile();
    });
    els.formBackdrop.addEventListener("click", function (event) {
      if (event.target === els.formBackdrop) closeForm();
    });
    els.confirmBackdrop.addEventListener("click", function (event) {
      if (event.target === els.confirmBackdrop) closeConfirm();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        if (els.sidebar.classList.contains("is-open")) setSidebarOpen(false);
        if (!els.formBackdrop.hidden) closeForm();
        else if (!els.profileBackdrop.hidden) closeProfile();
        else if (!els.confirmBackdrop.hidden) closeConfirm();
      }
    });

    els.refreshBtn.addEventListener("click", async function () {
      await Promise.all([loadStats(), loadOptions(), loadStudents()]);
    });

    els.clearFiltersBtn.addEventListener("click", function () {
      els.searchInput.value = "";
      els.programmeFilter.value = "";
      els.departmentFilter.value = "";
      els.yearFilter.value = "";
      els.academicStatusFilter.value = "";
      els.tuitionStatusFilter.value = "";
      state.page = 1;
      loadStudents();
    });

    els.previousPage.addEventListener("click", function () {
      if (state.page > 1) { state.page -= 1; loadStudents(); }
    });

    els.nextPage.addEventListener("click", function () {
      if (state.page < state.totalPages) { state.page += 1; loadStudents(); }
    });

    els.pageNumbers.addEventListener("click", function (event) {
      const btn = event.target.closest("button[data-page]");
      if (btn) {
        const page = Number(btn.dataset.page);
        if (page && page !== state.page) { state.page = page; loadStudents(); }
      }
    });

    let searchTimer;
    els.searchInput.addEventListener("input", function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { state.page = 1; loadStudents(); }, 250);
    });

    for (const id of ["programmeFilter", "departmentFilter", "yearFilter", "academicStatusFilter", "tuitionStatusFilter", "sortFilter"]) {
      document.getElementById(id).addEventListener("change", function () { state.page = 1; loadStudents(); });
    }

    els.studentForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      els.formError.textContent = "";
      els.formError.hidden = true;
      if (!els.studentForm.reportValidity()) return;
      const wasEditing = Boolean(state.editingId);
      const url = wasEditing ? "/students/" + encodeURIComponent(state.editingId) : "/students";
      const formData = new FormData(els.studentForm);
      const payload = {};
      formData.forEach((value, key) => { payload[key] = value; });
      payload.yearOfStudy = Number(payload.yearOfStudy);
      payload.dateOfBirth = payload.dateOfBirth || null;
      payload.enrolledDate = payload.enrolledDate || new Date().toISOString().slice(0, 10);
      els.saveStudentBtn.disabled = true;
      const originalLabel = els.saveStudentLabel.textContent;
      els.saveStudentLabel.textContent = "Saving…";
      try {
        await api(url, { method: wasEditing ? "PUT" : "POST", body: JSON.stringify(payload) });
        closeForm();
        showToast(wasEditing ? "Student updated successfully." : "Student registered successfully.");
        state.page = 1;
        await Promise.all([loadStudents(), loadStats(), loadOptions(), loadRecent(), loadChart()]);
      } catch (error) {
        els.formError.textContent = error.message;
        els.formError.hidden = false;
        showToast(error.message, "error");
      } finally {
        els.saveStudentBtn.disabled = false;
        els.saveStudentLabel.textContent = originalLabel;
      }
    });

    els.studentRows.addEventListener("click", async function (event) {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const { action, id } = button.dataset;
      if (action === "delete") {
        try {
          openConfirm(await getStudent(id));
        } catch (error) {
          showToast(error.message, "error");
        }
        return;
      }
      try {
        const student = await getStudent(id);
        if (action === "edit") openForm(student);
        if (action === "view") showProfile(student);
      } catch (error) {
        showToast(error.message, "error");
      }
    });

    els.recentList.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-id]");
      if (button) {
        const id = button.dataset.id;
        getStudent(id).then(showProfile).catch((error) => showToast(error.message, "error"));
      }
    });

    els.recentViewAllBtn.addEventListener("click", function () {
      els.searchInput.value = "";
      els.programmeFilter.value = "";
      els.departmentFilter.value = "";
      els.yearFilter.value = "";
      els.academicStatusFilter.value = "";
      els.tuitionStatusFilter.value = "";
      els.sortFilter.value = "createdAt:desc";
      state.page = 1;
      loadStudents();
      document.getElementById("students").scrollIntoView({ behavior: "smooth" });
    });

    els.heroAddBtn.addEventListener("click", () => openForm());
    els.heroSearchBtn.addEventListener("click", () => els.searchInput.focus());
    els.heroPrintBtn.addEventListener("click", printDirectory);

    els.themeToggleBtn.addEventListener("click", toggleTheme);

    els.commandBackdrop.addEventListener("click", function (event) {
      if (event.target === els.commandBackdrop) closeCommand();
    });

    els.commandInput.addEventListener("input", function () {
      renderCommandResults(this.value);
      commandIndex = 0;
    });

    els.commandInput.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveCommand(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveCommand(-1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        runCommand();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        if (!els.commandBackdrop.hidden) { closeCommand(); return; }
        if (!els.formBackdrop.hidden) closeForm();
        else if (!els.profileBackdrop.hidden) closeProfile();
        else if (!els.confirmBackdrop.hidden) closeConfirm();
      }
      if (event.ctrlKey && event.key === "k") {
        event.preventDefault();
        if (els.commandBackdrop.hidden) openCommand(); else closeCommand();
      }
    });

    function openConfirm(student) {
      state.pendingDeleteId = student._id;
      els.confirmMessage.textContent = 'Delete the record for "' + student.fullName + '" (' + student.regNo + ')? This cannot be undone.';
      els.confirmBackdrop.hidden = false;
      document.body.classList.add("modal-open");
      els.cancelDeleteBtn.focus();
    }

    async function deleteStudent() {
      if (!state.pendingDeleteId) return;
      els.confirmDeleteBtn.disabled = true;
      els.confirmDeleteBtn.textContent = "Deleting…";
      try {
        await api("/students/" + encodeURIComponent(state.pendingDeleteId), { method: "DELETE" });
        closeConfirm();
        showToast("Student record deleted.");
        await Promise.all([loadStudents(), loadStats(), loadOptions(), loadRecent(), loadChart()]);
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        els.confirmDeleteBtn.disabled = false;
        els.confirmDeleteBtn.textContent = "Delete record";
      }
    }

    els.printDirectoryBtn.addEventListener("click", printDirectory);
    els.exportCsvBtn.addEventListener("click", exportCsv);
    els.exportJsonBtn.addEventListener("click", exportJson);
    els.confirmDeleteBtn.addEventListener("click", deleteStudent);

    els.editProfileBtn.addEventListener("click", function () {
      const student = state.currentStudent;
      closeProfile();
      if (student) openForm(student);
    });
    els.printSlipBtn.addEventListener("click", printSlip);
  }

  window.addEventListener("afterprint", function () {
    document.body.classList.remove("printing-slip", "printing-directory");
    els.printDirectory.innerHTML = "";
    els.printSlip.innerHTML = "";
  });

  loadStudents.requestId = 0;

  init();
})();
