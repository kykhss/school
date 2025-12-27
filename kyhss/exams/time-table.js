
// Updated to work with the new (old) schedule structure
window.renderExamTimetableView = () => {
    const container = document.getElementById('timetable-view');
    if (!container) return;

    container.innerHTML = `
        <div class="row g-3 align-items-end border-bottom pb-3 mb-3">
            <div class="col-md-4"><label class="form-label fw-bold">Exam</label><select id="tt-view-exam" class="form-select">${exams.map(ex=>`<option value="${ex.id}">${ex.name}</option>`).join('')}</select></div>
            <div class="col-md-4"><label class="form-label fw-bold">Class</label><select id="tt-view-class" class="form-select">${classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        </div>
        <div class="d-flex justify-content-end mt-3">
    <button class="btn btn-outline-primary" onclick="window.printExamTimetable()">
        <i class="fa fa-print me-1"></i> Print Timetable
    </button>
</div>

        <div id="timetable-display-container"></div>
    `;

    const examSelect = document.getElementById('tt-view-exam');
    const classSelect = document.getElementById('tt-view-class');
    // After setting innerHTML, find the active exam and set the value
const firstActiveExam = exams.find(ex => ex.isActive);
if (firstActiveExam) {
    examSelect.value = firstActiveExam.id;
}
    const displayTimetableAll = () => {
        const examId = examSelect.value;
        const classId = classSelect.value;
        if (examId && classId) {
            const classData = classes.find(c => c.id === classId);
            const divisions = ['A'];// classData ? classData.divisions : [];
            const schedules = examSchedules.filter(s => s.examId === examId && s.classId === classId);
            const displayContainer = document.getElementById('timetable-display-container');
            
            let html = '';
            divisions.forEach(division => {
                const divSchedules = schedules.filter(s => s.division === division)
                    .sort((a, b) => new Date(a.date) - new Date(b.date) || a.session.localeCompare(b.session));
                
                html += `<h4 class="mt-4">Timetable for ${classData.name} - ${division}</h4>`;
                if (divSchedules.length === 0) {
                    html += `<p class="text-muted">No schedule published for this division.</p>`;
                    return;
                }

                html += `<table class="table table-striped table-bordered">
                    <thead class="table-light"><tr><th>Date</th><th>Session</th><th>Subject</th></tr></thead>
                    <tbody>`;
                divSchedules.forEach(s => {
                    const subject = subjects.find(sub => sub.id === s.subjectId);
                    html += `<tr>
                        <td>${new Date(s.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                        <td>${s.session || 'N/A'}</td>
                        <td class="fw-bold">${subject ? subject.name : 'Unknown'}</td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            });
            displayContainer.innerHTML = html;
        }
    };
    

    const displayTimetable = () => {
    const examId = examSelect.value;
    if (!examId) return;

    const displayContainer = document.getElementById('timetable-display-container');
    let html = '';

    classes.forEach(classData => {
        const divisions = ['A'];// classData.divisions || [];
        const schedules = examSchedules.filter(s => s.examId === examId && s.classId === classData.id);

        divisions.forEach(division => {
            const divSchedules = schedules
                .filter(s => s.division === division)
                .sort((a, b) => new Date(a.date) - new Date(b.date) || a.session.localeCompare(b.session));

            html += `<h4 class="mt-4">Timetable for ${classData.name} - ${division}</h4>`;

            if (divSchedules.length === 0) {
                html += `<p class="text-muted">No schedule published for this division.</p>`;
                return;
            }

            html += `<table class="table table-striped table-bordered">
                <thead class="table-light">
                    <tr><th>Date</th><th>Session</th><th>Subject</th></tr>
                </thead>
                <tbody>`;

            divSchedules.forEach(s => {
                const subject = subjects.find(sub => sub.id === s.subjectId);
                html += `<tr>
                    <td>${new Date(s.date).toLocaleDateString('en-GB', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}</td>
                    <td>${s.session || 'N/A'}</td>
                    <td class="fw-bold">${subject ? subject.name : 'Unknown'}</td>
                </tr>`;
            });

            html += `</tbody></table>`;
        });
    });

    displayContainer.innerHTML = html || '<p class="text-muted">No schedules found.</p>';
};

    examSelect.addEventListener('change', displayTimetable);
    classSelect.addEventListener('change', displayTimetable);
    if (exams.length > 0 && classes.length > 0) displayTimetable();
}

/**
 * Renders the filters (Exam, Division) for the Consolidated Timetable view.
 */

window.renderConsolidatedTimetableView = () => {
    const container = document.getElementById('consolidated-view');
    if (!container) return;

    const allDivisions = [...new Set(classes.flatMap(c => c.divisions))].sort();

    container.innerHTML = `
        <div class="row g-3 align-items-end border-bottom pb-3 mb-3">
            <div class="col-md-4">
                <label class="form-label fw-bold">Select Exam</label>
                <select id="consolidated-exam" class="form-select">${exams.map(ex => `<option value="${ex.id}">${ex.name}</option>`).join('')}</select>
            </div>
            <div class="col-md-4">
                <label class="form-label fw-bold">Select Division to View</label>
                <select id="consolidated-division" class="form-select">
                    ${allDivisions.map(d => `<option value="${d}">${d}</option>`).join('')}
                </select>
            </div>
            
            <div class="col-md-4 d-flex align-items-end">
                <button class="btn btn-secondary w-100" onclick="window.printConsolidatedTimetable()">
                    <i class="fas fa-print me-2"></i>Print Timetable
                </button>
            </div>
        </div>
        <div id="consolidated-timetable-container" class="mt-4 table-responsive">
            </div>
    `;

    const examSelect = document.getElementById('consolidated-exam');
    // After setting innerHTML, find the active exam and set the value
const firstActiveExam = exams.find(ex => ex.isActive);
if (firstActiveExam) {
    examSelect.value = firstActiveExam.id;
}
    const divisionSelect = document.getElementById('consolidated-division');
// --- THIS IS THE NEW LOGIC ---
    if (window.selectedExamForControl) {
        examSelect.value = window.selectedExamForControl;
        examSelect.readOnly = true;
    }
    const displayTable = () => {
        displayConsolidatedTimetable(examSelect.value, divisionSelect.value);
    };

    examSelect.addEventListener('change', displayTable);
    divisionSelect.addEventListener('change', displayTable);

    if (exams.length > 0 && allDivisions.length > 0) {
        displayTable();
    }
}
/**
 * Gathers data and prints the consolidated exam timetable.
 */
window.printConsolidatedTimetable = () => {
    const container = document.getElementById('consolidated-timetable-container');
    const examSelect = document.getElementById('consolidated-exam');
    const divisionSelect = document.getElementById('consolidated-division');

    // Check if there is content to print
    if (!container || !container.querySelector('table')) {
        showAlert('Please generate a timetable before printing.', 'warning');
        return;
    }

    const examName = examSelect.options[examSelect.selectedIndex].text;
    const division = divisionSelect.value;
    const reportTitle = "Consolidated Examination Timetable";
    const subTitle = `Exam: ${examName} | Division: ${division}`;

    // Create a professional header for the printout
    const headerHtml = `
        <div style='text-align: center; margin-bottom: 20px;'>
            ${schoolDetails.logoUrl ? `<img src="${schoolDetails.logoUrl}" alt="School Logo" style="max-height: 70px;">` : ''}
            <h3>${schoolDetails.name || 'School Name'}</h3>
            <h4>${reportTitle}</h4>
            <p>${subTitle}</p>
        </div>
    `;

    // Use your existing print utility
    printContentOfDiv('consolidated-timetable-container', reportTitle, {
        customHeaderHtml: headerHtml,
        pageSize: 'A4 landscape', // Landscape is better for wide tables
        extraCss: `
            table { font-size: 0.8rem !important; }
            th, td { padding: 4px 6px !important; }
        `
    });
};

/**
 * Gathers data and renders the consolidated timetable grid.
 * @param {string} examId The selected exam.
 * @param {string} division The selected division to display for all classes.
 */
function displayConsolidatedTimetable(examId, division) {
    const container = document.getElementById('consolidated-timetable-container');
    if (!examId || !division) {
        container.innerHTML = '<p class="text-muted p-5 text-center">Please select an exam and a division.</p>';
        return;
    }

    // 1. Filter schedules for the selected exam and division
    const relevantSchedules = examSchedules.filter(s => s.examId === examId && s.division === division);
    
    // 2. Get a sorted list of unique dates from these schedules
    const uniqueDates = [...new Set(relevantSchedules.map(s => s.date))].sort();

    // 3. Get all classes that actually have the selected division
    const classesWithDivision = classes.filter(c => c.divisions.includes(division));

    if (uniqueDates.length === 0 || classesWithDivision.length === 0) {
        container.innerHTML = `<p class="alert alert-info">No exams scheduled for Division '${division}' in this exam.</p>`;
        return;
    }

    // 4. Transform the data into an easy-to-use map for rendering: { classId: { date: { FN: "Subject", AN: "Subject" } } }
    const timetableMap = {};
    relevantSchedules.forEach(s => {
        if (!timetableMap[s.classId]) timetableMap[s.classId] = {};
        if (!timetableMap[s.classId][s.date]) timetableMap[s.classId][s.date] = {};
        const subjectName = subjects.find(sub => sub.id === s.subjectId)?.name || 'N/A';
        timetableMap[s.classId][s.date][s.session] = subjectName;
    });

    // 5. Build the HTML table
    let tableHTML = `<table class="table table-bordered table-sm text-center" style="font-size: 0.8rem;">
                        <thead class="table-light align-middle">
                            <tr>
                                <th rowspan="2">Class</th>`;
    
    // Header Row 1: Dates with Colspan
    uniqueDates.forEach(date => {
        tableHTML += `<th colspan="2">${new Date(date).toLocaleDateString('en-GB', {weekday: 'short', day: '2-digit', month: 'short'})}</th>`;
    });
    tableHTML += `</tr><tr>`;

    // Header Row 2: FN/AN for each date
    uniqueDates.forEach(() => {
        tableHTML += `<th>FN</th><th>AN</th>`;
    });
    tableHTML += `</tr></thead><tbody>`;

    // Body Rows: One row for each class
    classesWithDivision.forEach(classData => {
        tableHTML += `<tr><td class="fw-bold">${classData.name}</td>`;
        uniqueDates.forEach(date => {
            const fnSubject = timetableMap[classData.id]?.[date]?.FN || '-';
            const anSubject = timetableMap[classData.id]?.[date]?.AN || '-';
            tableHTML += `<td>${fnSubject}</td><td>${anSubject}</td>`;
        });
        tableHTML += `</tr>`;
    });

    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}