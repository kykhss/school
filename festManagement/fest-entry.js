// =========================================================================
// --- FEST ENTRY / HOUSE CAPTAIN PORTAL (fest-entry.js) ---
// =========================================================================

import { 
    getScopedDoc,
    saveScopedDoc, 
    deleteScopedDoc,
    systemContext,
    loadCachedCollection,
    db
} from "./firebase-config.js";

import { 
    state, 
    loadAllYearData,
    getStudentClassName,
    getStudentCategory,
    hashPassword,
    eventHouseLimit
} from "./app-state.js";

import { 
    doc, 
    getDoc, 
    writeBatch, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";



function houseEventSoloCount(festId, houseId, eventId, excludeStudentId = null) {
    return state.festRegistrations.filter(reg => reg.festId === festId && reg.houseId === houseId && reg.studentId !== excludeStudentId && reg.events?.includes(eventId)).length;
}

function houseEventGroupCount(festId, houseId, eventId, excludeGroupId = null) {
    return state.festGroups.filter(group => group.festId === festId && group.houseId === houseId && group.id !== excludeGroupId && group.eventId === eventId).length;
}

// Inject lightweight mobile helper styles once
function ensurePortalMobileStyles() {
    if (document.getElementById('fest-portal-mobile-styles')) return;
    const style = document.createElement('style');
    style.id = 'fest-portal-mobile-styles';
    style.textContent = `
        .fest-scroll-tabs {
            display: flex;
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            gap: 0.35rem;
            padding-bottom: 4px;
        }
        .fest-scroll-tabs::-webkit-scrollbar {
            height: 4px;
        }
        .fest-scroll-tabs::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
        }
        .fest-scroll-tabs .nav-link {
            white-space: nowrap;
            font-size: 0.85rem;
            padding: 0.45rem 0.75rem;
            border-radius: 50rem;
        }
        @media (max-width: 767.98px) {
            .table-mobile-responsive {
                font-size: 0.82rem;
            }
            .table-mobile-responsive td, .table-mobile-responsive th {
                padding: 0.45rem 0.4rem;
            }
            .portal-container {
                padding-left: 0.5rem !important;
                padding-right: 0.5rem !important;
            }
            .modal-col-border {
                border-right: none !important;
                border-bottom: 1px solid #dee2e6;
                margin-bottom: 1rem;
                padding-bottom: 1rem;
            }
            .btn-touch {
                min-height: 38px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
        }
        @media (min-width: 768px) {
            .modal-col-border {
                border-right: 1px solid #dee2e6;
            }
        }
    `;
    document.head.appendChild(style);
}

// --- 1. ENTRY ROUTE INTERCEPTOR ---

/**
 * Detects URL hash '#fest-entry' and bootstraps the House Captain experience.
 */
window.checkForDataEntryMode = async function() {
    if (!window.location.hash.startsWith('#fest-entry')) return false;
    ensurePortalMobileStyles();

    const queryParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const yearId = queryParams.get('year') || systemContext.activeYearId;
    const festId = queryParams.get('fest');
    const houseId = queryParams.get('house');

    if (!festId || !houseId) {
        document.body.innerHTML = `<div class="container py-4"><div class="alert alert-danger shadow-sm">Invalid entry portal parameters provided.</div></div>`;
        return true;
    }

    // Anchor active academic year
    systemContext.activeYearId = yearId;
    localStorage.setItem('activeYearId', yearId);

    document.body.innerHTML = `
        <div class="vh-100 d-flex flex-column align-items-center justify-content-center p-3 text-center">
            <div class="spinner-border text-primary mb-3" role="status"></div>
            <p class="mb-0 text-muted fw-semibold fs-6">Connecting to Fest House Portal...</p>
        </div>
    `;

    try {
        const festSnap = await getDoc(doc(db, `academicYears/${yearId}/fests`, festId));
        const houseSnap = await getDoc(doc(db, `academicYears/${yearId}/festHouses`, houseId));

        if (!festSnap.exists() || !houseSnap.exists()) {
            document.body.innerHTML = `<div class="container py-4"><div class="alert alert-danger shadow-sm">Target Fest or House record does not exist.</div></div>`;
            return true;
        }

        const festData = { id: festSnap.id, ...festSnap.data() };
        const houseData = { id: houseSnap.id, ...houseSnap.data() };

        renderHousePortalLogin(festData, houseData);
        return true;
    } catch (err) {
        console.error("Portal error:", err);
        document.body.innerHTML = `<div class="container py-4"><div class="alert alert-danger shadow-sm">Connection failed. Check network stability.</div></div>`;
        return true;
    }
};

// --- 2. AUTHENTICATION & PORTAL SHELL ---

function renderHousePortalLogin(fest, house) {
    document.body.innerHTML = `
        <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
            <div class="card shadow-sm border-0 w-100" style="max-width: 400px; border-radius: 1rem;">
                <div class="card-body p-4 text-center">
                    <div class="mb-3 d-flex justify-content-center">
                        <span class="rounded-circle d-inline-block shadow-sm" style="background-color: ${house.color || '#0d6efd'}; width: 48px; height: 48px;"></span>
                    </div>
                    <h4 class="fw-bold mb-1 fs-5">${house.name} Entry</h4>
                    <p class="text-muted small mb-3">${fest.name}</p>
                    <form id="house-portal-login-form">
                        <div class="mb-3">
                            <input type="password" id="house-secret-key" class="form-control form-control-lg text-center fs-6 py-2" placeholder="Enter House Password" required autocomplete="current-password">
                        </div>
                        <button type="submit" class="btn btn-primary w-100 fw-bold py-2 btn-touch">Enter Dashboard</button>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('house-portal-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputKey = document.getElementById('house-secret-key').value.trim();
        const targetKey = fest.housePasswords?.[house.id];
        const inputHash = await hashPassword(inputKey);

        if (inputHash === targetKey || inputKey === targetKey) {
            state.managingFest = fest;
            state.loggedInHouseId = house.id;

            await loadAllYearData();
            bootstrapHouseCaptainWorkspace(fest, house);
        } else {
            window.showAlert('Incorrect House Password.', 'danger');
        }
    });
}

function bootstrapHouseCaptainWorkspace(fest, house) {
    ensurePortalMobileStyles();
    const isRegistrationOpen = fest.registrationOpen === true;

    document.body.innerHTML = `
        <nav class="navbar navbar-dark bg-dark px-3 py-2 sticky-top shadow-sm">
            <div class="container-fluid px-0 d-flex justify-content-between align-items-center flex-nowrap">
                <div class="navbar-brand mb-0 d-flex align-items-center text-truncate me-2" style="font-size: 0.95rem;">
                    <span class="rounded-circle me-2 flex-shrink-0" style="background-color: ${house.color || '#0d6efd'}; width: 14px; height: 14px; display: inline-block;"></span>
                    <span class="fw-bold text-truncate">${house.name}</span>
                    <span class="text-white-50 ms-1 d-none d-sm-inline text-truncate">&bull; ${fest.name}</span>
                </div>
                <span class="badge ${isRegistrationOpen ? 'bg-success' : 'bg-danger'} flex-shrink-0" style="font-size: 0.72rem; padding: 0.4em 0.6em;">
                    ${isRegistrationOpen ? 'Open' : 'Closed'}
                </span>
            </div>
        </nav>

        <div class="container-fluid portal-container py-3">
            <!-- Scrollable mobile friendly pills navigation -->
            <ul class="nav nav-pills fest-scroll-tabs mb-3" id="captain-tabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-eventwise-reg" type="button" role="tab">
                        <i class="fas fa-calendar-check me-1"></i>Event-wise
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" data-bs-toggle="pill" data-bs-target="#tab-solo-reg" type="button" role="tab">
                        <i class="fas fa-user-edit me-1"></i>Solo Entries
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-group-reg" type="button" role="tab">
                        <i class="fas fa-users me-1"></i>Group Teams
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-view-summary" type="button" role="tab">
                        <i class="fas fa-list-check me-1"></i>Roster Summary
                    </button>
                </li>
            </ul>

            <div class="tab-content card p-2 p-md-3 shadow-sm border-0">
                <div class="tab-pane fade show active" id="tab-solo-reg" role="tabpanel"></div>
                <div class="tab-pane fade" id="tab-eventwise-reg" role="tabpanel"></div>
                <div class="tab-pane fade" id="tab-group-reg" role="tabpanel"></div>
                <div class="tab-pane fade" id="tab-view-summary" role="tabpanel"></div>
            </div>
        </div>
    `;

    renderSoloRegistrationTab(fest, house, isRegistrationOpen);
    eventwiseRegistrationTab(fest, house, isRegistrationOpen);
    renderGroupTeamTab(fest, house, isRegistrationOpen);
    renderRosterSummaryTab(fest, house);
}

// --- 3. SOLO REGISTRATION TAB ---

function renderSoloRegistrationTab(fest, house, isRegistrationOpen) {
    const container = document.getElementById('tab-solo-reg');
    const houseStudents = state.students.filter(s => s.houseId === house.id);
    const classes = state.classes;

    container.innerHTML = `
        <div class="row g-2 mb-3 align-items-center">
            <div class="col-12 col-md-5">
                <input type="search" id="captain-student-search" class="form-control form-control-sm" placeholder="Search by student name or admission no...">
            </div>
            <div class="col-7 col-md-4">
                <select id="captain-class-filter" class="form-select form-select-sm">
                    <option value="all">All Classes</option>
                    ${classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="col-5 col-md-3 text-end text-muted small">
                Strength: <strong>${houseStudents.length}</strong>
            </div>
        </div>

        <div class="table-responsive border rounded bg-white" style="max-height: 65vh; overflow-y: auto;">
            <table class="table table-hover align-middle mb-0" id="house-solo-table">
                <thead class="table-light sticky-top shadow-sm">
                    <tr>
                        <th style="min-width: 220px; width: 35%;">Student Details</th>
                        <th style="min-width: 260px; width: 50%;">Registered Events</th>
                        <th class="text-end" style="min-width: 100px; width: 15%;">Action</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;

    const tbody = container.querySelector('#house-solo-table tbody');

    function populateRows(searchTerm = '', classFilter = 'all') {
        let filtered = houseStudents;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(s => 
                (s.name && s.name.toLowerCase().includes(term)) || 
                String(s.admissionNumber || '').includes(term)
            );
        }
        if (classFilter !== 'all') {
            filtered = filtered.filter(s => s.classId === classFilter);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-5 small">No matching students found in your house.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(student => {
            const regId = `${fest.id}_${student.id}`;
            const reg = state.festRegistrations.find(r => r.id === regId);
            const events = reg?.events || [];
            const count = events.length;

            const badges = events.map(id => {
                const ev = state.festEvents.find(e => e.id === id);
                if (!ev) return '';
                const limit = eventHouseLimit(fest, ev, 'solo');
                const evCount = houseEventSoloCount(fest.id, house.id, ev.id);
                const invalid = evCount > limit;
                
                return `
                    <span class="badge ${invalid ? 'bg-danger text-white' : 'bg-light text-dark border'} px-2 py-1 me-1 mb-1 d-inline-flex align-items-center gap-1 shadow-sm" 
                          style="font-size: 0.78rem; font-weight: 500; white-space: normal; text-align: left;" 
                          title="${invalid ? `House limit exceeded: ${evCount}/${limit}` : `House entries: ${evCount}/${limit}`}">
                        <span>${ev.name}</span>
                        <span class="badge ${invalid ? 'bg-white text-danger' : 'bg-secondary-subtle text-secondary'} rounded-pill" style="font-size: 0.7rem;">
                            ${evCount}/${limit}
                        </span>
                    </span>
                `;
            }).join('');

            const invalidCount = events.filter(id => {
                const ev = state.festEvents.find(e => e.id === id);
                return ev && houseEventSoloCount(fest.id, house.id, ev.id) > eventHouseLimit(fest, ev, 'solo');
            }).length;

            return `
                <tr data-studentid="${student.id}" class="${invalidCount ? 'table-danger-subtle' : ''}">
                    <!-- Student Identity Column -->
                    <td class="py-2">
                        <div class="fw-bold text-dark text-break fs-6 lh-sm mb-1">${student.name}</div>
                        <div class="d-flex flex-wrap align-items-center gap-1">
                            <span class="badge bg-primary-subtle text-primary border border-primary-subtle py-1 px-1" style="font-size: 0.72rem;">
                                ${getStudentCategory(student)}
                            </span>
                            <span class="badge bg-light text-muted border py-1 px-1" style="font-size: 0.72rem;">
                                Adm: ${student.admissionNumber || 'N/A'}
                            </span>
                            <span class="text-secondary small ms-1" style="font-size: 0.75rem;">
                                ${getStudentClassName(student.classId, student.division)}
                            </span>
                        </div>
                    </td>

                    <!-- Events Badges Column -->
                    <td class="py-2">
                        <div class="d-flex flex-wrap align-items-center py-1">
                            ${badges || '<span class="text-muted small fst-italic">No events registered</span>'}
                        </div>
                    </td>

                    <!-- Action Column -->
                    <td class="py-2 text-end align-middle">
                        <button class="btn ${invalidCount ? 'btn-danger' : 'btn-outline-primary'} btn-sm px-2 py-1 shadow-sm d-inline-flex align-items-center" 
                                onclick="window.openEventAllocationModal('${student.id}')" 
                                ${!isRegistrationOpen ? 'disabled' : ''}>
                            <i class="fas fa-edit me-1"></i>
                            <span class="d-none d-sm-inline">Manage</span>
                            <span class="badge ${invalidCount ? 'bg-white text-danger' : 'bg-primary text-white'} rounded-pill ms-1 px-1">
                                ${count}
                            </span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    container.querySelector('#captain-student-search').addEventListener('input', (e) => {
        populateRows(e.target.value, container.querySelector('#captain-class-filter').value);
    });

    container.querySelector('#captain-class-filter').addEventListener('change', (e) => {
        populateRows(container.querySelector('#captain-student-search').value, e.target.value);
    });

    populateRows();
}

// --- 4. SOLO EVENT SELECTION MODAL & LIMIT ENFORCEMENT ---

window.openEventAllocationModal = function(studentId) {
    const student = state.students.find(s => s.id === studentId);
    const fest = state.managingFest;
    const isAdminSession = state.currentUserRole === 'admin';
    const houseId = state.loggedInHouseId || student?.houseId || null;
    const studentCat = getStudentCategory(student);

    const regId = `${fest.id}_${student.id}`;
    const reg = state.festRegistrations.find(r => r.id === regId);
    const selected = new Set(reg?.events || []);

    const maxOnStage = fest.settings?.maxOnStageSoloEvents ?? 2;
    const maxOffStage = fest.settings?.maxOffStageSoloEvents ?? 1;

    const eligibleEvents = state.festEvents.filter(e => {
        if (e.festId !== fest.id || e.isGroupEvent) return false;
        const matchesCategory = (e.category === 'General' || e.category === studentCat);
        const matchesGender = (!e.gender || e.gender === 'Common' || 
            (student.gender === 'M' && e.gender === 'Male') || 
            (student.gender === 'F' && e.gender === 'Female'));
        return matchesCategory && matchesGender;
    });

    const onStage = eligibleEvents.filter(e => e.type !== 'offStage');
    const offStage = eligibleEvents.filter(e => e.type === 'offStage');

    const modalBody = `
        <div class="mb-2 p-1 bg-light rounded border">
            <div class="d-flex justify-content-between align-items-center">
                <span class="badge bg-info text-dark">Category: ${studentCat}</span>
                <span class="small text-muted">Gender: <strong>${student.gender || 'Common'}</strong></span>
            </div>
            <p class="small text-muted mt-1 mb-0" style="font-size: 0.76rem;">
                Max Allowed: On-Stage (<strong>${maxOnStage}</strong>), Off-Stage (<strong>${maxOffStage}</strong>).
            </p>
        </div>
        <div class="row g-2">
            <div class="col-12 col-md-6 modal-col-border">
                <h6 class="fw-bold text-primary small mb-2"><i class="fas fa-microphone me-1"></i>ON-STAGE EVENTS</h6>
                <div class="d-flex flex-column gap-1" id="box-onstage" style="max-height: 220px; overflow-y: auto;">
                    ${renderChecklist(onStage, selected, 'onStage')}
                </div>
            </div>
            <div class="col-12 col-md-6">
                <h6 class="fw-bold text-primary small mb-2"><i class="fas fa-palette me-1"></i>OFF-STAGE EVENTS</h6>
                <div class="d-flex flex-column gap-1" id="box-offstage" style="max-height: 220px; overflow-y: auto;">
                    ${renderChecklist(offStage, selected, 'offStage')}
                </div>
            </div>
        </div>
    `;

    const modalFooter = `
        <button class="btn btn-secondary btn-sm px-3" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-success btn-sm fw-bold px-3 btn-touch" id="modal-save-solo-btn">Save Selections</button>
    `;

    window.showGlobalModal(`Solo Registration: ${student.name}`, modalBody, modalFooter);

    const checkboxes = document.querySelectorAll('.ev-select-cb');
    function applyLimits() {
        const onCount = document.querySelectorAll('.ev-select-cb[data-type="onStage"]:checked').length;
        const offCount = document.querySelectorAll('.ev-select-cb[data-type="offStage"]:checked').length;

        checkboxes.forEach(cb => {
            const isChecked = cb.checked;
            const type = cb.dataset.type;
            if (!isChecked) {
                if (type === 'onStage' && onCount >= maxOnStage) cb.disabled = true;
                else if (type === 'offStage' && offCount >= maxOffStage) cb.disabled = true;
                else cb.disabled = false;
            }
            const event = state.festEvents.find(item => item.id === cb.value);
            const existingCount = event ? houseEventSoloCount(fest.id, houseId, event.id, student.id) : 0;
            const limit = event ? eventHouseLimit(fest, event, 'solo') : 0;
            const item = cb.closest('.form-check');
            item?.classList.toggle('text-danger', existingCount + (cb.checked ? 1 : 0) > limit);
            item?.querySelector('.event-limit-warning')?.remove();
            if (event) {
                item?.querySelector('label')?.insertAdjacentHTML('beforeend', ` <span class="badge ${existingCount + (cb.checked ? 1 : 0) > limit ? 'bg-danger' : 'bg-light text-dark'} border event-limit-warning ms-1" style="font-size: 0.68rem;">House: ${existingCount + (cb.checked ? 1 : 0)}/${limit}</span>`);
            }
        });
    }

    checkboxes.forEach(cb => cb.addEventListener('change', applyLimits));
    applyLimits();

    document.getElementById('modal-save-solo-btn').addEventListener('click', async () => {
        const checkedEvents = Array.from(document.querySelectorAll('.ev-select-cb:checked')).map(cb => cb.value);
        const exceeded = checkedEvents.map(id => state.festEvents.find(event => event.id === id)).filter(event => event && houseEventSoloCount(fest.id, houseId, event.id, student.id) + 1 > eventHouseLimit(fest, event, 'solo'));
        if (exceeded.length) return window.showAlert(`House limit exceeded for: ${exceeded.map(event => event.name).join(', ')}`, 'danger');
        
        const existingGroupEvents = (reg?.events || []).filter(id => {
            return state.festEvents.find(e => e.id === id)?.isGroupEvent;
        });

        const finalEvents = [...new Set([...checkedEvents, ...existingGroupEvents])];

        const payload = {
            id: regId,
            festId: fest.id,
            studentId: student.id,
            studentName: student.name,
            houseId: houseId,
            events: finalEvents,
            chestNo: reg?.chestNo || null
        };

        try {
            await saveScopedDoc('festRegistrations', regId, payload);
            window.showAlert('Registration saved.', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('global-modal'));
            modal?.hide();
            await loadAllYearData(true);
            if (isAdminSession && typeof window.renderFestManagement === 'function') {
                window.renderFestManagement();
            } else {
                const house = state.festHouses.find(h => h.id === houseId);
                if (house) bootstrapHouseCaptainWorkspace(fest, house);
            }
        } catch (err) {
            console.error(err);
            window.showAlert('Failed to save registration.', 'danger');
        }
    });
};

function renderChecklist(eventList, selectedSet, type, houseId = null, festId = null) {
    if (!eventList || eventList.length === 0) {
        return `<div class="p-3 text-center text-muted small bg-light rounded border border-dashed">No eligible events found.</div>`;
    }

    const currentFest = festId ? { id: festId } : state.managingFest;
    const currentHouseId = houseId || (state.currentHouse ? state.currentHouse.id : null);

    return eventList.map(e => {
        const isChecked = selectedSet && selectedSet.has(e.id);
        const eventName = e.name || 'Unnamed Event';

        // Calculate count vs limit
        let registeredCount = 0;
        let limit = 0;
        let hasLimitInfo = false;

        if (typeof houseEventSoloCount === 'function' && typeof eventHouseLimit === 'function' && currentHouseId && currentFest) {
            registeredCount = type === 'solo' 
                ? houseEventSoloCount(currentFest.id, currentHouseId, e.id)
                : (typeof houseEventGroupCount === 'function' ? houseEventGroupCount(currentFest.id, currentHouseId, e.id) : 0);

            limit = eventHouseLimit(currentFest, e, type);
            hasLimitInfo = true;
        }

        const isExceeded = hasLimitInfo && registeredCount > limit;
        const isFull = hasLimitInfo && !isExceeded && registeredCount >= limit;

        // Pill styling based on occupancy
        let pillClass = 'bg-light text-secondary border';
        let statusText = `${registeredCount}/${limit}`;

        if (isExceeded) {
            pillClass = 'bg-danger text-white border-danger';
            statusText = `${registeredCount}/${limit} Limit Exceeded`;
        } else if (isFull) {
            pillClass = 'bg-warning-subtle text-warning-emphasis border-warning';
            statusText = `${registeredCount}/${limit} Full`;
        }

        return `
            <label class="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-2 mb-1 rounded border ${isChecked ? 'border-primary bg-primary-subtle' : 'bg-white'}" 
                   for="cb-${e.id}" 
                   style="cursor: pointer; transition: all 0.15s ease;">
                
                <div class="d-flex align-items-center flex-grow-1 min-w-0 me-2">
                    <input class="form-check-input ev-select-cb m-0 me-2 flex-shrink-0" 
                           type="checkbox" 
                           value="${e.id}" 
                           data-type="${type}" 
                           id="cb-${e.id}" 
                           ${isChecked ? 'checked' : ''} 
                           style="cursor: pointer; width: 1.15rem; height: 1.15rem;">
                    
                    <!-- Event Name with Inline House Limit -->
                    <div class="d-flex flex-wrap align-items-center gap-1 lh-sm">
                        <span class="small fw-bold ${isChecked ? 'text-primary' : 'text-dark'} text-break">
                            ${eventName}
                        </span>
                        
                        ${hasLimitInfo ? `
                            <span class="badge ${pillClass} py-0 px-1 ms-1 d-inline-flex align-items-center" style="font-size: 0.72rem;">
                                <i class="fas fa-users me-1" style="font-size: 0.65rem;"></i>Limit: ${statusText}
                            </span>
                        ` : ''}
                    </div>
                </div>

                <!-- Right meta info (Category) -->
                ${e.category ? `
                    <div class="flex-shrink-0 ms-2">
                        <span class="badge bg-secondary-subtle text-secondary border" style="font-size: 0.7rem;">
                            ${e.category}
                        </span>
                    </div>
                ` : ''}
            </label>
        `;
    }).join('');
}
// =========================================================================
// --- 5. EVENT-WISE REGISTRATION TAB & MULTI-SELECT MODAL ---
// =========================================================================

function eventwiseRegistrationTab(fest, house, isRegistrationOpen) {
    const container = document.getElementById('tab-eventwise-reg');
    const houseStudents = state.students.filter(student => student.houseId === house.id);
    const events = state.festEvents.filter(event => event.festId === fest.id && event.cancelled !== true);
    const categories = [...new Set(events.map(event => event.category || 'General'))];

    container.innerHTML = `
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
                <h6 class="fw-bold mb-0 fs-6"><i class="fas fa-calendar-check text-primary me-2"></i>Event-wise Registration</h6>
                <div class="text-muted small" style="font-size: 0.75rem;">Assign participants or tap any student tag to edit schedule.</div>
            </div>
            <span class="badge bg-secondary py-1 px-2" style="font-size: 0.75rem;">${houseStudents.length} House Members</span>
        </div>

        <div class="row g-2 mb-3">
            <div class="col-6 col-md-4">
                <label class="small fw-semibold mb-1" style="font-size: 0.75rem;" for="eventwise-category-filter">Category</label>
                <select id="eventwise-category-filter" class="form-select form-select-sm">
                    <option value="all">All Categories</option>
                    ${categories.map(category => `<option value="${category}">${category}</option>`).join('')}
                </select>
            </div>
            <div class="col-6 col-md-4">
                <label class="small fw-semibold mb-1" style="font-size: 0.75rem;" for="eventwise-event-search">Search</label>
                <input id="eventwise-event-search" type="search" class="form-control form-control-sm" placeholder="Event name...">
            </div>
            <div class="col-12 col-md-4 d-flex align-items-end">
                <div class="d-flex flex-wrap gap-1 align-items-center small" style="font-size: 0.7rem;">
                    <span class="badge bg-warning-subtle text-warning-emphasis border border-warning">Pending</span>
                    <span class="badge bg-success-subtle text-success-emphasis border border-success">Filled</span>
                    <span class="badge bg-danger text-white">Over Limit</span>
                </div>
            </div>
        </div>

        <div class="table-responsive table-mobile-responsive border rounded" style="max-height: 60vh; overflow-y: auto;">
            <table class="table table-sm table-hover align-middle mb-0" id="eventwise-registration-table">
                <thead class="table-light sticky-top">
                    <tr>
                        <th style="min-width: 140px;">Event</th>
                        <th style="width: 60px;">Type</th>
                        <th class="text-center" style="width: 75px;">Capacity</th>
                        <th style="min-width: 180px;">Registered</th>
                        <th class="text-end" style="width: 100px;">Action</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;

    const categoryFilter = container.querySelector('#eventwise-category-filter');
    const eventSearch = container.querySelector('#eventwise-event-search');
    const tbody = container.querySelector('#eventwise-registration-table tbody');

    function registeredStudents(event) {
        return state.festRegistrations
            .filter(registration => registration.festId === fest.id && registration.houseId === house.id && registration.events?.includes(event.id))
            .map(registration => ({ 
                registration, 
                student: houseStudents.find(item => item.id === registration.studentId) 
            }))
            .filter(item => item.student || item.registration.studentName);
    }

    function renderRows() {
        const selectedCategory = categoryFilter.value;
        const searchTerm = eventSearch.value.trim().toLowerCase();

        const visibleEvents = events.filter(event => {
            const matchesCat = selectedCategory === 'all' || (event.category || 'General') === selectedCategory;
            const matchesSearch = !searchTerm || event.name.toLowerCase().includes(searchTerm) || (event.stage || '').toLowerCase().includes(searchTerm);
            return matchesCat && matchesSearch;
        });

        tbody.innerHTML = visibleEvents.map(event => {
            const registered = registeredStudents(event);
            const limit = eventHouseLimit(fest, event, event.isGroupEvent ? 'group' : 'solo');
            const count = registered.length;

            const isOverLimit = count > limit;
            const isFull = count >= limit && limit > 0;

            const rowClass = isOverLimit ? 'table-danger' : (isFull ? 'table-success-subtle' : (count > 0 ? 'table-warning-subtle' : ''));

            const statusBadge = isOverLimit 
                ? `<span class="badge bg-danger text-white">${count}/${limit}</span>`
                : (isFull 
                    ? `<span class="badge bg-success">${count}/${limit}</span>`
                    : `<span class="badge bg-warning text-dark border">${count}/${limit}</span>`);

            const registeredHtml = registered.map(({ registration, student }) => `
                <div class="d-inline-flex align-items-center bg-white border rounded-pill px-2 py-0 me-1 mb-1 shadow-sm" style="font-size: 0.75rem;">
                    <span class="eventwise-student-chip text-primary fw-semibold me-1 py-1" role="button" data-student-id="${registration.studentId}" title="Tap to manage student events">
                        <i class="fas fa-user-pen me-1 text-muted"></i>${student?.name || registration.studentName}
                    </span>
                    <button type="button" class="btn-close btn-close-xs eventwise-clear-btn p-1 ms-1" data-registration-id="${registration.id}" data-event-id="${event.id}" title="Remove from event" style="font-size: 0.55rem;"></button>
                </div>
            `).join('') || '<span class="small text-muted fst-italic" style="font-size: 0.72rem;">No participants</span>';

            return `
                <tr class="${rowClass}">
                    <td>
                        <strong class="text-dark d-block text-truncate" style="max-width: 160px;">${event.name}</strong>
                        <div class="text-muted small" style="font-size: 0.7rem;">${event.category || 'General'} &bull; ${event.stage || 'Main Stage'}</div>
                    </td>
                    <td>
                        <span class="badge ${event.isGroupEvent ? 'bg-info' : 'bg-secondary'}" style="font-size: 0.68rem;">${event.isGroupEvent ? 'Group' : 'Solo'}</span>
                    </td>
                    <td class="text-center">${statusBadge}</td>
                    <td>${registeredHtml}</td>
                    <td class="text-end text-nowrap">
                        ${event.isGroupEvent
                            ? '<span class="text-muted small fst-italic" style="font-size: 0.7rem;">Group Tab</span>'
                            : `<button type="button" class="btn btn-sm ${isFull ? 'btn-outline-secondary' : 'btn-primary'} py-1 px-2 open-student-picker-btn btn-touch" data-event-id="${event.id}" ${!isRegistrationOpen || isFull ? 'disabled' : ''} style="font-size: 0.78rem;">
                                 <i class="fas fa-user-plus me-1"></i>${isFull ? 'Full' : 'Assign'}
                               </button>`
                        }
                    </td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="5" class="text-center text-muted p-4 small">No events found matching criteria.</td></tr>';
    }

    container.addEventListener('click', async e => {
        const pickerBtn = e.target.closest('.open-student-picker-btn');
        if (pickerBtn) {
            window.openEventStudentPickerModal(pickerBtn.dataset.eventId, house.id);
            return;
        }

        const studentChip = e.target.closest('.eventwise-student-chip');
        if (studentChip) {
            window.openEventAllocationModal(studentChip.dataset.studentId);
            return;
        }

        const clearBtn = e.target.closest('.eventwise-clear-btn');
        if (!clearBtn) return;

        const registration = state.festRegistrations.find(item => item.id === clearBtn.dataset.registrationId);
        if (!registration || !confirm('Remove this student from this event?')) return;

        const eventsAfterClear = (registration.events || []).filter(eventId => eventId !== clearBtn.dataset.eventId);
        try {
            if (eventsAfterClear.length) {
                await saveScopedDoc('festRegistrations', registration.id, { 
                    ...registration, 
                    events: eventsAfterClear, 
                    lastUpdated: serverTimestamp() 
                });
            } else {
                await deleteScopedDoc('festRegistrations', registration.id);
            }
            await loadAllYearData(true);
            renderRows();
            window.showAlert('Event registration removed.', 'success');
        } catch (error) {
            console.error(error);
            window.showAlert('Failed to remove event registration.', 'danger');
        }
    });

    categoryFilter.addEventListener('change', renderRows);
    eventSearch.addEventListener('input', renderRows);
    renderRows();
}

// =========================================================================
// --- MODAL: SEARCH, SELECT & SAVE STUDENTS TO EVENT ---
// =========================================================================

window.openEventStudentPickerModal = function(eventId, houseId) {
    const fest = state.managingFest;
    const event = state.festEvents.find(e => e.id === eventId);
    if (!event) return window.showAlert('Event not found.', 'danger');

    const houseStudents = state.students.filter(s => s.houseId === houseId);
    const limit = eventHouseLimit(fest, event, 'solo');

    // Get current registrations for this event & house
    const existingRegistrations = state.festRegistrations.filter(r => 
        r.festId === fest.id && 
        r.houseId === houseId && 
        r.events?.includes(eventId)
    );
    
    // Sets to manage additions and removals
    const initialEnrolledIds = new Set(existingRegistrations.map(r => r.studentId));
    const studentsToRemoveIds = new Set();
    const studentsToAddIds = new Set();

    const studentMaxLimit = fest.studentSoloLimit || fest.maxEventsPerStudent || fest.studentEventLimit || 3;

    // Eligible students who are NOT enrolled initially
    const eligibleStudents = houseStudents.filter(student => {
        if (initialEnrolledIds.has(student.id)) return false;
        const catMatch = event.category === 'General' || getStudentCategory(student) === event.category;
        const genderMatch = !event.gender || event.gender === 'Common' || 
            (event.gender === 'Male' && student.gender === 'M') || 
            (event.gender === 'Female' && student.gender === 'F');
        return catMatch && genderMatch;
    });

    const modalBody = `
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-1 mb-2 p-2 bg-light rounded border">
            <div>
                <h6 class="fw-bold mb-0 text-primary fs-6">${event.name}</h6>
                <div class="small text-muted" style="font-size: 0.74rem;">${event.category || 'General'} &bull; ${event.type === 'offStage' ? 'Off-Stage' : 'On-Stage'}</div>
            </div>
            <div class="d-flex gap-1">
                <span class="badge bg-white text-dark border" style="font-size: 0.72rem;">House Limit: <strong>${limit}</strong></span>
                <span class="badge bg-info text-dark" id="picker-slots-badge" style="font-size: 0.72rem;">Open Slots: <strong id="open-slots-count">0</strong></span>
            </div>
        </div>

        <div class="mb-2">
            <input type="search" id="modal-student-search-input" class="form-control form-control-sm" placeholder="Search by name, admission no, class...">
        </div>

        <div class="row g-2">
            <div class="col-12 col-md-7 modal-col-border">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <label class="small fw-bold mb-0" style="font-size: 0.78rem;">Eligible Students (${eligibleStudents.length})</label>
                    <span class="text-muted small" style="font-size: 0.7rem;">Tap to add</span>
                </div>
                <div class="list-group border rounded" id="modal-student-available-list" style="max-height: 300px; overflow-y: auto;"></div>
            </div>

            <div class="col-12 col-md-5">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <label class="small fw-bold mb-0" style="font-size: 0.78rem;">Participants (<span id="modal-total-count">0</span>/${limit})</label>
                    <span class="text-muted small" style="font-size: 0.7rem;">Manage Roster</span>
                </div>
                <div class="border rounded p-2 bg-light" id="modal-selected-queue" style="max-height: 300px; overflow-y: auto;">
                    <!-- Rendered dynamically -->
                </div>
            </div>
        </div>
    `;

    const modalFooter = `
        <button class="btn btn-secondary btn-sm px-3" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-success btn-sm fw-bold px-3 btn-touch" id="modal-commit-students-btn">
            <i class="fas fa-save me-1"></i>Save Changes
        </button>
    `;

    const modal = window.showGlobalModal(`Manage Event Participants`, modalBody, modalFooter);

    const availableContainer = document.getElementById('modal-student-available-list');
    const queueContainer = document.getElementById('modal-selected-queue');
    const commitBtn = document.getElementById('modal-commit-students-btn');
    const searchInput = document.getElementById('modal-student-search-input');
    const slotsBadge = document.getElementById('open-slots-count');
    const totalCountSpan = document.getElementById('modal-total-count');

    function getStudentRegisteredCount(studentId) {
        const reg = state.festRegistrations.find(r => r.id === `${fest.id}_${studentId}`);
        return (reg?.events || []).length;
    }

    function getEventCountBadge(current, max) {
        if (!max) return `<span class="badge bg-light text-muted border">${current} Events</span>`;
        
        let colorClass = 'bg-success-subtle text-success border border-success-subtle';
        let statusTag = '';

        if (current >= max) {
            colorClass = 'bg-danger text-white border-danger shadow-sm';
            statusTag = ' (Full)';
        } else if (current === max - 1) {
            colorClass = 'bg-warning-subtle text-warning-emphasis border border-warning shadow-sm';
        }

        return `
            <span class="badge ${colorClass} px-2 py-1 fw-bold" style="font-size: 0.72rem;">
                <i class="fas fa-layer-group me-1 opacity-75"></i>${current}/${max}${statusTag}
            </span>
        `;
    }

    function getCurrentEffectiveParticipantCount() {
        const enrolledCount = initialEnrolledIds.size - studentsToRemoveIds.size;
        return enrolledCount + studentsToAddIds.size;
    }

    function renderQueue() {
        const activeEnrolled = houseStudents.filter(s => initialEnrolledIds.has(s.id) && !studentsToRemoveIds.has(s.id));
        const newQueued = eligibleStudents.filter(s => studentsToAddIds.has(s.id));
        const totalCount = activeEnrolled.length + newQueued.length;
        const availableSlots = Math.max(0, limit - totalCount);

        totalCountSpan.textContent = totalCount;
        slotsBadge.textContent = availableSlots;

        // Check if there are changes to commit
        const hasChanges = studentsToAddIds.size > 0 || studentsToRemoveIds.size > 0;
        commitBtn.disabled = !hasChanges;

        if (totalCount === 0) {
            queueContainer.innerHTML = `<div class="text-muted small text-center py-4" style="font-size: 0.75rem;">No participants in this event. Check students on the left to add.</div>`;
            return;
        }

        let html = '';

        // 1. Existing Enrolled Students
        if (activeEnrolled.length > 0) {
            html += `<div class="small fw-bold text-muted text-uppercase mb-1" style="font-size: 0.65rem; letter-spacing: 0.5px;">Currently Registered</div>`;
            html += activeEnrolled.map(student => {
                const count = getStudentRegisteredCount(student.id);
                return `
                    <div class="d-flex justify-content-between align-items-center bg-white border border-start-3 border-start-success rounded p-1 px-2 mb-1 shadow-sm small">
                        <div class="text-truncate me-1" style="font-size: 0.78rem;">
                            <strong class="text-dark">${student.name}</strong>
                            <div class="text-muted" style="font-size: 0.68rem;">Adm: ${student.admissionNumber || 'N/A'}</div>
                        </div>
                        <div class="d-flex align-items-center gap-1 flex-shrink-0">
                            ${getEventCountBadge(count, studentMaxLimit)}
                            <button type="button" class="btn btn-xs btn-outline-danger modal-remove-enrolled-btn py-0 px-2" data-id="${student.id}" title="Remove from this event">
                                <i class="fas fa-user-minus"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 2. Newly Added Students
        if (newQueued.length > 0) {
            html += `<div class="small fw-bold text-primary text-uppercase mt-2 mb-1" style="font-size: 0.65rem; letter-spacing: 0.5px;">Pending Addition (+${newQueued.length})</div>`;
            html += newQueued.map(student => {
                const count = getStudentRegisteredCount(student.id) + 1;
                return `
                    <div class="d-flex justify-content-between align-items-center bg-primary-subtle border border-primary rounded p-1 px-2 mb-1 shadow-sm small">
                        <div class="text-truncate me-1" style="font-size: 0.78rem;">
                            <strong class="text-primary">${student.name}</strong>
                            <div class="text-muted" style="font-size: 0.68rem;">Adm: ${student.admissionNumber || 'N/A'}</div>
                        </div>
                        <div class="d-flex align-items-center gap-1 flex-shrink-0">
                            ${getEventCountBadge(count, studentMaxLimit)}
                            <button type="button" class="btn btn-xs btn-outline-danger modal-remove-new-btn py-0 px-2" data-id="${student.id}" title="Cancel addition">&times;</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        queueContainer.innerHTML = html;
    }

    function renderAvailableList() {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = eligibleStudents.filter(student => {
            const name = student.name.toLowerCase();
            const adm = String(student.admissionNumber || '').toLowerCase();
            const className = getStudentClassName(student.classId, student.division).toLowerCase();
            return !query || name.includes(query) || adm.includes(query) || className.includes(query);
        });

        if (!filtered.length) {
            availableContainer.innerHTML = `<div class="p-3 text-center text-muted small" style="font-size: 0.75rem;">No matching eligible students.</div>`;
            return;
        }

        const effectiveSlots = Math.max(0, limit - getCurrentEffectiveParticipantCount());

        availableContainer.innerHTML = filtered.map(student => {
            const isChecked = studentsToAddIds.has(student.id);
            const currentCount = getStudentRegisteredCount(student.id);
            const isFull = currentCount >= studentMaxLimit;
            const disableCheck = !isChecked && (effectiveSlots <= 0 || isFull);

            return `
                <label class="list-group-item list-group-item-action d-flex align-items-center py-2 px-2 small ${disableCheck ? 'bg-light opacity-75' : ''}" style="cursor: ${disableCheck ? 'not-allowed' : 'pointer'};">
                    <input class="form-check-input me-2 modal-student-cb flex-shrink-0" 
                           type="checkbox" 
                           value="${student.id}" 
                           ${isChecked ? 'checked' : ''} 
                           ${disableCheck ? 'disabled' : ''}>
                    
                    <div class="flex-grow-1 min-w-0">
                        <div class="d-flex align-items-center justify-content-between mb-1">
                            <strong class="text-truncate text-dark" style="font-size: 0.83rem;">${student.name}</strong>
                            ${getEventCountBadge(currentCount, studentMaxLimit)}
                        </div>
                        <div class="text-muted text-truncate" style="font-size: 0.7rem;">
                            Adm: ${student.admissionNumber || 'N/A'} &bull; ${getStudentClassName(student.classId, student.division)}
                        </div>
                    </div>
                </label>
            `;
        }).join('');
    }

    // Toggle additions from available pool
    availableContainer.addEventListener('change', e => {
        const cb = e.target.closest('.modal-student-cb');
        if (!cb) return;

        if (cb.checked) {
            const currentSlots = limit - getCurrentEffectiveParticipantCount();
            if (currentSlots > 0) {
                studentsToAddIds.add(cb.value);
            }
        } else {
            studentsToAddIds.delete(cb.value);
        }
        renderAvailableList();
        renderQueue();
    });

    // Handle removal of already enrolled students or newly queued additions
    queueContainer.addEventListener('click', e => {
        const removeEnrolledBtn = e.target.closest('.modal-remove-enrolled-btn');
        if (removeEnrolledBtn) {
            const studentId = removeEnrolledBtn.dataset.id;
            studentsToRemoveIds.add(studentId);
            renderAvailableList();
            renderQueue();
            return;
        }

        const removeNewBtn = e.target.closest('.modal-remove-new-btn');
        if (removeNewBtn) {
            const studentId = removeNewBtn.dataset.id;
            studentsToAddIds.delete(studentId);
            renderAvailableList();
            renderQueue();
        }
    });

    searchInput.addEventListener('input', renderAvailableList);

    renderAvailableList();
    renderQueue();

    // Commit both additions and removals to Firestore
    commitBtn.addEventListener('click', async () => {
        commitBtn.disabled = true;
        commitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving...`;

        const batch = writeBatch(db);

        // 1. Process Removals
        studentsToRemoveIds.forEach(studentId => {
            const regId = `${fest.id}_${studentId}`;
            const existing = state.festRegistrations.find(r => r.id === regId);
            if (existing) {
                const updatedEvents = (existing.events || []).filter(id => id !== event.id);
                batch.update(getScopedDoc('festRegistrations', regId), {
                    events: updatedEvents,
                    lastUpdated: serverTimestamp()
                });
            }
        });

        // 2. Process Additions
        studentsToAddIds.forEach(studentId => {
            const student = houseStudents.find(s => s.id === studentId);
            const regId = `${fest.id}_${studentId}`;
            const existing = state.festRegistrations.find(r => r.id === regId);
            const mergedEvents = [...new Set([...(existing?.events || []), event.id])];

            batch.set(getScopedDoc('festRegistrations', regId), {
                id: regId,
                festId: fest.id,
                studentId: student.id,
                studentName: student.name,
                houseId: houseId,
                events: mergedEvents,
                chestNo: existing?.chestNo || null,
                lastUpdated: serverTimestamp()
            }, { merge: true });
        });

        try {
            await batch.commit();
            window.showAlert(`Updated participants for ${event.name}.`, 'success');
            modal?.hide();
            await loadAllYearData(true);
            if (typeof eventwiseRegistrationTab === 'function') {
                eventwiseRegistrationTab(fest, state.festHouses.find(h => h.id === houseId), fest.registrationOpen === true);
            } else if (typeof renderSubTabRegistrations === 'function') {
                renderSubTabRegistrations(fest.registrationOpen === true);
            }
        } catch (error) {
            console.error(error);
            window.showAlert('Failed to update event participants.', 'danger');
            commitBtn.disabled = false;
            commitBtn.innerHTML = `<i class="fas fa-save me-1"></i>Save Changes`;
        }
    });
};
// --- 5. GROUP TEAM MANAGEMENT TAB ---

function renderGroupTeamTab(fest, house, isRegistrationOpen) {
    const container = document.getElementById('tab-group-reg');
    const groups = state.festGroups.filter(g => g.festId === fest.id && g.houseId === house.id);

    container.innerHTML = `
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h6 class="fw-bold mb-0 fs-6">House Group Teams</h6>
            <button class="btn btn-primary btn-sm py-1 px-3 btn-touch" onclick="window.openGroupModal(null)" ${!isRegistrationOpen ? 'disabled' : ''}>
                <i class="fas fa-plus me-1"></i>Create Group Team
            </button>
        </div>

        <div class="row g-2 g-md-3" id="groups-list">
            ${groups.length === 0 ? `<div class="col-12 text-center text-muted p-4 small">No groups formed yet.</div>` : ''}
            ${groups.map(g => {
                const captain = g.members?.find(m => m.role === 'Captain');
                const captainObj = state.students.find(s => s.id === captain?.studentId);
                return `
                    <div class="col-12 col-md-6">
                        <div class="card border p-3 h-100 shadow-sm">
                            <div class="d-flex justify-content-between align-items-start gap-1">
                                <h6 class="fw-bold mb-1 text-truncate fs-6">${g.name}</h6>
                                <span class="badge bg-secondary flex-shrink-0" style="font-size: 0.7rem;">${g.members?.length || 0} Members</span>
                            </div>
                            <p class="small text-muted mb-2" style="font-size: 0.75rem;">
                                ${g.category || 'General'} &bull; ${state.festEvents.find(e => e.id === g.eventId)?.name || 'Event not recorded'}<br>
                                Captain: <strong>${captainObj?.name || 'Unassigned'}</strong>
                            </p>
                            <div class="d-flex flex-wrap justify-content-end gap-1 mt-auto pt-2 border-top">
                                <button class="btn btn-xs btn-outline-secondary py-1 px-2 btn-touch" onclick="window.printGroupRollCard('${g.id}')">
                                    <i class="fas fa-print me-1"></i>Roll Card
                                </button>
                                <button class="btn btn-xs btn-outline-primary py-1 px-2 btn-touch" onclick="window.openGroupModal('${g.id}')" ${!isRegistrationOpen ? 'disabled' : ''}>
                                    <i class="fas fa-users-gear me-1"></i>Edit
                                </button>
                                <button class="btn btn-xs btn-outline-danger py-1 px-2 btn-touch" onclick="window.deleteGroup('${g.id}')" ${!isRegistrationOpen ? 'disabled' : ''}>
                                    <i class="fas fa-trash me-1"></i>Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

window.openGroupModal = function(groupId) {
    const fest = state.managingFest;
    const houseId = state.loggedInHouseId;
    const isEdit = groupId !== null;
    const group = isEdit ? state.festGroups.find(g => g.id === groupId) : null;
    const houseStudents = state.students.filter(s => s.houseId === houseId);
    const groupEvents = state.festEvents.filter(e => e.festId === fest.id && e.isGroupEvent);
    const categories = ['General', ...(fest.settings?.categories?.map(category => category.name) || [])];

    let activeMembers = isEdit ? [...group.members] : [];

    const modalBody = `
        <div class="row g-2 mb-2">
            <div class="col-12 col-md-6">
                <label class="form-label small fw-bold mb-1">Group / Team Name</label>
                <input type="text" id="grp-name" class="form-control form-control-sm" value="${group?.name || ''}" placeholder="e.g., Patriotic Song Squad">
            </div>
            <div class="col-12 col-md-6">
                <label class="form-label small fw-bold mb-1">Category</label>
                <select id="grp-category" class="form-select form-select-sm">
                    <option value="">Choose category</option>
                    ${categories.map(category => `<option value="${category}" ${group?.category === category ? 'selected' : ''}>${category}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="mb-2">
            <label class="form-label small fw-bold mb-1">Select Group Event</label>
            <select id="grp-event" class="form-select form-select-sm">
                <option value="">Choose event</option>
                ${groupEvents.map(e => `<option value="${e.id}" ${group?.eventId === e.id ? 'selected' : ''}>${e.name} (${e.category}) - Limit: ${eventHouseLimit(fest, e, 'group')}${e.maxParticipants ? `, max ${e.maxParticipants} members` : ''}</option>`).join('')}
            </select>
        </div>
        <div id="grp-validation" class="small mb-2"></div>
        <div class="row g-2">
            <div class="col-12 col-md-6 modal-col-border">
                <label class="form-label small fw-bold mb-1">Available Students</label>
                <input type="search" id="grp-student-search" class="form-control form-control-sm mb-1" placeholder="Filter student name or admission...">
                <div class="list-group small border rounded" id="grp-pool" style="max-height: 200px; overflow-y: auto;">
                    <small class="text-muted p-2">Choose category & event to load eligible students.</small>
                </div>
            </div>
            <div class="col-12 col-md-6">
                <label class="form-label small fw-bold mb-1">Chosen Roster (<span id="grp-roster-count">${activeMembers.length}</span>)</label>
                <ul class="list-group small border rounded" id="grp-selected" style="max-height: 200px; overflow-y: auto;"></ul>
            </div>
        </div>
    `;

    const modalFooter = `
        <button class="btn btn-secondary btn-sm px-3" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-primary btn-sm fw-bold px-3 btn-touch" id="grp-save-btn">Commit Team</button>
    `;

    const modalInstance = window.showGlobalModal(isEdit ? 'Edit Team' : 'Assemble Team', modalBody, modalFooter);

    const categoryPicker = document.getElementById('grp-category');
    const eventPicker = document.getElementById('grp-event');
    const pool = document.getElementById('grp-pool');
    const studentSearch = document.getElementById('grp-student-search');

    function isEligibleForGroup(student) {
        const selectedCategory = categoryPicker.value;
        const selectedEvent = groupEvents.find(event => event.id === eventPicker.value);
        const categoryMatches = selectedCategory && getStudentCategory(student) === selectedCategory;
        const genderMatches = !selectedEvent?.gender || selectedEvent.gender === 'Common' ||
            (selectedEvent.gender === 'Male' && student.gender === 'M') ||
            (selectedEvent.gender === 'Female' && student.gender === 'F');
        return categoryMatches && genderMatches;
    }

    function updateStudentPool() {
        const searchTerm = studentSearch.value.trim().toLowerCase();
        const eligibleStudents = houseStudents.filter(student => {
            if (!isEligibleForGroup(student)) return false;
            return !searchTerm || student.name.toLowerCase().includes(searchTerm) || String(student.admissionNumber || '').toLowerCase().includes(searchTerm);
        });
        pool.innerHTML = eligibleStudents.map(student => `
            <button type="button" class="list-group-item list-group-item-action py-2 px-2 text-start pool-student-btn" data-id="${student.id}">
                <div class="fw-semibold text-truncate" style="font-size: 0.8rem;">${student.name}</div>
                <small class="text-muted" style="font-size: 0.7rem;">Adm: ${student.admissionNumber || 'N/A'} &bull; ${getStudentClassName(student.classId, student.division)}</small>
            </button>
        `).join('') || '<div class="text-muted small p-2 text-center">No students match selection criteria.</div>';
        updateGroupValidation();
    }

    categoryPicker.addEventListener('change', updateStudentPool);
    eventPicker.addEventListener('change', updateStudentPool);
    studentSearch.addEventListener('input', updateStudentPool);

    function updateRosterUI() {
        const list = document.getElementById('grp-selected');
        const countSpan = document.getElementById('grp-roster-count');
        if (countSpan) countSpan.textContent = activeMembers.length;

        list.innerHTML = activeMembers.map((m, index) => {
            const student = state.students.find(s => s.id === m.studentId);
            return `
                <li class="list-group-item d-flex justify-content-between align-items-center py-1 px-2">
                    <span class="text-truncate me-1" style="font-size: 0.78rem;">${student?.name || 'Student'}</span>
                    <div class="d-flex align-items-center gap-1 flex-shrink-0">
                        <select class="form-select form-select-sm d-inline-block w-auto py-0 px-1 role-select" data-index="${index}" style="font-size: 0.72rem; height: 26px;">
                            <option value="Member" ${m.role === 'Member' ? 'selected' : ''}>Member</option>
                            <option value="Captain" ${m.role === 'Captain' ? 'selected' : ''} ${m.role !== 'Captain' && activeMembers.some(member => member.role === 'Captain') ? 'disabled' : ''}>Captain</option>
                        </select>
                        <button class="btn btn-xs btn-outline-danger remove-roster-btn py-0 px-2" data-index="${index}">&times;</button>
                    </div>
                </li>
            `;
        }).join('') || `<li class="text-muted text-center py-3 small" style="font-size: 0.75rem;">Tap students from list to add.</li>`;
        updateGroupValidation();
    }

    function getGroupEventCount(studentId, eventType) {
        const settings = fest.settings || {};
        const limit = eventType === 'offStage' ? (settings.maxOffStageGroupEvents ?? 1) : (settings.maxOnStageGroupEvents ?? 2);
        const count = state.festGroups.filter(existingGroup => existingGroup.festId === fest.id && existingGroup.id !== groupId && existingGroup.members?.some(member => member.studentId === studentId))
            .filter(existingGroup => {
                const existingEvent = groupEvents.find(event => event.id === existingGroup.eventId) || state.festEvents.find(event => event.id === existingGroup.eventId);
                return existingEvent?.type === eventType;
            }).length;
        return { count, limit: Number.isFinite(limit) ? limit : 0 };
    }

    function getGroupValidationErrors() {
        const selectedEvent = groupEvents.find(event => event.id === eventPicker.value);
        const errors = [];
        const seenMembers = new Set();
        const duplicateMembers = activeMembers.filter(member => {
            if (seenMembers.has(member.studentId)) return true;
            seenMembers.add(member.studentId);
            return false;
        });
        if (duplicateMembers.length) errors.push('A participant cannot be added twice to the same group.');
        if (!selectedEvent) return errors;

        activeMembers.forEach(member => {
            const student = state.students.find(item => item.id === member.studentId);
            if (!student || student.houseId !== houseId || !isEligibleForGroup(student)) {
                errors.push(`${student?.name || member.studentId} does not match this house, category, or event gender.`);
            }
            const existingGroups = state.festGroups.filter(existingGroup => existingGroup.festId === fest.id && existingGroup.id !== groupId && existingGroup.eventId === selectedEvent.id && existingGroup.members?.some(item => item.studentId === member.studentId));
            if (existingGroups.length) errors.push(`${student?.name || member.studentId} is already in this event's group.`);
            const { count, limit } = getGroupEventCount(member.studentId, selectedEvent.type);
            if (count >= limit) errors.push(`${student?.name || member.studentId} has ${count}/${limit} ${selectedEvent.type === 'offStage' ? 'off-stage' : 'on-stage'} group events.`);
        });

        const eventHouseCount = houseEventGroupCount(fest.id, houseId, selectedEvent.id, groupId);
        const eventHouseLimitValue = eventHouseLimit(fest, selectedEvent, 'group');
        if (eventHouseCount >= eventHouseLimitValue) {
            errors.push(`${selectedEvent.name} already has ${eventHouseCount}/${eventHouseLimitValue} group team(s) for this house.`);
        }
        if (selectedEvent.maxParticipants && activeMembers.length > selectedEvent.maxParticipants) {
            errors.push(`${selectedEvent.name} allows ${selectedEvent.maxParticipants} members; team has ${activeMembers.length}.`);
        }

        const captainId = activeMembers.find(member => member.role === 'Captain')?.studentId;
        if (captainId && state.festGroups.some(existingGroup => existingGroup.festId === fest.id && existingGroup.id !== groupId && existingGroup.members?.some(member => member.studentId === captainId && member.role === 'Captain'))) {
            const captain = state.students.find(student => student.id === captainId);
            errors.push(`${captain?.name || captainId} is already captain of another group.`);
        }
        return [...new Set(errors)];
    }

    function updateGroupValidation() {
        const validation = document.getElementById('grp-validation');
        if (!validation) return;
        const errors = getGroupValidationErrors();
        validation.innerHTML = errors.length
            ? `<div class="alert alert-danger py-1 px-2 mb-0" style="font-size: 0.75rem;"><strong>Alert:</strong><ul class="mb-0 ps-3">${errors.map(error => `<li>${error}</li>`).join('')}</ul></div>`
            : '<div class="alert alert-success py-1 px-2 mb-0" style="font-size: 0.75rem;"><i class="fas fa-check-circle me-1"></i>Configuration valid.</div>';
    }

    document.getElementById('grp-pool').addEventListener('click', (e) => {
        const btn = e.target.closest('.pool-student-btn');
        if (btn) {
            const sid = btn.dataset.id;
            if (!activeMembers.some(m => m.studentId === sid)) {
                activeMembers.push({ studentId: sid, role: 'Member' });
                updateRosterUI();
            }
        }
    });

    document.getElementById('grp-selected').addEventListener('click', (e) => {
        const btn = e.target.closest('.remove-roster-btn');
        if (btn) {
            const idx = parseInt(btn.dataset.index, 10);
            activeMembers.splice(idx, 1);
            updateRosterUI();
        }
    });

    document.getElementById('grp-selected').addEventListener('change', (e) => {
        const select = e.target.closest('.role-select');
        if (select) {
            const idx = parseInt(select.dataset.index, 10);
            activeMembers[idx].role = select.value;
            if (select.value === 'Captain') {
                activeMembers.forEach((member, memberIndex) => {
                    if (memberIndex !== idx) member.role = 'Member';
                });
                updateRosterUI();
            }
        }
    });

    updateRosterUI();
    updateStudentPool();

    document.getElementById('grp-save-btn').addEventListener('click', async () => {
        const name = document.getElementById('grp-name').value.trim();
        const category = document.getElementById('grp-category').value.trim();
        const eventId = document.getElementById('grp-event').value;
        const captainCount = activeMembers.filter(member => member.role === 'Captain').length;
        if (!name || !category || !eventId || activeMembers.length === 0) return window.showAlert('Please fill team name, category, event and members.', 'warning');
        if (!groupEvents.some(event => event.id === eventId)) return window.showAlert('Choose a valid group event.', 'warning');
        if (captainCount !== 1) return window.showAlert('Select exactly one captain for the group.', 'warning');
        const validationErrors = getGroupValidationErrors();
        if (validationErrors.length) return window.showAlert(validationErrors[0], 'danger');

        const gId = isEdit ? groupId : `GRP_${Date.now()}`;
        const payload = {
            id: gId,
            festId: fest.id,
            houseId: houseId,
            name: name,
            category: category,
            eventId: eventId,
            members: activeMembers
        };

        const batch = writeBatch(db);
        batch.set(getScopedDoc('festGroups', gId), payload);

        activeMembers.forEach(m => {
            const regId = `${fest.id}_${m.studentId}`;
            const studentObj = state.students.find(s => s.id === m.studentId);
            const currentEvents = state.festRegistrations.find(r => r.id === regId)?.events || [];
            const merged = [...new Set([...currentEvents, eventId])];

            batch.set(getScopedDoc('festRegistrations', regId), {
                id: regId,
                festId: fest.id,
                studentId: m.studentId,
                studentName: studentObj?.name || 'Student',
                houseId: houseId,
                events: merged,
                lastUpdated: serverTimestamp()
            }, { merge: true });
        });

        try {
            await batch.commit();
            window.showAlert('Group saved.', 'success');
            modalInstance?.hide();
            await loadAllYearData(true);
            bootstrapHouseCaptainWorkspace(fest, state.festHouses.find(h => h.id === houseId));
        } catch (err) {
            console.error(err);
            window.showAlert('Error saving group.', 'danger');
        }
    });
};

window.printGroupRollCard = function(groupId) {
    const group = state.festGroups.find(item => item.id === groupId);
    if (!group) return window.showAlert('Group not found.', 'danger');
    const fest = state.managingFest;
    const event = state.festEvents.find(item => item.id === group.eventId);
    const house = state.festHouses.find(item => item.id === group.houseId);
    const captain = group.members?.find(member => member.role === 'Captain');
    const captainName = state.students.find(student => student.id === captain?.studentId)?.name || 'Not assigned';
    const memberRows = (group.members || []).map((member, index) => {
        const student = state.students.find(item => item.id === member.studentId);
        const registration = state.festRegistrations.find(item => item.festId === fest.id && item.studentId === member.studentId);
        return `<tr><td>${index + 1}</td><td>${student?.name || registration?.studentName || 'Unknown'}</td><td>${student?.admissionNumber || ''}</td><td>${getStudentClassName(student?.classId, student?.division)}</td><td>${registration?.chestNo || ''}</td><td>${member.role === 'Captain' ? 'Captain' : 'Member'}</td><td></td></tr>`;
    }).join('');
    const contentHtml = `
        <div style="text-align:center; margin-bottom:18px;"><h2 style="margin:0;">${fest.name}</h2><h4 style="margin:4px 0;">Group Event Roll Card</h4><div>Venue / Stage: ${event?.stage || 'Main Stage'} | Event: ${event?.name || 'N/A'}</div></div>
        <table class="table table-bordered table-sm"><tbody><tr><th>Group Name</th><td>${group.name}</td><th>House</th><td>${house?.name || 'N/A'}</td></tr><tr><th>Category</th><td>${group.category || event?.category || 'General'}</td><th>Captain</th><td>${captainName}</td></tr></tbody></table>
        <table class="table table-bordered table-sm" style="width:100%;"><thead class="table-light"><tr><th>#</th><th>Participant Name</th><th>Admission No</th><th>Class</th><th>Chest No</th><th>Role</th><th>Scrutiny</th></tr></thead><tbody>${memberRows || '<tr><td colspan="7">No members recorded.</td></tr>'}</tbody></table>
        <div style="margin-top:40px; display:flex; justify-content:space-between;"><span>Scrutinizer: __________________</span><span>Captain Signature: __________________</span></div>
    `;
    window.printReport({ contentHtml, title: `Group_Roll_Card_${group.name}`, pageSize: 'A4 portrait' });
};

window.deleteGroup = async function(groupId) {
    if (!confirm('Are you sure you want to remove this group?')) return;
    try {
        await deleteScopedDoc('festGroups', groupId);
        window.showAlert('Group deleted.', 'success');
        await loadAllYearData();
        bootstrapHouseCaptainWorkspace(state.managingFest, state.festHouses.find(h => h.id === state.loggedInHouseId));
    } catch (err) {
        console.error(err);
        window.showAlert('Failed to delete group.', 'danger');
    }
};

// --- 6. ROSTER SUMMARY TAB ---

function renderRosterSummaryTab(fest, house) {
    const container = document.getElementById('tab-view-summary');
    const registrations = state.festRegistrations.filter(r => r.festId === fest.id && r.houseId === house.id);
    const events = state.festEvents.filter(event => event.festId === fest.id && event.cancelled !== true);
    const completedEventIds = new Set(state.festResults.filter(result => result.festId === fest.id).map(result => result.eventId));
    const stages = fest.stages?.length ? fest.stages : ['Main Stage'];

    const eventSummaries = events.map(event => {
        const isGroup = event.isGroupEvent;
        const limit = eventHouseLimit(fest, event, isGroup ? 'group' : 'solo');
        
        let participants = [];
        if (isGroup) {
            const groups = state.festGroups.filter(g => g.festId === fest.id && g.eventId === event.id && g.houseId === house.id);
            participants = groups.map(g => {
                const captain = g.members?.find(m => m.role === 'Captain');
                const captainStudent = state.students.find(s => s.id === captain?.studentId);
                return {
                    id: g.id,
                    name: g.name,
                    isTeam: true,
                    memberCount: g.members?.length || 0,
                    captainName: captainStudent?.name || 'Not assigned',
                    members: (g.members || []).map(m => {
                        const s = state.students.find(st => st.id === m.studentId);
                        const reg = state.festRegistrations.find(r => r.festId === fest.id && r.studentId === m.studentId);
                        return {
                            name: s?.name || m.studentId,
                            admission: s?.admissionNumber || '',
                            className: getStudentClassName(s?.classId, s?.division),
                            chestNo: reg?.chestNo || '',
                            role: m.role
                        };
                    })
                };
            });
        } else {
            const eventRegs = registrations.filter(r => r.events?.includes(event.id));
            participants = eventRegs.map(r => {
                const s = state.students.find(st => st.id === r.studentId);
                return {
                    id: r.studentId,
                    name: s?.name || r.studentName,
                    isTeam: false,
                    admission: s?.admissionNumber || '',
                    className: getStudentClassName(s?.classId, s?.division),
                    chestNo: r.chestNo || ''
                };
            });
        }

        const count = participants.length;
        const isOver = count > limit;
        const isFilled = count === limit && limit > 0;

        return {
            event,
            limit,
            count,
            isOver,
            isFilled,
            participants,
            participantTotal: isGroup ? participants.reduce((acc, p) => acc + p.memberCount, 0) : count,
            completed: completedEventIds.has(event.id)
        };
    });

    container.innerHTML = `
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <ul class="nav nav-pills fest-scroll-tabs" id="roster-subtabs">
                <li class="nav-item">
                    <button class="nav-link active" data-bs-toggle="pill" data-bs-target="#subtab-roster-events">
                        <i class="fas fa-calendar-check me-1"></i>Event-Wise (${events.length})
                    </button>
                </li>
                <li class="nav-item">
                    <button class="nav-link" data-bs-toggle="pill" data-bs-target="#subtab-roster-students">
                        <i class="fas fa-user-graduate me-1"></i>Students (${registrations.length})
                    </button>
                </li>
                <li class="nav-item">
                    <button class="nav-link" data-bs-toggle="pill" data-bs-target="#subtab-roster-status">
                        <i class="fas fa-chart-pie me-1"></i>Status Cards
                    </button>
                </li>
            </ul>

            <button class="btn btn-sm btn-danger py-1 px-3 btn-touch" onclick="window.exportHouseEventRosterPdf()">
                <i class="fas fa-file-pdf me-1"></i>Roster PDF
            </button>
        </div>

        <div class="tab-content border rounded p-2 p-md-3 bg-white">
            <!-- 1. EVENT-WISE ROSTER TAB -->
            <div class="tab-pane fade show active" id="subtab-roster-events">
                <div class="row g-2 mb-3">
                    <div class="col-12 col-md-5">
                        <input id="roster-event-search" type="search" class="form-control form-control-sm" placeholder="Search event, category, stage...">
                    </div>
                    <div class="col-7 col-md-4">
                        <select id="roster-event-cat" class="form-select form-select-sm">
                            <option value="all">All Categories</option>
                            ${[...new Set(events.map(e => e.category || 'General'))].map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-5 col-md-3 text-end">
                        <span class="badge bg-light text-dark border p-2 w-100" id="roster-event-counter" style="font-size: 0.75rem;">
                            ${events.length} Events
                        </span>
                    </div>
                </div>

                <div class="table-responsive table-mobile-responsive border rounded" style="max-height: 55vh; overflow-y: auto;">
                    <table class="table table-sm table-hover align-middle mb-0" id="roster-events-table">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th style="min-width: 140px;">Event</th>
                                <th style="width: 60px;">Type</th>
                                <th class="text-center" style="width: 75px;">Capacity</th>
                                <th style="min-width: 180px;">Enrolled Roster</th>
                            </tr>
                        </thead>
                        <tbody id="roster-events-body">
                            ${eventSummaries.map(item => {
                                const ev = item.event;
                                const badges = item.participants.map(p => {
                                    if (p.isTeam) {
                                        return `
                                            <div class="border rounded p-2 mb-1 bg-light">
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <strong class="text-primary text-truncate" style="font-size: 0.8rem;">${p.name}</strong>
                                                    <span class="badge bg-secondary flex-shrink-0 ms-1" style="font-size: 0.65rem;">${p.memberCount} members</span>
                                                </div>
                                                <div class="text-muted small" style="font-size: 0.7rem;">Captain: <strong>${p.captainName}</strong></div>
                                                <div class="small mt-1 text-secondary" style="font-size: 0.68rem;">${p.members.map(m => `${m.name} (${m.className})`).join(', ')}</div>
                                            </div>
                                        `;
                                    }
                                    return `
                                        <span class="badge bg-white text-dark border p-1 px-2 me-1 mb-1 shadow-sm d-inline-block" style="font-size: 0.72rem;">
                                            <strong>${p.name}</strong> 
                                            <span class="text-muted">(${p.className})</span>${p.chestNo ? `<span class="badge bg-primary-subtle text-primary ms-1">#${p.chestNo}</span>` : ''}
                                        </span>
                                    `;
                                }).join('') || '<span class="text-muted small fst-italic" style="font-size: 0.72rem;">No participants</span>';

                                return `
                                    <tr class="${item.isOver ? 'table-danger' : (item.isFilled ? 'table-success-subtle' : '')}"
                                        data-event-name="${`${ev.name.toLowerCase()} ${ev.category || ''} ${ev.stage || ''}`}"
                                        data-event-category="${ev.category || 'General'}">
                                        <td>
                                            <strong class="text-dark d-block text-truncate" style="max-width: 160px;">${ev.name}</strong>
                                            <div class="small text-muted" style="font-size: 0.7rem;">${ev.category || 'General'} &bull; ${ev.stage || 'Main Stage'}</div>
                                        </td>
                                        <td>
                                            <span class="badge ${ev.isGroupEvent ? 'bg-info' : 'bg-secondary'}" style="font-size: 0.68rem;">
                                                ${ev.isGroupEvent ? 'Group' : 'Solo'}
                                            </span>
                                        </td>
                                        <td class="text-center">
                                            <span class="badge ${item.isOver ? 'bg-danger' : (item.isFilled ? 'bg-success' : 'bg-light text-dark border')}" style="font-size: 0.72rem;">
                                                ${item.count} / ${item.limit}
                                            </span>
                                        </td>
                                        <td>${badges}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 2. STUDENT-WISE ROSTER TAB -->
            <div class="tab-pane fade" id="subtab-roster-students">
                <div class="table-responsive table-mobile-responsive border rounded" style="max-height: 55vh; overflow-y: auto;">
                    <table class="table table-sm table-striped align-middle mb-0">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th style="min-width: 120px;">Student</th>
                                <th style="width: 70px;">Chest</th>
                                <th class="text-center" style="width: 60px;">Total</th>
                                <th style="min-width: 150px;">Events</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${registrations.map(r => {
                                const student = state.students.find(s => s.id === r.studentId);
                                const enrolledEventNames = (r.events || []).map(id => events.find(e => e.id === id)?.name).filter(Boolean);
                                return `
                                    <tr>
                                        <td>
                                            <strong class="d-block text-truncate" style="max-width: 150px;">${r.studentName}</strong>
                                            <div class="text-muted" style="font-size: 0.7rem;">Adm: ${student?.admissionNumber || 'N/A'} &bull; ${getStudentClassName(student?.classId, student?.division)}</div>
                                        </td>
                                        <td>${r.chestNo ? `<span class="badge bg-primary" style="font-size: 0.7rem;">#${r.chestNo}</span>` : '<span class="text-muted" style="font-size: 0.7rem;">-</span>'}</td>
                                        <td class="text-center"><strong>${r.events?.length || 0}</strong></td>
                                        <td>
                                            <div class="d-flex flex-wrap gap-1">
                                                ${enrolledEventNames.map(name => `<span class="badge bg-light text-dark border" style="font-size: 0.7rem;">${name}</span>`).join('') || '<span class="text-muted small fst-italic">None</span>'}
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('') || '<tr><td colspan="4" class="text-center text-muted p-4 small">No active registrations.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 3. LIVE STATUS CARDS TAB -->
            <div class="tab-pane fade" id="subtab-roster-status">
                <div class="row g-2">
                    ${eventSummaries.map(item => `
                        <div class="col-12 col-md-6 col-xl-4">
                            <div class="border rounded p-2 p-md-3 h-100 shadow-sm ${item.completed ? 'border-success bg-success-subtle' : 'border-warning bg-warning-subtle'}">
                                <div class="d-flex justify-content-between align-items-start gap-1">
                                    <div class="text-truncate me-1">
                                        <strong class="text-dark d-block text-truncate" style="font-size: 0.85rem;">${item.event.name}</strong>
                                        <div class="text-muted" style="font-size: 0.72rem;">${item.event.category || 'General'} &bull; ${item.event.stage || stages[0]}</div>
                                    </div>
                                    <span class="badge ${item.completed ? 'bg-success' : 'bg-warning text-dark'} flex-shrink-0" style="font-size: 0.68rem;">
                                        ${item.completed ? 'Entered' : 'Pending'}
                                    </span>
                                </div>
                                <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top" style="font-size: 0.75rem;">
                                    <span class="fw-semibold">${item.participantTotal} Member(s)</span>
                                    <span class="badge ${item.isOver ? 'bg-danger' : (item.isFilled ? 'bg-success' : 'bg-secondary')}">
                                        ${item.count} / ${item.limit} ${item.event.isGroupEvent ? 'Teams' : 'Entries'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `).join('') || '<div class="col-12 text-muted text-center p-3 small">No events to preview.</div>'}
                </div>
            </div>
        </div>
    `;

    const searchInput = container.querySelector('#roster-event-search');
    const catSelect = container.querySelector('#roster-event-cat');
    const counter = container.querySelector('#roster-event-counter');

    function filterEventsTable() {
        const query = searchInput.value.trim().toLowerCase();
        const cat = catSelect.value;
        let visibleCount = 0;

        container.querySelectorAll('#roster-events-body tr').forEach(row => {
            const matchesSearch = !query || row.dataset.eventName.includes(query);
            const matchesCat = cat === 'all' || row.dataset.eventCategory === cat;
            const isVisible = matchesSearch && matchesCat;
            row.classList.toggle('d-none', !isVisible);
            if (isVisible) visibleCount++;
        });

        if (counter) counter.textContent = `${visibleCount} Events`;
    }

    searchInput.addEventListener('input', filterEventsTable);
    catSelect.addEventListener('change', filterEventsTable);

    window.exportHouseEventRosterPdf = function() {
        const rows = eventSummaries.map((item, idx) => {
            const ev = item.event;
            const participantsText = item.participants.map(p => {
                if (p.isTeam) {
                    return `<strong>${p.name}</strong> (Capt: ${p.captainName}) - [${p.members.map(m => m.name).join(', ')}]`;
                }
                return `${p.name} (${p.className})${p.chestNo ? ` [Chest: ${p.chestNo}]` : ''}`;
            }).join('<br>') || '<em>No participants</em>';

            return `
                <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td><strong>${ev.name}</strong><br><small>${ev.category || 'General'} | ${ev.stage || 'Main Stage'}</small></td>
                    <td>${ev.isGroupEvent ? 'Group' : 'Solo'}</td>
                    <td style="text-align: center;">${item.count} / ${item.limit}</td>
                    <td>${participantsText}</td>
                </tr>
            `;
        }).join('');

        const contentHtml = `
            <div style="text-align: center; margin-bottom: 16px;">
                <h2 style="margin: 0;">${fest.name}</h2>
                <h4 style="margin: 4px 0;">Official House Event Roster: <span style="color: ${house.color || '#000'}">${house.name}</span></h4>
                <div style="font-size: 12px; color: #555;">Generated on: ${new Date().toLocaleDateString()} | Total Registrations: ${registrations.length}</div>
            </div>
            <table class="table table-bordered table-sm" style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead style="background: #f0f0f0;">
                    <tr>
                        <th style="width: 35px; text-align: center;">#</th>
                        <th style="width: 180px;">Event</th>
                        <th style="width: 70px;">Mode</th>
                        <th style="width: 80px; text-align: center;">Slots</th>
                        <th>Registered Participants</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;

        window.printReport({
            contentHtml,
            title: `Event_Roster_${house.name.replace(/\s+/g, '_')}_${fest.name.replace(/\s+/g, '_')}`,
            pageSize: 'A4 landscape'
        });
    };
}

window.filterHouseEventPreview = function(status) {
    document.querySelectorAll('.house-event-preview-card').forEach(card => {
        card.classList.toggle('d-none', card.dataset.entryStatus !== status);
    });
};
