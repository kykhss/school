// =========================================================================
// --- FEST JUDGE & INLINE QR SCORING MODULE (fest-judge.js) ---
// =========================================================================

import { 
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
    setDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let activeInlineScanner = null;

/**
 * Halts any active camera stream and cleans up the viewport element.
 */
async function stopInlineScanner() {
    if (activeInlineScanner && activeInlineScanner.isScanning) {
        try {
            await activeInlineScanner.stop();
            activeInlineScanner.clear();
        } catch (e) {
            console.warn("[JUDGE-SCANNER] Error stopping camera stream:", e);
        }
        activeInlineScanner = null;
    }
}

/**
 * Ensures html5-qrcode is present before initializing camera.
 */
async function ensureQrScannerLibrary() {
    if (window.Html5Qrcode) return true;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error('Failed to load html5-qrcode library.'));
        document.head.appendChild(script);
    });
}

/**
 * Extracts pure event ID or short token from URLs or raw strings.
 */
function extractEventOrToken(text) {
    if (!text) return { type: 'event', value: '' };
    const clean = text.trim();

    if (clean.includes('#j/')) {
        const raw = clean.split('#j/')[1].trim();
        const parts = raw.split('/').filter(Boolean);
        // If #j/yearId/token return the token (last segment)
        const token = parts[parts.length - 1].toUpperCase();
        return { type: 'token', value: token };
    }

    if (clean.includes('?')) {
        const queryString = clean.split('?')[1];
        const params = new URLSearchParams(queryString);
        const eventId = params.get('event');
        if (eventId) return { type: 'event', value: eventId };
    }

    if (clean.length <= 6 && !clean.toUpperCase().startsWith('EVT_')) {
        return { type: 'token', value: clean.toUpperCase() };
    }

    return { type: 'event', value: clean };
}

/**
 * Resolves a short 3-4 letter token from Firestore `festTokens`.
 */
async function resolveShortToken(token, yearId) {
    try {
        const tokenRef = doc(db, `academicYears/${yearId}/festTokens`, token.toUpperCase());
        const snap = await getDoc(tokenRef);
        if (snap.exists()) {
            return snap.data();
        }
    } catch (e) {
        console.error("[JUDGE-SCANNER] Token lookup error:", e);
    }
    return null;
}

/**
 * Common handler when a QR is scanned or an ID/Token is manually typed.
 */
async function handleScanOrManualInput(rawInput, festId, yearId, secretCode = '') {
    const parsed = extractEventOrToken(rawInput);
    if (!parsed.value) return;

    await stopInlineScanner();

    let targetEventId = parsed.value;
    let targetFestId = festId;
    let targetYearId = yearId;
    let targetCode = secretCode;

    if (parsed.type === 'token') {
        const tokenData = await resolveShortToken(parsed.value, yearId);
        if (!tokenData) {
            window.showAlert?.(`Invalid or expired token code: ${parsed.value}`, 'danger');
            return;
        }
        targetEventId = tokenData.eventId;
        targetFestId = tokenData.festId || festId;
        targetYearId = tokenData.yearId || yearId;
        targetCode = tokenData.judgeCode || secretCode;
    }

    const codeParam = targetCode ? `&code=${encodeURIComponent(targetCode)}` : '';
    window.location.hash = `#fest-judge?year=${targetYearId}&fest=${encodeURIComponent(targetFestId)}&event=${encodeURIComponent(targetEventId)}${codeParam}`;

    await window.checkForJudgingMode();
}

/**
 * Main Controller for #fest-judge route.
 */
/**
 * Main Controller for #fest-judge route.
 */
/**
 * Main Controller for #fest-judge route.
 */
