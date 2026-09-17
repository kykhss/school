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
    hashPassword
} from "./app-state.js";

import { 
    doc, 
    getDoc, 
    writeBatch, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

function eventHouseLimit(fest, event, mode) {
    const defaults = fest.settings?.houseEventLimits || { onStage: { solo: 2, group: 1 }, offStage: { solo: 2, group: 1 } };
    if (event?.customHouseLimit !== undefined && event?.customHouseLimit !== null) {
        return Number(event.customHouseLimit);
    }
    const limits = event.houseLimits || defaults;
    return Number(limits[event.type === 'offStage' ? 'offStage' : 'onStage']?.[mode] ?? 0);
}

function houseEventSoloCount(festId, houseId, eventId, excludeStudentId = null) {
    return state.festRegistrations.filter(reg => reg.festId === festId && reg.houseId === houseId && reg.studentId !== excludeStudentId && reg.events?.includes(eventId)).length;
}

function houseEventGroupCount(festId, houseId, eventId, excludeGroupId = null) {
    return state.festGroups.filter(group => group.festId === festId && group.houseId === houseId && group.id !== excludeGroupId && group.eventId === eventId).length;
}

// --- 1. ENTRY ROUTE INTERCEPTOR ---

/**
 * Detects URL hash '#fest-entry' and bootstraps the House Captain experience.
 */
window.checkForDataEntryMode = async function() {
    if (!window.location.hash.startsWith('#fest-entry')) return false;

    const queryParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const yearId = queryParams.get('year') || systemContext.activeYearId;
    const festId = queryParams.get('fest');
    const houseId = queryParams.get('house');

    if (!festId || !houseId) {
        document.body.innerHTML = `<div class="alert alert-danger m-5">Invalid entry portal parameters provided.</div>`;
        return true;
    }

    // Anchor active academic year
    systemContext.activeYearId = yearId;
    localStorage.setItem('activeYearId', yearId);

    document.body.innerHTML = `
        <div class="vh-100 d-flex align-items-center justify-content-center">
            <div class="spinner-border text-primary"></div>
            <p class="ms-3 mb-0">Connecting to Fest House Portal...</p>
        </div>
    `;

    try {
        // Direct fetch of fest and house references without requiring full admin state
        const festSnap = await getDoc(doc(db, `academicYears/${yearId}/fests`, festId));
        const houseSnap = await getDoc(doc(db, `academicYears/${yearId}/festHouses`, houseId));

        if (!festSnap.exists() || !houseSnap.exists()) {
            document.body.innerHTML = `<div class="alert alert-danger m-5">Target Fest or House record does not exist.</div>`;
            return true;
        }

        const festData = { id: festSnap.id, ...festSnap.data() };
        const houseData = { id: houseSnap.id, ...houseSnap.data() };

        renderHousePortalLogin(festData, houseData);
        return true;
    } catch (err) {
        console.error("Portal error:", err);
        document.body.innerHTML = `<div class="alert alert-danger m-5">Connection failed. Check network stability.</div>`;
        return true;
    }
};

// --- 2. AUTHENTICATION & PORTAL SHELL ---

function renderHousePortalLogin(fest, house) {
    document.body.innerHTML = `
        <div class="vh-100 d-flex align-items-center justify-content-center bg-light">
            <div class="card shadow-lg border-0" style="max-width: 420px; width: 100%;">
                <div class="card-body p-4 text-center">
                    <div class="mb-3">
                        <span class="color-dot-display p-3" style="background-color: ${house.color || '#0d6efd'};"></span>
                    </div>
                    <h4 class="fw-bold mb-1">${house.name} Entry</h4>
                    <p class="text-muted small">${fest.name}</p>
                    <form id="house-portal-login-form" class="mt-4">
                        <div class="mb-3">
                            <input type="password" id="house-secret-key" class="form-control text-center" placeholder="Enter House Password" required autocomplete="current-password">
                        </div>
                        <button type="submit" class="btn btn-primary w-100 fw-bold">Enter Dashboard</button>
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

            // Load data collections using cache engine
            await loadAllYearData();
            bootstrapHouseCaptainWorkspace(fest, house);
        } else {
            window.showAlert('Incorrect House Password.', 'danger');
        }
    });
}

function bootstrapHouseCaptainWorkspace(fest, house) {
    const isRegistrationOpen = fest.registrationOpen === true;

    document.body.innerHTML = `
        <nav class="navbar navbar-dark bg-dark px-3 sticky-top shadow-sm">
            <span class="navbar-brand mb-0 h6">
                <span class="color-dot-display" style="background-color: ${house.color};"></span>
                ${house.name} &bull; <small class="text-muted">${fest.name}</small>
            </span>
            <span class="badge ${isRegistrationOpen ? 'bg-success' : 'bg-danger'}">
                ${isRegistrationOpen ? 'Registration Open' : 'Registration Closed'}
            </span>
        </nav>

        <div class="container-fluid py-3">
            <ul class="nav nav-pills mb-3" id="captain-tabs">
             <li class="nav-item">
                    <button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-eventwise-reg">
                        <i class="fas fa-calendar-check me-1"></i>Event-wise Registration
                    </button>
                </li>
                
                <li class="nav-item">
                    <button class="nav-link active" data-bs-toggle="pill" data-bs-target="#tab-solo-reg">
                        <i class="fas fa-user-edit me-1"></i>Solo Registrations
                    </button>
                </li>
               
               
                <li class="nav-item">
                    <button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-group-reg">
                        <i class="fas fa-users me-1"></i>Group Teams
                    </button>
                </li>
                <li class="nav-item">
                    <button class="nav-link" data-bs-toggle="pill" data-bs-target="#tab-view-summary">
                        <i class="fas fa-list-check me-1"></i>Roster Summary
                    </button>
                </li>
            </ul>

            <div class="tab-content card p-3 shadow-sm border-0">
                <div class="tab-pane fade show active" id="tab-solo-reg"></div>
                <div class="tab-pane fade" id="tab-eventwise-reg"></div>
                <div class="tab-pane fade" id="tab-group-reg"></div>
                <div class="tab-pane fade" id="tab-view-summary"></div>
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
            <div class="col-md-5">
                <input type="text" id="captain-student-search" class="form-control form-control-sm" placeholder="Search by name or admission no...">
            </div>
            <div class="col-md-4">
                <select id="captain-class-filter" class="form-select form-select-sm">
                    <option value="all">All Classes</option>
                    ${classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-3 text-end text-muted small">
                Total House Strength: <strong>${houseStudents.length}</strong>
            </div>
        </div>

        <div class="table-responsive" style="max-height: 550px; overflow-y: auto;">
            <table class="table table-sm table-hover align-middle" id="house-solo-table">
                <thead class="table-light sticky-top">
                    <tr>
                        <th>Student Information</th>
                        <th>Registered Events</th>
                        <th class="text-end">Actions</th>
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
            filtered = filtered.filter(s => s.name.toLowerCase().includes(term) || String(s.admissionNumber).includes(term));
        }
        if (classFilter !== 'all') {
            filtered = filtered.filter(s => s.classId === classFilter);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted p-4">No matching students found in your house.</td></tr>`;
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
                const count = houseEventSoloCount(fest.id, house.id, ev.id);
                const invalid = count > limit;
                return `<span class="badge ${invalid ? 'bg-danger' : 'bg-light text-dark'} border me-1" title="${invalid ? `House limit exceeded: ${count}/${limit}` : `House entries: ${count}/${limit}`} ">${ev.name} ${count}/${limit}</span>`;
            }).join('');
            const invalidCount = events.filter(id => {
                const ev = state.festEvents.find(e => e.id === id);
                return ev && houseEventSoloCount(fest.id, house.id, ev.id) > eventHouseLimit(fest, ev, 'solo');
            }).length;

            return `
                <tr data-studentid="${student.id}" data-events="${events.join(',')}" class="${invalidCount ? 'table-danger' : ''}">
                    <td>
                        <strong class="text-dark">${student.name}</strong> 
                        <span class="badge bg-secondary-subtle text-secondary small ms-1">${getStudentCategory(student)}</span>
                        <div class="small text-muted">Adm: ${student.admissionNumber} | Class: ${getStudentClassName(student.classId, student.division)}</div>
                    </td>
                    <td>${badges || '<small class="text-muted">No events assigned</small>'}</td>
                    <td class="text-end">
                        <button class="btn ${invalidCount ? 'btn-danger' : 'btn-outline-primary'} btn-sm py-1" onclick="window.openEventAllocationModal('${student.id}')" ${!isRegistrationOpen ? 'disabled' : ''}>
                            <i class="fas fa-edit me-1"></i>Manage
                            <span class="badge bg-primary ms-1">${count}</span>
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

    // Isolate solo events open to student's category and gender
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
        <div class="mb-3">
            <span class="badge bg-info">Category: ${studentCat}</span>
            <p class="small text-muted mt-1 mb-0">Per-student limits: On-Stage (${maxOnStage}), Off-Stage (${maxOffStage}). Each event shows its house limit.</p>
        </div>
        <div class="row">
            <div class="col-md-6 border-end">
                <h6 class="fw-bold text-primary small">ON-STAGE EVENTS</h6>
                <div class="d-flex flex-column gap-2" id="box-onstage">
                    ${renderChecklist(onStage, selected, 'onStage')}
                </div>
            </div>
            <div class="col-md-6">
                <h6 class="fw-bold text-primary small">OFF-STAGE EVENTS</h6>
                <div class="d-flex flex-column gap-2" id="box-offstage">
                    ${renderChecklist(offStage, selected, 'offStage')}
                </div>
            </div>
        </div>
    `;

    const modalFooter = `
        <button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-success btn-sm fw-bold" id="modal-save-solo-btn">Save Selections</button>
    `;

    window.showGlobalModal(`Event Selection: ${student.name}`, modalBody, modalFooter);

    // Live validation
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
                item?.querySelector('label')?.insertAdjacentHTML('beforeend', ` <span class="badge ${existingCount + (cb.checked ? 1 : 0) > limit ? 'bg-danger' : 'bg-light text-dark'} border event-limit-warning">House ${existingCount + (cb.checked ? 1 : 0)}/${limit}</span>`);
            }
        });
    }

    checkboxes.forEach(cb => cb.addEventListener('change', applyLimits));
    applyLimits();

    document.getElementById('modal-save-solo-btn').addEventListener('click', async () => {
        const checkedEvents = Array.from(document.querySelectorAll('.ev-select-cb:checked')).map(cb => cb.value);
        const exceeded = checkedEvents.map(id => state.festEvents.find(event => event.id === id)).filter(event => event && houseEventSoloCount(fest.id, houseId, event.id, student.id) + 1 > eventHouseLimit(fest, event, 'solo'));
        if (exceeded.length) return window.showAlert(`House limit exceeded for: ${exceeded.map(event => event.name).join(', ')}`, 'danger');
        
        // Preserve any group events this student belongs to
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

function renderChecklist(eventList, selectedSet, type) {
    if (eventList.length === 0) return `<small class="text-muted">No eligible events.</small>`;
    return eventList.map(e => `
        <div class="form-check">
            <input class="form-check-input ev-select-cb" type="checkbox" value="${e.id}" data-type="${type}" id="cb-${e.id}" ${selectedSet.has(e.id) ? 'checked' : ''}>
            <label class="form-check-label small" for="cb-${e.id}">${e.name}</label>
        </div>
    `).join('');
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
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
                <h6 class="fw-bold mb-1"><i class="fas fa-calendar-check text-primary me-2"></i>Event-wise Registration</h6>
                <div class="small text-muted">Click <strong>Assign Students</strong> to search and pick participants, or click any student badge to edit their full schedule.</div>
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="badge bg-secondary py-2">${houseStudents.length} House Students</span>
            </div>
        </div>

        <div class="row g-2 mb-3">
            <div class="col-md-4">
                <label class="small fw-bold" for="eventwise-category-filter">Filter Category</label>
                <select id="eventwise-category-filter" class="form-select form-select-sm">
                    <option value="all">All Categories</option>
                    ${categories.map(category => `<option value="${category}">${category}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-4">
                <label class="small fw-bold" for="eventwise-event-search">Search Event</label>
                <input id="eventwise-event-search" class="form-control form-control-sm" placeholder="Event name or stage...">
            </div>
            <div class="col-md-4 d-flex align-items-end">
                <div class="d-flex gap-2 align-items-center small">
                    <span class="badge bg-warning-subtle text-warning-emphasis border border-warning">Pending</span>
                    <span class="badge bg-success-subtle text-success-emphasis border border-success">Filled</span>
                    <span class="badge bg-danger text-white">Over Limit</span>
                </div>
            </div>
        </div>

        <div class="table-responsive border rounded" style="max-height: 600px; overflow-y: auto;">
            <table class="table table-sm table-hover align-middle mb-0" id="eventwise-registration-table">
                <thead class="table-light sticky-top">
                    <tr>
                        <th style="min-width: 180px;">Event</th>
                        <th>Type</th>
                        <th class="text-center" style="width: 110px;">House Capacity</th>
                        <th style="min-width: 250px;">Registered Participants (Click to Edit)</th>
                        <th class="text-end" style="width: 160px;">Action</th>
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
                ? `<span class="badge bg-danger text-white"><i class="fas fa-exclamation-circle me-1"></i>${count}/${limit}</span>`
                : (isFull 
                    ? `<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>${count}/${limit}</span>`
                    : `<span class="badge bg-warning text-dark border">${count}/${limit}</span>`);

            const registeredHtml = registered.map(({ registration, student }) => `
                <div class="d-inline-flex align-items-center bg-white border rounded-pill px-2 py-1 me-1 mb-1 shadow-sm">
                    <span class="eventwise-student-chip text-primary fw-bold small me-2" role="button" data-student-id="${registration.studentId}" title="Click to view/edit all events for this student">
                        <i class="fas fa-user-pen me-1 text-secondary"></i>${student?.name || registration.studentName}
                    </span>
                    <button type="button" class="btn-close btn-close-xs eventwise-clear-btn" data-registration-id="${registration.id}" data-event-id="${event.id}" title="Remove from this event" style="font-size: 0.65rem;"></button>
                </div>
            `).join('') || '<span class="small text-muted fst-italic">No participants registered</span>';

            return `
                <tr class="${rowClass}">
                    <td>
                        <strong>${event.name}</strong>
                        <div class="small text-muted">${event.category || 'General'} &bull; ${event.stage || 'Main Stage'}</div>
                    </td>
                    <td>
                        <span class="badge ${event.isGroupEvent ? 'bg-info' : 'bg-secondary'}">${event.isGroupEvent ? 'Group' : 'Solo'}</span>
                    </td>
                    <td class="text-center">${statusBadge}</td>
                    <td>${registeredHtml}</td>
                    <td class="text-end text-nowrap">
                        ${event.isGroupEvent
                            ? '<span class="small text-muted fst-italic">Use Group Teams tab</span>'
                            : `<button type="button" class="btn btn-sm ${isFull ? 'btn-outline-secondary' : 'btn-primary'} open-student-picker-btn" data-event-id="${event.id}" ${!isRegistrationOpen || isFull ? 'disabled' : ''}>
                                 <i class="fas fa-user-plus me-1"></i>${isFull ? 'Full' : 'Assign Students'}
                               </button>`
                        }
                    </td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="5" class="text-center text-muted p-4">No events found matching criteria.</td></tr>';
    }

    container.addEventListener('click', async e => {
        // Open Student Selection Modal
        const pickerBtn = e.target.closest('.open-student-picker-btn');
        if (pickerBtn) {
            window.openEventStudentPickerModal(pickerBtn.dataset.eventId, house.id);
            return;
        }

        // Open Individual Student Event Schedule Modal
        const studentChip = e.target.closest('.eventwise-student-chip');
        if (studentChip) {
            window.openEventAllocationModal(studentChip.dataset.studentId);
            return;
        }

        // Remove Single Participant from Event
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
    const existingRegistrations = state.festRegistrations.filter(r => r.festId === fest.id && r.houseId === houseId && r.events?.includes(eventId));
    const enrolledStudentIds = new Set(existingRegistrations.map(r => r.studentId));
    const availableSlots = Math.max(0, limit - enrolledStudentIds.size);

    // Filter eligible pool
    const eligibleStudents = houseStudents.filter(student => {
        if (enrolledStudentIds.has(student.id)) return false;
        const catMatch = event.category === 'General' || getStudentCategory(student) === event.category;
        const genderMatch = !event.gender || event.gender === 'Common' || 
            (event.gender === 'Male' && student.gender === 'M') || 
            (event.gender === 'Female' && student.gender === 'F');
        return catMatch && genderMatch;
    });

    const selectedStudentIds = new Set();

    const modalBody = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
                <h6 class="fw-bold mb-0 text-primary">${event.name}</h6>
                <div class="small text-muted">${event.category || 'General'} &bull; ${event.type === 'offStage' ? 'Off-Stage' : 'On-Stage'}</div>
            </div>
            <div class="text-end">
                <span class="badge bg-light text-dark border">House Limit: <strong>${limit}</strong></span>
                <span class="badge bg-info ms-1" id="picker-slots-badge">Remaining Slots: <strong>${availableSlots}</strong></span>
            </div>
        </div>

        <div class="mb-3">
            <input type="search" id="modal-student-search-input" class="form-control form-control-sm" placeholder="Search by name, admission no, or class...">
        </div>

        <div class="row g-2">
            <div class="col-md-7 border-end">
                <label class="small fw-bold mb-1">Eligible Students (${eligibleStudents.length})</label>
                <div class="list-group border rounded" id="modal-student-available-list" style="max-height: 280px; overflow-y: auto;"></div>
            </div>
            <div class="col-md-5">
                <label class="small fw-bold mb-1">Selected to Add (<span id="modal-selected-count">0</span>)</label>
                <div class="border rounded p-2 bg-light" id="modal-selected-queue" style="max-height: 280px; overflow-y: auto;">
                    <div class="text-muted small text-center py-4">Check students on the left to queue them here.</div>
                </div>
            </div>
        </div>
    `;

    const modalFooter = `
        <button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-success btn-sm fw-bold" id="modal-commit-students-btn" disabled>
            <i class="fas fa-save me-1"></i>Save Assignments
        </button>
    `;

    const modal = window.showGlobalModal(`Assign Students`, modalBody, modalFooter);

    const availableContainer = document.getElementById('modal-student-available-list');
    const queueContainer = document.getElementById('modal-selected-queue');
    const countBadge = document.getElementById('modal-selected-count');
    const commitBtn = document.getElementById('modal-commit-students-btn');
    const searchInput = document.getElementById('modal-student-search-input');

    function renderAvailableList() {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = eligibleStudents.filter(student => {
            const name = student.name.toLowerCase();
            const adm = String(student.admissionNumber || '').toLowerCase();
            const className = getStudentClassName(student.classId, student.division).toLowerCase();
            return !query || name.includes(query) || adm.includes(query) || className.includes(query);
        });

        if (!filtered.length) {
            availableContainer.innerHTML = `<div class="p-3 text-center text-muted small">No eligible students match your search.</div>`;
            return;
        }

        availableContainer.innerHTML = filtered.map(student => {
            const isChecked = selectedStudentIds.has(student.id);
            const disableCheck = !isChecked && (selectedStudentIds.size >= availableSlots);

            return `
                <label class="list-group-item list-group-item-action d-flex align-items-center py-2 px-3 small ${disableCheck ? 'opacity-50' : ''}">
                    <input class="form-check-input me-2 modal-student-cb" type="checkbox" value="${student.id}" ${isChecked ? 'checked' : ''} ${disableCheck ? 'disabled' : ''}>
                    <div class="flex-grow-1">
                        <strong>${student.name}</strong>
                        <div class="text-muted small">Adm: ${student.admissionNumber || 'N/A'} &bull; ${getStudentClassName(student.classId, student.division)}</div>
                    </div>
                </label>
            `;
        }).join('');
    }

    function renderQueue() {
        const chosen = eligibleStudents.filter(s => selectedStudentIds.has(s.id));
        countBadge.textContent = chosen.length;
        commitBtn.disabled = chosen.length === 0;

        if (!chosen.length) {
            queueContainer.innerHTML = `<div class="text-muted small text-center py-4">Check students on the left to queue them here.</div>`;
            return;
        }

        queueContainer.innerHTML = chosen.map(student => `
            <div class="d-flex justify-content-between align-items-center bg-white border rounded p-1 px-2 mb-1 shadow-sm small">
                <span class="text-truncate me-2"><strong>${student.name}</strong></span>
                <button type="button" class="btn btn-xs btn-outline-danger modal-remove-queued-btn" data-id="${student.id}">&times;</button>
            </div>
        `).join('');
    }

    // Checkbox toggling
    availableContainer.addEventListener('change', e => {
        const cb = e.target.closest('.modal-student-cb');
        if (!cb) return;

        if (cb.checked) {
            if (selectedStudentIds.size < availableSlots) {
                selectedStudentIds.add(cb.value);
            }
        } else {
            selectedStudentIds.delete(cb.value);
        }
        renderAvailableList();
        renderQueue();
    });

    // Remove from queue
    queueContainer.addEventListener('click', e => {
        const removeBtn = e.target.closest('.modal-remove-queued-btn');
        if (!removeBtn) return;
        selectedStudentIds.delete(removeBtn.dataset.id);
        renderAvailableList();
        renderQueue();
    });

    searchInput.addEventListener('input', renderAvailableList);

    // Initial render
    renderAvailableList();
    renderQueue();

    // Commit & Batch Write
    commitBtn.addEventListener('click', async () => {
        if (!selectedStudentIds.size) return;
        commitBtn.disabled = true;
        commitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving...`;

        const batch = writeBatch(db);

        selectedStudentIds.forEach(studentId => {
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
            window.showAlert(`Assigned ${selectedStudentIds.size} student(s) to ${event.name}.`, 'success');
            modal?.hide();
            await loadAllYearData(true);
            eventwiseRegistrationTab(fest, state.festHouses.find(h => h.id === houseId), fest.registrationOpen === true);
        } catch (error) {
            console.error(error);
            window.showAlert('Failed to save student assignments.', 'danger');
            commitBtn.disabled = false;
            commitBtn.innerHTML = `<i class="fas fa-save me-1"></i>Save Assignments`;
        }
    });
};

// --- 5. GROUP TEAM MANAGEMENT TAB ---

function renderGroupTeamTab(fest, house, isRegistrationOpen) {
    const container = document.getElementById('tab-group-reg');
    const groups = state.festGroups.filter(g => g.festId === fest.id && g.houseId === house.id);

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="fw-bold mb-0">House Group Teams</h6>
            <button class="btn btn-primary btn-sm" onclick="window.openGroupModal(null)" ${!isRegistrationOpen ? 'disabled' : ''}>
                <i class="fas fa-plus me-1"></i>Create Group Team
            </button>
        </div>

        <div class="row g-3" id="groups-list">
            ${groups.length === 0 ? `<div class="col-12 text-center text-muted p-4">No groups formed yet.</div>` : ''}
            ${groups.map(g => {
                const captain = g.members?.find(m => m.role === 'Captain');
                const captainObj = state.students.find(s => s.id === captain?.studentId);
                return `
                    <div class="col-md-6">
                        <div class="card border p-3">
                            <div class="d-flex justify-content-between">
                                <h6 class="fw-bold mb-1">${g.name}</h6>
                                <span class="badge bg-secondary">${g.members?.length || 0} Members</span>
                            </div>
                            <p class="small text-muted mb-2">${g.category || 'General'} | ${state.festEvents.find(e => e.id === g.eventId)?.name || 'Event not recorded'}<br>Captain: <strong>${captainObj?.name || 'Unassigned'}</strong></p>
                            <div class="d-flex justify-content-end gap-2 mt-2">
                                <button class="btn btn-xs btn-outline-secondary" onclick="window.printGroupRollCard('${g.id}')">
                                    <i class="fas fa-print me-1"></i>Roll Card
                                </button>
                                <button class="btn btn-xs btn-outline-primary" onclick="window.openGroupModal('${g.id}')" ${!isRegistrationOpen ? 'disabled' : ''}>
                                    Edit Members
                                </button>
                                <button class="btn btn-xs btn-outline-danger" onclick="window.deleteGroup('${g.id}')" ${!isRegistrationOpen ? 'disabled' : ''}>
                                    Delete
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
        <div class="mb-3">
            <label class="form-label small fw-bold">Group / Team Name</label>
            <input type="text" id="grp-name" class="form-control form-control-sm" value="${group?.name || ''}" placeholder="e.g., Patriotic Song Squad">
        </div>
        <div class="mb-3">
            <label class="form-label small fw-bold">Category</label>
            <select id="grp-category" class="form-select form-select-sm">
                <option value="">Choose category</option>
                ${categories.map(category => `<option value="${category}" ${group?.category === category ? 'selected' : ''}>${category}</option>`).join('')}
            </select>
        </div>
        <div class="mb-3">
            <label class="form-label small fw-bold">Select Group Event</label>
            <select id="grp-event" class="form-select form-select-sm">
                    <option value="">Choose event</option>
                    ${groupEvents.map(e => `<option value="${e.id}" ${group?.eventId === e.id ? 'selected' : ''}>${e.name} (${e.category}) - House limit: ${eventHouseLimit(fest, e, 'group')}${e.maxParticipants ? `, max ${e.maxParticipants} members` : ''}</option>`).join('')}
            </select>
        </div>
            <div id="grp-validation" class="small mb-3"></div>
        <div class="row">
            <div class="col-md-6 border-end">
                <label class="form-label small fw-bold">Available Students</label>
                <input type="search" id="grp-student-search" class="form-control form-control-sm mb-2" placeholder="Search name or admission number">
                <div class="list-group small" id="grp-pool" style="max-height: 250px; overflow-y: auto;">
                    <small class="text-muted">Choose a category and event to load eligible students.</small>
                </div>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-bold">Chosen Roster</label>
                <ul class="list-group small" id="grp-selected"></ul>
            </div>
        </div>
    `;

    const modalFooter = `
        <button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-primary btn-sm fw-bold" id="grp-save-btn">Commit Team</button>
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
            <button type="button" class="list-group-item list-group-item-action py-1 pool-student-btn" data-id="${student.id}">
                ${student.name} <small class="text-muted">(${getStudentClassName(student.classId, student.division)})</small>
            </button>
        `).join('') || '<small class="text-muted">No students match this category and event gender.</small>';
        updateGroupValidation();
    }

    categoryPicker.addEventListener('change', updateStudentPool);
    eventPicker.addEventListener('change', updateStudentPool);
    studentSearch.addEventListener('input', updateStudentPool);

    function updateRosterUI() {
        const list = document.getElementById('grp-selected');
        list.innerHTML = activeMembers.map((m, index) => {
            const student = state.students.find(s => s.id === m.studentId);
            return `
                <li class="list-group-item d-flex justify-content-between align-items-center py-1">
                    <span>${student?.name}</span>
                    <div>
                        <select class="form-select form-select-sm d-inline-block w-auto py-0 me-1 role-select" data-index="${index}">
                            <option value="Member" ${m.role === 'Member' ? 'selected' : ''}>Member</option>
                            <option value="Captain" ${m.role === 'Captain' ? 'selected' : ''} ${m.role !== 'Captain' && activeMembers.some(member => member.role === 'Captain') ? 'disabled' : ''}>Captain</option>
                        </select>
                        <button class="btn btn-xs btn-outline-danger remove-roster-btn" data-index="${index}">&times;</button>
                    </div>
                </li>
            `;
        }).join('') || `<li class="text-muted text-center py-2">Click students on the left to add.</li>`;
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
            errors.push(`${selectedEvent.name} allows ${selectedEvent.maxParticipants} members per team; this team has ${activeMembers.length}.`);
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
            ? `<div class="alert alert-danger py-2 mb-0"><strong>Cannot save:</strong><ul class="mb-0 ps-3">${errors.map(error => `<li>${error}</li>`).join('')}</ul></div>`
            : '<div class="alert alert-success py-2 mb-0">Group details and participation limits are valid.</div>';
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
        if (!name || !category || !eventId || activeMembers.length === 0) return window.showAlert('Please choose an event, fill category and name, and add members.', 'warning');
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

        // Bind event registration across all active members
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
    const events = state.festEvents.filter(event => event.festId === fest.id);
    const completedEventIds = new Set(state.festResults.filter(result => result.festId === fest.id).map(result => result.eventId));
    const stages = fest.stages?.length ? fest.stages : ['Main Stage'];
    const eventSummaries = events.map(event => {
        const eventRegistrations = registrations.filter(registration => registration.events?.includes(event.id));
        const groups = state.festGroups.filter(group => group.festId === fest.id && group.eventId === event.id && group.houseId === house.id);
        const participantCount = event.isGroupEvent
            ? groups.reduce((total, group) => total + (group.members?.length || 0), 0)
            : eventRegistrations.length;
        return { event, participantCount, cancelled: event.cancelled === true, completed: event.cancelled !== true && completedEventIds.has(event.id) };
    });

    container.innerHTML = `
        <h6 class="fw-bold mb-3">All Active House Registrations (${registrations.length})</h6>
        <div class="table-responsive">
            <table class="table table-sm table-striped small">
                <thead>
                    <tr>
                        <th>Admission No</th>
                        <th>Student Name</th>
                        <th>Class</th>
                        <th>Chest No</th>
                        <th>Event Count</th>
                    </tr>
                </thead>
                <tbody>
                    ${registrations.map(r => {
                        const student = state.students.find(s => s.id === r.studentId);
                        return `
                            <tr>
                                <td>${student?.admissionNumber || 'N/A'}</td>
                                <td><strong>${r.studentName}</strong></td>
                                <td>${getStudentClassName(student?.classId, student?.division)}</td>
                                <td>${r.chestNo || '<span class="text-muted">Unassigned</span>'}</td>
                                <td>${r.events?.length || 0}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        <hr class="my-4">
        <div class="border rounded p-3 mb-3">
            <div class="row g-2 align-items-end">
                <div class="col-md-4">
                    <label class="small fw-bold" for="house-event-category">Category</label>
                    <select id="house-event-category" class="form-select form-select-sm"><option value="all">All categories</option>${[...new Set(events.map(event => event.category).filter(Boolean))].map(category => `<option value="${category}">${category}</option>`).join('')}</select>
                </div>
                <div class="col-md-5">
                    <label class="small fw-bold" for="house-event-selector">Event</label>
                    <select id="house-event-selector" class="form-select form-select-sm"></select>
                </div>
                <div class="col-md-3"><div id="house-event-limit-status" class="small"></div></div>
            </div>
            <div id="house-event-participants" class="table-responsive mt-3"></div>
        </div>
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
                <h6 class="fw-bold mb-1"><i class="fas fa-calendar-check me-2"></i>Event Entry Preview</h6>

                <div class="small text-muted">Green means judging entry received. Amber means pending catch-up.</div>
            </div>
            <button class="btn btn-sm btn-outline-warning" type="button" onclick="window.filterHouseEventPreview('pending')"><i class="fas fa-hourglass-half me-1"></i>Pending</button>
        </div>
        <div class="row g-2" id="house-event-preview">
            ${eventSummaries.map(item => `
                <div class="col-md-6 col-xl-4 house-event-preview-card" data-entry-status="${item.cancelled ? 'cancelled' : item.completed ? 'completed' : 'pending'}">
                    <div class="border rounded p-3 h-100 ${item.cancelled ? 'border-secondary bg-light' : item.completed ? 'border-success bg-success-subtle' : 'border-warning bg-warning-subtle'}">
                        <div class="d-flex justify-content-between gap-2">
                            <strong>${item.event.name}</strong>
                            <span class="badge ${item.cancelled ? 'bg-secondary' : item.completed ? 'bg-success' : 'bg-warning text-dark'}">${item.cancelled ? 'Cancelled' : item.completed ? 'Entered' : 'Pending'}</span>
                        </div>
                        <div class="small text-muted mt-1">${item.event.category || 'General'} &bull; ${item.event.isGroupEvent ? 'Group' : 'Solo'} &bull; ${item.event.stage || stages[0]}</div>
                        <div class="small fw-bold mt-2">${item.cancelled ? 'Programme cancelled' : `${item.participantCount} house participant${item.participantCount === 1 ? '' : 's'}`}</div>
                    </div>
                </div>
            `).join('') || '<div class="col-12"><div class="text-muted small">No events available.</div></div>'}
        </div>
    `;

    const categoryPicker = container.querySelector('#house-event-category');
    const eventPicker = container.querySelector('#house-event-selector');
    const participantBox = container.querySelector('#house-event-participants');
    const limitStatus = container.querySelector('#house-event-limit-status');
    function renderEventOptions() {
        const filteredEvents = events.filter(event => categoryPicker.value === 'all' || event.category === categoryPicker.value);
        eventPicker.innerHTML = filteredEvents.map(event => `<option value="${event.id}">${event.name} (${event.isGroupEvent ? 'Group' : 'Solo'})</option>`).join('') || '<option value="">No events</option>';
        renderSelectedEvent();
    }
    function renderSelectedEvent() {
        const event = events.find(item => item.id === eventPicker.value);
        if (!event) {
            limitStatus.innerHTML = '';
            participantBox.innerHTML = '<div class="small text-muted">Choose an event to inspect its house entries.</div>';
            return;
        }
        const mode = event.isGroupEvent ? 'group' : 'solo';
        const limit = eventHouseLimit(fest, event, mode);
        const entries = event.isGroupEvent
            ? state.festGroups.filter(group => group.festId === fest.id && group.houseId === house.id && group.eventId === event.id)
            : registrations.filter(registration => registration.events?.includes(event.id));
        const exceeded = entries.length > limit;
        limitStatus.innerHTML = `<span class="badge ${exceeded ? 'bg-danger' : 'bg-success'}">${entries.length}/${limit} ${mode} house limit</span>${exceeded ? '<div class="text-danger mt-1">Limit exceeded</div>' : ''}`;
        participantBox.innerHTML = `<table class="table table-sm align-middle mb-0"><thead><tr><th>#</th><th>${mode === 'group' ? 'Team' : 'Student'}</th><th>Details</th><th>Status</th></tr></thead><tbody>${entries.map((entry, index) => {
            const student = mode === 'group' ? null : state.students.find(item => item.id === entry.studentId);
            const name = mode === 'group' ? entry.name : entry.studentName;
            const details = mode === 'group' ? `${entry.members?.length || 0} members` : `${student?.admissionNumber || ''} | ${getStudentClassName(student?.classId, student?.division)}`;
            return `<tr class="${exceeded ? 'table-danger' : ''}"><td>${index + 1}</td><td><strong>${name}</strong></td><td>${details}</td><td><span class="badge ${exceeded ? 'bg-danger' : 'bg-success'}">${exceeded ? 'Over limit' : 'Valid'}</span></td></tr>`;
        }).join('') || '<tr><td colspan="4" class="text-muted">No participants selected for this event.</td></tr>'}</tbody></table>`;
    }
    categoryPicker.addEventListener('change', renderEventOptions);
    eventPicker.addEventListener('change', renderSelectedEvent);
    renderEventOptions();
}

window.filterHouseEventPreview = function(status) {
    document.querySelectorAll('.house-event-preview-card').forEach(card => {
        card.classList.toggle('d-none', card.dataset.entryStatus !== status);
    });
};
