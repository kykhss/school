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
    loadAcademicYears,
    initializeAppState,
    getStudentClassName,
    getStudentCategory,
    hashPassword,
    loginWithUsername,
    logoutUser,
    eventHouseLimit
} from "./app-state.js";

import { 
    writeBatch, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { setActiveYear } from "./firebase-config.js";

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

    try {
        await loadAcademicYears();
    } catch (error) {
        console.error("Unable to load academic years:", error);
    }

    const activeYear = state.academicYears.find(year => year.status === 'active' || year.active);
    const selectedYearId = activeYear?.id || state.academicYears[0]?.id || '';
    if (selectedYearId) setActiveYear(selectedYearId);

    document.body.innerHTML = `
        <div class="vh-100 d-flex align-items-center justify-content-center bg-light">
            <div class="card shadow border-0" style="max-width: 410px; width: 100%;"><div class="card-body p-4">
                <h4 class="fw-bold mb-1"><i class="fas fa-lock text-primary me-2"></i>Fest Admin Portal</h4>
                <p class="text-muted small">Sign in with an administrator account from festUsers.</p>
                <form id="fest-admin-login-form">
                    <label for="fest-admin-year" class="form-label small fw-bold">Academic Year</label>
                    <select id="fest-admin-year" class="form-select mb-3" ${state.academicYears.length ? '' : 'disabled'} required>
                        ${state.academicYears.length
                            ? state.academicYears.map(year => `<option value="${year.id}" ${year.id === selectedYearId ? 'selected' : ''}>${year.label || year.id}</option>`).join('')
                            : '<option value="">No academic years available</option>'}
                    </select>
                    <input id="fest-admin-username" class="form-control mb-2" placeholder="Username" autocomplete="username" required>
                    <input id="fest-admin-password" type="password" class="form-control mb-3" placeholder="Password" autocomplete="current-password" required>
                    <label class="form-check small mb-3"><input id="fest-admin-remember" type="checkbox" class="form-check-input me-1" checked> Remember this device</label>
                    <button class="btn btn-primary w-100" type="submit" ${state.academicYears.length ? '' : 'disabled'}>Sign In</button>
                </form>
                <div id="fest-admin-login-error" class="small text-danger mt-3"></div>
            </div></div>
        </div>`;

    document.getElementById('fest-admin-year').addEventListener('change', event => {
        setActiveYear(event.target.value);
    });

    document.getElementById('fest-admin-login-form').addEventListener('submit', async event => {
        event.preventDefault();
        setActiveYear(document.getElementById('fest-admin-year').value);
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
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-certificate"><i class="fas fa-certificate me-2"></i>Certificate</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-result-entry"><i class="fas fa-square-poll-vertical me-2"></i>Result Entry</button></li>
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
            <div class="tab-pane fade" id="tab-certificate"></div>
            <div class="tab-pane fade" id="tab-result-entry"></div>
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
    if (typeof window.renderCertificateTab === 'function') window.renderCertificateTab();
    if (typeof window.renderResultEntryTab === 'function') window.renderResultEntryTab();
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
    if (!container || !fest) return;

    const participants = state.festRegistrations.filter(r => r.festId === fest.id);
    const events = state.festEvents.filter(e => e.festId === fest.id);
    const houses = state.festHouses;
    const stages = fest.stages?.length ? fest.stages : ['Main Stage'];
    const finalizedResults = state.festResults.filter(result => result.festId === fest.id && events.some(event => event.id === result.eventId && event.cancelled !== true));
    const completedEventIds = new Set(finalizedResults.map(result => result.eventId));
    const housePoints = new Map(houses.map(house => [house.id, { house, points: 0, wins: 0 }]));
    const resultWinners = new Map();

    finalizedResults.forEach(result => {
        const winners = [];
        (result.results || []).forEach(standing => {
            const group = standing.groupId ? state.festGroups.find(item => item.id === standing.groupId) : null;
            const registration = standing.studentId ? participants.find(item => item.studentId === standing.studentId) : null;
            const student = standing.studentId ? state.students.find(item => item.id === standing.studentId) : null;
            const houseId = group?.houseId || registration?.houseId || student?.houseId;
            const houseScore = housePoints.get(houseId);
            const points = Number(standing.points) || 0;

            if (houseScore) {
                houseScore.points += points;
                if (Number(standing.position) === 1) houseScore.wins += 1;
            }
            if (Number(standing.position) <= 3) {
                winners.push({
                    position: standing.position,
                    name: group?.name || registration?.studentName || student?.name || 'Participant',
                    house: houseScore?.house
                });
            }
        });
        resultWinners.set(result.eventId, winners.sort((a, b) => a.position - b.position));
    });

    const houseRanking = [...housePoints.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || a.house.name.localeCompare(b.house.name));
    
    const eventSummaries = events.map(event => {
        const registrations = participants.filter(registration => registration.events?.includes(event.id));
        const groups = state.festGroups.filter(group => group.festId === fest.id && group.eventId === event.id);
        const participantCount = event.isGroupEvent
            ? groups.reduce((total, group) => total + (group.members?.length || 0), 0)
            : registrations.length;
        return {
            event,
            groups,
            participantCount,
            registrationCount: event.isGroupEvent ? groups.length : registrations.length,
            cancelled: event.cancelled === true,
            completed: event.cancelled !== true && completedEventIds.has(event.id),
            winners: resultWinners.get(event.id) || []
        };
    });

    const completedCount = eventSummaries.filter(item => item.completed).length;
    const pendingSummaries = eventSummaries.filter(item => !item.completed && !item.cancelled);
    const categories = [...new Set(events.map(e => e.category || 'General'))].sort();

    container.innerHTML = `
        <!-- Top Stats Row -->
        <div class="row g-3">
            <div class="col-6 col-md-3">
                <div class="ui-card-stat">
                    <div class="stat-icon bg-primary"><i class="fas fa-users"></i></div>
                    <div>
                        <div class="stat-number">${participants.length}</div>
                        <div class="stat-label">Registered Students</div>
                    </div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="ui-card-stat">
                    <div class="stat-icon bg-info"><i class="fas fa-calendar-alt"></i></div>
                    <div>
                        <div class="stat-number">${events.length}</div>
                        <div class="stat-label">Total Events</div>
                    </div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="ui-card-stat">
                    <div class="stat-icon bg-success"><i class="fas fa-shield-alt"></i></div>
                    <div>
                        <div class="stat-number">${houses.length}</div>
                        <div class="stat-label">Competing Houses</div>
                    </div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="ui-card-stat">
                    <div class="stat-icon bg-warning"><i class="fas fa-gavel"></i></div>
                    <div>
                        <div class="stat-number">${fest.judgeCodes?.length || 0}</div>
                        <div class="stat-label">Active Judges</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Live Event Preview Section -->
        <div class="ui-card mt-4 mb-0">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div>
                    <h5 class="section-header mb-1"><i class="fas fa-timeline me-2 text-primary"></i>Live Programme Preview</h5>
                    <div class="small text-muted">${completedCount} of ${events.length} events completed. Pending items are ready for scoring.</div>
                </div>
                <div class="d-flex flex-wrap gap-1">
                    <button class="btn btn-sm btn-outline-danger" type="button" onclick="window.printProgrammeChecklist()">
                        <i class="fas fa-print me-1"></i>Print Programme Checklist
                    </button>
                    <button class="btn btn-sm btn-outline-primary" type="button" onclick="window.refreshDashboardPreview()" title="Refresh live status">
                        <i class="fas fa-arrows-rotate"></i>
                    </button>
                </div>
            </div>

            <!-- Multi-Filter Toolbar -->
            <div class="row g-2 mb-3 align-items-end p-2 bg-light rounded border">
                <div class="col-12 col-md-3">
                    <label class="small fw-bold mb-1" style="font-size: 0.72rem;">Search Event</label>
                    <input type="search" id="dash-event-search" class="form-control form-control-sm" placeholder="Event name or stage...">
                </div>

                <div class="col-6 col-md-2">
                    <label class="small fw-bold mb-1" style="font-size: 0.72rem;">Category</label>
                    <select id="dash-filter-category" class="form-select form-select-sm">
                        <option value="all">All Categories</option>
                        ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>

                <div class="col-6 col-md-2">
                    <label class="small fw-bold mb-1" style="font-size: 0.72rem;">Stage Scope</label>
                    <select id="dash-filter-stage" class="form-select form-select-sm">
                        <option value="all">All Stages</option>
                        <option value="onStage">On-Stage Only</option>
                        <option value="offStage">Off-Stage Only</option>
                    </select>
                </div>

                <div class="col-6 col-md-2">
                    <label class="small fw-bold mb-1" style="font-size: 0.72rem;">Mode</label>
                    <select id="dash-filter-mode" class="form-select form-select-sm">
                        <option value="all">All Modes</option>
                        <option value="solo">Solo Only</option>
                        <option value="group">Group Only</option>
                    </select>
                </div>

                <div class="col-6 col-md-3">
                    <label class="small fw-bold mb-1 d-block" style="font-size: 0.72rem;">Status Quick Toggle</label>
                    <div class="btn-group btn-group-sm w-100" role="group">
                        <button type="button" class="btn btn-outline-secondary active dash-status-btn" data-status="all">All</button>
                        <button type="button" class="btn btn-outline-warning dash-status-btn" data-status="pending">Pending (${pendingSummaries.length})</button>
                        <button type="button" class="btn btn-outline-success dash-status-btn" data-status="completed">Done (${completedCount})</button>
                    </div>
                </div>
            </div>

            <!-- Grouped Category Cards Container -->
            <div id="dashboard-category-sections">
                ${categories.map(cat => {
                    const catEvents = eventSummaries.filter(item => (item.event.category || 'General') === cat);
                    if (!catEvents.length) return '';

                    return `
                        <div class="category-block mb-3" data-category="${cat}">
                            <div class="d-flex align-items-center justify-content-between p-2 mb-2 rounded bg-light border-start border-primary border-4 shadow-xs">
                                <span class="fw-bold text-dark fs-6">
                                    <i class="fas fa-layer-group text-primary me-1"></i>Category: ${cat}
                                </span>
                                <span class="badge bg-secondary-subtle text-secondary border category-count-badge">
                                    ${catEvents.length} Programmes
                                </span>
                            </div>

                            <div class="row g-3">
                                ${catEvents.map(item => {
                                    const ev = item.event;
                                    const isOffStage = ev.type === 'offStage';
                                    const isGroup = ev.isGroupEvent;

                                    return `
                                        <div class="col-12 col-md-6 col-xl-4 dashboard-event-card" 
                                             data-event-id="${ev.id}"
                                             data-event-name="${ev.name.toLowerCase()} ${(ev.stage || '').toLowerCase()}"
                                             data-category="${cat}"
                                             data-stage="${isOffStage ? 'offStage' : 'onStage'}"
                                             data-mode="${isGroup ? 'group' : 'solo'}"
                                             data-status="${item.cancelled ? 'cancelled' : item.completed ? 'completed' : 'pending'}">
                                            
                                            <div class="card h-100 border-${item.cancelled ? 'secondary' : item.completed ? 'success' : 'warning'} ${item.cancelled ? 'bg-light opacity-75' : item.completed ? 'bg-success-subtle' : 'bg-warning-subtle'} shadow-sm">
                                                <div class="card-body p-3 d-flex flex-column">
                                                    
                                                    <!-- Top Card Title & Quick Status Actions -->
                                                    <div class="d-flex justify-content-between align-items-start gap-1 mb-2">
                                                        <div class="text-truncate me-1">
                                                            <div class="d-flex align-items-center gap-1">
                                                                <i class="fas ${isOffStage ? 'fa-palette text-success' : 'fa-microphone-lines text-primary'}" style="font-size: 0.8rem;"></i>
                                                                <strong class="text-dark d-block text-truncate" style="font-size: 0.88rem;">${ev.name}</strong>
                                                            </div>
                                                            <div class="small text-muted" style="font-size: 0.7rem;">
                                                                ${isOffStage ? 'Off-Stage' : 'On-Stage'} &bull; ${isGroup ? 'Group Team' : 'Solo'}
                                                            </div>
                                                        </div>

                                                        <div class="d-flex align-items-center gap-1 flex-shrink-0">
                                                            <span class="badge ${item.cancelled ? 'bg-secondary' : item.completed ? 'bg-success' : 'bg-warning text-dark'}" style="font-size: 0.65rem;">
                                                                ${item.cancelled ? 'Cancelled' : item.completed ? 'Entered' : 'Pending'}
                                                            </span>
                                                            <div class="dropdown">
                                                                <button class="btn btn-xs btn-outline-secondary py-0 px-1 border-0" type="button" data-bs-toggle="dropdown" title="Quick Settings">
                                                                    <i class="fas fa-ellipsis-v"></i>
                                                                </button>
                                                                <ul class="dropdown-menu dropdown-menu-end shadow-sm small py-1" style="font-size: 0.76rem;">
                                                                    <li>
                                                                        <button class="dropdown-item py-1" type="button" onclick="window.toggleEventCancellation('${ev.id}')">
                                                                            <i class="fas ${item.cancelled ? 'fa-rotate-left text-success' : 'fa-ban text-danger'} me-1"></i>
                                                                            ${item.cancelled ? 'Restore Programme' : 'Cancel Programme'}
                                                                        </button>
                                                                    </li>
                                                                    <li>
                                                                        <button class="dropdown-item py-1" type="button" onclick="window.openQuickScoreEdit('${ev.id}')">
                                                                            <i class="fas fa-square-poll-vertical text-primary me-1"></i>Enter / View Results
                                                                        </button>
                                                                    </li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <!-- Counters -->
                                                    <div class="row g-1 text-center my-1">
                                                        <div class="col-6">
                                                            <div class="border rounded p-1 bg-white">
                                                                <strong class="h6 mb-0 d-block">${item.participantCount}</strong>
                                                                <small class="text-muted" style="font-size: 0.65rem;">Members</small>
                                                            </div>
                                                        </div>
                                                        <div class="col-6">
                                                            <div class="border rounded p-1 bg-white">
                                                                <strong class="h6 mb-0 d-block">${item.registrationCount}</strong>
                                                                <small class="text-muted" style="font-size: 0.65rem;">${isGroup ? 'Teams' : 'Entries'}</small>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <!-- Card Bottom: Stage & Placements -->
                                                    <div class="mt-auto pt-2 border-top">
                                                        <div class="d-flex justify-content-between align-items-center small" style="font-size: 0.7rem;">
                                                            <span class="text-muted"><i class="fas fa-location-dot me-1"></i>${ev.stage || stages[0]}</span>
                                                            <span class="badge bg-light text-dark border">${ev.gender || 'Common'}</span>
                                                        </div>

                                                        ${item.winners.length && !item.cancelled ? `
                                                            <div class="mt-1 pt-1 border-top" style="font-size: 0.72rem;">
                                                                ${item.winners.map(w => `
                                                                    <div class="d-flex justify-content-between align-items-center mb-0">
                                                                        <span class="text-truncate">
                                                                            <span class="fw-bold me-1">${w.position === 1 ? '🥇' : w.position === 2 ? '🥈' : '🥉'}</span>
                                                                            <span>${w.name}</span>
                                                                        </span>
                                                                        <span class="badge border py-0 px-1 ms-1 flex-shrink-0" style="background:#fff; color:${w.house?.color || '#333'}; border-color:${w.house?.color || '#ccc'} !important;">
                                                                            ${w.house?.name || 'N/A'}
                                                                        </span>
                                                                    </div>
                                                                `).join('')}
                                                            </div>
                                                        ` : ''}
                                                    </div>

                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('') || '<div class="alert alert-light border text-center p-4">No events found.</div>'}
            </div>
        </div>

        <!-- House Championship Table -->
        <div class="ui-card mt-4 mb-0">
            <h5 class="section-header mb-3"><i class="fas fa-ranking-star me-2 text-warning"></i>House-wise Overall Ranking</h5>
            <div class="table-responsive border rounded bg-white">
                <table class="table table-sm align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th style="width: 70px;">Rank</th>
                            <th>House Name</th>
                            <th class="text-center" style="width: 140px;">1st Place Wins</th>
                            <th class="text-end" style="width: 120px;">Total Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${houseRanking.map((item, index) => `
                            <tr>
                                <td><strong class="fs-6">${item.points > 0 ? `#${index + 1}` : '-'}</strong></td>
                                <td>
                                    <span class="color-dot-display me-1" style="background-color: ${item.house.color || '#6c757d'}"></span>
                                    <strong>${item.house.name}</strong>
                                </td>
                                <td class="text-center">${item.wins}</td>
                                <td class="text-end">
                                    <span class="badge ${index === 0 && item.points > 0 ? 'bg-success' : 'bg-primary'} px-2 py-1 fs-6">
                                        ${item.points}
                                    </span>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="4" class="text-muted p-3">No houses configured.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Multi-Filter Engine
    const searchInput = document.getElementById('dash-event-search');
    const catSelect = document.getElementById('dash-filter-category');
    const stageSelect = document.getElementById('dash-filter-stage');
    const modeSelect = document.getElementById('dash-filter-mode');
    let activeStatus = 'all';

    function applyDashboardFilters() {
        const query = (searchInput?.value || '').trim().toLowerCase();
        const selectedCat = catSelect?.value || 'all';
        const selectedStage = stageSelect?.value || 'all';
        const selectedMode = modeSelect?.value || 'all';

        document.querySelectorAll('.category-block').forEach(catBlock => {
            const blockCat = catBlock.dataset.category;
            const matchesCategoryBlock = selectedCat === 'all' || blockCat === selectedCat;

            let visibleInBlock = 0;

            catBlock.querySelectorAll('.dashboard-event-card').forEach(card => {
                const name = card.dataset.eventName;
                const stage = card.dataset.stage;
                const mode = card.dataset.mode;
                const status = card.dataset.status;

                const matchesSearch = !query || name.includes(query);
                const matchesStage = selectedStage === 'all' || stage === selectedStage;
                const matchesMode = selectedMode === 'all' || mode === selectedMode;
                const matchesStatus = activeStatus === 'all' || status === activeStatus;

                const isVisible = matchesCategoryBlock && matchesSearch && matchesStage && matchesMode && matchesStatus;
                card.classList.toggle('d-none', !isVisible);

                if (isVisible) visibleInBlock++;
            });

            // Toggle category header block based on child visibility
            catBlock.classList.toggle('d-none', visibleInBlock === 0);
            const countBadge = catBlock.querySelector('.category-count-badge');
            if (countBadge) countBadge.textContent = `${visibleInBlock} Programmes`;
        });
    }

    searchInput?.addEventListener('input', applyDashboardFilters);
    catSelect?.addEventListener('change', applyDashboardFilters);
    stageSelect?.addEventListener('change', applyDashboardFilters);
    modeSelect?.addEventListener('change', applyDashboardFilters);

    document.querySelectorAll('.dash-status-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dash-status-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeStatus = btn.dataset.status;
            applyDashboardFilters();
        });
    });
}

// Quick jump to result entry from dashboard gear
window.openQuickScoreEdit = function(eventId) {
    const tabBtn = document.querySelector('button[data-bs-target="#tab-result-entry"]');
    if (tabBtn) tabBtn.click();
    setTimeout(() => {
        if (typeof window.loadResultEvent === 'function') {
            window.loadResultEvent(eventId);
        }
    }, 100);
};

window.filterDashboardEvents = function(status) {
    document.querySelectorAll('.dashboard-event-card').forEach(card => {
        card.classList.toggle('d-none', status !== 'all' && card.dataset.entryStatus !== status);
    });
};

window.refreshDashboardPreview = async function() {
    try {
        await loadAllYearData(true);
        renderDashboardTab();
        window.showAlert('Event preview refreshed.', 'success');
    } catch (error) {
        console.error(error);
        window.showAlert('Unable to refresh event preview.', 'danger');
    }
};

window.saveDashboardEventStage = async function(eventId, button) {
    const event = state.festEvents.find(item => item.id === eventId);
    const row = button.closest('.input-group');
    const stage = row?.querySelector('.dashboard-event-stage')?.value;
    if (!event || !stage) return window.showAlert('Choose a valid stage.', 'warning');

    try {
        await updateScopedDoc('festEvents', eventId, { stage });
        event.stage = stage;
        window.showAlert('Event stage saved.', 'success');
    } catch (error) {
        console.error(error);
        window.showAlert('Failed to save event stage.', 'danger');
    }
};

// =========================================================================
// --- FEST SETUP & RULES TAB ---
// =========================================================================

function renderSetupTab() {
    const container = document.getElementById('tab-setup');
    const fest = state.managingFest;
    const settings = fest.settings || {};
    const houses = state.festHouses;
    const stages = fest.stages?.length ? fest.stages : ['Main Stage'];
    const houseLimits = settings.houseEventLimits || { onStage: { solo: 2, group: 1 }, offStage: { solo: 2, group: 1 } };

    container.innerHTML = `
        <div class="row g-4">
            <div class="col-lg-6">
                <!-- Conduct Stages -->
                <div class="ui-card">
                    <h5 class="section-header"><i class="fas fa-layer-group me-2"></i>Conduct Venues / Stages</h5>
                    <div id="fest-stages-list" class="mb-2">
                        ${stages.map(stage => `
                            <div class="input-group input-group-sm mb-1">
                                <input class="form-control fest-stage-input" value="${stage}">
                                <button class="btn btn-outline-danger" type="button" onclick="this.closest('.input-group').remove()">&times;</button>
                            </div>
                        `).join('')}
                    </div>
                    <div class="input-group input-group-sm">
                        <input id="new-fest-stage" class="form-control" placeholder="e.g. LP Hall, Main Stage">
                        <button class="btn btn-outline-primary" onclick="window.addFestStage()">Add Venue / Stage</button>
                    </div>
                    <button class="btn btn-success btn-sm mt-2" onclick="window.saveFestStages()"><i class="fas fa-save me-1"></i>Save Stages</button>
                </div>

                <!-- Registration Switch -->
                <div class="ui-card">
                    <h5 class="section-header"><i class="fas fa-toggle-on me-2"></i>Registration Status</h5>
                    <div class="form-check form-switch mb-3">
                        <input class="form-check-input" type="checkbox" id="admin-reg-toggle" ${fest.registrationOpen ? 'checked' : ''}>
                        <label class="form-check-label fw-bold" for="admin-reg-toggle">Registration Active for House Captains</label>
                    </div>
                    <p class="small text-muted mb-0">When deactivated, house captain portals cannot add, remove, or modify registrations.</p>
                </div>

                <!-- Global Default Limits -->
                <div class="ui-card">
                    <h5 class="section-header"><i class="fas fa-user-check me-2"></i>Default Per-Student Entry Limits</h5>
                    <div class="row g-2">
                        <div class="col-6">
                            <label class="small fw-bold">Max On-Stage (Solo)</label>
                            <input type="number" id="limit-on-solo" min="0" class="form-control form-control-sm" value="${settings.maxOnStageSoloEvents ?? 2}">
                        </div>
                        <div class="col-6">
                            <label class="small fw-bold">Max On-Stage (Group)</label>
                            <input type="number" id="limit-on-group" min="0" class="form-control form-control-sm" value="${settings.maxOnStageGroupEvents ?? 2}">
                        </div>
                        <div class="col-6 mt-2">
                            <label class="small fw-bold">Max Off-Stage (Solo)</label>
                            <input type="number" id="limit-off-solo" min="0" class="form-control form-control-sm" value="${settings.maxOffStageSoloEvents ?? 1}">
                        </div>
                        <div class="col-6 mt-2">
                            <label class="small fw-bold">Max Off-Stage (Group)</label>
                            <input type="number" id="limit-off-group" min="0" class="form-control form-control-sm" value="${settings.maxOffStageGroupEvents ?? 1}">
                        </div>
                    </div>

                    <h5 class="section-header mt-4"><i class="fas fa-shield-alt me-2"></i>Default Per-House Event Limits</h5>
                    <div class="row g-2">
                        <div class="col-6">
                            <label class="small fw-bold">House On-Stage (Solo Entries)</label>
                            <input type="number" id="house-limit-on-solo" min="0" class="form-control form-control-sm" value="${houseLimits.onStage?.solo ?? 2}">
                        </div>
                        <div class="col-6">
                            <label class="small fw-bold">House On-Stage (Group Teams)</label>
                            <input type="number" id="house-limit-on-group" min="0" class="form-control form-control-sm" value="${houseLimits.onStage?.group ?? 1}">
                        </div>
                        <div class="col-6 mt-2">
                            <label class="small fw-bold">House Off-Stage (Solo Entries)</label>
                            <input type="number" id="house-limit-off-solo" min="0" class="form-control form-control-sm" value="${houseLimits.offStage?.solo ?? 2}">
                        </div>
                        <div class="col-6 mt-2">
                            <label class="small fw-bold">House Off-Stage (Group Teams)</label>
                            <input type="number" id="house-limit-off-group" min="0" class="form-control form-control-sm" value="${houseLimits.offStage?.group ?? 1}">
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm mt-3 w-100" onclick="window.saveGeneralSettings()">Save All Default Limits</button>
                </div>

                <!-- Houses Configuration -->
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

            <!-- Categories Configuration -->
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

window.saveGeneralSettings = async function() {
    const fest = state.managingFest;
    const settings = {
        ...(fest.settings || {}),
        maxOnStageSoloEvents: parseInt(document.getElementById('limit-on-solo').value, 10) || 0,
        maxOnStageGroupEvents: parseInt(document.getElementById('limit-on-group').value, 10) || 0,
        maxOffStageSoloEvents: parseInt(document.getElementById('limit-off-solo').value, 10) || 0,
        maxOffStageGroupEvents: parseInt(document.getElementById('limit-off-group').value, 10) || 0,
        houseEventLimits: {
            onStage: {
                solo: parseInt(document.getElementById('house-limit-on-solo').value, 10) || 0,
                group: parseInt(document.getElementById('house-limit-on-group').value, 10) || 0
            },
            offStage: {
                solo: parseInt(document.getElementById('house-limit-off-solo').value, 10) || 0,
                group: parseInt(document.getElementById('house-limit-off-group').value, 10) || 0
            }
        }
    };

    await updateScopedDoc('fests', fest.id, { settings });
    fest.settings = settings;
    await loadAllYearData(true);
    state.managingFest = state.fests.find(item => item.id === fest.id) || fest;
    renderSetupTab();
    window.showAlert('Default student and house limits updated.', 'success');
};
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
// =========================================================================
// --- EVENTS TAB (MAIN VIEW & FILTERING) ---
// =========================================================================

function renderEventsTab() {
    const container = document.getElementById('tab-events');
    const fest = state.managingFest;
    const categories = fest.settings?.categories || [];
    const stages = fest.stages?.length ? fest.stages : ['Main Stage'];
    const events = state.festEvents.filter(e => e.festId === fest.id);
    const defaultHouseLimits = fest.settings?.houseEventLimits || { onStage: { solo: 2, group: 1 }, offStage: { solo: 2, group: 1 } };

    container.innerHTML = `
        <div class="row g-4">
            <!-- Left: Create Event Form -->
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
                                <select id="ev-type" class="form-select" onchange="window.updateEventFormDefaults()">
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
                            <div class="col-12">
                                <label class="form-label small fw-bold">Conduct Venue / Stage</label>
                                <select id="ev-stage" class="form-select">
                                    ${stages.map(stage => `<option value="${stage}">${stage}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-check mb-3">
                            <input class="form-check-input" type="checkbox" id="ev-is-group" onchange="window.updateEventFormDefaults()">
                            <label class="form-check-label fw-bold small" for="ev-is-group">Group Event</label>
                        </div>

                        <!-- Event Specific Limits Override -->
                        <div class="border rounded p-3 mb-3 bg-light">
                            <div class="small fw-bold mb-2 text-primary"><i class="fas fa-sliders-h me-1"></i>Event Limits Override</div>
                            <div class="row g-2">
                                <div class="col-6">
                                    <label class="small fw-bold">Max Entries per House</label>
                                    <input type="number" min="1" id="ev-house-limit" class="form-control form-control-sm" value="${defaultHouseLimits.onStage?.solo ?? 2}">
                                    <div class="text-muted" style="font-size: 0.75rem;">Default from setup</div>
                                </div>
                                <div class="col-6">
                                    <label class="small fw-bold">Max Members / Team</label>
                                    <input type="number" min="1" id="ev-participant-limit" class="form-control form-control-sm" value="1" disabled>
                                    <div class="text-muted" style="font-size: 0.75rem;">Only for group events</div>
                                </div>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary w-100">Save Event</button>
                    </form>
                </div>
            </div>

            <!-- Right: Event Roster & Actions -->
            <div class="col-lg-7">
                <div class="ui-card">
                    <h5 class="section-header"><i class="fas fa-list me-2"></i>Events (${events.length})</h5>
                    <div class="row g-2 mb-3">
                        <div class="col-md-5">
                            <input id="event-search" class="form-control form-control-sm" placeholder="Search events...">
                        </div>
                        <div class="col-md-3">
                            <select id="event-filter-category" class="form-select form-select-sm">
                                <option value="all">All categories</option>
                                ${[...new Set(events.map(event => event.category).filter(Boolean))].map(category => `<option value="${category}">${category}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-2">
                            <select id="event-filter-type" class="form-select form-select-sm">
                                <option value="all">All types</option>
                                <option value="onStage">On-stage</option>
                                <option value="offStage">Off-stage</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <select id="event-filter-status" class="form-select form-select-sm">
                                <option value="all">All</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    <div class="d-flex flex-wrap gap-2 mb-3">
                        <button class="btn btn-sm btn-outline-success" type="button" onclick="window.exportEventsCsv()"><i class="fas fa-file-excel me-1"></i>Excel CSV</button>
                        <button class="btn btn-sm btn-outline-danger" type="button" onclick="window.exportEventsPdf()"><i class="fas fa-file-pdf me-1"></i>PDF</button>
                        <button class="btn btn-sm btn-outline-primary" type="button" onclick="document.getElementById('event-import-file').click()"><i class="fas fa-file-import me-1"></i>Import CSV</button>
                        <button class="btn btn-sm btn-outline-secondary" type="button" onclick="window.downloadEventImportDemo()"><i class="fas fa-download me-1"></i>Demo CSV</button>
                        <input id="event-import-file" type="file" accept=".csv,text/csv" class="d-none">
                    </div>

                    <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                        <table class="table table-sm table-hover align-middle mb-0" id="events-management-table">
                            <thead class="table-light sticky-top">
                                <tr>
                                    <th>Event</th>
                                    <th>Stage</th>
                                    <th>Type</th>
                                    <th>House Limit</th>
                                    <th>Team Size</th>
                                    <th class="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="events-management-body">
                                ${events.map(ev => {
                                    const defaultHouseLimit = (defaultHouseLimits[ev.type] || {})[ev.isGroupEvent ? 'group' : 'solo'] ?? 1;
                                    const actualHouseLimit = ev.customHouseLimit ?? defaultHouseLimit;
                                    const participantLimit = ev.isGroupEvent ? (ev.maxParticipants || 'No limit') : '1 (Solo)';

                                    return `
                                        <tr data-event-search="${`${ev.name} ${ev.category || ''} ${ev.stage || ''}`.toLowerCase()}" data-event-category="${ev.category || ''}" data-event-type="${ev.type || ''}" data-event-status="${ev.cancelled ? 'cancelled' : 'scheduled'}">
                                            <td>
                                                <strong>${ev.name}</strong>
                                                <div class="small text-muted">${ev.category || 'General'} | ${ev.isGroupEvent ? '<span class="badge bg-info">Group</span>' : 'Solo'}</div>
                                            </td>
                                            <td><span class="badge bg-primary">${ev.stage || 'Main Stage'}</span></td>
                                            <td>${ev.type === 'onStage' ? 'On-Stage' : 'Off-Stage'}</td>
                                            <td>
                                                <span class="badge bg-light text-dark border">${actualHouseLimit}${ev.isGroupEvent ? 'Teams' : 'Entries'}</span>
                                            </td>
                                            <td>
                                                <span class="badge bg-light text-dark border">${participantLimit}</span>
                                            </td>
                                            <td class="text-end text-nowrap">
                                                <button class="btn btn-xs btn-outline-primary" onclick="window.editEventLimitsModal('${ev.id}')" title="Edit Event Limits">
                                                    <i class="fas fa-sliders-h"></i>
                                                </button>
                                                <button class="btn btn-xs ${ev.cancelled ? 'btn-outline-success' : 'btn-outline-warning'}" onclick="window.toggleEventCancellation('${ev.id}')" title="${ev.cancelled ? 'Restore' : 'Cancel'}">
                                                    <i class="fas ${ev.cancelled ? 'fa-rotate-left' : 'fa-ban'}"></i>
                                                </button>
                                                <button class="btn btn-xs btn-outline-danger" onclick="window.deleteEventById('${ev.id}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('') || '<tr><td colspan="6" class="text-center text-muted p-3">No events found.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('create-event-form')?.addEventListener('submit', handleEventCreate);
    document.getElementById('event-import-file')?.addEventListener('change', event => window.importEventsCsv(event.target.files[0]));

    const applyEventFilters = () => {
        const search = document.getElementById('event-search').value.trim().toLowerCase();
        const category = document.getElementById('event-filter-category').value;
        const type = document.getElementById('event-filter-type').value;
        const status = document.getElementById('event-filter-status').value;
        document.querySelectorAll('#events-management-body tr').forEach(row => {
            const visible = (!search || row.dataset.eventSearch?.includes(search)) &&
                (category === 'all' || row.dataset.eventCategory === category) &&
                (type === 'all' || row.dataset.eventType === type) &&
                (status === 'all' || row.dataset.eventStatus === status);
            row.classList.toggle('d-none', !visible);
        });
    };
    ['event-search', 'event-filter-category', 'event-filter-type', 'event-filter-status'].forEach(id => document.getElementById(id)?.addEventListener('input', applyEventFilters));
}


// =========================================================================
// --- EVENT ACTIONS, MODALS & STATUS ---
// =========================================================================

window.updateEventFormDefaults = function() {
    const isGroup = document.getElementById('ev-is-group').checked;
    const type = document.getElementById('ev-type').value;
    const defaults = state.managingFest?.settings?.houseEventLimits || { onStage: { solo: 2, group: 1 }, offStage: { solo: 2, group: 1 } };
    
    document.getElementById('ev-house-limit').value = defaults[type]?.[isGroup ? 'group' : 'solo'] ?? 1;
    
    const partInput = document.getElementById('ev-participant-limit');
    partInput.disabled = !isGroup;
    if (!isGroup) partInput.value = '1';
    else if (partInput.value === '1') partInput.value = '6';
};

window.editEventLimitsModal = function(eventId) {
    const event = state.festEvents.find(item => item.id === eventId);
    if (!event) return;

    const defaults = state.managingFest.settings?.houseEventLimits || { onStage: { solo: 2, group: 1 }, offStage: { solo: 2, group: 1 } };
    const defaultHouseLimit = (defaults[event.type] || {})[event.isGroupEvent ? 'group' : 'solo'] ?? 1;
    const currentHouseLimit = event.customHouseLimit ?? defaultHouseLimit;
    const currentParticipantLimit = event.maxParticipants ?? (event.isGroupEvent ? 6 : 1);

    window.showGlobalModal(`Edit Limits: ${event.name}`, `
        <div class="row g-3">
            <div class="col-12">
                <label class="small fw-bold">Max Allowed Entries per House</label>
                <input type="number" min="1" id="edit-event-house-limit" class="form-control form-control-sm" value="${currentHouseLimit}">
                <div class="text-muted small">Controls how many ${event.isGroupEvent ? 'teams' : 'solo participants'} each house can register.</div>
            </div>
            ${event.isGroupEvent ? `
                <div class="col-12">
                    <label class="small fw-bold">Max Members per Team</label>
                    <input type="number" min="2" id="edit-event-participant-limit" class="form-control form-control-sm" value="${currentParticipantLimit}">
                    <div class="text-muted small">Max students allowed inside a single group submission.</div>
                </div>
            ` : ''}
        </div>
    `, `
        <button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-primary btn-sm" id="save-event-limits-btn">Save Changes</button>
    `);

    document.getElementById('save-event-limits-btn').addEventListener('click', async () => {
        const customHouseLimit = parseInt(document.getElementById('edit-event-house-limit').value, 10) || 1;
        const updatePayload = { customHouseLimit };

        if (event.isGroupEvent) {
            updatePayload.maxParticipants = parseInt(document.getElementById('edit-event-participant-limit').value, 10) || null;
            event.maxParticipants = updatePayload.maxParticipants;
        }

        try {
            await updateScopedDoc('festEvents', eventId, updatePayload);
            event.customHouseLimit = customHouseLimit;
            bootstrap.Modal.getInstance(document.getElementById('global-modal'))?.hide();
            renderEventsTab();
            window.showAlert('Event limits updated.', 'success');
        } catch (error) {
            console.error(error);
            window.showAlert('Failed to update event limits.', 'danger');
        }
    });
};

window.toggleEventCancellation = async function(eventId) {
    const event = state.festEvents.find(item => item.id === eventId);
    if (!event) return window.showAlert('Event not found.', 'danger');
    const cancelled = event.cancelled !== true;
    const prompt = cancelled
        ? 'Mark this programme as cancelled? Judges will not be able to upload marks.'
        : 'Restore this programme and allow judging again?';
    if (!confirm(prompt)) return;

    try {
        await updateScopedDoc('festEvents', eventId, { cancelled });
        event.cancelled = cancelled;
        window.showAlert(cancelled ? 'Programme marked as cancelled.' : 'Programme restored.', 'success');
        renderEventsTab();
        if (typeof renderDashboardTab === 'function') renderDashboardTab();
    } catch (error) {
        console.error(error);
        window.showAlert('Failed to update programme status.', 'danger');
    }
};

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
window.updateEventFormDefaults = function() {
    const isGroup = document.getElementById('ev-is-group').checked;
    const type = document.getElementById('ev-type').value;
    const defaults = state.managingFest?.settings?.houseEventLimits || { onStage: { solo: 2, group: 1 }, offStage: { solo: 2, group: 1 } };
    
    document.getElementById('ev-house-limit').value = defaults[type]?.[isGroup ? 'group' : 'solo'] ?? 1;
    
    const partInput = document.getElementById('ev-participant-limit');
    partInput.disabled = !isGroup;
    if (!isGroup) partInput.value = '1';
    else if (partInput.value === '1') partInput.value = '6';
};
function downloadTextFile(filename, content, type = 'text/csv;charset=utf-8') {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type }));
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

function csvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

window.exportEventsCsv = function() {
    const events = state.festEvents.filter(event => event.festId === state.managingFest.id);
    const headers = ['name', 'category', 'type', 'gender', 'stage', 'isGroupEvent', 'cancelled'];
    const rows = events.map(event => headers.map(header => csvCell(event[header])).join(','));
    downloadTextFile(`events_${state.managingFest.name.replace(/\s+/g, '_')}.csv`, [headers.join(','), ...rows].join('\n'));
};

window.downloadEventImportDemo = function() {
    const demo = [
        'name,category,type,gender,stage,isGroupEvent,cancelled',
        'Classical Dance,General,onStage,Common,Main Stage,false,false',
        'Quiz Competition,Senior,offStage,Common,Room 1,false,false'
    ].join('\n');
    downloadTextFile('event_import_demo.csv', demo);
};

window.importEventsCsv = function(file) {
    if (!file) return;
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async results => {
            const fest = state.managingFest;
            const items = results.data.map((row, index) => ({
                id: `EVT_IMPORT_${Date.now()}_${index}`,
                festId: fest.id,
                name: row.name?.trim(),
                category: row.category?.trim() || 'General',
                type: row.type?.trim() || 'onStage',
                gender: row.gender?.trim() || 'Common',
                stage: row.stage?.trim() || 'Main Stage',
                isGroupEvent: String(row.isGroupEvent).toLowerCase() === 'true',
                cancelled: String(row.cancelled).toLowerCase() === 'true'
            })).filter(event => event.name);
            if (!items.length) return window.showAlert('No valid event rows found. Use the Demo CSV format.', 'warning');
            try {
                await batchWriteScoped('festEvents', items);
                await loadAllYearData(true);
                renderEventsTab();
                window.showAlert(`${items.length} event(s) imported.`, 'success');
            } catch (error) {
                console.error(error);
                window.showAlert('Event import failed.', 'danger');
            }
        }
    });
};

window.exportEventsPdf = function() {
    const events = state.festEvents.filter(event => event.festId === state.managingFest.id);
    const rows = events.map(event => `<tr><td>${event.name}</td><td>${event.category || ''}</td><td>${event.stage || 'Main Stage'}</td><td>${event.type || ''}</td><td>${event.isGroupEvent ? 'Group' : 'Solo'}</td><td>${event.cancelled ? 'Cancelled' : 'Scheduled'}</td></tr>`).join('');
    window.printReport({ contentHtml: `<h2>${state.managingFest.name} - Event List</h2><table class="table table-bordered table-sm"><thead><tr><th>Event</th><th>Category</th><th>Stage</th><th>Type</th><th>Mode</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`, title: `Events_${state.managingFest.name}`, pageSize: 'A4 landscape' });
};

async function handleEventCreate(e) {
    e.preventDefault();
    const fest = state.managingFest;
    const name = document.getElementById('ev-name').value.trim();
    const categories = Array.from(document.getElementById('ev-categories').selectedOptions).map(o => o.value);
    const type = document.getElementById('ev-type').value;
    const gender = document.getElementById('ev-gender').value;
    const stage = document.getElementById('ev-stage').value;
    const isGroupEvent = document.getElementById('ev-is-group').checked;
    const customHouseLimit = Number(document.getElementById('ev-house-limit').value) || 0;
    const maxParticipants = isGroupEvent ? (Number(document.getElementById('ev-participant-limit').value) || null) : null;

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
                isGroupEvent,
                customHouseLimit,
                ...(isGroupEvent && maxParticipants ? { maxParticipants } : {}),
                cancelled: false
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

window.editEventHouseLimits = function(eventId) {
    const event = state.festEvents.find(item => item.id === eventId);
    if (!event) return;
    const defaults = state.managingFest.settings?.houseEventLimits || { onStage: { solo: 2, group: 1 }, offStage: { solo: 2, group: 1 } };
    const limits = event.houseLimits || defaults;
    window.showGlobalModal(`House limits: ${event.name}`, `
        <div class="row g-2">
            <div class="col-6"><label class="small fw-bold">On-stage solo</label><input type="number" min="0" id="edit-limit-on-solo" class="form-control form-control-sm" value="${limits.onStage?.solo ?? 0}"></div>
            <div class="col-6"><label class="small fw-bold">On-stage group</label><input type="number" min="0" id="edit-limit-on-group" class="form-control form-control-sm" value="${limits.onStage?.group ?? 0}"></div>
            <div class="col-6"><label class="small fw-bold">Off-stage solo</label><input type="number" min="0" id="edit-limit-off-solo" class="form-control form-control-sm" value="${limits.offStage?.solo ?? 0}"></div>
            <div class="col-6"><label class="small fw-bold">Off-stage group</label><input type="number" min="0" id="edit-limit-off-group" class="form-control form-control-sm" value="${limits.offStage?.group ?? 0}"></div>
        </div>`, `<button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button><button class="btn btn-primary btn-sm" id="save-event-limits">Save limits</button>`);
    document.getElementById('save-event-limits').addEventListener('click', async () => {
        const houseLimits = {
            onStage: { solo: Number(document.getElementById('edit-limit-on-solo').value) || 0, group: Number(document.getElementById('edit-limit-on-group').value) || 0 },
            offStage: { solo: Number(document.getElementById('edit-limit-off-solo').value) || 0, group: Number(document.getElementById('edit-limit-off-group').value) || 0 }
        };
        await updateScopedDoc('festEvents', eventId, { houseLimits });
        event.houseLimits = houseLimits;
        bootstrap.Modal.getInstance(document.getElementById('global-modal'))?.hide();
        renderEventsTab();
        window.showAlert('Event house limits saved.', 'success');
    });
};

window.toggleEventCancellation = async function(eventId) {
    const event = state.festEvents.find(item => item.id === eventId);
    if (!event) return window.showAlert('Event not found.', 'danger');
    const cancelled = event.cancelled !== true;
    const prompt = cancelled
        ? 'Mark this programme as cancelled? Judges will not be able to upload marks.'
        : 'Restore this programme and allow judging again?';
    if (!confirm(prompt)) return;

    try {
        await updateScopedDoc('festEvents', eventId, { cancelled });
        event.cancelled = cancelled;
        window.showAlert(cancelled ? 'Programme marked as cancelled.' : 'Programme restored.', 'success');
        renderEventsTab();
        renderDashboardTab();
    } catch (error) {
        console.error(error);
        window.showAlert('Failed to update programme status.', 'danger');
    }
};

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

// =========================================================================
// --- SUB-TAB: GROUP PARTICIPATION (ADMIN) ---
// =========================================================================

let isAdminSavingGroup = false;

// State tracker for Admin Group list sorting
let adminGroupSortColumn = 'name'; // 'name' | 'house' | 'category' | 'event' | 'members'
let adminGroupSortDirection = 'asc'; // 'asc' | 'desc'

function renderSubTabGroups(isRegistrationOpen) {
    const container = document.getElementById('subtab-groups');
    if (!container) return;

    const fest = state.managingFest;
    const houses = state.festHouses;
    const events = state.festEvents.filter(e => e.festId === fest.id && e.isGroupEvent && e.cancelled !== true);
    const categories = ['General', ...(fest.settings?.categories?.map(c => c.name) || [])];

    container.innerHTML = `
        <div class="ui-card mb-3">
            <h6 class="fw-bold"><i class="fas fa-people-group me-2 text-primary"></i>Create Group Participation</h6>
            <div class="row g-2 align-items-end">
                <div class="col-md-3">
                    <label class="small fw-bold" for="admin-group-house">House</label>
                    <select id="admin-group-house" class="form-select form-select-sm">
                        <option value="">Choose House</option>
                        ${houses.map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="small fw-bold" for="admin-group-event">Group Event</label>
                    <select id="admin-group-event" class="form-select form-select-sm">
                        <option value="">Choose Event</option>
                        ${events.map(e => `
                            <option value="${e.id}" data-category="${e.category || 'General'}" data-gender="${e.gender || 'Common'}" data-max="${e.maxParticipants || ''}">
                                ${e.name} (${e.category || 'General'}) [${e.type === 'offStage' ? 'Off-Stage' : 'On-Stage'}]
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="small fw-bold" for="admin-group-name">Group Name <span class="text-muted fw-normal">(Optional)</span></label>
                    <input id="admin-group-name" class="form-control form-control-sm" placeholder="Auto-generated if blank">
                </div>
                <div class="col-md-3">
                    <label class="small fw-bold" for="admin-group-category">Category</label>
                    <select id="admin-group-category" class="form-select form-select-sm">
                        ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div class="row g-2 mt-2">
                <div class="col-md-8">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <label class="small fw-bold mb-0" for="admin-group-members">Participants</label>
                        <span class="small text-muted" id="admin-group-limit-info" style="font-size: 0.72rem;"></span>
                    </div>
                    <select id="admin-group-members" class="form-select form-select-sm" multiple size="6">
                        <option value="">Choose a house and event first</option>
                    </select>
                    <small class="text-muted" style="font-size: 0.72rem;">Hold Ctrl (Windows) / Cmd (Mac) to select multiple students.</small>
                </div>
                <div class="col-md-4 d-flex flex-column justify-content-between">
                    <div>
                        <label class="small fw-bold mb-1" for="admin-group-captain">Captain</label>
                        <select id="admin-group-captain" class="form-select form-select-sm">
                            <option value="">Choose participants first</option>
                        </select>
                    </div>
                    <button class="btn btn-success btn-sm w-100 mt-2 py-2 fw-bold" id="admin-save-group-btn" onclick="window.saveAdminGroup()" ${!isRegistrationOpen ? 'disabled' : ''}>
                        <i class="fas fa-save me-1"></i>Save Group Team
                    </button>
                </div>
            </div>
        </div>

        <!-- Groups Table with Interactive Sort Headers -->
        <div class="table-responsive border rounded bg-white" style="max-height: 480px; overflow-y: auto;">
            <table class="table table-sm table-hover align-middle mb-0" id="admin-groups-table">
                <thead class="table-light sticky-top shadow-xs" style="user-select: none;">
                    <tr>
                        <th style="min-width: 150px; cursor: pointer;" onclick="window.handleAdminGroupSort('name')">
                            Group Name <span id="sort-arrow-name">${getSortIconMarkup('name')}</span>
                        </th>
                        <th style="min-width: 120px; cursor: pointer;" onclick="window.handleAdminGroupSort('house')">
                            House <span id="sort-arrow-house">${getSortIconMarkup('house')}</span>
                        </th>
                        <th style="min-width: 100px; cursor: pointer;" onclick="window.handleAdminGroupSort('category')">
                            Category <span id="sort-arrow-category">${getSortIconMarkup('category')}</span>
                        </th>
                        <th style="min-width: 140px; cursor: pointer;" onclick="window.handleAdminGroupSort('event')">
                            Event <span id="sort-arrow-event">${getSortIconMarkup('event')}</span>
                        </th>
                        <th style="min-width: 200px; cursor: pointer;" onclick="window.handleAdminGroupSort('members')">
                            Participants &amp; Count <span id="sort-arrow-members">${getSortIconMarkup('members')}</span>
                        </th>
                        <th class="text-end" style="width: 80px;">Action</th>
                    </tr>
                </thead>
                <tbody id="admin-groups-table-body">
                    <!-- Injected dynamically via renderAdminGroupsTableBody -->
                </tbody>
            </table>
        </div>
    `;

    const housePicker = document.getElementById('admin-group-house');
    const eventPicker = document.getElementById('admin-group-event');
    const categoryPicker = document.getElementById('admin-group-category');
    const memberPicker = document.getElementById('admin-group-members');
    const captainPicker = document.getElementById('admin-group-captain');
    const limitInfo = document.getElementById('admin-group-limit-info');

    const refreshMembers = () => {
        const selectedHouseId = housePicker.value;
        const selectedEventId = eventPicker.value;
        const event = state.festEvents.find(e => e.id === selectedEventId);

        if (event && event.category) {
            categoryPicker.value = event.category;
        }

        if (!selectedHouseId) {
            memberPicker.innerHTML = '<option value="">Choose a house first</option>';
            captainPicker.innerHTML = '<option value="">Choose participants first</option>';
            if (limitInfo) limitInfo.textContent = '';
            return;
        }

        let students = state.students.filter(s => s.houseId === selectedHouseId);

        if (event) {
            students = students.filter(s => {
                const catMatch = !event.category || event.category === 'General' || getStudentCategory(s) === event.category;
                const genderMatch = !event.gender || event.gender === 'Common' ||
                    (event.gender === 'Male' && s.gender === 'M') ||
                    (event.gender === 'Female' && s.gender === 'F');
                return catMatch && genderMatch;
            });

            if (limitInfo) {
                const maxParts = event.maxParticipants ? `Max ${event.maxParticipants} members` : 'No size limit';
                const houseLimit = eventHouseLimit(fest, event, 'group');
                limitInfo.textContent = `${maxParts} | House limit: ${houseLimit} team(s)`;
            }
        } else if (limitInfo) {
            limitInfo.textContent = '';
        }

        memberPicker.innerHTML = students.map(s => 
            `<option value="${s.id}">${s.name} (${s.admissionNumber || 'N/A'}) - ${getStudentClassName(s.classId, s.division)}</option>`
        ).join('') || '<option value="">No eligible students found in this house</option>';

        captainPicker.innerHTML = '<option value="">Choose participants first</option>';
    };

    housePicker.addEventListener('change', refreshMembers);
    eventPicker.addEventListener('change', refreshMembers);

    memberPicker.addEventListener('change', () => {
        const selected = Array.from(memberPicker.selectedOptions);
        const previousCaptain = captainPicker.value;

        if (selected.length === 0) {
            captainPicker.innerHTML = '<option value="">Choose participants first</option>';
            return;
        }

        captainPicker.innerHTML = selected.map((o, idx) => 
            `<option value="${o.value}" ${o.value === previousCaptain || idx === 0 ? 'selected' : ''}>${o.textContent}</option>`
        ).join('');
    });

    renderAdminGroupsTableBody(isRegistrationOpen);
}

// Generate the sort arrow icon
function getSortIconMarkup(columnName) {
    if (adminGroupSortColumn !== columnName) {
        return `<i class="fas fa-sort text-muted ms-1" style="font-size: 0.72rem; opacity: 0.4;"></i>`;
    }
    return adminGroupSortDirection === 'asc' 
        ? `<i class="fas fa-sort-up text-primary ms-1" style="font-size: 0.78rem;"></i>`
        : `<i class="fas fa-sort-down text-primary ms-1" style="font-size: 0.78rem;"></i>`;
}

// Handler for header click
window.handleAdminGroupSort = function(columnName) {
    if (adminGroupSortColumn === columnName) {
        adminGroupSortDirection = (adminGroupSortDirection === 'asc') ? 'desc' : 'asc';
    } else {
        adminGroupSortColumn = columnName;
        adminGroupSortDirection = 'asc';
    }

    // Update all arrow icons in table header
    ['name', 'house', 'category', 'event', 'members'].forEach(col => {
        const span = document.getElementById(`sort-arrow-${col}`);
        if (span) span.innerHTML = getSortIconMarkup(col);
    });

    const isRegistrationOpen = state.managingFest?.registrationOpen === true;
    renderAdminGroupsTableBody(isRegistrationOpen);
};

// Render sorted table body rows
function renderAdminGroupsTableBody(isRegistrationOpen) {
    const tbody = document.getElementById('admin-groups-table-body');
    if (!tbody) return;

    const fest = state.managingFest;
    const houses = state.festHouses;
    let groups = [...state.festGroups.filter(g => g.festId === fest.id)];

    if (!groups.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-4">No group teams formed yet.</td></tr>';
        return;
    }

    // Sort algorithm based on active column and direction
    groups.sort((a, b) => {
        let valA = '';
        let valB = '';

        if (adminGroupSortColumn === 'name') {
            valA = (a.name || '').toLowerCase();
            valB = (b.name || '').toLowerCase();
        } else if (adminGroupSortColumn === 'house') {
            const hA = houses.find(h => h.id === a.houseId)?.name || '';
            const hB = houses.find(h => h.id === b.houseId)?.name || '';
            valA = hA.toLowerCase();
            valB = hB.toLowerCase();
        } else if (adminGroupSortColumn === 'category') {
            valA = (a.category || '').toLowerCase();
            valB = (b.category || '').toLowerCase();
        } else if (adminGroupSortColumn === 'event') {
            const evA = state.festEvents.find(e => e.id === a.eventId)?.name || '';
            const evB = state.festEvents.find(e => e.id === b.eventId)?.name || '';
            valA = evA.toLowerCase();
            valB = evB.toLowerCase();
        } else if (adminGroupSortColumn === 'members') {
            const countA = a.members?.length || 0;
            const countB = b.members?.length || 0;
            return adminGroupSortDirection === 'asc' ? countA - countB : countB - countA;
        }

        const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        return adminGroupSortDirection === 'asc' ? cmp : -cmp;
    });

    tbody.innerHTML = groups.map(group => {
        const house = houses.find(h => h.id === group.houseId);
        const event = state.festEvents.find(e => e.id === group.eventId);
        const mCount = group.members?.length || 0;

        const memberPills = (group.members || []).map(m => {
            const st = state.students.find(s => s.id === m.studentId);
            const name = st?.name || m.studentId;
            const isCap = m.role === 'Captain';
            return `
                <span class="badge ${isCap ? 'bg-warning text-dark border border-warning' : 'bg-light text-dark border'} me-1 mb-1 p-1">
                    ${isCap ? '<i class="fas fa-crown me-1 text-dark"></i>' : ''}${name}
                </span>
            `;
        }).join('');

        return `
            <tr>
                <td><strong class="text-primary">${group.name}</strong></td>
                <td>
                    ${house ? `<span class="badge bg-light text-dark border"><span class="color-dot-display me-1" style="background-color:${house.color || '#333'}"></span>${house.name}</span>` : '<span class="text-muted">N/A</span>'}
                </td>
                <td><span class="badge bg-secondary-subtle text-secondary">${group.category || event?.category || 'General'}</span></td>
                <td>
                    <strong>${event?.name || 'N/A'}</strong>
                    <div class="text-muted" style="font-size: 0.7rem;">${event?.type === 'offStage' ? 'Off-Stage' : 'On-Stage'}</div>
                </td>
                <td>
                    <div class="d-flex align-items-center gap-1 mb-1">
                        <span class="badge bg-secondary flex-shrink-0" style="font-size: 0.68rem;">${mCount} Members</span>
                    </div>
                    <div class="d-flex flex-wrap">${memberPills || '<span class="text-muted fst-italic">None</span>'}</div>
                </td>
                <td class="text-end">
                    <button class="btn btn-xs btn-outline-danger" onclick="window.deleteAdminGroup('${group.id}')" title="Delete this group" ${!isRegistrationOpen ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}
window.saveAdminGroup = async function() {
    if (isAdminSavingGroup) return; // Prevent double-click submission

    const fest = state.managingFest;
    const houseId = document.getElementById('admin-group-house').value;
    const eventId = document.getElementById('admin-group-event').value;
    const category = document.getElementById('admin-group-category').value;
    let name = document.getElementById('admin-group-name').value.trim();
    const memberIds = Array.from(document.getElementById('admin-group-members').selectedOptions).map(o => o.value).filter(Boolean);
    const captainId = document.getElementById('admin-group-captain').value;
    const saveBtn = document.getElementById('admin-save-group-btn');

    const event = state.festEvents.find(e => e.id === eventId);
    const house = state.festHouses.find(h => h.id === houseId);

    if (!houseId || !eventId || memberIds.length === 0 || !captainId) {
        return window.showAlert('Please choose a house, an event, participants, and designate one captain.', 'warning');
    }
    if (!event?.isGroupEvent) {
        return window.showAlert('Selected event is not configured as a group event.', 'warning');
    }

    // Default group name if left empty
    if (!name) {
        const existingCount = state.festGroups.filter(g => g.festId === fest.id && g.eventId === eventId && g.houseId === houseId).length;
        name = `${event.name} - ${house?.name || 'House'} Group ${existingCount + 1}`;
    }

    // Check duplicate members within selection
    if (new Set(memberIds).size !== memberIds.length) {
        return window.showAlert('A participant cannot be added twice to the same group.', 'warning');
    }

    // Max participants per team check
    if (event.maxParticipants && memberIds.length > event.maxParticipants) {
        return window.showAlert(`This event allows a maximum of ${event.maxParticipants} participants per team. You selected ${memberIds.length}.`, 'warning');
    }

    // House-level group count quota
    const existingHouseTeams = state.festGroups.filter(g => g.festId === fest.id && g.eventId === eventId && g.houseId === houseId);
    const houseTeamLimit = eventHouseLimit(fest, event, 'group');
    if (existingHouseTeams.length >= houseTeamLimit) {
        return window.showAlert(`This house has reached its limit of ${houseTeamLimit} group team(s) for ${event.name}.`, 'warning');
    }

    // Check if participant is already registered in another group for this event
    const existingGroups = state.festGroups.filter(g => g.festId === fest.id);
    const duplicateMember = memberIds.find(studentId => 
        existingGroups.some(g => g.eventId === eventId && g.members?.some(m => m.studentId === studentId))
    );
    if (duplicateMember) {
        const st = state.students.find(s => s.id === duplicateMember);
        return window.showAlert(`${st?.name || 'A participant'} is already enrolled in another group for this event.`, 'warning');
    }

    // Check if captain is already captain of another team
    if (existingGroups.some(g => g.members?.some(m => m.studentId === captainId && m.role === 'Captain'))) {
        const st = state.students.find(s => s.id === captainId);
        return window.showAlert(`${st?.name || 'Selected student'} is already serving as captain in another group team.`, 'warning');
    }

    // Stage-specific group quota check
    const isOffStage = event.type === 'offStage';
    const groupLimit = isOffStage ? (fest.settings?.maxOffStageGroupEvents ?? 1) : (fest.settings?.maxOnStageGroupEvents ?? 2);

    const overLimitStudent = memberIds.find(studentId => {
        const count = existingGroups.filter(g => g.members?.some(m => m.studentId === studentId)).filter(g => {
            const ev = state.festEvents.find(item => item.id === g.eventId);
            return isOffStage ? ev?.type === 'offStage' : ev?.type !== 'offStage';
        }).length;
        return count >= groupLimit;
    });

    if (overLimitStudent) {
        const st = state.students.find(s => s.id === overLimitStudent);
        return window.showAlert(`${st?.name || 'A student'} has reached the maximum ${isOffStage ? 'off-stage' : 'on-stage'} group limit (${groupLimit}).`, 'warning');
    }

    // Lock save button and set spinner
    isAdminSavingGroup = true;
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving...`;
    }

    const groupId = `GRP_${fest.id}_${houseId}_${eventId}_${Date.now()}`;
    const members = memberIds.map(studentId => ({
        studentId,
        role: studentId === captainId ? 'Captain' : 'Member'
    }));

    const batch = writeBatch(db);
    batch.set(getScopedDoc('festGroups', groupId), {
        id: groupId,
        festId: fest.id,
        houseId,
        name,
        category,
        eventId,
        members,
        lastUpdated: serverTimestamp()
    });

    // Sync group event onto individual registrations
    memberIds.forEach(studentId => {
        const student = state.students.find(s => s.id === studentId);
        const regId = `${fest.id}_${studentId}`;
        const existing = state.festRegistrations.find(r => r.id === regId);
        const mergedEvents = [...new Set([...(existing?.events || []), eventId])];

        batch.set(getScopedDoc('festRegistrations', regId), {
            id: regId,
            festId: fest.id,
            studentId,
            studentName: student?.name || 'Student',
            houseId,
            events: mergedEvents,
            chestNo: existing?.chestNo || null,
            lastUpdated: serverTimestamp()
        }, { merge: true });
    });

    try {
        await batch.commit();
        await loadAllYearData(true);
        window.showAlert(`Group team "${name}" saved.`, 'success');
        renderSubTabGroups(fest.registrationOpen === true);
        if (typeof renderSubTabParticipation === 'function') renderSubTabParticipation();
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to save group participation.', 'danger');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fas fa-save me-1"></i>Save Group Team`;
        }
    } finally {
        isAdminSavingGroup = false;
    }
};

window.deleteAdminGroup = async function(groupId) {
    const group = state.festGroups.find(g => g.id === groupId);
    if (!group) return window.showAlert('Group record not found.', 'danger');

    if (!confirm(`Delete group "${group.name}"? This will remove the event from its members.`)) return;

    const fest = state.managingFest;
    const batch = writeBatch(db);

    // 1. Delete group document
    batch.delete(getScopedDoc('festGroups', groupId));

    // 2. Remove this group event from members' fest registrations
    (group.members || []).forEach(m => {
        const regId = `${fest.id}_${m.studentId}`;
        const reg = state.festRegistrations.find(r => r.id === regId);
        if (reg) {
            const filteredEvents = (reg.events || []).filter(evId => evId !== group.eventId);
            batch.update(getScopedDoc('festRegistrations', regId), {
                events: filteredEvents,
                lastUpdated: serverTimestamp()
            });
        }
    });

    try {
        await batch.commit();
        await loadAllYearData(true);
        window.showAlert(`Group "${group.name}" deleted.`, 'success');
        renderSubTabGroups(fest.registrationOpen === true);
        if (typeof renderSubTabParticipation === 'function') renderSubTabParticipation();
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to delete group team.', 'danger');
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
    if (!container) return;

    const classes = state.classes;
    const houses = state.festHouses;
    const fest = state.managingFest;

    let currentViewMode = 'students'; // 'students' | 'events'
    let currentStageFilter = 'all';   // 'all' | 'onStage' | 'offStage'

    const maxOnSolo = fest.settings?.maxOnStageSoloEvents ?? 2;
    const maxOffSolo = fest.settings?.maxOffStageSoloEvents ?? 1;
    const maxOnGrp = fest.settings?.maxOnStageGroupEvents ?? 2;
    const maxOffGrp = fest.settings?.maxOffStageGroupEvents ?? 1;

    container.innerHTML = `
        <div class="row g-2 mb-3 align-items-end">
            <div class="col-12 col-md-4">
                <label class="small fw-bold mb-1">Search</label>
                <input type="text" id="admin-reg-search" class="form-control form-control-sm" placeholder="Search name, adm no, or event...">
            </div>

            <div class="col-6 col-md-2" id="admin-class-filter-container">
                <label class="small fw-bold mb-1">Class</label>
                <select id="admin-reg-class" class="form-select form-select-sm">
                    <option value="">All Classes</option>
                    ${classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
            </div>

            <div class="col-6 col-md-2">
                <label class="small fw-bold mb-1">House</label>
                <select id="admin-reg-house" class="form-select form-select-sm">
                    <option value="">All Houses</option>
                    ${houses.map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
                </select>
            </div>

            <div class="col-12 col-md-4 d-flex gap-2 justify-content-end align-items-end">
                <!-- Stage Scope Filter -->
                <div class="btn-group btn-group-sm flex-grow-1 shadow-xs" role="group">
                    <input type="radio" class="btn-check" name="adminStageFilter" id="stage-all" value="all" checked>
                    <label class="btn btn-outline-dark" for="stage-all">All</label>

                    <input type="radio" class="btn-check" name="adminStageFilter" id="stage-on" value="onStage">
                    <label class="btn btn-outline-primary" for="stage-on">On</label>

                    <input type="radio" class="btn-check" name="adminStageFilter" id="stage-off" value="offStage">
                    <label class="btn btn-outline-success" for="stage-off">Off</label>
                </div>

                <!-- View Mode Toggle -->
                <div class="btn-group btn-group-sm shadow-xs" role="group">
                    <input type="radio" class="btn-check" name="adminViewType" id="view-student-wise" value="students" checked>
                    <label class="btn btn-outline-primary" for="view-student-wise"><i class="fas fa-user me-1"></i>Students</label>

                    <input type="radio" class="btn-check" name="adminViewType" id="view-event-wise" value="events">
                    <label class="btn btn-outline-primary" for="view-event-wise"><i class="fas fa-calendar-check me-1"></i>Events</label>
                </div>
            </div>
        </div>

        <div class="d-flex justify-content-between align-items-center mb-2 px-1">
            <span class="badge bg-secondary py-2" id="admin-reg-total-count">0 Records</span>
            <div id="event-mode-legend" class="small text-muted d-none">
                <span class="badge bg-success-subtle text-success border border-success-subtle me-1">Available</span>
                <span class="badge bg-warning-subtle text-warning-emphasis border border-warning me-1">Full</span>
                <span class="badge bg-danger text-white">Over Limit</span>
            </div>
        </div>

        <div class="table-responsive border rounded bg-white" style="max-height: 540px; overflow-y: auto;">
            <table class="table table-sm table-hover align-middle mb-0" id="admin-participants-table">
                <thead class="table-light sticky-top shadow-xs" id="admin-table-head"></thead>
                <tbody id="admin-table-body"></tbody>
            </table>
        </div>
    `;

    const searchInput = document.getElementById('admin-reg-search');
    const classFilter = document.getElementById('admin-reg-class');
    const houseFilter = document.getElementById('admin-reg-house');
    const totalCountBadge = document.getElementById('admin-reg-total-count');
    const tableHead = document.getElementById('admin-table-head');
    const tbody = document.getElementById('admin-table-body');
    const legend = document.getElementById('event-mode-legend');
    const classContainer = document.getElementById('admin-class-filter-container');

    // 1. STUDENT VIEW
    function renderStudentsView(term, selectedClass, selectedHouse) {
        tableHead.innerHTML = `
            <tr>
                <th style="min-width: 220px;">Student Information</th>
                <th style="min-width: 110px;">House</th>
                <th style="min-width: 140px;">Quota Usage</th>
                <th style="min-width: 260px;">Enrolled Events</th>
                <th class="text-end" style="width: 100px;">Manage</th>
            </tr>
        `;
        legend.classList.add('d-none');
        classContainer.classList.remove('d-none');

        let students = state.students;
        if (selectedClass) students = students.filter(s => s.classId === selectedClass);
        if (selectedHouse) students = students.filter(s => s.houseId === selectedHouse);
        if (term) {
            students = students.filter(s => 
                (s.name && s.name.toLowerCase().includes(term)) || 
                String(s.admissionNumber || '').toLowerCase().includes(term)
            );
        }

        totalCountBadge.textContent = `${students.length} Students`;

        if (students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted p-4">No matching students found.</td></tr>`;
            return;
        }

        tbody.innerHTML = students.map(s => {
            const regId = `${fest.id}_${s.id}`;
            const reg = state.festRegistrations.find(r => r.id === regId);
            const events = reg?.events || [];
            const house = houses.find(h => h.id === s.houseId);

            // Calculate student's load
            const soloEvents = events.map(id => state.festEvents.find(e => e.id === id)).filter(e => e && !e.isGroupEvent);
            const studentGroups = state.festGroups.filter(g => g.festId === fest.id && g.members?.some(m => m.studentId === s.id));

            const onSoloCount = soloEvents.filter(e => e.type !== 'offStage').length;
            const offSoloCount = soloEvents.filter(e => e.type === 'offStage').length;
            const onGrpCount = studentGroups.filter(g => state.festEvents.find(e => e.id === g.eventId)?.type !== 'offStage').length;
            const offGrpCount = studentGroups.filter(g => state.festEvents.find(e => e.id === g.eventId)?.type === 'offStage').length;

            // Filter event badges based on Stage filter
            const visibleEvents = events.map(id => state.festEvents.find(e => e.id === id)).filter(e => {
                if (!e) return false;
                if (currentStageFilter === 'onStage') return e.type !== 'offStage';
                if (currentStageFilter === 'offStage') return e.type === 'offStage';
                return true;
            });

            const badges = visibleEvents.map(ev => {
                const isOff = ev.type === 'offStage';
                return `
                    <span class="badge bg-white text-dark border me-1 mb-1 p-1 d-inline-flex align-items-center gap-1 shadow-xs" style="font-size: 0.73rem;">
                        <i class="fas ${isOff ? 'fa-palette text-success' : 'fa-microphone-lines text-primary'}"></i>
                        <span>${ev.name}</span>
                        <button type="button" class="btn-close btn-close-xs admin-remove-event-btn ms-1" 
                                data-student-id="${s.id}" data-event-id="${ev.id}" title="Remove from this event" style="font-size: 0.5rem;"></button>
                    </span>
                `;
            }).join('');

            return `
                <tr>
                    <td class="py-2">
                        <strong class="text-primary text-decoration-underline" role="button" onclick="window.showStudentEventProfileModal('${s.id}')" title="Click to view all events">
                            ${s.name}
                        </strong>
                        <div class="d-flex flex-wrap align-items-center gap-1 mt-1">
                            <span class="badge bg-secondary-subtle text-secondary py-0 px-1" style="font-size: 0.7rem;">${getStudentCategory(s)}</span>
                            <span class="text-muted small" style="font-size: 0.72rem;">Adm: ${s.admissionNumber || 'N/A'}</span>
                            <span class="text-muted small" style="font-size: 0.72rem;">&bull; ${getStudentClassName(s.classId, s.division)}</span>
                        </div>
                    </td>
                    <td>
                        ${house ? `<span class="badge bg-light text-dark border"><span class="color-dot-display me-1" style="background-color:${house.color || '#333'}"></span>${house.name}</span>` : '<span class="text-muted small">None</span>'}
                    </td>
                    <td>
                        <div class="d-flex flex-column gap-1">
                            <span class="badge ${onSoloCount >= maxOnSolo ? 'bg-danger text-white' : 'bg-light text-primary border'}" style="font-size: 0.65rem;">
                                Solo On: ${onSoloCount}/${maxOnSolo}
                            </span>
                            <span class="badge ${offSoloCount >= maxOffSolo ? 'bg-danger text-white' : 'bg-light text-success border'}" style="font-size: 0.65rem;">
                                Solo Off: ${offSoloCount}/${maxOffSolo}
                            </span>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex flex-wrap align-items-center py-1">
                            ${badges || '<small class="text-muted fst-italic">No enrolled events</small>'}
                        </div>
                    </td>
                    <td class="text-end">
                        <button class="btn btn-outline-primary btn-sm py-1 px-2" onclick="window.openEventAllocationModal('${s.id}')" ${!isRegistrationOpen ? 'disabled' : ''}>
                            <i class="fas fa-edit me-1"></i>Manage
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // 2. EVENTS VIEW
    function renderEventsView(term, selectedHouse) {
        if (!selectedHouse) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted p-4"><i class="fas fa-info-circle me-1"></i>Please select a specific House above to view and assign participants.</td></tr>`;
            totalCountBadge.textContent = `Select a house`;
            return;
        }

        tableHead.innerHTML = `
            <tr>
                <th style="min-width: 220px; width: 30%;">Event Details</th>
                <th style="min-width: 110px; width: 15%;">House Limit</th>
                <th style="min-width: 300px; width: 45%;">Registered Participants / Teams</th>
                <th class="text-end" style="width: 10%;">Action</th>
            </tr>
        `;
        legend.classList.remove('d-none');
        classContainer.classList.add('d-none');

        let events = state.festEvents.filter(e => e.festId === fest.id && e.cancelled !== true);
        
        // Stage Scope Filter
        if (currentStageFilter === 'onStage') events = events.filter(e => e.type !== 'offStage');
        if (currentStageFilter === 'offStage') events = events.filter(e => e.type === 'offStage');

        if (term) {
            events = events.filter(e => (e.name && e.name.toLowerCase().includes(term)) || (e.category && e.category.toLowerCase().includes(term)));
        }

        totalCountBadge.textContent = `${events.length} Events`;

        if (events.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted p-4">No events found matching your criteria.</td></tr>`;
            return;
        }

        const soloEvents = events.filter(e => !e.isGroupEvent);
        const groupEvents = events.filter(e => e.isGroupEvent);

        function renderEventRow(ev) {
            const isGroup = ev.isGroupEvent;
            const isOff = ev.type === 'offStage';

            if (isGroup) {
                // Group Logic
                const houseTeams = state.festGroups.filter(g => g.festId === fest.id && g.houseId === selectedHouse && g.eventId === ev.id);
                const teamLimit = eventHouseLimit(fest, ev, 'group');
                const isExceeded = houseTeams.length > teamLimit;
                const isFull = houseTeams.length >= teamLimit && !isExceeded;

                let badgeClass = 'bg-success-subtle text-success border border-success-subtle';
                if (isExceeded) badgeClass = 'bg-danger text-white';
                else if (isFull) badgeClass = 'bg-warning-subtle text-warning-emphasis border border-warning';

                const teamPills = houseTeams.map(g => {
                    const captain = g.members?.find(m => m.role === 'Captain');
                    const capStudent = state.students.find(s => s.id === captain?.studentId);
                    return `
                        <div class="border rounded p-1 px-2 mb-1 bg-white shadow-xs">
                            <div class="d-flex justify-content-between align-items-center">
                                <strong class="text-primary" style="font-size: 0.78rem;">${g.name}</strong>
                                <span class="badge bg-secondary" style="font-size: 0.65rem;">${g.members?.length || 0} Members</span>
                            </div>
                            <small class="text-muted" style="font-size: 0.68rem;">Captain: <strong>${capStudent?.name || 'Unassigned'}</strong></small>
                        </div>
                    `;
                }).join('');

                return `
                    <tr class="${isExceeded ? 'table-danger-subtle' : ''}">
                        <td class="py-2">
                            <strong class="text-dark d-block">${ev.name}</strong>
                            <div class="small text-muted mt-1">
                                <span class="badge bg-light text-secondary border py-0 px-1">${ev.category || 'General'}</span>
                                <span class="badge bg-light text-dark border py-0 px-1">${isOff ? 'Off-Stage' : 'On-Stage'}</span>
                                <span class="badge bg-info-subtle text-info border py-0 px-1">Group</span>
                            </div>
                        </td>
                        <td>
                            <span class="badge ${badgeClass} px-2 py-1 fw-bold" style="font-size: 0.76rem;">
                                ${houseTeams.length} / ${teamLimit} Teams
                            </span>
                        </td>
                        <td>${teamPills || '<span class="text-muted small fst-italic">No group teams formed</span>'}</td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-outline-primary py-1 px-2 text-nowrap" 
                                    onclick="document.querySelector('button[data-bs-target=\\'#subtab-groups\\']')?.click()">
                                <i class="fas fa-users me-1"></i>Manage
                            </button>
                        </td>
                    </tr>
                `;
            } else {
                // Solo Logic
                const limit = eventHouseLimit(fest, ev, 'solo');
                const houseRegs = state.festRegistrations.filter(r => 
                    r.festId === fest.id && r.houseId === selectedHouse && r.events?.includes(ev.id)
                );

                const count = houseRegs.length;
                const isExceeded = count > limit;
                const isFull = count >= limit && !isExceeded;

                let badgeClass = 'bg-success-subtle text-success border border-success-subtle';
                if (isExceeded) badgeClass = 'bg-danger text-white';
                else if (isFull) badgeClass = 'bg-warning-subtle text-warning-emphasis border border-warning';

                const studentPills = houseRegs.map(r => {
                    const student = state.students.find(s => s.id === r.studentId);
                    const name = student?.name || r.studentName || 'Student';
                    return `
                        <span class="badge bg-white text-dark border me-1 mb-1 p-1 d-inline-flex align-items-center gap-1 shadow-xs" style="font-size: 0.75rem;">
                            <strong class="text-primary text-decoration-underline" role="button" onclick="window.showStudentEventProfileModal('${r.studentId}')">${name}</strong>
                            <button type="button" class="btn-close btn-close-xs admin-remove-event-btn ms-1" 
                                    data-student-id="${r.studentId}" data-event-id="${ev.id}" title="Remove from event" style="font-size: 0.5rem;"></button>
                        </span>
                    `;
                }).join('');

                return `
                    <tr class="${isExceeded ? 'table-danger-subtle' : ''}">
                        <td class="py-2">
                            <strong class="text-dark d-block">${ev.name}</strong>
                            <div class="small text-muted mt-1">
                                <span class="badge bg-light text-secondary border py-0 px-1">${ev.category || 'General'}</span>
                                <span class="badge bg-light text-dark border py-0 px-1">${isOff ? 'Off-Stage' : 'On-Stage'}</span>
                            </div>
                        </td>
                        <td>
                            <span class="badge ${badgeClass} px-2 py-1 fw-bold" style="font-size: 0.76rem;">
                                ${count} / ${limit} Entries
                            </span>
                        </td>
                        <td>${studentPills || '<span class="text-muted small fst-italic">No students assigned yet</span>'}</td>
                        <td class="text-end">
                            <button class="btn btn-sm ${isFull || isExceeded ? 'btn-outline-secondary' : 'btn-primary'} py-1 px-2 text-nowrap" 
                                    onclick="window.openEventStudentPickerModal('${ev.id}', '${selectedHouse}')" 
                                    ${!isRegistrationOpen ? 'disabled' : ''}>
                                <i class="fas fa-user-plus me-1"></i>Assign
                            </button>
                        </td>
                    </tr>
                `;
            }
        }

        let html = '';
        if (soloEvents.length) {
            html += `
                <tr class="table-primary border-bottom border-primary" style="--bs-table-bg: #eff6ff;">
                    <td colspan="4" class="py-1 px-2 fw-bold text-primary" style="font-size: 0.8rem;">
                        <i class="fas fa-user me-2"></i>SOLO EVENTS (${soloEvents.length})
                    </td>
                </tr>
            `;
            html += soloEvents.map(renderEventRow).join('');
        }

        if (groupEvents.length) {
            html += `
                <tr class="table-success border-bottom border-success" style="--bs-table-bg: #f0fdf4;">
                    <td colspan="4" class="py-1 px-2 fw-bold text-success" style="font-size: 0.8rem;">
                        <i class="fas fa-users me-2"></i>GROUP EVENTS (${groupEvents.length})
                    </td>
                </tr>
            `;
            html += groupEvents.map(renderEventRow).join('');
        }

        tbody.innerHTML = html;
    }

    function updateView() {
        const term = searchInput.value.trim().toLowerCase();
        const selectedClass = classFilter.value;
        const selectedHouse = houseFilter.value;

        if (currentViewMode === 'events') {
            renderEventsView(term, selectedHouse);
        } else {
            renderStudentsView(term, selectedClass, selectedHouse);
        }
    }

    // Inline Click-to-Remove student registration
    tbody.addEventListener('click', async (e) => {
        const removeBtn = e.target.closest('.admin-remove-event-btn');
        if (!removeBtn) return;

        const studentId = removeBtn.dataset.studentId;
        const eventId = removeBtn.dataset.eventId;
        const regId = `${fest.id}_${studentId}`;
        const reg = state.festRegistrations.find(r => r.id === regId);
        if (!reg) return;

        const ev = state.festEvents.find(e => e.id === eventId);
        const st = state.students.find(s => s.id === studentId);

        if (!confirm(`Remove ${st?.name || 'student'} from "${ev?.name || 'this event'}"?`)) return;

        const updatedEvents = (reg.events || []).filter(id => id !== eventId);
        try {
            await saveScopedDoc('festRegistrations', regId, {
                ...reg,
                events: updatedEvents,
                lastUpdated: serverTimestamp()
            });
            await loadAllYearData(true);
            window.showAlert?.('Participant removed from event.', 'success');
            updateView();
        } catch (err) {
            console.error(err);
            window.showAlert?.('Failed to remove participant.', 'danger');
        }
    });

    // Listeners
    searchInput.addEventListener('input', updateView);
    classFilter.addEventListener('change', updateView);
    houseFilter.addEventListener('change', updateView);

    document.querySelectorAll('input[name="adminStageFilter"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentStageFilter = e.target.value;
            updateView();
        });
    });

    document.querySelectorAll('input[name="adminViewType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentViewMode = e.target.value;
            updateView();
        });
    });

    updateView();
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
                <div class="col-md-2">
                    <label class="small fw-bold">Prefix</label>
                    <input type="text" id="chest-prefix" class="form-control form-control-sm" placeholder="e.g. A-">
                </div>
                <div class="col-md-2">
                    <label class="small fw-bold">Start Number</label>
                    <input type="number" id="chest-start-no" class="form-control form-control-sm" value="101">
                </div>
                <div class="col-md-3">
                    <label class="small fw-bold">Next generation mode</label>
                    <select id="chest-generation-mode" class="form-select form-select-sm">
                        <option value="missing">Continue: only without chest numbers</option>
                        <option value="all">New: generate for all matching students</option>
                    </select>
                </div>
                <div class="col-md-2 d-flex gap-1">
                    <button class="btn btn-primary btn-sm w-100" onclick="window.generateChestNumbers()"><i class="fas fa-magic me-1"></i>Generate</button>
                    <button class="btn btn-outline-danger btn-sm" title="Clear all in target house" onclick="window.clearChestNumbers()"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
            <div id="chest-number-preview" class="alert alert-info py-2 mt-3 mb-0 small"></div>
        </div>

        <!-- Action Toolbar -->
        <div class="d-flex justify-content-between align-items-center mb-2 px-1">
            <div class="d-flex align-items-center gap-2">
                <button class="btn btn-sm btn-outline-danger" id="btn-clear-selected" onclick="window.clearSelectedChestNumbers()" disabled>
                    <i class="fas fa-eraser me-1"></i>Clear Selected (<span id="selected-count">0</span>)
                </button>
                <span class="small text-muted" id="chest-count-indicator">Showing 0 records</span>
            </div>
            <div id="duplicate-warning" class="badge bg-danger d-none">
                <i class="fas fa-exclamation-triangle me-1"></i> Duplicate Chest Numbers Detected
            </div>
        </div>

        <!-- Allocation Table -->
        <div class="table-responsive border rounded" style="max-height: 450px; overflow-y: auto;">
            <table class="table table-sm table-hover align-middle mb-0" id="chest-allocation-table">
                <thead class="table-light sticky-top">
                    <tr>
                        <th style="width: 40px;" class="text-center">
                            <input type="checkbox" class="form-check-input" id="chest-select-all" title="Select All Visible">
                        </th>
                        <th>Participant Name</th>
                        <th>House</th>
                        <th style="width: 220px;">Assigned Chest Number</th>
                        <th class="text-end" style="width: 100px;">Action</th>
                    </tr>
                </thead>
                <tbody id="chest-table-body">
                    <!-- Dynamic rendering -->
                </tbody>
            </table>
        </div>
    `;

    function refreshChestTable() {
        const selectedHouseId = document.getElementById('chest-house-picker').value;
        const tbody = document.getElementById('chest-table-body');
        
        // Filter by fest and selected house
        let regs = state.festRegistrations.filter(r => r.festId === fest.id && (!selectedHouseId || r.houseId === selectedHouseId));

        // Order: unassigned/missing first, then alphanumeric sort
        regs.sort((a, b) => {
            const hasA = Boolean(a.chestNo && a.chestNo.trim());
            const hasB = Boolean(b.chestNo && b.chestNo.trim());
            if (!hasA && hasB) return -1;
            if (hasA && !hasB) return 1;
            if (!hasA && !hasB) return (a.studentName || '').localeCompare(b.studentName || '');
            return String(a.chestNo).localeCompare(String(b.chestNo), undefined, { numeric: true, sensitivity: 'base' });
        });

        document.getElementById('chest-count-indicator').innerText = 
            `Showing ${regs.length} student(s) ${selectedHouseId ? 'in selected house' : 'across all houses'}`;

        tbody.innerHTML = regs.map(reg => {
            const house = houses.find(h => h.id === reg.houseId);
            const isMissing = !reg.chestNo;
            return `
                <tr data-reg-id="${reg.id}" class="${isMissing ? 'table-warning-subtle' : ''}">
                    <td class="text-center">
                        <input type="checkbox" class="form-check-input chest-row-select" value="${reg.id}">
                    </td>
                    <td>
                        <strong>${reg.studentName}</strong>
                        ${isMissing ? '<span class="badge bg-warning text-dark ms-1">No Number</span>' : ''}
                    </td>
                    <td><span class="badge bg-light text-dark border">${house?.name || 'N/A'}</span></td>
                    <td>
                        <div class="position-relative">
                            <input type="text" 
                                class="form-control form-control-sm chest-val-input" 
                                value="${reg.chestNo || ''}" 
                                placeholder="None"
                                data-reg-id="${reg.id}"
                                oninput="window.validateChestDuplicates()">
                            <div class="invalid-feedback small py-0">Duplicate chest number!</div>
                        </div>
                    </td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-success py-0" onclick="window.saveSingleChestNumber('${reg.id}', this)">Save</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Reset select-all state
        const selectAllBox = document.getElementById('chest-select-all');
        if (selectAllBox) selectAllBox.checked = false;
        window.syncChestSelectionState();
        window.validateChestDuplicates();
    }

    // Event listeners
    document.getElementById('chest-house-picker').addEventListener('change', () => {
        refreshChestTable();
        updateChestNumberPreview();
    });

    ['chest-prefix', 'chest-start-no', 'chest-generation-mode'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateChestNumberPreview);
        document.getElementById(id)?.addEventListener('change', updateChestNumberPreview);
    });

    // Master checkbox listener
    document.getElementById('chest-select-all')?.addEventListener('change', function() {
        const rowCheckboxes = document.querySelectorAll('.chest-row-select');
        rowCheckboxes.forEach(cb => cb.checked = this.checked);
        window.syncChestSelectionState();
    });

    // Row selection listener via delegation
    document.getElementById('chest-table-body')?.addEventListener('change', (e) => {
        if (e.target.classList.contains('chest-row-select')) {
            window.syncChestSelectionState();
        }
    });

    refreshChestTable();
    updateChestNumberPreview();
}

window.syncChestSelectionState = function() {
    const rowCheckboxes = Array.from(document.querySelectorAll('.chest-row-select'));
    const selected = rowCheckboxes.filter(cb => cb.checked);
    const clearBtn = document.getElementById('btn-clear-selected');
    const selectedCount = document.getElementById('selected-count');
    const selectAllBox = document.getElementById('chest-select-all');

    if (selectedCount) selectedCount.innerText = selected.length;
    if (clearBtn) clearBtn.disabled = selected.length === 0;

    if (selectAllBox && rowCheckboxes.length > 0) {
        selectAllBox.checked = selected.length === rowCheckboxes.length;
        selectAllBox.indeterminate = selected.length > 0 && selected.length < rowCheckboxes.length;
    }
};

window.validateChestDuplicates = function() {
    const inputs = Array.from(document.querySelectorAll('.chest-val-input'));
    const counts = {};
    const duplicateBadge = document.getElementById('duplicate-warning');
    let hasDuplicate = false;

    inputs.forEach(input => {
        const val = input.value.trim().toUpperCase();
        if (val) counts[val] = (counts[val] || 0) + 1;
    });

    inputs.forEach(input => {
        const val = input.value.trim().toUpperCase();
        if (val && counts[val] > 1) {
            input.classList.add('is-invalid');
            hasDuplicate = true;
        } else {
            input.classList.remove('is-invalid');
        }
    });

    if (duplicateBadge) duplicateBadge.classList.toggle('d-none', !hasDuplicate);
    return !hasDuplicate;
};

function getChestNumberInfo() {
    const fest = state.managingFest;
    const targetHouse = document.getElementById('chest-house-picker')?.value || '';
    const prefix = document.getElementById('chest-prefix')?.value.trim().toUpperCase() || '';
    const selected = state.festRegistrations.filter(reg => reg.festId === fest.id && (!targetHouse || reg.houseId === targetHouse));
    const assigned = selected.filter(reg => reg.chestNo);
    const matchingNumbers = assigned.map(reg => {
        const value = String(reg.chestNo).trim().toUpperCase();
        if (prefix && !value.startsWith(prefix)) return null;
        const number = Number(value.slice(prefix.length));
        return Number.isFinite(number) ? number : null;
    }).filter(number => number !== null);
    const lastNumber = matchingNumbers.length ? Math.max(...matchingNumbers) : null;
    return { targetHouse, prefix, selected, assigned, missing: selected.filter(reg => !reg.chestNo), lastNumber };
}

function updateChestNumberPreview() {
    const preview = document.getElementById('chest-number-preview');
    if (!preview) return;
    const info = getChestNumberInfo();
    const house = state.festHouses.find(item => item.id === info.targetHouse);
    const last = info.lastNumber === null ? 'None' : `${info.prefix}${info.lastNumber}`;
    const next = info.lastNumber === null ? (parseInt(document.getElementById('chest-start-no')?.value, 10) || 101) : info.lastNumber + 1;
    preview.innerHTML = `<strong>${house?.name || 'All houses'}</strong> | Selected: ${info.selected.length} | Already assigned: ${info.assigned.length} | Without chest: ${info.missing.length} | Prefix: <strong>${info.prefix || '(none)'}</strong> | Last assigned: <strong>${last}</strong> | Next suggested: <strong>${info.prefix}${next}</strong>`;
}

window.generateChestNumbers = async function() {
    const fest = state.managingFest;
    const info = getChestNumberInfo();
    const targetHouse = info.targetHouse;
    const prefix = info.prefix;
    const mode = document.getElementById('chest-generation-mode').value;
    const requestedStart = parseInt(document.getElementById('chest-start-no').value, 10) || 101;
    let counter = mode === 'missing' && info.lastNumber !== null ? info.lastNumber + 1 : requestedStart;

    let targetRegs = mode === 'all' ? info.selected : info.missing;
    if (targetRegs.length === 0) return window.showAlert('No registered participants match the criteria.', 'warning');

    if (mode === 'all' && info.assigned.length > 0) {
        const confirmed = confirm(`This will replace ${info.assigned.length} existing chest numbers for ${targetHouse ? 'this house' : 'all houses'}. Continue?`);
        if (!confirmed) return;
    }

    targetRegs = [...targetRegs].sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));

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
        window.showAlert(`${mode === 'all' ? 'Generated new' : 'Continued'} chest numbers for ${targetRegs.length} students.`, 'success');
        renderSubTabChestNumbers();
    } catch (err) {
        console.error(err);
        window.showAlert('Error generating chest numbers.', 'danger');
    }
};

