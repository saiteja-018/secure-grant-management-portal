// Client State
let currentUser = null;
let currentToken = localStorage.getItem('grant_portal_token') || null;
let authMode = 'login'; // 'login' or 'register'
let currentSelectedGrantId = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupAuthListeners();

  // Check URL params for OAuth redirect token
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');
  if (tokenFromUrl) {
    currentToken = tokenFromUrl;
    localStorage.setItem('grant_portal_token', currentToken);
    window.history.replaceState({}, document.title, window.location.pathname);
    showToast('Signed in via OAuth 2.0 successfully!', 'success');
  }

  if (currentToken) {
    await fetchUserProfile();
  } else {
    updateUIState();
  }

  await loadGrants();
});

// Setup Navigation Tabs
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetTabId = tab.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      const activeContent = document.getElementById(targetTabId);
      if (activeContent) {
        activeContent.classList.add('active');
      }

      // Lazy load tab data
      if (targetTabId === 'tabGranteeApps') loadMyApplications();
      if (targetTabId === 'tabGrantorManage') loadGrantorStudio();
      if (targetTabId === 'tabAdminConsole') loadAdminUsers();
      if (targetTabId === 'tabTokenInspector') updateTokenInspector();
    });
  });
}

// Setup Auth Listeners
function setupAuthListeners() {
  document.getElementById('btnOpenLogin').addEventListener('click', () => {
    switchAuthMode('login');
    openModal('authModal');
  });

  document.getElementById('btnOpenRegister').addEventListener('click', () => {
    switchAuthMode('register');
    openModal('authModal');
  });

  document.getElementById('btnLogout').addEventListener('click', logout);
}

function switchAuthMode(mode) {
  authMode = mode;
  const loginTab = document.getElementById('authTabLogin');
  const regTab = document.getElementById('authTabRegister');
  const nameGroup = document.getElementById('registerNameGroup');
  const submitBtn = document.getElementById('authSubmitBtn');

  if (mode === 'login') {
    loginTab.classList.add('active');
    regTab.classList.remove('active');
    nameGroup.classList.add('hidden');
    submitBtn.textContent = 'Sign In';
  } else {
    regTab.classList.add('active');
    loginTab.classList.remove('active');
    nameGroup.classList.remove('hidden');
    submitBtn.textContent = 'Create Account';
  }
}

// Auth Submit
async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const name = document.getElementById('authName').value.trim();

  try {
    if (authMode === 'register') {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      showToast('Account created! Signing you in...', 'success');
      // Automatic login after register
      await performLogin(email, password);
    } else {
      await performLogin(email, password);
    }
    closeModal('authModal');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function performLogin(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Authentication failed');

  currentToken = data.accessToken;
  localStorage.setItem('grant_portal_token', currentToken);
  await fetchUserProfile();
  showToast('Signed in successfully!', 'success');
  loadGrants();
}

async function fetchUserProfile() {
  if (!currentToken) return;
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (!res.ok) {
      // Token expired or invalid
      logout();
      return;
    }
    currentUser = await res.json();
    updateUIState();
  } catch (err) {
    logout();
  }
}

function logout() {
  currentUser = null;
  currentToken = null;
  localStorage.removeItem('grant_portal_token');
  updateUIState();
  showToast('You have been signed out.', 'info');
}

// Update UI State based on User & Roles
function updateUIState() {
  const guestActions = document.getElementById('guestActions');
  const authUserInfo = document.getElementById('authUserInfo');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const userAvatar = document.getElementById('userAvatar');
  const userRoleBadges = document.getElementById('userRoleBadges');

  if (currentUser) {
    guestActions.classList.add('hidden');
    authUserInfo.classList.remove('hidden');
    userNameDisplay.textContent = currentUser.name || currentUser.email;
    userAvatar.textContent = (currentUser.name || currentUser.email).charAt(0).toUpperCase();

    userRoleBadges.innerHTML = (currentUser.roles || []).map(r => {
      let tagClass = 'grantee-tag';
      if (r === 'ADMIN') tagClass = 'admin-tag';
      if (r === 'GRANTOR') tagClass = 'grantor-tag';
      return `<span class="role-tag ${tagClass}">${r}</span>`;
    }).join('');
  } else {
    guestActions.classList.remove('hidden');
    authUserInfo.classList.add('hidden');
  }

  updateTokenInspector();
}

