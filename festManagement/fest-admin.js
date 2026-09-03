// =========================================================================
// --- FEST ADMIN, PARTICIPANTS & REPORTS MODULE (fest-admin.js) ---
// =========================================================================

import { 
    saveScopedDoc, 
    updateScopedDoc, 
    deleteScopedDoc, 
    batchWriteScoped,
    getScopedDoc,
    systemContext,
    db
} from "./firebase-config.js";

import { 
    state, 
    selectFest, 
    unselectFest, 
    loadAllYearData,
    initializeAppState,
    getStudentClassName,
    getStudentCategory,
    hashPassword,
    loginWithUsername,
    logoutUser
} from "./app-state.js";

import { 
    writeBatch, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

window.checkForAdminMode = async function() {
    const hash = window.location.hash;
    if (hash && hash !== '#' && !hash.startsWith('#fest-admin')) return false;

    const remembered = JSON.parse(localStorage.getItem('fest_remembered_user') || 'null');
    if (remembered?.role === 'admin') {
        state.currentUser = remembered;
        state.currentUserRole = 'admin';
        await initializeAppState();
        window.renderFestManagement();
        return true;
    }

    document.body.innerHTML = `
        <div class="vh-100 d-flex align-items-center justify-content-center bg-light">
            <div class="card shadow border-0" style="max-width: 410px; width: 100%;"><div class="card-body p-4">
                <h4 class="fw-bold mb-1"><i class="fas fa-lock text-primary me-2"></i>Fest Admin Portal</h4>
                <p class="text-muted small">Sign in with an administrator account from festUsers.</p>
                <form id="fest-admin-login-form">
                    <input id="fest-admin-username" class="form-control mb-2" placeholder="Username" autocomplete="username" required>
                    <input id="fest-admin-password" type="password" class="form-control mb-3" placeholder="Password" autocomplete="current-password" required>
                    <label class="form-check small mb-3"><input id="fest-admin-remember" type="checkbox" class="form-check-input me-1" checked> Remember this device</label>
                    <button class="btn btn-primary w-100" type="submit">Sign In</button>
                </form>
                <div id="fest-admin-login-error" class="small text-danger mt-3"></div>
            </div></div>
        </div>`;

    document.getElementById('fest-admin-login-form').addEventListener('submit', async event => {
        event.preventDefault();
        const remember = document.getElementById('fest-admin-remember').checked;
        const result = await loginWithUsername(document.getElementById('fest-admin-username').value, document.getElementById('fest-admin-password').value, remember);
        if (!result.success) {
            document.getElementById('fest-admin-login-error').textContent = result.message;
            return;
        }
        if (result.user.role !== 'admin') {
            localStorage.removeItem('fest_remembered_user');
            document.getElementById('fest-admin-login-error').textContent = 'This account is not an administrator.';
            return;
        }
        window.location.hash = '#fest-admin';
        window.location.reload();
    });
    return true;
};

// --- 1. ENTRY CONTROLLER & TABS NAVIGATION ---

window.renderFestManagement = function() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    if (!state.managingFest) {
        renderFestSelectionScreen();
    } else {
        renderFestWorkspace();
    }
};

window.unselectFest = function() {
    unselectFest();
    window.renderFestManagement();
};

