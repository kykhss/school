import { saveScopedDoc } from './firebase-config.js';
import { state, getStudentClassName } from './app-state.js';

function pointsFor(position, isGroup) {
    if (position === 1) return isGroup ? 10 : 5;
    if (position === 2) return isGroup ? 5 : 3;
    if (position === 3) return isGroup ? 3 : 1;
    return 0;
}

function resultRows(fest, event) {
    const registrations = state.festRegistrations.filter(registration => registration.festId === fest.id && (registration.events || []).includes(event.id));
    if (event.isGroupEvent) {
        const groupIds = [...new Set(registrations.map(registration => state.festGroups.find(group => group.festId === fest.id && group.members?.some(member => member.studentId === registration.studentId))?.id).filter(Boolean))];
        return groupIds.map(id => state.festGroups.find(group => group.id === id)).filter(Boolean).map(group => ({ id: group.id, isGroup: true, name: group.name, details: `${group.members?.length || 0} members`, houseId: group.houseId }));
    }
    return registrations.map(registration => ({ id: registration.studentId, isGroup: false, name: registration.studentName, details: `Chest: ${registration.chestNo || 'N/A'} | ${getStudentClassName(state.students.find(student => student.id === registration.studentId)?.classId, state.students.find(student => student.id === registration.studentId)?.division)}`, houseId: registration.houseId }));
}

function renderEventOptions(events, category) {
    return events.filter(event => category === 'ALL' || event.category === category).map(event => `<option value="${event.id}">${event.name} (${event.category})</option>`).join('');
}

window.renderResultEntryTab = function() {
    const container = document.getElementById('tab-result-entry');
    const fest = state.managingFest;
    if (!container || !fest) return;
    const events = state.festEvents.filter(event => event.festId === fest.id);
    const categories = [...new Set(events.map(event => event.category).filter(Boolean))];
    container.innerHTML = `<div class="ui-card"><div class="d-flex justify-content-between align-items-center mb-3"><div><h5 class="section-header mb-1"><i class="fas fa-square-poll-vertical me-2 text-success"></i>Admin Result Entry</h5><p class="small text-muted mb-0">Select an event, enter positions, validate marks, and save the final result.</p></div><span id="result-entry-status" class="badge bg-secondary">No event selected</span></div><div class="row g-2 align-items-end mb-3"><div class="col-md-3"><label class="small fw-bold">Category</label><select id="admin-result-category" class="form-select form-select-sm"><option value="ALL">All Categories</option>${categories.map(category => `<option value="${category}">${category}</option>`).join('')}</select></div><div class="col-md-5"><label class="small fw-bold">Event</label><select id="admin-result-event" class="form-select form-select-sm"><option value="">Select Event</option>${renderEventOptions(events, 'ALL')}</select></div><div class="col-md-2"><label class="small fw-bold">Search</label><input id="admin-result-search" class="form-control form-control-sm" placeholder="Name / chest"></div><div class="col-md-2 d-grid"><button id="admin-result-load" class="btn btn-sm btn-outline-success"><i class="fas fa-users me-1"></i>Load Participants</button></div></div><div id="admin-result-table"></div></div>`;

    const category = document.getElementById('admin-result-category');
    const eventSelect = document.getElementById('admin-result-event');
    category.addEventListener('change', () => { eventSelect.innerHTML = `<option value="">Select Event</option>${renderEventOptions(events, category.value)}`; });
    document.getElementById('admin-result-load').addEventListener('click', () => loadResultEvent(eventSelect.value));
};

