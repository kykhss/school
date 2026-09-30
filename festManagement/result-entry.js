import { saveScopedDoc } from './firebase-config.js';
import { state, getStudentClassName } from './app-state.js';

// Special Event point scales
function pointsFor(position, isGroup = false, name = '') {
    const cleanName = String(name || '').trim().toUpperCase();
    const isMarchPast = cleanName === "MARCH PAST";
    const isDiscipline = cleanName.includes("DISCIPLINE");

    // 1. Special Event: March Past (20 / 15 / 10 / 5)
    if (isMarchPast) {
        if (position === 1) return 20;
        if (position === 2) return 15;
        if (position === 3) return 10;
        if (position === 4) return 5;
        return 0;
    }

    // 2. Special Event: Discipline / Cleanliness (10 / 7 / 5 / 3)
    if (isDiscipline) {
        if (position === 1) return 10;
        if (position === 2) return 7;
        if (position === 3) return 5;
        if (position === 4) return 3;
        return 0;
    }

    // 3. Group Tier (15 / 10 / 5 / 0)
    if (isGroup) {
        if (position === 1) return 15;
        if (position === 2) return 10;
        if (position === 3) return 5;
        if (position === 4) return 0;
        return 0;
    }

    // 4. Solo / Standard Tier (5 / 3 / 1 / 0)
    if (position === 1) return 5;
    if (position === 2) return 3;
    if (position === 3) return 1;
    if (position === 4) return 0;

    return 0;
}

// Determines if an event is an institutional house-level special event
function isSpecialHouseEvent(event) {
    const name = String(event.name || '').trim().toUpperCase();
    return event.isSpecial || 
           name.includes("MARCH PAST") || 
           name.includes("DISCIPLINE") || 
           name.includes("DECORATION") || 
           name.includes("HOUSE TROPHY");
}

function resultRows(fest, event) {
    // 1. Special House Event Check (e.g. March Past, Discipline)
    if (isSpecialHouseEvent(event)) {
        return state.festHouses.map(h => ({
            id: `SPECIAL_${fest.id}_${h.id}_${event.id}`,
            isGroup: true,
            isSpecialHouse: true,
            name: `${h.name} Squad`,
            chestNo: 'House',
            details: `House Parade / Special Program`,
            houseId: h.id
        }));
    }

    // 2. Standard Group Events
    if (event.isGroupEvent || event.type === 'group') {
        const groups = state.festGroups.filter(group => 
            group.festId === fest.id && 
            !group.isDeleted &&
            group.eventId === event.id
        );

        return groups.map(group => ({
            id: group.id,
            isGroup: true,
            isSpecialHouse: false,
            name: group.name,
            chestNo: 'Group',
            details: `${group.members?.length || 0} members`,
            houseId: group.houseId
        }));
    }

    // 3. Standard Solo Events
    const registrations = state.festRegistrations.filter(registration => 
        registration.festId === fest.id && 
        !registration.isDeleted &&
        (registration.events || []).includes(event.id)
    );

    return registrations.map(registration => {
        const student = state.students.find(s => s.id === registration.studentId);
        return {
            id: registration.studentId,
            isGroup: false,
            isSpecialHouse: false,
            name: registration.studentName || student?.name || 'Student',
            chestNo: registration.chestNo || '-',
            details: `Adm: ${student?.admissionNumber || 'N/A'} &bull; ${getStudentClassName(student?.classId, student?.division)}`,
            houseId: registration.houseId || student?.houseId
        };
    });
}

function renderEventOptions(events, category) {
    return events
        .filter(event => category === 'ALL' || event.category === category)
        .map(event => `<option value="${event.id}">${event.name} (${event.category || 'General'})</option>`)
        .join('');
}