// Quick Switcher Logins
async function quickLogin(email, password) {
  try {
    await performLogin(email, password);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function quickLoginDemoGrantor() {
  try {
    // Attempt login, if not exists, create via mock or register
    try {
      await performLogin('grantor@foundation.org', 'GrantorSecret123!');
    } catch (e) {
      // Register grantor
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Apex Foundation',
          email: 'grantor@foundation.org',
          password: 'GrantorSecret123!'
        })
      });
      // Login as admin to promote
      const adminRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@grantportal.io', password: 'AdminPassword123!' })
      });
      const adminData = await adminRes.json();
      // Get user id
      const usersRes = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${adminData.accessToken}` }
      });
      const users = await usersRes.json();
      const targetUser = users.find(u => u.email === 'grantor@foundation.org');
      if (targetUser) {
        await fetch(`/api/users/${targetUser.id}/roles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminData.accessToken}`
          },
          body: JSON.stringify({ roleName: 'GRANTOR' })
        });
      }
      await performLogin('grantor@foundation.org', 'GrantorSecret123!');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function quickLoginDemoGrantee() {
  try {
    try {
      await performLogin('grantee@research.edu', 'GranteeSecret123!');
    } catch (e) {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Institute of Bioscience',
          email: 'grantee@research.edu',
          password: 'GranteeSecret123!'
        })
      });
      await performLogin('grantee@research.edu', 'GranteeSecret123!');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function simulateGoogleOAuth() {
  try {
    const mockCode = 'mock_code_researcher_' + Math.floor(Math.random() * 1000);
    const res = await fetch(`/api/auth/google/callback?code=${mockCode}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Mock OAuth failed');

    currentToken = data.accessToken;
    localStorage.setItem('grant_portal_token', currentToken);
    await fetchUserProfile();
    closeModal('authModal');
    showToast(`Signed in via Google OAuth 2.0 as ${data.user.email}!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Grants Catalog
async function loadGrants() {
  const container = document.getElementById('grantsListContainer');
  container.innerHTML = '<p class="section-desc">Loading available grants...</p>';

  try {
    const headers = {};
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const res = await fetch('/api/grants', { headers });
    if (!res.ok) {
      if (res.status === 401) {
        container.innerHTML = `
          <div class="card glass-card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <p style="color: var(--text-muted); margin-bottom: 16px;">Please sign in to browse institutional grants and submit applications.</p>
            <button class="btn btn-primary" onclick="openModal('authModal')">Sign In / Register</button>
          </div>
        `;
        return;
      }
      throw new Error('Failed to load grants');
    }

    const grants = await res.json();
    if (grants.length === 0) {
      container.innerHTML = `
        <div class="card glass-card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
          <p style="color: var(--text-muted);">No grant opportunities published yet. Switch to a <strong>GRANTOR</strong> account to post one!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = grants.map(grant => `
      <div class="card glass-card grant-card">
        <div class="grant-card-top">
          <span class="grant-amount-pill">$${Number(grant.amount).toLocaleString()} USD</span>
          <h3 class="grant-title">${escapeHtml(grant.title)}</h3>
          <p class="grant-desc">${escapeHtml(grant.description)}</p>
        </div>
        <div class="grant-card-footer">
          <div>
            <span class="grantor-label">Provided by</span>
            <div style="font-size: 0.85rem; font-weight: 600;">${escapeHtml(grant.grantor_name || 'Organization')}</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openApplyModal('${grant.id}', '${escapeHtml(grant.title)}')">
            Apply Now
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color: var(--accent-rose);">${err.message}</p>`;
  }
}

// Apply for Grant
function openApplyModal(grantId, grantTitle) {
  if (!currentToken) {
    showToast('Please sign in to submit a proposal', 'error');
    openModal('authModal');
    return;
  }
  document.getElementById('applyGrantId').value = grantId;
  document.getElementById('applyModalTitle').textContent = `Apply for: ${grantTitle}`;
  document.getElementById('applyProposal').value = '';
  openModal('applyModal');
}

async function handleApplySubmit(e) {
  e.preventDefault();
  const grantId = document.getElementById('applyGrantId').value;
  const proposal = document.getElementById('applyProposal').value;

  try {
    const res = await fetch(`/api/grants/${grantId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ proposal })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Submission failed');

    closeModal('applyModal');
    showToast('Application submitted successfully!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Grantee Applications Tab
async function loadMyApplications() {
  const container = document.getElementById('granteeAppsList');
  if (!currentToken) {
    container.innerHTML = '<p class="section-desc">Please sign in as a GRANTEE to view your submissions.</p>';
    return;
  }

  try {
    const res = await fetch('/api/applications/my', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (!res.ok) throw new Error('Could not load your submissions');

    const apps = await res.json();
    if (apps.length === 0) {
      container.innerHTML = '<p class="section-desc">You have not submitted any proposals yet.</p>';
      return;
    }

    container.innerHTML = apps.map(app => `
      <div class="card glass-card compact-item" style="margin-bottom: 12px;">
        <div>
          <h4 style="color: #fff; margin-bottom: 4px;">${escapeHtml(app.grant_title)}</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(app.proposal.substring(0, 140))}...</p>
          <span style="font-size: 0.75rem; color: var(--text-dim);">Submitted on ${new Date(app.created_at).toLocaleDateString()}</span>
        </div>
        <span class="status-badge status-${app.status}">${app.status}</span>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color: var(--accent-rose);">${err.message}</p>`;
  }
}

