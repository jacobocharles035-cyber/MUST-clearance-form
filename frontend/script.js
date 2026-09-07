/* ==========================================================================
   MUST Student Clearance System - Integrated Frontend & Backend Script
   ========================================================================== */

const API_BASE_URL = 'https://must-clearance-backend.onrender.com/';

document.addEventListener('DOMContentLoaded', () => {

  // 1. MOBILE MENU TOGGLE
  const menuToggleBtn = document.getElementById('menuToggleBtn');
  const sidebar = document.getElementById('sidebar');
  if (menuToggleBtn && sidebar) {
    menuToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('show');
    });
  }

  // 2. LOGIN LOGIC
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const role = document.getElementById('role').value;
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;

      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, role })
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('userToken', data.token);
          localStorage.setItem('userRole', data.role);
          localStorage.setItem('username', data.username);

          if (role === 'student') window.location.href = 'student-dashboard.html';
          else if (role === 'staff') window.location.href = 'staff-dashboard.html';
          else if (role === 'admin') window.location.href = 'admin-dashboard.html';
        } else {
          alert(data.message || 'Login imeshindikana!');
        }
      } catch (error) {
        alert('Imeshindwa kuwasiliana na backend server. Hakikisha backend inarun!');
      }
    });
  }

  // 3. ONYESHA TAARIFA ZA MTUMIAJI KATIKA HEADER
  const savedUsername = localStorage.getItem('username') || 'Mtumiaji';
  const currentUserEl = document.getElementById('currentUsername');
  const currentRegNoEl = document.getElementById('currentRegNo');
  
  if (currentUserEl) currentUserEl.innerText = savedUsername;
  if (currentRegNoEl) currentRegNoEl.innerText = savedUsername;

  // 4. KUTUMA FOMU YA CLEARANCE YA MWANAFUNZI
  const clearanceForm = document.getElementById('clearanceForm');
  if (clearanceForm) {
    const studentRegNoInput = document.getElementById('studentRegNo');
    if (studentRegNoInput && !studentRegNoInput.value) {
      studentRegNoInput.value = savedUsername;
    }

    clearanceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const bodyData = {
        studentName: document.getElementById('studentName').value.trim(),
        studentRegNo: document.getElementById('studentRegNo').value.trim(),
        academicProgram: document.getElementById('academicProgram').value.trim(),
        academicYear: document.getElementById('academicYear').value.trim()
      };

      try {
        const response = await fetch(`${API_BASE_URL}/clearance/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });

        const data = await response.json();
        if (response.ok) {
          alert(data.message);
          window.location.href = 'student-dashboard.html';
        } else {
          alert(data.message || 'Kuna tatizo limetokea wakati wa kutuma maombi.');
        }
      } catch (error) {
        alert('Server ya backend haipatikani au haijawashwa.');
      }
    });
  }

  // 5. INAPAKIA DASHBOARDS SOHIHI TEGEMEANA NA UKURASA UNAPOFUNGUKA
  loadStudentDashboard();
  loadStaffDashboard();
  loadAdminDashboard();
});

// A. Kupakia Taarifa za Dashboard ya Mwanafunzi kutoka MongoDB
async function loadStudentDashboard() {
  const clearanceTable = document.getElementById('clearanceTable');
  if (!clearanceTable) return;

  const regNo = localStorage.getItem('username');
  if (!regNo) return;

  try {
    const response = await fetch(`${API_BASE_URL}/clearance/student/${regNo}`);
    
    if (response.status === 404) {
      clearanceTable.innerHTML = `<tr><td colspan="3" style="text-align:center;">Bado hujatuma maombi ya clearance. Tafadhali nenda kwenye tab ya <strong>"Tuma Maombi"</strong>.</td></tr>`;
      return;
    }

    const data = await response.json();

    if (data && data.departments) {
      clearanceTable.innerHTML = data.departments.map(d => `
        <tr>
          <td>${d.name}</td>
          <td>${d.remarks || '-'}</td>
          <td><span class="badge badge-${d.status}">${d.status}</span></td>
        </tr>
      `).join('');

      const approvedCount = data.departments.filter(d => d.status === 'approved').length;
      const percentage = Math.round((approvedCount / data.departments.length) * 100);
      
      const progressText = document.getElementById('progressText');
      const progressBar = document.getElementById('progressBar');
      if (progressText) progressText.innerText = `${approvedCount} / ${data.departments.length} Idara (${percentage}%)`;
      if (progressBar) progressBar.style.width = `${percentage}%`;
    }

  } catch (error) {
    console.error('Error fetching student clearance:', error);
  }
}

// B. Kupakia Orodha ya Maombi ya Mwanafunzi kwa Ajili ya Staff
async function loadStaffDashboard() {
  const table = document.getElementById('staffRequestsTable');
  if (!table) return;

  try {
    const response = await fetch(`${API_BASE_URL}/clearance/admin/all`);
    const students = await response.json();

    if (!students || students.length === 0) {
      table.innerHTML = `<tr><td colspan="5" style="text-align:center;">Hakuna maombi ya wanafunzi yaliyopatikana.</td></tr>`;
      return;
    }

    table.innerHTML = students.map((s) => `
      <tr>
        <td>${s.studentRegNo}</td>
        <td>${s.studentName}</td>
        <td>${s.academicProgram}</td>
        <td><span class="badge badge-${s.overallStatus === 'Cleared' ? 'approved' : 'pending'}">${s.overallStatus || 'Pending'}</span></td>
        <td>
          <button class="btn btn-success" style="width: auto; padding: 0.3rem 0.6rem; margin-right: 5px;" onclick="updateDeptStatus('${s.studentRegNo}', 'approved')">Approve</button>
          <button class="btn btn-danger" style="width: auto; padding: 0.3rem 0.6rem;" onclick="updateDeptStatus('${s.studentRegNo}', 'rejected')">Reject</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading staff requests:', error);
  }
}

// Action za Staff kubadilisha status
async function updateDeptStatus(regNo, status) {
  const deptSelect = document.getElementById('staffDeptSelect');
  const departmentName = deptSelect ? deptSelect.value : "Bursar / Finance";

  let remarks = "Yote yako sawa.";
  if (status === 'rejected') {
    remarks = prompt("Ingiza sababu ya kukataa ombi hili:") || "Kuna matatizo kwenye stakabadhi/nyaraka.";
  }

  try {
    const response = await fetch(`${API_BASE_URL}/clearance/staff/action`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentRegNo: regNo, departmentName, status, remarks })
    });

    const data = await response.json();
    alert(data.message);
    loadStaffDashboard();
  } catch (error) {
    alert('Imeshindwa kubadilisha status ya mwanafunzi.');
  }
}