window.renderResultEntryTab = function() {
    const container = document.getElementById('tab-result-entry');
    const fest = state.managingFest;
    if (!container || !fest) return;

    const events = state.festEvents.filter(event => event.festId === fest.id && event.cancelled !== true);
    const categories = [...new Set(events.map(event => event.category).filter(Boolean))];

    container.innerHTML = `
        <div class="ui-card">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h5 class="section-header mb-1">
                        <i class="fas fa-square-poll-vertical me-2 text-success"></i>Admin Result Entry &amp; Scoring
                    </h5>
                    <p class="small text-muted mb-0">Record scores to auto-rank winners, or select positions manually. Special events auto-load competing houses.</p>
                </div>
                <span id="result-entry-status" class="badge bg-secondary">No event selected</span>
            </div>

            <div class="row g-2 align-items-end mb-3">
                <div class="col-md-3">
                    <label class="small fw-bold">Category</label>
                    <select id="admin-result-category" class="form-select form-select-sm">
                        <option value="ALL">All Categories</option>
                        ${categories.map(category => `<option value="${category}">${category}</option>`).join('')}
                    </select>
                </div>
                
                <div class="col-md-4">
                    <label class="small fw-bold">Event</label>
                    <select id="admin-result-event" class="form-select form-select-sm">
                        <option value="">Select Event</option>
                        ${renderEventOptions(events, 'ALL')}
                    </select>
                </div>

                <div class="col-md-2 d-grid">
                    <button id="admin-result-scan-btn" class="btn btn-sm btn-primary" type="button">
                        <i class="fas fa-camera me-1"></i>Scan QR
                    </button>
                </div>

                <div class="col-md-3 d-flex gap-1">
                    <input id="admin-result-search" class="form-control form-control-sm" placeholder="Filter name / chest">
                    <button id="admin-result-load" class="btn btn-sm btn-outline-success text-nowrap">
                        <i class="fas fa-users me-1"></i>Load
                    </button>
                </div>
            </div>

            <div id="admin-result-table"></div>
        </div>
    `;

    const category = document.getElementById('admin-result-category');
    const eventSelect = document.getElementById('admin-result-event');

    category.addEventListener('change', () => { 
        eventSelect.innerHTML = `<option value="">Select Event</option>${renderEventOptions(events, category.value)}`; 
    });

    document.getElementById('admin-result-load').addEventListener('click', () => {
        loadResultEvent(eventSelect.value);
    });

    document.getElementById('admin-result-scan-btn').addEventListener('click', openResultScannerModal);
};

