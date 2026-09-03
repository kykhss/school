// =========================================================================
// --- FEST REPORTS & TABULATION MODULE (fest-reports.js) ---
// =========================================================================

import { systemContext } from "./firebase-config.js";
import { 
    state, 
    getStudentClassName, 
    getStudentCategory 
} from "./app-state.js";

// --- 1. REPORTS TAB RENDERER ---

window.renderFestReportsTab = function() {
    const container = document.getElementById('tab-reports') || document.getElementById('fest-reports');
    if (!container || !state.managingFest) return;

    const fest = state.managingFest;
    const categories = ['General', ...(fest.settings?.categories?.map(c => c.name) || [])];
    const houses = state.festHouses;
    const events = state.festEvents.filter(e => e.festId === fest.id);
    const stages = fest.stages?.length ? fest.stages : ['Main Stage'];

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
                <h5 class="section-header mb-0"><i class="fas fa-print me-2 text-primary"></i>Printable Reports & Standings</h5>
                <p class="small text-muted mb-0">Tabulate rankings, export roll sheets, and print judge scorecards.</p>
            </div>
        </div>

        <div class="row g-3">
            <!-- Card 1: Final Standings & Score Aggregation -->
            <div class="col-md-6">
                <div class="ui-card h-100 d-flex flex-column">
                    <h6 class="fw-bold mb-1"><i class="fas fa-trophy text-warning me-2"></i>House Championship Standings</h6>
                    <p class="small text-muted mb-3">Combined point totals split by on-stage, off-stage, and category breakdowns.</p>
                    <div class="mt-auto text-end">
                        <button class="btn btn-sm btn-primary" onclick="window.printFinalHouseRankings()">
                            <i class="fas fa-file-pdf me-1"></i>Print House Standings
                        </button>
                    </div>
                </div>
            </div>

            <!-- Card 2: Individual Championships (Kalathilakam / Kalaprathibha) -->
            <div class="col-md-6">
                <div class="ui-card h-100 d-flex flex-column">
                    <h6 class="fw-bold mb-1"><i class="fas fa-medal text-info me-2"></i>Individual Championships</h6>
                    <p class="small text-muted mb-3">Top scoring male and female participants across categories (Solo points only).</p>
                    <div class="mt-auto text-end">
                        <button class="btn btn-sm btn-primary" onclick="window.printIndividualChampionships()">
                            <i class="fas fa-user-graduate me-1"></i>Print Champions Roster
                        </button>
                    </div>
                </div>
            </div>

            <!-- Card 3: Judge Result Sheet with QR Code -->
            <div class="col-12">
                <div class="ui-card">
                    <h6 class="fw-bold mb-1"><i class="fas fa-qrcode text-dark me-2"></i>Judge Result Sheets (With Instant QR)</h6>
                    <p class="small text-muted mb-3">Physical scoring sheets for judges complete with encoded scanner QR codes.</p>
                    <div class="row g-2 align-items-end">
                        <div class="col-md-4">
                            <label class="small fw-bold">Filter Category</label>
                            <select id="report-ev-cat" class="form-select form-select-sm">
                                <option value="all">All Categories</option>
                                ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-5">
                            <label class="small fw-bold">Select Event</label>
                            <select id="report-ev-id" class="form-select form-select-sm">
                                ${events.map(e => `<option value="${e.id}">${e.name} (${e.category})</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-3 d-grid">
                            <button class="btn btn-sm btn-success" onclick="window.printEventScorecard()">
                                <i class="fas fa-print me-1"></i>Generate Scorecard
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Card 4: Participant Roll Call / Entry Sheet -->
            <div class="col-12">
                <div class="ui-card">
                    <h6 class="fw-bold mb-1"><i class="fas fa-clipboard-list text-secondary me-2"></i>Participant Roll Call Grid</h6>
                    <p class="small text-muted mb-3">Matrix roll call sheet grouping registered participants and chest numbers by house.</p>
                    <div class="row g-2 align-items-end">
                        <div class="col-md-3">
                            <label class="small fw-bold">Category</label>
                            <select id="roll-cat" class="form-select form-select-sm">
                                <option value="ALL">All Categories</option>
                                ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="small fw-bold">House</label>
                            <select id="roll-house" class="form-select form-select-sm">
                                <option value="ALL">All Houses</option>
                                ${houses.map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="small fw-bold">Type</label>
                            <select id="roll-type" class="form-select form-select-sm">
                                <option value="ALL">All Types</option>
                                <option value="onStage">On-Stage</option>
                                <option value="offStage">Off-Stage</option>
                            </select>
                        </div>
                        <div class="col-md-3 d-grid">
                            <button class="btn btn-sm btn-outline-primary" onclick="window.printRollCallSheet()">
                                <i class="fas fa-file-lines me-1"></i>Generate Roll Grid
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12">
                <div class="ui-card">
                    <h6 class="fw-bold mb-1"><i class="fas fa-file-signature text-success me-2"></i>Blank Registration Roll Card</h6>
                    <p class="small text-muted mb-3">Print a category-wise sheet for house leaders to write participant details and tick event choices before online entry.</p>
                    <div class="row g-2 align-items-end">
                        <div class="col-md-3">
                            <label class="small fw-bold">Category</label>
                            <select id="blank-reg-cat" class="form-select form-select-sm">
                                <option value="ALL">All Categories</option>
                                ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="small fw-bold">House</label>
                            <select id="blank-reg-house" class="form-select form-select-sm">
                                <option value="ALL">All Houses</option>
                                ${houses.map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="small fw-bold">Event Type</label>
                            <select id="blank-reg-type" class="form-select form-select-sm">
                                <option value="ALL">Solo and Group</option>
                                <option value="solo">Solo Only</option>
                                <option value="group">Group Only</option>
                            </select>
                        </div>
                        <div class="col-md-3 d-grid">
                            <button class="btn btn-sm btn-outline-success" onclick="window.printBlankRegistrationForm()"><i class="fas fa-print me-1"></i>Print Roll Card</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12">
                <div class="ui-card">
                    <h6 class="fw-bold mb-1"><i class="fas fa-bullhorn text-info me-2"></i>Stage Announcement Sheet</h6>
                    <p class="small text-muted mb-3">Select a conducting venue to print all events and participants scheduled there.</p>
                    <div class="row g-2 align-items-end">
                        <div class="col-md-9">
                            <label class="small fw-bold">Conducting Venue / Stage</label>
                            <select id="report-announcement-stage" class="form-select form-select-sm">
                                <option value="">Choose a venue / stage</option>
                                ${stages.map(stage => `<option value="${stage}">${stage}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-3 d-grid">
                            <button class="btn btn-sm btn-info" onclick="window.printAnnouncementSheet()"><i class="fas fa-print me-1"></i>Announce Sheet</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('report-ev-cat')?.addEventListener('change', (e) => {
        const cat = e.target.value;
        const selector = document.getElementById('report-ev-id');
        const filtered = cat === 'all' ? events : events.filter(ev => ev.category === cat);
        selector.innerHTML = filtered.map(ev => `<option value="${ev.id}">${ev.name} (${ev.category})</option>`).join('');
    });
};

// --- 2. HOUSE CHAMPIONSHIP STANDINGS ---

window.printFinalHouseRankings = function() {
    const fest = state.managingFest;
    const { housePoints, houseBreakdown } = calculateStandings(fest.id);

    const sortedHouses = state.festHouses.map(h => ({
        id: h.id,
        name: h.name,
        color: h.color,
        total: housePoints[h.id] || 0,
        onStage: houseBreakdown[h.id]?.onStage || 0,
        offStage: houseBreakdown[h.id]?.offStage || 0
    })).sort((a, b) => b.total - a.total);

    const tableRows = sortedHouses.map((h, index) => `
        <tr>
            <td class="text-center fw-bold">${index + 1}</td>
            <td><strong>${h.name}</strong></td>
            <td class="text-center">${h.onStage}</td>
            <td class="text-center">${h.offStage}</td>
            <td class="text-center fw-bold">${h.total}</td>
        </tr>
    `).join('');

    const contentHtml = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin-bottom: 5px;">${fest.name}</h2>
            <h4 style="color: #666; margin-top: 0;">Official House Championship Standings</h4>
            <small>Academic Year: ${systemContext.activeYearId}</small>
        </div>
        <table class="table table-bordered table-sm" style="width: 100%; border-collapse: collapse;">
            <thead class="table-light">
                <tr>
                    <th style="width: 10%; text-align: center;">Rank</th>
                    <th>House</th>
                    <th style="width: 20%; text-align: center;">On-Stage Pts</th>
                    <th style="width: 20%; text-align: center;">Off-Stage Pts</th>
                    <th style="width: 20%; text-align: center;">Total Points</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
        <div style="margin-top: 40px; display: flex; justify-content: space-between;">
            <div>Tabulator Signature: __________________</div>
            <div>Convener Signature: __________________</div>
        </div>
    `;

    window.printReport({
        contentHtml,
        title: `House_Standings_${fest.name}`,
        pageSize: 'A4 portrait'
    });
};

function calculateStandings(festId) {
    const housePoints = {};
    const houseBreakdown = {};

    state.festHouses.forEach(h => {
        housePoints[h.id] = 0;
        houseBreakdown[h.id] = { onStage: 0, offStage: 0 };
    });

    const results = state.festResults.filter(r => r.festId === festId);

    results.forEach(res => {
        const ev = state.festEvents.find(e => e.id === res.eventId);
        if (!ev) return;
        const typeKey = ev.type === 'offStage' ? 'offStage' : 'onStage';

        res.results?.forEach(item => {
            let targetHouseId = null;

            if (item.groupId) {
                targetHouseId = state.festGroups.find(g => g.id === item.groupId)?.houseId;
            } else if (item.studentId) {
                targetHouseId = state.festRegistrations.find(r => r.studentId === item.studentId && r.festId === festId)?.houseId;
            }

            if (targetHouseId && housePoints[targetHouseId] !== undefined) {
                housePoints[targetHouseId] += (item.points || 0);
                houseBreakdown[targetHouseId][typeKey] += (item.points || 0);
            }
        });
    });

    return { housePoints, houseBreakdown };
}

// --- 3. INDIVIDUAL CHAMPIONSHIPS (SOLO EVENTS ONLY) ---

window.printIndividualChampionships = function() {
    const fest = state.managingFest;
    const results = state.festResults.filter(r => r.festId === fest.id);
    const soloScores = {}; // { studentId: totalPoints }

    results.forEach(res => {
        const ev = state.festEvents.find(e => e.id === res.eventId);
        if (!ev || ev.isGroupEvent) return; // Strict solo validation

        res.results?.forEach(item => {
            if (item.studentId && item.points > 0) {
                soloScores[item.studentId] = (soloScores[item.studentId] || 0) + item.points;
            }
        });
    });

    const parsedStudents = Object.entries(soloScores).map(([studentId, points]) => {
        const student = state.students.find(s => s.id === studentId);
        const house = state.festHouses.find(h => h.id === student?.houseId);
        return {
            student,
            house,
            points,
            gender: student?.gender || 'Common',
            category: getStudentCategory(student)
        };
    }).sort((a, b) => b.points - a.points);

    const boys = parsedStudents.filter(s => s.gender === 'M');
    const girls = parsedStudents.filter(s => s.gender === 'F');

    function renderSection(title, list) {
        return `
            <h4 style="margin-top: 25px; border-bottom: 2px solid #333; padding-bottom: 4px;">${title}</h4>
            <table class="table table-bordered table-sm" style="width: 100%; border-collapse: collapse;">
                <thead class="table-light">
                    <tr>
                        <th style="width: 8%; text-align: center;">Rank</th>
                        <th>Student Name</th>
                        <th>Class</th>
                        <th>House</th>
                        <th>Category</th>
                        <th style="width: 15%; text-align: center;">Total Points</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.slice(0, 5).map((item, index) => `
                        <tr>
                            <td class="text-center fw-bold">${index + 1}</td>
                            <td><strong>${item.student?.name || 'Unknown'}</strong></td>
                            <td>${getStudentClassName(item.student?.classId, item.student?.division)}</td>
                            <td>${item.house?.name || 'N/A'}</td>
                            <td>${item.category}</td>
                            <td class="text-center fw-bold">${item.points}</td>
                        </tr>
                    `).join('') || `<tr><td colspan="6" class="text-center text-muted">No points scored.</td></tr>`}
                </tbody>
            </table>
        `;
    }

    const contentHtml = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin-bottom: 5px;">${fest.name}</h2>
            <h4 style="color: #666; margin-top: 0;">Individual Championship Leaders (Solo Events)</h4>
        </div>
        ${renderSection('Kalaprathibha (Male Solo Leaders)', boys)}
        ${renderSection('Kalathilakam (Female Solo Leaders)', girls)}
    `;

    window.printReport({
        contentHtml,
        title: `Individual_Champions_${fest.name}`,
        pageSize: 'A4 portrait'
    });
};

// --- 4. JUDGE SCORECARD WITH QR CODE ---

window.printEventScorecard = function() {
    const fest = state.managingFest;
    const eventId = document.getElementById('report-ev-id')?.value;
    const event = state.festEvents.find(e => e.id === eventId);
    if (!event) return;

    const participants = state.festRegistrations.filter(r => r.festId === fest.id && r.events.includes(eventId));
    let rowsHtml = '';

    if (event.isGroupEvent) {
        const groups = state.festGroups.filter(g => g.festId === fest.id && g.members.some(m => participants.some(p => p.studentId === m.studentId)));
        rowsHtml = groups.map(g => {
            const house = state.festHouses.find(h => h.id === g.houseId);
            const captain = g.members?.find(member => member.role === 'Captain');
            const captainName = state.students.find(student => student.id === captain?.studentId)?.name || 'Not assigned';
            return `
                <tr style="height: 40px;">
                    <td><strong>${g.name}</strong><div class="small text-muted">Captain: ${captainName}</div></td>
                    <td>${house?.name || 'N/A'}</td>
                    <td></td>
                    <td></td>
                </tr>
            `;
        }).join('');
    } else {
        const sorted = participants.sort((a, b) => (a.chestNo || a.studentName).toString().localeCompare((b.chestNo || b.studentName).toString(), undefined, { numeric: true }));
        rowsHtml = sorted.map(p => {
            const house = state.festHouses.find(h => h.id === p.houseId);
            return `
                <tr style="height: 35px;">
                    <td class="text-center"><strong>${p.chestNo || 'N/A'}</strong></td>
                    <td>${p.studentName}</td>
                    <td>${house?.name || 'N/A'}</td>
                    <td></td>
                    <td></td>
                </tr>
            `;
        }).join('');
    }

    const rootUrl = window.location.href.split('#')[0];
    const judgeUrl = `${rootUrl}#fest-judge?year=${systemContext.activeYearId}&fest=${fest.id}&event=${event.id}`;

    const contentHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
            <div>
                <h2 style="margin: 0;">${fest.name}</h2>
                <h3 style="margin: 4px 0 0 0; color: #444;">Score Sheet: ${event.name}</h3>
                <small>Venue / Stage: ${event.stage || 'Main Stage'} &bull; Type: ${event.type} &bull; Category: ${event.category} &bull; Mode: ${event.isGroupEvent ? 'Group' : 'Solo'}</small>
            </div>
            <div id="scorecard-qr-box" style="text-align: center;">
                <div id="qr-target"></div>
                <small style="font-size: 8pt;">Scan to Score</small>
            </div>
        </div>

        <table class="table table-bordered" style="width: 100%; border-collapse: collapse;">
            <thead class="table-light">
                <tr>
                    ${event.isGroupEvent ? '<th style="width: 40%;">Group / Captain</th><th>House</th>' : '<th style="width: 15%; text-align: center;">Chest No</th><th style="width: 35%;">Participant Name</th><th>House</th>'}
                    <th style="width: 15%; text-align: center;">Position</th>
                    <th style="width: 20%; text-align: center;">Remarks / Marks</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml || '<tr><td colspan="5" class="text-center">No enrolled participants.</td></tr>'}
            </tbody>
        </table>

        <div style="margin-top: 60px; display: flex; justify-content: space-around;">
            <div>Judge Name: _____________________</div>
            <div>Judge Signature: _____________________</div>
        </div>
    `;

    window.printReport({
        contentHtml,
        title: `ScoreSheet_${event.name}`,
        pageSize: 'A4 portrait',
        onLoadCallback: (pWindow) => {
            new pWindow.QRCode(pWindow.document.getElementById('qr-target'), {
                text: judgeUrl,
                width: 90,
                height: 90,
                correctLevel: pWindow.QRCode.CorrectLevel.M
            });
        }
    });
};

// --- 5. ROLL CALL GRID / ENTRY MATRIX ---

window.printRollCallSheet = function() {
    const fest = state.managingFest;
    const catFilter = document.getElementById('roll-cat')?.value || 'ALL';
    const houseFilter = document.getElementById('roll-house')?.value || 'ALL';
    const typeFilter = document.getElementById('roll-type')?.value || 'ALL';

    let events = state.festEvents.filter(e => e.festId === fest.id);
    if (catFilter !== 'ALL') events = events.filter(e => e.category === catFilter);
    if (typeFilter !== 'ALL') events = events.filter(e => (e.type || 'onStage') === typeFilter);

    let registrations = state.festRegistrations.filter(r => r.festId === fest.id);
    if (houseFilter !== 'ALL') registrations = registrations.filter(r => r.houseId === houseFilter);

    const tableRows = registrations.map(reg => {
        const student = state.students.find(s => s.id === reg.studentId);
        const house = state.festHouses.find(h => h.id === reg.houseId);

        const checkCells = events.map(ev => {
            const hasEvent = reg.events.includes(ev.id);
            return `<td style="text-align: center; width: 30px;">${hasEvent ? '&#10003;' : ''}</td>`;
        }).join('');

        return `
            <tr>
                <td style="text-align: center;">${reg.chestNo || '-'}</td>
                <td><strong>${reg.studentName}</strong></td>
                <td>${getStudentClassName(student?.classId, student?.division)}</td>
                <td>${house?.name || 'N/A'}</td>
                ${checkCells}
            </tr>
        `;
    }).join('');

    const eventHeaders = events.map(e => `
        <th style="height: 140px; vertical-align: bottom; padding: 4px;">
            <div style="writing-mode: vertical-rl; transform: rotate(180deg); font-size: 8pt; white-space: nowrap;">
                ${e.name}
            </div>
        </th>
    `).join('');

    const contentHtml = `
        <div style="text-align: center; margin-bottom: 15px;">
            <h2 style="margin: 0;">${fest.name}</h2>
            <h4 style="margin: 4px 0; color: #555;">Participant Event Enrollment Roll Matrix</h4>
            <small>Category: ${catFilter} | House: ${houseFilter} | Type: ${typeFilter}</small>
        </div>
        <table class="table table-bordered table-sm" style="width: 100%; border-collapse: collapse; font-size: 9pt;">
            <thead class="table-light">
                <tr>
                    <th style="width: 60px; text-align: center;">Chest</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>House</th>
                    ${eventHeaders}
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;

    window.printReport({
        contentHtml,
        title: `RollCall_${fest.name}`,
        pageSize: 'A4 landscape'
    });
};