window.checkForJudgingMode = async function() {
    const hash = window.location.hash;
    if (!hash.startsWith('#fest-judge')) return false;

    await stopInlineScanner();

    const queryString = hash.includes('?') 
        ? hash.split('?')[1] 
        : (hash.includes('&') ? hash.substring(hash.indexOf('&') + 1) : '');
        
    const params = new URLSearchParams(queryString);
    const eventId = params.get('event') || '';
    const festId = params.get('fest') || (typeof state !== 'undefined' ? state.managingFest?.id : '') || '';
    const yearId = params.get('year') || systemContext?.activeYearId || localStorage.getItem('activeYearId') || '';
    const secretCode = params.get('code') || '';
    const judgeName = params.get('judgeName') || '';

    if (!festId || !yearId) {
        document.body.innerHTML = `
            <div class="container py-5 text-center" style="max-width: 480px;">
                <div class="alert alert-danger py-4 shadow-sm border-0">
                    <i class="fas fa-exclamation-triangle fa-2x mb-2 text-danger"></i>
                    <h5 class="fw-bold">Missing Portal Parameters</h5>
                    <p class="small text-muted mb-0">Academic Year or Festival ID not specified in link.</p>
                </div>
            </div>
        `;
        return true;
    }

    if (systemContext) systemContext.activeYearId = yearId;
    localStorage.setItem('activeYearId', yearId);

    // Fallback: Missing Event ID -> Open Scanner View
    if (!eventId) {
        return true;
    }

    // Loading State
    document.body.innerHTML = `
        <div class="vh-100 d-flex flex-column align-items-center justify-content-center">
            <div class="spinner-border text-primary mb-3" role="status"></div>
            <p class="text-muted fw-semibold">Loading Judging Sheet...</p>
        </div>
    `;

    try {
        const festRef = doc(db, `academicYears/${yearId}/fests`, festId);
        const eventRef = doc(db, `academicYears/${yearId}/festEvents`, eventId);
        const housesRef = collection(db, `academicYears/${yearId}/festHouses`);
        
        // Query ONLY groups registered specifically for this event
        const groupsQuery = query(
            collection(db, `academicYears/${yearId}/festGroups`),
            where('festId', '==', festId),
            where('eventId', '==', eventId)
        );

        // Query solo registrations for this event
        const regQuery = query(
            collection(db, `academicYears/${yearId}/festRegistrations`), 
            where('festId', '==', festId), 
            where('events', 'array-contains', eventId)
        );

        const [festSnap, eventSnap, housesSnap, groupsSnap, regSnap] = await Promise.all([
            getDoc(festRef),
            getDoc(eventRef),
            getDocs(housesRef),
            getDocs(groupsQuery),
            getDocs(regQuery)
        ]);

        if (!festSnap.exists() || !eventSnap.exists()) {
            document.body.innerHTML = `
                <div class="container py-5 text-center" style="max-width: 480px;">
                    <div class="alert alert-danger py-4 shadow-sm border-0">
                        <i class="fas fa-triangle-exclamation fa-2x mb-2 text-danger"></i>
                        <h6 class="fw-bold">Event Not Found</h6>
                        <p class="small mb-3">No event record matches the ID <code>${eventId}</code>.</p>
                        <a href="#fest-judge?year=${yearId}&fest=${festId}" class="btn btn-outline-danger btn-sm" onclick="location.reload();">Scan Another Event</a>
                    </div>
                </div>
            `;
            return true;
        }

        const festData = { id: festSnap.id, ...festSnap.data() };
        const eventData = { id: eventSnap.id, ...eventSnap.data() };
        const houses = housesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const groups = groupsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(g => !g.isDeleted);
        const participants = regSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => !r.isDeleted);

        await renderJudgingSheet(festData, eventData, participants, houses, groups, secretCode, judgeName);
        return true;

    } catch (err) {
        console.error("[JUDGING-MODE] Initialization error:", err);
        return true;
    }
};

/**
 * Renders submitted standings or displays the active scoring table.
 */