export function loadResultEvent(eventId) {
    const fest = state.managingFest;
    const event = state.festEvents.find(item => item.id === eventId);
    const table = document.getElementById('admin-result-table');
    if (!event || !table) return window.showAlert('Select an event first.', 'warning');

    const rows = resultRows(fest, event);
    const existing = state.festResults.find(result => result.festId === fest.id && result.eventId === event.id);
    const saved = new Map((existing?.results || []).map(item => [item.groupId || item.studentId, item]));

    // Sort students/groups alphabetically based on name by default
    rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    const isSpecial = isSpecialHouseEvent(event);

    table.innerHTML = `
        <div class="d-flex flex-wrap justify-content-between align-items-center mb-2 p-2 bg-light rounded border">
            <div>
                <strong class="text-dark fs-6">${event.name}</strong>
                <span class="badge ${isSpecial ? 'bg-danger-subtle text-danger border border-danger' : (event.isGroupEvent ? 'bg-info-subtle text-info border' : 'bg-primary-subtle text-primary border')} ms-2">
                    ${isSpecial ? 'Special House Event' : (event.isGroupEvent ? 'Group Event' : 'Solo')}
                </span>
                <span class="text-muted small ms-2">${event.category || 'General'} &bull; ${event.stage || 'Main Stage'}</span>
            </div>
            <div class="d-flex align-items-center gap-2">
                <button type="button" class="btn btn-sm btn-outline-primary" id="admin-auto-rank-btn" title="Re-rank positions based on marks">
                    <i class="fas fa-arrow-down-9-1 me-1"></i>Auto Rank Marks
                </button>
                <button class="btn btn-sm btn-success fw-bold px-3" id="admin-result-save">
                    <i class="fas fa-save me-1"></i>Save Results
                </button>
            </div>
        </div>

        <div class="table-responsive border rounded bg-white">
            <table class="table table-sm table-hover align-middle mb-0" id="admin-result-grid">
                <thead class="table-light sticky-top shadow-xs">
                    <tr>
                        <th style="width: 90px;" class="text-center">Chest No</th>
                        <th style="min-width: 200px;">Participant / Group</th>
                        <th style="width: 130px;">House</th>
                        <th style="width: 110px;">Marks / Score</th>
                        <th style="width: 140px;">Position</th>
                        <th style="width: 90px;" class="text-center">Points</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(row => { 
                        const savedItem = saved.get(row.id);
                        const pos = savedItem?.position || 0;
                        const score = savedItem?.score ?? '';
                        const house = state.festHouses.find(item => item.id === row.houseId); 
                        const houseColor = house?.color || '#3b82f6';
                        const calculatedPts = savedItem?.points ?? pointsFor(pos, row.isGroup, event.name);

                        // Highlight row styling for placed participants
                        const rowHighlight = pos === 1 ? 'table-warning border-start border-warning border-4' : 
                                            (pos === 2 ? 'table-secondary border-start border-secondary border-4' : 
                                            (pos === 3 ? 'table-danger-subtle border-start border-danger border-4' : 
                                            (pos === 4 ? 'table-info border-start border-info border-3' : '')));

                        return `
                            <tr class="result-row ${rowHighlight}" data-id="${row.id}" data-group="${row.isGroup}" data-special="${row.isSpecialHouse}" data-name="${row.name}" data-search="${(row.name + ' ' + row.details + ' ' + row.chestNo).toLowerCase()}">
                                <td class="text-center">
                                    <span class="badge ${row.chestNo === 'Group' || row.chestNo === 'House' ? 'bg-secondary-subtle text-secondary' : 'bg-light text-dark border'} font-monospace" style="font-size: 0.76rem;">
                                        ${row.chestNo}
                                    </span>
                                </td>
                                <td>
                                    <div class="d-flex align-items-center gap-1">
                                        <span class="rounded-circle d-inline-block shadow-xs flex-shrink-0" style="background-color: ${houseColor}; width: 10px; height: 10px;"></span>
                                        <strong class="${row.isGroup ? 'text-primary' : 'text-dark'}">${row.name}</strong>
                                    </div>
                                    <div class="small text-muted ms-3" style="font-size: 0.72rem;">${row.details}</div>
                                </td>
                                <td>
                                    <span class="badge border py-1 px-2 shadow-xs" style="background: #fff; color: ${houseColor}; border-color:${houseColor} !important;">
                                        ${house?.name || 'N/A'}
                                    </span>
                                </td>
                                <td>
                                    <input type="number" step="0.1" min="0" max="1000" class="form-control form-control-sm result-score-input" placeholder="Marks" value="${score}">
                                </td>
                                <td>
                                    <select class="form-select form-select-sm result-position">
                                        <option value="0">Not placed</option>
                                        <option value="1" ${pos === 1 ? 'selected' : ''}>🥇 1st Place</option>
                                        <option value="2" ${pos === 2 ? 'selected' : ''}>🥈 2nd Place</option>
                                        <option value="3" ${pos === 3 ? 'selected' : ''}>🥉 3rd Place</option>
                                        <option value="4" ${pos === 4 ? 'selected' : ''}>4th Place</option>
                                    </select>
                                </td>
                                <td class="result-points text-center font-monospace fw-bold fs-6 ${pos > 0 ? 'text-success' : 'text-muted'}">
                                    ${calculatedPts}
                                </td>
                            </tr>
                        `; 
                    }).join('') || '<tr><td colspan="6" class="text-center text-muted p-4">No participants found.</td></tr>'}
                </tbody>
            </table>
        </div>
        <div class="d-flex justify-content-between align-items-center small text-muted mt-2">
            <span>Points rule: <strong>${event.name}</strong> receives ${pointsFor(1, event.isGroupEvent, event.name)} / ${pointsFor(2, event.isGroupEvent, event.name)} / ${pointsFor(3, event.isGroupEvent, event.name)}${pointsFor(4, event.isGroupEvent, event.name) ? ` / ${pointsFor(4, event.isGroupEvent, event.name)}` : ''} pts.</span>
            <span>Ties receive equal points automatically.</span>
        </div>
    `;

    document.getElementById('result-entry-status').textContent = existing ? 'Existing result loaded' : 'New result';
    
    attachRowScoringEvents(event);

    document.getElementById('admin-auto-rank-btn')?.addEventListener('click', () => autoRankByMarks(event));
    document.getElementById('admin-result-search')?.addEventListener('input', filterResultRows);
    document.getElementById('admin-result-save')?.addEventListener('click', () => saveAdminResults(fest, event, existing));
}

