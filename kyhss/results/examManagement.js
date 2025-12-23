        // --- EXAM MANAGEMENT (ENHANCED) ---

// This replaces the existing window.renderExamManagement function
// --- EXAM MANAGEMENT (ENHANCED) ---

/**
 * Renders the Exam Management module, dynamically creating tabs and content
 * based on the current user's role.
 */
window.renderExamManagement = () => {
    // 1. Determine user roles for access control
    const isAdmin = window.currentUserRole === 'admin';
    // Use optional chaining (?.) for safety in case selectedUser.roles is null/undefined
    const isExamController = window.currentUserRole === 'teacher' || window.selectedUser.roles?.includes('exam_controller');
    const mainContent = document.getElementById('main-content');
    const apptitle = document.getElementById('app-title');

    // 2. Check for permissions and render an access denied message if needed
    if (!isAdmin && !isExamController) {
        mainContent.innerHTML = `
            <div class="alert alert-danger">
                <h4>Access Denied</h4>
                <p>You do not have permission to access this module.</p>
            </div>`;
        return; // Stop execution if user lacks permission
    }

    // 3. Set the application title
    apptitle.textContent = 'Exam Management';

    // 4. Define tab configuration in a single, easy-to-manage array
    const tabsConfig = [
        { id: 'add-exam',          title: 'Add Exam',          roles: ['admin'],               renderFunc: renderExamAddTab },
        { id: 'schedule',          title: 'Schedule',          roles: ['admin', 'exam_controller'], renderFunc: renderExamScheduleTab },
        { id: 'timetable-view',    title: 'Timetable',         roles: ['admin', 'exam_controller'], renderFunc: renderExamTimetableView },
        { id: 'consolidated-view', title: 'Consolidated View', roles: ['admin', 'exam_controller'], renderFunc: renderConsolidatedTimetableView },
        { id: 'entry',             title: 'Mark Entry',        roles: ['admin', 'exam_controller'], renderFunc: renderMarkEntryTab },
        { id: 'entry-report',      title: 'Entry Report',      roles: ['admin', 'exam_controller'], renderFunc: renderEntryReportTab },
        { id: 'results',           title: 'Results',           roles: ['admin', 'exam_controller'], renderFunc: renderResultsTab }
    ];

    // 5. Filter the tabs to show only those the current user is allowed to see
    const visibleTabs = tabsConfig.filter(tab => {
        if (isAdmin && tab.roles.includes('admin')) return true;
        if (isExamController && tab.roles.includes('exam_controller')) return true;
        return false;
    });

    // 6. Generate the HTML for tab buttons and content panes from the filtered list
    const tabLinksHTML = visibleTabs.map(tab => `
        <li class="nav-item" role="presentation">
            <button class="nav-link" data-bs-toggle="tab" data-bs-target="#${tab.id}" type="button">
                ${tab.title}
            </button>
        </li>
    `).join('');

    const tabPanesHTML = visibleTabs.map(tab => `
        <div class="tab-pane fade p-4 overflow-auto" id="${tab.id}" role="tabpanel"></div>
    `).join('');

    // 7. Render the main structure into the DOM
    mainContent.innerHTML = `
        <div class="tabs-container">
            <ul class="nav nav-tabs d-flex flex-nowrap" id="examTab" role="tablist">
                ${tabLinksHTML}
            </ul>
        </div>
        <div class="tab-content card overflow-auto" id="examTabContent">
            ${tabPanesHTML}
        </div>`;

    // 8. Call the corresponding render function for each visible tab
    visibleTabs.forEach(tab => {
        if (typeof tab.renderFunc === 'function') {
            tab.renderFunc();
        }
    });

    // 9. Activate the first visible tab for a better user experience
    const firstVisibleTab = mainContent.querySelector('#examTab .nav-link');
    if (firstVisibleTab) {
        new bootstrap.Tab(firstVisibleTab).show();
    }
};
// Global variable to hold the complete, unfiltered report data
let reportData = [];

window.renderEntryReportTab = async () => {
    //await getData('marks');
    const container = document.getElementById('entry-report');
    if (!container) return;

    const isClassTeacher =  window.currentUserRole === 'teacher' && window.selectedUser.classCharge;

    // --- NEW: Conditional Tab UI ---
    const tabNav = isClassTeacher ? `
        <ul class="nav nav-tabs">
            <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#overall-report-pane">Overall Report</button></li>
            <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#my-class-pending-pane">My Class Pending</button></li>
        </ul>` : '';

    const tabContent = `
        <div class="tab-content">
            <div class="tab-pane fade show active" id="overall-report-pane">
                <div id="entry-report-container" class="mt-4">
                    <p class="text-muted text-center p-5">Please select an exam to view the detailed entry report.</p>
                </div>
            </div>
            ${isClassTeacher ? `
            <div class="tab-pane fade" id="my-class-pending-pane">
                <div id="my-class-pending-container" class="mt-4">
                    <p class="text-muted text-center p-5">Select an exam to see pending entries for your class.</p>
                </div>
            </div>` : ''}
        </div>`;

    container.innerHTML = `
    <div class="pb-3 border-bottom">
        <div class="row g-3 align-items-end border-bottom pb-3 mb-3 w-100">
            <div class="col-md-6">
                <label class="form-label fw-bold">Select Exam to Generate Report</label>
                <select id="entry-report-exam" class="form-select">
                    <option value="">-- Choose an Exam --</option>
                    ${exams.map(ex => `<option value="${ex.id}">${ex.name}</option>`).join('')}
                </select>
            </div>
        </div>
        ${tabNav}
        ${tabContent}
        </div>
    `;
    const examSelect = document.getElementById('entry-report-exam');
    // After setting innerHTML, find the active exam and set the value
const firstActiveExam = window.exams.find(ex => ex.isActive);
if (firstActiveExam) {
    examSelect.value = firstActiveExam.id;
}

    document.getElementById('entry-report-exam').addEventListener('change', async (e) => {
        await attachMarksListener(teacherAssignedClasses);
    
        const examId = e.target.value||firstActiveExam.id;
        if (examId) {
            generateEntryReport(examId); // Always generate the main report
            if (isClassTeacher) {
                renderMyClassPendingList(examId); // Also generate the teacher's pending list
            }
        } else {
            document.getElementById('entry-report-container').innerHTML = `<p class="text-muted text-center p-5">Please select an exam.</p>`;
            if (isClassTeacher) {
                document.getElementById('my-class-pending-container').innerHTML = `<p class="text-muted text-center p-5">Please select an exam.</p>`;
            }
        }
    });
}

/**
 * Generates the data for the main entry report and renders the controls and table.
 */
