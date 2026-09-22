// =========================================================================
// --- FEST REPORTS & TABULATION MODULE (fest-reports.js) ---
// =========================================================================

//import { systemContext } from "./firebase-config.js";
import { 
    state, 
    getStudentClassName, 
    getStudentCategory 
} from "./app-state.js";

import { db, systemContext,saveScopedDoc,
    getScopedDoc } from "./firebase-config.js";

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
                        </div>
                        <div class="col-md-5">
    <label class="small fw-bold">Select Events</label>
    <select id="report-ev-id" class="form-select form-select-sm" multiple size="6">
        ${[...new Map(events.map(e => [e.id, e])).values()]
            .map(e => `
                <option value="${e.id}">
                    ${e.name} (${e.category})
                </option>
            `)
            .join('')}
    </select>
    <small class="text-muted">Hold Ctrl and select multiple events</small>
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
                    <h6 class="fw-bold mb-1"><i class="fas fa-id-badge text-primary me-2"></i>Chest Number Cards</h6>
                    <p class="small text-muted mb-3">Print four chest cards per A4 page for participants with assigned chest numbers.</p>
                    <div class="row g-2 align-items-end">
                        <div class="col-md-6">
                            <label class="small fw-bold" for="chest-house-filter">House</label>
                            <select id="chest-house-filter" class="form-select form-select-sm">
                                <option value="ALL">All Houses</option>
                                ${houses.map(house => `<option value="${house.id}">${house.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-3 d-grid">
                            <button class="btn btn-sm btn-outline-primary" type="button" onclick="window.printChestNumbers()">
                                <i class="fas fa-print me-1"></i>Print Chest Cards
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12">
                <div class="ui-card">
                    <h6 class="fw-bold mb-1"><i class="fas fa-gavel text-dark me-2"></i>Judge Cards</h6>
                    <p class="small text-muted mb-3">Print four judge cards per A4 page with judge codes, assigned events, and halls.</p>
                    <div class="row g-2 align-items-end">
                        <div class="col-md-3">
                            <label class="small fw-bold" for="judge-card-category">Category</label>
                            <select id="judge-card-category" class="form-select form-select-sm">
                                <option value="ALL">All Categories</option>
                                ${categories.map(category => `<option value="${category}">${category}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="small fw-bold" for="judge-card-event">Event</label>
                            <select id="judge-card-event" class="form-select form-select-sm">
                                <option value="ALL">All Events</option>
                                ${events.map(event => `<option value="${event.id}">${event.name} (${event.category})</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-2 d-grid">
                            <button class="btn btn-sm btn-outline-dark" type="button" onclick="window.printJudgeCards()">
                            <i class="fas fa-print me-1"></i>Print Judge Cards
                            </button>
                        </div>
                        <div class="col-md-3 d-grid">
                            <button class="btn btn-sm btn-outline-success" type="button" onclick="window.downloadJudgeList()">
                                <i class="fas fa-download me-1"></i>Download Judge List
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
    document.getElementById('judge-card-category')?.addEventListener('change', (e) => {
        const category = e.target.value;
        const selector = document.getElementById('judge-card-event');
        const filtered = category === 'ALL' ? events : events.filter(event => event.category === category);
        selector.innerHTML = `<option value="ALL">All Events</option>${filtered.map(event => `<option value="${event.id}">${event.name} (${event.category})</option>`).join('')}`;
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

/**
 * Generates and prints compact chest-number cards for assigned participants.
 */
window.printChestNumbers = function() {
    if (!state.managingFest) return window.showAlert('No fest selected.', 'warning');

    const festId = state.managingFest.id;
    const houseFilter = document.getElementById('chest-house-filter')?.value || 'ALL';
    const participants = state.festRegistrations
        .filter(registration => registration.festId === festId && registration.chestNo && (houseFilter === 'ALL' || registration.houseId === houseFilter))
        .sort((a, b) => String(a.chestNo || '').localeCompare(String(b.chestNo || ''), undefined, { numeric: true }));

    if (participants.length === 0) {
        return window.showAlert('No participants with chest numbers found for this fest.', 'info');
    }

    const schoolName = window.schoolDetails?.name || 'KYHSS ATHAVANAD';
    const cardHtml = participants.map(registration => {
        const student = state.students.find(item => item.id === registration.studentId);
        if (!student) return '';
        const house = state.festHouses.find(item => item.id === registration.houseId);

        const eventNames = (registration.events || [])
            .map(eventId => state.festEvents.find(event => event.id === eventId)?.name)
            .filter(Boolean)
            .join(', ');

        return `
            <div class="chest-no-slip">
                <div class="chest-header">${schoolName}</div>
                <div class="fest-name">${state.managingFest.name}</div>
                <div class="chest-house-name">${house?.name || 'House not assigned'}</div>
                <div class="chest-number">${registration.chestNo}</div>
                <div class="chest-student-name">${student.name}</div>
                <small class="text-muted">${getStudentClassName(student.classId, student.division)}</small>
                <div class="chest-events">${eventNames || 'No events assigned'}</div>
            </div>`;
    }).filter(Boolean);

    if (cardHtml.length === 0) {
        return window.showAlert('No matching student records found for the assigned chest numbers.', 'info');
    }

    const contentHtml = [];
    for (let index = 0; index < cardHtml.length; index += 4) {
        contentHtml.push(`
            <section class="chest-card-page">
                ${cardHtml.slice(index, index + 4).join('')}
            </section>`);
    }

    const extraCss = `
        @page {
            size: A4 landscape;
            margin: 2mm;
        }
        .chest-card-page {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(2, 1fr);
            gap: 4mm;
            width: 100%;
            height: calc(210mm - 16mm);
            box-sizing: border-box;
            page-break-after: always;
            break-after: page;
        }
        .chest-card-page:last-child {
            page-break-after: auto;
            break-after: auto;
        }
        .chest-no-slip {
            width: 100%;
            height: 100%;
            padding: 4mm;
            border: 1px dashed #777;
            border-radius: 4px;
            box-sizing: border-box;
            text-align: center;
            page-break-inside: avoid;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        .chest-header { font-size: 1.1em; font-weight: bold; text-transform: uppercase; }
        .fest-name { font-size: 0.85em; color: #555; }
        .chest-house-name { font-size: 1em; font-weight: 600; color: #333; margin-top: 2px; }
        .chest-number { font-size: 4em; font-weight: bold; margin: 4px 0; line-height: 1; }
        .chest-student-name { font-size: 1.2em; font-weight: 600; }
        .chest-events { font-size: 0.75em; color: #444; margin-top: 4px; line-height: 1.2; max-height: 2.4em; overflow: hidden; }
    `;

    window.printReport({
        contentHtml: contentHtml.join(''),
        title: `Chest_Numbers_${festId}`,
        extraCss,
        pageSize: 'A4 landscape'
    });
};

/**
 * Generates and prints judge cards with assigned events and halls.
 */
window.printJudgeCards = function() {
    if (!state.managingFest) return window.showAlert('No fest selected.', 'warning');

    const fest = state.managingFest;
    const judges = fest.judgeCodes || [];
    const events = getFilteredJudgeEvents(fest);

    if (judges.length === 0) {
        return window.showAlert('No judges found for this fest.', 'info');
    }

    const schoolName = window.schoolDetails?.name || 'KYHSS ATHAVANAD';
    const selectedCategory = document.getElementById('judge-card-category')?.value || 'ALL';
    const selectedEvent = document.getElementById('judge-card-event')?.value || 'ALL';
    const cardHtml = judges.filter(judge => selectedCategory === 'ALL' && selectedEvent === 'ALL'
        ? true
        : events.some(event => (event.judgeIds || []).includes(judge.code))
    ).map(judge => {
        const assignedEvents = events.filter(event => (event.judgeIds || []).includes(judge.code));
        const eventRows = assignedEvents.length
            ? assignedEvents.map(event => `
                <div class="judge-event-row">
                    <span>${event.name}</span>
                    <strong>${event.stage || 'Hall not assigned'}</strong>
                </div>`).join('')
            : '<div class="judge-no-events">No events assigned</div>';

        return `
            <div class="judge-card">
                <div class="judge-card-header">${schoolName}</div>
                <div class="judge-card-fest">${fest.name}</div>
                <div class="judge-card-name">${judge.name}</div>
                <div class="judge-card-code">Code: <strong>${judge.code}</strong></div>
                <div class="judge-events-title">Assigned Events & Halls</div>
                <div class="judge-events-list">${eventRows}</div>
            </div>`;
    });

    if (cardHtml.length === 0) {
        return window.showAlert('No judges are assigned to the selected category or event.', 'info');
    }

    const contentHtml = [];
    for (let index = 0; index < cardHtml.length; index += 4) {
        contentHtml.push(`
            <section class="judge-card-page">
                ${cardHtml.slice(index, index + 4).join('')}
            </section>`);
    }

    const extraCss = `
        @page {
            size: A4 landscape;
            margin: 2mm;
        }
        .judge-card-page {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(2, 1fr);
            gap: 4mm;
            width: 100%;
            height: calc(210mm - 16mm);
            box-sizing: border-box;
            page-break-after: always;
            break-after: page;
        }
        .judge-card-page:last-child {
            page-break-after: auto;
            break-after: auto;
        }
        .judge-card {
            width: 100%;
            height: 100%;
            padding: 5mm;
            border: 1px dashed #777;
            border-radius: 4px;
            box-sizing: border-box;
            text-align: center;
            page-break-inside: avoid;
            overflow: hidden;
        }
        .judge-card-header { font-size: 1.1em; font-weight: bold; text-transform: uppercase; }
        .judge-card-fest { font-size: 0.85em; color: #555; }
        .judge-card-name { font-size: 1.6em; font-weight: 700; margin-top: 5px; }
        .judge-card-code { font-size: 1em; margin-bottom: 8px; }
        .judge-events-title { font-size: 0.85em; font-weight: 700; border-bottom: 1px solid #aaa; padding-bottom: 3px; }
        .judge-events-list { text-align: left; font-size: 0.8em; margin-top: 5px; }
        .judge-event-row { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px solid #eee; padding: 3px 0; }
        .judge-event-row strong { white-space: nowrap; }
        .judge-no-events { color: #666; text-align: center; margin-top: 8px; }
    `;

    window.printReport({
        contentHtml: contentHtml.join(''),
        title: `Judge_Cards_${fest.id}`,
        extraCss,
        pageSize: 'A4 landscape'
    });
};

function getFilteredJudgeEvents(fest) {
    const category = document.getElementById('judge-card-category')?.value || 'ALL';
    const eventId = document.getElementById('judge-card-event')?.value || 'ALL';

    return state.festEvents.filter(event => event.festId === fest.id
        && (category === 'ALL' || event.category === category)
        && (eventId === 'ALL' || event.id === eventId));
}

function csvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

window.downloadJudgeList = function() {
    if (!state.managingFest) return window.showAlert('No fest selected.', 'warning');

    const fest = state.managingFest;
    const judges = fest.judgeCodes || [];
    const events = getFilteredJudgeEvents(fest);
    const rows = [];

    events.forEach(event => {
        (event.judgeIds || []).forEach(judgeCode => {
            const judge = judges.find(item => item.code === judgeCode);
            rows.push([
                event.name,
                event.category || '',
                event.stage || 'Hall not assigned',
                judge?.name || 'Unknown judge',
                judgeCode
            ]);
        });
    });

    if (rows.length === 0) {
        return window.showAlert('No judge assignments found for the selected category or event.', 'info');
    }

    const csv = [
        ['Event Name', 'Category', 'Hall', 'Judge Name', 'Judge Code'],
        ...rows
    ].map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Judge_List_${fest.id}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

// --- 4. JUDGE SCORECARD WITH QR CODE ---

window.printEventScorecardold1 = function() {
    const fest = state.managingFest;
    const select = document.getElementById('report-ev-id');
    if (!select) return;

    // 1. Collect all selected event IDs from the multi-select element
    const selectedEventIds = Array.from(select.selectedOptions)
        .map(opt => opt.value)
        .filter(Boolean);

    if (!selectedEventIds.length) {
        alert('Please select at least one event.');
        return;
    }

    const uniqueEventIds = [...new Set(selectedEventIds)];
    const selectedEvents = uniqueEventIds
        .map(id => state.festEvents.find(e => e.id === id))
        .filter(Boolean);

    if (!selectedEvents.length) {
        alert('No valid events selected.');
        return;
    }

    const rootUrl = window.location.href.split('#')[0];
    const qrQueue = [];

    // 2. Generate HTML page for each selected event
    const pagesHtml = selectedEvents.map((event, index) => {
        const isGroup = Boolean(event.isGroupEvent || event.type === 'group');
        const participants = state.festRegistrations.filter(r => 
            r.festId === fest.id && 
            !r.isDeleted && 
            Array.isArray(r.events) && 
            r.events.includes(event.id)
        );

        let rowsHtml = '';

        if (isGroup) {
            const groups = state.festGroups.filter(g =>
                g.festId === fest.id &&
                !g.isDeleted &&
                (g.eventId === event.id || g.members?.some(m => participants.some(p => p.studentId === m.studentId)))
            );

            rowsHtml = groups.map(g => {
                const house = state.festHouses.find(h => h.id === g.houseId);
                const captain = g.members?.find(member => member.role === 'Captain' || member.isCaptain);
                const captainName = state.students.find(s => s.id === captain?.studentId)?.name || 'Not assigned';

                return `
                    <tr style="height: 40px;">
                        <td class="text-center" style="font-weight: 700;">${g.chestNo || g.code || '-'}</td>
                        <td><strong>${g.name}</strong><div class="small text-muted" style="font-size: 7.5pt;">Captain: ${captainName}</div></td>
                        <td>${house?.name || 'N/A'}</td>
                        <td style="width: 15%; text-align: center;"></td>
                        <td style="width: 20%;"></td>
                    </tr>
                `;
            }).join('');
        } else {
            const sorted = [...participants].sort((a, b) => {
                const chestA = String(a.chestNo || '').trim();
                const chestB = String(b.chestNo || '').trim();
                if (chestA && chestB) {
                    return chestA.localeCompare(chestB, undefined, { numeric: true, sensitivity: 'base' });
                }
                if (chestA && !chestB) return -1;
                if (!chestA && chestB) return 1;
                return (a.studentName || '').localeCompare(b.studentName || '');
            });

            rowsHtml = sorted.map(p => {
                const house = state.festHouses.find(h => h.id === p.houseId);
                const student = state.students.find(s => s.id === p.studentId);

                return `
                    <tr style="height: 35px;">
                        <td class="text-center" style="font-weight: 700;">${p.chestNo || 'N/A'}</td>
                        <td>
                            <strong>${p.studentName}</strong>
                            <div class="small text-muted" style="font-size: 7.5pt;">Adm: ${student?.admissionNumber || 'N/A'}</div>
                        </td>
                        <td>${house?.name || 'N/A'}</td>
                        <td style="width: 15%; text-align: center;"></td>
                        <td style="width: 20%;"></td>
                    </tr>
                `;
            }).join('');
        }

        const judgeUrl = `${rootUrl}#fest-judge?year=${systemContext.activeYearId}&fest=${encodeURIComponent(fest.id)}&event=${encodeURIComponent(event.id)}`;
        const qrContainerId = `qr-target-${index}`;
        qrQueue.push({ containerId: qrContainerId, url: event.id });
        //qrQueue.push({ containerId: qrContainerId, url: judgeUrl });

        return `
            <div class="scorecard-page" style="width: 100%; box-sizing: border-box; min-height: 270mm; ${index > 0 ? 'page-break-before: always;' : ''} padding: 10mm 12mm;">
                <!-- Header with Event Details and QR Code -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
                    <div>
                        <h2 style="margin: 0; font-size: 16pt;">${fest.name}</h2>
                        <h3 style="margin: 3px 0; color: #333; font-size: 12pt;">Score Sheet: ${event.name}</h3>
                        <small style="font-size: 8pt; color: #555;">
                            Venue / Stage: <strong>${event.stage || 'Main Stage'}</strong> &bull; 
                            Type: <strong>${event.type || 'N/A'}</strong> &bull; 
                            Category: <strong>${event.category || 'N/A'}</strong> &bull; 
                            Mode: <strong>${isGroup ? 'Group' : 'Solo'}</strong>
                        </small>
                    </div>
                    <div style="text-align: center; min-width: 105px; flex-shrink: 0;">
    <div id="${qrContainerId}" style="width: 85px; height: 85px; display: inline-block;"></div>
    <small style="font-size: 7pt; display: block; margin-top: 2px; font-weight: 600; color: #333;">SCAN TO SCORE</small>
    <!-- Fallback readable code -->
    <div style="font-family: monospace; font-size: 7.5pt; font-weight: bold; background: #e9ecef; border: 1px solid #ced4da; border-radius: 3px; padding: 1px 4px; margin-top: 3px; word-break: break-all;">
        ID: ${event.id}
    </div>
</div>
                </div>

                <!-- Score Entry Table -->
                <table class="table table-bordered table-sm" style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
                    <thead class="table-light">
                        <tr>
                            ${isGroup 
                                ? '<th style="width: 15%; text-align: center;">Group Code</th><th style="width: 35%;">Group / Captain</th><th>House</th>' 
                                : '<th style="width: 15%; text-align: center;">Chest No</th><th style="width: 35%;">Participant Name</th><th>House</th>'
                            }
                            <th style="width: 15%; text-align: center;">Position</th>
                            <th style="width: 20%; text-align: center;">Remarks / Marks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || `<tr><td colspan="5" class="text-center py-4 text-muted">No enrolled participants.</td></tr>`}
                    </tbody>
                </table>

                <!-- Signature Section -->
                <div style="margin-top: 60px; display: flex; justify-content: space-around; font-size: 9pt;">
                    <div>Judge Name: _____________________</div>
                    <div>Judge Signature: _____________________</div>
                </div>
            </div>
        `;
    }).join('');

    // 3. Render printable pages and verify every QR code is fully loaded before print()
    window.printReport({
        contentHtml: pagesHtml,
        title: `ScoreSheets_${fest.name.replace(/\s+/g, '_')}`,
        pageSize: 'A4 portrait',
        autoPrint: false,
        onLoadCallback: (pWindow) => {
            if (!qrQueue.length) {
                pWindow.print();
                return;
            }

            // Generate each QR code in the target print window
            qrQueue.forEach(item => {
                const target = pWindow.document.getElementById(item.containerId);
                if (target && pWindow.QRCode) {
                    new pWindow.QRCode(target, {
                        text: item.url,
                        width: 85,
                        height: 85,
                        correctLevel: pWindow.QRCode.CorrectLevel.L
                    });
                }
            });

            // Poll until every single QR code canvas/image has rendered
            const waitForAllQRs = () => {
                const allReady = qrQueue.every(item => {
                    const el = pWindow.document.getElementById(item.containerId);
                    if (!el) return true;
                    const img = el.querySelector('img');
                    const canvas = el.querySelector('canvas');
                    return (img && img.complete && img.naturalWidth > 0) || (canvas && canvas.width > 0);
                });

                if (allReady) {
                    pWindow.focus();
                    pWindow.print();
                } else {
                    setTimeout(waitForAllQRs, 50);
                }
            };

            waitForAllQRs();
        }
    });
};

// Deterministic short hash generator
function generateShortToken(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    // Produces a clean 3-4 character base-36 token like "A7X" or "K9B"
    return Math.abs(hash).toString(36).substring(0, 4).toUpperCase();
}

/**
 * Gets or stores a 3-4 character token mapped to the event in Firestore.
 */
export async function getOrCreateEventToken(festId, eventId, judgeCode = '') {
    const yearId =  systemContext.activeYearId || localStorage.getItem('activeYearId');
    const token = generateShortToken(`${festId}_${eventId}`);
    const tokenRef = doc(db, `academicYears/${yearId}/festTokens`, token);
    console.log(tokenRef)
    console.log(`Checking token for festId=${festId}, eventId=${eventId}, token=${token}, yearid=${yearId} `);
    const snap = await getDoc(tokenRef);
    if (!snap.exists()) {
        await setDoc(tokenRef, {
            token: token,
            yearId: yearId,
            festId: festId,
            eventId: eventId,
            judgeCode: judgeCode || '',
            createdAt: new Date(),
            isDeleted:false
        });
    }

    return token;
}
window.getOrCreateEventToken = getOrCreateEventToken;

window.printEventScorecard = async function() {
    const fest = state.managingFest;
    const select = document.getElementById('report-ev-id');
    if (!select) return;

    // 1. Collect all selected event IDs from the multi-select element
    const selectedEventIds = Array.from(select.selectedOptions)
        .map(opt => opt.value)
        .filter(Boolean);

    if (!selectedEventIds.length) {
        alert('Please select at least one event.');
        return;
    }

    const uniqueEventIds = [...new Set(selectedEventIds)];
    const selectedEvents = uniqueEventIds
        .map(id => state.festEvents.find(e => e.id === id))
        .filter(Boolean);

    if (!selectedEvents.length) {
        alert('No valid events selected.');
        return;
    }

    const yearId = systemContext.activeYearId || localStorage.getItem('activeYearId'); //
const rootUrl = window.location.href.split('#')[0];

    const qrQueue = [];

    // Pre-resolve short 3-letter tokens for all selected events
    // Inside window.printEventScorecard in fest-reports.js

const tokenDataList = await Promise.all(
    selectedEvents.map(async (event, index) => {
        const shortToken = await getOrCreateEventToken(fest.id, event.id);
        
        // Includes yearId directly in the link: #j/2026-27/A7X
        const shortUrl = `${rootUrl}#j/${yearId}/${shortToken}`;
        const qrContainerId = `qr-target-${index}`;
        return { event, shortToken, shortUrl, qrContainerId, index };
    })
);

    // 2. Generate HTML page for each selected event
    const pagesHtml = tokenDataList.map(({ event, shortToken, shortUrl, qrContainerId, index }) => {
        const isGroup = Boolean(event.isGroupEvent || event.type === 'group');
        const participants = state.festRegistrations.filter(r => 
            r.festId === fest.id && 
            !r.isDeleted && 
            Array.isArray(r.events) && 
            r.events.includes(event.id)
        );

        let rowsHtml = '';

        if (isGroup) {
            const groups = state.festGroups.filter(g =>
                g.festId === fest.id &&
                !g.isDeleted &&
                (g.eventId === event.id || g.members?.some(m => participants.some(p => p.studentId === m.studentId)))
            );

            rowsHtml = groups.map(g => {
                const house = state.festHouses.find(h => h.id === g.houseId);
                const captain = g.members?.find(member => member.role === 'Captain' || member.isCaptain);
                const captainName = state.students.find(s => s.id === captain?.studentId)?.name || 'Not assigned';

                return `
                    <tr style="height: 40px;">
                        <td class="text-center" style="font-weight: 700;">${g.chestNo || g.code || '-'}</td>
                        <td><strong>${g.name}</strong><div class="small text-muted" style="font-size: 7.5pt;">Captain: ${captainName}</div></td>
                        <td>${house?.name || 'N/A'}</td>
                        <td style="width: 15%; text-align: center;"></td>
                        <td style="width: 20%;"></td>
                    </tr>
                `;
            }).join('');
        } else {
            const sorted = [...participants].sort((a, b) => {
                const chestA = String(a.chestNo || '').trim();
                const chestB = String(b.chestNo || '').trim();
                if (chestA && chestB) {
                    return chestA.localeCompare(chestB, undefined, { numeric: true, sensitivity: 'base' });
                }
                if (chestA && !chestB) return -1;
                if (!chestA && chestB) return 1;
                return (a.studentName || '').localeCompare(b.studentName || '');
            });

            rowsHtml = sorted.map(p => {
                const house = state.festHouses.find(h => h.id === p.houseId);
                const student = state.students.find(s => s.id === p.studentId);

                return `
                    <tr style="height: 35px;">
                        <td class="text-center" style="font-weight: 700;">${p.chestNo || 'N/A'}</td>
                        <td>
                            <strong>${p.studentName}</strong>
                            <div class="small text-muted" style="font-size: 7.5pt;">Adm: ${student?.admissionNumber || 'N/A'}</div>
                        </td>
                        <td>${house?.name || 'N/A'}</td>
                        <td style="width: 15%; text-align: center;"></td>
                        <td style="width: 20%;"></td>
                    </tr>
                `;
            }).join('');
        }

        // Queue short URL for QR generation
        qrQueue.push({ containerId: qrContainerId, url: shortUrl });

        return `
            <div class="scorecard-page" style="width: 100%; box-sizing: border-box; min-height: 270mm; ${index > 0 ? 'page-break-before: always;' : ''} padding: 10mm 12mm;">
                <!-- Header with Event Details and QR Code -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
                    <div>
                        <h2 style="margin: 0; font-size: 16pt;">${fest.name}</h2>
                        <h3 style="margin: 3px 0; color: #333; font-size: 12pt;">Score Sheet: ${event.name}</h3>
                        <small style="font-size: 8pt; color: #555;">
                            Venue / Stage: <strong>${event.stage || 'Main Stage'}</strong> &bull; 
                            Type: <strong>${event.type || 'N/A'}</strong> &bull; 
                            Category: <strong>${event.category || 'N/A'}</strong> &bull; 
                            Mode: <strong>${isGroup ? 'Group' : 'Solo'}</strong>
                        </small>
                    </div>

                    <!-- Short QR & 3-Letter ID Box -->
                    <div style="text-align: center; min-width: 95px; flex-shrink: 0;">
                        <div id="${qrContainerId}" style="width: 80px; height: 80px; display: inline-block;"></div>
                        <small style="font-size: 7pt; display: block; margin-top: 2px; font-weight: 600; color: #333;">SCAN TO SCORE</small>
                        <div style="font-family: monospace; font-size: 8pt; font-weight: bold; background: #e9ecef; border: 1px solid #ced4da; border-radius: 3px; padding: 1px 4px; margin-top: 2px; letter-spacing: 0.5px;">
                            ID: ${shortToken}
                        </div>
                    </div>
                </div>

                <!-- Score Entry Table -->
                <table class="table table-bordered table-sm" style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
                    <thead class="table-light">
                        <tr>
                            ${isGroup 
                                ? '<th style="width: 15%; text-align: center;">Group Code</th><th style="width: 35%;">Group / Captain</th><th>House</th>' 
                                : '<th style="width: 15%; text-align: center;">Chest No</th><th style="width: 35%;">Participant Name</th><th>House</th>'
                            }
                            <th style="width: 15%; text-align: center;">Position</th>
                            <th style="width: 20%; text-align: center;">Remarks / Marks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || `<tr><td colspan="5" class="text-center py-4 text-muted">No enrolled participants.</td></tr>`}
                    </tbody>
                </table>

                <!-- Signature Section -->
                <div style="margin-top: 60px; display: flex; justify-content: space-around; font-size: 9pt;">
                    <div>Judge Name: _____________________</div>
                    <div>Judge Signature: _____________________</div>
                </div>
            </div>
        `;
    }).join('');

    // 3. Render printable pages and verify every QR code is fully loaded before print()
    window.printReport({
        contentHtml: pagesHtml,
        title: `ScoreSheets_${fest.name.replace(/\s+/g, '_')}`,
        pageSize: 'A4 portrait',
        autoPrint: false,
        onLoadCallback: (pWindow) => {
            if (!qrQueue.length) {
                pWindow.print();
                return;
            }

            // Generate each QR code with Level L (high scan speed, low density)
            qrQueue.forEach(item => {
                const target = pWindow.document.getElementById(item.containerId);
                if (target && pWindow.QRCode) {
                    new pWindow.QRCode(target, {
                        text: item.url,
                        width: 80,
                        height: 80,
                        correctLevel: pWindow.QRCode.CorrectLevel.L
                    });
                }
            });

            // Poll until every QR code canvas/image has rendered
            const waitForAllQRs = () => {
                const allReady = qrQueue.every(item => {
                    const el = pWindow.document.getElementById(item.containerId);
                    if (!el) return true;
                    const img = el.querySelector('img');
                    const canvas = el.querySelector('canvas');
                    return (img && img.complete && img.naturalWidth > 0) || (canvas && canvas.width > 0);
                });

                if (allReady) {
                    pWindow.focus();
                    pWindow.print();
                } else {
                    setTimeout(waitForAllQRs, 50);
                }
            };

            waitForAllQRs();
        }
    });
};
// --- 5. ROLL CALL GRID / ENTRY MATRIX ---

window.printRollCallSheet = function() {
    const fest = state.managingFest;
    const catFilter = document.getElementById('roll-cat')?.value || 'ALL';
    const houseFilter = document.getElementById('roll-house')?.value || 'ALL';
    const typeFilter = document.getElementById('roll-type')?.value || 'ALL';

    // 1. Filter raw events for this fest
    let rawEvents = state.festEvents.filter(e => e.festId === fest.id);
    if (catFilter !== 'ALL') rawEvents = rawEvents.filter(e => e.category === catFilter);
    if (typeFilter !== 'ALL') rawEvents = rawEvents.filter(e => (e.type || 'onStage') === typeFilter);

    // 2. Group events by clean name so duplicate names across categories get ONE column
    const uniqueEventsMap = new Map();
    rawEvents.forEach(e => {
        const cleanName = (e.name || '').trim();
        if (!cleanName) return;

        const nameKey = cleanName.toLowerCase();
        if (!uniqueEventsMap.has(nameKey)) {
            uniqueEventsMap.set(nameKey, {
                displayName: cleanName,
                eventIds: new Set([e.id])
            });
        } else {
            uniqueEventsMap.get(nameKey).eventIds.add(e.id);
        }
    });

    // Sort unique event columns alphabetically
    const events = Array.from(uniqueEventsMap.values()).sort((a, b) => 
        a.displayName.localeCompare(b.displayName, undefined, { numeric: true, sensitivity: 'base' })
    );

    // 3. Filter and enrich participant records
    let registrations = state.festRegistrations.filter(r => r.festId === fest.id && !r.isDeleted);
    if (houseFilter !== 'ALL') {
        registrations = registrations.filter(r => r.houseId === houseFilter);
    }

    let enriched = registrations.map(reg => {
        const student = state.students.find(s => s.id === reg.studentId);
        const house = state.festHouses.find(h => h.id === reg.houseId);
        const category = student ? (getStudentCategory(student) || 'General') : 'General';
        return { reg, student, house, category };
    });

    if (catFilter !== 'ALL') {
        enriched = enriched.filter(item => item.category === catFilter);
    }

    // 4. Sort: Category -> Chest Number (natural numeric) -> Student Name
    enriched.sort((a, b) => {
        const catCmp = a.category.localeCompare(b.category);
        if (catCmp !== 0) return catCmp;

        const chestA = String(a.reg.chestNo || '').trim();
        const chestB = String(b.reg.chestNo || '').trim();
        if (chestA && chestB) {
            return chestA.localeCompare(chestB, undefined, { numeric: true, sensitivity: 'base' });
        }
        if (chestA && !chestB) return -1;
        if (!chestA && chestB) return 1;

        return (a.student?.name || a.reg.studentName || '').localeCompare(b.student?.name || b.reg.studentName || '');
    });

    // 5. Build Table Rows with Category Divider Rows
    let currentCategory = null;
    const totalColumns = 4 + events.length; // Chest + Name + Class + House + Events

    let tableRows = '';
    enriched.forEach(item => {
        const { reg, student, house, category } = item;

        // Insert full-width category divider when grouping shifts
        if (category !== currentCategory) {
            currentCategory = category;
            tableRows += `
                <tr style="background-color: #f1f3f5; font-weight: bold;">
                    <td colspan="${totalColumns}" style="padding: 6px 10px; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.5px; border-top: 2px solid #ced4da; border-bottom: 2px solid #ced4da; color: #212529;">
                        Category: ${currentCategory}
                    </td>
                </tr>
            `;
        }

        // Match if student is registered for ANY ID under this unique event name
        const checkCells = events.map(evGroup => {
            const hasEvent = (reg.events || []).some(id => evGroup.eventIds.has(id));
            return `<td style="text-align: center; width: 26px; font-weight: bold; color: ${hasEvent ? '#000' : 'transparent'}; border-left: 1px solid #dee2e6;">${hasEvent ? '&#10003;' : ''}</td>`;
        }).join('');

        tableRows += `
            <tr>
                <td style="text-align: center; font-weight: 600; white-space: nowrap;">${reg.chestNo || '-'}</td>
                <td style="white-space: nowrap;"><strong>${student?.name || reg.studentName || 'Unknown'}</strong></td>
                <td style="white-space: nowrap; text-align: center;">${getStudentClassName(student?.classId, student?.division) || '-'}</td>
                <td style="white-space: nowrap;">${house?.name || 'N/A'}</td>
                ${checkCells}
            </tr>
        `;
    });

    if (enriched.length === 0) {
        tableRows = `<tr><td colspan="${totalColumns}" style="text-align: center; padding: 24px; color: #6c757d;">No participants match the selected criteria.</td></tr>`;
    }

    // 6. Vertical Column Headers for Event Names
    const eventHeaders = events.map(e => `
        <th style="height: 140px; vertical-align: bottom; padding: 4px 2px; width: 26px; min-width: 26px; border-left: 1px solid #dee2e6;">
            <div style="writing-mode: vertical-rl; transform: rotate(180deg); font-size: 7.5pt; white-space: nowrap; line-height: 1; max-height: 130px; overflow: hidden; text-overflow: ellipsis;" title="${e.displayName}">
                ${e.displayName}
            </div>
        </th>
    `).join('');

    const targetHouse = state.festHouses.find(h => h.id === houseFilter);

    // 7. Render Printable Output
    const contentHtml = `
        <div style="text-align: center; margin-bottom: 12px;">
            <h2 style="margin: 0; font-size: 16pt;">${fest.name}</h2>
            <h4 style="margin: 3px 0; color: #495057; font-size: 10.5pt;">Participant Event Enrollment Roll Matrix</h4>
            <div style="font-size: 8pt; color: #6c757d; margin-top: 3px;">
                <strong>Category:</strong> ${catFilter} | 
                <strong>House:</strong> ${targetHouse?.name || houseFilter} | 
                <strong>Stage Type:</strong> ${typeFilter} | 
                <strong>Total Students:</strong> ${enriched.length} | 
                <strong>Unique Events:</strong> ${events.length}
            </div>
        </div>

        <table class="table table-bordered table-sm" style="width: 100%; border-collapse: collapse; font-size: 8pt;">
            <thead class="table-light">
                <tr>
                    <th style="width: 55px; text-align: center; vertical-align: middle;">Chest</th>
                    <th style="min-width: 140px; vertical-align: middle;">Name</th>
                    <th style="width: 60px; text-align: center; vertical-align: middle;">Class</th>
                    <th style="width: 80px; vertical-align: middle;">House</th>
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
        title: `RollCall_${fest.name.replace(/\s+/g, '_')}_${catFilter}`,
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