// Live position and point updates + row color highlights
function attachRowScoringEvents(event) {
    document.querySelectorAll('#admin-result-grid tbody tr').forEach(row => {
        const posSelect = row.querySelector('.result-position');
        const pointsCell = row.querySelector('.result-points');
        const scoreInput = row.querySelector('.result-score-input');

        // 1. Manual Position Dropdown Change
        posSelect?.addEventListener('change', e => {
            const pos = Number(e.target.value);
            const isGroup = row.dataset.group === 'true';
            const pts = pointsFor(pos, isGroup, event.name);

            pointsCell.textContent = pts;
            pointsCell.className = `result-points text-center font-monospace fw-bold fs-6 ${pos > 0 ? 'text-success' : 'text-muted'}`;

            // Update row color highlights
            row.className = `result-row ${pos === 1 ? 'table-warning border-start border-warning border-4' : 
                            (pos === 2 ? 'table-secondary border-start border-secondary border-4' : 
                            (pos === 3 ? 'table-danger-subtle border-start border-danger border-4' : 
                            (pos === 4 ? 'table-info border-start border-info border-3' : '')))}`;
        });

        // 2. Score blur triggers auto rank check
        scoreInput?.addEventListener('blur', () => {
            if (scoreInput.value.trim() !== '') {
                autoRankByMarks(event);
            }
        });
    });
}

// Auto-determine 1st, 2nd, 3rd, 4th positions based on entered marks
function autoRankByMarks(event) {
    const rows = Array.from(document.querySelectorAll('#admin-result-grid tbody tr'));
    const scoredRows = rows.map(r => ({
        row: r,
        score: parseFloat(r.querySelector('.result-score-input')?.value),
        isGroup: r.dataset.group === 'true'
    })).filter(item => !isNaN(item.score) && item.score > 0);

    if (!scoredRows.length) {
        return window.showAlert?.('Please enter scores before auto-ranking.', 'info');
    }

    // Sort scored items descending by score
    scoredRows.sort((a, b) => b.score - a.score);

    // Assign positions (supports ties)
    let currentPos = 1;
    scoredRows.forEach((item, index) => {
        if (index > 0 && item.score < scoredRows[index - 1].score) {
            currentPos = index + 1;
        }

        const effectivePos = currentPos <= 4 ? currentPos : 0;
        const posSelect = item.row.querySelector('.result-position');
        const pointsCell = item.row.querySelector('.result-points');

        if (posSelect) posSelect.value = effectivePos;

        const pts = pointsFor(effectivePos, item.isGroup, event.name);
        if (pointsCell) {
            pointsCell.textContent = pts;
            pointsCell.className = `result-points text-center font-monospace fw-bold fs-6 ${effectivePos > 0 ? 'text-success' : 'text-muted'}`;
        }

        // Apply visual highlights
        item.row.className = `result-row ${effectivePos === 1 ? 'table-warning border-start border-warning border-4' : 
                            (effectivePos === 2 ? 'table-secondary border-start border-secondary border-4' : 
                            (effectivePos === 3 ? 'table-danger-subtle border-start border-danger border-4' : 
                            (effectivePos === 4 ? 'table-info border-start border-info border-3' : '')))}`;
    });

    window.showAlert?.('Positions auto-assigned based on marks.', 'success');
}

function filterResultRows(event) {
    const query = event.target.value.toLowerCase();
    document.querySelectorAll('#admin-result-grid tbody tr').forEach(row => { 
        row.hidden = query && !row.dataset.search.includes(query); 
    });
}

async function saveAdminResults(fest, event, existing) {
    const rankedResults = [];
    document.querySelectorAll('#admin-result-grid tbody tr').forEach(row => { 
        const position = Number(row.querySelector('.result-position')?.value || 0); 
        const score = parseFloat(row.querySelector('.result-score-input')?.value) || null;
        if (!position) return; 

        const item = { 
            position, 
            score,
            points: pointsFor(position, row.dataset.group === 'true', event.name) 
        }; 

        if (row.dataset.group === 'true') {
            item.groupId = row.dataset.id;
        } else {
            item.studentId = row.dataset.id; 
        }

        rankedResults.push(item); 
    });

    if (!rankedResults.length) return window.showAlert('Assign at least one winning position.', 'warning');
    if (existing && !confirm('This event already has results saved. Overwrite with these updated results?')) return;

    try {
        const resultDocId = `${fest.id}_${event.id}`;
        const payload = { 
            id: resultDocId, 
            festId: fest.id, 
            eventId: event.id, 
            eventName: event.name,
            judgedBy: state.currentUser?.username || 'ADMIN', 
            judgeName: state.currentUser?.name || 'Administrator', 
            judgeSignature: 'Administrator', 
            marksUploaded: true, 
            enteredByAdmin: true, 
            judgedAt: new Date(), 
            results: rankedResults.sort((a, b) => a.position - b.position) 
        };

        await saveScopedDoc('festResults', resultDocId, payload);
        const stored = state.festResults.find(result => result.id === resultDocId);
        if (stored) Object.assign(stored, payload); 
        else state.festResults.push(payload);

        window.showAlert('Results and points saved successfully.', 'success');
        loadResultEvent(event.id);
    } catch (error) { 
        console.error(error); 
        window.showAlert('Failed to save results.', 'danger'); 
    }
}