async function generateEntryReport(examId) {
    const container = document.getElementById('entry-report-container');
    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>`;

    let relevantSchedules = [];
    const isAdminOrController = currentUserRole === 'admin' || selectedUser.roles?.includes('exam_controller');

    if (isAdminOrController) {
        relevantSchedules = examSchedules.filter(s => s.examId === examId);
    } else if (currentUserRole === 'teacher') {
        const teacherAllocations = classroomSubjects.filter(cs => cs.teacherId === selectedUser.id);
        relevantSchedules = examSchedules.filter(s =>
            s.examId === examId && teacherAllocations.some(ta =>
                ta.classId === s.classId && ta.division === s.division && ta.subjectId === s.subjectId
            )
        );
    }

    if (relevantSchedules.length === 0) {
        container.innerHTML = `<div class="alert alert-warning">No mark entries found for your allocated subjects in this exam.</div>`;
        return;
    }
    
    const rawReportData = [];
    relevantSchedules.forEach(schedule => {
        const studentsInClass = students.filter(s => s.classId === schedule.classId && s.division === schedule.division);
        if (studentsInClass.length === 0) return;
        const enteredCount = studentsInClass.filter(student => marks[`${examId}_${student.id}_${schedule.subjectId}`]).length;
        
        rawReportData.push({
            classId: schedule.classId,
            className: classes.find(c => c.id === schedule.classId)?.name || 'N/A',
            division: schedule.division,
            subjectId: schedule.subjectId,
            subjectName: subjects.find(sub => sub.id === schedule.subjectId)?.name || 'N/A',
            total: studentsInClass.length,
            entered: enteredCount,
            pending: studentsInClass.length - enteredCount
        });
    });

    reportData = rawReportData.sort((a,b) => (a.className + a.division + a.subjectName).localeCompare(b.className + b.division + b.subjectName));
    renderReportControlsAndTable(examId);
}

/**
 * Renders the filters and the table for the overall report view.
 */
function renderReportControlsAndTable(examId) {
    const container = document.getElementById('entry-report-container');
    if (reportData.length === 0) {
        container.innerHTML = '<div class="alert alert-warning">No subjects scheduled for this exam.</div>';
        return;
    }
    
    const classOptions = [...new Set(reportData.map(d => d.classId))].map(id => `<option value="${id}">${classes.find(c => c.id === id)?.name || ''}</option>`).join('');
    const divisionOptions = [...new Set(reportData.map(d => d.division))].map(d => `<option value="${d}">${d}</option>`).join('');
    const subjectOptions = [...new Set(reportData.map(d => d.subjectId))].map(id => `<option value="${id}">${subjects.find(s => s.id === id)?.name || ''}</option>`).join('');

    container.innerHTML = `
        <div class="row g-3 align-items-end mb-3">
            <div class="col-md-3"><label class="form-label">Class</label><select id="report-filter-class" class="form-select"><option value="">All</option>${classOptions}</select></div>
            <div class="col-md-2"><label class="form-label">Division</label><select id="report-filter-division" class="form-select"><option value="">All</option>${divisionOptions}</select></div>
            <div class="col-md-3"><label class="form-label">Subject</label><select id="report-filter-subject" class="form-select"><option value="">All</option>${subjectOptions}</select></div>
            <div class="col-md-4 text-md-end">
                <button id="toggle-pending-btn" class="btn btn-outline-info btn-sm ${showPendingOnly ? 'active' : ''}"><i class="fas fa-exclamation-triangle me-1"></i> Show Pending Only</button>
                <button id="report-export-pdf-btn" class="btn btn-danger btn-sm"><i class="fas fa-file-pdf me-2"></i>Export as PDF</button>
            </div>
        </div>
        <div id="report-table-container"></div>`;

    document.getElementById('report-filter-class').addEventListener('change', filterAndRenderReport);
    document.getElementById('report-filter-division').addEventListener('change', filterAndRenderReport);
    document.getElementById('report-filter-subject').addEventListener('change', filterAndRenderReport);
    document.getElementById('report-export-pdf-btn').addEventListener('click', () => exportReportToPdf(examId));
    document.getElementById('toggle-pending-btn').addEventListener('click', (e) => {
        showPendingOnly = !showPendingOnly;
        e.currentTarget.classList.toggle('active', showPendingOnly);
        filterAndRenderReport();
    });

    filterAndRenderReport();
}

/**
 * Filters the global report data based on UI controls and renders the summary table.
 */
function filterAndRenderReport() {
    const classId = document.getElementById('report-filter-class').value;
    const division = document.getElementById('report-filter-division').value;
    const subjectId = document.getElementById('report-filter-subject').value;
    const examId = document.getElementById('entry-report-exam').value;

    let filteredData = [...reportData];
    if (classId) filteredData = filteredData.filter(d => d.classId === classId);
    if (division) filteredData = filteredData.filter(d => d.division === division);
    if (subjectId) filteredData = filteredData.filter(d => d.subjectId === subjectId);
    if (showPendingOnly) filteredData = filteredData.filter(row => row.pending > 0);
    
    renderSummaryTableHTML(filteredData, examId);
}

/**
 * Renders the HTML for the summary table.
 */
function renderSummaryTableHTML(displayData, examId) {
    const container = document.getElementById('report-table-container');
    if (!container) return;

    if (displayData.length === 0) {
        container.innerHTML = '<p class="text-muted text-center p-4">No matching entries found.</p>';
        return;
    }

    const tableHTML = `
        <h5 class="mb-3">Mark Entry Status for: <strong>${exams.find(e=>e.id===examId)?.name}</strong></h5>
        <div id="report-table-printable" class="table-responsive">
            <table class="table table-bordered table-hover table-sm">
                <thead class="table-light">
                    <tr><th>Class</th><th>Subject</th><th class="text-center">Total</th><th class="text-center text-success">Entered</th><th class="text-center text-danger">Pending</th><th class="text-center" style="width: 20%;">Status</th></tr>
                </thead>
                <tbody>
                    ${displayData.map(row => {
                        const percentage = row.total > 0 ? (row.entered / row.total) * 100 : 0;
                        const statusClass = percentage === 100 ? 'bg-success' : (percentage > 0 ? 'bg-warning' : 'bg-danger');
                        return `<tr><td>${row.className} - ${row.division}</td><td>${row.subjectName}</td><td class="text-center">${row.total}</td><td class="text-center">${row.entered}</td><td class="text-center">${row.pending}</td><td>
                            <div class="progress" style="height: 20px;"><div class="progress-bar ${statusClass}" role="progressbar" style="width: ${percentage}%;">${percentage.toFixed(0)}%</div></div>
                        </td></tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
    container.innerHTML = tableHTML;
}

/**
 * Renders a summary table for the class teacher showing the mark entry status
 * for each subject in their class for the selected exam.
 */
function renderMyClassPendingList(examId) {
    console.log(exams);
    const container = document.getElementById('my-class-pending-container');
    if (!container || !selectedUser.classCharge) return;

    const { classId, division } = selectedUser.classCharge;

    // FIXED: Correct exam lookup
    const exam = exams.find(e => e.id === examId);
    if (!exam) {
        container.innerHTML = '<div class="alert alert-danger">Invalid exam selected.</div>';
        return;
    }

    // Active students in class
    const studentsInClass = students.filter(s =>
        s.classId === classId &&
        s.division === division &&
        s.status !== 'TC Issued' &&
        s.status !== 'Graduated'
    );

    // Subjects already scheduled for this exam
    const relevantSchedules = examSchedules.filter(s =>
        s.examId === examId &&
        s.classId === classId &&
        s.division === division
    );

    // All subjects allocated to this class/division/sector
    const subjectsForClass = classroomSubjects.filter(cs =>
        cs.classId === classId &&
        cs.division === division
    );

    // Subjects not scheduled
    const scheduledSubjectIds = new Set(relevantSchedules.map(s => s.subjectId));
    const missingSubjects = subjectsForClass.filter(sub => {
    const subject = subjects.find(s => s.id === sub.subjectId);
    return subject && 
           subject.sector === exam.sector && 
           !scheduledSubjectIds.has(sub.subjectId);
});

        //console.log(missingSubjects);
    if (studentsInClass.length === 0) {
        container.innerHTML = '<div class="alert alert-info">There are no active students in your class.</div>';
        return;
    }

    // --- Calculate entry status ---
    const subjectStatusList = relevantSchedules.map(cs => {
        const subject = subjects.find(s => s.id === cs.subjectId);
        const totalStudents = studentsInClass.length;

        const enteredCount = studentsInClass.filter(student => {
            const markId = `${examId}_${student.id}_${cs.subjectId}`;
            return !!marks[markId];
        }).length;

        const pendingCount = totalStudents - enteredCount;
        const percentage = totalStudents > 0 ? (enteredCount / totalStudents) * 100 : 0;
        const statusClass =
            percentage === 100 ? 'bg-success' :
            percentage > 0 ? 'bg-warning' : 'bg-danger';

        return {
            subjectName: subject?.name || 'Unknown Subject',
            total: totalStudents,
            entered: enteredCount,
            pending: pendingCount,
            percentage,
            statusClass
        };
    }).sort((a, b) => a.subjectName.localeCompare(b.subjectName));

    // --- Render both tables ---
    const tableHtml = `
        <!-- Scheduled Subjects Summary Table -->
        <div class="table-responsive mb-4">
            <table class="table table-bordered table-hover table-sm">
                <thead class="table-light">
                    <tr>
                        <th>Subject</th>
                        <th class="text-center">Total Students</th>
                        <th class="text-center text-success">Entered</th>
                        <th class="text-center text-danger">Pending</th>
                        <th class="text-center" style="width: 25%;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${subjectStatusList.map(row => `
                        <tr>
                            <td>${row.subjectName}</td>
                            <td class="text-center">${row.total}</td>
                            <td class="text-center">${row.entered}</td>
                            <td class="text-center">${row.pending}</td>
                            <td>
                                <div class="progress" style="height: 20px;">
                                    <div class="progress-bar ${row.statusClass}" role="progressbar" 
                                         style="width: ${row.percentage}%;" 
                                         aria-valuenow="${row.percentage}" aria-valuemin="0" aria-valuemax="100">
                                         ${row.percentage.toFixed(0)}%
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Missing Subjects Table -->
        <div class="table-responsive mt-4">
            <h6 class="fw-bold text-danger">Subjects NOT Scheduled in Exam</h6>
            <table class="table table-bordered table-hover table-sm">
                <thead class="table-light">
                    <tr>
                        <th>Subject</th>
                    </tr>
                </thead>
                <tbody>
                    ${missingSubjects.length > 0 ? missingSubjects.map(row => {
                        const subject = subjects.find(s => s.id === row.subjectId&&s.sector === exam.sector);
                        console.log(subject);
                        return `
                            <tr>
                                <td>${subject ? (subject.sector === exam.sector? subject.name : 'Unknown Subject'):"Unknown Subject"}</td>
                            </tr>
                        `;
                    }).join('') :
                    `<tr><td class="text-center text-muted">All subjects are scheduled.</td></tr>`}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = tableHtml;
}


const exportReportToPdf = (examId) => {
    // 1. --- Basic Setup ---
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const tableElement = document.getElementById('report-table-printable').querySelector('table');

    if (!tableElement) {
        showAlert('Error: Report table not found for export.', 'danger');
        return;
    }

    const examName = exams.find(e => e.id === examId)?.name || 'Exam Summary';
    const reportTitle = `Mark Entry Report for: ${examName}`;

    // 2. --- Prepare Data for AutoTable ---
    const head = Array.from(tableElement.querySelectorAll('thead tr')).map(tr => 
        Array.from(tr.querySelectorAll('th')).map(th => th.innerText)
    );
    
    const body = Array.from(tableElement.querySelectorAll('tbody tr')).map(tr => 
        Array.from(tr.querySelectorAll('td')).map(td => td.innerText)
    );

    // 3. --- Generate the PDF using autoTable ---
    doc.autoTable({
        head: head,
        body: body,
        // REMOVED startY and ADDED margin. This is the key change.
        margin: { top: 30 }, // Reserve 30mm space at the top of EVERY page
        theme: 'striped',
        styles: {
            fontSize: 8,
            cellPadding: 2,
        },
        headStyles: {
            fillColor: [22, 160, 133],
            textColor: 255,
            fontStyle: 'bold',
        },
        // This hook adds a header and footer to EVERY page.
        didDrawPage: function (data) {
            // Header (drawn at 20mm, well within the 30mm margin)
            doc.setFontSize(16);
            doc.setTextColor(40);
            doc.text(reportTitle, data.settings.margin.left, 20);

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
    });

    // 4. --- Save the PDF ---
    doc.save(`Mark_Entry_Report_${examName.replace(/\s/g, '_')}.pdf`);
    showAlert('PDF export successful!', 'success');
};

/**
 * Renders the main UI for the "Schedule" tab with multi-division checkbox selection.
 */
window.renderExamScheduleTab = () =>{
    const container = document.getElementById('schedule');
    if (!container) return;
    
    let classOptions = '';
    // (Your existing classOptions logic is correct)
    if (currentUserRole === 'teacher') {
        const teacherAllocations = classroomSubjects.filter(cs => cs.teacherId === selectedUser.id);
        const uniqueClassIds = [...new Set(teacherAllocations.map(a => a.classId))];
        classOptions = uniqueClassIds.map(classId => {
            const c = classes.find(cls => cls.id === classId);
            return c ? `<option value="${c.id}">${c.name}</option>` : '';
        }).join('');
    } else {
        classOptions = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    container.innerHTML = `
        <div class="row g-3 align-items-end border-bottom pb-3 mb-3">
            <div class="col-md-4"><label class="form-label fw-bold">Exam</label><select id="sched-exam" class="form-select">${exams.map(ex=>`<option value="${ex.id}">${ex.name}</option>`).join('')}</select></div>
            <div class="col-md-4"><label class="form-label fw-bold">Class</label><select id="sched-class" class="form-select">${classOptions}</select></div>
            <div class="col-md-4">
                <label class="form-label fw-bold">Divisions (select one or more)</label>
                <div id="sched-division-checkboxes" class="border rounded p-2" style="max-height: 120px; overflow-y: auto;"></div>
            </div>
        </div>
        <div id="schedule-sheet">
            <p class="text-center p-5 text-muted">Please select a class and at least one division to create the schedule.</p>
        </div>`;
    
    const examSelect = document.getElementById('sched-exam');
    const classSelect = document.getElementById('sched-class');
    const divisionContainer = document.getElementById('sched-division-checkboxes');
    // After setting innerHTML, find the active exam and set the value
const firstActiveExam = exams.find(ex => ex.isActive);
if (firstActiveExam) {
    examSelect.value = firstActiveExam.id;
}

    // --- THIS IS THE NEW LOGIC ---
    if (selectedExamForControl) {
        examSelect.value = selectedExamForControl;
        examSelect.disabled = true;
    }
    // --- END NEW LOGIC ---

    const updateScheduleView = () => {
        const classId = classSelect.value;
        const selectedDivisions = Array.from(divisionContainer.querySelectorAll('input:checked')).map(cb => cb.value);
        const examId = examSelect.value; // Will be the pre-selected one
        if (classId && selectedDivisions.length > 0 && examId) {
            loadScheduleSheet(examId, classId, selectedDivisions);
        } else {
            document.getElementById('schedule-sheet').innerHTML = `<p class="text-center p-5 text-muted">Please select a class and at least one division.</p>`;
        }
    };

    classSelect.addEventListener('change', () => {
        const selectedClassId = classSelect.value;
        divisionContainer.innerHTML = '';
        let divisionsToShow = [];
        if (currentUserRole === 'teacher') {
            const teacherAllocationsForClass = classroomSubjects.filter(cs => cs.teacherId === selectedUser.id && cs.classId === selectedClassId);
            divisionsToShow = [...new Set(teacherAllocationsForClass.map(a => a.division))];
        } else {
            const cls = classes.find(c => c.id === selectedClassId);
            if (cls) divisionsToShow = cls.divisions;
        }
        divisionsToShow.forEach(d => {
            divisionContainer.innerHTML += `<div class="form-check"><input class="form-check-input" type="checkbox" value="${d}" id="div_${d}"><label class="form-check-label" for="div_${d}">${d}</label></div>`;
        });
        updateScheduleView();
    });

    divisionContainer.addEventListener('change', updateScheduleView);
    examSelect.addEventListener('change', updateScheduleView);
    
    // Auto-trigger the first class if it exists
    if (classSelect.options.length > 0) {
        classSelect.value = classSelect.options[0].value;
        classSelect.dispatchEvent(new Event('change'));
    }
}

/**
 * Loads the scheduling data entry table for a class, applying the data to all selected divisions.
 */
async function loadScheduleSheet(examId, classId, divisions) {
    const container = document.getElementById('schedule-sheet');
    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>`;

    const selectedExam = exams.find(ex => ex.id === examId);
    const subjectIds = new Set();
    let relevantSubjects;

    const isAdminOrController = currentUserRole === 'admin' || (currentUserRole === 'teacher' && selectedUser.roles?.includes('exam_controller'));

    if (isAdminOrController) {
        relevantSubjects = classroomSubjects.filter(cs => cs.classId === classId && divisions.includes(cs.division));
    } else {
        relevantSubjects = classroomSubjects.filter(cs => cs.classId === classId && cs.teacherId === selectedUser.id && divisions.includes(cs.division));
    }

    relevantSubjects.forEach(cs => subjectIds.add(cs.subjectId));
    const allocatedSubjects = Array.from(subjectIds).map(id => subjects.find(s => s.id === id && s.sector === selectedExam.sector)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name));

    if (allocatedSubjects.length === 0) {
        container.innerHTML = `<div class="alert alert-warning">No subjects allocated for this combination that match your permissions.</div>`;
        return;
    }

    // Pre-fill the form using the schedule from the FIRST selected division
    const existingSchedules = examSchedules.filter(s => s.examId === examId && s.classId === classId && s.division === divisions[0]);

    let tableHTML = `
        <p class="text-muted">Enter schedule details. This will apply to all selected divisions: <strong>${divisions.join(', ')}</strong>.</p>
        <div class="table-responsive">
            <table id="schedule-table" class="table table-bordered table-sm">
                <thead class="table-light">
                    <tr><th>Subject</th><th>Exam Date</th><th>Session (FN/AN)</th><th>Max Marks (Theory)</th><th>Max Marks (Internal)</th><th class="text-end">Actions</th></tr>
                </thead>
                <tbody>`;
    
    allocatedSubjects.forEach(subject => {
        const schedule = existingSchedules.find(es => es.subjectId === subject.id);
        tableHTML += `<tr data-subject-id="${subject.id}" data-schedule-id="${schedule?.id || ''}">
            <td class="fw-bold">${subject.name}</td>
            <td><input type="date" name="date" value="${schedule?.date || getTodayISO()}" class="form-control form-control-sm"></td>
            <td><select name="session" class="form-select form-select-sm"><option value="">--</option><option value="FN" ${schedule?.session === 'FN' ? 'selected' : ''}>FN</option><option value="AN" ${schedule?.session === 'AN' ? 'selected' : ''}>AN</option></select></td>
            <td><input type="number" name="maxTE" value="${schedule?.maxTE || ''}" class="form-control form-control-sm"></td>
            <td><input type="number" name="maxCE" value="${schedule?.maxCE || ''}" class="form-control form-control-sm"></td>
            <td class="text-end">${schedule ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteExamSchedule('${schedule.id}')"><i class="fas fa-trash"></i></button>` : ''}</td>
        </tr>`;
    });

    tableHTML += `</tbody></table></div><div class="text-end mt-3"><button id="save-schedule-btn" class="btn btn-success">Save for All Selected Divisions</button></div>`;
    container.innerHTML = tableHTML;
    document.getElementById('save-schedule-btn').addEventListener('click', () => saveExamSchedule(examId, classId, divisions));
}
//Function to format the current date as YYYY-MM-DD
    function getTodayISO() {
        const today = new Date();
        // toLocaleDateString('en-CA') is a reliable way to get 'YYYY-MM-DD' in JS
        return today.toLocaleDateString('en-CA'); 
    }

/**
 * Deletes a single exam schedule entry.
 */
window.deleteExamSchedule = async (scheduleId) => {
    if (!confirm("Are you sure you want to delete this schedule entry?")) return;

    try {
        await deleteDoc(getDocRef('examSchedules', scheduleId));
        showAlert('Schedule entry deleted successfully.', 'success');
    } catch (error) {
        console.error("Error deleting schedule:", error);
        showAlert("Failed to delete schedule entry.", "danger");
    }
};

// Reverted and enhanced version of saveExamSchedule
async function saveExamSchedule(examId, classId, divisions) {
    const saveButton = document.getElementById('save-schedule-btn');
    if (!saveButton) return;

    // Store original button state and disable it
    const originalButtonHtml = saveButton.innerHTML;
    saveButton.disabled = true;
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Saving...`;

    try{
    const batch = writeBatch(db);
    const scheduleRows = document.querySelectorAll('#schedule-table tbody tr');
    let hasDataToSave = false;

    scheduleRows.forEach(row => {
        const subjectId = row.dataset.subjectId;
        const date = row.querySelector('input[name="date"]').value;
        const session = row.querySelector('select[name="session"]').value;
               
        
        if (subjectId && date&&session) {
            hasDataToSave = true;
            const subjectScheduleData = {
                examId,
                classId,
                subjectId,
                date: date,
                session: row.querySelector('select[name="session"]').value,
                maxTE: parseInt(row.querySelector('input[name="maxTE"]').value) || 0,
                maxCE: parseInt(row.querySelector('input[name="maxCE"]').value) || 0,
            };

            // Apply this schedule to all selected divisions
            divisions.forEach(division => {
                const scheduleId = `${examId}_${classId}_${division}_${subjectId}`;
                const scheduleRef = getDocRef('examSchedules', scheduleId);
                batch.set(scheduleRef, { ...subjectScheduleData, division: division, id: scheduleId });
            });
        }
    });

    if (hasDataToSave) {
            await batch.commit();
            showAlert(`Schedule saved successfully for divisions: ${divisions.join(', ')}!`, 'success');
        } else {
            showAlert('No schedule data entered to save.', 'warning');
        }
    } catch (error) {
        console.error("Error saving exam schedule:", error);
        showAlert("Failed to save schedule. Please check your connection and try again.", "danger");
    } finally {
        // This block ALWAYS runs, ensuring the UI is restored.
        saveButton.disabled = false;
        saveButton.innerHTML = originalButtonHtml;
    }
}

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

window. renderConsolidatedTimetableView = () => {
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
    if (selectedExamForControl) {
        examSelect.value = selectedExamForControl;
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

// --- RESULTS TAB OVERHAUL ---

window.renderResultsTab = async () => {
  //await syncMarksDataForUser();
  //await syncDataForUser();
    const container = document.getElementById('results');
     // Sort exams to show active ones first
    const sortedExams = [...exams].sort((a, b) => (b.isActive || false) - (a.isActive || false));

    container.innerHTML = `
        <div class="d-flex justify-content-end align-items-center p-3 bg-light border rounded mb-3">
        <label class="form-label  me-2 mb-0 fw-bold">Exam</label>
        <select id="res-exam" class="form-select form-select-sm w-auto">${sortedExams.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}</select>
            <label class="form-label me-2 mb-0 fw-bold">Active Grading System:</label>
            <select id="shared-grading-system" class="form-select form-select-sm w-auto">
                <option value="type1">A+, A, B+, B...</option>
                <option value="type2">O, A, B, C...</option>
            </select>
        </div>
       
        <ul class="nav nav-pills mb-3" id="pills-tab" role="tablist">
            <li class="nav-item" role="presentation"><button class="nav-link" data-bs-toggle="pill" data-bs-target="#pills-ranklist" type="button">Class Rank List</button></li>
            <li class="nav-item" role="presentation"><button class="nav-link" data-bs-toggle="pill" data-bs-target="#pills-reportcard" type="button">Student Report Card</button></li>
            <li class="nav-item" role="presentation"><button class="nav-link active" data-bs-toggle="pill" data-bs-target="#pills-exam-wise" type="button">Exam-wise Report</button></li>
            <li class="nav-item" role="presentation"><button class="nav-link" data-bs-toggle="pill" data-bs-target="#pills-subject-wise" type="button">Subject-wise Analysis</button></li>
        </ul>
        <div class="tab-content" id="pills-tabContent">
            <div class="tab-pane fade" id="pills-ranklist" role="tabpanel"></div>
            <div class="tab-pane fade" id="pills-reportcard" role="tabpanel"></div>
            <div class="tab-pane fade show active" id="pills-exam-wise" role="tabpanel"></div>
            <div class="tab-pane fade" id="pills-subject-wise" role="tabpanel"></div>
        </div>`;
        
    renderExamWiseResultView();
    renderSubjectWiseResultView();
    renderRankListTab();
    renderReportCardTab();
}

// ----------------------------------------------------------------------------------
        // --- EXAM-WISE & SUBJECT-WISE RESULTS (ENHANCED) ---
        // ----------------------------------------------------------------------------------

        /**
         * Renders the UI for the "Exam-wise Report" tab, with dropdowns filtered for teachers.
         */
        function renderExamWiseResultView() {
            const container = document.getElementById('pills-exam-wise');
            let classOptions = '';

            // Filter classes for teachers, show all for admins
            if (currentUserRole === 'teacher') {
                const teacherAllocations = classroomSubjects.filter(cs => cs.teacherId === selectedUser.id);
                const uniqueClassIds = [...new Set(teacherAllocations.map(a => a.classId))];
                classOptions = uniqueClassIds.map(classId => {
                    const c = classes.find(cls => cls.id === classId);
                    return c ? `<option value="${c.id}">${c.name}</option>` : '';
                }).join('');
            } else {
                classOptions = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            }

            container.innerHTML = `
        <div class="row g-3 align-items-end border-bottom pb-3 mb-3">
            <div class="col-md-3"><label class="form-label">Class</label><select id="res-class" class="form-select">${classOptions}</select></div>
            <div class="col-md-3"><label class="form-label">Division</label><select id="res-division" class="form-select"></select></div>
            <div class="col-md-3">
                <label class="form-label">Sort By</label>
                <select id="ew-sort-by" class="form-select">
                    <option value="rank">Rank (Highest First)</option>
                    <option value="name">Alphabetical</option>
                </select>
            </div>
        </div>

        <div class="text-end my-3">
            <button id="print-exam-report-btn" class="btn btn-secondary" disabled>
                <i class="fas fa-print me-2"></i>Print Report
            </button>
        </div>

        <div id="printable-exam-report">
            
            <div id="exam-wise-results-container" class="table-responsive"></div> 
           
                <div id="exam-wise-performance-consolidated"></div>
            <div id="exam-wise-chart-container" class="mb-4" style="min-height: 400px;">
                 <canvas id="exam-wise-performance-canvas"></canvas>
            </div>
        </div>
        `;

    const examSelect = document.getElementById('res-exam');
    const classSelect = document.getElementById('res-class');
    const divisionSelect = document.getElementById('res-division');
    const sortBySelect = document.getElementById('ew-sort-by');
    const printBtn = document.getElementById('print-exam-report-btn');
    const resultsContainer = document.getElementById('exam-wise-results-container'); // Get reference to the results container

    const generateTable = async () => {
        const examId = examSelect.value;
        const classId = classSelect.value;
        const division = divisionSelect.value;
        if (examId && classId && division) {

            // Create a unique key for this specific listener
    const listenerKey = `${classId}_${division}`;

    // --- NEW: If a listener for this specific query is already active, do nothing ---
    if (activeMarksListeners[listenerKey]) {
        // The data is already being synced in real-time. We just need to re-render the table.
        generateExamWiseResultsTable(examId, classId, division);
         printBtn.disabled = false; 
        return;
    }
           await attachMarksListener([{ classId: classId, division: division }]);
            generateExamWiseResultsTable(examId, classId, division);
            printBtn.disabled = false; // Enable print button after report generates
        } else {
            printBtn.disabled = false;
        }
    };
    
    // Attach event listeners
    [examSelect, classSelect, divisionSelect, sortBySelect].forEach(el => el.addEventListener('change', generateTable));
    
    printBtn.addEventListener('click', () => {
        const examName = examSelect.options[examSelect.selectedIndex].text;
        const className = classSelect.options[classSelect.selectedIndex].text;
        const divisionName = divisionSelect.value;
        const reportTitle = `${examName} - Results (Class: ${className} - ${divisionName} (${activeFinancialYear}))`;
        const reportSubtitle ="";
        printReportWithChart('exam-wise-results-container', 'exam-wise-performance-canvas', reportTitle, reportSubtitle);
    });


            // This listener now correctly filters divisions based on the teacher's allocations
            classSelect.addEventListener('change', () => {
                const selectedClassId = classSelect.value;
                let divisionOptionsHTML = '';
                if (currentUserRole === 'teacher') {
                    const teacherAllocationsForClass = classroomSubjects.filter(cs => cs.teacherId === selectedUser.id && cs.classId === selectedClassId);
                    const uniqueDivisions = [...new Set(teacherAllocationsForClass.map(a => a.division))];
                    divisionOptionsHTML = uniqueDivisions.map(d => `<option value="${d}">${d}</option>`).join('');
                } else {
                    const cls = classes.find(c => c.id === selectedClassId);
                    divisionOptionsHTML = cls ? cls.divisions.map(d => `<option value="${d}">${d}</option>`).join('') : '';
                }
                divisionSelect.innerHTML = divisionOptionsHTML;
                generateTable();
            });

            examSelect.addEventListener('change', generateTable);
            divisionSelect.addEventListener('change', generateTable);
            
            if (classSelect.options.length > 0) {
                classSelect.dispatchEvent(new Event('change'));
            } else {
                 container.querySelector('#exam-wise-results-container').innerHTML = `<p class="text-muted p-5 text-center">No classes allocated to this teacher.</p>`;
            }
            // --- NEW: Event listener for clicks on student names in the results table ---
    if (resultsContainer) {
        resultsContainer.addEventListener('click', (event) => {
            const studentLink = event.target.closest('.student-name-link'); // Find the closest link element
            if (studentLink) {
                event.preventDefault(); // Prevent default anchor link behavior
                const studentId = studentLink.dataset.id; // Get student ID from data-id attribute
                if (studentId) {
                   //  generateReportCardHTML(studentId, examSelect.value , 'rc-results-container');
                    document.getElementById('rc-results-container').innerHTML = generateReportCardHTML_Comparison(studentId, examSelect.value, 'rc-results-container')
           
                    // populateAndShowFullStudentModal(studentId); // Call your existing modal function
                }
            }
        });
    }
}
/**
 * Generates a printable report containing both a Chart.js canvas and HTML table content.
 * It converts the canvas to an image to ensure high-quality printing.
 *
 * @param {string} contentDivId - The ID of the div containing the HTML table/data to print.
 * @param {string} canvasId - The ID of the <canvas> element to include in the report.
 * @param {string} reportTitle - The main title for the printed report.
 * @param {string} reportSubtitle - The subtitle (e.g., class and exam details).
 */
function printReportWithChart(contentDivId, canvasId, reportTitle, reportSubtitle) {
    // --- 1. Get Elements ---
    const contentEl = document.getElementById(contentDivId);
    const canvasEl = document.getElementById(canvasId);

    if (!contentEl) {
        showAlert('Report content element could not be found.', 'danger');
        return;
    }
    if (!canvasEl) {
        showAlert('Report chart element could not be found.', 'danger');
        return;
    }

    // --- 2. Convert Canvas to High-Resolution Image Data URL ---
    // This ensures the chart prints clearly and not as a blurry image.
    let chartImageDataUrl = '';
    try {
        chartImageDataUrl = canvasEl.toDataURL('image/png', 4.0); // 1.0 quality for PNG
    } catch (e) {
        console.error("Error converting canvas to image:", e);
        showAlert("Could not process chart image for printing. It might be blank.", "warning");
    }

    // --- 3. Get Report Table HTML ---
    // We clone the part of the UI that contains the table to print.
    const tableHtmlContent = document.getElementById(contentDivId).innerHTML;

    // --- 4. Assemble Final Print HTML ---
    // --- 4. Assemble Final Print HTML ---
const printHtml = `
    <html>
        <head>
            <title>${reportTitle}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { 
                    font-family: 'Inter', sans-serif; 
                    margin: 10px; 
                }
                @page { 
                    size: A4 landscape; 
                    margin: 0.5cm; 
                }
                @media print {
                    body { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                    /* Avoid breaking elements across pages */
                    .printable-chart, .table { 
                        page-break-inside: avoid; 
                    }

    .report-header {
        page-break-before: avoid;
        page-break-after: avoid;
        page-break-inside: avoid;

        break-before: avoid;
        break-after: avoid;
        break-inside: avoid;

        /* Optional: Helps keep blocks attached visually */
        display: block;
    }

                        
                    /* NEW: Add space after the header in print view */
                }
                .chart-container {
                   /* margin-top: 0.5rem;  Add space above the chart */
                    margin-bottom: 0.5rem;
                }
                .chart-image {
                    max-width: 100%;
                    height: 300px;
                    border: 1px solid #eee;
                    padding: 1px;
                }
                table {
                    width: 100%;
                    font-size: 0.9rem;
                }
                    /* --- MODIFIED: Reduced padding for more space --- */
                    th{
                    font-size:0.6rem;

                    }
                    td{
                    font-size:0.7rem;
                    }
                    th, td {
                        padding: 1px !important; /* Reduced padding (e.g., 4px). Adjust as needed. */
                        vertical-align: middle;
                        horizontal-align:middle;
                        font-weight: bold;
                    }

            </style>
        </head>
        <body>
            <div class="report-header" style="text-align: center;">
                <h4>${schoolDetails.name || 'School Report'}</h4>
                <h5>${reportTitle}</h5>
                <!--- <p class="text-muted" style="margin-bottom: 0;">${reportSubtitle}</p> --->
            </div>
            <div class="table-container">
                ${tableHtmlContent}
            </div>
            
            ${chartImageDataUrl ? `
            <div class="chart-container">
                <img src="${chartImageDataUrl}" class="chart-image">
            </div>` : ''}
        </body>
    </html>
`;

    // --- 5. Open Print Dialog ---
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHtml);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
       // printWindow.close();
    }, 500); // Wait for images and styles to load before printing
}

        /**
 * Main controller function for the Exam-wise Report.
 * It fetches filter values and orchestrates data processing and rendering.
 * @param {string} examId
 * @param {string} classId
 * @param {string} division
 */

async function generateExamWiseResultsTable(examId, classId, division) {
    const container = document.getElementById('exam-wise-results-container');
    if (!container) return;

    const schedulesForClass = examSchedules.filter(s => s.examId === examId && s.classId === classId && s.division === division);
    if (schedulesForClass.length === 0) {
        container.innerHTML = '<p class="text-muted p-5 text-center">Exam schedule not found for this selection.</p>';
        document.getElementById('exam-wise-chart-container').innerHTML = '<canvas id="exam-wise-performance-canvas"></canvas>';
        return;
    }

    // 1. Get configuration and filter data
    const gradingSystem = document.getElementById('shared-grading-system').value;
    const sortBy = document.getElementById('ew-sort-by').value;
    const studentsInClass = students.filter(s => s.classId === classId && s.division === division);
    const subjectHeaders = schedulesForClass.map(s => subjects.find(sub => sub.id === s.subjectId)).filter(Boolean);

    // 2. Process the raw data to get calculated results
    let resultsData = processExamResultsData(studentsInClass, schedulesForClass, marks, examId, gradingSystem);

    // --- NEW: Calculate Consolidated Metrics ---
    const consolidatedMetrics = calculateConsolidatedMetrics(resultsData, schedulesForClass, studentsInClass, examId, gradingSystem);
    // --- END NEW ---

    // 3. Sort the processed data and calculate ranks
    resultsData.sort((a, b) => {
        if (sortBy === 'name') return a.studentName.localeCompare(b.studentName);
        if (a.finalStatus === 'PASS' && b.finalStatus === 'FAIL') return -1;
        if (a.finalStatus === 'FAIL' && b.finalStatus === 'PASS') return 1;
        return b.grandTotalMarks - a.grandTotalMarks;
    });

    let lastTotal = -1;
    let lastRank = 0;
    
    resultsData.forEach((res, index) => {
        if (res.finalStatus === 'PASS') {
            if (res.grandTotalMarks === lastTotal) {
                res.finalRank = lastRank;
            } else {
                res.finalRank = index + 1;
                lastRank = res.finalRank;
            }
            lastTotal = res.grandTotalMarks;
        } else {
            res.finalRank = '-'; 
        }
    });

    if (sortBy === 'name') {
        resultsData.sort((a, b) => a.studentName.localeCompare(b.studentName));
    }

    // 4. Render Consolidated Metrics and Main Table
    const mainTableHtml = renderExamResultsTable(resultsData, subjectHeaders, schedulesForClass,consolidatedMetrics);

    container.innerHTML =  mainTableHtml;
    const containertable = document.getElementById('exam-wise-performance-consolidated');
    if (!containertable) return;
    const consolidatedHtml = renderConsolidatedMetricsTable(consolidatedMetrics);
    
        containertable.innerHTML = consolidatedHtml; 

    
    // 5. Render Chart (using the consolidated grade counts)
    renderExamWisePerformanceChartFromConsolidated(
        consolidatedMetrics.gradeCounts, 
        consolidatedMetrics.gradeScale, 
        document.getElementById('exam-wise-performance-canvas')
    );
     
    renderExamWisePerformanceChart(resultsData, gradingSystem, subjectHeaders);
}

/**
 * NEW: Calculates failure, absentee, and overall grade distribution counts.
 */
function calculateConsolidatedMetrics(resultsData, schedulesForClass, studentsInClass, examId, gradingSystem) {
    const metrics = {
        totalStudents: studentsInClass.length,
        totalSubjects: schedulesForClass.length,
        totalFailures: 0,
        failurecount:0,
        totalAbsentees: 0,
        absenteeDetails: new Set(),
        gradeScale: gradingSystem === 'type1' ? ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'E', 'AB'] : ['O', 'A', 'B', 'C', 'D', 'E', 'F', 'AB'],
        gradeCounts: {} // { grade: count }
    };
    
    // Initialize grade counts
    metrics.gradeScale.forEach(grade => metrics.gradeCounts[grade] = 0);

    resultsData.forEach(res => {
        let isAbsentee = false;
        //let failurecount = 0;
        let isfailed = false;
        // Count overall failures and grade distribution
        res.subjectResults.forEach(subRes => {
            const grade = subRes.grade;
            if (grade === 'E' || grade === 'F'|| grade === "AB") {
                metrics.totalFailures++;
                isfailed === false? metrics.failurecount++:"";
                isfailed = true;
                
            }
            if (grade === 'AB') {
                isAbsentee = true;
            }
            // Count the grade for the overall grade distribution
            if (metrics.gradeCounts[res.overallGrade] !== undefined) {
                metrics.gradeCounts[res.overallGrade]++;
            } else {
                // For overall grade that isn't in the scale (like 'NC' or '-'), skip or put in a catch-all
                metrics.gradeCounts['AB']++;
            }
        }
    );
            isfailed = false;
        // Count overall student absentees (if absent in ANY subject)
        if (isAbsentee) {
            metrics.totalAbsentees++;
            metrics.absenteeDetails.add(res.studentName);
        }
    });
    
    return metrics;
}

/**
 * NEW: Renders the compact table summarizing the calculated metrics.
 */
function renderConsolidatedMetricsTable(metrics) {
    const totalStudents = metrics.totalStudents;
    const totalGrades = metrics.gradeScale.map(grade => metrics.gradeCounts[grade]).reduce((sum, count) => sum + count, 0);
    const passingStudents = metrics.gradeScale.filter(g => g !== 'E' && g !== 'F' && g !== 'AB').map(g => metrics.gradeCounts[g]).reduce((sum, count) => sum + count, 0);

    return `
        <div class="ui-card mb-4">
            <h5 class="section-header">📈 Consolidated Analysis</h5>
            <div class="row g-3 text-center">
                <div class="col-md-3">
                    <div class="p-1 border rounded">
                        <h6 class="text-muted mb-1">Total Students</h6>
                        <h4 class="fw-bold mb-0">${totalStudents}</h4>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="p-1 border rounded bg-danger text-white">
                        <h6 class="mb-1">Total Failures (Subjects)</h6>
                        <h4 class="fw-bold mb-0">${metrics.totalFailures}</h4>
                        <h5 class="fw-bold mb-0">students(${metrics.failurecount})</h5>
                        
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="p-1 border rounded bg-warning text-dark">
                        <h6 class="mb-1">Students Absent</h6>
                        <h4 class="fw-bold mb-0" data-bs-toggle="tooltip" title="${Array.from(metrics.absenteeDetails).join(', ')}">
                            ${metrics.totalAbsentees}
                        </h4>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="p-1 border rounded bg-success text-white">
                        <h6 class="mb-1">Overall Pass %</h6>
                        <h4 class="fw-bold mb-0">${totalStudents > 0 ? ((passingStudents / totalStudents) * 100).toFixed(1) : '0.0'}%</h4>
                    </div>
                </div>
            </div>
            
            <h6 class="mt-4 mb-2 text-primary">Overall Grade Count (Based on Grand Total Marks)</h6>
            <div class="row row-cols-lg-5 row-cols-md-3 row-cols-sm-2 g-2">
                ${metrics.gradeScale.map(grade => `
                    <div class="col">
                        <div class="p-1 border rounded text-center" style="background-color: ${grade === 'E' || grade === 'F' ? '#f8d7da' : '#d1e7dd'};">
                            <small class="text-muted d-block">${grade}</small>
                            <span class="fw-bold fs-5">${metrics.gradeCounts[grade] || 0}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * NEW: Renders the chart using the grade counts from the consolidated metrics.
 */
function renderExamWisePerformanceChartFromConsolidated(gradeCounts, gradeScale, canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
        const existingChart = Chart.getChart(canvas);
        if (existingChart) existingChart.destroy();
    } catch (e) {}

    const labels = gradeScale;
    const data = gradeScale.map(grade => gradeCounts[grade] || 0);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Overall Students per Grade',
                data: data,
                backgroundColor: labels.map(g => (g === 'E' || g === 'F') ? 'rgba(220, 53, 69, 0.8)' : 'rgba(40, 167, 69, 0.7)'),
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: false },
                y: { stacked: false, beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Number of Students' } }
            },
            plugins: {
                title: { display: true, text: 'Overall Grade Distribution (Class Total)' },
                legend: { display: false }
            }
        }
    });
}
/**
 * Processes raw data to calculate marks, totals, and grades for each student.
 * This version now includes the studentId in the results for reliable lookups.
 * @param {Array} studentsInClass
 * @param {Array} schedules
 * @param {object} marksObject
 * @param {string} examId
 * @param {string} gradingSystem
 * @returns {Array} A new array with calculated results for each student.
 */