async function renderJudgingSheet(fest, event, participants, houses, groups, presetCode = '', presetJudgeName = '') {
    const yearId = systemContext.activeYearId;
    const resultDocId = `${fest.id}_${event.id}`;
    
    const resultSnap = await getDoc(doc(db, `academicYears/${yearId}/festResults`, resultDocId));

    // 1. If result has already been finalized
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
                            <div class="small">Judge: <strong>${resultData.judgeName || 'Recorded Judge'}</strong> (${resultData.judgedBy || 'N/A'})</div>
                            <div class="small">Signature: ${resultData.judgeSignature || resultData.judgeName || 'Signed'}</div>
                            <div class="small text-muted">Uploaded: ${uploadedAt}</div>
                        </div>
                        <hr>
                        <div class="list-group list-group-flush text-start mb-3">
                            ${finalResults.map(r => {
                                const targetName = r.studentId 
                                    ? participants.find(p => p.studentId === r.studentId)?.studentName 
                                    : groups.find(g => g.id === r.groupId)?.name;
                                return `
                                    <div class="list-group-item d-flex justify-content-between align-items-center">
                                        <span><strong>Position ${r.position}:</strong>${targetName || 'Participant'}</span>
                                        <span class="badge bg-primary rounded-pill">${r.points} pts</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <a href="#fest-judge?year=${yearId}&fest=${fest.id}" class="btn btn-outline-primary btn-sm">
                            <i class="fas fa-qrcode me-1"></i>Scan Next Event
                        </a>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // 2. Identify Special House Programs (March Past, Discipline, etc.)
    const eventNameUpper = String(event.name || '').trim().toUpperCase();
    const isSpecialEvent = event.isSpecial || 
                           eventNameUpper.includes("MARCH PAST") || 
                           eventNameUpper.includes("DISCIPLINE") || 
                           eventNameUpper.includes("DECORATION");

    let displayRows = [];

    if (isSpecialEvent) {
        // Special events load all houses as squads
        displayRows = houses.map(h => ({
            id: `SPECIAL_${fest.id}_${h.id}_${event.id}`,
            isGroup: true,
            name: `${h.name} Squad`,
            details: `House Program / Special Event`,
            houseId: h.id,
            chestNo: h.id.slice(0, 2).toUpperCase()
        }));
    } else if (event.isGroupEvent || event.type === 'group') {
        // STRICT FILTER: Only groups belonging directly to THIS event.id
        const eventGroups = (groups || []).filter(g => g.eventId === event.id);

        displayRows = eventGroups.map(g => {
            const captain = g.members?.find(m => m.role === 'Captain' || m.isCaptain);
            const student = state?.students?.find(s => s.id === captain?.studentId);
            const captainName = student?.name || 'Unassigned';

            return {
                id: g.id,
                isGroup: true,
                name: g.name,
                details: `Captain: ${captainName} &bull; ${g.members?.length || 0} members`,
                houseId: g.houseId,
                chestNo: g.chestNo || g.code || '-'
            };
        });
    } else {
        // Solo events: Only participants with this event in their events array
        displayRows = participants.map(p => ({
            id: p.studentId,
            isGroup: false,
            name: p.studentName || 'Student',
            details: `Adm: ${(state?.students?.find(s => s.id === p.studentId)?.admissionNumber) || 'N/A'}`,
            houseId: p.houseId,
            chestNo: p.chestNo || 'N/A'
        }));
    }

    if (displayRows.length === 0) {
        document.body.innerHTML = `
            <div class="container py-5 text-center">
                <div class="card shadow-sm border-0 mx-auto" style="max-width: 500px;">
                    <div class="card-body p-4">
                        <div class="alert alert-warning mb-3">No enrolled participants or teams found specifically for ${event.name}.</div>
                        <a href="#fest-judge?year=${yearId}&fest=${fest.id}" class="btn btn-primary btn-sm">
                            <i class="fas fa-arrow-left me-1"></i>Scan Another Event
                        </a>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // Alphabetical Sort by Name
    displayRows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    const posOptions = `
        <option value="0">-- Assign Rank --</option>
        <option value="1">🥇 1st Place</option>
        <option value="2">🥈 2nd Place</option>
        <option value="3">🥉 3rd Place</option>
        <option value="4">4th Place</option>
    `;

    const matchedJudge = (fest.judgeCodes || []).find(j => j.code === presetCode);
    const displayJudgeName = presetJudgeName || matchedJudge?.name || '';

    document.body.innerHTML = `
        <div class="container py-4" style="max-width: 850px;">
            <div class="card shadow-sm border-0 mb-3">
                <div class="card-body p-3 d-flex justify-content-between align-items-center">
                    <div>
                        <h4 class="fw-bold mb-0 text-dark">${event.name}</h4>
                        <p class="text-muted small mb-0">
                            ${fest.name} &bull; Category: <strong>${event.category || 'General'}</strong> &bull; Stage: <strong>${event.stage || 'Main Stage'}</strong> &bull; Mode: <strong>${event.isGroupEvent ? 'Group' : 'Solo'}</strong>
                        </p>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        ${displayJudgeName ? `
                            <span class="badge bg-primary-subtle text-primary border border-primary-subtle py-2 px-2" style="font-size: 0.78rem;">
                                <i class="fas fa-user-tie me-1"></i>${displayJudgeName}
                            </span>
                        ` : ''}
                        <a href="#fest-judge?year=${yearId}&fest=${fest.id}" class="btn btn-outline-secondary btn-sm" title="Scan Another Event">
                            <i class="fas fa-camera me-1"></i>New Scan
                        </a>
                    </div>
                </div>
            </div>

            <div class="card shadow-sm border-0 mb-4">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0" id="judging-table">
                        <thead class="table-light">
                            <tr>
                                <th style="width: 15%; text-align: center;">${event.isGroupEvent ? 'Code' : 'Chest No'}</th>
                                <th style="width: 40%;">${event.isGroupEvent ? 'Group Team' : 'Participant Name'}</th>
                                <th style="width: 20%;">House</th>
                                <th style="width: 25%; min-width: 150px;">Rank Standing</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${displayRows.map(row => {
                                const house = houses.find(h => h.id === row.houseId);
                                const houseColor = house?.color || '#3b82f6';

                                return `
                                    <tr data-id="${row.id}" data-is-group="${row.isGroup}" data-name="${row.name}">
                                        <td class="text-center">
                                            <span class="badge ${row.isGroup ? 'bg-secondary-subtle text-secondary' : 'bg-light text-dark border'} font-monospace" style="font-size: 0.78rem;">
                                                ${row.chestNo}
                                            </span>
                                        </td>
                                        <td>
                                            <div class="fw-bold text-dark">${row.name}</div>
                                            <div class="small text-muted" style="font-size: 0.74rem;">${row.details}</div>
                                        </td>
                                        <td>
                                            <span class="badge border py-1 px-2 shadow-xs" style="background: #fff; color: ${houseColor}; border-color:${houseColor} !important;">
                                                ${house?.name || 'N/A'}
                                            </span>
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

            <!-- Submission Footer Bar -->
            <div class="card shadow-sm border-0 p-3 bg-light">
                <div class="row g-2 align-items-center justify-content-between">
                    <div class="col-12 col-md-auto">
                        <span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i>Pending Submission</span>
                    </div>
                    
                    <div class="col-12 col-md-auto ms-auto d-flex flex-wrap align-items-center gap-2">
                        <input type="text" id="judge-name-entry" class="form-control form-control-sm" 
                               style="max-width: 170px;" placeholder="Judge Name" value="${displayJudgeName}">
                        
                        <input type="password" id="judge-secret-entry" class="form-control form-control-sm text-center font-monospace" 
                               style="max-width: 110px;" placeholder="Security Code" value="${presetCode}">
                        
                        <button id="commit-scores-btn" class="btn btn-success btn-sm fw-bold px-3">
                            <i class="fas fa-check-double me-1"></i>Finalize Results
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('commit-scores-btn')?.addEventListener('click', () => {
        commitJudgingResults(fest, event, participants, houses, groups);
    });
}

/**
 * Renders submitted standings or displays the active scoring table.
 */
async function renderJudgingSheet(fest, event, participants, houses, groups, presetCode = '', presetJudgeName = '') {
    const yearId = systemContext.activeYearId;
    const resultDocId = `${fest.id}_${event.id}`;
    
    const resultSnap = await getDoc(doc(db, `academicYears/${yearId}/festResults`, resultDocId));

    // 1. If result has already been finalized
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
                            <div class="small">Judge: <strong>${resultData.judgeName || 'Recorded Judge'}</strong> (${resultData.judgedBy || 'N/A'})</div>
                            <div class="small">Signature: ${resultData.judgeSignature || resultData.judgeName || 'Signed'}</div>
                            <div class="small text-muted">Uploaded: ${uploadedAt}</div>
                        </div>
                        <hr>
                        <div class="list-group list-group-flush text-start mb-3">
                            ${finalResults.map(r => {
                                const targetName = r.studentId 
                                    ? participants.find(p => p.studentId === r.studentId)?.studentName 
                                    : groups.find(g => g.id === r.groupId)?.name;
                                return `
                                    <div class="list-group-item d-flex justify-content-between align-items-center">
                                        <span><strong>Position ${r.position}:</strong>${targetName || 'Participant'}</span>
                                        <span class="badge bg-primary rounded-pill">${r.points} pts</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <a href="#fest-judge?year=${yearId}&fest=${fest.id}" class="btn btn-outline-primary btn-sm">
                            <i class="fas fa-qrcode me-1"></i>Scan Next Event
                        </a>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // 2. Identify Special House Programs (March Past, Discipline, etc.)
    const eventNameUpper = String(event.name || '').trim().toUpperCase();
    const isSpecialEvent = event.isSpecial || 
                           eventNameUpper.includes("MARCH PAST") || 
                           eventNameUpper.includes("DISCIPLINE") || 
                           eventNameUpper.includes("DECORATION");

    let displayRows = [];

    if (isSpecialEvent) {
        // Special events load all houses as participating squads
        displayRows = houses.map(h => ({
            id: `SPECIAL_${fest.id}_${h.id}_${event.id}`,
            isGroup: true,
            name: `${h.name} Squad`,
            details: `House Program / Special Event`,
            houseId: h.id,
            chestNo: 'House'
        }));
    } else if (event.isGroupEvent || event.type === 'group') {
        const participatingGroupIds = [...new Set(
            participants.map(p => groups.find(g => g.members?.some(m => m.studentId === p.studentId))?.id).filter(Boolean)
        )];
        displayRows = participatingGroupIds.map(id => {
            const grp = groups.find(g => g.id === id);
            return grp ? {
                id: grp.id,
                isGroup: true,
                name: grp.name,
                details: `Group (${grp.members?.length || 0} members)`,
                houseId: grp.houseId,
                chestNo: grp.chestNo || grp.code || 'Group'
            } : null;
        }).filter(Boolean);
    } else {
        displayRows = participants.map(p => ({
            id: p.studentId,
            isGroup: false,
            name: p.studentName || 'Student',
            details: `Chest: <strong>${p.chestNo || 'N/A'}</strong>`,
            houseId: p.houseId,
            chestNo: p.chestNo || 'N/A'
        }));
    }

    if (displayRows.length === 0) {
        document.body.innerHTML = `
            <div class="container py-5 text-center">
                <div class="card shadow-sm border-0 mx-auto" style="max-width: 500px;">
                    <div class="card-body p-4">
                        <div class="alert alert-warning mb-3">No enrolled participants or groups found for ${event.name}.</div>
                        <a href="#fest-judge?year=${yearId}&fest=${fest.id}" class="btn btn-primary btn-sm">
                            <i class="fas fa-arrow-left me-1"></i>Scan Another Event
                        </a>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // 3. Alphabetical Sort by Name
    displayRows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    const posOptions = `
        <option value="0">-- Assign Rank --</option>
        <option value="1">🥇 1st Place</option>
        <option value="2">🥈 2nd Place</option>
        <option value="3">🥉 3rd Place</option>
        <option value="4">4th Place</option>
    `;

    // Resolve judge name from parameters or matching judge code
    const matchedJudge = (fest.judgeCodes || []).find(j => j.code === presetCode);
    const displayJudgeName = presetJudgeName || matchedJudge?.name || '';

    document.body.innerHTML = `
        <div class="container py-4" style="max-width: 850px;">
            <div class="card shadow-sm border-0 mb-3">
                <div class="card-body p-3 d-flex justify-content-between align-items-center">
                    <div>
                        <h4 class="fw-bold mb-0 text-dark">${event.name}</h4>
                        <p class="text-muted small mb-0">
                            ${fest.name} &bull; Category: <strong>${event.category || 'General'}</strong> &bull; Stage: <strong>${event.stage || 'Main Stage'}</strong>
                        </p>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        ${displayJudgeName ? `
                            <span class="badge bg-primary-subtle text-primary border border-primary-subtle py-2 px-2" style="font-size: 0.78rem;">
                                <i class="fas fa-user-tie me-1"></i>${displayJudgeName}
                            </span>
                        ` : ''}
                        <a href="#fest-judge?year=${yearId}&fest=${fest.id}" class="btn btn-outline-secondary btn-sm" title="Scan Another Event">
                            <i class="fas fa-camera me-1"></i>New Scan
                        </a>
                    </div>
                </div>
            </div>

            <div class="card shadow-sm border-0 mb-4">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0" id="judging-table">
                        <thead class="table-light">
                            <tr>
                                <th style="width: 15%; text-align: center;">Chest / Code</th>
                                <th style="width: 40%;">Participant / Team Name</th>
                                <th style="width: 20%;">House</th>
                                <th style="width: 25%; min-width: 150px;">Rank Standing</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${displayRows.map(row => {
                                const house = houses.find(h => h.id === row.houseId);
                                const houseColor = house?.color || '#3b82f6';

                                return `
                                    <tr data-id="${row.id}" data-is-group="${row.isGroup}" data-name="${row.name}">
                                        <td class="text-center">
                                            <span class="badge ${row.isGroup ? 'bg-secondary-subtle text-secondary' : 'bg-light text-dark border'} font-monospace" style="font-size: 0.78rem;">
                                                ${row.chestNo}
                                            </span>
                                        </td>
                                        <td>
                                            <div class="fw-bold text-dark">${row.name}</div>
                                            <div class="small text-muted" style="font-size: 0.74rem;">${row.details}</div>
                                        </td>
                                        <td>
                                            <span class="badge border py-1 px-2 shadow-xs" style="background: #fff; color: ${houseColor}; border-color:${houseColor} !important;">
                                                ${house?.name || 'N/A'}
                                            </span>
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

            <!-- Submission Footer Bar -->
            <div class="card shadow-sm border-0 p-3 bg-light">
                <div class="row g-2 align-items-center justify-content-between">
                    <div class="col-12 col-md-auto">
                        <span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i>Pending Submission</span>
                    </div>
                    
                    <div class="col-12 col-md-auto ms-auto d-flex flex-wrap align-items-center gap-2">
                        <input type="text" id="judge-name-entry" class="form-control form-control-sm" 
                               style="max-width: 170px;" placeholder="Judge Name" value="${displayJudgeName}">
                        
                        <input type="password" id="judge-secret-entry" class="form-control form-control-sm text-center font-monospace" 
                               style="max-width: 110px;" placeholder="Security Code" value="${presetCode}">
                        
                        <button id="commit-scores-btn" class="btn btn-success btn-sm fw-bold px-3">
                            <i class="fas fa-check-double me-1"></i>Finalize Results
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('commit-scores-btn')?.addEventListener('click', () => {
        commitJudgingResults(fest, event, participants, houses, groups);
    });
}
/**
 * Validates ranks, authenticates security code, and writes score records to Firestore.
 */
// Centralized Point Allocation Helper
function calculateEventPoints(position, isGroup, eventName = '') {
    const cleanName = String(eventName || '').trim().toUpperCase();
    const isMarchPast = cleanName === 'MARCH PAST';
    const isDiscipline = cleanName.includes('DISCIPLINE');

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

    // 3. Group Events (15 / 10 / 5 / 0)
    if (isGroup) {
        if (position === 1) return 15;
        if (position === 2) return 10;
        if (position === 3) return 5;
        if (position === 4) return 0;
        return 0;
    }

    // 4. Solo Events (5 / 3 / 1 / 0)
    if (position === 1) return 5;
    if (position === 2) return 3;
    if (position === 3) return 1;
    if (position === 4) return 0;

    return 0;
}

let isCommittingJudgedResults = false;

async function commitJudgingResults(fest, event, participants, houses, groups) {
    if (isCommittingJudgedResults) return; // Prevent double-click execution

    const inputCode = (document.getElementById('judge-secret-entry')?.value || '').trim().toUpperCase();
    const inputJudgeName = (document.getElementById('judge-name-entry')?.value || '').trim();
    const commitBtn = document.getElementById('commit-scores-btn');

    // Authenticate code against configured festival judges
    const authorized = (fest.judgeCodes || []).find(j => j.code === inputCode);
    if (!authorized) {
        return window.showAlert('Invalid Judge Security Code.', 'danger');
    }

    const finalJudgeName = inputJudgeName || authorized.name || 'Judge';
    const rankedResults = [];

    document.querySelectorAll('#judging-table tbody tr').forEach(tr => {
        const position = parseInt(tr.querySelector('.rank-select')?.value, 10);
        if (position > 0) {
            const isGroup = tr.dataset.isGroup === 'true';
            const id = tr.dataset.id;
            const points = calculateEventPoints(position, isGroup, event.name);

            const item = { position, points };
            if (isGroup) {
                item.groupId = id;
            } else {
                item.studentId = id;
            }

            rankedResults.push(item);
        }
    });

    if (rankedResults.length === 0) {
        return window.showAlert('Assign at least one position before submitting.', 'warning');
    }

    if (!confirm('Finalize and lock these results? Once submitted, they cannot be modified.')) {
        return;
    }

    // Activate button lock & spinner
    isCommittingJudgedResults = true;
    if (commitBtn) {
        commitBtn.disabled = true;
        commitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving...`;
    }

    const resultDocId = `${fest.id}_${event.id}`;
    const payload = {
        id: resultDocId,
        festId: fest.id,
        eventId: event.id,
        eventName: event.name,
        judgedBy: authorized.code,
        judgeName: finalJudgeName,
        judgeSignature: finalJudgeName,
        marksUploaded: true,
        judgedAt: serverTimestamp(),
        results: rankedResults.sort((a, b) => a.position - b.position)
    };

    try {
        const yearId = systemContext.activeYearId;
        await setDoc(doc(db, `academicYears/${yearId}/festResults`, resultDocId), payload, { merge: true });

        window.showAlert('Event results committed successfully!', 'success');
        await renderJudgingSheet(fest, event, participants, houses, groups, inputCode, finalJudgeName);
    } catch (err) {
        console.error("Save scores error:", err);
        window.showAlert('Failed to commit scores.', 'danger');
        if (commitBtn) {
            commitBtn.disabled = false;
            commitBtn.innerHTML = `<i class="fas fa-check-double me-1"></i>Finalize Results`;
        }
    } finally {
        isCommittingJudgedResults = false;
    }
}
