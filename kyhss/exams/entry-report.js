import { query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let reportData = [];
    
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
            <div class="col-md-6 text-md-end">
                <button id="entry-report-generate-btn" class="btn btn-danger mt-2 mt-md-0"><i class="fas fa-file-pdf me-2"></i> Export Summary as PDF</button>
            </div>
            </div>
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
    //await window.attachMarksListener(teacherAssignedClasses);
  // generateEntryReport(firstActiveExam.id);
}
//
    document.getElementById('entry-report-generate-btn').addEventListener('click', async () => {
        const examId = document.getElementById('entry-report-exam').value || firstActiveExam.id;
        if (examId) {
            document.getElementById('entry-report-container').innerHTML = `<p class="text-muted text-center p-5">loding.....</p>`;

            //await window.attachMarksListener(teacherAssignedClasses);

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

    // document.getElementById('entry-report-exam').addEventListener('change', async (e) => {
    //    //await window.attachMarksListener(teacherAssignedClasses);
    
    //     const examId = e.target.value||firstActiveExam.id;
    //     if (examId) {
    //         generateEntryReport(examId); // Always generate the main report
    //         if (isClassTeacher) {
    //             renderMyClassPendingList(examId); // Also generate the teacher's pending list
    //         }
    //     } else {
    //         document.getElementById('entry-report-container').innerHTML = `<p class="text-muted text-center p-5">Please select an exam.</p>`;
    //         if (isClassTeacher) {
    //             document.getElementById('my-class-pending-container').innerHTML = `<p class="text-muted text-center p-5">Please select an exam.</p>`;
    //         }
    //     }
    // });
}

/**
 * Generates the data for the main entry report and renders the controls and table.
 */

async function generateEntryReport(examId) {
    let marks = await window.getmarks();
    //console.log(marks);
    
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
        const studentsInClass = students.filter(s => s.classId === schedule.classId && s.division === schedule.division && s.status === "Active");
        
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

window.onStatusChange = (value) =>{
    console.log("Status changed:", value);
    filterAndRenderReport();
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
    