/**
 * Processes raw data to calculate marks, totals, and individual grades for each student.
 * @param {Array} studentsInClass
 * @param {Array} schedules
 * @param {object} marksObject
 * @param {string} examId
 * @param {string} gradingSystem
 * @returns {Array} A new array with calculated results for each student.
 */
function processExamResultsData(studentsInClass, schedulesForClass, marksObject, examId, gradingSystem) {
    const subjectHeaders = schedulesForClass.map(s => subjects.find(sub => sub.id === s.subjectId)).filter(Boolean);

    return studentsInClass.map(student => {
        let grandTotalMarks = 0;
        let grandTe = 0;
        let grandCe = 0;
        let grandmaxTe = 0;
        let grandmaxCe = 0;
        let grandMaxMarks = 0;
        let finalStatus = 'PASS';
        let subjectResults = [];

        subjectHeaders.forEach(subject => {
            const schedule = schedulesForClass.find(s => s.subjectId === subject.id);
            const maxTE = schedule?.maxTE || 0;
            const maxCE = schedule?.maxCE || 0;
            const maxTotal = maxTE + maxCE;
            const markId = `${examId}_${student.id}_${subject.id}`;
            const mark = marksObject[markId];

            const te = mark?.te ?? 'N/A';
            const ce = mark?.ce ?? 'N/A';
            let total = 'N/A', pct = 'N/A', grade = 'N/A', teGrade = 'N/A', ceGrade = 'N/A' ;

            if (te !== 'N/A' && ce !== 'N/A') {
                total = String(te).toUpperCase() === "AB"?"AB":(Number(te) || 0) + (maxCE>0?Number(ce) || 0:0);
                pct = maxTotal > 0 ? (((Number(total)||0)/ maxTotal) * 100).toFixed(1) : 0;
                
                // Calculate all three grades
                const gradeFunc = gradingSystem === 'type1' ? calculateGrade : calculateGradeType2;
                grade = gradeFunc(total, maxTotal);
                teGrade = gradeFunc(te, maxTE);
                ceGrade = gradeFunc(ce, maxCE);

                if (grade === 'E' || grade === 'F'|| grade ==="AB") finalStatus!=="NC"?  finalStatus='FAIL':"";
                grandTe += (Number(te) || 0);
                grandCe += maxCE >= Number(ce)?(Number(ce) || 0):0;
                grandmaxTe += maxTE;
                grandmaxCe += maxCE;
               
                grandTotalMarks += Number(total)||0;
                grandMaxMarks += maxTotal;
            } else {
                finalStatus = 'NC';
                if (maxTotal > 0) grandMaxMarks += maxTotal;
            }

            subjectResults.push({ subjectId: subject.id, te, ce,maxTE,maxCE ,total, pct, grade, teGrade, ceGrade });
        });

        const grandPct = grandMaxMarks > 0 ? ((grandTotalMarks / grandMaxMarks) * 100) : 0;
        const gradeFunc = gradingSystem === 'type1' ? calculateGrade : calculateGradeType2;

        return {
            studentId: student.id,
            studentName: student.name,
            admissionNumber :student.admissionNumber,
            subjectResults,
            grandCe,
            grandTe,
            grandmaxCe,
            grandmaxTe,
            grandTotalMarks,
            grandMaxMarks,
            grandPct,
            finalStatus,
            overallGrade: gradeFunc(grandTotalMarks, grandMaxMarks)
        };
    });
}

/**
 * Renders the HTML table from the processed results data with cleaner headers.
 * @param {Array} resultsData - The processed data with calculated results.
 * @param {Array} subjectHeaders - The subject objects for table headers.
 * @returns {string} The complete HTML string for the results table.
 */
/**
 * Renders the HTML table from the processed results data with a simplified, compact layout.
 * @param {Array} resultsData - The processed data with calculated results.
 * @param {Array} subjectHeaders - The subject objects for table headers.
 * @param {Array} schedulesForClass - The schedule objects for the class.
 * @returns {string} The complete HTML string for the results table.
 */
function renderExamResultsTable(resultsData, subjectHeaders, schedulesForClass, consolidatedMetrics) {
    // --- Determine Max TE and Max CE for Header ---
    let maxTe = 0;
    let maxCe = 0;
    subjectHeaders.forEach(subject => {
        const schedule = schedulesForClass.find(s => s.subjectId === subject.id);
        maxTe += schedule?.maxTE || 0;
        maxCe += schedule?.maxCE || 0;
    });

    // --- Build Header ---
    let headerHTML = `<thead><tr><th rowspan="2" class="align-middle" >Sl</th><th rowspan="2" class="align-middle">Student</th>`;

    // Header Row 1: Subject Name + Max Marks
    subjectHeaders.forEach(subject => {
        const schedule = schedulesForClass.find(s => s.subjectId === subject.id);
        const maxTE = schedule?.maxTE || 0;
        const maxCE = schedule?.maxCE || 0;
        headerHTML += `<th colspan="3" class="text-center">
                           ${subject.name}
                           <br>
                           <small class="text-muted fw-normal">(Max TE: ${maxTE}, Max CE: ${maxCE})</small>
                       </th>`;
    });
    // Grand Total Header (Now includes Max TE/CE)
    headerHTML += `<th colspan="3" class="text-center table-primary align-middle">Grand Total
                       <br>
                       <small class="text-muted fw-normal">(Max TE: ${maxTe}, Max CE: ${maxCe})</small>
                   </th></tr>`;

    // Header Row 2
    headerHTML += `<tr style="font-size:0.7rem;">`;
    subjectHeaders.forEach(() => {
        headerHTML += `<th style="font-size:0.7rem;">Marks (TE/CE)</th><th>Total / Grade</th><th>%</th>`;
    });
    headerHTML += `<th style="font-size:0.7rem;">Marks (TE/CE)</th><th>Total / Grade</th><th>%</th></tr></thead>`;

    // --- Build Body ---
    let bodyHTML = `<tbody>`;
    let index = 0;
    
    resultsData.forEach(res => {
        index++
        const studentId = res.studentId;
        const rowClass = res.finalStatus === 'FAIL' ? 'table-danger' : '';
        
        let rankIcon = '';
        if (res.finalRank === 1) rankIcon = '⭐';
        else if (res.finalRank === 2) rankIcon = '🥈';
        else if (res.finalRank === 3) rankIcon = '🥉';
        else if (res.finalRank === 4) rankIcon = '🏅';
        
        const rankIconHtml = rankIcon ? `<span class="me-2">${rankIcon}</span>` : '';

        bodyHTML += `<tr class="${rowClass}">
            <td>${index}</td>
                        <td class="text-nowrap">
                            ${rankIconHtml} 
                            <a href="#" class="student-name-link fw-bold" data-id="${studentId}">${res.studentName}<br>${res.admissionNumber}</a>
                        </td>`;

        // Subject Results Cells
        res.subjectResults.forEach(subRes => {
            const gradeColor = (subRes.grade === 'E' || subRes.grade === 'F') ? 'text-danger fw-bold' : '';
            const NEColor = (subRes.grade === 'N/A') ? 'text-primary fw-bold' : '';
            
            bodyHTML += `
                <td class="text-center ${NEColor}">
                    ${subRes.te} / ${subRes.ce}
                    <br>
                    <small class="text-muted">(${subRes.teGrade} / ${subRes.ceGrade})</small>
                </td>
                <td class="text-center ${gradeColor}">
                    ${subRes.total}
                    <br>
                    <small>(${subRes.grade})</small>
                </td>
                <td class="text-center">${subRes.pct}</td>
            `;
        });

        // Grand Total Cells (using the new grandTe/grandCe fields)
        bodyHTML += `
            <td class="table-primary">${res.grandTe}/${res.grandCe}</td>
            <td class="table-primary">${res.grandTotalMarks}(${res.overallGrade})<br>${res.grandPct.toFixed(2)}%</td>
            <td class="table-primary fw-bold">${res.finalStatus === 'FAIL' ?"F":res.finalStatus === 'PASS' ?"P":res.finalStatus} (${res.finalRank})</td>
        </tr>`;
    });
    bodyHTML += `</tbody>`;

    // --- Build Footer (Consolidated Row) ---
    const gradeCounts = consolidatedMetrics.gradeCounts;
    const gradeScale = consolidatedMetrics.gradeScale;
    
    // Calculate the number of total columns based on subject headers (3 columns per subject + 2 info columns + 3 grand total columns)
    const totalColumns = 2 + (subjectHeaders.length * 3) + 3; 

    // Grade breakdown cells
    const gradeCells = gradeScale.map(grade => {
        const gradeCount = gradeCounts[grade] || 0;
        const color = (grade === 'E' || grade === 'F' || grade === 'AB') ? 'bg-secondary text-white' : 'bg-primary text-white';
        return `<span class="badge ${color} me-1">${grade}: ${gradeCount}</span>`;
    }).join('');

    const footerHTML = `
        <tfoot>
            <tr class="table-light">
                <td colspan="${totalColumns}" class="text-start">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <!--- <span class="me-4"><strong>Total Students:</strong> ${consolidatedMetrics.totalStudents}</span> -->
                            <span class="me-4 text-danger"><strong>Subjects Failed (Total):</strong> ${consolidatedMetrics.totalFailures}</span>
                            <span class="me-4 text-warning"><strong>Students Absent (Any Subject):</strong> ${consolidatedMetrics.totalAbsentees}</span>
                        </div>
                        <div>
                            ${gradeCells}
                        </div>
                    </div>
                </td>
            </tr>
        </tfoot>
    `;

    return `<table class="table table-bordered table-hover table-sm">${headerHTML}${bodyHTML}${footerHTML}</table>`;
}
/**
 * Renders a multi-dataset bar chart showing the grade distribution for each subject in an exam.
 * This version uses a reliable subjectId lookup to ensure data accuracy.
 * @param {Array} resultsData
 * @param {string} gradingSystem
 * @param {Array} subjects - An array of subject objects to be displayed in the chart.
 */