window.printBlankRegistrationForm = function() {
    const fest = state.managingFest;
    const categoryFilter = document.getElementById('blank-reg-cat')?.value || 'ALL';
    const houseFilter = document.getElementById('blank-reg-house')?.value || 'ALL';
    const typeFilter = document.getElementById('blank-reg-type')?.value || 'ALL';
    const selectedHouse = state.festHouses.find(house => house.id === houseFilter);
    const events = state.festEvents.filter(event => {
        if (event.festId !== fest.id) return false;
        if (categoryFilter !== 'ALL' && event.category !== 'General' && event.category !== categoryFilter) return false;
        if (typeFilter === 'solo' && event.isGroupEvent) return false;
        if (typeFilter === 'group' && !event.isGroupEvent) return false;
        return true;
    });
    const eventHeaders = events.map(event => `<th style="width:70px; height:115px; vertical-align:bottom; padding:3px;"><div style="writing-mode:vertical-rl; transform:rotate(180deg); font-size:8pt; white-space:nowrap;">${event.name}<br>(${event.stage || 'Main Stage'})</div></th>`).join('');
    const blankRows = Array.from({ length: 14 }, (_, index) => `
        <tr style="height:34px;"><td class="text-center">${index + 1}</td><td></td><td></td><td></td><td></td>${events.map(() => '<td class="text-center" style="font-size:16pt;"></td>').join('')}</tr>
    `).join('');
    const contentHtml = `
        <div style="text-align:center; margin-bottom:12px;"><h2 style="margin:0;">${fest.name}</h2><h4 style="margin:4px 0;">Participant Registration</h4><div>Academic Year: ${systemContext.activeYearId} | Category: ${categoryFilter} | House: ${selectedHouse?.name || 'All Houses'} | Type: ${typeFilter}</div></div>
        <p style="font-size:9pt; margin:6px 0 10px;"><strong>Instructions:</strong> House leaders should write the participant name, admission number and class, then tick the selected event. Enter only the checked participants in the website.</p>
        <table class="table table-bordered table-sm" style="width:100%; border-collapse:collapse; font-size:9pt;"><thead class="table-light"><tr><th style="width:35px;">#</th><th style="width:22%;">Participant Name</th><th style="width:13%;">Admission No</th><th style="width:13%;">Class / Division</th><th style="width:8%;">Gender</th>${eventHeaders}</tr></thead><tbody>${blankRows}</tbody></table>
        <div style="margin-top:22px; display:flex; justify-content:space-between;"><span>House Leader: __________________</span><span>Checked By: __________________</span><span>Date: __________</span></div>
    `;
    window.printReport({ contentHtml, title: `Registration_Roll_Card_${fest.name}`, pageSize: 'A4 landscape' });
};

