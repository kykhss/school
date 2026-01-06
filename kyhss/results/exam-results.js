        // --- EXAM MANAGEMENT (ENHANCED) ---

// This replaces the existing window.renderExamManagement function
// --- EXAM MANAGEMENT (ENHANCED) ---

/**
 * Renders the Exam Management module, dynamically creating tabs and content
 * based on the current user's role.
 */
// Global variable to hold the complete, unfiltered report data


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
           //await window.attachMarksListener([{ classId: classId, division: division }]);
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
        const reportTitle = `${examName} - Results (Class: ${className} - ${divisionName} (${window.activeFinancialYear}))`;
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
                    document.getElementById('rc-results-container').innerHTML = window.generateReportCardHTML_Comparison(studentId, [examSelect.value], 'rc-results-container')
           
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
    let marksObject = await window.getmarks(classId, division, examId);
    // 2. Process the raw data to get calculated results
    let resultsData = await processExamResultsData(studentsInClass, schedulesForClass, marksObject,examId, gradingSystem);

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
            const grade = subRes.teGrade;
            if (grade === 'E' || grade === 'F'|| grade === "AB") {
                metrics.totalFailures++;
                isfailed === false? metrics.failurecount++:"";
                isfailed = true;
                
            }
            if (grade === 'AB') {
                isAbsentee = true;
            }
            // Count the grade for the overall grade distribution
            if (metrics.gradeCounts[grade] !== undefined) {
                metrics.gradeCounts[grade]++;
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
                        <h4 class="fw-bold mb-0">${totalStudents > 0 ? ((passingStudents / totalGrades) * 100).toFixed(1) : '0.0'}%</h4>
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
 * Processes raw data to calculate marks, totals, and individual grades for each student.
 * @param {Array} studentsInClass
 * @param {Array} schedules
 * @param {object} marksObject
 * @param {string} examId
 * @param {string} gradingSystem
 * @returns {Array} A new array with calculated results for each student.
 */
async function processExamResultsData(studentsInClass, schedulesForClass, marks, examId, gradingSystem) {

    let marksObject = {};
    
    try{
        marksObject = await marks;
    }catch (e) {
  console.error("Failed to load marks", e);
}

   

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
                const gradeFunc = gradingSystem === 'type1' ? window.calculateGrade : window.calculateGradeType2;
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
        const gradeFunc = gradingSystem === 'type1' ? window.calculateGrade : window.calculateGradeType2;
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
            const NEColor = (subRes.grade === 'N/A') ? 'text-primary fw-bold' : (subRes.grade === 'AB')?'text-danger fw-bold':'';
            
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
        const allocated = window.classroomSubjects.filter(cs => cs.classId === classId && cs.division === division);
        subjectSelect.innerHTML = allocated.map(a => {
            const subject = window.subjects.find(s => s.id === a.subjectId);
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
async function generateSubjectWiseTable() {
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

    const selectedExams = selectedExamIds.map(id => exams.find(e => e.id === id)).filter(Boolean);
    const results = await processSubjectWiseResults(classId, division,selectedExams, subjectId, gradingSystem);

    //console.log(results);
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
async function processSubjectWiseResults(classId, division,selectedExams, subjectId, gradingSystem) {
    
    let marks = await window.getmarks(classId, division);
    console.log(marks);
    
    const studentsInClass = students.filter(s => s.classId === classId && s.division === division);
    
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
                const gradeFunc = gradingSystem === 'type1' ? window.calculateGrade : window.calculateGradeType2;
                
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
        window.calculateGradeType2 = (score, maxScore) => {
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

    const studentsInClass = window.students.filter(s => s.classId === classId && s.division === division && s.status === 'Active')

.sort((a, b) => a.name.localeCompare(b.name));
const schedulesForClass = window.examSchedules.filter(s => s.examId === examId && s.classId === classId && s.division === division);
    
    // The global 'marks' object will be used here
    window.needRefreshedMarks = false;
    let marks = await window.getmarks(classId, division);
    
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
    console.log('Rendering Report Card Tab...');
    const container = document.getElementById('pills-reportcard');
    if (!container) return;

    const classOptions = window.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
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

    studentListContainer.addEventListener('click', async (e) => {
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
            resultsContainer.innerHTML = await window.generateReportCardHTML_Comparison(studentId, examIds);
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
        window.generateReportCardHTML_Comparison(selectedUser.id, [examSelect.value], 'rc-results-container');
        rcHeader.style.display = 'flex'; // Show print button for student
        printAllBtn.style.display = 'none'; // Hide print all button for student
    }
}
/**
 * Generates a single, multi-page HTML document for all students in a class and prints it.
 * This version uses a temporary DOM element to ensure all images are loaded before printing.
 */
async function printAllReportCards(classId, division, examIds) {
    window.showAlert('Preparing report cards for printing...', 'info');

    const studentsInClass = students.filter(s => s.classId === classId && s.division === division);
    if (studentsInClass.length === 0) {
        return showAlert('No students to print.', 'warning');
    }

    const tempPrintContainer = document.createElement('div');
    tempPrintContainer.id = 'temp-report-card-container';
    tempPrintContainer.style.display = 'none';
    document.body.appendChild(tempPrintContainer);

    try {
        const cardPromises = studentsInClass.map(async (student) => {
    const cardHtml = await window.generateReportCardHTML_Comparison(
        student.id,
        examIds,
        tempPrintContainer
    );
    return `<div class="printable-card-page">${cardHtml}</div>`;
});

const allCardsHtml = (await Promise.all(cardPromises)).join('');
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

        window.calculateGrade = (score, maxScore) =>{
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