function renderExamWisePerformanceChart(resultsData, gradingSystem, subjects) {
    const canvas = document.getElementById('exam-wise-performance-canvas');
    if (!canvas) return;

    try {
        const existingChart = Chart.getChart(canvas);
        if (existingChart) existingChart.destroy();
    } catch (e) {}

    const colorPalette = [
        'rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(75, 192, 192, 0.7)',
        'rgba(255, 206, 86, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)'
    ];
    const gradeScale = gradingSystem === 'type1' 
        ? ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'E', 'AB'] 
        : ['O', 'A', 'B', 'C', 'D', 'E', 'F', 'AB'];

    // Create a new dataset for each subject
    const datasets = subjects.map((subject, index) => {
        const gradeCounts = gradeScale.reduce((acc, grade) => ({ ...acc, [grade]: 0 }), {});

        // Go through each student's results
        resultsData.forEach(studentResult => {
            // --- MODIFIED: Find the result for the current subject BY ID, not by index ---
            const subjectResult = studentResult.subjectResults.find(sr => sr.subjectId === subject.id);
            
            if (subjectResult && gradeCounts[subjectResult.grade] !== undefined) {
                gradeCounts[subjectResult.grade]++;
            }
        });

        return {
            label: subject.name,
            data: Object.values(gradeCounts),
            backgroundColor: colorPalette[index % colorPalette.length],
        };
    });

    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: gradeScale,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: false },
                y: { stacked: false, beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Number of Students' } }
            },
            plugins: {
                title: { display: true, text: 'Grade Distribution by Subject' },
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
}
// =========================================================================
// --- 📈 EXAM RESULTS: SUBJECT-WISE ANALYSIS TAB ---
// =========================================================================

/**
 * Renders the UI for the "Subject-wise Analysis" tab with all filters and display options.
 */
let orderedExamIds = [];
function renderSubjectWiseResultView() {
    const container = document.getElementById('pills-subject-wise');
    let classOptions = '';

    if (currentUserRole === 'teacher') {
        const teacherAllocations = classroomSubjects.filter(cs => cs.teacherId === selectedUser.id);
        const uniqueClassIds = [...new Set(teacherAllocations.map(a => a.classId))];
        classOptions = uniqueClassIds.map(classId => {
            const c = classes.find(cls => cls.id === classId);
            return c ? `<option value="${c.id}">${c.name}</option>` : '';
        }).join('');
    } else {
        classOptions = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    container.innerHTML = `
        <div class="row g-3 align-items-end border-bottom pb-3 mb-3">
            <div class="col-md-3"><label class="form-label">Class</label><select id="sw-class" class="form-select">${classOptions}</select></div>
            <div class="col-md-2"><label class="form-label">Division</label><select id="sw-division" class="form-select"></select></div>
            <div class="col-md-3"><label class="form-label">Subject</label><select id="sw-subject" class="form-select"></select></div>
            <div class="col-md-4"><label class="form-label">Exams (select multiple)</label><select id="sw-exams" class="form-select" multiple style="height: 100px;">${exams.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}</select></div>

            <div id="sw-exams-order-controls" class="mt-2"></div>
            </div>
        <div class="row g-3 align-items-center mb-3 p-3 bg-light rounded no-print">
            <div class="col-md-3"><label class="form-label">Grading System</label><select id="sw-grading-system" class="form-select form-select-sm"><option value="type1">A+, A, B+, B...</option><option value="type2">O, A, B, C...</option></select></div>
            <div class="col-md-3"><label class="form-label">Sort By</label><select id="sw-sort-by" class="form-select form-select-sm"><option value="name">Alphabetical (Name)</option><option value="admnno">Admission No.</option><option value="marks">Total Marks (Highest First)</option><option value="gender">Gender</option></select></div>
            <div class="col-md-3"><label class="form-label">Color Code Scores</label><select id="sw-color-code" class="form-select form-select-sm"><option value="none">None</option><option value="fail_only">Fail Only (Red)</option><option value="full">Full Spectrum</option></select></div>
            <div class="col-md-3"><label class="form-label">Display Mode</label><select id="sw-mark-type" class="form-select form-select-sm"><option value="total">Total</option><option value="te">TE Only</option><option value="ce">CE Only</option><option value="both">TE + CE</option></select></div>
        </div>
        <div class="text-end my-3 no-print">
            <button id="print-subject-report-btn" class="btn btn-secondary me-2"><i class="fas fa-print me-2"></i>Print Report</button>
        </div>
        <div id="subject-wise-results-container" class="table-responsive"></div>
        <div id="subject-wise-chart-container" class="mb-4" style="height: 300px;">
            <canvas id="subject-performance-canvas"></canvas>
        </div>
    `;

    const classSelect = document.getElementById('sw-class');
    const divisionSelect = document.getElementById('sw-division');
    const subjectSelect = document.getElementById('sw-subject');
    const examsSelect = document.getElementById('sw-exams');
const orderControls = document.getElementById('sw-exams-order-controls');


function renderOrderControls() {
  orderControls.innerHTML = orderedExamIds.map((id, idx) => {
    const exam = exams.find(e => e.id === id);
    return `
      <div>
        <span>${exam ? exam.name : id}</span>
        <button ${idx === 0 ? 'disabled' : ''} data-action="up" data-index="${idx}">↑</button>
        <button ${idx === orderedExamIds.length-1 ? 'disabled' : ''} data-action="down" data-index="${idx}">↓</button>
      </div>
    `;
  }).join('');
}

examsSelect.addEventListener('change', () => {
  orderedExamIds = Array.from(examsSelect.selectedOptions).map(opt => opt.value);
  renderOrderControls();

  // You may also want to refresh any tables/charts that depend on order
});

orderControls.addEventListener('click', (event) => {
  const btn = event.target;
  const idx = Number(btn.dataset.index);
  if (btn.dataset.action === 'up' && idx > 0) {
    [orderedExamIds[idx-1], orderedExamIds[idx]] = [orderedExamIds[idx], orderedExamIds[idx-1]];
    renderOrderControls();
generateSubjectWiseTable();
  }
  if (btn.dataset.action === 'down' && idx < orderedExamIds.length-1) {
    [orderedExamIds[idx+1], orderedExamIds[idx]] = [orderedExamIds[idx], orderedExamIds[idx+1]];
    renderOrderControls();
generateSubjectWiseTable();
  }
  // Refresh results if order matters for rendering
});

    const printButton = document.getElementById('print-subject-report-btn');
    const resultsContainerElement = document.getElementById('subject-wise-results-container');

    const attachListeners = () => {
        [classSelect, divisionSelect, subjectSelect, examsSelect,
         document.getElementById('sw-grading-system'),
         document.getElementById('sw-sort-by'),
         document.getElementById('sw-color-code'),
         document.getElementById('sw-mark-type')
        ].forEach(el => {
            if (el) el.addEventListener('change', generateSubjectWiseTable);
        });
    };

    classSelect.addEventListener('change', () => {
        const selectedClassId = classSelect.value;
        let divisionOptionsHTML = '';
        if (currentUserRole === 'teacher') {
            const teacherAllocationsForClass = classroomSubjects.filter(cs => cs.teacherId === selectedUser.id && cs.classId === selectedClassId);
            divisionOptionsHTML = [...new Set(teacherAllocationsForClass.map(a => a.division))].map(d => `<option value="${d}">${d}</option>`).join('');
        } else {
            const cls = classes.find(c => c.id === selectedClassId);
            divisionOptionsHTML = cls ? cls.divisions.map(d => `<option value="${d}">${d}</option>`).join('') : '';
        }
        divisionSelect.innerHTML = divisionOptionsHTML;
        divisionSelect.dispatchEvent(new Event('change'));
    });

    divisionSelect.addEventListener('change', () => {
        const classId = classSelect.value;
        const division = divisionSelect.value;
        attachMarksListener([{ classId: classId, division: division }]);
        const allocated = classroomSubjects.filter(cs => cs.classId === classId && cs.division === division);
        subjectSelect.innerHTML = allocated.map(a => {
            const subject = subjects.find(s => s.id === a.subjectId);
            return subject ? `<option value="${subject.id}">${subject.name}</option>` : '';
        }).join('');
        generateSubjectWiseTable();
    });

    resultsContainerElement.addEventListener('click', (event) => {
        const header = event.target.closest('.copy-column-header');
        if (header?.dataset.columnType) {
            copySubjectWiseColumnData(header.dataset.columnType);
        }
    });

    printButton.addEventListener('click', () => {
        const subjectName = subjectSelect.options[subjectSelect.selectedIndex]?.text || 'Subject';
        const className = classSelect.options[classSelect.selectedIndex]?.text || 'Class';
        const divisionName = divisionSelect.value || 'Division';
        const examNames = Array.from(examsSelect.selectedOptions).map(opt => opt.text).join(', ') || 'Exams';
        const reportTitle = `Subject-wise Analysis: ${subjectName}`;
        const reportSubtitle = `Class: ${className} - ${divisionName} | Exams: ${examNames}`;
        const customHeader = `...`; // Your header HTML
        printReportWithChart('subject-wise-results-container', 'subject-wise-chart-container', reportTitle, reportSubtitle);
       // printContentOfDiv('pills-subject-wise', reportTitle, { /* print options */ });
    });

    attachListeners();
    if (classSelect.options.length > 0) {
        classSelect.dispatchEvent(new Event('change'));
    } else {
        container.innerHTML += `<p class="text-muted p-5 text-center">No classes or subjects allocated to this teacher.</p>`;
    }
}

/**
 * Main controller function that gathers filter values and orchestrates data processing and rendering.
 */
function generateSubjectWiseTable() {
    const container = document.getElementById('subject-wise-results-container');
    const chartContainer = document.getElementById('subject-wise-chart-container');
    if (!container || !chartContainer) return;

    const classId = document.getElementById('sw-class').value;
    const division = document.getElementById('sw-division').value;
    const subjectId = document.getElementById('sw-subject').value;
    const selectedExamIds = orderedExamIds; // Array.from(document.getElementById('sw-exams').selectedOptions).map(opt => opt.value);
    const sortBy = document.getElementById('sw-sort-by').value;
    const displayMode = document.getElementById('sw-mark-type').value;
    const colorCodeSystem = document.getElementById('sw-color-code').value;
    const gradingSystem = document.getElementById('sw-grading-system').value;

    if (!classId || !division || !subjectId || selectedExamIds.length === 0) {
        container.innerHTML = '<p class="text-muted p-5 text-center">Please select a class, division, subject, and at least one exam.</p>';
        chartContainer.innerHTML = '<canvas id="subject-performance-canvas"></canvas>';
        return;
    }

    const studentsInClass = students.filter(s => s.classId === classId && s.division === division);
    const selectedExams = selectedExamIds.map(id => exams.find(e => e.id === id)).filter(Boolean);
    const results = processSubjectWiseResults(studentsInClass, selectedExams, subjectId, gradingSystem);

    // --- THIS IS THE CORRECTED SORTING LOGIC ---

if (sortBy === 'name') {
    results.sort((a, b) => a.student.name.localeCompare(b.student.name));
} else if (sortBy === 'admnno') {
    // FIX: Treat admissionNumber purely as a string for reliable sorting of complex IDs.
    // The String() wrapper ensures that even if the value is a number, it's compared as a string.
    results.sort((a, b) => 
        String(a.student.admissionNumber || '').localeCompare(String(b.student.admissionNumber || ''))
    );
} else if (sortBy === 'gender') {
    results.sort((a, b) => (a.student.gender || "").localeCompare(b.student.gender || ""));
} else {
    results.sort((a, b) => b.totalSum - a.totalSum);
}
    results.forEach((res, i) => res.rank = i + 1);

    container.innerHTML = renderSubjectWiseTableHTML(results, selectedExams, displayMode, subjectId, colorCodeSystem);
    renderSubjectPerformanceChart(results, selectedExams, gradingSystem, subjectId);
}

/**
 * Generates the HTML for the subject-wise results table.
 */
function renderSubjectWiseTableHTML(results, selectedExams, displayMode, subjectId, colorSystem) {
    let headerRow1 = `<thead><tr><th rowspan="2" class="align-middle">Rank</th><th rowspan="2" class="align-middle copy-column-header" data-column-type="student-name">Name <i class="fas fa-copy copy-icon"></i></th><th rowspan="2" class="align-middle copy-column-header" data-column-type="admission-no">Admn No. <i class="fas fa-copy copy-icon"></i></th>`;
    selectedExams.forEach(exam => {
        const colspan = displayMode === 'both' ? 6 : 3;
        headerRow1 += `<th colspan="${colspan}" class="text-center">${exam.name}</th>`;
    });
    headerRow1 += `<th rowspan="2" class="align-middle copy-column-header" data-column-type="total-sum">Total <i class="fas fa-copy copy-icon"></i></th><th rowspan="2" class="align-middle copy-column-header" data-column-type="avg-percent">Overall % <i class="fas fa-copy copy-icon"></i></th></tr>`;

    let headerRow2 = `<tr>`;
    selectedExams.forEach(exam => {
        const schedule = examSchedules.find(s => s.examId === exam.id && s.subjectId === subjectId);
        const maxTE = schedule?.maxTE || 0, maxCE = schedule?.maxCE || 0, maxTotal = maxTE + maxCE;
        if (displayMode === 'te') headerRow2 += `<th class="copy-column-header" data-column-type="exam-${exam.id}-te">TE/${maxTE} <i class="fas fa-copy copy-icon"></i></th>`;
        else if (displayMode === 'ce') headerRow2 += `<th class="copy-column-header" data-column-type="exam-${exam.id}-ce">CE/${maxCE} <i class="fas fa-copy copy-icon"></i></th>`;
        else if (displayMode === 'total') headerRow2 += `<th class="copy-column-header" data-column-type="exam-${exam.id}-total">Total/${maxTotal} <i class="fas fa-copy copy-icon"></i></th>`;
        else if (displayMode === 'both') {
            headerRow2 += `<th class="copy-column-header" data-column-type="exam-${exam.id}-te">TE/${maxTE}</th><th class="copy-column-header" data-column-type="exam-${exam.id}-te-grade">Grd</th><th class="copy-column-header" data-column-type="exam-${exam.id}-ce">CE/${maxCE}</th><th class="copy-column-header" data-column-type="exam-${exam.id}-ce-grade">Grd</th><th class="copy-column-header" data-column-type="exam-${exam.id}-total">Total/${maxTotal}</th><th class="copy-column-header" data-column-type="exam-${exam.id}-total-grade">Grd</th>`;
        }
        headerRow2 += `<th class="copy-column-header" data-column-type="exam-${exam.id}-percent">%</th><th class="copy-column-header" data-column-type="exam-${exam.id}-grade">Grd</th>`;
    });
    headerRow2 += `</tr></thead>`;

    let bodyHTML = `<tbody>`;
    results.forEach(res => {
        bodyHTML += `<tr><td>${res.rank}</td><td class="text-nowrap">${res.student.name}</td><td>${res.student.admissionNumber || 'N/A'}</td>`;
        selectedExams.forEach(exam => {
            const data = res.markData[exam.id];
            if (data) {
                const schedule = examSchedules.find(s => s.examId === exam.id && s.subjectId === subjectId);
                const maxTE = schedule?.maxTE || 0, maxCE = schedule?.maxCE || 0, maxTotal = maxTE + maxCE;
                const teClass = getColorClass(data.te, maxTE, colorSystem), ceClass = getColorClass(data.ce, maxCE, colorSystem), totalClass = getColorClass(data.total, maxTotal, colorSystem), percentClass = getColorClass(data.percent, 100, colorSystem);
                const gradeClass = (data.grade === 'E' || data.grade === 'F' || data.grade === 'AB') ? 'text-danger fw-bold' : '';
                const teCeGradeClass = (data.teGrade === 'E' || data.teGrade === 'F' || data.ceGrade === 'E' || data.ceGrade === 'F') ? 'text-danger fw-bold' : '';
                if (displayMode === 'te') bodyHTML += `<td class="text-center ${teClass}">${data.te}</td>`;
                else if (displayMode === 'ce') bodyHTML += `<td class="text-center ${ceClass}">${data.ce}</td>`;
                else if (displayMode === 'total') bodyHTML += `<td class="text-center ${totalClass}">${data.total}</td>`;
                else if (displayMode === 'both') {
                    bodyHTML += `<td class="text-center ${teClass}">${data.te}</td><td class="text-center ${teCeGradeClass}">${data.teGrade}</td><td class="text-center ${ceClass}">${data.ce}</td><td class="text-center ${teCeGradeClass}">${data.ceGrade}</td><td class="text-center ${totalClass}">${data.total}</td><td class="text-center ${gradeClass}">${data.totalGrade}</td>`;
                }
                bodyHTML += `<td class="text-center ${percentClass}">${data.percent === 'AB' ? 'AB' : data.percent.toFixed(1)}%</td><td class="text-center ${gradeClass}">${data.grade}</td>`;
            } else {
                const colspan = displayMode === 'both' ? 8 : 3;
                bodyHTML += `<td colspan="${colspan}" class="text-muted text-center">N/A</td>`;
            }
        });
        bodyHTML += `<td class="fw-bold">${res.totalSum}</td><td class="fw-bold">${res.avgPercent.toFixed(1)}%</td></tr>`;
    });
    bodyHTML += `</tbody>`;
    return `<table id="subject-wise-data-table" class="table table-bordered table-sm">${headerRow1}${headerRow2}${bodyHTML}</table>`;
}

/**
 * Processes raw data from marks and schedules into a structured format for the subject-wise table.
 * (Corrected version with specific schedule lookup)
 */
function processSubjectWiseResults(studentsInClass, selectedExams, subjectId, gradingSystem) {
    return studentsInClass.map(student => {
        const markData = {};
        let totalSum = 0;
        let totalMax = 0;

        selectedExams.forEach(exam => {
            // --- FIX: The schedule lookup is now more specific, matching the student's class & division ---
            const schedule = examSchedules.find(s => 
                s.examId === exam.id && 
                s.subjectId === subjectId && 
                s.classId === student.classId && 
                s.division === student.division
            );

            const markId = `${exam.id}_${student.id}_${subjectId}`;
            const mark = marks[markId];

            if (schedule && mark) {
                const te = mark.te === 'AB' ? 'AB' : Number(mark.te || 0);
                const ce = mark.ce === 'AB' ? 'AB' : Number(mark.ce || 0);
                const total = (te === 'AB' || ce === 'AB') ? 'AB' : te + ce;
                const maxTE = schedule.maxTE || 0;
                const maxCE = schedule.maxCE || 0;
                const maxTotal = maxTE + maxCE;
                const percent = (total === 'AB' || maxTotal === 0) ? 'AB' : (total / maxTotal) * 100;
                const gradeFunc = gradingSystem === 'type1' ? calculateGrade : calculateGradeType2;
                
                markData[exam.id] = {
                    te, ce, total, percent, maxTE, maxCE, maxTotal,
                    grade: gradeFunc(total, maxTotal),
                    teGrade: gradeFunc(te, maxTE),
                    ceGrade: gradeFunc(ce, maxCE),
                    totalGrade: gradeFunc(total, maxTotal)
                };

                if (total !== 'AB') {
                    totalSum += total;
                    totalMax += maxTotal;
                }
            } else {
                markData[exam.id] = null; // Mark as null if no schedule or mark is found
            }
        });

        const avgPercent = totalMax > 0 ? (totalSum / totalMax) * 100 : 0;
        return { student, markData, totalSum, avgPercent };
    });
}

/**
 * Renders a bar chart comparing student grade distribution across multiple exams for a single subject.
 */
function renderSubjectPerformanceChart(resultsData, exams, gradingSystem, subjectId) {
    const canvas = document.getElementById('subject-performance-canvas');
    if (!canvas) return;
    try {
        const existingChart = Chart.getChart(canvas);
        if (existingChart) existingChart.destroy();
    } catch (e) {}

    const gradeScale = gradingSystem === 'type1' ? ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'E', 'AB'] : ['O', 'A', 'B', 'C', 'D', 'E', 'F', 'AB'];
    const datasets = exams.map((exam, index) => {
        const gradeCounts = Object.fromEntries(gradeScale.map(g => [g, 0]));
        resultsData.forEach(res => {
            const markInfo = res.markData[exam.id];
            if (markInfo && gradeCounts[markInfo.grade] !== undefined) {
                gradeCounts[markInfo.grade]++;
            }
        });
        return {
            label: exam.name,
            data: Object.values(gradeCounts),
            backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)', 'rgba(75, 192, 192, 0.6)', 'rgba(255, 206, 86, 0.6)'][index % 4]
        };
    });

    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: { labels: gradeScale, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Number of Students' } } },
            plugins: { title: { display: true, text: 'Grade Distribution Analysis' } }
        }
    });
}