window.printAnnouncementSheet = function() {
    const fest = state.managingFest;
    if (!fest) return window.showAlert('Please select a fest first.', 'warning');
    const stages = fest.stages?.length ? fest.stages : ['Main Stage'];
    const stage = document.getElementById('report-announcement-stage')?.value;
    if (!stage || !stages.includes(stage)) return window.showAlert('Select a venue / stage first.', 'warning');
    const report = generateAnnouncementSheetHTML(fest.id, stage);
    if (!report.contentHtml) return;
    window.printReport({
        contentHtml: report.contentHtml,
        title: `Announcement_Sheet_${report.reportTitle}`,
        extraCss: `.announcement-section { page-break-inside: avoid; margin-bottom: 15px; } .event-title { font-size: 1.1rem; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; } .house-header { font-size: .9rem; font-weight: bold; } .chest-number-list { font-size: .9rem; line-height: 1.4; word-spacing: 8px; }`,
        pageSize: 'A4 portrait'
    });
};

function generateAnnouncementSheetHTML(festId, selectedStage) {
    const fest = state.fests.find(item => item.id === festId) || state.managingFest;
    const events = state.festEvents.filter(event => event.festId === festId && (event.stage || 'Main Stage') === selectedStage).sort((a, b) => a.name.localeCompare(b.name));
    let contentHtml = '';
    let participantsFound = false;

    events.forEach(event => {
        const participants = state.festRegistrations.filter(registration => registration.festId === festId && (registration.events || []).includes(event.id));
        if (participants.length === 0) return;
        participantsFound = true;
            const byHouse = participants.reduce((groups, registration) => {
                const houseId = registration.houseId || 'UNASSIGNED';
                (groups[houseId] ||= []).push(registration);
                return groups;
            }, {});
            const houseSections = Object.keys(byHouse).sort((a, b) => (state.festHouses.find(house => house.id === a)?.name || '').localeCompare(state.festHouses.find(house => house.id === b)?.name || '')).map(houseId => {
                const house = state.festHouses.find(item => item.id === houseId);
                const chestNumbers = [...new Set(byHouse[houseId].map(registration => registration.chestNo).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
                return chestNumbers.length ? `<div><h6 class="house-header" style="color:${house?.color || '#000'};">${house?.name || 'Unassigned'}:</h6><p class="chest-number-list">${chestNumbers.join(', ')}</p></div>` : '';
            }).join('');
            contentHtml += `<div class="announcement-section"><h3 class="event-title">${selectedStage}: ${event.name} <small class="text-muted">(${event.category})</small></h3>${houseSections}</div>`;
    });

    if (!participantsFound) {
        window.showAlert('No participants with chest numbers were found for this venue / stage.', 'info');
        return { contentHtml: null, reportTitle: '' };
    }
    return { contentHtml: `<h2 style="text-align:center;">${fest.name}</h2><p style="text-align:center;">Announcement Sheet | Venue / Stage: ${selectedStage} | ${state.activeYear?.label || state.activeYear?.id || ''}</p>${contentHtml}`, reportTitle: `${fest.name}_${selectedStage}` };
}