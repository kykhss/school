

window.renderExamReportsModule = () => {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    const studentClassIds = [...new Set(students.map(s => s.classId))];
    
    const classOptions = `<option value="">-- Select Class --</option>${classes
        .filter(c => studentClassIds.includes(c.id))
        .sort((a,b) => (a.order || 99) - (b.order || 99)) // Sort by class order
        .map(c => `<option value="${c.id}">${c.name}</option>`).join('')}`;
mainContent.innerHTML = `
        <h1 class="h2 mb-4">Exam Reports & Analysis</h1>
        <select id="exam-reports-class-select" class="form-select w-auto mb-4" multiple size="3">
            ${classOptions}
        </select>
        <ul class="nav nav-tabs" id="examReportsTab" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#exam-reports-toppers" type="button">Overall Toppers</button>
            </li>
            
            <li class="nav-item" role="presentation">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#exam-reports-subject-toppers" type="button">Subject Toppers</button>
            </li>

            <li class="nav-item" role="presentation">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#exam-reports-grade-dist" type="button">Grade Distribution</button>
            </li>
            <li class="nav-item" role="presentation">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#exam-reports-advanced-analysis" type="button">Advanced Failure Analysis</button>
    </li>
        </ul>
        <div class="tab-content card" id="examReportsTabContent">
            <div class="tab-pane fade show active p-4" id="exam-reports-toppers" role="tabpanel"></div>
            
            <div class="tab-pane fade p-4" id="exam-reports-subject-toppers" role="tabpanel"></div>

            <div class="tab-pane fade p-4" id="exam-reports-grade-dist" role="tabpanel"></div>
            <div class="tab-content card" id="examReportsTabContent">
    <div class="tab-pane fade p-4" id="exam-reports-advanced-analysis" role="tabpanel"></div>
</div>
        </div>
    `;

    // Render content for each sub-tab
    renderExamReportsToppersTab();
    renderSubjectToppersTab(); // <-- Call the new function
    renderExamReportsGradeDistributionTab();
    renderAdvancedFailureAnalysisTab();

    // Attach listener for tab changes
    document.querySelectorAll('#examReportsTab .nav-link').forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            const targetId = event.target.dataset.bsTarget;
            switch(targetId) {
                case '#exam-reports-toppers': renderExamReportsToppersTab(); break;
                case '#exam-reports-subject-toppers': renderSubjectToppersTab(); break; // <-- Handle new tab
                case '#exam-reports-grade-dist': renderExamReportsGradeDistributionTab(); break;
                case '#exam-reports-advanced-analysis': renderAdvancedFailureAnalysisTab(); break;
            }
        });
    });
};

/**
 * Renders the Subject Toppers tab content and filters.
 */
function renderSubjectToppersTab() {
    const container = document.getElementById('exam-reports-subject-toppers');
    if (!container) return;
 // Sort exams to show active ones first
    const sortedExams = [...exams].sort((a, b) => (b.isActive || false) - (a.isActive || false));

    container.innerHTML = `
        <div class="ui-card mb-4">
            <h5 class="section-header">Subject-wise Toppers (Top 3 Positions)</h5>
            <div class="row g-3 align-items-end">
                <div class="col-md-6">
                    <label class="form-label">Select Exam</label>
                    <select id="subject-toppers-exam-select" class="form-select">
                        <option value="">-- Select Exam --</option>
                        ${sortedExams.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
                    </select>
                </div>
            </div>
        </div>
        <div id="subject-toppers-display-container" class="mt-4">
            <p class="text-muted text-center p-4">Select an exam to view subject-wise toppers.</p>
        </div>
    `;

    const examSelect = document.getElementById('subject-toppers-exam-select');
    examSelect.addEventListener('change', () => {
        displaySubjectWiseToppers(examSelect.value);
    });

    // Initial load
    if (exams.length > 0) {
        examSelect.value = exams[0].id;
        displaySubjectWiseToppers(examSelect.value);
    }
}
/**
 * Calculates and displays the top 3 students for each subject in an exam.
 * @param {string} examId
 */