/**
 * Copies data from a specific column in the subject-wise results table to the clipboard.
 */
function copySubjectWiseColumnData(columnType) {
    const table = document.getElementById('subject-wise-data-table');
    if (!table) return showAlert('Report table not found.', 'danger');

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    let dataToCopy = [];
    const fixedInitialColsCount = 3;

    rows.forEach(row => {
        let cellValue = '';
        if (columnType === 'student-name') cellValue = row.cells[1]?.textContent.trim() || '';
        else if (columnType === 'admission-no') cellValue = row.cells[2]?.textContent.trim() || '';
        else if (columnType === 'total-sum') cellValue = row.cells[row.cells.length - 2]?.textContent.trim() || '';
        else if (columnType === 'avg-percent') cellValue = row.cells[row.cells.length - 1]?.textContent.replace('%', '').trim() || '';
        else {
            const headerRow2Cells = Array.from(table.querySelectorAll('thead tr')[1].cells);
            const headerCellIndex = headerRow2Cells.findIndex(th => th.dataset.columnType === columnType);
            if (headerCellIndex !== -1) {
                const actualColumnIndexInBody = headerCellIndex + fixedInitialColsCount;
                cellValue = row.cells[actualColumnIndexInBody]?.textContent.trim() || '';
                if (columnType.includes('-percent')) cellValue = cellValue.replace('%', '');
            } else { return; }
        }
        dataToCopy.push(cellValue);
    });

    navigator.clipboard.writeText(dataToCopy.join('\n')).then(() => {
        showAlert('Column data copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy text:', err);
        showAlert('Failed to copy column data.', 'danger');
    });
}
        
        /**
         * New helper function to calculate an alternate grading scale.
         */
        function calculateGradeType2(score, maxScore) {
            if (String(score).toUpperCase() === 'AB') return 'AB';
            if (maxScore === 0) return '-';
            const percentage = (score / maxScore) * 100;
            //if (percentage >= 90) return 'O'; // Outstanding
            if (percentage >= 90) return 'A';
            if (percentage >= 70) return 'B';
            if (percentage >= 50) return 'C';
            if (percentage >= 30) return 'D';
            //if (percentage >= 30) return 'E';
            return 'E'; // Fail
        }
        
        /**
         * New helper function to apply CSS classes for color coding.
         */
        function getColorClass(score, maxScore, colorSystem) {
            if (colorSystem === 'none' || score === 'AB' || maxScore === 0) return '';
            const percentage = (score / maxScore) * 100;
            if (percentage < 35) return 'text-danger fw-bold';
            if (colorSystem === 'full') {
                 if (percentage >= 90) return 'text-success fw-bold';
                 if (percentage >= 80) return 'text-primary';
            }
            return '';
        }

       // Enhanced Subject-Wise Result View with Separate TE, CE, Total, Grade, Rank, Graph, and Filters

/**
 * Generates and displays the detailed subject-wise results table and performance chart.
 * This version features a cleaner, two-row header for exam marks.
 */
  

    window.renderMarkEntryTab = () => {
    const container = document.getElementById('entry');
    let classOptions = '';

    // If the user is a teacher, populate classes based on their specific allocations.
    if (currentUserRole === 'teacher') {
        const teacherAllocations = classroomSubjects.filter(cs => cs.teacherId === selectedUser.id);
        const uniqueClassIds = [...new Set(teacherAllocations.map(a => a.classId))];
        classOptions = uniqueClassIds.map(classId => {
            const c = classes.find(cls => cls.id === classId);
            return c ? `<option value="${c.id}">${c.name}</option>` : '';
        }).join('');
    } else {
        classOptions = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    container.innerHTML = `
        <div class="row g-1 align-items-end border-bottom pb-3 mb-3">
    <div class="col-6 col-md-2"><label class="form-label">Exam</label><select id="mark-entry-exam" class="form-select">${exams.filter(e => e.isActive).map(ex => `<option value="${ex.id}">${ex.name}</option>`).join('')}</select></div>
    <div class="col-6 col-md-2"><label class="form-label">Class</label><select id="mark-entry-class" class="md form-select"><option value="">-- Select Class --</option>${classOptions}</select></div>
    <div class="col-6 col-md-2"><label class="form-label">Division</label><select id="mark-entry-division" class="form-select" disabled><option value="">-- Select Division --</option></select></div>
    <div class="col-6 col-md-2"><label class="form-label">Subject</label><select id="mark-entry-subject" class="form-select" disabled><option value="">-- Select Subject --</option></select></div>
</div>
        <div id="mark-entry-sheet"></div>
        <div id="mark-entry-summary-container"></div>
    `;

    const examSelect = document.getElementById('mark-entry-exam');
    const classSelect = document.getElementById('mark-entry-class');
    const divisionSelect = document.getElementById('mark-entry-division');
    const subjectSelect = document.getElementById('mark-entry-subject');

    // --- NEW: Centralized controller for the view ---
    const updateMarkEntryView = () => {
        const examId = examSelect.value;
        const classId = classSelect.value;
        const division = divisionSelect.value;
        const subjectId = subjectSelect.value;

        // Clear both containers to prevent old content from lingering
        document.getElementById('mark-entry-sheet').innerHTML = '';
        document.getElementById('mark-entry-summary-container').innerHTML = '';
        
        // Decide what to render based on the current selections
        if (examId && classId && division && subjectId) {
            // All options selected: Load the mark entry sheet
            loadMarkEntrySheetobject(examId, classId, division, subjectId);
            
        } else if (examId && !classId) {
            // Only exam selected: Show the summary table
            renderMarkEntrySummaryTable(examId);
            document.getElementById('mark-entry-summary-container').innerHTML = '<p class="text-danger p-5 text-center">you have no proper internet connection</p>';
        
        } else {
             // Not enough options selected, show a placeholder
             document.getElementById('mark-entry-summary-container').innerHTML = '<p class="text-muted p-5 text-center">Select Exam, Class, and Division to see subjects, or just an Exam for a summary.</p>';
        }
    };

    // --- REFACTORED: This function now only populates subjects, then updates the view ---
    const populateSubjects = () => {
        const examId = examSelect.value;
        const classId = classSelect.value;
        const division = divisionSelect.value;
        
        subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
        subjectSelect.disabled = true;

        if (examId && classId && division) {
            let scheduledSubjects = examSchedules.filter(s => s.examId === examId && s.classId === classId && s.division === division);

            if (currentUserRole === 'teacher') {
                const teacherSubjectIds = classroomSubjects
                    .filter(cs => cs.teacherId === selectedUser.id && cs.classId === classId && cs.division === division)
                    .map(cs => cs.subjectId);
                scheduledSubjects = scheduledSubjects.filter(s => teacherSubjectIds.includes(s.subjectId));
            }
            
            if (scheduledSubjects.length > 0) {
                subjectSelect.innerHTML += scheduledSubjects.map(schedule => {
                    const subjectDetails = subjects.find(sub => sub.id === schedule.subjectId);
                    return subjectDetails ? `<option value="${subjectDetails.id}">${subjectDetails.name}</option>` : '';
                }).join('');
                subjectSelect.disabled = false;
            }
        }
        updateMarkEntryView(); // Call the controller to refresh the UI
    };
    
    // --- REFACTORED: A new function to handle both division and subject population ---
    const populateDivisionsAndSubjects = () => {
        const selectedClassId = classSelect.value;
        divisionSelect.innerHTML = '<option value="">-- Select Division --</option>';
        divisionSelect.disabled = true;

        if (selectedClassId) {
            let divisionOptionsHTML = '';
            if (currentUserRole === 'teacher') {
                const teacherAllocationsForClass = classroomSubjects.filter(cs => cs.teacherId === selectedUser.id && cs.classId === selectedClassId);
                const uniqueDivisions = [...new Set(teacherAllocationsForClass.map(a => a.division))];
                divisionOptionsHTML = uniqueDivisions.map(d => `<option value="${d}">${d}</option>`).join('');
            } else {
                const cls = classes.find(c => c.id === selectedClassId);
                divisionOptionsHTML = cls ? cls.divisions.map(d => `<option value="${d}">${d}</option>`).join('') : '';
            }
            if(divisionOptionsHTML) {
                divisionSelect.innerHTML += divisionOptionsHTML;
                divisionSelect.disabled = false;
            }
        }
        populateSubjects(); // This will trigger the subject population and the view update
    };

    // --- REFACTORED: Event Listeners now call the new functions ---
    examSelect.addEventListener('change', populateSubjects);
    classSelect.addEventListener('change', populateDivisionsAndSubjects);
    divisionSelect.addEventListener('change', populateSubjects);
    subjectSelect.addEventListener('change', updateMarkEntryView);

    // Initial population and view setup on page load
    if (examSelect.options.length > 0) {
        examSelect.value = examSelect.options[0].value; // Auto-select the first exam
    }
    if (classSelect.options.length > 1) { // Check if there's more than the placeholder
        classSelect.value = classSelect.options[1].value; // Auto-select the first available class
    }
    
    // Dispatch a change event to kick off the whole process
    examSelect.dispatchEvent(new Event('change'));
    if (classSelect.value) {
        classSelect.dispatchEvent(new Event('change'));
    }
}

// =========================================================================
// --- ✍️ MARK ENTRY MODULE (OPTIMIZED SAVE LOGIC) ---
// =========================================================================

async function loadMarkEntrySheet(examId, classId, division, subjectId) {
    const container = document.getElementById('mark-entry-sheet');
    if (!examId || !classId || !division || !subjectId) {
        container.innerHTML = `<div class="text-center p-5 text-muted">Please select all filters to enter marks.</div>`;
        return;
    }
    
    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary"></div><p class="mt-2">Loading student marks...</p></div>`;

    const schedule = examSchedules.find(s => s.examId === examId && s.classId === classId && s.division === division && s.subjectId === subjectId);
    if (!schedule) {
        container.innerHTML = '<div class="alert alert-danger">Could not find a valid exam schedule for this selection.</div>';
        return;
    }
    
    const maxTE = schedule.maxTE || 0;
    const maxCE = schedule.maxCE || 0;
    const studentsInClass = students
        .filter(s => s.classId === classId && s.division === division && s.status !== 'TC Issued' && s.status !== 'Graduated')
        .sort((a, b) => a.name.localeCompare(b.name));

    if (studentsInClass.length === 0) {
        container.innerHTML = '<div class="alert alert-warning">No active students found in this class/division.</div>';
        return;
    }
    
    const marksForSheet = {};
    try {
        const q = query(getCollectionRef('marks'), 
            where('examId', '==', examId),
            where('classId', '==', classId),
            where('division', '==', division),
            where('subjectId', '==', subjectId)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
            const markData = doc.data();
            marksForSheet[markData.studentId] = markData;
        });
    } catch (error) {
        console.error("Error fetching marks directly:", error);
        showAlert('Could not fetch the latest marks. Data may be from cache.', 'danger');
        studentsInClass.forEach(student => {
            const markId = `${examId}_${student.id}_${subjectId}`;
            if (marks[markId]) {
                marksForSheet[student.id] = marks[markId];
            }
        });
    }
    
    const enteredStudents = studentsInClass.filter(student => marksForSheet[student.id]).map(s => s.name);
    const notEnteredStudents = studentsInClass.filter(student => !marksForSheet[student.id]).map(s => s.name);

    const summaryHTML = `
        <div class="card bg-light p-3 mb-4 border-0">
            <h6 class="fw-bold">Entry Status</h6>
            <div class="d-flex justify-content-around text-center mt-2">
                <div><h5 class="mb-0">${studentsInClass.length}</h5><small class="text-muted">Total Students</small></div>
                <div><h5 class="mb-0 text-success">${enteredStudents.length}</h5><small class="text-muted">Marks Entered</small></div>
                <div><h5 class="mb-0 text-danger">${notEnteredStudents.length}</h5><small class="text-muted">Pending</small></div>
            </div>
            ${notEnteredStudents.length > 0 ? `
            <div class="mt-3">
                <a class="btn btn-sm btn-outline-secondary" data-bs-toggle="collapse" href="#pending-list-collapse" role="button">Show Pending Student List</a>
                <div class="collapse mt-2" id="pending-list-collapse">
                    <ul class="list-group list-group-flush small">${notEnteredStudents.map(name => `<li class="list-group-item py-1 bg-light">${name}</li>`).join('')}</ul>
                </div>
            </div>` : ''}
        </div>`;

    let tableHTML = `<div class="table-responsive"><table id="marks-table" class="table table-bordered">
        <thead class="table-light"><tr><th>Student Name</th><th>Admission No.</th><th>Theory / ${maxTE}</th><th>Internal / ${maxCE}</th></tr></thead><tbody>`;
    
    studentsInClass.forEach(student => {
        const mark = marksForSheet[student.id];
        const teValue = mark?.te === 'AB' ? 'AB' : (mark?.te ?? '');
        const ceValue = mark?.ce === 'AB' ? 'AB' : (mark?.ce ?? '');
        
        // --- MODIFICATION: Add data-original-value to track changes ---
        tableHTML += `<tr data-student-id="${student.id}">
            <td class="fw-bold">${student.name}</td><td>${student.admissionNumber}</td>
            <td><input type="text" name="te" class="form-control form-control-sm" value="${teValue}" data-max="${maxTE}" data-original-value="${teValue}"></td>
            <td><input type="text" name="ce" class="form-control form-control-sm" value="${ceValue}" data-max="${maxCE}" data-original-value="${ceValue}"></td>
        </tr>`;
    });
    
    tableHTML += `</tbody></table></div><div class="text-end mt-3"><button id="save-marks-btn" class="btn btn-success">Save Changes</button></div>`;
    
    container.innerHTML = summaryHTML + tableHTML;
    document.getElementById('mark-entry-summary-container').innerHTML = '';

    container.querySelectorAll('input[name="te"], input[name="ce"]').forEach(input => {
        if(input.value.toUpperCase() === 'AB') { input.classList.add('absent-mark'); }
        input.addEventListener('input', (e) => {
            e.target.classList.remove('absent-mark');
            if(e.target.value.toUpperCase() === 'AB') { e.target.classList.add('absent-mark'); return; }
            const maxValue = parseInt(e.target.dataset.max, 10);
            const currentValue = parseInt(e.target.value, 10);
            if (!isNaN(currentValue) && currentValue > maxValue) { e.target.value = ''; }
        });
    });
    document.getElementById('save-marks-btn').addEventListener('click', () => saveMarks(examId, classId, division, subjectId));
}

/**
 * Saves marks ONLY for the rows that have been changed by the user.
 */
async function saveMarks(examId, classId, division, subjectId) {
    const examSelect = document.getElementById('mark-entry-exam');
    examId=examSelect.value;

    const saveButton = document.getElementById('save-marks-btn');
    if (!saveButton) return;

    const originalButtonHtml = saveButton.innerHTML;
    saveButton.disabled = false;
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Saving...`;

    try {
        const batch = writeBatch(db);
        const markRows = document.querySelectorAll('#marks-table tbody tr');
        let changesFound = 0;

        markRows.forEach(row => {
            const studentId = row.dataset.studentId;
            const teInput = row.querySelector('input[name="te"]');
            const ceInput = row.querySelector('input[name="ce"]');

            const originalTE = teInput.dataset.originalValue;
            const currentTE = teInput.value.trim();
            const originalCE = ceInput.dataset.originalValue;
            const currentCE = ceInput.value.trim();

            // --- MODIFICATION: Check if the row has changed ---
            if (originalTE !== currentTE || originalCE !== currentCE) {
                // If both inputs are now empty, it means we are clearing the mark.
                // For now, we will treat this as a change to save.
                // A more advanced version could handle deletion.
                if (currentTE === '') {
                    // Decide if clearing marks should delete the document.
                    // For simplicity, we'll just skip saving if both are blank.
                    return; 
                }
                if (currentTE === '' && currentCE === '') {
                    // Decide if clearing marks should delete the document.
                    // For simplicity, we'll just skip saving if both are blank.
                    return; 
                }

                changesFound++;
                const te = currentTE.toUpperCase() === 'AB' ? 'AB' : (parseInt(currentTE) || 0);
                const ce = currentCE.toUpperCase() === 'AB' ? 'AB' : (parseInt(currentCE) || 0);
                
                const markId = `${examId}_${studentId}_${subjectId}`;
                const markRef = getDocRef('marks', markId);
                batch.set(markRef, { examId, classId, division, subjectId, studentId, te, ce, lastUpdated: serverTimestamp() });
            }
        });

        if (changesFound > 0) {
            await batch.commit();
            showAlert(`${changesFound} student mark(s) saved successfully!`, 'success');
            // Reload the sheet to refresh original values and stats
            loadMarkEntrySheetobject(examId, classId, division, subjectId); 
        } else {
            showAlert('No changes detected to save.', 'info');
        }

    } catch (error) {
        console.error("Error saving marks:", error);
        showAlert("Could not save marks. Please check the console.", "danger");
        saveButton.disabled = false;
        saveButton.innerHTML = originalButtonHtml;
    } finally {
        saveButton.disabled = false;
        saveButton.innerHTML = originalButtonHtml;
    }
}

/**
 * Loads the mark entry sheet by directly querying the database for all marks
 * matching the selected class and division for the current academic year.
 * This is the most reliable way to fetch the data.
 */
async function loadMarkEntrySheetobject(examId, classId, division, subjectId) {
    
    // --> 1. Guard against missing container
    const container = document.getElementById('mark-entry-sheet');
    if (!container) {
        console.error("Fatal Error: 'mark-entry-sheet' container not found in the DOM.");
        return;
    }

    // Helper function to show errors/messages in the container
    const showMessage = (message, type = 'muted') => {
        let alertClass = 'text-muted';
        if (type === 'danger') alertClass = 'alert alert-danger';
        if (type === 'warning') alertClass = 'alert alert-warning';
        container.innerHTML = `<div class="text-center p-5 ${alertClass}">${message}</div>`;
    };

    if (!examId || !classId || !division || !subjectId) {
        showMessage(`Please select all filters to enter marks.`);
        return;
    }
    

    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary"></div><p class="mt-2">Loading student marks...</p></div>`;

    // --> 2. Guard against missing global/external data
    if (!Array.isArray(examSchedules)) {
        showMessage('Error: Exam schedules are not loaded.', 'danger');
        return;
    }
    if (!Array.isArray(students)) {
        showMessage('Error: Student list is not loaded.', 'danger');
        return;
    }
    if (!activeFinancialYear) {
        showMessage('Error: Active academic year is not set.', 'danger');
        return;
    }

    const schedule = examSchedules.find(s => s.examId === examId && s.classId === classId && s.division === division && s.subjectId === subjectId);
    if (!schedule) {
        showMessage('Could not find a valid exam schedule for this selection.', 'danger');
        return;
    }
    
    const maxTE = schedule.maxTE || 0;
    const maxCE = schedule.maxCE || 0;
    const studentsInClass = students
        .filter(s => s.classId === classId && s.division === division && s.status !== 'TC Issued' && s.status !== 'Graduated')
        .sort((a, b) => a.name.localeCompare(b.name));

    if (studentsInClass.length === 0) {
        showMessage('No active students found in this class/division.', 'warning');
        return;
    }
    if (!navigator.onLine) {
        showMessage('Error: no proper internet connection.', 'danger');
        return;
    }

    // --- THIS IS THE REFACTORED FETCH LOGIC ---
    const marksForSheet = {};
    try {
        const academicYear = activeFinancialYear;
        const marksCollectionName = `marks-${academicYear}`;
        
        const q = query(getCollectionRef(marksCollectionName), 
            where('classId', '==', classId),
            where('division', '==', division)
        );
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(doc => {
            const allMarksForStudent = doc.data();
            // 3. Navigate the nested object to get the specific mark for this exam and subject.
            const exam = `marks.${examId}.${subjectId}`;
            const specificMark = allMarksForStudent?.[exam];
            if (specificMark) {
                marksForSheet[doc.id] = specificMark; // doc.id is the studentId
            }
        });
    } catch (error) {
        console.error("Error fetching marks directly:", error);
        // Use the helper to show a consistent error
        showMessage(`Error fetching data: ${error.message}. Please check your connection.`, 'danger');
        return;
    }
    
    // --- The rest of the function renders the UI with the fetched data ---
    const enteredStudents = studentsInClass.filter(student => marksForSheet[student.id]).map(s => s.name);
    const notEnteredStudents = studentsInClass.filter(student => !marksForSheet[student.id]).map(s => s.name);

    const summaryHTML = `
        <div class="card bg-light p-3 mb-4 border-0">
            <h6 class="fw-bold">Entry Status</h6>
            <div class="d-flex justify-content-around text-center mt-2">
                <div><h5 class="mb-0">${studentsInClass.length}</h5><small class="text-muted">Total</small></div>
                <div><h5 class="mb-0 text-success">${enteredStudents.length}</h5><small class="text-muted">Entered</small></div>
                <div><h5 class="mb-0 text-danger">${notEnteredStudents.length}</h5><small class="text-muted">Pending</small></div>
            </div>
            ${notEnteredStudents.length > 0 ? `<div class="mt-3"><a class="btn btn-sm btn-outline-secondary" data-bs-toggle="collapse" href="#pending-list-collapse">Show Pending</a><div class="collapse mt-2" id="pending-list-collapse"><ul class="list-group list-group-flush small">${notEnteredStudents.map(name => `<li class="list-group-item py-1 bg-light">${name}</li>`).join('')}</ul></div></div>` : ''}
            <p style="color:red;">for Absentees enter "00"</p>
        </div>`;

    let tableHTML = `<div class="table-responsive"><table id="marks-table" class="table table-bordered">
        <thead class="table-light"><tr><th>Sl</th><th>Student Name</th><th>Theory / ${maxTE}</th><th>Internal / ${maxCE}</th></tr></thead><tbody>`;
    let index= 0;
    studentsInClass.forEach(student => {
    index++
        const mark = marksForSheet[student.id];
        const teValue = mark?.te ?? '';
        const ceValue = mark?.ce ?? '';
        
        tableHTML += `<tr data-student-id="${student.id}"data-student-name="${student.name}">
            <td class="fw-bold">${index}</td>
            <td class="fw-bold">${student.name}<br>(${student.admissionNumber})</td>
            <td><input type="${String(teValue).toUpperCase()==="AB"?"text":"number"}"name="te" class="form-control form-control-sm" value="${teValue}" data-max="${maxTE}" data-original-value="${teValue}"></td>
            <td><input type="${parseInt(ceValue)? "number" : "text"}" name="ce" class="form-control form-control-sm" value="${ceValue}" data-max="${maxCE}" data-original-value="${ceValue}"></td>
        </tr>`;
    });
    
    tableHTML += `</tbody></table></div><div class="text-end mt-3"><button id="save-marks-btn" class="btn btn-success">Save Changes</button></div>`;
    
    container.innerHTML = summaryHTML + tableHTML;

    // Attach event listeners
    container.querySelectorAll('input[name="te"], input[name="ce"]').forEach(input => {
        if(String(input.value).toUpperCase() === 'AB') { input.classList.add('absent-mark'); }
        input.addEventListener('input', (e) => {
            e.target.classList.remove('absent-mark');
            if(e.target.value.toUpperCase() === 'AB'||e.target.value.toUpperCase() === '00') { e.target.classList.add('absent-mark'); e.target.type = "text"; e.target.value = "Ab"; return; }
            
            // --> Added a check for empty string to avoid NaN issues
            if (e.target.value === '') { return; } 

            const maxValue = parseInt(e.target.dataset.max, 10);
            const currentValue = parseInt(e.target.value, 10);
            
            // --> Handle non-numeric input gracefully
            if (!isNaN(currentValue) && currentValue > maxValue) { e.target.value = ''; }
        });
    });
    
    // --> 4. Safely attach listener for the save button
    const saveButton = document.getElementById('save-marks-btn');
    if (saveButton) {
        saveButton.addEventListener('click', () => saveMarksobject(examId, classId, division, subjectId));
    } else {
        console.warn("Could not find 'save-marks-btn' to attach listener.");
    }
}

