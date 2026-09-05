// =========================================================================
// --- FEST JUDGE & QR SCORING MODULE (fest-judge.js) ---
// =========================================================================

import { 
    getScopedDoc,
    saveScopedDoc, 
    systemContext,
    db
} from "./firebase-config.js";

import { 
    doc, 
    getDoc, 
    getDocs, 
    collection, 
    query, 
    where, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Checks URL hash for '#fest-judge', validates target IDs and secret token,
 * fetches participants, and renders the direct scoring interface.
 */
window.checkForJudgingMode = async function() {
    if (!window.location.hash.startsWith('#fest-judge')) return false;

    const queryParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const yearId = queryParams.get('year') || systemContext.activeYearId;
    const festId = queryParams.get('fest');
    const eventId = queryParams.get('event');
    const secretCode = queryParams.get('code') || '';

    if (!yearId || !festId || !eventId) {
        document.body.innerHTML = `<div class="alert alert-danger m-5">Invalid QR scoring link parameters.</div>`;
        return true;
    }

    // Set scoped year context
    systemContext.activeYearId = yearId;
    localStorage.setItem('activeYearId', yearId);

    document.body.innerHTML = `
        <div class="vh-100 d-flex align-items-center justify-content-center">
            <div class="spinner-border text-primary"></div>
            <p class="ms-3 mb-0">Loading Judging Sheet...</p>
        </div>
    `;

    try {
        const festRef = doc(db, `academicYears/${yearId}/fests`, festId);
        const eventRef = doc(db, `academicYears/${yearId}/festEvents`, eventId);
        const housesRef = collection(db, `academicYears/${yearId}/festHouses`);
        const groupsRef = collection(db, `academicYears/${yearId}/festGroups`);
        const regQuery = query(
            collection(db, `academicYears/${yearId}/festRegistrations`), 
            where('festId', '==', festId), 
            where('events', 'array-contains', eventId)
        );

        const [festSnap, eventSnap, housesSnap, groupsSnap, regSnap] = await Promise.all([
            getDoc(festRef),
            getDoc(eventRef),
            getDocs(housesRef),
            getDocs(groupsRef),
            getDocs(regQuery)
        ]);

        if (!festSnap.exists() || !eventSnap.exists()) {
            document.body.innerHTML = `<div class="alert alert-danger m-5">Festival or event records not found.</div>`;
            return true;
        }

        const festData = { id: festSnap.id, ...festSnap.data() };
        const eventData = { id: eventSnap.id, ...eventSnap.data() };
        const houses = housesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const groups = groupsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const participants = regSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (eventData.cancelled === true) {
            document.body.innerHTML = `
                <div class="container py-5 text-center">
                    <div class="card shadow-sm border-0 mx-auto" style="max-width: 560px;">
                        <div class="card-body p-5">
                            <div class="text-secondary mb-3"><i class="fas fa-ban fa-3x"></i></div>
                            <h4 class="fw-bold">Programme Cancelled</h4>
                            <p class="text-muted mb-0">${eventData.name} is cancelled. Marks cannot be uploaded for this event.</p>
                        </div>
                    </div>
                </div>
            `;
            return true;
        }

        renderJudgingSheet(festData, eventData, participants, houses, groups, secretCode);
        return true;
    } catch (err) {
        console.error("Judging mode init error:", err);
        document.body.innerHTML = `<div class="alert alert-danger m-5">Failed to fetch judging sheet. Check connection.</div>`;
        return true;
    }
};

/**
 * Renders submitted standings or displays dynamic scoring table.
 */
async function renderJudgingSheet(fest, event, participants, houses, groups, presetCode = '') {
    const yearId = systemContext.activeYearId;
    const resultDocId = `${fest.id}_${event.id}`;
    
    // Check if event results are already finalized
    const resultSnap = await getDoc(doc(db, `academicYears/${yearId}/festResults`, resultDocId));

    if (event.cancelled === true) {
        document.body.innerHTML = `<div class="container py-5 text-center"><div class="alert alert-secondary"><i class="fas fa-ban me-2"></i><strong>${event.name}</strong> is cancelled. Marks cannot be uploaded.</div></div>`;
        return;
    }
    
    if (resultSnap.exists()) {
        const resultData = resultSnap.data();
        const finalResults = resultData.results || [];
        const uploadedAt = resultData.judgedAt?.toDate ? resultData.judgedAt.toDate().toLocaleString() : 'Recorded';
        document.body.innerHTML = `
            <div class="container py-5">
                <div class="card shadow-sm border-0 mx-auto" style="max-width: 600px;">
                    <div class="card-body p-4 text-center">
                        <div class="text-success mb-3"><i class="fas fa-check-circle fa-3x"></i></div>
                        <h4 class="fw-bold mb-1">Results Finalized</h4>
                        <p class="text-muted small">${event.name} (${fest.name})</p>
                        <div class="alert alert-success text-start py-2 mb-3">
                            <div class="fw-bold"><i class="fas fa-cloud-arrow-up me-1"></i>Marks Uploaded</div>
                            <div class="small">Judge: ${resultData.judgeName || 'Unknown'} (${resultData.judgedBy || 'N/A'})</div>
                            <div class="small">Signature: ${resultData.judgeSignature || resultData.judgeName || 'Recorded judge'}</div>
                            <div class="small text-muted">Uploaded: ${uploadedAt}</div>
                        </div>
                        <hr>
                        <div class="list-group list-group-flush text-start">
                            ${finalResults.map(r => {
                                const targetName = r.studentId 
                                    ? participants.find(p => p.studentId === r.studentId)?.studentName 
                                    : groups.find(g => g.id === r.groupId)?.name;
                                return `
                                    <div class="list-group-item d-flex justify-content-between align-items-center">
                                        <span><strong>Position ${r.position}:</strong> ${targetName || 'Participant'}</span>
                                        <span class="badge bg-primary rounded-pill">${r.points} pts</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    if (participants.length === 0) {
        document.body.innerHTML = `
            <div class="container py-5 text-center">
                <div class="alert alert-warning">No enrolled participants or groups found for ${event.name}.</div>
            </div>
        `;
        return;
    }

    let displayRows = [];
    if (event.isGroupEvent) {
        const participatingGroupIds = [...new Set(
            participants.map(p => groups.find(g => g.members?.some(m => m.studentId === p.studentId))?.id).filter(Boolean)
        )];
        displayRows = participatingGroupIds.map(id => groups.find(g => g.id === id)).filter(Boolean);
    } else {
        displayRows = participants.sort((a, b) => 
            (a.chestNo || a.studentName).toString().localeCompare((b.chestNo || b.studentName).toString(), undefined, { numeric: true })
        );
    }

    const posOptions = `
        <option value="0">-- Assign Rank --</option>
        <option value="1">1st Place</option>
        <option value="2">2nd Place</option>
        <option value="3">3rd Place</option>
    `;

    document.body.innerHTML = `
        <div class="container py-4" style="max-width: 850px;">
            <div class="card shadow-sm border-0 mb-3">
                <div class="card-body p-3 text-center">
                    <h4 class="fw-bold mb-0">${event.name}</h4>
                    <p class="text-muted small mb-0">${fest.name} &bull; Category: ${event.category} (${event.type})</p>
                </div>
            </div>

            <div class="card shadow-sm border-0 mb-4">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0" id="judging-table">
                        <thead class="table-light">
                            <tr>
                                <th>Participant / Chest No</th>
                                <th>House</th>
                                <th style="width: 180px;">Standing</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${displayRows.map(row => {
                                const isGroup = event.isGroupEvent;
                                const participantId = isGroup ? row.id : row.studentId;
                                const name = isGroup ? row.name : row.studentName;
                                const house = houses.find(h => h.id === row.houseId);
                                const extra = isGroup ? `Group (${row.members?.length || 0} members)` : `Chest: <strong>${row.chestNo || 'N/A'}</strong>`;

                                return `
                                    <tr data-id="${participantId}" data-is-group="${isGroup}">
                                        <td>
                                            <div class="fw-bold text-dark">${name}</div>
                                            <div class="small text-muted">${extra}</div>
                                        </td>
                                        <td>
                                            <span class="color-dot-display" style="background-color: ${house?.color || '#6c757d'};"></span>
                                            ${house?.name || 'N/A'}
                                        </td>
                                        <td>
                                            <select class="form-select form-select-sm rank-select">${posOptions}</select>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card shadow-sm border-0 p-3">
                <div class="row g-2 align-items-center justify-content-end">
                    <div class="col-auto">
                        <span class="badge bg-warning text-dark"><i class="fas fa-cloud-arrow-up me-1"></i>Marks not uploaded</span>
                    </div>
                    <div class="col-auto">
                        <label class="small fw-bold">Judge Security Code:</label>
                    </div>
                    <div class="col-auto">
                        <input type="password" id="judge-secret-entry" class="form-control form-control-sm text-center" 
                               style="width: 140px;" placeholder="Code" value="${presetCode}">
                    </div>
                    <div class="col-auto">
                        <button id="commit-scores-btn" class="btn btn-success btn-sm fw-bold">
                            <i class="fas fa-check-double me-1"></i>Finalize Results
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('commit-scores-btn').addEventListener('click', () => {
        commitJudgingResults(fest, event, participants, houses, groups);
    });
}

/**
 * Validates ranks, checks duplicate awards, checks judge access code,
 * and saves rankings with calculated points to festResults.
 */
async function commitJudgingResults(fest, event, participants, houses, groups) {
    const inputCode = document.getElementById('judge-secret-entry').value.trim().toUpperCase();
    const authorized = (fest.judgeCodes || []).find(j => j.code === inputCode);

    if (!authorized) {
        return window.showAlert('Invalid Judge Security Code.', 'danger');
    }

    const assignedRanks = new Set();
    const rankedResults = [];
    let duplicateDetected = false;

    document.querySelectorAll('#judging-table tbody tr').forEach(tr => {
        const position = parseInt(tr.querySelector('.rank-select').value, 10);
        if (position > 0) {
            if (assignedRanks.has(position)) {
                duplicateDetected = true;
            }
            assignedRanks.add(position);

            const isGroup = tr.dataset.isGroup === 'true';
            const id = tr.dataset.id;

            // Base point weighting: Group (1st: 10, 2nd: 5, 3rd: 3) | Solo (1st: 5, 2nd: 3, 3rd: 1)
            let points = 0;
            if (isGroup) {
                points = position === 1 ? 10 : position === 2 ? 5 : 3;
            } else {
                points = position === 1 ? 5 : position === 2 ? 3 : 1;
            }

            const item = { position, points };
            if (isGroup) item.groupId = id;
            else item.studentId = id;

            rankedResults.push(item);
        }
    });

    if (duplicateDetected) {
        return window.showAlert('Positions must be unique. Multiple identical ranks detected.', 'danger');
    }
    if (rankedResults.length === 0) {
        return window.showAlert('Assign at least one position (1st, 2nd, or 3rd) before submitting.', 'warning');
    }
    if (!confirm('Finalize and lock these results? Once submitted, they cannot be modified.')) {
        return;
    }

    const resultDocId = `${fest.id}_${event.id}`;
    const payload = {
        id: resultDocId,
        festId: fest.id,
        eventId: event.id,
        judgedBy: authorized.code,
        judgeName: authorized.name,
        judgeSignature: authorized.name,
        marksUploaded: true,
        judgedAt: serverTimestamp(),
        results: rankedResults.sort((a, b) => a.position - b.position)
    };

    try {
        await saveScopedDoc('festResults', resultDocId, payload);
        window.showAlert('Event results committed successfully!', 'success');
        renderJudgingSheet(fest, event, participants, houses, groups, inputCode);
    } catch (err) {
        console.error("Save scores error:", err);
        window.showAlert('Failed to commit scores.', 'danger');
    }
}