// Grantor Studio
async function loadGrantorStudio() {
  const grantsContainer = document.getElementById('grantorGrantsList');
  if (!currentToken) {
    grantsContainer.innerHTML = '<p class="section-desc">Please sign in with a GRANTOR account.</p>';
    return;
  }

  try {
    const res = await fetch('/api/grants', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (!res.ok) throw new Error('Failed to load grants');

    const grants = await res.json();
    // Filter grants owned by this user
    const myGrants = grants.filter(g => currentUser && g.grantor_id === currentUser.id);

    if (myGrants.length === 0) {
      grantsContainer.innerHTML = '<p class="section-desc">You haven\'t published any grants yet.</p>';
      return;
    }

    grantsContainer.innerHTML = myGrants.map(grant => `
      <div class="compact-item" style="cursor: pointer;" onclick="selectGrantForReviews('${grant.id}', '${escapeHtml(grant.title)}')">
        <div>
          <strong style="color: #fff; display: block;">${escapeHtml(grant.title)}</strong>
          <span style="font-size: 0.8rem; color: var(--accent-emerald);">$${Number(grant.amount).toLocaleString()}</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); editGrant('${grant.id}', '${escapeHtml(grant.title)}', '${grant.amount}', '${escapeHtml(grant.description)}')">Edit</button>
          <button class="btn btn-ghost btn-sm" style="color: var(--accent-rose);" onclick="event.stopPropagation(); deleteGrant('${grant.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    grantsContainer.innerHTML = `<p style="color: var(--accent-rose);">${err.message}</p>`;
  }
}

function openCreateGrantModal() {
  if (!currentToken || !currentUser?.roles?.includes('GRANTOR')) {
    showToast('Only GRANTOR users can publish grant opportunities', 'error');
    return;
  }
  document.getElementById('editGrantId').value = '';
  document.getElementById('grantModalTitle').textContent = 'Create Grant Opportunity';
  document.getElementById('btnSaveGrant').textContent = 'Publish Grant';
  document.getElementById('grantTitleInput').value = '';
  document.getElementById('grantAmountInput').value = '';
  document.getElementById('grantDescInput').value = '';
  openModal('grantModal');
}

function editGrant(id, title, amount, desc) {
  document.getElementById('editGrantId').value = id;
  document.getElementById('grantModalTitle').textContent = 'Edit Grant Opportunity';
  document.getElementById('btnSaveGrant').textContent = 'Update Grant';
  document.getElementById('grantTitleInput').value = title;
  document.getElementById('grantAmountInput').value = amount;
  document.getElementById('grantDescInput').value = desc;
  openModal('grantModal');
}

async function handleGrantSubmit(e) {
  e.preventDefault();
  const grantId = document.getElementById('editGrantId').value;
  const title = document.getElementById('grantTitleInput').value.trim();
  const amount = document.getElementById('grantAmountInput').value;
  const description = document.getElementById('grantDescInput').value.trim();

  try {
    const method = grantId ? 'PUT' : 'POST';
    const endpoint = grantId ? `/api/grants/${grantId}` : '/api/grants';

    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ title, amount, description })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save grant');

    closeModal('grantModal');
    showToast(grantId ? 'Grant updated successfully!' : 'Grant published successfully!', 'success');
    loadGrants();
    loadGrantorStudio();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteGrant(grantId) {
  if (!confirm('Are you sure you want to delete this grant?')) return;
  try {
    const res = await fetch(`/api/grants/${grantId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete grant');

    showToast('Grant deleted', 'success');
    loadGrants();
    loadGrantorStudio();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function selectGrantForReviews(grantId, grantTitle) {
  currentSelectedGrantId = grantId;
  document.getElementById('selectedGrantReviewsTitle').textContent = `Applications: ${grantTitle}`;
  document.getElementById('selectedGrantSubtitle').textContent = 'Evaluate applicant submissions and update review statuses.';

  const container = document.getElementById('grantorApplicationsList');
  container.innerHTML = '<p class="section-desc">Loading applications...</p>';

  try {
    const res = await fetch(`/api/grants/${grantId}/applications`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (!res.ok) throw new Error('Failed to load grant applications');

    const apps = await res.json();
    if (apps.length === 0) {
      container.innerHTML = '<p class="section-desc">No applications submitted for this grant yet.</p>';
      return;
    }

    container.innerHTML = apps.map(app => `
      <div class="compact-item" style="flex-direction: column; align-items: flex-start; gap: 8px;">
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <strong>Applicant: ${escapeHtml(app.grantee_name)} (${escapeHtml(app.grantee_email)})</strong>
          <span class="status-badge status-${app.status}">${app.status}</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; width: 100%;">
          ${escapeHtml(app.proposal)}
        </p>
        <div style="display: flex; gap: 6px; align-self: flex-end;">
          <button class="btn btn-secondary btn-sm" onclick="updateAppStatus('${app.id}', 'under_review')">Under Review</button>
          <button class="btn btn-primary btn-sm" style="background: var(--accent-emerald);" onclick="updateAppStatus('${app.id}', 'approved')">Approve</button>
          <button class="btn btn-secondary btn-sm" style="color: var(--accent-rose);" onclick="updateAppStatus('${app.id}', 'rejected')">Reject</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color: var(--accent-rose);">${err.message}</p>`;
  }
}

async function updateAppStatus(appId, status) {
  try {
    const res = await fetch(`/api/applications/${appId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update status');

    showToast(`Application marked as ${status}`, 'success');
    if (currentSelectedGrantId) {
      selectGrantForReviews(currentSelectedGrantId, '');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Admin Governance
async function loadAdminUsers() {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!currentToken || !currentUser?.roles?.includes('ADMIN')) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Admin privileges required to view user directory.</td></tr>`;
    return;
  }

  try {
    const res = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (!res.ok) throw new Error('Unauthorized or failed to fetch users');

    const users = await res.json();
    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${escapeHtml(u.name || 'Anonymous')}</strong></td>
        <td>${escapeHtml(u.email)}</td>
        <td>
          ${(u.roles || []).map(r => `<span class="role-tag ${r === 'ADMIN' ? 'admin-tag' : r === 'GRANTOR' ? 'grantor-tag' : 'grantee-tag'}">${r}</span>`).join(' ')}
        </td>
        <td>
          <select class="form-control" id="roleSelect_${u.id}" style="width: auto; display: inline-block;">
            <option value="GRANTOR">GRANTOR</option>
            <option value="ADMIN">ADMIN</option>
            <option value="GRANTEE">GRANTEE</option>
          </select>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="assignUserRole('${u.id}')">Assign Role</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--accent-rose); padding: 24px;">${err.message}</td></tr>`;
  }
}

async function assignUserRole(userId) {
  const select = document.getElementById(`roleSelect_${userId}`);
  const roleName = select.value;

  try {
    const res = await fetch(`/api/users/${userId}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ roleName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to assign role');

    showToast(`Role ${roleName} assigned successfully!`, 'success');
    loadAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Token Inspector
function updateTokenInspector() {
  const decodedDisplay = document.getElementById('decodedTokenDisplay');
  const rawDisplay = document.getElementById('rawTokenDisplay');
  const validityBadge = document.getElementById('tokenValidityBadge');

  if (!currentToken) {
    decodedDisplay.textContent = JSON.stringify({ status: 'Not Authenticated', message: 'Sign in to inspect active token claims.' }, null, 2);
    rawDisplay.value = '';
    validityBadge.textContent = 'No Token';
    validityBadge.className = 'badge';
    return;
  }

  rawDisplay.value = currentToken;

  try {
    const parts = currentToken.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      decodedDisplay.textContent = JSON.stringify(payload, null, 2);

      const isExpired = payload.exp && (Date.now() >= payload.exp * 1000);
      if (isExpired) {
        validityBadge.textContent = 'Token Expired';
        validityBadge.className = 'status-badge status-rejected';
      } else {
        validityBadge.textContent = 'Active JWT Valid';
        validityBadge.className = 'status-badge status-approved';
      }
    } else {
      decodedDisplay.textContent = 'Invalid token structure';
    }
  } catch (err) {
    decodedDisplay.textContent = 'Error parsing token: ' + err.message;
  }
}

function copyTokenToClipboard() {
  if (!currentToken) return;
  navigator.clipboard.writeText(currentToken);
  showToast('JWT Access Token copied to clipboard!', 'info');
}

// Modal Helpers
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Utility
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