/**
 * Saves marks ONLY for the rows that have been changed by the user, using the
 * new, efficient student-centric and year-based data model.
 * @param {string} examId
 * @param {string} classId
 * @param {string} division
 * @param {string} subjectId
 */
async function saveMarksobject(examId, classId, division, subjectId) {
    const saveButton = document.getElementById('save-marks-btn');
    if (!saveButton) return;

    const originalButtonHtml = saveButton.innerHTML;
    saveButton.disabled = true;
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Saving...`;

    try {
        const batch = writeBatch(db);
        const markRows = document.querySelectorAll('#marks-table tbody tr');
        let changesFound = 0;
        const academicYear = activeFinancialYear; // Get the current academic year

        for (const row of markRows) {
            
            const studentId = row.dataset.studentId;
            const studentAdnumber = row.dataset.studentName;
            const teInput = row.querySelector('input[name="te"]');
            const ceInput = row.querySelector('input[name="ce"]');

            const originalTE = teInput.dataset.originalValue;
            const currentTE = teInput.value.trim();
            const originalCE = ceInput.dataset.originalValue;
            const currentCE = ceInput.value.trim();

            // Only process rows where marks have actually changed
            if (originalTE !== currentTE || originalCE !== currentCE) {
                if (currentTE === '' && currentCE === '') {
                    // If both fields are cleared, skip saving to avoid empty records.
                    // A more advanced version could delete the mark field here.
                    continue;
                }

                
                changesFound++;

                const te = currentTE.toUpperCase() === 'AB' ? 'AB' : currentTE.toUpperCase() === '0'? '0':(parseInt(currentTE)||"");
                const ce = currentCE.toUpperCase() === 'AB' ? 'AB' : currentCE.toUpperCase() === '0' ? '0' :(parseInt(currentCE)||"");
                
                if(te===""){
                    var message = `No empty marks save.${studentAdnumber}`;
                    showAlert(message, 'info');
                    saveButton.disabled = false;
                    saveButton.innerHTML = originalButtonHtml;
                    return
                }
                
                // 1. The collection name is now dynamic, based on the active year.
                const marksCollectionName = `marks-${academicYear}`;
                // 2. The document ID is just the student's ID.
                const markRef = getDocRef(marksCollectionName, studentId);

                // 3. We use dot notation to update a specific, nested field within the document.
                const updateData = {
                    [`marks.${examId}.${subjectId}`]: { te, ce },
                    // Store student info for easier querying
                    studentId: studentId, 
                    classId: classId,
                    division: division,
                    lastUpdated: serverTimestamp()
                };
                
                // 4. Use { merge: true } to add/update marks without overwriting the whole document.
                batch.set(markRef, updateData, { merge: true });
            }
        }

        if (changesFound > 0) {
            await batch.commit();
            showAlert(`${changesFound} student mark(s) saved successfully!`, 'success');
            // Reload the sheet to refresh the "original values" and entry stats
            loadMarkEntrySheetobject(examId, classId, division, subjectId); 
        } else {
            showAlert('No changes were detected to save.', 'info');
        }

    } catch (error) {
        console.error("Error saving marks:", error);
        showAlert("Could not save marks. Please check the console.", "danger");
    } finally {
        // This block always runs, ensuring the button is restored to its original state
        saveButton.disabled = false;
        saveButton.innerHTML = originalButtonHtml;
    }
}
        
/**
 * Renders a summary table of mark entry status for a given exam across all classes.
 * @param {string} examId The ID of the exam to summarize.
 */
// Global variable to hold the summary data and filter state
let currentSummaryData = [];
let showPendingOnly = false;

window.renderMarkEntrySummaryTable = (examId) => {
    const summaryContainer = document.getElementById('mark-entry-summary-container');
    if (!summaryContainer) return;

    if (!examId) {
        summaryContainer.innerHTML = '<p class="text-muted p-5 text-center">Select an exam to view the summary.</p>';
        return;
    }

    // --- Data Calculation Logic (remains the same) ---
    let fullSummaryData = [];
    const schedulesForExam = examSchedules.filter(s => s.examId === examId);

    schedulesForExam.forEach(schedule => {
        const { classId, division, subjectId } = schedule;
        const studentsInClass = students

    .filter(s => s.classId === classId && s.division === division && s.status !== 'TC Issued')

    .sort((a, b) => a.name.localeCompare(b.name));
const totalStudents = studentsInClass.length;

        if (totalStudents === 0) return;

        // Corrected logic to check the global 'marks' object
        let enteredCount = 0;
        studentsInClass.forEach(student => {
            const markId = `${examId}_${student.id}_${subjectId}`;
            if (marks[markId]) { // Check if a key exists in the marks object
                enteredCount++;
            }
        });

        const className = classes.find(c => c.id === classId)?.name || 'N/A';
        const subjectName = subjects.find(sub => sub.id === subjectId)?.name || 'N/A';

        fullSummaryData.push({
            className,
            division,
            subjectName,
            total: totalStudents,
            entered: enteredCount,
            pending: totalStudents - enteredCount
        });
    });

    fullSummaryData.sort((a,b) => (a.className + a.division + a.subjectName).localeCompare(b.className + b.division + a.subjectName));
    
    // Store the full data globally
    currentSummaryData = fullSummaryData;
    
    // Call the new rendering function
    renderFilteredSummaryTable(examId);
};

/**
 * 2. RENDERS the summary table based on the current filter state.
 */
const renderFilteredSummaryTable = (examId) => {
    const summaryContainer = document.getElementById('mark-entry-summary-container');
    if (!summaryContainer) return;
    
    let displayData = currentSummaryData;

    // --- APPLY THE FILTER ---
    if (showPendingOnly) {
        displayData = currentSummaryData.filter(row => row.pending > 0);
    }
    
    // --- GENERATE HTML with the new toggle button ---
    const tableHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0">Mark Entry Status for: <strong>${exams.find(e=>e.id===examId)?.name}</strong></h5>
           
        </div>
        <div id="mark-entry-summary-printable" class="table-responsive">
            <table class="table table-bordered table-hover table-sm">
                <thead class="table-light">
                    <tr>
                        <th>Class</th>
                        <th>Subject</th>
                        <th class="text-center">Total Students</th>
                        <th class="text-center text-success">Entered</th>
                        <th class="text-center text-danger">Pending</th>
                        <th class="text-center" style="width: 20%;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${displayData.map(row => {
                        const percentage = row.total > 0 ? (row.entered / row.total) * 100 : 0;
                        const statusClass = percentage === 100 ? 'bg-success' : (percentage > 0 ? 'bg-warning' : 'bg-danger');
                        return `
                        <tr>
                            <td>${row.className} - ${row.division}</td>
                            <td>${row.subjectName}</td>
                            <td class="text-center">${row.total}</td>
                            <td class="text-center text-success">${row.entered}</td>
                            <td class="text-center text-danger">${row.pending}</td>
                            <td>
                                <div class="progress" style="height: 20px;">
                                    <div class="progress-bar ${statusClass}" role="progressbar" style="width: ${percentage}%;" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">${percentage.toFixed(0)}%</div>
                                </div>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            ${displayData.length === 0 ? '<p class="text-muted text-center py-4">No pending entries for this exam.</p>' : ''}
        </div>
    `;
    
    summaryContainer.innerHTML = tableHTML;
    
};



const exportSummaryToPdf = async (examId) => {
    const { jsPDF } = window.jspdf;
    const input = document.getElementById('mark-entry-summary-printable');
    
    if (!input) {
        showAlert('Error: Summary table not found for export.', 'danger');
        return;
    }

    // Show a loading message
    const originalContent = input.innerHTML;
    input.innerHTML = '<div class="text-center my-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Generating PDF...</p></div>';

    try {
        const examName = exams.find(e => e.id === examId)?.name || 'Exam Summary';

        // Use html2canvas to convert the HTML table to an image
        const canvas = await html2canvas(input, {
            scale: 2, // Increase scale for better resolution
            useCORS: true,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' for portrait, 'mm' for units, 'a4' for page size
        
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        // Add header
        pdf.setFontSize(18);
        pdf.text('Mark Entry Summary', 105, 15, null, null, 'center');
        pdf.setFontSize(12);
        pdf.text(`Exam: ${examName}`, 105, 25, null, null, 'center');
        pdf.line(15, 30, 195, 30); // Draw a line
        position = 35; // Start position for the image after the header

        // Add the image to the PDF
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - position);

        // Handle multiple pages for long tables
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(`Mark_Entry_Summary_${examName.replace(/\s/g, '_')}.pdf`);
        showAlert('PDF export successful!', 'success');
        
    } catch (error) {
        console.error('PDF generation failed:', error);
        showAlert('Failed to generate PDF. Please try again.', 'danger');
    } finally {
        // Restore the original content of the container
        input.innerHTML = originalContent;
    }
};

        /**
 * Main controller for the Rank List tab.
 * It triggers the data loading and then calls the processing and rendering functions.
 * @param {HTMLElement} container - The DOM element to render the report into.
 */
async function generateResultsTable(container) {
    const examId = document.getElementById('res-exam').value;
    const classId = document.getElementById('res-class').value;
    const division = document.getElementById('res-division').value;
    
    if (!examId || !classId || !division) { 
        container.innerHTML = `<p class="text-center p-5 text-muted">Please select all filters.</p>`; 
        return; 
    }
    
    // --- CORRECTED: Use the dynamic listener to fetch only the required marks ---
    // This will automatically trigger the report to re-render when data arrives.
    await attachMarksListener([{ classId: classId, division: division }]);
    // Process and render the table with currently available data
    const studentsInClass = students

    .filter(s => s.classId === classId && s.division === division && s.status !== 'TC Issued')

    .sort((a, b) => a.name.localeCompare(b.name));
const schedulesForClass = examSchedules.filter(s => s.examId === examId && s.classId === classId && s.division === division);
    
    // The global 'marks' object will be used here
    let results = processRankListData(studentsInClass, schedulesForClass, marks, examId);
    
    // Sort results by total marks in descending order
    results.sort((a, b) => b.totalMark - a.totalMark);

    // Render the final HTML table
    container.innerHTML = renderRankListTable(results);
}


/**
 * Processes data to calculate totals and status for the rank list.
 * @returns {Array} An array of student result objects.
 */
function processRankListData(studentsInClass, schedulesForClass, marksObject, examId) {
    let results = [];
    studentsInClass.forEach(student => {
        let totalMark = 0, maxTotal = 0, status = 'PASS';
        
        schedulesForClass.forEach(schedule => {
            // --- FIXED: Direct object lookup for performance ---
            const markId = `${examId}_${student.id}_${schedule.subjectId}`;
            const mark = marksObject[markId];

            const te = mark?.te;
            const ce = mark?.ce;
            const subjectTotal = (te === 'AB' || ce === 'AB') ? 'AB' : (Number(te) || 0) + (Number(ce) || 0);
            
            // Determine fail status
            if (subjectTotal === 'AB' || (typeof subjectTotal === 'number' && (subjectTotal / (schedule.maxTE + schedule.maxCE) < 0.35))) {
                status = 'FAIL';
            }
            
            if (typeof subjectTotal === 'number') {
                totalMark += subjectTotal;
            }
            maxTotal += (schedule.maxTE || 0) + (schedule.maxCE || 0);
        });

        const percentage = maxTotal > 0 ? ((totalMark / maxTotal) * 100).toFixed(2) : 0;
        results.push({ student, totalMark, maxTotal, percentage, status });
    });
    return results;
}


/**
 * Renders the HTML for the rank list table, correctly handling ties.
 * @param {Array} sortedResults - The array of sorted student result objects.
 * @returns {string} The complete HTML string for the table.
 */
function renderRankListTable(sortedResults) {
    let tableHTML = `<div class="table-responsive"><table class="table table-bordered table-hover">
        <thead class="table-light"><tr><th>Rank</th><th>Name</th><th>Total</th><th>%</th><th>Result</th></tr></thead>
        <tbody>`;

    let lastMark = -1;
    let lastRank = 0;

    sortedResults.forEach((res, index) => {
        // --- NEW: Correctly handle rank ties ---
        let currentRank;
        if (res.status === 'FAIL') {
            currentRank = '-';
        } else {
            // If the current student's score is the same as the previous one, they get the same rank
            if (res.totalMark === lastMark) {
                currentRank = lastRank;
            } else {
                currentRank = index + 1;
                lastRank = currentRank;
            }
            lastMark = res.totalMark;
        }

        tableHTML += `
            <tr class="${res.status === 'FAIL' ? 'table-danger' : ''}">
                <td class="fw-bold">${currentRank}</td>
                <td>${res.student.name}</td>
                <td>${res.totalMark} / ${res.maxTotal}</td>
                <td>${res.percentage}%</td>
                <td class="fw-bold">${res.status === 'PASS' ? 'PASS' : 'FAIL'}</td>
            </tr>`;
    });

    tableHTML += `</tbody></table></div>`;
    return tableHTML;
}
  /**
 * Renders the enhanced Report Card tab with class filters, a student list,
 * a "Print All" button, and a new "Print This Card" button for individual reports.
 */
function renderReportCardTab() {
    const container = document.getElementById('pills-reportcard');
    if (!container) return;

    //const classOptions = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
 // Sort exams to show active ones first
    const sortedExams = [...exams].sort((a, b) => (b.isActive || false) - (a.isActive || false));

    container.innerHTML = `
        <div class="row g-3 no-print">
            <div class="col-md-3">
                <label for="rc-class-select" class="form-label">Class</label>
                <select id="rc-class-select" class="form-select">
                    <option value="">-- Select Class --</option>
                    ${classOptions}
                </select>
            </div>
            <div class="col-md-3">
                <label for="rc-division-select" class="form-label">Division</label>
                <select id="rc-division-select" class="form-select" disabled></select>
            </div>
            <div class="col-md-6">
                <label for="rc-exam-select" class="form-label">Exam(s) for Report</label>
                <select id="rc-exam-select" class="form-select" multiple size="3">
                    ${sortedExams.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
                </select>
                <small class="form-text text-muted">Hold Ctrl/Cmd to select multiple exams for comparison.</small>
            </div>
        </div>
        <hr class="no-print">
        
        <div class="row">
            <div class="col-md-4 no-print">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">Students in Class</h6>
                        <button id="rc-print-all-btn" class="btn btn-primary btn-sm" disabled>
                            <i class="fas fa-print me-2"></i>Print All
                        </button>
                    </div>
                    <div id="rc-student-list" class="list-group list-group-flush" style="max-height: 60vh; overflow-y: auto;">
                        <p class="p-3 text-muted">Select a class and division.</p>
                    </div>
                </div>
            </div>
            <div class="col-md-8">
                 <div id="report-card-view-wrapper">
                    <div id="rc-header" class="d-flex justify-content-between align-items-center mb-3 no-print" style="display: none !important;">
                        <h5 id="rc-student-name-header" class="mb-0">Progress Report</h5>
                        <button id="rc-print-single-btn" class="btn btn-secondary btn-sm">
                            <i class="fas fa-print me-2"></i>Print This Card
                        </button>
                    </div>
                    <div id="rc-results-container">
                        <p class="text-center p-5 text-muted">Select a student from the list to view their report card.</p>
                    </div>
                 </div>
            </div>
        </div>
    `;

    // --- Get all necessary DOM elements ---
    const classSelect = document.getElementById('rc-class-select');
    const divisionSelect = document.getElementById('rc-division-select');
    const examSelect = document.getElementById('rc-exam-select');
    const studentListContainer = document.getElementById('rc-student-list');
    const resultsContainer = document.getElementById('rc-results-container');
    const printAllBtn = document.getElementById('rc-print-all-btn');
    const rcHeader = document.getElementById('rc-header');
    const rcStudentNameHeader = document.getElementById('rc-student-name-header');
    const printSingleBtn = document.getElementById('rc-print-single-btn');

    const updateStudentList = () => {
        const classId = classSelect.value;
        const division = divisionSelect.value;

        rcHeader.style.display = 'none'; // Hide single print header
        resultsContainer.innerHTML = `<p class="text-center p-5 text-muted">Select a student from the list.</p>`;
        printAllBtn.disabled = true;

        if (!classId || !division) {
            studentListContainer.innerHTML = `<p class="p-3 text-muted">Select a class and division.</p>`;
            return;
        }

       // const studentsInClass = students.filter(s => s.classId === classId && s.division === division).sort((a,b) => a.name.localeCompare(b.name));
        const studentsInClass = students.filter(s => s.classId === classId && s.division === division && s.status !== 'TC Issued').sort((a, b) => a.name.localeCompare(b.name));
        
        if (studentsInClass.length === 0) {
            studentListContainer.innerHTML = `<p class="p-3 text-muted">No students found.</p>`;
            return;
        }

        printAllBtn.disabled = false;
        studentListContainer.innerHTML = studentsInClass.map(s => `
            <a href="#" class="list-group-item list-group-item-action rc-student-link" data-student-id="${s.id}">
                ${s.name} <small class="text-muted">(${s.admissionNumber})</small>
            </a>`).join('');
    };

    // --- Attach Event Listeners ---
    classSelect.addEventListener('change', () => {
        const selectedClass = classes.find(c => c.id === classSelect.value);
        divisionSelect.innerHTML = '<option value="">-- Select Division --</option>';
        divisionSelect.disabled = !selectedClass;
        if (selectedClass) {
            divisionSelect.innerHTML += selectedClass.divisions.map(d => `<option value="${d}">${d}</option>`).join('');
        }
        updateStudentList();
    });

    divisionSelect.addEventListener('change', updateStudentList);

    studentListContainer.addEventListener('click', e => {
        e.preventDefault();
        const link = e.target.closest('.rc-student-link');
        if (link) {
            document.querySelectorAll('.rc-student-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const studentId = link.dataset.studentId;
            const studentName = students.find(s=>s.id === studentId)?.name || 'Report';
            const examIds = Array.from(examSelect.selectedOptions).map(opt => opt.value);
            if (examIds.length === 0) {
                showAlert('Please select at least one exam.', 'warning');
                return;
            }
            resultsContainer.innerHTML = generateReportCardHTML_Comparison(studentId, examIds);
            // Show the header and print button for the selected student
            rcStudentNameHeader.textContent = `Report for ${studentName}`;
            rcHeader.style.display = 'flex';
        }
    });

    printSingleBtn.addEventListener('click', () => {
        const studentName = rcStudentNameHeader.textContent;
        printContentOfDiv('rc-results-container', studentName);
    });

    printAllBtn.addEventListener('click', () => {
        const classId = classSelect.value;
        const division = divisionSelect.value;
        const examIds = Array.from(examSelect.selectedOptions).map(opt => opt.value);
        if (!classId || !division || examIds.length === 0) {
            return showAlert('Please select a class, division, and at least one exam to print all.', 'warning');
        }
        printAllReportCards(classId, division, examIds);
    });

    // Handle student view
    if (currentUserRole === 'student') {
        classSelect.value = selectedUser.classId;
        classSelect.disabled = true;
        divisionSelect.innerHTML = `<option value="${selectedUser.division}">${selectedUser.division}</option>`;
        divisionSelect.disabled = true;
        examSelect.value = exams[0]?.id || '';
        studentListContainer.innerHTML = `<a href="#" class="list-group-item list-group-item-action rc-student-link active" data-student-id="${selectedUser.id}">${selectedUser.name}</a>`;
        generateReportCardHTML_Comparison(selectedUser.id, [examSelect.value], 'rc-results-container');
        rcHeader.style.display = 'flex'; // Show print button for student
        printAllBtn.style.display = 'none'; // Hide print all button for student
    }
}
/**
 * Generates a single, multi-page HTML document for all students in a class and prints it.
 * This version uses a temporary DOM element to ensure all images are loaded before printing.
 */
function printAllReportCards(classId, division, examIds) {
    showAlert('Preparing report cards for printing...', 'info');

    const studentsInClass = students.filter(s => s.classId === classId && s.division === division);
    if (studentsInClass.length === 0) {
        return showAlert('No students to print.', 'warning');
    }

    const tempPrintContainer = document.createElement('div');
    tempPrintContainer.id = 'temp-report-card-container';
    tempPrintContainer.style.display = 'none';
    document.body.appendChild(tempPrintContainer);

    try {
        let allCardsHtml = '';
        studentsInClass.forEach(student => {
            // --- MODIFIED: Directly get the HTML string from the function ---
            const cardHtml = generateReportCardHTML_Comparison(student.id, examIds,tempPrintContainer);
            allCardsHtml += `<div class="printable-card-page">${cardHtml}</div>`;
        });
        
        tempPrintContainer.innerHTML = allCardsHtml;
        const reportTitle = `Report Cards for ${classes.find(c=>c.id===classId).name} - ${division}`;
        
        printContentOfDiv('temp-report-card-container', reportTitle, {
            extraCss: `.printable-card-page { page-break-after: always; } .printable-card-page:last-child { page-break-after: avoid; }`
        });
    } finally {
        document.body.removeChild(tempPrintContainer);
    }
}


function renderRankListTab() {
            const container = document.getElementById('pills-ranklist');

            // Determine class options based on user role
            let classOptions = '';
            if (currentUserRole === 'teacher') {
                const teacherAllocations = classroomSubjects.filter(cs => cs.teacherId === selectedUser.id);
                const uniqueClassIds = [...new Set(teacherAllocations.map(a => a.classId))];
                classOptions = uniqueClassIds.map(classId => {
                    const c = classes.find(cls => cls.id === classId);
                    return c ? `<option value="${c.id}">${c.name}</option>` : '';
                }).join('');
            } else { // For admin
                classOptions = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            }

            container.innerHTML = `
                <div class="row g-3 align-items-end border-bottom pb-3 mb-3">
                    <div class="col-md-4"><label class="form-label">Class</label><select id="res-class" class="form-select">${classOptions}</select></div>
                    <div class="col-md-4"><label class="form-label">Division</label><select id="res-division" class="form-select"></select></div>
                </div>
                <div id="results-table-container"></div>`;
            
            const examSelect = document.getElementById('res-exam'); // active exam globally
            const classSelect = document.getElementById('res-class');
            const divisionSelect = document.getElementById('res-division');
            
            const loadTable = () => generateResultsTable(document.getElementById('results-table-container'));
            
            // This listener now correctly filters divisions based on the teacher's allocations
            classSelect.addEventListener('change', () => {
                const selectedClassId = classSelect.value;
                let divisionOptionsHTML = '';
                if (currentUserRole === 'teacher') {
                    const teacherAllocationsForClass = classroomSubjects.filter(cs => cs.teacherId === selectedUser.id && cs.classId === selectedClassId);
                    const uniqueDivisions = [...new Set(teacherAllocationsForClass.map(a => a.division))];
                    divisionOptionsHTML = uniqueDivisions.map(d => `<option value="${d}">${d}</option>`).join('');
                } else {
                    const cls = classes.find(c => c.id === selectedClassId);
                    divisionOptionsHTML = cls ? cls.divisions.map(d => `<option value="${d}">${d}</option>`).join('') : '';
                }
                divisionSelect.innerHTML = divisionOptionsHTML;
                loadTable(); // Load the table for the newly selected class/division
            });

            examSelect.addEventListener('change', loadTable);
            divisionSelect.addEventListener('change', loadTable);
            
            // Initial load for the first class in the list
            if (classSelect.options.length > 0) {
                 classSelect.dispatchEvent(new Event('change'));
            }
        }

    /**
 * Generates the HTML for a student's report card.
 * @param {string} studentId - The ID of the student.
 * @param {string} examId - The ID of the exam.
 * @param {string} containerId - The ID of the HTML element to render the report into.
 */
function generateReportCardHTML(studentId, examId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID ${containerId} not found for report card.`);
        return;
    }

    const student = students.find(s => s.id === studentId);
    const exam = exams.find(e => e.id === examId);
    const studentClass = classes.find(c => c.id === student?.classId); // Defensive: student?.classId
    
    // Defensive checks for core data
    if (!student || !exam) {
        container.innerHTML = `<p class="alert alert-warning text-center">Student or Exam data not found for generating report card.</p>`;
        return;
    }

    // Filter schedules for this specific student's class and exam
    const schedules = examSchedules.filter(s =>
        s.examId === examId &&
        s.classId === student.classId &&
        s.division === student.division
    );

    // Call processExamResultsData (ensure it returns studentId and subjectId in subjectResults)
    // We pass [student] as an array, and take the first element of the result.
    const processedReportData = processExamResultsData([student], schedules, marks, examId, document.getElementById('shared-grading-system')?.value || 'type1');

    // Destructure the required properties from the first (and only) student's processed data
    const {
        studentId: processedStudentId, // Renaming to avoid conflict with outer studentId
        studentName,
        subjectResults,
        grandTotalMarks,
        grandMaxMarks,
        grandPct,
        finalStatus,
        overallGrade
    } = processedReportData[0] || {}; // Use default empty object if processedReportData[0] is undefined

    // If subjectResults is not available (e.g., marks still loading or no schedules)
    if (!subjectResults || subjectResults.length === 0) {
        container.innerHTML = `<div class="text-center p-5"><div class="spinner-border"></div><p class="mt-2">Loading marks or no subjects scheduled for this exam/class.</p></div>`;
        return;
    }

    // Get grading system safely
    const gradingSystem = document.getElementById('shared-grading-system')?.value || 'type1';
    
    // Construct photo URL: use thumbnail if photoDriveId exists, otherwise a placeholder
    const studentPhotoSrc = student.photoDriveId
        ? `https://drive.google.com/thumbnail?id=${student.photoDriveId}&sz=400`
        : 'https://placehold.co/150x200?text=No+Photo&font=roboto';


    container.innerHTML = `
    <div id="report-card-printable" class="p-4 border bg-white mx-auto" style="max-width: 210mm;">
        <div class="report-header text-center mb-4">
            ${schoolDetails.logoUrl ? `<img src="${schoolDetails.logoUrl}" alt="School Logo" style="max-height: 80px; margin-bottom: 1rem;">` : ''}
            <h3>${schoolDetails.address || 'School Name'}</h3>
            <p class="lead mb-0">${schoolDetails.name || 'School Address'}</p>
            <h5 class="mt-3">PROGRESS REPORT - ${exam.name.toUpperCase()}</h5>
        </div>

        <div class="row mb-4 align-items-center">
            <div class="col-md-8">
                <table class="table table-sm table-borderless">
                    <tbody>
                        <tr><th style="width: 150px;">Student Name</th><td>: ${student.name}</td></tr>
                        <tr><th>Admission No</th><td>: ${student.admissionNumber || 'N/A'}</td></tr>
                        <tr><th>Class</th><td>: ${studentClass?.name || 'N/A'} - ${student.division || 'N/A'}</td></tr>
                        <tr><th>Date of Birth</th><td>: ${new Date(student.dob).toLocaleDateString('en-GB') || 'N/A'}</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="col-md-3 text-center">
                <img src="${studentPhotoSrc}"
                     alt="Student Photo" class="img-thumbnail rounded-3 shadow-sm" style="width: 130px; height: 170px; object-fit: cover; border: 2px solid #ddd;">
            </div>
        </div>

        <table class="table table-bordered table-sm">
            <thead class="table-light text-center fs-6"><tr><th>SUBJECT</th><th>THEORY</th><th>INTERNAL</th><th>TOTAL</th><th>MAX</th><th>GRADE</th></tr></thead>
            <tbody>
                ${subjectResults.map(res => {
                    const subjectName = subjects.find(s => s.id === res.subjectId)?.name || 'N/A'; // Use subjectId directly
                    const totalGrade = gradingSystem === 'type1' ? calculateGrade(res.total, res.maxTE + res.maxCE) : calculateGradeType2(res.total, res.maxTE + res.maxCE);
                    
                    return `
                        <tr class="text-center">
                            <td class="text-start">${subjectName}</td>
                            <td class="text-center">${res.te}</td>
                            <td class="text-center">${res.ce}</td>
                            <td class="text-center">${res.total}</td>
                            <td class="text-center">${res.maxTE + res.maxCE}</td>
                            <td class="text-center">${totalGrade}</td>
                        </tr>`;
                }).join('')}
            </tbody>
            <tfoot class="fw-bold text-center">
                <tr>
                    <td colspan="2" class="text-end">GRAND TOTAL</td>
                    <td class="text-center">${grandTotalMarks}</td>
                    <td class="text-center">${grandMaxMarks}</td>
                    <td colspan="2"></td>
                </tr>
            </tfoot>
        </table>
        <div class="row mt-4 fw-bold text-center">
            <div class="col-6">Overall Percentage: <span class="fs-5">${grandPct?.toFixed(2) || '0.00'}%</span></div>
            <div class="col-6">Final Result: <span class="fs-5 text-${finalStatus === 'PASS' ? 'success':'danger'}">${finalStatus || 'N/A'}</span></div>
        </div>
        <div class="row mt-5 pt-5 text-center text-muted" style="font-size: 0.9rem;">
            <div class="col-6"><hr class="mx-auto w-50">Class Teacher</div>
            <div class="col-6"><hr class="mx-auto w-50">Principal</div>
        </div>
    </div>`;
}
/**
 * Generates and returns the HTML for a student's comparison report card.
 * This version includes a detailed summary and a new "Grand Total" row after the subjects.
 * @param {string} studentId - The ID of the student.
 * @param {string[]} examIds - An array of exam IDs to compare.
 * @returns {string} The complete HTML string for the report card, or an error message.
 */