async function displaySubjectWiseToppers(examId) {
    const container = document.getElementById('subject-toppers-display-container');
    if (!container) return;
    if (!examId) {
        container.innerHTML = `<p class="text-muted text-center p-4">Select an exam to view subject-wise toppers.</p>`;
        return;
    }
    const marks = await getmarks();

    container.innerHTML = `<div class="text-center p-4"><div class="spinner-border"></div><p>Calculating subject toppers...</p></div>`;
    //await window.attachMarksListener(teacherAssignedClasses);
    const schedulesForExam = examSchedules.filter(s => s.examId === examId);
    const uniqueSubjectIds = [...new Set(schedulesForExam.map(s => s.subjectId))];

    if (uniqueSubjectIds.length === 0) {
        container.innerHTML = `<p class="alert alert-info text-center">No subjects are scheduled for this exam.</p>`;
        return;
    }

    let subjectToppersHtml = `
        <div class="text-end mb-3 no-print">
            <button id="print-subject-toppers-btn" class="btn btn-secondary">
                <i class="fas fa-print me-2"></i>Print Subject Toppers
            </button>
        </div>
    `;

    uniqueSubjectIds.forEach(async subjectId => {
        const subject = window.subjects.find(s => s.id === subjectId);
        if (!subject) return;
        // Get all marks for this specific subject in this exam
        const subjectMarks = [];
        students.forEach(student => {
            const markId = `${examId}_${student.id}_${subjectId}`;
            if (marks[markId]) {
                const mark = marks[markId];
                const schedule = schedulesForExam.find(s => s.subjectId === subjectId && s.classId === student.classId && s.division === student.division);
                if (schedule) {
                    const total = (mark.te === 'AB' || mark.ce === 'AB') ? -1 : (Number(mark.te) || 0) + (Number(mark.ce) || 0);
                    const maxTotal = (schedule.maxTE || 0) + (schedule.maxCE || 0);
                    const grade = window.calculateGrade(total, maxTotal);

                    // Add to list only if they did not fail this specific subject
                    if (grade !== 'E' && grade !== 'F' && total !== -1) {
                        subjectMarks.push({
                            studentName: student.name,
                            photoDriveId: student.photoDriveId,
                            total,
                            maxTotal
                        });
                    }
                }
            }
        });

        // Sort by total marks (descending) and get top 3
        const toppers = subjectMarks.sort((a, b) => b.total - a.total).slice(0, 3);

        if (toppers.length > 0) {
            subjectToppersHtml += `
                <div class="ui-card mb-4 printable-section">
                    <h6 class="section-header text-primary">${subject.name}</h6>
                    <ul class="list-group list-group-flush">
                        ${toppers.map((topper, index) => `
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <span class="fw-bold me-2">#${index + 1}</span>
                                    ${topper.studentName}
                                </div>
                                <span class="badge bg-success rounded-pill">${topper.total} / ${topper.maxTotal}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
    });

    if (subjectToppersHtml.includes('ui-card')) {
        container.innerHTML = subjectToppersHtml;
        document.getElementById('print-subject-toppers-btn').addEventListener('click', () => {
            const exam = exams.find(e => e.id === examId);
            printContentOfDiv('subject-toppers-display-container', `Subject Toppers - ${exam.name}`);
        });
    } else {
        container.innerHTML = `<p class="alert alert-info text-center">No results found to determine subject toppers.</p>`;
    }
}
/**
 * Renders the Exam Toppers tab content.
 */
async function renderExamReportsToppersTab() { // Renamed from renderExamControlToppersTab
    const container = document.getElementById('exam-reports-toppers'); // Updated ID
    if (!container) return;
 // Sort exams to show active ones first
    const sortedExams = [...exams].sort((a, b) => (b.isActive || false) - (a.isActive || false));

    container.innerHTML = `
        <div class="ui-card mb-4">
            <h5 class="section-header">Exam Toppers (Top 4 Positions)</h5>
            <div class="row g-3 align-items-end">
                <div class="col-md-6">
                    <label class="form-label">Select Exam</label>
                    <div class="input-group">
                        <select id="toppers-exam-select" class="form-select">
                            <option value="">-- Select Exam --</option>
                            ${sortedExams.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
                        </select>
                        ${selectedUser && selectedUser.role === 'admin' ? `
                            <button id="edit-poster-template-btn" class="btn btn-outline-secondary" type="button" title="Create or Edit Poster Template">
                                <i class="bi bi-palette-fill"></i> Edit Template
                            </button>
                            <button id="save-btn-template" class="btn btn-outline-primary" type="button" title="Save Poster Template to Database">
                                <i class="bi bi-cloud-arrow-up-fill"></i> Save Template
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Grading System (for percentages)</label>
                    <select id="toppers-grading-system" class="form-select">
                        <option value="type1">A+, A, B+, B...</option>
                        <option value="type2">O, A, B, C...</option>
                    </select>
                </div>
            </div>
        </div>
        <div id="toppers-display-container" class="mt-4">
            <p class="text-muted text-center p-4">Select an exam to view toppers.</p>
        </div>
    `;

    const examSelect = document.getElementById('toppers-exam-select');
    const gradingSystemSelect = document.getElementById('toppers-grading-system');
     
    // --- MODIFIED: This function is now async ---
    const generateToppers = async () => {
        //await window.attachMarksListener(teacherAssignedClasses);
        const examId = examSelect.value;
        const gradingSystem = gradingSystemSelect.value;
        
        if (examId) {
            // --- NEW LOGIC START ---
            // Pre-load the poster template from the database into localStorage for the editor.
            try {
                const examDocRef = getDocRef('exams', examId);
                const examDocSnap = await getDoc(examDocRef);

                if (examDocSnap.exists()) {
                    const examData = examDocSnap.data();
                    if (examData && examData.posterSettings) {
                        // If a template exists in the DB, save it to localStorage.
                        localStorage.setItem(`posterDraft_${examId}`, JSON.stringify(examData.posterSettings));
                        console.log(`Template for exam '${examId}' loaded from DB into localStorage.`);
                    } else {
                        // If no template exists, remove any old draft from localStorage.
                        //localStorage.removeItem(`posterDraft_${examId}`);
                        console.log(`No template in DB for exam '${examId}'. Cleared local draft.`);
                    }
                }
            } catch (error) {
                console.error("Error loading poster template for editor:", error);
            }
            // --- NEW LOGIC END ---
            
            displayClassWiseToppers(examId, students, gradingSystem);
        } else {
            document.getElementById('toppers-display-container').innerHTML = `<p class="text-muted text-center p-4">Select an exam to view toppers.</p>`;
        }
    };

    examSelect.addEventListener('change', generateToppers);
    gradingSystemSelect.addEventListener('change', generateToppers);

    if (selectedUser && selectedUser.role === 'admin') {
        const editTemplateBtn = document.getElementById('edit-poster-template-btn');
        editTemplateBtn.addEventListener('click', () => {
    const selectedExamId = examSelect.value;
    
    if (selectedExamId) {
        // 1. Define Demo Values (So the admin can see what the layout looks like)
        const demoData = {
            id: `topper-${selectedExamId}`,  // Fixed ID so we can select it automatically
            name: "STUDENT NAME",
            class: "CLASS 10-A",
            rank: "1",
            photo: "https://placehold.co/400x400/0c66ff/white?text=Student+Photo" // Placeholder Image
        };

        // 2. Inject Demo Data into LocalStorage
        const DB_KEY = `topper`;
        let currentData = [];
        try {
            currentData = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
        } catch (e) {
            currentData = [];
        }

        // Remove old demo entry if exists, and add the new one to the top
        currentData = currentData.filter(item => item.id !== demoData.id);
        currentData.unshift(demoData);
        localStorage.setItem(DB_KEY, JSON.stringify(currentData));

        // 3. Open the Robust Editor
        // selectId = Automatically selects the "Student Name" data entry we just made
        // template = Defaults to 'topper' layout
        const editorUrl = `robust-editor.html?selectId=${demoData.id}&template=topper`;
        window.open(editorUrl, '_blank');

    } else {
        alert('Please select an exam before creating a template.');
    }
});

        document.getElementById('save-btn-template').addEventListener('click', async () => {
            const currentEditingExamId = examSelect.value;
            if (!currentEditingExamId) {
                alert("Please select an exam first.");
                return;
            }

            const posterSettingsJSON = localStorage.getItem(`topper-${currentEditingExamId}`);
            if (!posterSettingsJSON) {
                alert("No template draft found in browser storage to save.");
                return;
            }
            postersettingsJSON.lastUpdated = serverTimestamp(); 


            try {
                const examDocRef = getDocRef('exams', currentEditingExamId);
                await setDoc(examDocRef, { posterSettings: JSON.parse(posterSettingsJSON ) }, { merge: true });
                alert(`Template for exam '${currentEditingExamId}' was saved to the database!`);
            } catch (error) {
                console.error("Error saving template to Firestore: ", error);
                alert("Error saving template. Check the console for details.");
            }
        });
    }

    if (exams.length > 0) {
        examSelect.value = exams[0].id;
        generateToppers();
    }
}


/**
 * Displays class-wise toppers for a selected exam.
 * @param {string} examId
 * @param {string} gradingSystem
 */
/**
 * Displays class-wise toppers for a selected exam.
 * @param {string} examId
 * @param {string} gradingSystem
 */
/**
 * Displays class-wise toppers for a selected exam.
 * @param {string} examId
 * @param {string} gradingSystem
 */
function displayClassWiseToppers(examId, gradingSystem) {
    const container = document.getElementById('toppers-display-container');
    if (!container) return;

    container.innerHTML = `<div class="text-center p-4"><div class="spinner-border"></div><p>Calculating toppers...</p></div>`;

    // Group students by class and division
    const studentsByClassDiv = students.reduce((acc, student) => {
        const key = `${student.classId}-${student.division}`;
        if (!acc[key]) {
            acc[key] = {
                classId: student.classId,
                division: student.division,
                students: []
            };
        }
        acc[key].students.push(student);
        return acc;
    }, {});

    let toppersHtml = `
        <div class="text-end mb-3 no-print">
            <button id="print-toppers-report-btn" class="btn btn-secondary">
                <i class="fas fa-print me-2"></i>Print Toppers List
            </button>
        </div>
    `;

    // --- COMPLETED: Sorts classes numerically, then divisions alphabetically ---
    const sortedClassDivKeys = Object.keys(studentsByClassDiv).sort((a, b) => {
        const [classA, divA] = a.split('-');
        const [classB, divB] = b.split('-');
        const classNameA = classes.find(c => c.id === classA)?.name || '';
        const classNameB = classes.find(c => c.id === classB)?.name || '';

        // Numeric class name comparison (e.g., CLASS10 vs CLASS5)
        const numA = parseInt(classNameA.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(classNameB.match(/\d+/)?.[0] || '0', 10);
        if (numA !== numB) return numA - numB;

        return divA.localeCompare(divB); // Alphabetical division comparison
    });

    sortedClassDivKeys.forEach(key => {
        const { classId, division, students: studentsInThisClassDiv } = studentsByClassDiv[key];
        const className = classes.find(c => c.id === classId)?.name || classId;

        // Filter schedules to ONLY include the ones for this specific class and division.
        const schedulesForThisClass = examSchedules.filter(s =>
            s.examId === examId &&
            s.classId === classId &&
            s.division === division
        );

        // Call the processing function with the correctly scoped schedules.
        const classResults = processExamResultsData(studentsInThisClassDiv, schedulesForThisClass, marks, examId, gradingSystem);

        const toppers = classResults
            .filter(r => r.finalStatus === 'PASS')
            .sort((a, b) => b.grandPct - a.grandPct)
            .slice(0, 4); // Get top 4

        if (toppers.length > 0) {
            toppersHtml += `
                <div class="ui-card mb-4 printable-section">
                    <h6 class="section-header text-primary">Toppers for ${className} - ${division}</h6>
                    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3">
                        
                        ${toppers.map((topper, index) => {
                            const student = students.find(s => s.id === topper.studentId);
                            const exam = exams.find(e => e.id === examId);
                            const studentPhotoSrc = topper.studentId && students.find(s => s.id === topper.studentId)?.photoDriveId
                                ? `https://drive.google.com/thumbnail?id=${students.find(s => s.id === topper.studentId).photoDriveId}&sz=200`
                                : 'https://placehold.co/100x120?text=No+Photo';
                            
                            const positionColor = ['#FFD700', '#C0C0C0', '#CD7F32'][index] || '#6c757d'; // Gold, Silver, Bronze, Gray

                            return `
                                <div class="col">
                                    <div class="card h-100 shadow-sm border-${index < 3 ? 'success' : 'light'}" style="border-width: 2px;">
                                        <div class="card-body text-center pb-2">
                                            <div class="position-absolute top-0 start-50 translate-middle badge rounded-pill fs-5"
                                                 style="background-color: ${positionColor}; color: white; padding: 0.4em 0.8em; margin-top: -15px;">
                                                #${index + 1}
                                            </div>
                                            <img src="${studentPhotoSrc}" alt="${topper.studentName}" class="rounded-circle mt-3 mb-2" style="width: 80px; height: 80px; object-fit: cover;">
                                            <h6 class="mb-0">${topper.studentName}</h6>
                                            <p class="text-muted small mb-1">${topper.grandPct?.toFixed(2) || '0.00'}%</p>
                                            <p class="mb-0 small text-success fw-bold">${topper.overallGrade}</p>
                                            <button class="btn btn-sm btn-outline-primary mt-2" 
                        onclick="generateTopperPoster('${topper.studentId}', '${examId}', ${index + 1})">
                    <i class="fas fa-award me-1"></i> Generate Poster

                </button>

                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
    });
    
    // Final rendering and attaching the print listener
    if (toppersHtml.includes('ui-card')) {
        container.innerHTML = toppersHtml;
        document.getElementById('print-toppers-report-btn').addEventListener('click', () => {
            const exam = exams.find(e => e.id === examId);
            printContentOfDiv('toppers-display-container', `Exam Toppers - ${exam.name}`);
        });
    } else {
        container.innerHTML = `<p class="alert alert-info text-center">No toppers found for this exam (or no students passed).</p>`;
    }
}
// Variable to hold the Chart.js instance for grade distribution
let gradeDistributionChart = null;

/**
 * Renders the Grade Distribution tab content.
 */
/**
 * Renders the NEW Grade Distribution tab content with the matrix and reverse lookup tool.
 */
async function renderExamReportsGradeDistributionTab() {
    const container = document.getElementById('exam-reports-grade-dist');
    if (!container) return;
     // Sort exams to show active ones first
    const sortedExams = [...exams].sort((a, b) => (b.isActive || false) - (a.isActive || false));

// Prepare filter options
    const examOptions = `<option value="all">-- All Exams --</option>${sortedExams.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}`;
    const subjectOptions = `<option value="all">-- All Subjects --</option>${subjects.sort((a,b)=>a.name.localeCompare(b.name)).map(s => `<option value="${s.id}">${s.name}</option>`).join('')}`;
    // Add a multi-select for the failure report's class filter
    const classOptionsMulti = classes.sort((a,b) => (a.order || 99) - (b.order || 99)).map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    // Filter for classes that actually have students to avoid empty options
    const studentClassIds = [...new Set(students.map(s => s.classId))];
    const classOptions = `<option value="">-- Select Class --</option>${classes
        .filter(c => studentClassIds.includes(c.id))
        .sort((a,b) => (a.order || 99) - (b.order || 99)) // Sort by class order
        .map(c => `<option value="${c.id}">${c.name}</option>`).join('')}`;

    container.innerHTML = `
        <div class="ui-card mb-4">
            <h5 class="section-header">Grade Distribution Analysis</h5>
            <div class="row g-3 align-items-end">
                <div class="col-md-4">
                    <label class="form-label">Select Exam</label>
                    <select id="grade-dist-exam-select" class="form-select">
                        <option value="all">-- All Exams (Cumulative) --</option>
                        ${sortedExams.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Select Class</label>
                    <select id="grade-dist-class-select" class="form-select">${classOptions}</select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Grading System</label>
                    <select id="grade-dist-grading-system" class="form-select">
                        <option value="type1">A+, A, B+, B...</option>
                        <option value="type2">A, B, C...</option>
                    </select>
                </div>
            </div>
        </div>
        <div id="grade-dist-results-container" class="mt-4">
            <p class="text-muted text-center p-4">Please select a class to generate the report.</p>
        </div>
        <div class="ui-card mb-4">
            <h5 class="section-header">Advanced Grade Analysis Filters</h5>
            <div class="row g-3 align-items-end">
                <div class="col-md-3">
                    <label class="form-label">Select Subject</label>
                    <select id="analysis-subject-select" class="form-select">${subjectOptions}</select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Filter by Gender</label>
                    <div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="genderFilter" id="gender-all" value="all" checked>
                            <label class="form-check-label" for="gender-all">All</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="genderFilter" id="gender-male" value="M">
                            <label class="form-check-label" for="gender-male">Male</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="genderFilter" id="gender-female" value="F">
                            <label class="form-check-label" for="gender-female">Female</label>
                        </div>
                    </div>
                </div>
                 <div class="col-md-3">
                    <label class="form-label">Classes for Failure Report</label>
                    <select id="failure-class-filter" class="form-select" multiple size="3">${classOptionsMulti}</select>
                </div>
            </div>
        </div>
        <div id="advanced-analysis-results" class="mt-4">
            <p class="text-muted text-center p-4">Select filters to generate reports.</p>
        </div>
    `;

    const examSelect = document.getElementById('grade-dist-exam-select');
    const classSelect = document.getElementById('grade-dist-class-select');
    const gradingSystemSelect = document.getElementById('grade-dist-grading-system');

    // Attach listeners to all filters
    [examSelect, classSelect, gradingSystemSelect].forEach(el => {
        el.addEventListener('change', () => {
            const selectedClassId = classSelect.value;
            if (selectedClassId) { // Only generate if a class is selected
            const classObject = classes.find(c => c.id === selectedClassId);
            if (classObject && classObject.divisions) {
                // 2. Prepare the data structure that attachMarksListener expects.
                const classDataArray = classObject.divisions.map(div => ({
                    classId: selectedClassId,
                    division: div
                }));

                // 3. AWAIT the smart-sync function. This is the crucial step.
                // It will either load from local DB or fetch from Firestore if needed.
                //window. attachMarksListener(classDataArray);
            }
                displayGradeDistribution(examSelect.value, selectedClassId, gradingSystemSelect.value);
            }
        });
    });


    // Attach a single event listener to all filters
    ['grade-dist-exam-select', 'analysis-subject-select', 'failure-class-filter'].forEach(id => {
        document.getElementById(id).addEventListener('change', displayAdvancedGradeAnalysis);
    });
    document.querySelectorAll('input[name="genderFilter"]').forEach(radio => {
        radio.addEventListener('change', displayAdvancedGradeAnalysis);
    });

    // Initial render
    displayAdvancedGradeAnalysis();

}

// =========================================================================
// --- ⚙️ ADVANCED GRADE ANALYSIS MODULE (REFACTORED) ---
// =========================================================================
// --- New Function: renderAdvancedFailureAnalysisTab ---
function renderAdvancedFailureAnalysisTab() {
    const container = document.getElementById('exam-reports-advanced-analysis');
    if (!container) return;

    // Prepare filter options
    const allExams = exams.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    const allSubjects = subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const allClasses = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    container.innerHTML = `
        <div class="ui-card mb-4">
            <h5 class="section-header">🔍 Advanced Failure Analysis Filters</h5>
            <div class="row g-3 align-items-end">
                <div class="col-md-3">
                    <label class="form-label">Primary Exam (For Current Mark)</label>
                    <select id="analysis-exam-select" class="form-select">${allExams}</select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Select Class(es) (Required)</label>
                    <select id="analysis-class-select" class="form-select" multiple size="4">${allClasses}</select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Min. Failed Subjects (Any Grade)</label>
                    <input type="number" id="min-failed-subjects" class="form-control" value="2" min="1">
                </div>
                <div class="col-md-3 d-grid">
                    <button id="run-analysis-btn" class="btn btn-primary btn-lg">Run Analysis</button>
                </div>
            </div>
            <div class="row g-3 mt-2">
                <div class="col-md-4">
                    <label class="form-label">Specific Subject (Filter 1)</label>
                    <select id="specific-subject-select" class="form-select">
                        <option value="">-- All Subjects --</option>
                        ${allSubjects}
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Specific Grade (Filter 2)</label>
                    <select id="specific-grade-select" class="form-select">
                        <option value="">-- Any Grade --</option>
                        <option value="D">D Grade</option>
                        <option value="E">E Grade</option>
                        <option value="D,E">D or E Grade</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div id="advanced-analysis-results-container">
            <p class="text-muted text-center p-4">Run the analysis to see results.</p>
        </div>

        <div class="modal fade" id="studentProgressionModal" tabindex="-1">
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="studentProgressionModalLabel">Student Academic Profile</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="student-progression-details"></div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('run-analysis-btn').addEventListener('click', () => {
        // Ensure marks data is loaded for all involved classes
        // window.attachMarksListener(teacherAssignedClasses); 
        runAdvancedFailureAnalysis();
    });
}

// --- New Function: runAdvancedFailureAnalysis ---
async function runAdvancedFailureAnalysis() {
    const resultsContainer = document.getElementById('advanced-analysis-results-container');
    resultsContainer.innerHTML = `<div class="text-center p-4"><div class="spinner-border"></div><p>Calculating results and applying filters...</p></div>`;

    // 1. Gather all filters
    const primaryExamId = document.getElementById('analysis-exam-select').value;
    const selectedClassIds = Array.from(document.getElementById('analysis-class-select').selectedOptions).map(opt => opt.value);
    const minFailedSubjects = parseInt(document.getElementById('min-failed-subjects').value) || 1;
    const specificSubjectId = document.getElementById('specific-subject-select').value;
    const specificGradeFilter = document.getElementById('specific-grade-select').value.split(',').filter(g => g);

    if (selectedClassIds.length === 0 || !primaryExamId) {
        return showAlert('Please select a **Primary Exam** and at least one **Class**.', 'warning');
    }
     const marks = await window.getmarks(classId); // Ensure marks are loaded for this class
       
    // --- KEY MODIFICATION: Determine the set of relevant subjects for the primary exam ---
    const relevantSubjectIdsForPrimaryExam = new Set(
        examSchedules
            .filter(s => s.examId === primaryExamId && selectedClassIds.includes(s.classId))
            .map(s => s.subjectId)
    );
    // --- END KEY MODIFICATION ---

    const failingGrades = new Set(['D', 'E', 'AB']);
    const analysisResults = [];

    // 2. Main Iteration: Over all students in selected classes
    selectedClassIds.forEach(async classId => {
        const studentsInClass = students.filter(s => s.classId === classId);
        studentsInClass.forEach(student => {
            let totalFailCount = 0;
            let specificSubjectMatch = false; 
            let allExamMarks = {}; // Stores { subjectId: { examId: { total, grade, maxTotal } } }

            // Iterate over all marks for the student
            Object.values(marks).filter(m => m.studentId === student.id).forEach(mark => {
                const schedule = examSchedules.find(s => s.examId === mark.examId && s.classId === student.classId && s.division === student.division && s.subjectId === mark.subjectId);
                const maxTotal = (schedule?.maxTE || 0) + (schedule?.maxCE || 0);

                if (mark && maxTotal > 0) {
                    const total = (mark.te === 'AB' || mark.ce === 'AB') ? 'AB' : (Number(mark.te) || 0) + (Number(mark.ce) || 0);
                    const grade = (total === 'AB') ? 'AB' : window.calculateGrade(total, maxTotal);

                    // Add to total failure count (Filter 3: Min. Fails)
                    // CRUCIAL: ONLY count failures if the subject is in the set of relevant subjects for the primary exam.
                    if (mark.examId === primaryExamId && relevantSubjectIdsForPrimaryExam.has(mark.subjectId)) {
                        if (failingGrades.has(grade)) {
                            totalFailCount++;
                        }
                    }

                    // Specific Subject Grade Match (Filter 1)
                    if (mark.examId === primaryExamId && mark.subjectId === specificSubjectId && specificGradeFilter.includes(grade)) {
                        specificSubjectMatch = true;
                    }
                    
                    // Store the mark for the final table (Filter 3: Progression)
                    if (!allExamMarks[mark.subjectId]) {
                        allExamMarks[mark.subjectId] = [];
                    }
                    allExamMarks[mark.subjectId].push({ total, grade, examId: mark.examId, maxTotal });
                }
            });

            // 4. Apply all filters
            const passedMinFailedCount = totalFailCount >= minFailedSubjects;
            const specificFilterApplied = specificSubjectId && specificGradeFilter.length > 0;
            const passedSpecificFilter = specificFilterApplied ? specificSubjectMatch : true;

            if (passedMinFailedCount && passedSpecificFilter) {
                analysisResults.push({ student, totalFailCount, allExamMarks });
            }
        });
    });

    // 5. Render the final table
    renderAnalysisResultsTable(analysisResults, primaryExamId, specificSubjectId);
}
/**
 * Renders the final table of analysis results.
 * @param {Array<object>} results 
 * @param {string} currentExamId 
 * @param {string} specificSubjectId 
 */
function renderAnalysisResultsTable(results, currentExamId, specificSubjectId) {
    const container = document.getElementById('advanced-analysis-results-container');
    if (results.length === 0) {
        container.innerHTML = `<p class="alert alert-info">No students matched the selected analysis criteria.</p>`;
        return;
    }

    // Prepare table headers: Student Info, Failed Count, and Progression Subjects
    const progressionSubjects = [...new Set(results.flatMap(r => Object.keys(r.allExamMarks)))].map(id => subjects.find(s => s.id === id)).filter(Boolean);

    const headers = ['Student Name', 'Class/Div', 'Min. Fails', ...progressionSubjects.map(s => s.name)];
    
    // Sort by failed count (descending), then by name
    results.sort((a, b) => b.failedCount - a.failedCount || a.student.name.localeCompare(b.student.name));
    
    const tableRows = results.map(result => {
        const student = result.student;
        const className = classes.find(c => c.id === student.classId)?.name || 'N/A';

        // Cells for progression subjects
        const markCells = progressionSubjects.map(sub => {
            const subjectMarks = result.allExamMarks[sub.id] || [];
            
            // Get the mark for the current exam being filtered (Filter 3 - Current Exam)
            const currentExamMark = subjectMarks.find(m => m.examId === currentExamId);
            
            // Get the mark for the prior exam (Filter 3 - Progression Check)
            const priorExamMark = subjectMarks.find(m => m.examId !== currentExamId);
            
            const currentGrade = currentExamMark?.grade || '-';
            const priorGrade = priorExamMark?.grade || '-';
            
            let cellColor = '';
            let gradeIcon = '';

            // Progression/Fallback Logic
            if (currentExamMark && priorExamMark) {
                // Simplified logic: If total is higher, it's progression.
                if (currentExamMark.total > priorExamMark.total) {
                    cellColor = 'table-success';
                    gradeIcon = '▲';
                } else if (currentExamMark.total < priorExamMark.total) {
                    cellColor = 'table-danger';
                    gradeIcon = '▼';
                } else {
                    gradeIcon = '–';
                }
            } else if (currentExamMark) {
                cellColor = currentExamMark.grade === 'D' || currentExamMark.grade === 'E' ? 'table-danger' : 'table-warning';
            }
            
            
            return `
                <td class="${cellColor}" title="Prior: ${priorGrade}">
                    ${gradeIcon} ${currentGrade}
                    <div class="small text-muted">${currentExamMark?.total || '-'} / ${currentExamMark?.maxTotal || '-'}</div>
                </td>`;
        }).join('');

        return `
            <tr class="align-middle">
                <td>
                    <strong>${student.name}</strong><br>
                    <small class="text-muted">${student.admissionNumber}</small>
                </td>
                <td>${className} - ${student.division}</td>
                <td class="text-center fw-bold text-danger">${result.totalFailCount}</td>
                ${markCells}
                <td>
                    <button class="btn btn-sm btn-info" onclick="window.showStudentProgressionModal('${student.id}')">
                        <i class="fas fa-chart-line me-1"></i> Profile
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <h5 class="section-header">Analysis Results (${results.length} Students)</h5>
        <div class="table-responsive">
            <table class="table table-bordered table-striped table-sm align-middle">
                <thead class="table-dark">
                    <tr>
                        ${headers.map(h => `<th>${h}</th>`).join('')}
                        <th>Full Profile</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>
    `;
}

/**
 * Shows a comprehensive academic profile for a student in a modal.
 * @param {string} studentId 
 */
window.showStudentProgressionModal = (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return showAlert('Student data not found.', 'danger');

    const modalTitle = document.getElementById('studentProgressionModalLabel');
    const modalBody = document.getElementById('student-progression-details');
    const studentModal = new bootstrap.Modal(document.getElementById('studentProgressionModal'));
    
    modalTitle.textContent = `Academic Profile: ${student.name} (${student.admissionNumber})`;
    modalBody.innerHTML = `<div class="text-center p-4"><div class="spinner-border"></div><p>Gathering academic history...</p></div>`;

    // 1. Get all marks for the student across all exams/subjects
    const allStudentMarks = Object.values(marks).filter(m => m.studentId === studentId);
    
    if (allStudentMarks.length === 0) {
        modalBody.innerHTML = `<p class="alert alert-info">No mark records found for this student.</p>`;
        studentModal.show();
        return;
    }
    
    // 2. Group Marks by Subject and Exam for the Progression Table
    const marksBySubject = allStudentMarks.reduce((acc, mark) => {
        if (!acc[mark.subjectId]) acc[mark.subjectId] = [];
        acc[mark.subjectId].push(mark);
        return acc;
    }, {});
    
    // 3. Build the Progression Table
    let tableHtml = `<h5 class="section-header">Subject Progression Over Time</h5><div class="table-responsive"><table class="table table-striped table-sm"><thead><tr><th>Subject</th>`;
    
    const allExams = [...new Set(allStudentMarks.map(m => m.examId))].map(id => exams.find(e => e.id === id)).filter(Boolean).sort((a,b) => a.name.localeCompare(b.name));
    
    allExams.forEach(e => tableHtml += `<th>${e.name}</th>`);
    tableHtml += `</tr></thead><tbody>`;

    Object.keys(marksBySubject).forEach(subjectId => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;

        tableHtml += `<tr><td><strong>${subject.name}</strong></td>`;
        allExams.forEach(exam => {
            const mark = marksBySubject[subjectId].find(m => m.examId === exam.id);
            
            if (mark) {
                // Find the specific schedule to get MAX MARKS
                const schedule = examSchedules.find(s => 
                    s.examId === exam.id && 
                    s.classId === student.classId && 
                    s.division === student.division &&
                    s.subjectId === subjectId
                );

                const maxTotal = (schedule?.maxTE || 0) + (schedule?.maxCE || 0);
                const total = (mark.te === 'AB' || mark.ce === 'AB') ? 'AB' : (Number(mark.te) || 0) + (Number(mark.ce) || 0);
                
                // Calculate grade using the correct maxTotal
                const grade = (maxTotal > 0 && total !== 'AB') ? window.calculateGrade(total, maxTotal) : (total === 'AB' ? 'AB' : '-'); 
                const isFail = grade === 'E' || grade === 'F';
                
                tableHtml += `<td class="${isFail ? 'bg-danger text-white' : ''}" title="Score: ${total} / ${maxTotal}">
                    <strong>${grade}</strong><br>
                    <small>${total} / ${maxTotal}</small>
                </td>`;
            } else {
                tableHtml += `<td>-</td>`;
            }
        });
        tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table></div>`;

    // 4. Build the Fee History Summary (Using existing global arrays)
    const feeSetup = studentFeeSetups.find(sfs => sfs.id === studentId);
    const payments = receipts.filter(r => r.studentId === studentId && !r.isCancelled);
    const totalPaid = payments.reduce((sum, p) => sum + p.totalAmount, 0);
    const balance = feeSetup ? (feeSetup.totalPayable - totalPaid) : 0;
    
    let feeHtml = `<h5 class="section-header mt-4">Fee Status (${activeFinancialYear})</h5>
        <div class="row g-3">
            <div class="col-md-4"><div class="card bg-primary text-white"><div class="card-body py-2">Payable: <strong class="fs-5">₹ ${feeSetup?.totalPayable.toFixed(2) || '0.00'}</strong></div></div></div>
            <div class="col-md-4"><div class="card bg-success text-white"><div class="card-body py-2">Paid: <strong class="fs-5">₹ ${totalPaid.toFixed(2)}</strong></div></div></div>
            <div class="col-md-4"><div class="card bg-danger text-white"><div class="card-body py-2">Balance: <strong class="fs-5">₹ ${balance.toFixed(2)}</strong></div></div></div>
        </div>`;

    // 5. Final Output
    modalBody.innerHTML = tableHtml + feeHtml;
    studentModal.show();
}


/**
 * Renders the NEW "Advanced Grade Analysis" tab with comprehensive filters and report sections.
 */
function renderExamReportsGradeDistributionTabhj() {
    const container = document.getElementById('exam-reports-grade-dist');
    if (!container) return;
     // Sort exams to show active ones first
    const sortedExams = [...exams].sort((a, b) => (b.isActive || false) - (a.isActive || false));


    // Prepare filter options
    const examOptions = `<option value="all">-- All Exams --</option>${sortedExams.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}`;
    const subjectOptions = `<option value="all">-- All Subjects --</option>${subjects.sort((a,b)=>a.name.localeCompare(b.name)).map(s => `<option value="${s.id}">${s.name}</option>`).join('')}`;
    // Add a multi-select for the failure report's class filter
    const classOptionsMulti = classes.sort((a,b) => (a.order || 99) - (b.order || 99)).map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    container.innerHTML = `
        <div class="ui-card mb-4">
            <h5 class="section-header">Advanced Grade Analysis Filters</h5>
            <div class="row g-3 align-items-end">
                <div class="col-md-3">
                    <label class="form-label">Select Exam</label>
                    <select id="analysis-exam-select" class="form-select">${examOptions}</select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Select Subject</label>
                    <select id="analysis-subject-select" class="form-select">${subjectOptions}</select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Filter by Gender</label>
                    <div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="genderFilter" id="gender-all" value="all" checked>
                            <label class="form-check-label" for="gender-all">All</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="genderFilter" id="gender-male" value="M">
                            <label class="form-check-label" for="gender-male">Male</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="genderFilter" id="gender-female" value="F">
                            <label class="form-check-label" for="gender-female">Female</label>
                        </div>
                    </div>
                </div>
                 <div class="col-md-3">
                    <label class="form-label">Classes for Failure Report</label>
                    <select id="failure-class-filter" class="form-select" multiple size="3">${classOptionsMulti}</select>
                </div>
            </div>
        </div>
        <div id="advanced-analysis-results" class="mt-4">
            <p class="text-muted text-center p-4">Select filters to generate reports.</p>
        </div>
    `;

    // Attach a single event listener to all filters
    ['analysis-exam-select', 'analysis-subject-select', 'failure-class-filter'].forEach(id => {
        document.getElementById(id).addEventListener('change', displayAdvancedGradeAnalysis);
    });
    document.querySelectorAll('input[name="genderFilter"]').forEach(radio => {
        radio.addEventListener('change', displayAdvancedGradeAnalysis);
    });

    // Initial render
    displayAdvancedGradeAnalysis();
}


/**
 * Main controller function that generates and displays both the grade summary and failure analysis reports.
 */
async function displayAdvancedGradeAnalysis() {
    const resultsContainer = document.getElementById('advanced-analysis-results');
    resultsContainer.innerHTML = `<div class="text-center p-4"><div class="spinner-border"></div><p>Generating advanced analysis...</p></div>`;

    const examId = document.getElementById('grade-dist-exam-select').value;
    const subjectId = document.getElementById('analysis-subject-select').value;
    const gender = document.querySelector('input[name="genderFilter"]:checked').value;
    const failureClassIds = Array.from(document.getElementById('failure-class-filter').selectedOptions).map(opt => opt.value);
    const gradingSystemSelect = document.getElementById('grade-dist-grading-system');
    const gradingSystem = gradingSystemSelect.value; // Hardcoded for now

    // 1. Generate data for the grade summary table
    const summaryData = generateGradeSummaryData(examId, subjectId, gender, gradingSystem);

    // 2. Generate data for the failure list
    const failureData = generateFailureListData(examId, subjectId, gender, failureClassIds, gradingSystem);
    
    // 3. Render the HTML for both reports
    const summaryTableHtml = renderGradeSummaryTable(summaryData, gradingSystem);
    const failureListHtml = renderFailureListTable(failureData, examId, gradingSystem);

    resultsContainer.innerHTML = summaryTableHtml + failureListHtml;

    // 4. Attach event listeners for the newly rendered clickable elements
    resultsContainer.addEventListener('click', e => {
        const target = e.target;
        if (target.classList.contains('grade-summary-count')) {
            e.preventDefault();
            const { classId, grade, division } = target.dataset;
            const studentIds = division ? (summaryData[classId]?.[division]?.[grade] || []) : (summaryData[classId]?.totals?.[grade] || []);
            const className = classes.find(c => c.id === classId)?.name || 'Class';
            const title = division 
                ? `Students in ${className} - ${division} with Grade '${grade}'`
                : `All Students in ${className} with Grade '${grade}'`;
            showStudentListInModal(title, studentIds);
        }
        if (target.id === 'elaborate-view-toggle') {
            displayAdvancedGradeAnalysis(); // Re-render the whole component
        }
    });
}

/**
 * Processes marks and aggregates them by class, division, and grade.
 * @returns {object} A data structure like { classId: { division: { grade: [student IDs] }, totals: { grade: [student IDs] } } }
 */
async function generateGradeSummaryData(examId, subjectId, gender, gradingSystem) {
    let studentsToAnalyze = students;
    if (gender !== 'all') {
        studentsToAnalyze = studentsToAnalyze.filter(s => s.gender === gender);
    }
    const marks = await window.getmarks();
    
    const gradeSummary = {}; 

    studentsToAnalyze.forEach(async student => {
        let schedules = window.examSchedules.filter(sch => sch.classId === student.classId && sch.division === student.division);
        if (examId !== 'all') schedules = schedules.filter(s => s.examId === examId);
        if (subjectId !== 'all') schedules = schedules.filter(s => s.subjectId === subjectId);
            schedules.forEach(schedule => {
            const markId = `${schedule.examId}_${student.id}_${schedule.subjectId}`;
            const mark = marks[markId];
            const maxTotal = (schedule.maxTE || 0) + (schedule.maxCE || 0);
            let grade = 'N/A';
            if (mark) {
                const total = (mark.te === 'AB' || mark.ce === 'AB') ? 'AB' : (Number(mark.te) || 0) + (Number(mark.ce) || 0);
                grade = (total === 'AB') ? 'AB' : (maxTotal > 0 ? window.calculateGrade(total, maxTotal) : 'N/A');
            }

            // Initialize structures if they don't exist
            if (!gradeSummary[student.classId]) gradeSummary[student.classId] = { totals: {} };
            if (!gradeSummary[student.classId][student.division]) gradeSummary[student.classId][student.division] = {};
            if (!gradeSummary[student.classId][student.division][grade]) gradeSummary[student.classId][student.division][grade] = [];
            if (!gradeSummary[student.classId].totals[grade]) gradeSummary[student.classId].totals[grade] = [];
            
            // Add student ID if not already present
            if (!gradeSummary[student.classId][student.division][grade].includes(student.id)) {
                gradeSummary[student.classId][student.division][grade].push(student.id);
            }
            if (!gradeSummary[student.classId].totals[grade].includes(student.id)) {
                gradeSummary[student.classId].totals[grade].push(student.id);
            }
        });
    });
    return gradeSummary;
}

/**
 * Finds all students in the selected classes who failed in at least one subject based on filters.
 * @returns {Array} A list of failed student objects with their full mark list.
 */
async function generateFailureListData(examId, subjectId, gender, classIds, gradingSystem) {
    if (classIds.length === 0) return []; // No classes selected, no data to generate

    let studentsToAnalyze = students.filter(s => classIds.includes(s.classId));
    if (gender !== 'all') {
        studentsToAnalyze = studentsToAnalyze.filter(s => s.gender === gender);
    }
    const marks = await window.getmarks(); // Load all marks once
    const failedStudentsList = [];
    const failingGrades = new Set(['E', 'F', 'AB']);

    studentsToAnalyze.forEach(student => {
        let failedSubjectsCount = 0;
        const studentAllMarks = {};

        let schedules = examSchedules.filter(sch => sch.classId === student.classId && sch.division === student.division);
        if (examId !== 'all') schedules = schedules.filter(s => s.examId === examId);
        
        const subjectIdsToCheck = (subjectId === 'all') 
            ? [...new Set(schedules.map(s => s.subjectId))] 
            : [subjectId];
            
        let hasFailedInSelectedSubjects = false;

        schedules.forEach(schedule => {
            const markId = `${schedule.examId}_${student.id}_${schedule.subjectId}`;
            const mark = marks[markId];
            const maxTotal = (schedule.maxTE || 0) + (schedule.maxCE || 0);
            let grade = 'N/A';
            let total = 'N/A';

            if (mark) {
                total = (mark.te === 'AB' || mark.ce === 'AB') ? 'AB' : (Number(mark.te) || 0) + (Number(mark.ce) || 0);
                grade = (total === 'AB') ? 'AB' : (maxTotal > 0 ? window.calculateGrade(total, maxTotal) : 'N/A');
            }
            
            // Store the mark regardless of pass/fail
            studentAllMarks[schedule.subjectId] = { total, grade };

            // Check for failure only within the filtered subjects
            if (subjectIdsToCheck.includes(schedule.subjectId) && failingGrades.has(grade)) {
                hasFailedInSelectedSubjects = true;
            }
        });
        
        // Count total failures across all subjects for the student
        failedSubjectsCount = Object.values(studentAllMarks).filter(m => failingGrades.has(m.grade)).length;

        if (hasFailedInSelectedSubjects) {
            failedStudentsList.push({
                student,
                failedCount: failedSubjectsCount,
                allMarks: studentAllMarks
            });
        }
    });

    return failedStudentsList.sort((a,b) => b.failedCount - a.failedCount);
}


function renderGradeSummaryTable(summaryData, gradingSystem) {
    var isElaborated =null;
    // The user's new grade scale, including D+
    const gradeScale = gradingSystem === 'type1' ? ['A', 'B', 'C', 'D', 'E', 'F', 'AB'] : ['A', 'B', 'C', 'D', 'E', 'F', 'AB'];//['A+', 'A', 'B+', 'B', 'C+', 'C','D+', 'D', 'E', 'AB'] 
   const sortedClasses = classes.filter(c => summaryData[c.id]).sort((a, b) => (a.order || 99) - (b.order || 99));

    if (sortedClasses.length === 0) return '';

    const getGradeColor = (grade) => {
        // Added D+ to the color map
        const colors = {
            'A+': '#28a745', 'A': '#20c997', 'B+': '#17a2b8', 'B': '#007bff',
            'C+': '#6f42c1', 'C': '#fd7e14', 'D+': '#ffc107', 'D': '#ffc107',
            'E': '#dc3545', 'AB': '#6c757d', 'F': '#dc3545'
        };
        return colors[grade] || '#6c757d';
    };

    // --- 1. Build Table Header ---
    const headerHtml = `
        <tr>
            <th>Class / Division</th>
            ${gradeScale.map(g => `<th style="background-color:${getGradeColor(g)}30;">${g}</th>`).join('')}
        </tr>`;

    let bodyHtml = '';
    const grandTotals = Object.fromEntries(gradeScale.map(g => [g, 0])); // Initialize grand totals

    // --- 2. Build Table Body with Class Totals and Division Sub-rows ---
    sortedClasses.forEach(c => {
        const classTotals = Object.fromEntries(gradeScale.map(g => [g, 0]));

        // First, calculate the totals for the main class row
        c.divisions.forEach(div => {
            gradeScale.forEach(grade => {
                const count = summaryData[c.id]?.[div]?.[grade]?.length || 0;
                classTotals[grade] += count;
            });
        });

        // Add this class's totals to the grand total
        gradeScale.forEach(grade => {
            grandTotals[grade] += classTotals[grade];
        });

        // Render the main, bold row for the class total
        bodyHtml += `
            <tr class="table-primary">
                <td class="fw-bold text-start">${c.name} (Total)</td>
                ${gradeScale.map(grade => {
                    const count = classTotals[grade];
                    return `<td class="fw-bold">${count > 0 ? `<a href="#" class="grade-summary-count text-white" data-class-id="${c.id}" data-grade="${grade}">${count}</a>` : 0}</td>`;
                }).join('')}
            </tr>
        `;

        // Render the indented sub-rows for each division
        c.divisions.sort().forEach(div => {
            bodyHtml += `
                <tr>
                    <td class="ps-4 text-start">↳ ${div}</td>
                    ${gradeScale.map(grade => {
                        const count = summaryData[c.id]?.[div]?.[grade]?.length || 0;
                        return `<td>${count > 0 ? `<a href="#" class="grade-summary-count" data-class-id="${c.id}" data-grade="${grade}" data-division="${div}">${count}</a>` : 0}</td>`;
                    }).join('')}
                </tr>
            `;
        });
    });

    // --- 3. Build Table Footer with Grand Totals ---
    const footerHtml = `
        <tr class="table-dark">
            <th class="text-end">Grand Total</th>
            ${gradeScale.map(grade => `<th>${grandTotals[grade]}</th>`).join('')}
        </tr>`;

    // --- 4. Assemble Final HTML (Elaborate toggle is removed) ---
    return `
        <div class="ui-card mb-4">
            <div class="ui-card mb-4" id="grade-summary-printable">
            <div class="d-flex justify-content-between align-items-center no-print">
                <h5 class="section-header mb-0">Class-wise Grade Summary</h5>
                <div>
                    <div class="form-check form-switch d-inline-block me-3">
                        <input class="form-check-input" type="checkbox" id="elaborate-view-toggle" ${isElaborated ? 'checked' : ''}>
                        <label class="form-check-label" for="elaborate-view-toggle">Elaborate</label>
                    </div>
                    <button id="print-summary-report-btn" class="btn btn-sm btn-outline-secondary"><i class="fas fa-print me-1"></i>Print</button>
                </div>
            </div>

            <div class="table-responsive mt-3">
                <table class="table table-bordered table-sm text-center">
                    <thead class="table-light">${headerHtml}</thead>
                    <tbody>${bodyHtml}</tbody>
                    <tfoot>${footerHtml}</tfoot>
                </table>
            </div>
        </div>
    `;
}
/**
 * Renders the HTML for the failure analysis report table with highlighting.
 */
function renderFailureListTable(failureData, examId, gradingSystem) {
    if (failureData.length === 0) {
        return `<div class="ui-card"><h5 class="section-header">Failure Analysis Report</h5><p class="text-muted">No students found with failing grades for the selected filters.</p></div>`;
    }

    const failingGrades = new Set(['D', 'E', 'AB']);
    
    // Get all relevant subjects for the header from the schedules of the failed students
    const relevantSchedules = examSchedules.filter(s => (examId === 'all' || s.examId === examId) && failureData.some(fd => fd.student.classId === s.classId && fd.student.division === s.division));
    const subjectHeaders = [...new Set(relevantSchedules.map(s => s.subjectId))]
        .map(id => subjects.find(s => s.id === id))
        .filter(Boolean)
        .sort((a,b) => a.name.localeCompare(b.name));

    const tableRows = failureData.map(data => {
        const student = data.student;
        const marksCells = subjectHeaders.map(sub => {
            const markInfo = data.allMarks[sub.id];
            const isFail = markInfo && failingGrades.has(markInfo.grade);
            return `<td class="${isFail ? 'bg-danger text-white' : ''}">${markInfo?.total ?? '-'}</td>`;
        }).join('');
        return `
            <tr>
                <td>${student.name}</td>
                <td>${getStudentClassName(student.classId, student.division)}</td>
                <td class="text-center text-danger fw-bold">${data.failedCount}</td>
                ${marksCells}
            </tr>
        `;
    }).join('');

    return `
        <div class="ui-card">
            <div class="d-flex justify-content-between align-items-center no-print">
                <h5 class="section-header mb-0">Failure Analysis Report (${failureData.length} students)</h5>
                <button id="print-failure-report-btn" class="btn btn-sm btn-outline-secondary"><i class="fas fa-print me-1"></i>Print</button>
            </div>

            <div class="table-responsive">
                <table class="table table-bordered table-sm">
                    <thead class="table-light">
                        <tr>
                            <th>Student Name</th>
                            <th>Class</th>
                            <th class="text-center">Failed Subjects</th>
                            ${subjectHeaders.map(s => `<th>${s.name}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        </div>
    `;
}
/**
 * Displays the detailed grade distribution table with a two-row header,
 * division-wise counts, and a total for each grade.
 * @param {string} examId - 'all' or a specific exam ID.
 * @param {string} classId - A specific class ID.
 * @param {string} gradingSystem - 'type1' or 'type2'.
 */
async function displayGradeDistribution(examId, classId, gradingSystem) {
    const resultsContainer = document.getElementById('grade-dist-results-container');
    resultsContainer.innerHTML = `<div class="text-center p-4"><div class="spinner-border"></div><p>Calculating distribution...</p></div>`;
const marks = await window.getmarks(classId); // Load all marks once

    const classObject = classes.find(c => c.id === classId);
    if (!classObject) {
        resultsContainer.innerHTML = `<p class="alert alert-danger">Selected class not found.</p>`;
        return;
    }

    const studentsToAnalyze = students.filter(s => s.classId === classId);
    const divisions = classObject.divisions.sort();
    const subjectsInClass = classroomSubjects.filter(cs => cs.classId === classId)
        .map(cs => subjects.find(s => s.id === cs.subjectId))
        .filter(Boolean)
        .filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i)
        .sort((a,b) => a.name.localeCompare(b.name));
    
    const gradeScale = gradingSystem === 'type1'
        ? ['A', 'B', 'C', 'D', 'E', 'F', 'AB']
        : ['A', 'B', 'C', 'D', 'E', 'F', 'AB'];//['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'E', 'AB']

    // 1. Aggregate data (No change here)
    const subjectGradeData = {};
    subjectsInClass.forEach(sub => {
        subjectGradeData[sub.id] = {};
        gradeScale.forEach(grade => {
            subjectGradeData[sub.id][grade] = {};
            divisions.forEach(div => {
                subjectGradeData[sub.id][grade][div] = [];
            });
        });
        subjectGradeData[sub.id]['N/A'] = {};
    });

    studentsToAnalyze.forEach(student => {
        let schedules = examSchedules.filter(sch => sch.classId === student.classId && sch.division === student.division);
        if (examId !== 'all') {
            schedules = schedules.filter(s => s.examId === examId);
        }
        
        schedules.forEach(schedule => {
            const markId = `${schedule.examId}_${student.id}_${schedule.subjectId}`;
            const mark = marks[markId];
            const maxTotal = (schedule.maxTE || 0) + (schedule.maxCE || 0);
            let grade = 'N/A';
            if (mark) {
                const total = (mark.te === 'AB' || mark.ce === 'AB') ? 'AB' : (Number(mark.te) || 0) + (Number(mark.ce) || 0);
                grade = (total === 'AB') ? 'AB' : (maxTotal > 0 ? (gradingSystem === 'type1' ? window.calculateGrade(total, maxTotal) : window.calculateGradeType2(total, maxTotal)) : 'N/A');
            }
            if (subjectGradeData[schedule.subjectId]?.[grade]?.[student.division]) {
                subjectGradeData[schedule.subjectId][grade][student.division].push(student.id);
            }
        });
    });

    // 2. Render the new table with two-row headers and a total column for each grade
    const numDivisions = divisions.length;
    const gradeHeaders = gradeScale.map(g => `<th colspan="${numDivisions + 1}">${g}</th>`).join('');
    const divisionSubHeaders = divisions.map(div => `<th>${div}</th>`).join('') + '<th class="table-info">Total</th>';
    const repeatedDivisionHeaders = gradeScale.map(() => divisionSubHeaders).join('');

    const tableRows = subjectsInClass.map(sub => {
        const totalStudentsForSubject = studentsToAnalyze.filter(s => 
            classroomSubjects.some(cs => cs.classId === classId && cs.subjectId === sub.id && cs.division === s.division)
        ).length;

        const gradeCells = gradeScale.map(grade => {
            let gradeTotal = 0;
            const divisionCellsHtml = divisions.map(div => {
                const count = subjectGradeData[sub.id]?.[grade]?.[div]?.length || 0;
                gradeTotal += count;
                return `<td>${count > 0 ? `<a href="#" class="grade-count-cell" data-subject-id="${sub.id}" data-grade="${grade}" data-division="${div}">${count}</a>` : '0'}</td>`;
            }).join('');
            
            // Add the total cell for this grade
            return divisionCellsHtml + `<td class="table-info fw-bold">${gradeTotal}</td>`;
        }).join('');
        
        return `<tr>
                    <td><strong>${sub.name}</strong></td>
                    ${gradeCells}
                    <td class="fw-bold">${totalStudentsForSubject}</td>
                </tr>`;
    }).join('');
    
    const mainTableHtml = `
        <div class="ui-card mb-4">
            <h5 class="section-header">Grade Distribution Matrix for ${classObject.name}</h5>
            <div class="table-responsive">
                <table class="table table-bordered table-sm text-center">
                    <thead class="table-light">
                        <tr>
                            <th rowspan="2" class="align-middle">Subject</th>
                            ${gradeHeaders}
                            <th rowspan="2" class="align-middle">Total Students</th>
                        </tr>
                        <tr>
                            ${repeatedDivisionHeaders}
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        </div>
    `;

    // The reverse lookup tool HTML remains the same
    const subjectOptions = subjectsInClass.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const gradeOptions = gradeScale.map(g => `<option value="${g}">${g}</option>`).join('');
    const reverseLookupHtml = `
        <div class="ui-card">
            <h5 class="section-header">Find Students by Grade</h5>
            <div class="row g-3 align-items-end">
                <div class="col-md-5"><label class="form-label">Subject</label><select id="reverse-subject-select" class="form-select">${subjectOptions}</select></div>
                <div class="col-md-4"><label class="form-label">Grade</label><select id="reverse-grade-select" class="form-select">${gradeOptions}</select></div>
                <div class="col-md-3 d-grid"><button id="find-students-btn" class="btn btn-primary">Find Students</button></div>
            </div>
            <div id="reverse-lookup-results" class="mt-3"></div>
        </div>
    `;

    resultsContainer.innerHTML = mainTableHtml + reverseLookupHtml;

    // 4. Attach Event Listeners (no change here)
    resultsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('grade-count-cell')) {
            e.preventDefault();
            const { subjectId, grade, division } = e.target.dataset;
            showStudentsInModal(subjectId, grade, division, subjectGradeData);
        }
    });
    document.getElementById('find-students-btn').addEventListener('click', () => {
        const subjectId = document.getElementById('reverse-subject-select').value;
        const grade = document.getElementById('reverse-grade-select').value;
        const resultDiv = document.getElementById('reverse-lookup-results');
        
        let allStudentIds = [];
        divisions.forEach(div => {
            const studentIdsInDiv = subjectGradeData[subjectId]?.[grade]?.[div] || [];
            allStudentIds.push(...studentIdsInDiv);
        });

        if (allStudentIds.length === 0) {
            resultDiv.innerHTML = `<p class="text-muted">No students found with grade ${grade} in this subject.</p>`;
            return;
        }

        const studentList = [...new Set(allStudentIds)].map(id => students.find(s => s.id === id))
            .sort((a,b) => a.name.localeCompare(b.name));

        resultDiv.innerHTML = `<ul class="list-group">${studentList.map(s => `<li class="list-group-item">${s.name} (${s.admissionNumber}) - Div: ${s.division}</li>`).join('')}</ul>`;
    });
}
/**
 * Helper function to show a list of students in the modal popup.
 */
function showStudentsInModal(subjectId, grade, division, data) {
    const studentIds = data[subjectId]?.[grade]?.[division] || [];
    const subjectName = subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject';
    
    const modalTitle = document.getElementById('studentListModalLabel');
    const modalBody = document.getElementById('studentListModalBody');
    const modal = new bootstrap.Modal(document.getElementById('studentListModal'));

    modalTitle.textContent = `Students with grade '${grade}' in ${subjectName} (Div: ${division})`;

    if (studentIds.length === 0) {
        modalBody.innerHTML = '<p>No students found.</p>';
    } else {
        const studentList = studentIds.map(id => students.find(s => s.id === id))
            .sort((a,b) => a.name.localeCompare(b.name));
        modalBody.innerHTML = `
            <ul class="list-group">
                ${studentList.map(s => `<li class="list-group-item">${s.name} (${s.admissionNumber})</li>`).join('')}
            </ul>`;
    }

    modal.show();
}


/**
 * Prints the Failure Analysis report.
 */
function printFailureAnalysisReport() {
    const examName = document.getElementById('analysis-exam-select').selectedOptions[0].text;
    const subjectName = document.getElementById('analysis-subject-select').selectedOptions[0].text;
    printContentOfDiv('failure-analysis-printable', 'Failure_Analysis_Report', {
        customHeaderHtml: `
            <div class="text-center">
                <h3>Failure Analysis Report</h3>
                <p class="text-muted">Exam: ${examName} | Subject: ${subjectName}</p>
            </div>`,
        pageSize: 'A4 landscape'
    });
}

/**
 * Helper function to show a list of students in the new modal.
 */
function showStudentListInModal(title, studentIds) {
    const modalTitle = document.getElementById('studentListModalLabel');
    const modalBody = document.getElementById('studentListModalBody');
    const modal = new bootstrap.Modal(document.getElementById('studentListModal'));

    modalTitle.textContent = title;
    if (studentIds.length === 0) {
        modalBody.innerHTML = '<p>No students found.</p>';
    } else {
        const studentList = studentIds.map(id => students.find(s => s.id === id))
            .sort((a,b) => a.name.localeCompare(b.name));
        modalBody.innerHTML = `
            <ul class="list-group">
                ${studentList.map(s => `<li class="list-group-item">${s.name} (${s.admissionNumber}) - Div: ${s.division}</li>`).join('')}
            </ul>`;
    }
    modal.show();
}



/**
 * Renders the Chart.js bar chart for grade distribution.
 * @param {object} gradeCounts - Object with grade counts (e.g., {'A+': 10, 'B': 5}).
 * @param {Array<string>} gradeScale - Ordered list of grade labels.
 * @param {HTMLCanvasElement} canvas - The canvas element for the chart.
 */
function renderGradeDistributionChart(gradeCounts, gradeScale, canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (gradeDistributionChart) {
        gradeDistributionChart.destroy();
    }

    const labels = gradeScale;
    const data = gradeScale.map(grade => gradeCounts[grade] || 0);

    gradeDistributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Students',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    title: { display: true, text: 'Number of Students' }
                }
            },
            plugins: {
                title: { display: true, text: 'Grade Distribution' },
                legend: { display: false }
            }
        }
    });
}

function attachDataListenersnew(collectionsToWatch, main = false) {
    
    
    
    const collectionMap = {
        students: { setter: data => students = data, renderer: null },
        // ... rest of your collectionMap ...
    };

    collectionsToWatch.forEach(name => {
        const config = collectionMap[name];
        const unsub = onSnapshot(getCollectionRef(name), snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            //config.setter(data); // Updates global JS array
            updateGlobalDataAndCache(name, Object.values(data));
            
            if (config.renderer) {
                config.renderer();
            }
        });
        activeListeners[name] = unsub;
        if (collectionLoadPromises[name] && collectionLoadPromises[name].resolve) {
                collectionLoadPromises[name].resolve();
            }
    });
}