// C. Kupakia Taarifa za Dashboard ya Admin
async function loadAdminDashboard() {
  const table = document.getElementById('adminStudentsTable');
  if (!table) return;

  try {
    const response = await fetch(`${API_BASE_URL}/clearance/admin/all`);
    const students = await response.json();

    document.getElementById('totalStudentsCount').innerText = students.length;
    document.getElementById('clearedCount').innerText = students.filter(s => s.overallStatus === 'Cleared').length;
    document.getElementById('pendingCount').innerText = students.filter(s => s.overallStatus !== 'Cleared').length;

    table.innerHTML = students.map(s => {
      const completedCount = s.departments ? s.departments.filter(d => d.status === 'approved').length : 0;
      const totalDepts = s.departments ? s.departments.length : 6;

      return `
        <tr>
          <td>${s.studentRegNo}</td>
          <td>${s.studentName}</td>
          <td>${s.academicProgram}</td>
          <td>${completedCount} / ${totalDepts}</td>
          <td><span class="badge badge-${s.overallStatus === 'Cleared' ? 'approved' : 'pending'}">${s.overallStatus || 'Pending'}</span></td>
          <td>
            ${s.overallStatus === 'Cleared' 
              ? `<button class="btn btn-success" style="width: auto; padding: 0.3rem 0.6rem;" onclick="generateCertificate('${s.studentName}')">Pakua Cheti (PDF)</button>`
              : `<button class="btn" style="width: auto; padding: 0.3rem 0.6rem;" disabled>Inasubiri</button>`
            }
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
  }
}

function generateCertificate(studentName) {
  alert(`Inapakua Clearance Certificate ya ${studentName}...`);
}

function logout(event) {
  if (event) event.preventDefault();
  localStorage.clear();
  window.location.href = 'index.html';
}