function generateReportCardHTML_Comparison(studentId, examIds) {
    const student = students.find(s => s.id === studentId);
    if (!student) {
        console.error("Could not generate report card: Student not found for ID", studentId);
        return '<p class="alert alert-danger">Student data not found.</p>';
    }

    const studentClass = classes.find(c => c.id === student?.classId);
    const gradingSystem = document.getElementById('shared-grading-system')?.value || 'type1';
    const studentPhotoSrc = student.photoDriveId
        ? `https://drive.google.com/thumbnail?id=${student.photoDriveId}&sz=400`
        : 'https://placehold.co/150x200?text=No+Photo&font=roboto';

    const examsData = examIds.map(eId => {
        const exam = exams.find(e => e.id === eId);
        if (!exam) return null;

        const schedules = examSchedules.filter(s => s.examId === eId && s.classId === student.classId && s.division === student.division);
        const processedData = processExamResultsData([student], schedules, marks, eId, gradingSystem);
        const report = processedData[0] || {};

        const allStudentsInClass = students.filter(s => s.classId === student.classId && s.division === student.division && s.status !== 'TC Issued' && s.status !== 'Graduated').sort((a, b) => a.name.localeCompare(b.name));
        const allProcessed = processExamResultsData(allStudentsInClass, schedules, marks, eId, gradingSystem);
        allProcessed.sort((a, b) => b.grandTotalMarks - a.grandTotalMarks);
        const rank = allProcessed.findIndex(s => s.studentId === student.id) + 1;
        return { exam, report, rank };
    }).filter(Boolean);

    const allSubjectIds = [...new Set(examsData.flatMap(e => e.report.subjectResults?.map(r => r.subjectId) || []))];

    let headerRow1 = `<tr><th rowspan="2">Subject</th>`;
    let headerRow2 = ``;
    examsData.forEach(ed => {
        headerRow1 += `<th colspan="4" class="text-center">${ed.exam.name}</th>`;
        headerRow2 += `<th>TE/MaxTE</th><th>CE/MaxCE</th><th>Total/Max</th><th>Grade</th>`;
    });
    headerRow1 += `</tr>`;
    headerRow2 = `<tr>${headerRow2}</tr>`;

    let bodyRows = ``;
    allSubjectIds.forEach(subId => {
        const subjectName = subjects.find(s => s.id === subId)?.name || "N/A";
        let rowHtml = `<tr><td>${subjectName}</td>`;
        examsData.forEach(ed => {
            const res = ed.report.subjectResults?.find(r => r.subjectId === subId);
            if (res) {
                const totalMax = res.maxTE + res.maxCE;
                const totalGrade = gradingSystem === 'type1' 
                    ? calculateGrade(res.total, totalMax) 
                    : calculateGradeType2(res.total, totalMax);
                rowHtml += `
                    <td class="text-center">${res.te}/${res.maxTE} (${res.teGrade})</td>
                    <td class="text-center">${res.ce}/${res.maxCE} (${res.ceGrade})</td>
                    <td class="text-center">${res.total}/${totalMax}</td>
                    <td class="text-center">${totalGrade}</td>
                `;
            } else {
                rowHtml += `<td>-</td><td>-</td><td>-</td><td>-</td>`;
            }
        });
        rowHtml += `</tr>`;
        bodyRows += rowHtml;
    });

    // --- MODIFICATION IS HERE ---
    // A new row for the Grand Total is created.
    // This snippet replaces the previous 'grandTotalRow' block.
// It now correctly calculates the totals from the detailed subject results.

let grandTotalRow = `<tr class="table-light fw-bold"><th>Grand Total</th>`;
examsData.forEach(ed => {
    const subjectResults = ed.report.subjectResults || [];

    // Calculate TE and CE totals by iterating through the subject results
const totalTE = subjectResults.reduce((sum, res) => sum + (Number(res.te) || 0), 0);
const totalMaxTE = subjectResults.reduce((sum, res) => sum + (Number(res.maxTE) || 0), 0);
const totalCE = subjectResults.reduce((sum, res) => sum + (Number(res.ce) || 0), 0);
const totalMaxCE = subjectResults.reduce((sum, res) => sum + (Number(res.maxCE) || 0), 0);
    // Use pre-calculated grand totals if available, otherwise fall back to the new sums
    const grandTotal = ed.report.grandTotalMarks || (totalTE + totalCE);
    const grandMaxTotal = ed.report.grandTotalMaxMarks || (totalMaxTE + totalMaxCE);
    const overallGrade = ed.report.overallGrade || '-';

    // Calculate the grade for the TE total
    const teTotalGrade = gradingSystem === 'type1' 
        ? calculateGrade(totalTE, totalMaxTE) 
        : calculateGradeType2(totalTE, totalMaxTE);

    // Calculate the grade for the CE total
    const ceTotalGrade = gradingSystem === 'type1' 
        ? calculateGrade(totalCE, totalMaxCE) 
        : calculateGradeType2(totalCE, totalMaxCE);

    // Build the four distinct columns for the grand total row with the calculated data
    grandTotalRow += `
        <td class="text-center">${totalTE}/${totalMaxTE} (${teTotalGrade})</td>
        <td class="text-center">${totalCE}/${totalMaxCE} (${ceTotalGrade})</td>
        <td class="text-center">${grandTotal}/${grandMaxTotal}</td>
        <td class="text-center">${overallGrade}</td>
    `;
});
grandTotalRow += `</tr>`;

    let summaryRow = `<tr><th>Overall %</th>`;
    examsData.forEach(ed => { summaryRow += `<td colspan="4" class="text-center">${ed.report.grandPct?.toFixed(2) || "0"}%</td>`; });
    summaryRow += `</tr>`;

    let gradeRow = `<tr><th>Overall Grade</th>`;
    examsData.forEach(ed => { gradeRow += `<td colspan="4" class="text-center">${ed.report.overallGrade || "-"}</td>`; });
    gradeRow += `</tr>`;

    let resultRow = `<tr><th>Result</th>`;
    examsData.forEach(ed => {
        const status = ed.report.finalStatus || 'N/A';
        resultRow += `<td colspan="4" class="text-center text-${status === 'PASS' ? 'success' : 'danger'}">${status}</td>`;
    });
    resultRow += `</tr>`;

    let rankRow = `<tr><th>Rank</th>`;
    examsData.forEach(ed => { rankRow += `<td colspan="4" class="text-center">${ed.rank}</td>`; });
    rankRow += `</tr>`;

    let remark = "Performance is consistent.";
    if (examsData.length > 1) {
        const first = examsData[0].report.grandPct || 0;
        const last = examsData[examsData.length - 1].report.grandPct || 0;
        if (last > first) remark = "Excellent! Performance has improved.";
        else if (last < first) remark = "Performance has declined. Needs more effort.";
    }

    return `
    <div id="report-card-printable" class="p-2 border bg-white mx-auto" style="max-width: 100%;">
        <div class="report-header text-center mb-4">
            ${schoolDetails.logoUrl ? `<img src="${schoolDetails.logoUrl}" style="max-height: 80px; margin-bottom: 0.5rem;margin-top: -1rem;">` : ''}
            <h4>${schoolDetails.address.toUpperCase() || 'School Name'}</h4>
            <p>${schoolDetails.name || ''}</p>
            <h4>Progress Report Comparison</h4>
        </div>
        <div class="row mb-4 align-items-center">
            <div class="col-8">
                <table class="table table-sm table-borderless">
                    <tbody>
                        <tr><th style="width: 150px;">Student Name</th><td>: ${student.name}</td></tr>
                        <tr><th>Admission No</th><td>: ${student.admissionNumber || 'N/A'}</td></tr>
                        <tr><th>Class</th><td>: ${studentClass?.name || 'N/A'} - ${student.division || 'N/A'}</td></tr>
                        <tr><th>Date of Birth</th><td>: ${new Date(student.dob).toLocaleDateString('en-GB') || 'N/A'}</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="col-4 text-center">
                <img src="${studentPhotoSrc}" alt="Student Photo" class="img-thumbnail rounded-3 shadow-sm" style="width: 130px; height: 170px; object-fit: cover; border: 2px solid #ddd;">
            </div>
        </div>
        <table class="table table-bordered table-sm">
            <thead class="table-light text-center">${headerRow1}${headerRow2}</thead>
            <tbody>${bodyRows}${grandTotalRow}${summaryRow}${gradeRow}${resultRow}${rankRow}</tbody>
        </table>
        <div class="mt-2"><strong>Teacher's Remark:</strong> ${remark}</div>
        <div class="row mt-5 text-center text-muted" style="font-size: 0.9rem;">
            <div class="col-6"><hr class="mx-auto w-50">Class Teacher</div>
            <div class="col-6"><hr class="mx-auto w-50">Headmaster / Principal</div>
        </div>
    </div>`;
}