function renderFestSelectionScreen() {
    const mainContent = document.getElementById('main-content');
    const fests = state.fests || [];

    mainContent.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 class="h3 fw-bold mb-0">Fest & Meet Control</h1>
                <p class="text-muted small mb-0">Academic Year: <strong>${state.activeYear?.label || state.activeYear?.id || 'Not Selected'}</strong></p>
            </div>
            <button id="toggle-fest-form-btn" class="btn btn-primary" onclick="window.toggleNewFestForm()">
                <i class="fas fa-plus me-2"></i>Create New Fest
            </button>
        </div>

        <div id="new-fest-form-container" class="ui-card mb-4 d-none">
            <h5 id="fest-form-title" class="section-header">Create New Fest / Sports Meet</h5>
            <form id="add-fest-form">
                <div class="row g-3 align-items-end">
                    <div class="col-md-5">
                        <label class="form-label small fw-bold">Fest Name</label>
                        <input type="text" id="new-fest-name" class="form-control" placeholder="e.g., Annual Arts Fest 2026" required>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label small fw-bold">Type</label>
                        <select id="new-fest-type" class="form-select">
                            <option value="Arts">Arts Fest</option>
                            <option value="Sports">Sports Meet</option>
                        </select>
                    </div>
                    <div class="col-md-3 d-grid">
                        <button type="submit" id="save-new-fest-btn" class="btn btn-success">Save Fest</button>
                    </div>
                </div>
            </form>
        </div>

        <div class="ui-card">
            <h5 class="section-header"><i class="fas fa-trophy me-2 text-warning"></i>Available Fests</h5>
            ${fests.length === 0 ? `<div class="alert alert-warning">No festivals found for this academic year. Click "Create New Fest" to begin.</div>` : ''}
            
            <div class="row g-3 mt-1">
                ${fests.map(fest => `
                    <div class="col-md-6 col-lg-4">
                        <div class="card h-100 shadow-sm border">
                            <div class="card-body text-center d-flex flex-column">
                                <i class="fas ${fest.eventType === 'Sports' ? 'fa-running text-success' : 'fa-paint-brush text-primary'} fa-3x mb-3"></i>
                                <h5 class="card-title fw-bold">${fest.name}</h5>
                                <p class="card-subtitle mb-3 text-muted small">${fest.eventType} | ${fest.registrationOpen ? '<span class="text-success">Registration Open</span>' : '<span class="text-danger">Registration Locked</span>'}</p>
                                <div class="mt-auto d-flex justify-content-center gap-2">
                                    <button class="btn btn-primary btn-sm" onclick="window.manageFestById('${fest.id}')">
                                        <i class="fas fa-cog me-1"></i>Manage
                                    </button>
                                    <button class="btn btn-outline-secondary btn-sm" onclick="window.editFestDetails('${fest.id}')">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.getElementById('add-fest-form')?.addEventListener('submit', handleSaveFestForm);
}

function renderFestWorkspace() {
    const mainContent = document.getElementById('main-content');
    const fest = state.managingFest;

    mainContent.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h1 class="h3 fw-bold mb-0">Managing: <span class="text-primary">${fest.name}</span></h1>
                <span class="badge ${fest.registrationOpen ? 'bg-success' : 'bg-danger'}">${fest.registrationOpen ? 'Registration Active' : 'Registration Closed'}</span>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-secondary" onclick="window.unselectFest()"><i class="fas fa-arrow-left me-1"></i>Back to Fests</button>
                <button class="btn btn-sm btn-outline-danger" onclick="window.logoutAdmin()"><i class="fas fa-right-from-bracket me-1"></i>Logout</button>
            </div>
        </div>

        <ul class="nav nav-tabs" id="festAdminTabs" role="tablist">
            <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tab-dash"><i class="fas fa-chart-pie me-2"></i>Dashboard</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-setup"><i class="fas fa-cogs me-2"></i>Setup & Rules</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-events"><i class="fas fa-calendar-check me-2"></i>Events</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-judge-stage"><i class="fas fa-gavel me-2"></i>Judges & Stages</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-participants"><i class="fas fa-users-cog me-2"></i>Participants</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-reports"><i class="fas fa-print me-2"></i>Reports</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-csv"><i class="fas fa-file-csv me-2"></i>Bulk Ingestion</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-links"><i class="fas fa-link me-2"></i>Portals & Users</button></li>
        </ul>

        <div class="tab-content card border-top-0 rounded-bottom p-4" id="festAdminTabsContent">
            <div class="tab-pane fade show active" id="tab-dash"></div>
            <div class="tab-pane fade" id="tab-setup"></div>
            <div class="tab-pane fade" id="tab-events"></div>
            <div class="tab-pane fade" id="tab-judge-stage"></div>
            <div class="tab-pane fade" id="tab-participants"></div>
            <div class="tab-pane fade" id="tab-reports"></div>
            <div class="tab-pane fade" id="tab-csv"></div>
            <div class="tab-pane fade" id="tab-links"></div>
        </div>
    `;

    renderDashboardTab();
    renderSetupTab();
    renderEventsTab();
    renderJudgeStageTab();
    renderParticipantsTab();
    if (typeof window.renderFestReportsTab === 'function') {
        window.renderFestReportsTab();
    }
    renderCsvUploadTab();
    renderAccessLinksTab();
}

// --- 2. FEST CRUD & SETUP TAB ---

window.toggleNewFestForm = function() {
    const form = document.getElementById('new-fest-form-container');
    const btn = document.getElementById('toggle-fest-form-btn');
    const isHidden = form.classList.contains('d-none');

    if (isHidden) {
        form.classList.remove('d-none');
        btn.innerHTML = `<i class="fas fa-times me-2"></i>Cancel`;
        btn.className = "btn btn-secondary";
        state.festToEdit = null;
        document.getElementById('add-fest-form').reset();
    } else {
        form.classList.add('d-none');
        btn.innerHTML = `<i class="fas fa-plus me-2"></i>Create New Fest`;
        btn.className = "btn btn-primary";
    }
};

window.manageFestById = function(festId) {
    selectFest(festId);
    window.renderFestManagement();
};

window.editFestDetails = function(festId) {
    const fest = state.fests.find(f => f.id === festId);
    if (!fest) return;

    state.festToEdit = fest;
    const formContainer = document.getElementById('new-fest-form-container');
    const formTitle = document.getElementById('fest-form-title');
    const saveBtn = document.getElementById('save-new-fest-btn');

    document.getElementById('new-fest-name').value = fest.name;
    document.getElementById('new-fest-type').value = fest.eventType;

    formTitle.textContent = `Edit: ${fest.name}`;
    saveBtn.textContent = 'Update Fest';
    formContainer.classList.remove('d-none');
    formContainer.scrollIntoView({ behavior: 'smooth' });
};

async function handleSaveFestForm(e) {
    e.preventDefault();
    const name = document.getElementById('new-fest-name').value.trim();
    const eventType = document.getElementById('new-fest-type').value;

    const isEditing = state.festToEdit !== null;
    const festId = isEditing ? state.festToEdit.id : `${name.replace(/\s+/g, '_').toUpperCase()}_${Date.now()}`;

    const payload = {
        name,
        eventType,
        registrationOpen: isEditing ? state.festToEdit.registrationOpen : true,
        settings: isEditing ? (state.festToEdit.settings || {}) : {
            maxOnStageSoloEvents: 2,
            maxOnStageGroupEvents: 2,
            maxOffStageSoloEvents: 1,
            maxOffStageGroupEvents: 1,
            houseEventLimits: { onStage: { solo: 2, group: 1 }, offStage: { solo: 2, group: 1 } },
            categories: []
        },
        judgeCodes: isEditing ? (state.festToEdit.judgeCodes || []) : [],
        stages: isEditing ? (state.festToEdit.stages || ['Main Stage']) : ['Main Stage']
    };

    try {
        await saveScopedDoc('fests', festId, payload);
        window.showAlert(`Fest ${isEditing ? 'updated' : 'created'} successfully!`, 'success');
        state.festToEdit = null;
        await loadAllYearData(true);
        window.renderFestManagement();
    } catch (err) {
        console.error(err);
        window.showAlert('Error saving fest information.', 'danger');
    }
}

function renderDashboardTab() {
    const container = document.getElementById('tab-dash');
    const fest = state.managingFest;
    const participants = state.festRegistrations.filter(r => r.festId === fest.id);
    const events = state.festEvents.filter(e => e.festId === fest.id);
    const houses = state.festHouses;

    container.innerHTML = `
        <div class="row g-3">
            <div class="col-md-3">
                <div class="ui-card-stat">
                    <div class="stat-icon bg-primary"><i class="fas fa-users"></i></div>
                    <div>
                        <div class="stat-number">${participants.length}</div>
                        <div class="stat-label">Registered Participants</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="ui-card-stat">
                    <div class="stat-icon bg-info"><i class="fas fa-calendar-alt"></i></div>
                    <div>
                        <div class="stat-number">${events.length}</div>
                        <div class="stat-label">Total Events</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="ui-card-stat">
                    <div class="stat-icon bg-success"><i class="fas fa-shield-alt"></i></div>
                    <div>
                        <div class="stat-number">${houses.length}</div>
                        <div class="stat-label">Competing Houses</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="ui-card-stat">
                    <div class="stat-icon bg-warning"><i class="fas fa-gavel"></i></div>
                    <div>
                        <div class="stat-number">${fest.judgeCodes?.length || 0}</div>
                        <div class="stat-label">Active Judges</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderSetupTab() {
    const container = document.getElementById('tab-setup');
    const fest = state.managingFest;
    const settings = fest.settings || {};
    const houses = state.festHouses;
    const stages = fest.stages?.length ? fest.stages : ['Main Stage'];

    container.innerHTML = `
        <div class="row g-4">
            <div class="col-lg-6">
                <div class="ui-card">
                    <h5 class="section-header"><i class="fas fa-layer-group me-2"></i>Conduct Venues / Stages</h5>
                    <div id="fest-stages-list" class="mb-2">${stages.map(stage => `<div class="input-group input-group-sm mb-1"><input class="form-control fest-stage-input" value="${stage}"><button class="btn btn-outline-danger" type="button" onclick="this.closest('.input-group').remove()">&times;</button></div>`).join('')}</div>
                    <div class="input-group input-group-sm"><input id="new-fest-stage" class="form-control" placeholder="e.g. LP Hall, Main Stage"><button class="btn btn-outline-primary" onclick="window.addFestStage()">Add Venue / Stage</button></div>
                    <button class="btn btn-success btn-sm mt-2" onclick="window.saveFestStages()"><i class="fas fa-save me-1"></i>Save Stages</button>
                </div>

                <div class="ui-card">
                    <h5 class="section-header"><i class="fas fa-toggle-on me-2"></i>Registration Status</h5>
                    <div class="form-check form-switch mb-3">
                        <input class="form-check-input" type="checkbox" id="admin-reg-toggle" ${fest.registrationOpen ? 'checked' : ''}>
                        <label class="form-check-label fw-bold" for="admin-reg-toggle">Registration Active for House Captains</label>
                    </div>
                    <p class="small text-muted mb-0">When deactivated, house captain portals cannot add, remove, or modify registrations.</p>
                </div>

                <div class="ui-card">
                    <h5 class="section-header"><i class="fas fa-sliders-h me-2"></i>Per-Student Entry Limits</h5>
                    <div class="row g-2">
                        <div class="col-6">
                            <label class="small fw-bold">Max On-Stage (Solo)</label>
                            <input type="number" id="limit-on-solo" class="form-control form-control-sm" value="${settings.maxOnStageSoloEvents ?? 2}">
                        </div>
                        <div class="col-6">
                            <label class="small fw-bold">Max On-Stage (Group)</label>
                            <input type="number" id="limit-on-group" class="form-control form-control-sm" value="${settings.maxOnStageGroupEvents ?? 2}">
                        </div>
                        <div class="col-6 mt-2">
                            <label class="small fw-bold">Max Off-Stage (Solo)</label>
                            <input type="number" id="limit-off-solo" class="form-control form-control-sm" value="${settings.maxOffStageSoloEvents ?? 1}">
                        </div>
                        <div class="col-6 mt-2">
                            <label class="small fw-bold">Max Off-Stage (Group)</label>
                            <input type="number" id="limit-off-group" class="form-control form-control-sm" value="${settings.maxOffStageGroupEvents ?? 1}">
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm mt-3" onclick="window.saveGeneralSettings()">Save Limits</button>
                </div>

                <div class="ui-card">
                    <h5 class="section-header"><i class="fas fa-shield-alt me-2"></i>Academic Year Houses (${houses.length})</h5>
                    <div class="table-responsive mb-3" style="max-height: 200px; overflow-y: auto;">
                        <table class="table table-sm">
                            <thead><tr><th>ID</th><th>Name</th><th>Color</th><th></th></tr></thead>
                            <tbody>
                                ${houses.map(h => `
                                    <tr>
                                        <td><strong>${h.id}</strong></td>
                                        <td>${h.name}</td>
                                        <td><span class="color-dot-display" style="background-color: ${h.color}"></span> ${h.color}</td>
                                        <td class="text-end">
                                            <button class="btn btn-xs btn-outline-danger" onclick="window.deleteHouseById('${h.id}')">&times;</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div class="row g-2 align-items-end">
                        <div class="col-4">
                            <input type="text" id="house-in-id" class="form-control form-control-sm" placeholder="ID (e.g. RED)">
                        </div>
                        <div class="col-5">
                            <input type="text" id="house-in-name" class="form-control form-control-sm" placeholder="Name (e.g. Red Racers)">
                        </div>
                        <div class="col-3">
                            <input type="color" id="house-in-color" class="form-control form-control-sm form-control-color w-100" value="#dc3545">
                        </div>
                    </div>
                    <button class="btn btn-outline-primary btn-sm mt-2 w-100" onclick="window.addHouseDefinition()">Add House</button>
                </div>
            </div>

            <div class="col-lg-6">
                <div class="ui-card">
                    <h5 class="section-header"><i class="fas fa-layer-group me-2"></i>Age / Class Categories</h5>
                    <div class="table-responsive">
                        <table class="table table-sm" id="categories-table">
                            <thead><tr><th>Name</th><th>Type</th><th>Criteria</th><th></th></tr></thead>
                            <tbody>
                                ${(settings.categories || []).map(cat => `
                                    <tr data-name="${cat.name}" data-type="${cat.type}" data-criteria="${Array.isArray(cat.criteria) ? cat.criteria.join(',') : cat.criteria}">
                                        <td><strong>${cat.name}</strong></td>
                                        <td><span class="badge bg-light text-dark">${cat.type}-wise</span></td>
                                        <td>${cat.type === 'age' ? 'Born after ' + cat.criteria : (cat.criteria || []).join(', ')}</td>
                                        <td class="text-end"><button class="btn btn-xs btn-outline-danger" onclick="this.closest('tr').remove()">&times;</button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <hr>
                    <div class="row g-2 align-items-end">
                        <div class="col-4">
                            <input type="text" id="cat-in-name" class="form-control form-control-sm" placeholder="Cat Name">
                        </div>
                        <div class="col-3">
                            <select id="cat-in-type" class="form-select form-select-sm" onchange="window.toggleCatCriteriaInput(this.value)">
                                <option value="class">Class</option>
                                <option value="age">Age</option>
                            </select>
                        </div>
                        <div class="col-5" id="cat-criteria-cell">
                            <input type="text" id="cat-in-classes" class="form-control form-control-sm" placeholder="Classes (comma-sep)">
                        </div>
                    </div>
                    <div class="d-flex justify-content-between mt-3">
                        <button class="btn btn-outline-primary btn-sm" onclick="window.appendCategoryRow()">Add Category</button>
                        <button class="btn btn-success btn-sm" onclick="window.commitCategories()">Commit Categories</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('admin-reg-toggle')?.addEventListener('change', async (e) => {
        const registrationOpen = e.target.checked;
        await updateScopedDoc('fests', fest.id, { registrationOpen });
        fest.registrationOpen = registrationOpen;
        window.showAlert(`Registrations are now ${registrationOpen ? 'OPEN' : 'LOCKED'}.`, 'info');
    });
}

window.addHouseDefinition = async function() {
    const id = document.getElementById('house-in-id').value.trim().toUpperCase();
    const name = document.getElementById('house-in-name').value.trim();
    const color = document.getElementById('house-in-color').value;

    if (!id || !name) return window.showAlert('Provide House ID and Name.', 'warning');

    try {
        await saveScopedDoc('festHouses', id, { id, name, color });
        window.showAlert(`House '${name}' saved.`, 'success');
        await loadAllYearData(true);
        renderSetupTab();
    } catch (err) {
        console.error(err);
        window.showAlert('Error saving house.', 'danger');
    }
};

window.deleteHouseById = async function(houseId) {
    if (!confirm(`Delete House ${houseId}?`)) return;
    try {
        await deleteScopedDoc('festHouses', houseId);
        window.showAlert('House deleted.', 'success');
        await loadAllYearData(true);
        renderSetupTab();
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to delete house.', 'danger');
    }
};

window.toggleCatCriteriaInput = function(type) {
    const cell = document.getElementById('cat-criteria-cell');
    if (type === 'age') {
        cell.innerHTML = `<input type="date" id="cat-in-age" class="form-control form-control-sm">`;
    } else {
        cell.innerHTML = `<input type="text" id="cat-in-classes" class="form-control form-control-sm" placeholder="Classes (comma-sep)">`;
    }
};

window.appendCategoryRow = function() {
    const name = document.getElementById('cat-in-name').value.trim();
    const type = document.getElementById('cat-in-type').value;
    let criteria = '';

    if (type === 'age') {
        criteria = document.getElementById('cat-in-age')?.value;
    } else {
        criteria = document.getElementById('cat-in-classes')?.value.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (!name || !criteria) return window.showAlert('Provide Category Name & criteria.', 'warning');

    const tbody = document.querySelector('#categories-table tbody');
    const tr = document.createElement('tr');
    tr.dataset.name = name;
    tr.dataset.type = type;
    tr.dataset.criteria = Array.isArray(criteria) ? criteria.join(',') : criteria;
    tr.innerHTML = `
        <td><strong>${name}</strong></td>
        <td><span class="badge bg-light text-dark">${type}-wise</span></td>
        <td>${type === 'age' ? 'Born after ' + criteria : criteria.join(', ')}</td>
        <td class="text-end"><button class="btn btn-xs btn-outline-danger" onclick="this.closest('tr').remove()">&times;</button></td>
    `;
    tbody.appendChild(tr);
    document.getElementById('cat-in-name').value = '';
};

window.commitCategories = async function() {
    const rows = document.querySelectorAll('#categories-table tbody tr');
    const categories = Array.from(rows).map(r => ({
        name: r.dataset.name,
        type: r.dataset.type,
        criteria: r.dataset.type === 'age' ? r.dataset.criteria : r.dataset.criteria.split(',')
    }));

    const fest = state.managingFest;
    const settings = { ...(fest.settings || {}), categories };

    await updateScopedDoc('fests', fest.id, { settings });
    fest.settings = settings;
    window.showAlert('Categories updated and saved.', 'success');
};

window.saveGeneralSettings = async function() {
    const fest = state.managingFest;
    const settings = {
        ...(fest.settings || {}),
        maxOnStageSoloEvents: parseInt(document.getElementById('limit-on-solo').value, 10) || 0,
        maxOnStageGroupEvents: parseInt(document.getElementById('limit-on-group').value, 10) || 0,
        maxOffStageSoloEvents: parseInt(document.getElementById('limit-off-solo').value, 10) || 0,
        maxOffStageGroupEvents: parseInt(document.getElementById('limit-off-group').value, 10) || 0
    };

    await updateScopedDoc('fests', fest.id, { settings });
    fest.settings = settings;
    window.showAlert('Event limits updated.', 'success');
};

window.addFestStage = function() {
    const input = document.getElementById('new-fest-stage');
    const stage = input.value.trim();
    if (!stage) return;
    const exists = Array.from(document.querySelectorAll('.fest-stage-input')).some(item => item.value.trim().toLowerCase() === stage.toLowerCase());
    if (exists) return window.showAlert('This stage already exists.', 'warning');
    document.getElementById('fest-stages-list').insertAdjacentHTML('beforeend', `<div class="input-group input-group-sm mb-1"><input class="form-control fest-stage-input" value="${stage}"><button class="btn btn-outline-danger" type="button" onclick="this.closest('.input-group').remove()">&times;</button></div>`);
    input.value = '';
};

window.saveFestStages = async function() {
    const stages = Array.from(document.querySelectorAll('.fest-stage-input')).map(input => input.value.trim()).filter(Boolean);
    if (!stages.length) return window.showAlert('Add at least one stage.', 'warning');
    const fest = state.managingFest;
    try {
        await updateScopedDoc('fests', fest.id, { stages });
        fest.stages = stages;
        window.showAlert('Stages saved.', 'success');
        renderEventsTab();
        renderJudgeStageTab();
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to save stages.', 'danger');
    }
};

function renderJudgeStageTab() {
    const container = document.getElementById('tab-judge-stage');
    const fest = state.managingFest;
    const judges = fest.judgeCodes || [];
    const events = state.festEvents.filter(event => event.festId === fest.id);
    const stages = fest.stages?.length ? fest.stages : ['Main Stage'];
    container.innerHTML = `
        <div class="ui-card mb-3"><h5 class="section-header"><i class="fas fa-gavel me-2"></i>Assign Judges To Events</h5><p class="small text-muted">Choose the saved stage and one or more judges for each event, then save each row.</p>
        <div class="table-responsive"><table class="table table-sm align-middle"><thead class="table-light"><tr><th>Event</th><th>Stage</th><th>Judges</th><th></th></tr></thead><tbody>
        ${events.map(event => `<tr><td><strong>${event.name}</strong><div class="small text-muted">${event.category} | ${event.isGroupEvent ? 'Group' : 'Solo'}</div></td><td><select class="form-select form-select-sm event-stage-picker" data-event-id="${event.id}">${stages.map(stage => `<option value="${stage}" ${(event.stage || 'Stage 1') === stage ? 'selected' : ''}>${stage}</option>`).join('')}</select></td><td><select class="form-select form-select-sm event-judge-picker" multiple size="${Math.min(Math.max(judges.length, 1), 4)}">${judges.map(judge => `<option value="${judge.code}" ${(event.judgeIds || []).includes(judge.code) ? 'selected' : ''}>${judge.name} (${judge.code})</option>`).join('')}</select></td><td><button class="btn btn-outline-success btn-sm" onclick="window.saveEventStageAndJudges('${event.id}', this)"><i class="fas fa-save"></i></button></td></tr>`).join('') || '<tr><td colspan="4" class="text-muted">Create events and judges first.</td></tr>'}
        </tbody></table></div></div>`;
}

window.saveEventStageAndJudges = async function(eventId, button) {
    const row = button.closest('tr');
    const event = state.festEvents.find(item => item.id === eventId);
    if (!event) return window.showAlert('Event not found.', 'danger');
    const stage = row.querySelector('.event-stage-picker').value;
    const judgeIds = Array.from(row.querySelector('.event-judge-picker').selectedOptions).map(option => option.value);
    try {
        await updateScopedDoc('festEvents', eventId, { stage, judgeIds });
        event.stage = stage;
        event.judgeIds = judgeIds;
        window.showAlert('Event stage and judges saved.', 'success');
        renderEventsTab();
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to save event stage and judges.', 'danger');
    }
};

// --- 3. EVENT CREATION & DEFINITIONS ---

function renderEventsTab() {
    const container = document.getElementById('tab-events');
    const fest = state.managingFest;
    const categories = fest.settings?.categories || [];
    const stages = fest.stages?.length ? fest.stages : ['Main Stage'];
    const events = state.festEvents.filter(e => e.festId === fest.id);

    container.innerHTML = `
        <div class="row g-4">
            <div class="col-lg-5">
                <div class="ui-card">
                    <h5 class="section-header"><i class="fas fa-calendar-plus me-2"></i>Create Event</h5>
                    <form id="create-event-form">
                        <div class="mb-3">
                            <label class="form-label small fw-bold">Event Name</label>
                            <input type="text" id="ev-name" class="form-control" placeholder="e.g., Classical Dance" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-bold">Eligible Categories</label>
                            <select id="ev-categories" class="form-select" multiple size="3" required>
                                <option value="General">General</option>
                                ${categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold">Type</label>
                                <select id="ev-type" class="form-select">
                                    <option value="onStage">On-Stage</option>
                                    <option value="offStage">Off-Stage</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold">Gender Allocation</label>
                                <select id="ev-gender" class="form-select">
                                    <option value="Common">Common</option>
                                    <option value="Male">Boys Only</option>
                                    <option value="Female">Girls Only</option>
                                    <option value="Both">Split (Boys & Girls)</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold">Conduct Venue / Stage</label>
                                <select id="ev-stage" class="form-select">
                                    ${stages.map(stage => `<option value="${stage}">${stage}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-check mb-3">
                            <input class="form-check-input" type="checkbox" id="ev-is-group">
                            <label class="form-check-label fw-bold small" for="ev-is-group">Group Event</label>
                        </div>
                        <button type="submit" class="btn btn-primary w-100">Save Event</button>
                    </form>
                </div>
            </div>

            <div class="col-lg-7">
                <div class="ui-card">
                    <h5 class="section-header"><i class="fas fa-list me-2"></i>Active Events (${events.length})</h5>
                    <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                        <table class="table table-sm table-hover">
                            <thead class="table-light"><tr><th>Event</th><th>Category</th><th>Stage</th><th>Type</th><th>Mode</th><th></th></tr></thead>
                            <tbody>
                                ${events.map(ev => `
                                    <tr>
                                        <td><strong>${ev.name}</strong></td>
                                        <td><span class="badge bg-secondary">${ev.category}</span></td>
                                        <td><span class="badge bg-primary">${ev.stage || 'Main Stage'}</span></td>
                                        <td>${ev.type}</td>
                                        <td>${ev.isGroupEvent ? '<span class="badge bg-info">Group</span>' : 'Solo'}</td>
                                        <td class="text-end">
                                            <button class="btn btn-xs btn-outline-danger" onclick="window.deleteEventById('${ev.id}')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('create-event-form')?.addEventListener('submit', handleEventCreate);
}

async function handleEventCreate(e) {
    e.preventDefault();
    const fest = state.managingFest;
    const name = document.getElementById('ev-name').value.trim();
    const categories = Array.from(document.getElementById('ev-categories').selectedOptions).map(o => o.value);
    const type = document.getElementById('ev-type').value;
    const gender = document.getElementById('ev-gender').value;
    const stage = document.getElementById('ev-stage').value;
    const isGroupEvent = document.getElementById('ev-is-group').checked;

    const genders = gender === 'Both' ? ['Male', 'Female'] : [gender];
    const baseId = `EVT_${Date.now()}`;
    const items = [];

    categories.forEach(cat => {
        genders.forEach(g => {
            const finalName = g === 'Male' ? `${name} (Boys)` : g === 'Female' ? `${name} (Girls)` : name;
            const uniqueId = `${baseId}_${cat}_${g}`;
            items.push({
                id: uniqueId,
                baseEventId: baseId,
                festId: fest.id,
                name: finalName,
                category: cat,
                type,
                gender: g,
                stage,
                isGroupEvent
            });
        });
    });

    try {
        await batchWriteScoped('festEvents', items);
        window.showAlert(`Added ${items.length} event variant(s).`, 'success');
        await loadAllYearData(true);
        renderEventsTab();
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to save events.', 'danger');
    }
}

window.deleteEventById = async function(eventId) {
    if (!confirm('Permanently remove this event? Existing participant registrations will be affected.')) return;
    try {
        await deleteScopedDoc('festEvents', eventId);
        window.showAlert('Event deleted.', 'success');
        await loadAllYearData(true);
        renderEventsTab();
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to delete event.', 'danger');
    }
};

// --- 4. PARTICIPANT MANAGEMENT TAB ---

function renderParticipantsTab() {
    const container = document.getElementById('tab-participants');
    const fest = state.managingFest;
    const isRegistrationOpen = fest.registrationOpen === true;

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <ul class="nav nav-pills" id="participant-sub-tabs">
                <li class="nav-item">
                    <button class="nav-link active py-1" data-bs-toggle="pill" data-bs-target="#subtab-registrations">
                        <i class="fas fa-user-check me-1"></i>Event Allocations
                    </button>
                </li>
                <li class="nav-item">
                    <button class="nav-link py-1" data-bs-toggle="pill" data-bs-target="#subtab-groups">
                        <i class="fas fa-people-group me-1"></i>Group Participants
                    </button>
                </li>
                <li class="nav-item">
                    <button class="nav-link py-1" data-bs-toggle="pill" data-bs-target="#subtab-participation">
                        <i class="fas fa-clipboard-check me-1"></i>Participation Management
                    </button>
                </li>
                <li class="nav-item">
                    <button class="nav-link py-1" data-bs-toggle="pill" data-bs-target="#subtab-chest">
                        <i class="fas fa-id-badge me-1"></i>Chest Numbers
                    </button>
                </li>
                <li class="nav-item">
                    <button class="nav-link py-1" data-bs-toggle="pill" data-bs-target="#subtab-houses">
                        <i class="fas fa-sitemap me-1"></i>House Allocation
                    </button>
                </li>
            </ul>
        </div>

        <div class="tab-content">
            <div class="tab-pane fade show active" id="subtab-registrations"></div>
            <div class="tab-pane fade" id="subtab-groups"></div>
            <div class="tab-pane fade" id="subtab-participation"></div>
            <div class="tab-pane fade" id="subtab-chest"></div>
            <div class="tab-pane fade" id="subtab-houses"></div>
        </div>
    `;

    renderSubTabRegistrations(isRegistrationOpen);
    renderSubTabGroups(isRegistrationOpen);
    renderSubTabParticipation();
    renderSubTabChestNumbers();
    renderSubTabHouseAllocation();
}

function renderSubTabGroups(isRegistrationOpen) {
    const container = document.getElementById('subtab-groups');
    const fest = state.managingFest;
    const houses = state.festHouses;
    const events = state.festEvents.filter(e => e.festId === fest.id && e.isGroupEvent);
    const categories = ['General', ...(fest.settings?.categories?.map(c => c.name) || [])];
    const groups = state.festGroups.filter(g => g.festId === fest.id);

    container.innerHTML = `
        <div class="ui-card mb-3">
            <h6 class="fw-bold"><i class="fas fa-people-group me-2 text-primary"></i>Create Group Participation</h6>
            <div class="row g-2 align-items-end">
                <div class="col-md-3"><label class="small fw-bold">House</label><select id="admin-group-house" class="form-select form-select-sm"><option value="">Choose House</option>${houses.map(h => `<option value="${h.id}">${h.name}</option>`).join('')}</select></div>
                <div class="col-md-3"><label class="small fw-bold">Group Name</label><input id="admin-group-name" class="form-control form-control-sm" placeholder="Team name"></div>
                <div class="col-md-2"><label class="small fw-bold">Category</label><select id="admin-group-category" class="form-select form-select-sm">${categories.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
                <div class="col-md-4"><label class="small fw-bold">Group Event</label><select id="admin-group-event" class="form-select form-select-sm"><option value="">Choose Event</option>${events.map(e => `<option value="${e.id}" data-category="${e.category}">${e.name} (${e.category})</option>`).join('')}</select></div>
            </div>
            <div class="row g-2 mt-1">
                <div class="col-md-8"><label class="small fw-bold">Participants</label><select id="admin-group-members" class="form-select form-select-sm" multiple size="5"><option value="">Choose a house first</option></select><small class="text-muted">Use Ctrl/Cmd to select multiple students.</small></div>
                <div class="col-md-4"><label class="small fw-bold">Captain</label><select id="admin-group-captain" class="form-select form-select-sm"><option value="">Choose participants first</option></select><button class="btn btn-success btn-sm w-100 mt-2" onclick="window.saveAdminGroup()" ${!isRegistrationOpen ? 'disabled' : ''}><i class="fas fa-save me-1"></i>Save Group</button></div>
            </div>
        </div>
        <div class="table-responsive border rounded"><table class="table table-sm table-hover align-middle mb-0"><thead class="table-light"><tr><th>Group</th><th>House</th><th>Category</th><th>Event</th><th>Participants</th></tr></thead><tbody>${groups.length ? groups.map(group => { const house = houses.find(h => h.id === group.houseId); const event = state.festEvents.find(e => e.id === group.eventId); return `<tr><td><strong>${group.name}</strong></td><td>${house?.name || 'N/A'}</td><td>${group.category || event?.category || 'General'}</td><td>${event?.name || 'N/A'}</td><td>${group.members?.map(m => `${state.students.find(s => s.id === m.studentId)?.name || m.studentId}${m.role === 'Captain' ? ' (Captain)' : ''}`).join(', ') || 'None'}</td></tr>`; }).join('') : '<tr><td colspan="5" class="text-center text-muted p-4">No group participants added.</td></tr>'}</tbody></table></div>
    `;

    const housePicker = document.getElementById('admin-group-house');
    const memberPicker = document.getElementById('admin-group-members');
    const captainPicker = document.getElementById('admin-group-captain');
    const refreshMembers = () => {
        const students = state.students.filter(s => s.houseId === housePicker.value);
        memberPicker.innerHTML = students.map(s => `<option value="${s.id}">${s.name} (${s.admissionNumber})</option>`).join('') || '<option value="">No students in this house</option>';
        captainPicker.innerHTML = '<option value="">Choose captain</option>';
    };
    housePicker.addEventListener('change', refreshMembers);
    memberPicker.addEventListener('change', () => {
        const selected = Array.from(memberPicker.selectedOptions);
        captainPicker.innerHTML = '<option value="">Choose captain</option>' + selected.map(o => `<option value="${o.value}">${o.textContent}</option>`).join('');
    });
}

window.saveAdminGroup = async function() {
    const fest = state.managingFest;
    const houseId = document.getElementById('admin-group-house').value;
    const name = document.getElementById('admin-group-name').value.trim();
    const category = document.getElementById('admin-group-category').value;
    const eventId = document.getElementById('admin-group-event').value;
    const memberIds = Array.from(document.getElementById('admin-group-members').selectedOptions).map(o => o.value).filter(Boolean);
    const captainId = document.getElementById('admin-group-captain').value;
    const event = state.festEvents.find(e => e.id === eventId);
    if (!houseId || !name || !eventId || memberIds.length === 0 || !captainId) return window.showAlert('Choose house, group name, event, participants, and one captain.', 'warning');
    if (!event?.isGroupEvent) return window.showAlert('Selected event is not a group event.', 'warning');
    if (new Set(memberIds).size !== memberIds.length) return window.showAlert('A participant cannot be added twice to the same group.', 'warning');
    const existingGroups = state.festGroups.filter(group => group.festId === fest.id);
    const duplicateMember = memberIds.find(studentId => existingGroups.some(group => group.eventId === eventId && group.members?.some(member => member.studentId === studentId)));
    if (duplicateMember) return window.showAlert('One or more participants are already registered in this event group.', 'warning');
    if (existingGroups.some(group => group.members?.some(member => member.studentId === captainId && member.role === 'Captain'))) return window.showAlert('This student is already captain of another group.', 'warning');
    const groupLimit = event.type === 'offStage' ? (fest.settings?.maxOffStageGroupEvents ?? 1) : (fest.settings?.maxOnStageGroupEvents ?? 2);
    const overLimit = memberIds.find(studentId => {
        const count = existingGroups.filter(group => group.members?.some(member => member.studentId === studentId)).filter(group => {
            const groupEvent = state.festEvents.find(item => item.id === group.eventId);
            return groupEvent?.type === event.type;
        }).length;
        return count >= groupLimit;
    });
    if (overLimit) return window.showAlert(`A participant already has the maximum ${event.type === 'offStage' ? 'off-stage' : 'on-stage'} group events (${groupLimit}).`, 'warning');

    const groupId = `GRP_${Date.now()}`;
    const members = memberIds.map(studentId => ({ studentId, role: studentId === captainId ? 'Captain' : 'Member' }));
    const batch = writeBatch(db);
    batch.set(getScopedDoc('festGroups', groupId), { id: groupId, festId: fest.id, houseId, name, category, eventId, members, lastUpdated: serverTimestamp() });
    memberIds.forEach(studentId => {
        const student = state.students.find(s => s.id === studentId);
        const regId = `${fest.id}_${studentId}`;
        const existing = state.festRegistrations.find(r => r.id === regId);
        batch.set(getScopedDoc('festRegistrations', regId), { id: regId, festId: fest.id, studentId, studentName: student?.name || 'Student', houseId, events: [...new Set([...(existing?.events || []), eventId])], chestNo: existing?.chestNo || null, lastUpdated: serverTimestamp() }, { merge: true });
    });
    try {
        await batch.commit();
        await loadAllYearData();
        window.showAlert('Group participation saved.', 'success');
        renderSubTabGroups(fest.registrationOpen === true);
        renderSubTabParticipation();
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to save group participation.', 'danger');
    }
};

function renderSubTabParticipation() {
    const container = document.getElementById('subtab-participation');
    const fest = state.managingFest;
    const registrations = state.festRegistrations.filter(r => r.festId === fest.id);
    const groups = state.festGroups.filter(g => g.festId === fest.id);
    const events = state.festEvents.filter(e => e.festId === fest.id);
    const houses = state.festHouses;
    const registeredStudentIds = new Set(registrations.map(r => r.studentId));
    const rows = registrations.map(reg => {
        const student = state.students.find(s => s.id === reg.studentId);
        const house = houses.find(h => h.id === (student?.houseId || reg.houseId));
        const eventNames = (reg.events || []).map(eventId => events.find(e => e.id === eventId)?.name).filter(Boolean);
        return { reg, student, house, eventNames };
    }).sort((a, b) => (a.student?.name || a.reg.studentName || '').localeCompare(b.student?.name || b.reg.studentName || ''));

    container.innerHTML = `
        <div class="row g-3 mb-3">
            <div class="col-6 col-lg-3"><div class="ui-card-stat"><div class="stat-icon bg-primary"><i class="fas fa-user-check"></i></div><div><div class="stat-number">${registrations.length}</div><div class="stat-label">Registered Students</div></div></div></div>
            <div class="col-6 col-lg-3"><div class="ui-card-stat"><div class="stat-icon bg-info"><i class="fas fa-users"></i></div><div><div class="stat-number">${groups.length}</div><div class="stat-label">Group Teams</div></div></div></div>
            <div class="col-6 col-lg-3"><div class="ui-card-stat"><div class="stat-icon bg-success"><i class="fas fa-id-badge"></i></div><div><div class="stat-number">${registrations.filter(r => r.chestNo).length}</div><div class="stat-label">Chest Numbers</div></div></div></div>
            <div class="col-6 col-lg-3"><div class="ui-card-stat"><div class="stat-icon bg-warning"><i class="fas fa-user-clock"></i></div><div><div class="stat-number">${state.students.filter(s => !registeredStudentIds.has(s.id)).length}</div><div class="stat-label">Not Registered</div></div></div></div>
        </div>
        <div class="row g-2 mb-3 align-items-center">
            <div class="col-md-5"><input id="participation-search" class="form-control form-control-sm" placeholder="Search participant or admission no..."></div>
            <div class="col-md-4"><select id="participation-house" class="form-select form-select-sm"><option value="">All Houses</option>${houses.map(h => `<option value="${h.id}">${h.name}</option>`).join('')}</select></div>
            <div class="col-md-3"><span class="badge bg-secondary py-2 w-100" id="participation-count">${rows.length} Records</span></div>
        </div>
        <div class="table-responsive border rounded" style="max-height: 440px; overflow-y: auto;">
            <table class="table table-sm table-hover align-middle mb-0" id="participation-table">
                <thead class="table-light sticky-top"><tr><th>Participant</th><th>House</th><th>Events</th><th>Chest</th><th>Type</th></tr></thead>
                <tbody></tbody>
            </table>
        </div>
    `;

    const updateTable = () => {
        const term = document.getElementById('participation-search').value.trim().toLowerCase();
        const houseId = document.getElementById('participation-house').value;
        const filtered = rows.filter(({ reg, student, house }) => {
            const name = student?.name || reg.studentName || '';
            const admission = student?.admissionNumber || '';
            return (!term || name.toLowerCase().includes(term) || String(admission).toLowerCase().includes(term)) && (!houseId || house?.id === houseId);
        });
        document.getElementById('participation-count').textContent = `${filtered.length} Records`;
        document.querySelector('#participation-table tbody').innerHTML = filtered.length ? filtered.map(({ reg, student, house, eventNames }) => `
            <tr><td><strong>${student?.name || reg.studentName}</strong><div class="small text-muted">Adm: ${student?.admissionNumber || 'N/A'} | ${getStudentClassName(student?.classId, student?.division)}</div></td>
            <td>${house?.name || '<span class="text-muted">No house</span>'}</td>
            <td>${eventNames.length ? eventNames.map(name => `<span class="badge bg-light text-dark border me-1">${name}</span>`).join('') : '<span class="text-muted">None</span>'}</td>
            <td>${reg.chestNo || '<span class="text-muted">Pending</span>'}</td>
            <td>${groups.some(g => g.members?.some(m => m.studentId === reg.studentId)) ? '<span class="badge bg-info">Solo + Group</span>' : '<span class="badge bg-secondary">Solo</span>'}</td></tr>
        `).join('') : '<tr><td colspan="5" class="text-center text-muted p-4">No participants match the selected filters.</td></tr>';
    };
    document.getElementById('participation-search').addEventListener('input', updateTable);
    document.getElementById('participation-house').addEventListener('change', updateTable);
    updateTable();
}

function renderSubTabRegistrations(isRegistrationOpen) {
    const container = document.getElementById('subtab-registrations');
    const classes = state.classes;
    const houses = state.festHouses;

    container.innerHTML = `
        <div class="row g-2 mb-3 align-items-center">
            <div class="col-md-4">
                <input type="text" id="admin-reg-search" class="form-control form-control-sm" placeholder="Search by name / admission no...">
            </div>
            <div class="col-md-3">
                <select id="admin-reg-class" class="form-select form-select-sm">
                    <option value="">All Classes</option>
                    ${classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-3">
                <select id="admin-reg-house" class="form-select form-select-sm">
                    <option value="">All Houses</option>
                    ${houses.map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-2 text-end">
                <span class="badge bg-secondary py-2 w-100" id="admin-reg-total-count">0 Records</span>
            </div>
        </div>

        <div class="table-responsive border rounded" style="max-height: 500px; overflow-y: auto;">
            <table class="table table-sm table-hover align-middle mb-0" id="admin-participants-table">
                <thead class="table-light sticky-top">
                    <tr>
                        <th>Student Information</th>
                        <th>House</th>
                        <th>Enrolled Events</th>
                        <th class="text-end">Manage</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;

    function updateTable() {
        const term = document.getElementById('admin-reg-search').value.toLowerCase();
        const classFilter = document.getElementById('admin-reg-class').value;
        const houseFilter = document.getElementById('admin-reg-house').value;

        let students = state.students;
        if (classFilter) students = students.filter(s => s.classId === classFilter);
        if (houseFilter) students = students.filter(s => s.houseId === houseFilter);
        if (term) students = students.filter(s => s.name.toLowerCase().includes(term) || String(s.admissionNumber).includes(term));

        document.getElementById('admin-reg-total-count').textContent = `${students.length} Students`;
        const tbody = document.querySelector('#admin-participants-table tbody');

        if (students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted p-4">No matching students found.</td></tr>`;
            return;
        }

        tbody.innerHTML = students.map(s => {
            const regId = `${state.managingFest.id}_${s.id}`;
            const reg = state.festRegistrations.find(r => r.id === regId);
            const events = reg?.events || [];
            const house = state.festHouses.find(h => h.id === s.houseId);

            const badges = events.map(id => {
                const ev = state.festEvents.find(e => e.id === id);
                return ev ? `<span class="badge bg-light text-dark border me-1">${ev.name}</span>` : '';
            }).join('');

            return `
                <tr>
                    <td>
                        <strong>${s.name}</strong> 
                        <span class="badge bg-secondary-subtle text-secondary small ms-1">${getStudentCategory(s)}</span>
                        <div class="small text-muted">Adm: ${s.admissionNumber} | Class: ${getStudentClassName(s.classId, s.division)}</div>
                    </td>
                    <td>
                        ${house ? `<span class="color-dot-display" style="background-color:${house.color}"></span>${house.name}` : '<span class="text-muted small">None</span>'}
                    </td>
                    <td>${badges || '<small class="text-muted">No events</small>'}</td>
                    <td class="text-end">
                        <button class="btn btn-outline-primary btn-sm py-0" onclick="window.openEventAllocationModal('${s.id}')">
                            <i class="fas fa-edit me-1"></i>Events (${events.length})
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    document.getElementById('admin-reg-search').addEventListener('input', updateTable);
    document.getElementById('admin-reg-class').addEventListener('change', updateTable);
    document.getElementById('admin-reg-house').addEventListener('change', updateTable);

    updateTable();
}

// --- 5. CHEST NUMBER ALLOCATION SUB-TAB ---

function renderSubTabChestNumbers() {
    const container = document.getElementById('subtab-chest');
    const fest = state.managingFest;
    const houses = state.festHouses;

    container.innerHTML = `
        <div class="ui-card mb-3">
            <h6 class="fw-bold mb-2"><i class="fas fa-cogs me-1"></i>Bulk Chest Number Generator</h6>
            <div class="row g-2 align-items-end">
                <div class="col-md-3">
                    <label class="small fw-bold">Target House</label>
                    <select id="chest-house-picker" class="form-select form-select-sm">
                        <option value="">All Houses</option>
                        ${houses.map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="small fw-bold">Prefix</label>
                    <input type="text" id="chest-prefix" class="form-control form-control-sm" placeholder="e.g. A-">
                </div>
                <div class="col-md-3">
                    <label class="small fw-bold">Start Number</label>
                    <input type="number" id="chest-start-no" class="form-control form-control-sm" value="101">
                </div>
                <div class="col-md-3 d-flex gap-1">
                    <button class="btn btn-primary btn-sm w-100" onclick="window.generateChestNumbers()"><i class="fas fa-magic me-1"></i>Generate</button>
                    <button class="btn btn-outline-danger btn-sm" onclick="window.clearChestNumbers()"><i class="fas fa-eraser"></i></button>
                </div>
            </div>
        </div>

        <div class="table-responsive border rounded" style="max-height: 450px; overflow-y: auto;">
            <table class="table table-sm table-hover align-middle mb-0" id="chest-allocation-table">
                <thead class="table-light sticky-top">
                    <tr>
                        <th>Participant Name</th>
                        <th>House</th>
                        <th style="width: 200px;">Assigned Chest Number</th>
                        <th class="text-end">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.festRegistrations.filter(r => r.festId === fest.id).map(reg => {
                        const house = houses.find(h => h.id === reg.houseId);
                        return `
                            <tr data-reg-id="${reg.id}">
                                <td><strong>${reg.studentName}</strong></td>
                                <td>${house?.name || 'N/A'}</td>
                                <td>
                                    <input type="text" class="form-control form-control-sm chest-val-input" value="${reg.chestNo || ''}" placeholder="None">
                                </td>
                                <td class="text-end">
                                    <button class="btn btn-sm btn-outline-success py-0" onclick="window.saveSingleChestNumber('${reg.id}', this)">Save</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

window.generateChestNumbers = async function() {
    const fest = state.managingFest;
    const targetHouse = document.getElementById('chest-house-picker').value;
    const prefix = document.getElementById('chest-prefix').value.trim().toUpperCase();
    let counter = parseInt(document.getElementById('chest-start-no').value, 10) || 101;

    let targetRegs = state.festRegistrations.filter(r => r.festId === fest.id && (!targetHouse || r.houseId === targetHouse));
    if (targetRegs.length === 0) return window.showAlert('No registered participants match the criteria.', 'warning');

    targetRegs.sort((a, b) => a.studentName.localeCompare(b.studentName));

    const batch = writeBatch(db);
    targetRegs.forEach(reg => {
        const assignedNo = `${prefix}${counter++}`;
        reg.chestNo = assignedNo;
        batch.update(getScopedDoc('festRegistrations', reg.id), {
            chestNo: assignedNo,
            lastUpdated: serverTimestamp()
        });
    });

    try {
        await batch.commit();
        window.showAlert(`Assigned chest numbers to ${targetRegs.length} students.`, 'success');
        renderSubTabChestNumbers();
    } catch (err) {
        console.error(err);
        window.showAlert('Error generating chest numbers.', 'danger');
    }
};

window.clearChestNumbers = async function() {
    const fest = state.managingFest;
    const targetHouse = document.getElementById('chest-house-picker').value;
    if (!confirm('Clear chest numbers for selected criteria?')) return;

    let targetRegs = state.festRegistrations.filter(r => r.festId === fest.id && (!targetHouse || r.houseId === targetHouse));
    const batch = writeBatch(db);

    targetRegs.forEach(reg => {
        reg.chestNo = null;
        batch.update(getScopedDoc('festRegistrations', reg.id), {
            chestNo: null,
            lastUpdated: serverTimestamp()
        });
    });

    try {
        await batch.commit();
        window.showAlert('Chest numbers cleared.', 'info');
        renderSubTabChestNumbers();
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to clear chest numbers.', 'danger');
    }
};

window.saveSingleChestNumber = async function(regId, btn) {
    const row = btn.closest('tr');
    const inputVal = row.querySelector('.chest-val-input').value.trim().toUpperCase() || null;

    try {
        await updateScopedDoc('festRegistrations', regId, { chestNo: inputVal });
        const local = state.festRegistrations.find(r => r.id === regId);
        if (local) local.chestNo = inputVal;
        window.showAlert('Chest number updated.', 'success');
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to save chest number.', 'danger');
    }
};

// --- 6. HOUSE ALLOCATION SUB-TAB ---

function renderSubTabHouseAllocation() {
    const container = document.getElementById('subtab-houses');
    const houses = state.festHouses;
    const classes = state.classes;

    container.innerHTML = `
        <div class="row g-2 mb-3">
            <div class="col-md-5">
                <input type="text" id="house-alloc-search" class="form-control form-control-sm" placeholder="Search student...">
            </div>
            <div class="col-md-4">
                <select id="house-alloc-class" class="form-select form-select-sm">
                    <option value="">All Classes</option>
                    ${classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-3 text-end">
                <button class="btn btn-success btn-sm w-100" onclick="window.commitAllHouseAllocations()"><i class="fas fa-save me-1"></i>Save All Changes</button>
            </div>
        </div>

        <div class="table-responsive border rounded" style="max-height: 450px; overflow-y: auto;">
            <table class="table table-sm table-hover align-middle mb-0" id="house-allocation-table">
                <thead class="table-light sticky-top">
                    <tr>
                        <th>Student</th>
                        <th>Class</th>
                        <th>Assigned House</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;

    function updateAllocTable() {
        const term = document.getElementById('house-alloc-search').value.toLowerCase();
        const classFilter = document.getElementById('house-alloc-class').value;

        let students = state.students;
        if (classFilter) students = students.filter(s => s.classId === classFilter);
        if (term) students = students.filter(s => s.name.toLowerCase().includes(term) || String(s.admissionNumber).includes(term));

        const tbody = document.querySelector('#house-allocation-table tbody');
        tbody.innerHTML = students.map(s => `
            <tr data-student-id="${s.id}">
                <td><strong>${s.name}</strong> <small class="text-muted">(${s.admissionNumber})</small></td>
                <td>${getStudentClassName(s.classId, s.division)}</td>
                <td>
                    <select class="form-select form-select-sm house-select-picker">
                        <option value="">-- No House --</option>
                        ${houses.map(h => `<option value="${h.id}" ${s.houseId === h.id ? 'selected' : ''}>${h.name}</option>`).join('')}
                    </select>
                </td>
            </tr>
        `).join('');
    }

    document.getElementById('house-alloc-search').addEventListener('input', updateAllocTable);
    document.getElementById('house-alloc-class').addEventListener('change', updateAllocTable);
    updateAllocTable();
}

window.commitAllHouseAllocations = async function() {
    const rows = document.querySelectorAll('#house-allocation-table tbody tr');
    const batch = writeBatch(db);
    let count = 0;

    rows.forEach(r => {
        const studentId = r.dataset.studentId;
        const houseId = r.querySelector('.house-select-picker').value || null;
        const student = state.students.find(s => s.id === studentId);

        if (student && student.houseId !== houseId) {
            student.houseId = houseId;
            batch.update(getScopedDoc('students', studentId), {
                houseId: houseId,
                lastUpdated: serverTimestamp()
            });
            count++;
        }
    });

    if (count === 0) return window.showAlert('No house changes to save.', 'info');

    try {
        await batch.commit();
        window.showAlert(`Saved house assignments for ${count} students.`, 'success');
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to save house allocations.', 'danger');
    }
};

// --- 7. BULK CSV / EXCEL INGESTION ---

function renderCsvUploadTab() {
    const container = document.getElementById('tab-csv');
    container.innerHTML = `
        <div class="row g-4">
            <div class="col-md-6">
                <div class="ui-card h-100">
                    <h5 class="section-header"><i class="fas fa-chalkboard me-2"></i>Bulk Classrooms Upload</h5>
                    <p class="small text-muted">Upload CSV to set up classes and divisions for the active academic year.</p>
                    <div class="alert alert-secondary py-2 small">
                        <strong>Expected Headers:</strong> <code>className,divisions,order</code><br>
                        <em>Example:</em> Grade 5,"A,B,C",1
                    </div>
                    <input type="file" id="csv-classes-file" class="form-control form-control-sm mb-3" accept=".csv">
                    <button class="btn btn-primary btn-sm" onclick="window.processClassesCsv()">
                        <i class="fas fa-upload me-1"></i>Import Classrooms
                    </button>
                </div>
            </div>

            <div class="col-md-6">
                <div class="ui-card h-100">
                    <h5 class="section-header"><i class="fas fa-user-graduate me-2"></i>Bulk Students Ingestion</h5>
                    <p class="small text-muted">Upload students roster to match with houses and register them for fests.</p>
                    <div class="alert alert-secondary py-2 small">
                        <strong>Expected Headers:</strong> <code>admissionNumber,name,dob,gender,classId,division,houseId</code><br>
                        <em>Example:</em> 10452,Rahul Kumar,2010-04-12,M,Grade 5,A,RED
                    </div>
                    <input type="file" id="csv-students-file" class="form-control form-control-sm mb-3" accept=".csv">
                    <button class="btn btn-success btn-sm" onclick="window.processStudentsCsv()">
                        <i class="fas fa-upload me-1"></i>Import Students
                    </button>
                </div>
            </div>
        </div>
    `;
}

window.processClassesCsv = function() {
    const file = document.getElementById('csv-classes-file')?.files[0];
    if (!file) return window.showAlert('Please select a Classrooms CSV file first.', 'warning');

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            const items = results.data.map(row => ({
                id: row.className.trim().replace(/\s+/g, '_').toUpperCase(),
                name: row.className.trim(),
                divisions: row.divisions ? row.divisions.split(',').map(d => d.trim()) : [],
                order: parseInt(row.order, 10) || 99
            }));

            try {
                await batchWriteScoped('classes', items);
                window.showAlert(`Successfully uploaded ${items.length} classrooms.`, 'success');
                await loadAllYearData(true);
            } catch (err) {
                console.error(err);
                window.showAlert('Error importing classes.', 'danger');
            }
        }
    });
};

window.processStudentsCsv = function() {
    const file = document.getElementById('csv-students-file')?.files[0];
    if (!file) return window.showAlert('Please select a Students CSV file first.', 'warning');

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            const items = results.data.map(row => {
                const adm = String(row.admissionNumber).trim();
                return {
                    id: adm,
                    admissionNumber: adm,
                    name: row.name?.trim(),
                    dob: row.dob?.trim(),
                    gender: row.gender?.trim().toUpperCase(),
                    classId: row.classId?.trim().replace(/\s+/g, '_').toUpperCase(),
                    division: row.division?.trim(),
                    houseId: row.houseId?.trim().toUpperCase()
                };
            }).filter(s => s.id && s.name);

            try {
                await batchWriteScoped('students', items);
                window.showAlert(`Successfully imported ${items.length} students.`, 'success');
                await loadAllYearData(true);
            } catch (err) {
                console.error(err);
                window.showAlert('Error importing students.', 'danger');
            }
        }
    });
};

// --- 8. DIRECT HOUSE PORTALS & USERS ---

function renderAccessLinksTab() {
    const container = document.getElementById('tab-links');
    const fest = state.managingFest;
    const houses = state.festHouses;
    const judges = fest.judgeCodes || [];
    const events = state.festEvents.filter(e => e.festId === fest.id);

    container.innerHTML = `
        <div class="row g-4">
            <div class="col-lg-6">
                <div class="ui-card">
                    <h5 class="section-header"><i class="fas fa-user-lock me-2"></i>House & Admin User Logins</h5>
                    <p class="small text-muted">Provision login accounts for House Captains or Administrators (stored securely in <code>festUsers</code> collection).</p>
                    
                    <div class="border rounded p-3 bg-light mb-3">
                        <div class="row g-2">
                            <div class="col-6">
                                <label class="small fw-bold">Username</label>
                                <input type="text" id="usr-in-username" class="form-control form-control-sm" placeholder="e.g. red_captain">
                            </div>
                            <div class="col-6">
                                <label class="small fw-bold">Password</label>
                                <input type="password" id="usr-in-password" class="form-control form-control-sm" placeholder="Secret Password">
                            </div>
                            <div class="col-6 mt-2">
                                <label class="small fw-bold">Role</label>
                                <select id="usr-in-role" class="form-select form-select-sm" onchange="window.toggleUserHouseField(this.value)">
                                    <option value="houseCaptain">House Captain</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                            <div class="col-6 mt-2" id="usr-house-col">
                                <label class="small fw-bold">Linked House</label>
                                <select id="usr-in-house" class="form-select form-select-sm">
                                    <option value="">-- Choose House --</option>
                                    ${houses.map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <button class="btn btn-success btn-sm w-100 mt-3" onclick="window.createSystemUser()">
                            <i class="fas fa-plus me-1"></i>Create Account
                        </button>
                    </div>

                    <h6 class="small fw-bold text-muted mb-2">Direct House Portal URLs</h6>
                    <div class="alert alert-primary py-2 small d-flex justify-content-between align-items-center">
                        <span><i class="fas fa-lock me-1"></i>Protected Admin Portal</span>
                        <button class="btn btn-primary btn-sm" onclick="window.copyAdminPortalLink()"><i class="fas fa-copy me-1"></i>Copy Admin Link</button>
                    </div>
                    <table class="table table-sm align-middle">
                        <thead><tr><th>House</th><th>Portal Password</th><th>Direct Access</th></tr></thead>
                        <tbody>
                            ${houses.map(h => `
                                <tr>
                                    <td><span class="color-dot-display" style="background-color: ${h.color}"></span> <strong>${h.name}</strong></td>
                                    <td>
                                        <div class="input-group input-group-sm">
                                            <input type="password" class="form-control" id="house-password-${h.id}" placeholder="${fest.housePasswords?.[h.id] ? 'Password saved' : 'Set password'}">
                                            <button class="btn btn-outline-success" onclick="window.saveHousePortalPassword('${h.id}')"><i class="fas fa-save"></i></button>
                                        </div>
                                    </td>
                                    <td>
                                        <button class="btn btn-outline-secondary btn-sm py-0" onclick="window.copyHousePortalLink('${fest.id}', '${h.id}')">
                                            <i class="fas fa-copy me-1"></i> Copy Link
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="col-lg-6">
                <div class="ui-card">
                    <h5 class="section-header"><i class="fas fa-qrcode me-2"></i>Judge Scoring & QR Links</h5>
                    <p class="small text-muted">Add active judges and produce instant access scoring links.</p>
                    <div class="input-group input-group-sm mb-3">
                        <input type="text" id="judge-in-name" class="form-control" placeholder="Judge Name">
                        <input type="text" id="judge-in-code" class="form-control" placeholder="Code (e.g. J101)">
                        <button class="btn btn-primary" onclick="window.addJudgeCode()">Add Judge</button>
                    </div>
                    
                    <label class="small fw-bold mb-1">Select Event for Link Generation</label>
                    <select id="judge-event-picker" class="form-select form-select-sm mb-3" onchange="window.renderJudgeLinksList(this.value)">
                        <option value="">-- Choose an Event --</option>
                        ${events.map(ev => `<option value="${ev.id}">${ev.name} (${ev.category})</option>`).join('')}
                    </select>

                    <div id="judge-links-results"></div>

                    <hr>
                    <h6 class="small fw-bold text-muted mb-2">Assign Judges To Events</h6>
                    <div class="table-responsive">
                        <table class="table table-sm align-middle">
                            <thead><tr><th>Event</th><th>Stage</th><th>Assigned Judges</th><th></th></tr></thead>
                            <tbody>
                                ${events.map(event => `
                                    <tr data-event-id="${event.id}">
                                        <td><strong>${event.name}</strong><div class="small text-muted">${event.category} | ${event.isGroupEvent ? 'Group' : 'Solo'}</div></td>
                                        <td><span class="badge ${event.stage === 'Stage 2' ? 'bg-warning text-dark' : 'bg-primary'}">${event.stage || 'Stage 1'}</span></td>
                                        <td><select class="form-select form-select-sm event-judge-picker" multiple size="${Math.min(Math.max(judges.length, 1), 4)}">${judges.map(judge => `<option value="${judge.code}" ${(event.judgeIds || []).includes(judge.code) ? 'selected' : ''}>${judge.name} (${judge.code})</option>`).join('')}</select></td>
                                        <td class="text-end"><button class="btn btn-outline-success btn-sm" onclick="window.saveEventJudges('${event.id}', this)"><i class="fas fa-save"></i></button></td>
                                    </tr>
                                `).join('') || '<tr><td colspan="3" class="text-muted">Create events first.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.toggleUserHouseField = function(role) {
    const col = document.getElementById('usr-house-col');
    if (role === 'admin') {
        col.classList.add('d-none');
    } else {
        col.classList.remove('d-none');
    }
};

window.createSystemUser = async function() {
    const username = document.getElementById('usr-in-username').value.trim().toLowerCase();
    const plainPassword = document.getElementById('usr-in-password').value.trim();
    const role = document.getElementById('usr-in-role').value;
    const houseId = role === 'houseCaptain' ? document.getElementById('usr-in-house').value : null;

    if (!username || !plainPassword) {
        return window.showAlert('Please fill both Username and Password.', 'warning');
    }
    if (role === 'houseCaptain' && !houseId) {
        return window.showAlert('Please select a House to link this Captain account.', 'warning');
    }

    try {
        const passwordHash = await hashPassword(plainPassword);
        const payload = {
            id: username,
            username: username,
            passwordHash: passwordHash,
            role: role,
            houseId: houseId,
            name: role === 'admin' ? `Admin (${username})` : `${houseId} Captain`
        };

        await saveScopedDoc('festUsers', username, payload);
        window.showAlert(`User '${username}' registered in festUsers!`, 'success');

        document.getElementById('usr-in-username').value = '';
        document.getElementById('usr-in-password').value = '';
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to save user account.', 'danger');
    }
};

window.copyHousePortalLink = function(festId, houseId) {
    const root = window.location.href.split('#')[0];
    const targetUrl = `${root}#fest-entry?year=${systemContext.activeYearId}&fest=${festId}&house=${houseId}`;
    navigator.clipboard.writeText(targetUrl);
    window.showAlert('House entry link copied to clipboard!', 'success');
};

window.copyAdminPortalLink = function() {
    const root = window.location.href.split('#')[0];
    navigator.clipboard.writeText(`${root}#fest-admin`);
    window.showAlert('Admin portal link copied to clipboard.', 'success');
};

window.saveHousePortalPassword = async function(houseId) {
    const input = document.getElementById(`house-password-${houseId}`);
    const password = input?.value.trim();
    if (!password) return window.showAlert('Enter a password before saving.', 'warning');

    const fest = state.managingFest;
    const passwordHash = await hashPassword(password);
    const housePasswords = { ...(fest.housePasswords || {}), [houseId]: passwordHash };
    try {
        await updateScopedDoc('fests', fest.id, { housePasswords });
        fest.housePasswords = housePasswords;
        input.value = '';
        input.placeholder = 'Password saved';
        window.showAlert('House portal password saved.', 'success');
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to save house portal password.', 'danger');
    }
};

window.addJudgeCode = async function() {
    const name = document.getElementById('judge-in-name').value.trim();
    const code = document.getElementById('judge-in-code').value.trim().toUpperCase();
    if (!name || !code) return window.showAlert('Provide both a judge name and unique code.', 'warning');

    const fest = state.managingFest;
    const judgeCodes = [...(fest.judgeCodes || [])];

    if (judgeCodes.some(j => j.code === code)) {
        return window.showAlert(`Code ${code} is already allocated.`, 'danger');
    }

    judgeCodes.push({ name, code });

    try {
        await updateScopedDoc('fests', fest.id, { judgeCodes });
        fest.judgeCodes = judgeCodes;
        window.showAlert('Judge registered.', 'success');
        document.getElementById('judge-in-name').value = '';
        document.getElementById('judge-in-code').value = '';
        renderAccessLinksTab();
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to add judge.', 'danger');
    }
};

window.renderJudgeLinksList = function(eventId) {
    const container = document.getElementById('judge-links-results');
    if (!eventId) {
        container.innerHTML = '';
        return;
    }

    const fest = state.managingFest;
    const allJudges = fest.judgeCodes || [];
    const event = state.festEvents.find(item => item.id === eventId);
    const assignedCodes = event?.judgeIds || [];
    const judges = allJudges.filter(judge => assignedCodes.includes(judge.code));
    const root = window.location.href.split('#')[0];

    if (judges.length === 0) {
        container.innerHTML = `<p class="small text-warning">No judges are assigned to this event. Select judges in the event assignment table first.</p>`;
        return;
    }

    container.innerHTML = `
        <ul class="list-group list-group-flush small">
            ${judges.map(j => {
                const link = `${root}#fest-judge?year=${systemContext.activeYearId}&fest=${fest.id}&event=${eventId}&code=${j.code}`;
                return `
                    <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                        <div>
                            <strong>${j.name}</strong> <span class="badge bg-light text-dark">Code: ${j.code}</span>
                        </div>
                        <button class="btn btn-xs btn-outline-secondary" onclick="navigator.clipboard.writeText('${link}'); window.showAlert('Judge link copied!', 'success');">
                            <i class="fas fa-copy"></i> Copy Link
                        </button>
                    </li>
                `;
            }).join('')}
        </ul>
    `;
};

window.saveEventJudges = async function(eventId, button) {
    const row = button.closest('tr');
    const judgeIds = Array.from(row.querySelector('.event-judge-picker').selectedOptions).map(option => option.value);
    const event = state.festEvents.find(item => item.id === eventId);
    if (!event) return window.showAlert('Event not found.', 'danger');
    try {
        await updateScopedDoc('festEvents', eventId, { judgeIds });
        event.judgeIds = judgeIds;
        window.showAlert(judgeIds.length ? 'Judges assigned to event.' : 'Judge assignment cleared.', 'success');
        const selectedEvent = document.getElementById('judge-event-picker')?.value;
        if (selectedEvent === eventId) window.renderJudgeLinksList(eventId);
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to save event judges.', 'danger');
    }
};

window.logoutAdmin = function() {
    logoutUser();
    window.location.hash = '#fest-admin';
    window.checkForAdminMode();
};