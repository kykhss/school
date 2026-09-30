// =========================================================================
// --- FEST REPORTS & TABULATION MODULE (fest-reports.js) ---
// =========================================================================

import { 
    state, 
    getStudentClassName, 
    getStudentCategory 
} from "./app-state.js";

import { 
    db, 
    systemContext,
    saveScopedDoc,
    getScopedDoc 
} from "./firebase-config.js";

import { 
    doc, 
    getDoc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
            <!-- Card 1: Final Standings & Score Aggregation with Stage Filter -->
<div class="col-md-6">
    <div class="ui-card h-100 d-flex flex-column">
        <h6 class="fw-bold mb-1"><i class="fas fa-trophy text-warning me-2"></i>House Championship Standings</h6>
        <p class="small text-muted mb-2">Category, gender (Boys/Girls), and stage-wise breakdown of house championship points.</p>
        
        <div class="mb-3">
            <label class="small fw-bold mb-1" for="house-standings-stage-filter">Filter Stage Type:</label>
            <select id="house-standings-stage-filter" class="form-select form-select-sm">
                <option value="both">Both (On-Stage & Off-Stage Overall)</option>
                <option value="onStage">On-Stage Events Only</option>
                <option value="offStage">Off-Stage Events Only</option>
            </select>
        </div>

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
            <!-- Card: Participant-Wise Detailed Results -->
<div class="col-md-6">
    <div class="ui-card h-100 d-flex flex-column">
        <h6 class="fw-bold mb-1"><i class="fas fa-list-ol text-success me-2"></i>Participant-Wise Results</h6>
        <p class="small text-muted mb-2">Statement of student results filtered by stage and mode with individual placement breakdowns.</p>
        
        <div class="row g-2 mb-3">
            <div class="col-6">
                <label class="small fw-bold mb-1" for="participant-results-stage-filter">Stage Scope:</label>
                <select id="participant-results-stage-filter" class="form-select form-select-sm">
                    <option value="all">All Stages (On & Off)</option>
                    <option value="onStage">On-Stage Only</option>
                    <option value="offStage">Off-Stage Only</option>
                </select>
            </div>
            <div class="col-6">
                <label class="small fw-bold mb-1" for="participant-results-mode-filter">Event Mode:</label>
                <select id="participant-results-mode-filter" class="form-select form-select-sm">
                    <option value="all">All Modes (Solo & Group)</option>
                    <option value="solo">Solo Only</option>
                    <option value="group">Group Only</option>
                </select>
            </div>
        </div>

        <div class="mt-auto text-end">
            <button class="btn btn-sm btn-success" onclick="window.printParticipantWiseResults()">
                <i class="fas fa-file-invoice me-1"></i>Print Participant Results
            </button>
        </div>
    </div>
</div>

<div class="col-md-6">
    <div class="ui-card h-100 d-flex flex-column">
        <h6 class="fw-bold mb-1"><i class="fas fa-medal text-primary me-2"></i>Event-Wise Results</h6>
        <p class="small text-muted mb-2">Detailed event ledger listing all finalized events with 1st, 2nd, and 3rd rank winners, houses, and scores.</p>
        
        <div class="row g-2 mb-3">
            <div class="col-6">
                <label class="small fw-bold mb-1" for="event-results-stage-filter">Stage Scope:</label>
                <select id="event-results-stage-filter" class="form-select form-select-sm">
                    <option value="all">All Stages (On & Off)</option>
                    <option value="onStage">On-Stage Only</option>
                    <option value="offStage">Off-Stage Only</option>
                </select>
            </div>
            <div class="col-6">
                <label class="small fw-bold mb-1" for="event-results-mode-filter">Event Mode:</label>
                <select id="event-results-mode-filter" class="form-select form-select-sm">
                    <option value="all">All Modes (Solo & Group)</option>
                    <option value="solo">Solo Only</option>
                    <option value="group">Group Only</option>
                </select>
            </div>
        </div>

        <div class="mt-auto text-end">
            <button class="btn btn-sm btn-primary" onclick="window.printEventWiseResults()">
                <i class="fas fa-file-pdf me-1"></i>Print Event Results
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

            <!-- Card 5: Chest Number Cards -->
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

            <!-- Card 6: Judge Cards -->
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

            <!-- Card 7: Blank Registration Form -->
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

            <!-- Card 8: Stage Announcement Sheet -->
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

            <!-- Card 9: Stage Call Sheets (Tearable Coupons) -->
            <div class="col-12">
                <div class="ui-card">
                    <h6 class="fw-bold mb-1"><i class="fas fa-bullhorn text-danger me-2"></i>Stage Call Sheets (Tearable Slips)</h6>
                    <p class="small text-muted mb-3">Generate printable slips with tear lines sorted by chest number for stage announcers.</p>
                    <div class="row g-2 align-items-end">
                        <div class="col-md-3">
                            <label class="small fw-bold">Category</label>
                            <select id="callsheet-category-filter" class="form-select form-select-sm">
                                <option value="ALL">All Categories</option>
                                ${[...new Set(events.map(e => e.category).filter(Boolean))].map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-md-6">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <label class="small fw-bold mb-0">Select Events</label>
                                <button class="btn btn-link btn-xs p-0 text-decoration-none" id="callsheet-select-all-btn" type="button">Select All</button>
                            </div>
                            <select id="callsheet-event-select" class="form-select form-select-sm" multiple size="5">
                                <!-- Populated dynamically by JS -->
                            </select>
                            <small class="text-muted">Hold Ctrl/Cmd to select multiple events</small>
                        </div>
                        <div class="col-md-3 d-grid">
                            <button class="btn btn-sm btn-danger fw-bold" id="btn-generate-callsheet" type="button">
                                <i class="fas fa-print me-1"></i>Print Stage Call Sheets
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // --- Tab Interactivity Listeners ---

    // Filter events for Judge Scorecard
    document.getElementById('report-ev-cat')?.addEventListener('change', (e) => {
        const cat = e.target.value;
        const selector = document.getElementById('report-ev-id');
        const filtered = cat === 'all' ? events : events.filter(ev => ev.category === cat);
        selector.innerHTML = filtered.map(ev => `<option value="${ev.id}">${ev.name} (${ev.category})</option>`).join('');
    });

    // Filter events for Judge Cards
    document.getElementById('judge-card-category')?.addEventListener('change', (e) => {
        const category = e.target.value;
        const selector = document.getElementById('judge-card-event');
        const filtered = category === 'ALL' ? events : events.filter(event => event.category === category);
        selector.innerHTML = `<option value="ALL">All Events</option>${filtered.map(event => `<option value="${event.id}">${event.name} (${event.category})</option>`).join('')}`;
    });

    // Setup Call Sheet Category & Select All Actions
    const catFilter = document.getElementById('callsheet-category-filter');
    const eventSelect = document.getElementById('callsheet-event-select');
    const selectAllBtn = document.getElementById('callsheet-select-all-btn');
    const printBtn = document.getElementById('btn-generate-callsheet');

    function updateCallSheetEventList(category = 'ALL') {
        if (!eventSelect) return;
        const filtered = events.filter(e => category === 'ALL' || e.category === category);
        eventSelect.innerHTML = filtered.map(e => 
            `<option value="${e.id}">${e.name} (${e.category || 'General'} - ${e.isGroupEvent ? 'Group' : 'Solo'})</option>`
        ).join('');
    }

    updateCallSheetEventList('ALL');

    catFilter?.addEventListener('change', (e) => {
        updateCallSheetEventList(e.target.value);
    });

    selectAllBtn?.addEventListener('click', () => {
        if (!eventSelect) return;
        const allSelected = Array.from(eventSelect.options).every(opt => opt.selected);
        Array.from(eventSelect.options).forEach(opt => opt.selected = !allSelected);
        selectAllBtn.textContent = allSelected ? 'Select All' : 'Deselect All';
    });

    printBtn?.addEventListener('click', () => {
        window.printStageCallSheets();
    });
};

// --- 2. HOUSE CHAMPIONSHIP STANDINGS ---

window.printFinalHouseRankings = function() {
    const fest = state.managingFest;
    if (!fest) return window.showAlert?.('Please select a fest first.', 'warning');

    const stageFilter = document.getElementById('house-standings-stage-filter')?.value || 'both';
    const { houseData, categories } = calculateDetailedStandings(fest.id);

    const sortedHouses = state.festHouses.map(h => {
        const data = houseData[h.id] || { total: 0, solo: 0, group: 0, onStage: 0, offStage: 0, categories: {} };
        let activeScore = data.total;
        if (stageFilter === 'onStage') activeScore = data.onStage;
        if (stageFilter === 'offStage') activeScore = data.offStage;

        return {
            id: h.id,
            name: h.name,
            color: h.color,
            data,
            activeScore
        };
    }).sort((a, b) => b.activeScore - a.activeScore);

    const filterTitle = stageFilter === 'onStage' 
        ? 'On-Stage Standings (Full Subtotal Hierarchy)' 
        : (stageFilter === 'offStage' ? 'Off-Stage Standings (Full Subtotal Hierarchy)' : 'House Championship Standings (Complete Matrix with All Subtotals)');

    const showOnStage = stageFilter === 'both' || stageFilter === 'onStage';
    const showOffStage = stageFilter === 'both' || stageFilter === 'offStage';

    // Per stage width: Solo (3 cols) + Group (3 cols) + Stage Tot (1 col) = 7 columns
    let catColSpan = 1; // Category total column
    if (showOnStage) catColSpan += 7;
    if (showOffStage) catColSpan += 7;

    // --- LEVEL 1: Category Names ---
    const level1CategoryHeaders = categories.map(cat => `
        <th colspan="${catColSpan}" class="text-center" style="border: 1px solid #64748b; background: #e2e8f0; font-size: 8pt; letter-spacing: 0.5px;">
            ${cat.toUpperCase()}
        </th>
    `).join('');

    // --- LEVEL 2: Stage Headers (7 cols each) ---
    const level2StageHeaders = categories.map(() => `
        ${showOnStage ? `<th colspan="7" class="text-center" style="background: #eef2ff; color: #3730a3; font-size: 7pt; border-right: 1px solid #cbd5e1;">ON-STAGE</th>` : ''}
        ${showOffStage ? `<th colspan="7" class="text-center" style="background: #ecfdf5; color: #065f46; font-size: 7pt; border-right: 1px solid #cbd5e1;">OFF-STAGE</th>` : ''}
        <th rowspan="3" style="width: 34px; text-align: center; vertical-align: middle; background: #e2e8f0; font-size: 7.5pt; font-weight: bold; border-right: 2px solid #94a3b8;">CAT<br>TOT</th>
    `).join('');

    // --- LEVEL 3: Mode Headers (Solo: 3 cols, Group: 3 cols, Stage Tot: 1 col) ---
    const level3ModeHeaders = categories.map(() => `
        ${showOnStage ? `
            <th colspan="3" class="text-center" style="background: #f8fafc; font-size: 6.5pt; border-right: 1px solid #e2e8f0;">SOLO</th>
            <th colspan="3" class="text-center" style="background: #f8fafc; font-size: 6.5pt; border-right: 1px solid #e2e8f0;">GROUP</th>
            <th rowspan="2" style="width: 28px; text-align: center; vertical-align: middle; background: #ede9fe; color: #4338ca; font-size: 6.5pt; font-weight: bold; border-right: 1px solid #cbd5e1;">STG<br>TOT</th>
        ` : ''}
        ${showOffStage ? `
            <th colspan="3" class="text-center" style="background: #f8fafc; font-size: 6.5pt; border-right: 1px solid #e2e8f0;">SOLO</th>
            <th colspan="3" class="text-center" style="background: #f8fafc; font-size: 6.5pt; border-right: 1px solid #e2e8f0;">GROUP</th>
            <th rowspan="2" style="width: 28px; text-align: center; vertical-align: middle; background: #d1fae5; color: #065f46; font-size: 6.5pt; font-weight: bold; border-right: 1px solid #cbd5e1;">STG<br>TOT</th>
        ` : ''}
    `).join('');

    // --- LEVEL 4: Sub-metrics (B | G | Tot) ---
    const level4SubHeaders = categories.map(() => `
        ${showOnStage ? `
            <th style="width: 17px; text-align: center; font-size: 6pt;">B</th>
            <th style="width: 17px; text-align: center; font-size: 6pt;">G</th>
            <th style="width: 20px; text-align: center; font-size: 6pt; font-weight: bold; background: #f1f5f9; border-right: 1px solid #cbd5e1;">Tot</th>
            <th style="width: 17px; text-align: center; font-size: 6pt;">B</th>
            <th style="width: 17px; text-align: center; font-size: 6pt;">G</th>
            <th style="width: 20px; text-align: center; font-size: 6pt; font-weight: bold; background: #f1f5f9; border-right: 1px solid #cbd5e1;">Tot</th>
        ` : ''}
        ${showOffStage ? `
            <th style="width: 17px; text-align: center; font-size: 6pt;">B</th>
            <th style="width: 17px; text-align: center; font-size: 6pt;">G</th>
            <th style="width: 20px; text-align: center; font-size: 6pt; font-weight: bold; background: #f1f5f9; border-right: 1px solid #cbd5e1;">Tot</th>
            <th style="width: 17px; text-align: center; font-size: 6pt;">B</th>
            <th style="width: 17px; text-align: center; font-size: 6pt;">G</th>
            <th style="width: 20px; text-align: center; font-size: 6pt; font-weight: bold; background: #f1f5f9; border-right: 1px solid #cbd5e1;">Tot</th>
        ` : ''}
    `).join('');

    // --- Table Body Data Rows ---
    const tableRows = sortedHouses.map((h, index) => {
        const catCells = categories.map(cat => {
            const c = h.data.categories[cat] || {
                total: 0,
                onStage: { total: 0, solo: { B: 0, G: 0, total: 0 }, group: { B: 0, G: 0, total: 0 } },
                offStage: { total: 0, solo: { B: 0, G: 0, total: 0 }, group: { B: 0, G: 0, total: 0 } }
            };

            let cells = '';

            // 1. On-Stage Block
            if (showOnStage) {
                const on = c.onStage;
                cells += `
                    <!-- On-Stage Solo (B, G, Tot) -->
                    <td style="text-align: center; font-size: 7pt;">${on.solo.B || '-'}</td>
                    <td style="text-align: center; font-size: 7pt;">${on.solo.G || '-'}</td>
                    <td style="text-align: center; font-size: 7pt; font-weight: bold; background: #f8fafc; border-right: 1px solid #cbd5e1;">${on.solo.total || '-'}</td>
                    
                    <!-- On-Stage Group (B, G, Tot) -->
                    <td style="text-align: center; font-size: 7pt;">${on.group.B || '-'}</td>
                    <td style="text-align: center; font-size: 7pt;">${on.group.G || '-'}</td>
                    <td style="text-align: center; font-size: 7pt; font-weight: bold; background: #f8fafc; border-right: 1px solid #cbd5e1;">${on.group.total || '-'}</td>
                    
                    <!-- On-Stage Total -->
                    <td style="text-align: center; font-size: 7.5pt; font-weight: bold; background: #ede9fe; color: #4338ca; border-right: 1px solid #cbd5e1;">${on.total || '-'}</td>
                `;
            }

            // 2. Off-Stage Block
            if (showOffStage) {
                const off = c.offStage;
                cells += `
                    <!-- Off-Stage Solo (B, G, Tot) -->
                    <td style="text-align: center; font-size: 7pt;">${off.solo.B || '-'}</td>
                    <td style="text-align: center; font-size: 7pt;">${off.solo.G || '-'}</td>
                    <td style="text-align: center; font-size: 7pt; font-weight: bold; background: #f8fafc; border-right: 1px solid #cbd5e1;">${off.solo.total || '-'}</td>
                    
                    <!-- Off-Stage Group (B, G, Tot) -->
                    <td style="text-align: center; font-size: 7pt;">${off.group.B || '-'}</td>
                    <td style="text-align: center; font-size: 7pt;">${off.group.G || '-'}</td>
                    <td style="text-align: center; font-size: 7pt; font-weight: bold; background: #f8fafc; border-right: 1px solid #cbd5e1;">${off.group.total || '-'}</td>
                    
                    <!-- Off-Stage Total -->
                    <td style="text-align: center; font-size: 7.5pt; font-weight: bold; background: #d1fae5; color: #065f46; border-right: 1px solid #cbd5e1;">${off.total || '-'}</td>
                `;
            }

            // 3. Category Grand Total Column
            cells += `
                <td style="text-align: center; font-size: 8pt; font-weight: bold; background: #f1f5f9; border-right: 2px solid #94a3b8;">
                    ${c.total || '-'}
                </td>
            `;

            return cells;
        }).join('');

        return `
            <tr style="height: 28px;">
                <td style="text-align: center; font-weight: bold; font-size: 8pt;">${index + 1}</td>
                <td style="white-space: nowrap; font-size: 8pt;">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${h.color || '#333'}; margin-right: 4px;"></span>
                    <strong>${h.name}</strong>
                </td>
                ${catCells}
                <!-- Overall Summary Totals -->
                <td style="text-align: center; font-size: 8pt; background: #fafafa;">${h.data.solo}</td>
                <td style="text-align: center; font-size: 8pt; background: #fafafa;">${h.data.group}</td>
                ${showOnStage ? `<td style="text-align: center; font-size: 8pt; background: #ede9fe; font-weight: 600;">${h.data.onStage}</td>` : ''}
                ${showOffStage ? `<td style="text-align: center; font-size: 8pt; background: #d1fae5; font-weight: 600;">${h.data.offStage}</td>` : ''}
                <td style="text-align: center; font-weight: bold; font-size: 9.5pt; color: #0d6efd; background: #e2e8f0;">
                    ${h.activeScore}
                </td>
            </tr>
        `;
    }).join('');

    const contentHtml = `
        <div style="text-align: center; margin-bottom: 12px; font-family: sans-serif;">
            <h2 style="margin: 0; font-size: 15pt;">${fest.name}</h2>
            <h4 style="margin: 3px 0; color: #334155; font-size: 10pt;">${filterTitle}</h4>
            <div style="font-size: 7.5pt; color: #64748b;">
                Academic Year: <strong>${systemContext.activeYearId || localStorage.getItem('activeYearId')}</strong> 
                &bull; Scope: <strong>${stageFilter.toUpperCase()}</strong> 
                &bull; Full Breakdown: Category &rarr; Stage (On/Off) &rarr; Mode (Solo/Group) &rarr; Gender (B/G) &rarr; Intermediate Subtotals
            </div>
        </div>

        <table class="table table-bordered table-sm" style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 7pt;" border="1" cellpadding="2">
            <thead>
                <!-- LEVEL 1: Category & Grand Summary -->
                <tr style="background: #f1f5f9;">
                    <th rowspan="4" style="width: 25px; text-align: center; vertical-align: middle;">#</th>
                    <th rowspan="4" style="min-width: 105px; vertical-align: middle;">HOUSE</th>
                    ${level1CategoryHeaders}
                    <th colspan="${2 + (showOnStage ? 1 : 0) + (showOffStage ? 1 : 0)}" class="text-center" style="background: #e2e8f0; font-size: 7pt;">OVERALL SUMMARY</th>
                    <th rowspan="4" style="width: 44px; text-align: center; vertical-align: middle; background: #cbd5e1; font-weight: bold; font-size: 7.5pt;">GRAND<br>TOTAL</th>
                </tr>
                <!-- LEVEL 2: Stage & Summary Subheaders -->
                <tr>
                    ${level2StageHeaders}
                    <th colspan="2" class="text-center" style="background: #f3f4f6; font-size: 6.5pt;">MODE</th>
                    ${showOnStage && showOffStage ? `<th colspan="2" class="text-center" style="background: #e5e7eb; font-size: 6.5pt;">STAGE</th>` : ''}
                    ${showOnStage && !showOffStage ? `<th rowspan="3" style="width: 30px; text-align: center; vertical-align: middle; font-size: 6.5pt; background: #ede9fe;">ON</th>` : ''}
                    ${!showOnStage && showOffStage ? `<th rowspan="3" style="width: 30px; text-align: center; vertical-align: middle; font-size: 6.5pt; background: #d1fae5;">OFF</th>` : ''}
                </tr>
                <!-- LEVEL 3: Mode & Mode Totals -->
                <tr>
                    ${level3ModeHeaders}
                    <th rowspan="2" style="width: 26px; text-align: center; vertical-align: middle; font-size: 6pt; background: #fafafa;">SOLO</th>
                    <th rowspan="2" style="width: 26px; text-align: center; vertical-align: middle; font-size: 6pt; background: #fafafa;">GRP</th>
                    ${showOnStage && showOffStage ? `
                        <th rowspan="2" style="width: 26px; text-align: center; vertical-align: middle; font-size: 6pt; background: #ede9fe;">ON</th>
                        <th rowspan="2" style="width: 26px; text-align: center; vertical-align: middle; font-size: 6pt; background: #d1fae5;">OFF</th>
                    ` : ''}
                </tr>
                <!-- LEVEL 4: Sub-metrics (B | G | Tot) -->
                <tr>
                    ${level4SubHeaders}
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>

        <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 8pt; font-family: sans-serif; page-break-inside: avoid;">
            <div>Prepared By: _______________________</div>
            <div>Tabulator Signature: _______________________</div>
            <div>Convener Signature: _______________________</div>
        </div>
    `;

    window.printReport({
        contentHtml,
        title: `Detailed_House_Standings_${fest.name.replace(/\s+/g, '_')}_${stageFilter}`,
        pageSize: 'A4 landscape',
        autoPrint: true
    });
};

function calculateDetailedStandings(festId) {
    const fest = state.managingFest;
    const categories = [...new Set(state.festEvents.filter(e => e.festId === festId).map(e => e.category || 'General'))].sort();

    const houseData = {};

    state.festHouses.forEach(h => {
        houseData[h.id] = {
            total: 0,
            solo: 0,
            group: 0,
            onStage: 0,
            offStage: 0,
            categories: {}
        };
        categories.forEach(cat => {
            houseData[h.id].categories[cat] = {
                total: 0,
                onStage: {
                    total: 0,
                    solo: { B: 0, G: 0, total: 0 },
                    group: { B: 0, G: 0, total: 0 }
                },
                offStage: {
                    total: 0,
                    solo: { B: 0, G: 0, total: 0 },
                    group: { B: 0, G: 0, total: 0 }
                }
            };
        });
    });

    const results = state.festResults.filter(r => r.festId === festId);

    results.forEach(res => {
        const ev = state.festEvents.find(e => e.id === res.eventId);
        if (!ev) return;

        const isGroup = Boolean(ev.isGroupEvent || ev.type === 'group');
        const isOffStage = (ev.type === 'offStage');
        const stageKey = isOffStage ? 'offStage' : 'onStage';
        const modeKey = isGroup ? 'group' : 'solo';
        const eventCat = ev.category || 'General';

        (res.results || []).forEach(item => {
            const pts = Number(item.points) || 0;
            if (pts <= 0) return;

            let targetHouseId = null;
            let gender = 'B';

            if (item.studentId) {
                const student = state.students.find(s => s.id === item.studentId);
                const reg = state.festRegistrations.find(r => r.studentId === item.studentId && r.festId === festId);
                targetHouseId = student?.houseId || reg?.houseId;
                gender = (student?.gender === 'F') ? 'G' : 'B';
            } else if (item.groupId) {
                const grp = state.festGroups.find(g => g.id === item.groupId);
                targetHouseId = grp?.houseId;
                const captain = grp?.members?.find(m => m.role === 'Captain' || m.isCaptain);
                const captainStudent = state.students.find(s => s.id === captain?.studentId);
                gender = (captainStudent?.gender === 'F') ? 'G' : 'B';
            }

            if (targetHouseId && houseData[targetHouseId]) {
                const h = houseData[targetHouseId];
                h.total += pts;
                h[stageKey] += pts;
                h[modeKey] += pts;

                if (!h.categories[eventCat]) {
                    h.categories[eventCat] = {
                        total: 0,
                        onStage: { total: 0, solo: { B: 0, G: 0, total: 0 }, group: { B: 0, G: 0, total: 0 } },
                        offStage: { total: 0, solo: { B: 0, G: 0, total: 0 }, group: { B: 0, G: 0, total: 0 } }
                    };
                }

                const catObj = h.categories[eventCat];
                catObj.total += pts;
                catObj[stageKey].total += pts;
                catObj[stageKey][modeKey].total += pts;
                catObj[stageKey][modeKey][gender] += pts;
            }
        });
    });

    return { houseData, categories };
}
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
    if (!fest) return window.showAlert?.('Please select a fest first.', 'warning');

    const results = state.festResults.filter(r => r.festId === fest.id);

    // Track points per student:
    // overall: total solo points
    // race: points from events matching RACE / sprints
    // jump: points from events matching JUMP
    // throw: points from events matching THROW / shot put / discus / javelin
    const studentScoreMap = {};

    results.forEach(res => {
        const ev = state.festEvents.find(e => e.id === res.eventId);
        if (!ev || ev.isGroupEvent) return; // Strict solo events

        const evName = (ev.name || '').toUpperCase();
        const isRace = evName.includes('RACE') || evName.includes('RUN') || evName.includes('100M') || evName.includes('200M') || evName.includes('400M') || evName.includes('HURDLE');
        const isJump = evName.includes('JUMP');
        const isThrow = evName.includes('THROW') || evName.includes('SHOT PUT') || evName.includes('DISCUS') || evName.includes('JAVELIN');

        res.results?.forEach(item => {
            const pts = Number(item.points) || 0;
            if (item.studentId && pts > 0) {
                if (!studentScoreMap[item.studentId]) {
                    studentScoreMap[item.studentId] = {
                        overall: 0,
                        race: 0,
                        jump: 0,
                        throw: 0
                    };
                }

                studentScoreMap[item.studentId].overall += pts;
                if (isRace) studentScoreMap[item.studentId].race += pts;
                if (isJump) studentScoreMap[item.studentId].jump += pts;
                if (isThrow) studentScoreMap[item.studentId].throw += pts;
            }
        });
    });

    // Populate full student metadata
    const parsedStudents = Object.entries(studentScoreMap).map(([studentId, scores]) => {
        const student = state.students.find(s => s.id === studentId);
        const registration = state.festRegistrations.find(r => r.studentId === studentId && r.festId === fest.id);
        const houseId = student?.houseId || registration?.houseId;
        const house = state.festHouses.find(h => h.id === houseId);
        const category = student ? (getStudentCategory(student) || 'General') : 'General';
        const gender = (student?.gender || 'M').toUpperCase();

        return {
            student,
            house,
            chestNo: registration?.chestNo || '-',
            scores,
            gender: gender === 'F' ? 'Female' : 'Male',
            category
        };
    });

    // Helper to render ranking tables
    function renderStandingsTable(title, list, scoreKey = 'overall', badgeColor = 'bg-primary') {
        const sorted = [...list]
            .filter(item => item.scores[scoreKey] > 0)
            .sort((a, b) => b.scores[scoreKey] - a.scores[scoreKey]);

        if (sorted.length === 0) return '';

        return `
            <div style="page-break-inside: avoid; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #212529; padding-bottom: 3px; margin-bottom: 6px;">
                    <h5 style="margin: 0; font-size: 11pt; font-weight: bold; color: #111;">${title}</h5>
                    <span style="font-size: 7.5pt; color: #555;">Top ${Math.min(sorted.length, 5)} Contenders</span>
                </div>
                <table class="table table-bordered table-sm" style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
                    <thead class="table-light">
                        <tr>
                            <th style="width: 7%; text-align: center;">Rank</th>
                            <th style="width: 10%; text-align: center;">Chest</th>
                            <th style="width: 33%;">Student Name</th>
                            <th style="width: 15%; text-align: center;">Class</th>
                            <th style="width: 20%;">House</th>
                            <th style="width: 15%; text-align: center;">Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sorted.slice(0, 5).map((item, index) => `
                            <tr>
                                <td class="text-center fw-bold">${index + 1}</td>
                                <td class="text-center font-monospace fw-bold">${item.chestNo}</td>
                                <td><strong>${item.student?.name || 'Unknown'}</strong></td>
                                <td class="text-center">${getStudentClassName(item.student?.classId, item.student?.division) || '-'}</td>
                                <td>${item.house?.name || 'N/A'}</td>
                                <td class="text-center fw-bold" style="font-size: 9.5pt;">${item.scores[scoreKey]}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // 1. Overall Kalaprathibha (Male) & Kalathilakam (Female)
    const overallBoys = parsedStudents.filter(s => s.gender === 'Male');
    const overallGirls = parsedStudents.filter(s => s.gender === 'Female');

    let contentHtml = `
        <div style="text-align: center; margin-bottom: 18px;">
            <h2 style="margin: 0; font-size: 16pt;">${fest.name}</h2>
            <h4 style="margin: 3px 0; color: #495057; font-size: 11.5pt;">Individual Championship & Special Discipline Standings</h4>
            <div style="font-size: 8pt; color: #6c757d;">Academic Year: ${systemContext.activeYearId || ''} &bull; Solo Event Standings</div>
        </div>

        <!-- SECTION 1: OVERALL CHAMPIONS (KALAPRATHIBHA & KALATHILAKAM) -->
        <div style="background: #f8f9fa; border-left: 4px solid #0d6efd; padding: 4px 10px; margin-bottom: 12px; font-weight: bold; font-size: 9pt; text-transform: uppercase;">
            Championship Titles (All Solo Events Combined)
        </div>
        ${renderStandingsTable('Kalaprathibha (Male Overall Champion)', overallBoys, 'overall')}
        ${renderStandingsTable('Kalathilakam (Female Overall Champion)', overallGirls, 'overall')}

        <!-- SECTION 2: SPECIAL ATHLETIC TITLES (RACE, JUMP, THROW) -->
        <div style="background: #f8f9fa; border-left: 4px solid #dc3545; padding: 4px 10px; margin-top: 15px; margin-bottom: 12px; font-weight: bold; font-size: 9pt; text-transform: uppercase;">
            Special Athletic Discipline Champions
        </div>
        <div style="display: grid; grid-template-columns: 1fr; gap: 4px;">
            ${renderStandingsTable('Sprint & Track Champion (RACE Events)', parsedStudents, 'race')}
            ${renderStandingsTable('Jump Champion (High, Long & Triple Jumps)', parsedStudents, 'jump')}
            ${renderStandingsTable('Throw Champion (Shot Put, Discus & Javelin)', parsedStudents, 'throw')}
        </div>

        <!-- SECTION 3: CATEGORY & GENDER-WISE LEADERS -->
        <div style="background: #f8f9fa; border-left: 4px solid #198754; padding: 4px 10px; margin-top: 15px; margin-bottom: 12px; font-weight: bold; font-size: 9pt; text-transform: uppercase;">
            Category & Gender-Wise Individual Champions
        </div>
    `;

    // Extract all unique categories present in the fest
    const categories = [...new Set(parsedStudents.map(s => s.category).filter(Boolean))].sort();

    categories.forEach(cat => {
        const catBoys = parsedStudents.filter(s => s.category === cat && s.gender === 'Male');
        const catGirls = parsedStudents.filter(s => s.category === cat && s.gender === 'Female');

        const boysTable = renderStandingsTable(`${cat} Category - Boys Champion`, catBoys, 'overall');
        const girlsTable = renderStandingsTable(`${cat} Category - Girls Champion`, catGirls, 'overall');

        if (boysTable || girlsTable) {
            contentHtml += `
                <div style="margin-top: 10px; page-break-inside: avoid;">
                    <div style="font-size: 9pt; font-weight: bold; color: #495057; border-bottom: 1px dashed #adb5bd; padding-bottom: 2px; margin-bottom: 8px;">
                        Category: ${cat}
                    </div>
                    ${boysTable}
                    ${girlsTable}
                </div>
            `;
        }
    });

    contentHtml += `
        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 8.5pt; page-break-inside: avoid;">
            <div>Tabulator Signature: _______________________</div>
            <div>Convener Signature: _______________________</div>
        </div>
    `;

    window.printReport({
        contentHtml,
        title: `Individual_Champions_${fest.name.replace(/\s+/g, '_')}`,
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

// --- 4. JUDGE SCORECARD WITH QR CODE & SHORT TOKENS ---

// Deterministic short hash generator
function generateShortToken(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36).substring(0, 4).toUpperCase();
}

/**
 * Gets or stores a 3-4 character token mapped to the event in Firestore.
 */
export async function getOrCreateEventToken(festId, eventId, judgeCode = '') {
    const yearId = systemContext.activeYearId || localStorage.getItem('activeYearId');
    const token = generateShortToken(`${festId}_${eventId}`);
    const tokenRef = doc(db, `academicYears/${yearId}/festTokens`, token);
    
    try {
        const snap = await getDoc(tokenRef);
        if (!snap.exists()) {
            await setDoc(tokenRef, {
                token: token,
                yearId: yearId,
                festId: festId,
                eventId: eventId,
                judgeCode: judgeCode || '',
                createdAt: new Date(),
                isDeleted: false
            });
        }
    } catch (e) {
        console.warn("[TOKEN-CACHE] Token read/write fallback:", e);
    }

    return token;
}
window.getOrCreateEventToken = getOrCreateEventToken;

window.printEventScorecard = async function() {
    const fest = state.managingFest;
    const select = document.getElementById('report-ev-id');
    if (!select) return;

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

    const yearId = systemContext.activeYearId || localStorage.getItem('activeYearId');
    const rootUrl = window.location.href.split('#')[0];
    const qrQueue = [];

    const tokenDataList = await Promise.all(
        selectedEvents.map(async (event, index) => {
            const shortToken = await getOrCreateEventToken(fest.id, event.id);
            const shortUrl = `${rootUrl}#j/${yearId}/${shortToken}`;
            const qrContainerId = `qr-target-${index}`;
            return { event, shortToken, shortUrl, qrContainerId, index };
        })
    );

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

            // 1. Sort Group Teams Alphabetically by Group Name
            const sortedGroups = [...groups].sort((a, b) => 
                (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
            );

            rowsHtml = sortedGroups.map(g => {
                const house = state.festHouses.find(h => h.id === g.houseId);
                const captain = g.members?.find(member => member.role === 'Captain' || member.isCaptain);
                const captainName = state.students.find(s => s.id === captain?.studentId)?.name || 'Not assigned';

                return `
                    <tr style="height: 40px;">
                        <td class="text-center" style="font-weight: 700;">${g.chestNo || g.code || '-'}</td>
                        <td>
                            <strong>${g.name}</strong>
                            <div class="small text-muted" style="font-size: 7.5pt;">Captain: ${captainName}</div>
                        </td>
                        <td>${house?.name || 'N/A'}</td>
                        <td style="width: 15%; text-align: center;"></td>
                        <td style="width: 20%;"></td>
                    </tr>
                `;
            }).join('');
        } else {
            // 2. Sort Solo Participants Alphabetically by Student Name
            const sortedParticipants = [...participants].sort((a, b) => {
                const studentA = state.students.find(s => s.id === a.studentId);
                const studentB = state.students.find(s => s.id === b.studentId);
                const nameA = a.studentName || studentA?.name || '';
                const nameB = b.studentName || studentB?.name || '';
                return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
            });

            rowsHtml = sortedParticipants.map(p => {
                const house = state.festHouses.find(h => h.id === p.houseId);
                const student = state.students.find(s => s.id === p.studentId);

                return `
                    <tr style="height: 35px;">
                        <td class="text-center" style="font-weight: 700;">${p.chestNo || 'N/A'}</td>
                        <td>
                            <strong>${p.studentName || student?.name || 'Student'}</strong>
                            <div class="small text-muted" style="font-size: 7.5pt;">Adm: ${student?.admissionNumber || 'N/A'}</div>
                        </td>
                        <td>${house?.name || 'N/A'}</td>
                        <td style="width: 15%; text-align: center;"></td>
                        <td style="width: 20%;"></td>
                    </tr>
                `;
            }).join('');
        }

        qrQueue.push({ containerId: qrContainerId, url: shortUrl });

        return `
            <div class="scorecard-page" style="width: 100%; box-sizing: border-box; min-height: 270mm; ${index > 0 ? 'page-break-before: always;' : ''} padding: 10mm 12mm;">
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

                    <div style="text-align: center; min-width: 95px; flex-shrink: 0;">
                        <div id="${qrContainerId}" style="width: 80px; height: 80px; display: inline-block;"></div>
                        <small style="font-size: 7pt; display: block; margin-top: 2px; font-weight: 600; color: #333;">SCAN TO SCORE</small>
                        <div style="font-family: monospace; font-size: 8pt; font-weight: bold; background: #e9ecef; border: 1px solid #ced4da; border-radius: 3px; padding: 1px 4px; margin-top: 2px; letter-spacing: 0.5px;">
                            ID: ${shortToken}
                        </div>
                    </div>
                </div>

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

                <div style="margin-top: 60px; display: flex; justify-content: space-around; font-size: 9pt;">
                    <div>Judge Name: _____________________</div>
                    <div>Judge Signature: _____________________</div>
                </div>
            </div>
        `;
    }).join('');

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

    let rawEvents = state.festEvents.filter(e => e.festId === fest.id);
    if (catFilter !== 'ALL') rawEvents = rawEvents.filter(e => e.category === catFilter);
    if (typeFilter !== 'ALL') rawEvents = rawEvents.filter(e => (e.type || 'onStage') === typeFilter);

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

    const events = Array.from(uniqueEventsMap.values()).sort((a, b) => 
        a.displayName.localeCompare(b.displayName, undefined, { numeric: true, sensitivity: 'base' })
    );

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

    let currentCategory = null;
    const totalColumns = 4 + events.length;

    let tableRows = '';
    enriched.forEach(item => {
        const { reg, student, house, category } = item;

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

    const eventHeaders = events.map(e => `
        <th style="height: 140px; vertical-align: bottom; padding: 4px 2px; width: 26px; min-width: 26px; border-left: 1px solid #dee2e6;">
            <div style="writing-mode: vertical-rl; transform: rotate(180deg); font-size: 7.5pt; white-space: nowrap; line-height: 1; max-height: 130px; overflow: hidden; text-overflow: ellipsis;" title="${e.displayName}">
                ${e.displayName}
            </div>
        </th>
    `).join('');

    const targetHouse = state.festHouses.find(h => h.id === houseFilter);

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
    const fest = state.fests?.find(item => item.id === festId) || state.managingFest;
    const events = state.festEvents
        .filter(event => event.festId === festId && (event.stage || 'Main Stage') === selectedStage)
        .sort((a, b) => a.name.localeCompare(b.name));
        
    let contentHtml = '';
    let participantsFound = false;

    events.forEach(event => {
        const isGroup = Boolean(event.isGroupEvent || event.type === 'group');
        const registrations = state.festRegistrations.filter(r => 
            r.festId === festId && 
            !r.isDeleted && 
            Array.isArray(r.events) && 
            r.events.includes(event.id)
        );

        if (registrations.length === 0) return;

        // Group participants by House
        const byHouse = {};

        if (isGroup) {
            const groups = state.festGroups.filter(g => 
                g.festId === festId && 
                !g.isDeleted && 
                (g.eventId === event.id || g.members?.some(m => registrations.some(r => r.studentId === m.studentId)))
            );

            if (!groups.length) return;
            participantsFound = true;

            groups.forEach(group => {
                const houseId = group.houseId || 'UNASSIGNED';
                (byHouse[houseId] ||= []).push({
                    chestNo: group.chestNo || group.code || '',
                    name: group.name
                });
            });
        } else {
            participantsFound = true;
            registrations.forEach(r => {
                const student = state.students.find(s => s.id === r.studentId);
                const houseId = r.houseId || 'UNASSIGNED';
                (byHouse[houseId] ||= []).push({
                    chestNo: r.chestNo || '',
                    name: student?.name || r.studentName || 'Unknown'
                });
            });
        }

        // Build house entries
        const houseSections = Object.keys(byHouse)
            .sort((a, b) => (state.festHouses.find(h => h.id === a)?.name || '').localeCompare(state.festHouses.find(h => h.id === b)?.name || ''))
            .map(houseId => {
                const house = state.festHouses.find(h => h.id === houseId);
                
                // Sort by chest number (numeric natural order), then by name
                const entries = byHouse[houseId].sort((a, b) => {
                    const cA = String(a.chestNo || '').trim();
                    const cB = String(b.chestNo || '').trim();
                    if (cA && cB) return cA.localeCompare(cB, undefined, { numeric: true, sensitivity: 'base' });
                    if (cA && !cB) return -1;
                    if (!cA && cB) return 1;
                    return a.name.localeCompare(b.name);
                });

                // Format as: "101 - John Doe, 102 - Jane Smith"
                const participantList = entries.map(item => {
                    return item.chestNo ? `<strong>${item.chestNo}</strong> - ${item.name}` : `${item.name}`;
                }).join(', ');

                return entries.length 
                    ? `<div style="margin-bottom: 6px;">
                         <span class="house-header" style="color: ${house?.color || '#000'}; font-weight: bold;">
                           ${house?.name || 'Unassigned'}:
                         </span> 
                         <span class="chest-number-list" style="color: #222;">${participantList}</span>
                       </div>` 
                    : '';
            }).join('');

        contentHtml += `
            <div class="announcement-section" style="page-break-inside: avoid; margin-bottom: 18px; border-bottom: 1px dashed #bbb; padding-bottom: 10px;">
                <h3 class="event-title" style="margin-bottom: 6px; font-size: 1.1rem; border-bottom: 1px solid #ccc; padding-bottom: 4px;">
                    ${event.name} 
                    <small class="text-muted" style="font-size: 0.85rem; font-weight: normal;">(${event.category || 'General'} &bull; ${isGroup ? 'Group' : 'Solo'})</small>
                </h3>
                ${houseSections}
            </div>
        `;
    });

    if (!participantsFound) {
        window.showAlert('No participants with chest numbers were found for this venue / stage.', 'info');
        return { contentHtml: null, reportTitle: '' };
    }

    return { 
        contentHtml: `
            <div style="text-align: center; margin-bottom: 15px;">
                <h2 style="margin: 0;">${fest.name}</h2>
                <h4 style="margin: 4px 0; color: #555;">Stage Announcement Sheet</h4>
                <div style="font-size: 9pt; color: #777;">
                    Venue / Stage: <strong>${selectedStage}</strong> &bull; Academic Year: <strong>${systemContext.activeYearId || ''}</strong>
                </div>
            </div>
            ${contentHtml}
        `, 
        reportTitle: `${fest.name}_${selectedStage}` 
    };
}

// --- 6. PRINT STAGE CALL SHEETS (TEARABLE COUPONS) ---

window.printStageCallSheets = function() {
    const fest = state.managingFest;
    const select = document.getElementById('callsheet-event-select');
    if (!select || !fest) return;

    const selectedEventIds = Array.from(select.selectedOptions).map(opt => opt.value).filter(Boolean);

    if (!selectedEventIds.length) {
        return window.showAlert ? window.showAlert('Please select at least one event for the call sheet.', 'warning') : alert('Please select at least one event.');
    }

    const targetEvents = selectedEventIds
        .map(id => state.festEvents.find(e => e.id === id))
        .filter(Boolean);

    const slipsHtml = targetEvents.map(event => {
        const isGroup = Boolean(event.isGroupEvent || event.type === 'group');
        const registrations = state.festRegistrations.filter(r => 
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
                (g.eventId === event.id || g.members?.some(m => registrations.some(p => p.studentId === m.studentId)))
            );

            rowsHtml = groups.map((g, idx) => {
                const house = state.festHouses.find(h => h.id === g.houseId);
                const captain = g.members?.find(m => m.role === 'Captain' || m.isCaptain);
                const captainName = state.students.find(s => s.id === captain?.studentId)?.name || 'Not assigned';

                return `
                    <tr style="height: 32px;">
                        <td style="text-align: center; font-weight: bold; font-size: 11pt;">${g.chestNo || g.code || (idx + 1)}</td>
                        <td>
                            <strong>${g.name}</strong>
                            <div style="font-size: 7.5pt; color: #555;">Lead: ${captainName} (${g.members?.length || 0} members)</div>
                        </td>
                        <td>${house?.name || 'N/A'}</td>
                        <td style="text-align: center; width: 40px;"><input type="checkbox" style="transform: scale(1.2);"></td>
                        <td style="text-align: center; width: 40px;"><input type="checkbox" style="transform: scale(1.2);"></td>
                        <td style="text-align: center; width: 40px;"><input type="checkbox" style="transform: scale(1.2);"></td>
                        <td style="width: 70px;"></td>
                    </tr>
                `;
            }).join('');
        } else {
            const sorted = [...registrations].sort((a, b) => {
                const cA = String(a.chestNo || '').trim();
                const cB = String(b.chestNo || '').trim();
                if (cA && cB) return cA.localeCompare(cB, undefined, { numeric: true, sensitivity: 'base' });
                if (cA && !cB) return -1;
                if (!cA && cB) return 1;
                return (a.studentName || '').localeCompare(b.studentName || '');
            });

            rowsHtml = sorted.map((p, idx) => {
                const house = state.festHouses.find(h => h.id === p.houseId);
                const student = state.students.find(s => s.id === p.studentId);

                return `
                    <tr style="height: 30px;">
                        <td style="text-align: center; font-weight: bold; font-size: 11pt;">${p.chestNo || (idx + 1)}</td>
                        <td>
                            <strong>${p.studentName}</strong>
                            <span style="font-size: 7.5pt; color: #666; margin-left: 4px;">(Adm: ${student?.admissionNumber || 'N/A'})</span>
                        </td>
                        <td>${house?.name || 'N/A'}</td>
                        <td style="text-align: center; width: 40px;"><input type="checkbox" style="transform: scale(1.2);"></td>
                        <td style="text-align: center; width: 40px;"><input type="checkbox" style="transform: scale(1.2);"></td>
                        <td style="text-align: center; width: 40px;"><input type="checkbox" style="transform: scale(1.2);"></td>
                        <td style="width: 70px;"></td>
                    </tr>
                `;
            }).join('');
        }

        return `
            <div class="call-sheet-coupon" style="page-break-inside: avoid; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px dashed #666; font-family: sans-serif;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px;">
                    <div>
                        <span style="font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: #555;">${fest.name} &bull; STAGE CALL SHEET</span>
                        <h3 style="margin: 2px 0 0 0; font-size: 13pt; font-weight: bold; color: #111;">
                            ${event.name} 
                            <span style="font-size: 9pt; font-weight: normal; color: #444;">(${event.category || 'General'} - ${isGroup ? 'Group' : 'Solo'})</span>
                        </h3>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: inline-block; font-size: 8pt; font-weight: bold; background: #e2e8f0; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px;">
                            Stage: ${event.stage || 'Main Stage'}
                        </span>
                        <div style="font-size: 7.5pt; color: #777; margin-top: 2px;">
                            <i class="fas fa-scissors"></i> Tear Along Line
                        </div>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;" border="1" cellpadding="3">
                    <thead style="background-color: #f1f5f9;">
                        <tr>
                            <th style="width: 12%; text-align: center;">CHEST NO</th>
                            <th style="width: 38%; text-align: left;">PARTICIPANT / GROUP</th>
                            <th style="width: 18%; text-align: left;">HOUSE</th>
                            <th style="width: 7%; text-align: center;">1st Call</th>
                            <th style="width: 7%; text-align: center;">2nd Call</th>
                            <th style="width: 7%; text-align: center;">3rd Call</th>
                            <th style="width: 11%; text-align: center;">Reported</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || '<tr><td colspan="7" style="text-align:center; color:#888; padding: 10px;">No registered participants for this event.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    }).join('');

    window.printReport({
        contentHtml: `
            <div style="padding: 10px;">
                ${slipsHtml}
            </div>
        `,
        title: `Stage_CallSheets_${fest.name.replace(/\s+/g, '_')}`,
        pageSize: 'A4 portrait',
        autoPrint: true
    });
};

/**
 * Generates participant-wise report showing placed events, individual points,
 * and grand total sorted in descending order.
 */
window.printParticipantWiseResults = function() {
    const fest = state.managingFest;
    if (!fest) return window.showAlert?.('Please select a fest first.', 'warning');

    const stageFilter = document.getElementById('participant-results-stage-filter')?.value || 'all';
    const modeFilter = document.getElementById('participant-results-mode-filter')?.value || 'all';

    const results = state.festResults.filter(r => r.festId === fest.id);
    if (!results.length) {
        return window.showAlert?.('No published results found for this festival.', 'info');
    }

    // Map: { [studentId]: { total: 0, eventBreakdown: [] } }
    const studentScoreMap = {};

    results.forEach(res => {
        const ev = state.festEvents.find(e => e.id === res.eventId);
        if (!ev) return;

        const isGroup = Boolean(ev.isGroupEvent || ev.type === 'group');
        const isOffStage = (ev.type === 'offStage');

        // Apply Stage Filter (On-Stage vs Off-Stage)
        if (stageFilter === 'onStage' && isOffStage) return;
        if (stageFilter === 'offStage' && !isOffStage) return;

        // Apply Mode Filter (Solo vs Group)
        if (modeFilter === 'solo' && isGroup) return;
        if (modeFilter === 'group' && !isGroup) return;

        (res.results || []).forEach(item => {
            const pts = Number(item.points) || 0;
            if (pts <= 0) return;

            // 1. Solo Event Scoring
            if (item.studentId) {
                const sId = item.studentId;
                if (!studentScoreMap[sId]) {
                    studentScoreMap[sId] = { total: 0, eventBreakdown: [] };
                }
                studentScoreMap[sId].total += pts;
                studentScoreMap[sId].eventBreakdown.push({
                    eventName: ev.name,
                    category: ev.category || 'General',
                    isGroup: false,
                    isOffStage: isOffStage,
                    position: item.position,
                    points: pts
                });
            }

            // 2. Group Event Scoring (Credits points to all enrolled members)
            else if (item.groupId) {
                const grp = state.festGroups.find(g => g.id === item.groupId);
                (grp?.members || []).forEach(m => {
                    const sId = m.studentId;
                    if (!sId) return;

                    if (!studentScoreMap[sId]) {
                        studentScoreMap[sId] = { total: 0, eventBreakdown: [] };
                    }
                    studentScoreMap[sId].total += pts;
                    studentScoreMap[sId].eventBreakdown.push({
                        eventName: `${ev.name} (${grp.name || 'Group'})`,
                        category: ev.category || 'General',
                        isGroup: true,
                        isOffStage: isOffStage,
                        position: item.position,
                        points: pts
                    });
                });
            }
        });
    });

    // Populate roster and sort descending by points
    const participantsRoster = Object.entries(studentScoreMap)
        .map(([studentId, data]) => {
            const student = state.students.find(s => s.id === studentId);
            const registration = state.festRegistrations.find(r => r.studentId === studentId && r.festId === fest.id);
            const houseId = student?.houseId || registration?.houseId;
            const house = state.festHouses.find(h => h.id === houseId);
            const category = student ? (getStudentCategory(student) || 'General') : 'General';

            return {
                student,
                house,
                chestNo: registration?.chestNo || '-',
                category,
                totalPoints: data.total,
                eventBreakdown: data.eventBreakdown.sort((a, b) => a.position - b.position)
            };
        })
        .filter(p => p.totalPoints > 0)
        .sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            return String(a.chestNo).localeCompare(String(b.chestNo), undefined, { numeric: true });
        });

    if (!participantsRoster.length) {
        return window.showAlert?.('No participants matched the selected filters.', 'info');
    }

    // Dynamic Filter Title
    const stageLabel = stageFilter === 'onStage' ? 'On-Stage Only' : (stageFilter === 'offStage' ? 'Off-Stage Only' : 'All Stages');
    const modeLabel = modeFilter === 'solo' ? 'Solo Events Only' : (modeFilter === 'group' ? 'Group Events Only' : 'Solo & Group');
    const reportSubtitle = `${stageLabel} &bull; ${modeLabel}`;

    const tableRowsHtml = participantsRoster.map((item, index) => {
        const eventChips = item.eventBreakdown.map(ev => {
            const posText = ev.position === 1 ? '1st' : (ev.position === 2 ? '2nd' : (ev.position === 3 ? '3rd' : `${ev.position}th`));
            const posBadgeStyle = ev.position === 1 ? 'background: #fef3c7; color: #92400e; border: 1px solid #fcd34d;' :
                                  (ev.position === 2 ? 'background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;' :
                                  'background: #ffedd5; color: #9a3412; border: 1px solid #fed7aa;');
            
            const stageIcon = ev.isOffStage 
                ? '<span style="color: #059669; font-weight: bold; margin-right: 2px;">[Off]</span>' 
                : '<span style="color: #4f46e5; font-weight: bold; margin-right: 2px;">[On]</span>';

            const modeBadge = ev.isGroup
                ? '<span style="background: #e0f2fe; color: #0369a1; border-radius: 2px; padding: 0 3px; font-size: 6.5pt; margin-left: 2px;">Grp</span>'
                : '<span style="background: #f3f4f6; color: #374151; border-radius: 2px; padding: 0 3px; font-size: 6.5pt; margin-left: 2px;">Solo</span>';

            return `
                <div style="display: inline-block; margin: 2px; padding: 2px 5px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; font-size: 7.2pt; line-height: 1.2;">
                    ${stageIcon}
                    <strong>${ev.eventName}</strong> 
                    <span style="display: inline-block; border-radius: 3px; font-size: 6.8pt; padding: 0 3px; font-weight: bold; ${posBadgeStyle}">${posText}</span> 
                    ${modeBadge}
                    <span style="color: #16a34a; font-family: monospace; font-weight: bold; margin-left: 2px;">+${ev.points}</span>
                </div>
            `;
        }).join('');

        return `
            <tr style="height: 30px;">
                <td style="text-align: center; font-weight: bold; font-size: 8.5pt;">${index + 1}</td>
                <td style="text-align: center; font-family: monospace; font-weight: bold; font-size: 9pt;">${item.chestNo}</td>
                <td>
                    <div style="font-weight: bold; font-size: 8.5pt;">${item.student?.name || 'Unknown Student'}</div>
                    <small style="color: #64748b; font-size: 7pt;">Adm: ${item.student?.admissionNumber || 'N/A'}</small>
                </td>
                <td style="text-align: center; font-size: 8pt;">${getStudentClassName(item.student?.classId, item.student?.division) || '-'}</td>
                <td style="font-size: 8pt; white-space: nowrap;">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${item.house?.color || '#333'}; margin-right: 4px;"></span>
                    ${item.house?.name || 'N/A'}
                </td>
                <td style="text-align: center; font-size: 8pt;">${item.category}</td>
                <td style="padding: 3px 5px;">
                    ${eventChips}
                </td>
                <td style="text-align: center; font-family: monospace; font-weight: bold; font-size: 10pt; color: #0284c7; background: #f8fafc;">
                    ${item.totalPoints}
                </td>
            </tr>
        `;
    }).join('');

    const contentHtml = `
        <div style="text-align: center; margin-bottom: 12px; font-family: sans-serif;">
            <h2 style="margin: 0; font-size: 15pt;">${fest.name}</h2>
            <h4 style="margin: 3px 0; color: #334155; font-size: 10.5pt;">Participant-Wise Results & Points Aggregate</h4>
            <div style="font-size: 8pt; color: #64748b;">
                Scope: <strong>${reportSubtitle}</strong> 
                &bull; Total Ranked Students: <strong>${participantsRoster.length}</strong> 
                &bull; Sorted by Score (Descending)
            </div>
        </div>

        <table class="table table-bordered table-sm" style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 8pt;" border="1" cellpadding="3">
            <thead style="background: #f1f5f9;">
                <tr>
                    <th style="width: 4%; text-align: center;">Rank</th>
                    <th style="width: 7%; text-align: center;">Chest</th>
                    <th style="width: 18%;">Student Name</th>
                    <th style="width: 8%; text-align: center;">Class</th>
                    <th style="width: 12%;">House</th>
                    <th style="width: 9%; text-align: center;">Category</th>
                    <th style="width: 35%;">Events, Scope &amp; Placements</th>
                    <th style="width: 7%; text-align: center; background: #e2e8f0; font-weight: bold;">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${tableRowsHtml}
            </tbody>
        </table>

        <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 8pt; font-family: sans-serif; page-break-inside: avoid;">
            <div>Prepared By: _______________________</div>
            <div>Tabulator Signature: _______________________</div>
            <div>Convener Signature: _______________________</div>
        </div>
    `;

    window.printReport({
        contentHtml,
        title: `Participant_Results_${fest.name.replace(/\s+/g, '_')}_${stageFilter}_${modeFilter}`,
        pageSize: 'A4 landscape',
        autoPrint: true
    });
};

window.printEventWiseResults = function() {
    const fest = state.managingFest;
    if (!fest) return window.showAlert?.('Please select a fest first.', 'warning');

    const stageFilter = document.getElementById('event-results-stage-filter')?.value || 'all';
    const modeFilter = document.getElementById('event-results-mode-filter')?.value || 'all';

    const results = state.festResults.filter(r => r.festId === fest.id);
    if (!results.length) {
        return window.showAlert?.('No published results found for this festival.', 'info');
    }

    // Filter events matching active filters
    const filteredEvents = state.festEvents.filter(ev => {
        if (ev.festId !== fest.id || ev.cancelled === true) return false;
        
        const isGroup = Boolean(ev.isGroupEvent || ev.type === 'group');
        const isOffStage = (ev.type === 'offStage');

        if (stageFilter === 'onStage' && isOffStage) return false;
        if (stageFilter === 'offStage' && !isOffStage) return false;

        if (modeFilter === 'solo' && isGroup) return false;
        if (modeFilter === 'group' && !isGroup) return false;

        // Must have published result record
        return results.some(r => r.eventId === ev.id && (r.results || []).length > 0);
    });

    if (!filteredEvents.length) {
        return window.showAlert?.('No event results match the selected stage and mode filters.', 'info');
    }

    // Helper: Build participant display info for position cell
    function formatPlacementCell(standing, eventId) {
        if (!standing) return '<span style="color: #94a3b8; font-style: italic;">—</span>';

        let name = 'Unknown';
        let houseName = '—';
        let houseColor = '#333';
        let chestNo = '';
        let classStr = '';

        if (standing.groupId) {
            const grp = state.festGroups.find(g => g.id === standing.groupId);
            name = grp?.name || 'Group Team';
            const house = state.festHouses.find(h => h.id === grp?.houseId);
            houseName = house?.name || '—';
            houseColor = house?.color || '#333';
            
            const captain = grp?.members?.find(m => m.role === 'Captain');
            const captainStudent = state.students.find(s => s.id === captain?.studentId);
            if (captainStudent) {
                name += ` <span style="font-size: 6.5pt; color: #64748b;">(Capt: ${captainStudent.name})</span>`;
            }
        } else if (standing.studentId) {
            const student = state.students.find(s => s.id === standing.studentId);
            const reg = state.festRegistrations.find(r => r.studentId === standing.studentId && r.festId === fest.id);
            name = student?.name || reg?.studentName || 'Student';
            
            const houseId = student?.houseId || reg?.houseId;
            const house = state.festHouses.find(h => h.id === houseId);
            houseName = house?.name || '—';
            houseColor = house?.color || '#333';
            
            chestNo = reg?.chestNo ? `[#${reg.chestNo}] ` : '';
            classStr = getStudentClassName(student?.classId, student?.division);
        }

        const pts = Number(standing.points) || 0;

        return `
            <div style="font-size: 7.5pt; line-height: 1.25;">
                <div style="font-weight: bold; color: #0f172a;">
                    <span style="font-family: monospace; color: #2563eb;">${chestNo}</span>${name}
                    ${classStr ? `<small style="color: #64748b; font-weight: normal;">(${classStr})</small>` : ''}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1px;">
                    <span style="color: ${houseColor}; font-weight: 600; font-size: 7pt;">
                        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${houseColor}; margin-right: 3px;"></span>
                        ${houseName}
                    </span>
                    <span style="color: #16a34a; font-family: monospace; font-weight: bold; font-size: 7.5pt;">+${pts}</span>
                </div>
            </div>
        `;
    }

    const stageLabel = stageFilter === 'onStage' ? 'On-Stage Only' : (stageFilter === 'offStage' ? 'Off-Stage Only' : 'All Stages');
    const modeLabel = modeFilter === 'solo' ? 'Solo Events Only' : (modeFilter === 'group' ? 'Group Events Only' : 'Solo & Group');
    const reportSubtitle = `${stageLabel} &bull; ${modeLabel}`;

    const tableRowsHtml = filteredEvents.map((ev, index) => {
        const res = results.find(r => r.eventId === ev.id);
        const standings = (res?.results || []).sort((a, b) => a.position - b.position);

        const pos1 = standings.find(s => s.position === 1);
        const pos2 = standings.find(s => s.position === 2);
        const pos3 = standings.find(s => s.position === 3);

        const isOffStage = ev.type === 'offStage';
        const isGroup = Boolean(ev.isGroupEvent || ev.type === 'group');

        return `
            <tr style="height: 36px;">
                <td style="text-align: center; font-weight: bold; font-size: 8.5pt;">${index + 1}</td>
                <td>
                    <div style="font-weight: bold; font-size: 8.5pt; color: #0f172a;">${ev.name}</div>
                    <div style="font-size: 7pt; color: #64748b; margin-top: 1px;">
                        <span>${ev.category || 'General'}</span> &bull; 
                        <span>${ev.stage || 'Main Stage'}</span>
                    </div>
                </td>
                <td style="text-align: center; white-space: nowrap;">
                    <span style="display: inline-block; padding: 1px 4px; border-radius: 3px; font-size: 6.8pt; font-weight: bold; ${isOffStage ? 'background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;' : 'background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe;'}">
                        ${isOffStage ? 'Off-Stage' : 'On-Stage'}
                    </span>
                    <span style="display: inline-block; padding: 1px 4px; border-radius: 3px; font-size: 6.8pt; font-weight: bold; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; margin-left: 2px;">
                        ${isGroup ? 'Group' : 'Solo'}
                    </span>
                </td>
                <!-- 1st Position Cell -->
                <td style="background: #fffbeb; border-left: 2px solid #f59e0b; padding: 3px 6px;">
                    ${formatPlacementCell(pos1, ev.id)}
                </td>
                <!-- 2nd Position Cell -->
                <td style="background: #f8fafc; border-left: 2px solid #94a3b8; padding: 3px 6px;">
                    ${formatPlacementCell(pos2, ev.id)}
                </td>
                <!-- 3rd Position Cell -->
                <td style="background: #fef2f2; border-left: 2px solid #b45309; padding: 3px 6px;">
                    ${formatPlacementCell(pos3, ev.id)}
                </td>
            </tr>
        `;
    }).join('');

    const contentHtml = `
        <div style="text-align: center; margin-bottom: 12px; font-family: sans-serif;">
            <h2 style="margin: 0; font-size: 15pt;">${fest.name}</h2>
            <h4 style="margin: 3px 0; color: #334155; font-size: 11pt;">Event-Wise Final Placements & Score Ledger</h4>
            <div style="font-size: 8pt; color: #64748b;">
                Scope: <strong>${reportSubtitle}</strong> 
                &bull; Total Evaluated Events: <strong>${filteredEvents.length}</strong> 
                &bull; Academic Year: <strong>${systemContext.activeYearId || localStorage.getItem('activeYearId')}</strong>
            </div>
        </div>

        <table class="table table-bordered table-sm" style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 8pt;" border="1" cellpadding="3">
            <thead style="background: #f1f5f9;">
                <tr>
                    <th style="width: 4%; text-align: center;">#</th>
                    <th style="width: 22%;">Event &amp; Category</th>
                    <th style="width: 12%; text-align: center;">Scope / Mode</th>
                    <th style="width: 21%; text-align: center; background: #fef3c7; color: #92400e;">1st Place (Gold)</th>
                    <th style="width: 21%; text-align: center; background: #e2e8f0; color: #334155;">2nd Place (Silver)</th>
                    <th style="width: 20%; text-align: center; background: #ffedd5; color: #9a3412;">3rd Place (Bronze)</th>
                </tr>
            </thead>
            <tbody>
                ${tableRowsHtml}
            </tbody>
        </table>

        <div style="margin-top: 35px; display: flex; justify-content: space-between; font-size: 8pt; font-family: sans-serif; page-break-inside: avoid;">
            <div>Prepared By: _______________________</div>
            <div>Tabulator Signature: _______________________</div>
            <div>Convener Signature: _______________________</div>
        </div>
    `;

    window.printReport({
        contentHtml,
        title: `Event_Wise_Results_${fest.name.replace(/\s+/g, '_')}_${stageFilter}_${modeFilter}`,
        pageSize: 'A4 landscape',
        autoPrint: true
    });
};