function generateReportCardHTML_Comparisonnew(studentId, examIds) {
    const student = students.find(s => s.id === studentId);
    if (!student) {
        console.error("Could not generate report card: Student not found for ID", studentId);
        return '<p class="alert alert-danger">Student data not found.</p>';
    }

    const studentClass = classes.find(c => c.id === student?.classId);
    const gradingSystem = document.getElementById('shared-grading-system')?.value || 'type1';
    const gradeFunc = gradingSystem === 'type1' ? calculateGrade : calculateGradeType2;
    const studentPhotoSrc = student.photoDriveId
        ? `https://drive.google.com/thumbnail?id=${student.photoDriveId}&sz=400`
        : 'https://placehold.co/150x200?text=No+Photo&font=roboto';

    const examsData = examIds.map(eId => {
        const exam = exams.find(e => e.id === eId);
        if (!exam) return null;

        const schedules = examSchedules.filter(s => s.examId === eId && s.classId === student.classId && s.division === student.division);
        const allStudentsInClass = students.filter(s => s.classId === student.classId && s.division === student.division && s.status !== 'TC Issued' && s.status !== 'Graduated').sort((a, b) => a.name.localeCompare(b.name));
        
        const allProcessed = processExamResultsData(allStudentsInClass, schedules, marks, eId, gradingSystem);

        allProcessed.forEach(procStudent => {
            let totalTE = 0, maxTE = 0, totalCE = 0, maxCE = 0;
            procStudent.subjectResults.forEach(res => {
                if (res.te !== 'AB' && res.te !== 'N/A') totalTE += Number(res.te);
                if (res.ce !== 'AB' && res.ce !== 'N/A') totalCE += Number(res.ce);
                maxTE += res.maxTE;
                maxCE += res.maxCE;
            });
            procStudent.grandTotalTE = totalTE;
            procStudent.grandMaxTE = maxTE;
            procStudent.grandTotalCE = totalCE;
            procStudent.grandMaxCE = maxCE;
        });

        const report = allProcessed.find(s => s.studentId === studentId) || {};

        allProcessed.sort((a, b) => b.grandTotalMarks - a.grandTotalMarks);
        const totalRank = (allProcessed.findIndex(s => s.studentId === studentId) + 1) || 0;
        allProcessed.sort((a, b) => b.grandTotalTE - a.grandTotalTE);
        const teRank = (allProcessed.findIndex(s => s.studentId === studentId) + 1) || 0;
        allProcessed.sort((a, b) => b.grandTotalCE - a.grandTotalCE);
        const ceRank = (allProcessed.findIndex(s => s.studentId === studentId) + 1) || 0;

        return { exam, report, totalRank, teRank, ceRank };
    }).filter(Boolean);

    const allSubjectIds = [...new Set(examsData.flatMap(e => e.report.subjectResults?.map(r => r.subjectId) || []))];

    let headerRow1 = `<tr><th rowspan="2">Subject</th>`;
    let headerRow2 = ``;
    examsData.forEach(ed => {
        headerRow1 += `<th colspan="4" class="text-center">${ed.exam.name}</th>`;
        headerRow2 += `<th>TE/MaxTE (Grade)</th><th>CE/MaxCE (Grade)</th><th>Total/Max</th><th>Grade</th>`;
    });
    headerRow1 += `</tr>`;
    headerRow2 = `<tr>${headerRow2}</tr>`;

    let bodyRows = ``;
    allSubjectIds.forEach(subId => {
        const subjectName = subjects.find(s => s.id === subId)?.name || "N/A";
        let rowHtml = `<tr><td>${subjectName}</td>`;
        examsData.forEach(ed => {
            const res = ed.report.subjectResults?.find(r => r.subjectId === subId);
            if (res) {
                const totalMax = res.maxTE + res.maxCE;
                const totalGrade = gradeFunc(res.total, totalMax);
                rowHtml += `
                    <td class="text-center">${res.te}/${res.maxTE} (${res.teGrade})</td>
                    <td class="text-center">${res.ce}/${res.maxCE} (${res.ceGrade})</td>
                    <td class="text-center">${res.total}/${totalMax}</td>
                    <td class="text-center">${totalGrade}</td>`;
            } else {
                rowHtml += `<td colspan="4" class="text-center">-</td>`;
            }
        });
        rowHtml += `</tr>`;
        bodyRows += rowHtml;
    });

    // --- NEW: Create the "Grand Total" row ---
    let grandTotalRow = `<tr class="fw-bold table-primary"><th>Grand Total</th>`;
    examsData.forEach(ed => {
        const totalMarks = ed.report.grandTotalMarks || 0;
        const maxMarks = ed.report.grandMaxMarks || 0;
        const overallGrade = ed.report.overallGrade || '-';
        grandTotalRow += `<td colspan="4" class="text-center">${totalMarks} / ${maxMarks} (${overallGrade})</td>`;
    });
    grandTotalRow += `</tr>`;
    
    // Create detailed summary rows
    let summaryRows = `<tr class="table-light"><th colspan="${1 + examsData.length * 4}" class="text-primary">PERFORMANCE SUMMARY</th></tr>`;
    summaryRows += `<tr><th>Overall %</th>`;
    examsData.forEach(ed => {
        const pctTE = ed.report.grandMaxTE > 0 ? (ed.report.grandTotalTE / ed.report.grandMaxTE * 100).toFixed(2) : 0;
        const pctCE = ed.report.grandMaxCE > 0 ? (ed.report.grandTotalCE / ed.report.grandMaxCE * 100).toFixed(2) : 0;
        summaryRows += `<td colspan="4" class="text-center">TE: ${pctTE}% | CE: ${pctCE}% | <strong>Total: ${ed.report.grandPct?.toFixed(2) || 0}%</strong></td>`;
    });
    summaryRows += `</tr>`;
    summaryRows += `<tr><th>Overall Grade</th>`;
    examsData.forEach(ed => {
        const gradeTE = gradeFunc(ed.report.grandTotalTE, ed.report.grandMaxTE);
        const gradeCE = gradeFunc(ed.report.grandTotalCE, ed.report.grandMaxCE);
        summaryRows += `<td colspan="4" class="text-center">TE: ${gradeTE} | CE: ${gradeCE} | <strong>Total: ${ed.report.overallGrade || "-"}</strong></td>`;
    });
    summaryRows += `</tr>`;
    summaryRows += `<tr><th>Result</th>`;
    examsData.forEach(ed => {
        const resultTE = (gradeFunc(ed.report.grandTotalTE, ed.report.grandMaxTE) === 'E' || gradeFunc(ed.report.grandTotalTE, ed.report.grandMaxTE) === 'F') ? 'FAIL' : 'PASS';
        const resultCE = (gradeFunc(ed.report.grandTotalCE, ed.report.grandMaxCE) === 'E' || gradeFunc(ed.report.grandTotalCE, ed.report.grandMaxCE) === 'F') ? 'FAIL' : 'PASS';
        const resultTotal = ed.report.finalStatus || 'N/A';
        summaryRows += `<td colspan="4" class="text-center text-${resultTotal === 'PASS' ? 'success' : 'danger'}">TE: ${resultTE} | CE: ${resultCE} | <strong>Total: ${resultTotal}</strong></td>`;
    });
    summaryRows += `</tr>`;
    summaryRows += `<tr><th>Rank</th>`;
    examsData.forEach(ed => {
        summaryRows += `<td colspan="4" class="text-center">TE: ${ed.teRank || '-'} | CE: ${ed.ceRank || '-'} | <strong>Total: ${ed.totalRank || '-'}</strong></td>`;
    });
    summaryRows += `</tr>`;

    let remark = "Performance is consistent.";
    if (examsData.length > 1) {
        const first = examsData[0].report.grandPct || 0;
        const last = examsData[examsData.length - 1].report.grandPct || 0;
        if (last > first) remark = "Excellent! Performance has improved.";
        else if (last < first) remark = "Performance has declined. Needs more effort.";
    }

    // --- FINAL HTML ASSEMBLY ---
    return `
    <div id="report-card-printable" class="p-2 border bg-white mx-auto" style="max-width: 100%;">
        <div class="report-header text-center mb-4">
            ${schoolDetails.logoUrl ? `<img src="${schoolDetails.logoUrl}" style="max-height: 80px; margin-bottom: 0.5rem;margin-top: -1rem;">` : ''}
            <h4>${schoolDetails.address.toUpperCase() || 'School Name'}</h4>
            <p>${schoolDetails.name || ''}</p>
            <h4>Progress Report Comparison</h4>
        </div>
        <div class="row mb-4 align-items-center">
            <div class="col-8">
                <table class="table table-sm table-borderless">
                    <tbody>
                        <tr><th style="width: 150px;">Student Name</th><td>: ${student.name}</td></tr>
                        <tr><th>Admission No</th><td>: ${student.admissionNumber || 'N/A'}</td></tr>
                        <tr><th>Class</th><td>: ${studentClass?.name || 'N/A'} - ${student.division || 'N/A'}</td></tr>
                        <tr><th>Date of Birth</th><td>: ${new Date(student.dob).toLocaleDateString('en-GB') || 'N/A'}</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="col-4 text-center">
                <img src="${studentPhotoSrc}" alt="Student Photo" class="img-thumbnail rounded-3 shadow-sm" style="width: 130px; height: 170px; object-fit: cover; border: 2px solid #ddd;">
            </div>
        </div>
        <table class="table table-bordered table-sm">
            <thead class="table-light text-center">${headerRow1}${headerRow2}</thead>
            
            <tbody>${bodyRows}${grandTotalRow}${summaryRows}</tbody>
            
        </table>
        <div class="mt-2"><strong>Teacher's Remark:</strong> ${remark}</div>
        <div class="row mt-5 text-center text-muted" style="font-size: 0.9rem;">
            <div class="col-6"><hr class="mx-auto w-50">Class Teacher</div>
            <div class="col-6"><hr class="mx-auto w-50">Headmaster / Principal</div>
        </div>
    </div>`;
}


function generateReportCardHTML_Comparisonold(studentId, examIds) {
    const student = students.find(s => s.id === studentId);
    if (!student) {
        console.error("Could not generate report card: Student not found for ID", studentId);
        return '<p class="alert alert-danger">Student data not found.</p>';
    }

    const studentClass = classes.find(c => c.id === student?.classId);
    const gradingSystem = document.getElementById('shared-grading-system')?.value || 'type1';
    const studentPhotoSrc = student.photoDriveId
        ? `https://drive.google.com/thumbnail?id=${student.photoDriveId}&sz=400`
        : 'https://placehold.co/150x200?text=No+Photo&font=roboto';

    const examsData = examIds.map(eId => {
        const exam = exams.find(e => e.id === eId);
        if (!exam) return null;

        const schedules = examSchedules.filter(s => s.examId === eId && s.classId === student.classId && s.division === student.division);
        const processedData = processExamResultsData([student], schedules, marks, eId, gradingSystem);
        const report = processedData[0] || {};

        const allStudentsInClass = students.filter(s => s.classId === student.classId && s.division === student.division && s.status !== 'TC Issued' && s.status !== 'Graduated').sort((a, b) => a.name.localeCompare(b.name));
        const allProcessed = processExamResultsData(allStudentsInClass, schedules, marks, eId, gradingSystem);
        allProcessed.sort((a, b) => b.grandTotalMarks - a.grandTotalMarks);
        const rank = allProcessed.findIndex(s => s.studentId === student.id) + 1;
        return { exam, report, rank };
    }).filter(Boolean);

    const allSubjectIds = [...new Set(examsData.flatMap(e => e.report.subjectResults?.map(r => r.subjectId) || []))];

    let headerRow1 = `<tr><th rowspan="2">Subject</th>`;
    let headerRow2 = ``;
    examsData.forEach(ed => {
        headerRow1 += `<th colspan="4" class="text-center">${ed.exam.name}</th>`;
        headerRow2 += `<th>TE/MaxTE</th><th>CE/MaxCE</th><th>Total/Max</th><th>Grade</th>`;
    });
    headerRow1 += `</tr>`;
    headerRow2 = `<tr>${headerRow2}</tr>`;

    let bodyRows = ``;
    allSubjectIds.forEach(subId => {
        const subjectName = subjects.find(s => s.id === subId)?.name || "N/A";
        let rowHtml = `<tr><td>${subjectName}</td>`;
        // This loop builds the main body of the marks table
examsData.forEach(ed => {
    const res = ed.report.subjectResults?.find(r => r.subjectId === subId);
    if (res) {
        const totalMax = res.maxTE + res.maxCE;

        // The grade for the total marks of the subject
        const totalGrade = gradingSystem === 'type1' 
            ? calculateGrade(res.total, totalMax) 
            : calculateGradeType2(res.total, totalMax);

        // --- MODIFICATION IS HERE ---
        // The individual grades for TE and CE are now included in brackets
        rowHtml += `
            <td class="text-center">${res.te}/${res.maxTE} (${res.teGrade})</td>
            <td class="text-center">${res.ce}/${res.maxCE} (${res.ceGrade})</td>
            <td class="text-center">${res.total}/${totalMax}</td>
            <td class="text-center">${totalGrade}</td>
        `;
    } else {
        // If no results, add empty cells
        rowHtml += `<td>-</td><td>-</td><td>-</td><td>-</td>`;
    }
});
        rowHtml += `</tr>`;
        bodyRows += rowHtml;
    });

    let summaryRow = `<tr><th>Overall %</th>`;
    examsData.forEach(ed => { summaryRow += `<td colspan="4" class="text-center">${ed.report.grandPct?.toFixed(2) || "0"}%</td>`; });
    summaryRow += `</tr>`;

    let gradeRow = `<tr><th>Overall Grade</th>`;
    examsData.forEach(ed => { gradeRow += `<td colspan="4" class="text-center">${ed.report.overallGrade || "-"}</td>`; });
    gradeRow += `</tr>`;

    let resultRow = `<tr><th>Result</th>`;
    examsData.forEach(ed => {
        const status = ed.report.finalStatus || 'N/A';
        resultRow += `<td colspan="4" class="text-center text-${status === 'PASS' ? 'success' : 'danger'}">${status}</td>`;
    });
    resultRow += `</tr>`;

    let rankRow = `<tr><th>Rank</th>`;
    examsData.forEach(ed => { rankRow += `<td colspan="4" class="text-center">${ed.rank}</td>`; });
    rankRow += `</tr>`;

    let remark = "Performance is consistent.";
    if (examsData.length > 1) {
        const first = examsData[0].report.grandPct || 0;
        const last = examsData[examsData.length - 1].report.grandPct || 0;
        if (last > first) remark = "Excellent! Performance has improved.";
        else if (last < first) remark = "Performance has declined. Needs more effort.";
    }

    return `
    <div id="report-card-printable" class="p-2 border bg-white mx-auto" style="max-width: 100%;">
        <div class="report-header text-center mb-4">
            ${schoolDetails.logoUrl ? `<img src="${schoolDetails.logoUrl}" style="max-height: 80px; margin-bottom: 0.5rem;margin-top: -1rem;">` : ''}
            <h4>${schoolDetails.address.toUpperCase() || 'School Name'}</h4>
            <p>${schoolDetails.name || ''}</p>
            <h4>Progress Report Comparison</h4>
        </div>
        <div class="row mb-4 align-items-center">
            <div class="col-8">
                <table class="table table-sm table-borderless">
                    <tbody>
                        <tr><th style="width: 150px;">Student Name</th><td>: ${student.name}</td></tr>
                        <tr><th>Admission No</th><td>: ${student.admissionNumber || 'N/A'}</td></tr>
                        <tr><th>Class</th><td>: ${studentClass?.name || 'N/A'} - ${student.division || 'N/A'}</td></tr>
                        <tr><th>Date of Birth</th><td>: ${new Date(student.dob).toLocaleDateString('en-GB') || 'N/A'}</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="col-4 text-center">
                <img src="${studentPhotoSrc}" alt="Student Photo" class="img-thumbnail rounded-3 shadow-sm" style="width: 130px; height: 170px; object-fit: cover; border: 2px solid #ddd;">
            </div>
        </div>
        <table class="table table-bordered table-sm">
            <thead class="table-light text-center">${headerRow1}${headerRow2}</thead>
            <tbody>${bodyRows}${summaryRow}${gradeRow}${resultRow}${rankRow}</tbody>
        </table>
        <div class="mt-2"><strong>Teacher's Remark:</strong> ${remark}</div>
        <div class="row mt-5 text-center text-muted" style="font-size: 0.9rem;">
            <div class="col-6"><hr class="mx-auto w-50">Class Teacher</div>
            <div class="col-6"><hr class="mx-auto w-50">Headmaster / Principal</div>
        </div>
    </div>`;
}

        function calculateGrade(score, maxScore) {
            if (String(score).toUpperCase() === 'AB') return 'AB';
            //if (score === 'AB') return 'AB';
            if (maxScore === 0) return '-';
            const percentage = (score / maxScore) * 100;
            if (percentage >= 90) return 'A+'; if (percentage >= 80) return 'A';
            if (percentage >= 70) return 'B+'; if (percentage >= 60) return 'B';
            if (percentage >= 50) return 'C+'; if (percentage >= 40) return 'C';
            if (percentage >= 30) return 'D';
            return 'E';
        }