// --- SCANNER MODAL INTEGRATION ---

async function ensureHtml5Qrcode() {
    if (window.Html5Qrcode) return true;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error('Failed to load scanner library.'));
        document.head.appendChild(script);
    });
}

function parseScannedEventId(text) {
    if (!text) return '';
    const clean = text.trim();
    if (clean.includes('?')) {
        const params = new URLSearchParams(clean.split('?')[1]);
        return params.get('event') || clean;
    }
    return clean;
}

async function openResultScannerModal() {
    try {
        await ensureHtml5Qrcode();
    } catch (err) {
        return window.showAlert('Camera scanner library could not be loaded.', 'danger');
    }

    const modalBody = `
        <div class="text-center p-2">
            <div id="result-scanner-reader" style="width: 100%; max-width: 360px; margin: 0 auto; overflow: hidden; border-radius: 8px; border: 2px dashed #198754; background: #000; min-height: 250px;"></div>
            <div class="small text-muted mt-2">
                <i class="fas fa-camera me-1"></i>Point camera at the <strong>Scorecard QR Code</strong>
            </div>
            <div id="result-scanner-status" class="alert alert-info py-1 px-2 mt-2 mb-0 small">
                Starting camera...
            </div>
        </div>
    `;

    const modalFooter = `
        <button class="btn btn-secondary btn-sm px-3" data-bs-dismiss="modal" id="btn-close-scanner">Cancel</button>
    `;

    const modal = window.showGlobalModal(`<i class="fas fa-qrcode me-2"></i>Scan Event for Results`, modalBody, modalFooter);

    const scanner = new Html5Qrcode("result-scanner-reader");
    const statusBox = document.getElementById('result-scanner-status');
    let hasScanned = false;

    const modalElement = document.querySelector('.modal.show');
    modalElement?.addEventListener('hidden.bs.modal', async () => {
        if (scanner.isScanning) {
            try {
                await scanner.stop();
                scanner.clear();
            } catch (e) {
                console.warn(e);
            }
        }
    }, { once: true });

    scanner.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
            if (!decodedText || hasScanned) return;
            hasScanned = true;

            const eventId = parseScannedEventId(decodedText);
            
            if (statusBox) {
                statusBox.className = "alert alert-success py-1 px-2 mt-2 mb-0 small";
                statusBox.innerHTML = `<i class="fas fa-check-circle me-1"></i>Found Event: <strong>${eventId}</strong>`;
            }

            try {
                await scanner.stop();
                scanner.clear();
            } catch (e) {
                console.warn(e);
            }

            modal?.hide();

            const catSelect = document.getElementById('admin-result-category');
            const evSelect = document.getElementById('admin-result-event');

            if (catSelect && evSelect) {
                catSelect.value = "ALL";
                catSelect.dispatchEvent(new Event('change'));

                const hasOption = Array.from(evSelect.options).some(o => o.value === eventId);
                if (!hasOption) {
                    const eventObj = state.festEvents.find(e => e.id === eventId);
                    const label = eventObj ? `${eventObj.name} (${eventObj.category})` : eventId;
                    evSelect.insertAdjacentHTML('beforeend', `<option value="${eventId}" selected>${label}</option>`);
                }

                evSelect.value = eventId;
                loadResultEvent(eventId);
                window.showAlert(`Loaded Event: ${eventId}`, 'success');
            }
        },
        () => {}
    ).then(() => {
        if (statusBox) {
            statusBox.innerHTML = `<i class="fas fa-video me-1"></i>Center the scorecard QR code inside the box.`;
        }
    }).catch(err => {
        console.error(err);
        if (statusBox) {
            statusBox.className = "alert alert-warning py-1 px-2 mt-2 mb-0 small";
            statusBox.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i>Camera permission blocked or unavailable.`;
        }
    });
}

// Global exposure
window.loadResultEvent = loadResultEvent;