window.clearSelectedChestNumbers = async function() {
    const selectedBoxes = Array.from(document.querySelectorAll('.chest-row-select:checked'));
    if (selectedBoxes.length === 0) return;

    if (!confirm(`Clear chest numbers for the ${selectedBoxes.length} selected student(s)?`)) return;

    const ids = selectedBoxes.map(cb => cb.value);
    const batch = writeBatch(db);

    ids.forEach(id => {
        const reg = state.festRegistrations.find(r => r.id === id);
        if (reg) {
            reg.chestNo = null;
            batch.update(getScopedDoc('festRegistrations', id), {
                chestNo: null,
                lastUpdated: serverTimestamp()
            });
        }
    });

    try {
        await batch.commit();
        window.showAlert(`Cleared chest numbers for ${ids.length} students.`, 'info');
        renderSubTabChestNumbers();
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to clear selected chest numbers.', 'danger');
    }
};

window.clearChestNumbers = async function() {
    const fest = state.managingFest;
    const targetHouse = document.getElementById('chest-house-picker').value;
    const label = targetHouse ? 'the selected house' : 'all houses';
    if (!confirm(`Clear chest numbers for ALL students in ${label}?`)) return;

    let targetRegs = state.festRegistrations.filter(r => r.festId === fest.id && (!targetHouse || r.houseId === targetHouse));
    if (targetRegs.length === 0) return window.showAlert('No records to clear.', 'warning');

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
    const input = row.querySelector('.chest-val-input');
    const inputVal = input.value.trim().toUpperCase() || null;

    // Check duplicate against existing fest registrations
    if (inputVal) {
        const isDuplicate = state.festRegistrations.some(
            r => r.festId === state.managingFest.id && 
                 r.id !== regId && 
                 r.chestNo && 
                 r.chestNo.trim().toUpperCase() === inputVal
        );

        if (isDuplicate) {
            input.classList.add('is-invalid');
            window.showAlert(`Chest number "${inputVal}" is already assigned to another participant.`, 'danger');
            return;
        }
    }

    try {
        await updateScopedDoc('festRegistrations', regId, { 
            chestNo: inputVal,
            lastUpdated: serverTimestamp()
        });
        const local = state.festRegistrations.find(r => r.id === regId);
        if (local) local.chestNo = inputVal;

        input.classList.remove('is-invalid');
        btn.classList.replace('btn-outline-success', 'btn-success');
        btn.innerText = 'Saved';
        setTimeout(() => {
            btn.classList.replace('btn-success', 'btn-outline-success');
            btn.innerText = 'Save';
        }, 1200);

        window.validateChestDuplicates();
        updateChestNumberPreview();
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

                    <div class="alert alert-success py-2 small d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
    <span><i class="fas fa-qrcode me-1"></i><strong>Camera QR Scanner:</strong> Instant Result Entry</span>
    <div class="d-flex gap-1">
        <button class="btn btn-success btn-sm" onclick="window.openQrScannerModal()">
            <i class="fas fa-camera me-1"></i>Scan Scorecard
        </button>
        <button class="btn btn-outline-success btn-sm" onclick="window.copyJudgeScannerLink()">
            <i class="fas fa-copy me-1"></i>Copy Link
        </button>
    </div>
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

window.copyJudgeScannerLink = function(festId) {
    const root = window.location.href.split('#')[0];
    const targetUrl = `${root}#fest-scan?year=${systemContext.activeYearId}&fest=${festId || state.managingFest?.id || ''}`;
    navigator.clipboard.writeText(targetUrl);
    window.showAlert('Result scanner link copied to clipboard!', 'success');
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

// =========================================================================
// --- REACTIVE LIVE UI DISPATCHER ---
// =========================================================================

// Debounce timer to prevent rapid redraws when batch writes arrive
let liveRefreshDebounceTimer = null;

window.addEventListener('festDataUpdated', (e) => {
    if (!state.managingFest) return;

    clearTimeout(liveRefreshDebounceTimer);
    liveRefreshDebounceTimer = setTimeout(() => {
        refreshActiveAdminView(e.detail.collection);
    }, 120);
});

/**
 * Checks which tab and sub-tab are visible and triggers only its render function.
 */
function refreshActiveAdminView(changedCollection) {
    // 1. Check main admin active tab
    const activeMainTab = document.querySelector('#festAdminTabs .nav-link.active');
    const mainTarget = activeMainTab?.getAttribute('data-bs-target');

    if (!mainTarget) return;

    // Refresh Dashboard counters and rankings
    if (mainTarget === '#tab-dash') {
        renderDashboardTab();
        return;
    }

    // Refresh Events management table
    if (mainTarget === '#tab-events' && changedCollection === 'festEvents') {
        renderEventsTab();
        return;
    }

    // Refresh Participants workspace
    if (mainTarget === '#tab-participants') {
        const activeSubTab = document.querySelector('#participant-sub-tabs .nav-link.active');
        const subTarget = activeSubTab?.getAttribute('data-bs-target');

        const isRegOpen = state.managingFest.registrationOpen === true;

        if (subTarget === '#subtab-registrations') {
            // Re-render allocations table using current search and filter values
            renderSubTabRegistrations(isRegOpen);
        } else if (subTarget === '#subtab-groups') {
            // Re-render group table rows preserving sort order without wiping form inputs
            if (typeof renderAdminGroupsTableBody === 'function') {
                renderAdminGroupsTableBody(isRegOpen);
            } else {
                renderSubTabGroups(isRegOpen);
            }
        } else if (subTarget === '#subtab-participation') {
            renderSubTabParticipation();
        } else if (subTarget === '#subtab-chest' && changedCollection === 'festRegistrations') {
            // Only refresh chest table if the bulk generator is not currently open/editing
            const activeInput = document.activeElement;
            if (!activeInput || !activeInput.classList.contains('chest-val-input')) {
                renderSubTabChestNumbers();
            }
        }
        return;
    }

    // Refresh Live Result Entry tab if an event is currently loaded
    if (mainTarget === '#tab-result-entry' && changedCollection === 'festResults') {
        const evSelect = document.getElementById('admin-result-event');
        if (evSelect && evSelect.value) {
            // Do not redraw if an admin is currently typing in an input
            const activeEl = document.activeElement;
            const isTyping = activeEl && (activeEl.classList.contains('result-score-input') || activeEl.tagName === 'SELECT');
            if (!isTyping && typeof loadResultEvent === 'function') {
                loadResultEvent(evSelect.value);
            }
        }
    }
}

window.printProgrammeChecklist = function() {
    const fest = state.managingFest;
    if (!fest) return window.showAlert?.('Please select a festival first.', 'warning');

    const events = state.festEvents.filter(e => e.festId === fest.id && e.cancelled !== true);
    const houses = state.festHouses;

    if (!events.length) {
        return window.showAlert?.('No active events to print.', 'info');
    }

    // Group events by category
    const categories = [...new Set(events.map(e => e.category || 'General'))].sort();

    // Compact list of house reference tags (e.g. RED [R], BLUE [B])
    const houseLegend = houses.map(h => `<strong>${h.name}</strong>: <code>${h.id.slice(0, 2).toUpperCase()}</code>`).join(' &bull; ');

    const categoryTablesHtml = categories.map((cat, catIdx) => {
        const catEvents = events.filter(e => (e.category || 'General') === cat);

        // Sort: Solo First, then Group; then by Stage and Name
        catEvents.sort((a, b) => {
            if (a.isGroupEvent !== b.isGroupEvent) return a.isGroupEvent ? 1 : -1;
            if (a.type !== b.type) return a.type === 'onStage' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        const rows = catEvents.map((ev, idx) => {
            const isGroup = ev.isGroupEvent;
            const isOff = ev.type === 'offStage';

            return `
                <tr style="height: 32px;">
                    <td style="text-align: center; font-weight: bold; width: 4%;">${idx + 1}</td>
                    <td style="width: 38%;">
                        <strong>${ev.name}</strong>
                        <div style="font-size: 7.5pt; color: #555;">
                            ${isOff ? 'Off-Stage' : 'On-Stage'} &bull; ${isGroup ? 'Group Team' : 'Solo'} &bull; Stage: ${ev.stage || 'Main'} &bull; ${ev.gender || 'Common'}
                        </div>
                    </td>
                    <td style="width: 10%; text-align: center; font-size: 8pt;">${isOff ? 'Off-Stage' : 'On-Stage'}</td>
                    <td style="width: 8%; text-align: center; font-size: 8pt;">${isGroup ? 'Group' : 'Solo'}</td>
                    
                    <!-- 2-Letter House Code Input Boxes -->
                    <td style="width: 13%; text-align: center; vertical-align: middle;">
                        <div style="display: inline-block; width: 34px; height: 22px; border: 1.5px solid #000; border-radius: 3px; font-weight: bold; line-height: 20px;"></div>
                    </td>
                    <td style="width: 13%; text-align: center; vertical-align: middle;">
                        <div style="display: inline-block; width: 34px; height: 22px; border: 1.5px solid #000; border-radius: 3px; font-weight: bold; line-height: 20px;"></div>
                    </td>
                    <td style="width: 14%; text-align: center; vertical-align: middle;">
                        <div style="display: inline-block; width: 34px; height: 22px; border: 1.5px solid #000; border-radius: 3px; font-weight: bold; line-height: 20px;"></div>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div style="margin-bottom: 22px; page-break-inside: avoid; ${catIdx > 0 ? 'margin-top: 15px;' : ''}">
                <div style="background: #e9ecef; border-left: 5px solid #0d6efd; padding: 4px 8px; font-weight: bold; font-size: 9.5pt; margin-bottom: 6px;">
                    CATEGORY: ${cat.toUpperCase()} (${catEvents.length} Programmes)
                </div>

                <table class="table table-bordered table-sm" style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
                    <thead style="background: #f8f9fa;">
                        <tr>
                            <th style="text-align: center;">#</th>
                            <th>Programme / Event Name</th>
                            <th style="text-align: center;">Stage</th>
                            <th style="text-align: center;">Mode</th>
                            <th style="text-align: center; background: #fff3cd;">🥇 1st House</th>
                            <th style="text-align: center; background: #e2e3e5;">🥈 2nd House</th>
                            <th style="text-align: center; background: #f8d7da;">🥉 3rd House</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    }).join('');

    const contentHtml = `
        <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #212529; padding-bottom: 10px;">
            <h2 style="margin: 0; font-size: 16pt;">${fest.name}</h2>
            <h4 style="margin: 3px 0; color: #495057; font-size: 11.5pt;">Official Programme Checklist &amp; Tabulator Result Sheet</h4>
            <div style="font-size: 8.5pt; color: #555; margin-top: 4px;">
                <strong>House Codes (Write 2 letters in box):</strong> ${houseLegend}
            </div>
        </div>

        ${categoryTablesHtml}

        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 8.5pt; page-break-inside: avoid;">
            <div>Stage Manager: ______________________</div>
            <div>Scrutinizer: ______________________</div>
            <div>Convener Signature: ______________________</div>
        </div>
    `;

    window.printReport({
        contentHtml,
        title: `Programme_Checklist_${fest.name.replace(/\s+/g, '_')}`,
        pageSize: 'A4 portrait'
    });
};