function loadResultEvent(eventId) {
    const fest = state.managingFest;
    const event = state.festEvents.find(item => item.id === eventId);
    const table = document.getElementById('admin-result-table');
    if (!event || !table) return window.showAlert('Select an event first.', 'warning');
    const rows = resultRows(fest, event);
    const existing = state.festResults.find(result => result.festId === fest.id && result.eventId === event.id);
    const saved = new Map((existing?.results || []).map(item => [item.groupId || item.studentId, item]));
    table.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-2"><div><strong>${event.name}</strong><span class="text-muted small ms-2">${event.category} | ${event.stage || 'Main Stage'} | ${event.isGroupEvent ? 'Group' : 'Solo'}</span></div><button class="btn btn-sm btn-success" id="admin-result-save"><i class="fas fa-save me-1"></i>Save Results</button></div><div class="table-responsive"><table class="table table-sm table-hover align-middle" id="admin-result-grid"><thead class="table-light"><tr><th>Participant / Group</th><th>House</th><th style="width:150px">Position</th><th style="width:100px">Points</th></tr></thead><tbody>${rows.map(row => { const value = saved.get(row.id)?.position || 0; const house = state.festHouses.find(item => item.id === row.houseId); return `<tr data-id="${row.id}" data-group="${row.isGroup}" data-search="${(row.name + ' ' + row.details).toLowerCase()}"><td><strong>${row.name}</strong><div class="small text-muted">${row.details}</div></td><td>${house?.name || 'N/A'}</td><td><select class="form-select form-select-sm result-position"><option value="0">Not placed</option><option value="1" ${value === 1 ? 'selected' : ''}>1st</option><option value="2" ${value === 2 ? 'selected' : ''}>2nd</option><option value="3" ${value === 3 ? 'selected' : ''}>3rd</option></select></td><td class="result-points">${pointsFor(value, row.isGroup)}</td></tr>`; }).join('') || '<tr><td colspan="4" class="text-muted">No participants found.</td></tr>'}</tbody></table></div><div class="small text-muted mt-2">Ties are allowed. Same-position winners receive the same points: solo 5/3/1, group 10/5/3.</div>`;
    document.getElementById('result-entry-status').textContent = existing ? 'Existing result loaded' : 'New result';
    document.querySelectorAll('#admin-result-grid tbody tr').forEach(row => row.querySelector('.result-position')?.addEventListener('change', event => { row.querySelector('.result-points').textContent = pointsFor(Number(event.target.value), row.dataset.group === 'true'); }));
    document.getElementById('admin-result-search').addEventListener('input', filterResultRows);
    document.getElementById('admin-result-save').addEventListener('click', () => saveAdminResults(fest, event, existing));
}

function filterResultRows(event) {
    const query = event.target.value.toLowerCase();
    document.querySelectorAll('#admin-result-grid tbody tr').forEach(row => { row.hidden = query && !row.dataset.search.includes(query); });
}

async function saveAdminResults(fest, event, existing) {
    const rankedResults = [];
    document.querySelectorAll('#admin-result-grid tbody tr').forEach(row => { const position = Number(row.querySelector('.result-position')?.value || 0); if (!position) return; const item = { position, points: pointsFor(position, row.dataset.group === 'true') }; if (row.dataset.group === 'true') item.groupId = row.dataset.id; else item.studentId = row.dataset.id; rankedResults.push(item); });
    if (!rankedResults.length) return window.showAlert('Assign at least one position.', 'warning');
    if (existing && !confirm('This event already has results. Replace them with these admin results?')) return;
    try {
        const resultDocId = `${fest.id}_${event.id}`;
        const payload = { id: resultDocId, festId: fest.id, eventId: event.id, judgedBy: state.currentUser?.username || 'ADMIN', judgeName: state.currentUser?.name || 'Administrator', judgeSignature: 'Administrator', marksUploaded: true, enteredByAdmin: true, judgedAt: new Date(), results: rankedResults.sort((a, b) => a.position - b.position) };
        await saveScopedDoc('festResults', resultDocId, payload);
        const stored = state.festResults.find(result => result.id === resultDocId);
        if (stored) Object.assign(stored, payload); else state.festResults.push(payload);
        window.showAlert('Results saved successfully.', 'success');
        loadResultEvent(event.id);
    } catch (error) { console.error(error); window.showAlert('Failed to save results.', 'danger'); }
}
