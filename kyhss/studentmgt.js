let currentFilteredStudents = []; 
let currentPage = 1;
const studentsPerPage = 50;

window.renderStudentManagement = async () => {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    await window.waitForCollectionLoad('students');

    const isTeacher = currentUserRole === 'teacher';
    const teacherId = selectedUser.id;
    const teacherCharge = selectedUser?.classCharge || null;

    let classOptions = '';

    if (isTeacher) {
        // --- TEACHER FILTER LOGIC ---
        // 1. Get Class IDs from Subject Allocations
        const subjectClassIds = classroomSubjects
            .filter(cs => cs.teacherId === teacherId)
            .map(cs => cs.classId);

        // 2. Get Class ID from Class Charge (Mother Teacher)
        const chargeClassId = teacherCharge ? [teacherCharge.classId] : [];

        // 3. Combine and remove duplicates
        const allowedClassIds = [...new Set([...subjectClassIds, ...chargeClassId])];

        if (allowedClassIds.length > 0) {
            classOptions = classes
                .filter(c => allowedClassIds.includes(c.id))
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                .map(c => {
                    // Default select the "Class Charge" if it exists
                    const isDefault = teacherCharge && teacherCharge.classId === c.id ? 'selected' : '';
                    return `<option value="${c.id}" ${isDefault}>${c.name}</option>`;
                }).join('');
        } else {
            classOptions = '<option value="">No classes allocated</option>';
        }
    } else {
        // --- ADMIN VIEW (Show All) ---
        classOptions = '<option value="">-- All Classes --</option>' + 
            classes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                   .map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
const savedYear = localStorage.getItem('system_activeYear') || window.systemConfig.activeYear;
mainContent.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1 class="h3 mb-0 text-gray-800"><i class="fas fa-user-graduate me-2 text-primary"></i>Student Management</h1>
            <div class="d-flex gap-2">
                 <button id="export-students-btn" class="btn btn-sm btn-outline-success">
                    <i class="fas fa-file-excel me-1"></i> Export CSV
                </button>
                <button id="toggle-report-btn" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-chart-pie me-1"></i> Analytics
                </button>
            </div>
        </div>

        <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-white py-3">
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <h6 class="m-0 font-weight-bold text-primary">Filter & Search</h6>
                    </div>
                    <div class="col-md-6 text-end">
                        <div class="form-check form-switch d-inline-block me-3">
                            <input class="form-check-input" type="checkbox" id="show-inactive-toggle">
                            <label class="form-check-label small" for="show-inactive-toggle">Show TC Issued</label>
                        </div>
                        <div class="form-check form-switch d-inline-block">
                            <input class="form-check-input" type="checkbox" id="new-admissions-btn">
                            <label class="form-check-label small" for="new-admissions-btn">New Adm (${savedYear})</label>
                            <input type="hidden" id="newYear" value="${savedYear}">
                        </div>
                    </div>
                </div>
            </div>
            <div class="card-body bg-light-subtle">
                <div class="row g-3">
                    <div class="col-md-3">
                        <label class="form-label small fw-bold">Class</label>
                        <select id="filter-class" class="form-select form-select-sm">
                            ${classOptions}
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-bold">Division</label>
                        <select id="filter-division" class="form-select form-select-sm">
                            <option value="">-- All Divisions --</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label small fw-bold">Search</label>
                        <div class="input-group input-group-sm">
                            <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
                            <input type="text" id="student-search-input" class="form-control" placeholder="Name or Admn No...">
                        </div>
                    </div>
                    <div class="col-md-2 d-flex align-items-end">
                        <button id="reset-filters-btn" class="btn btn-sm btn-secondary w-100">Reset</button>
                    </div>
                </div>
            </div>
        </div>

        <div id="student-report-section" class="card border-left-primary shadow-sm mb-4 d-none animate__animated animate__fadeIn">
            <div class="card-body" id="admission-report-content"></div>
        </div>

        <div class="card shadow-sm border-0">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h6 class="m-0 font-weight-bold text-dark" id="student-list-title">Student Registry</h6>
                <div class="pagination-info small text-muted">
                    Showing <span id="pagination-start">0</span>-<span id="pagination-end">0</span> of <span id="pagination-total">0</span>
                </div>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="bg-light">
                            <tr class="small text-uppercase text-muted">
                                <th class="ps-4">Sl</th>
                                <th>Admn No</th>
                                <th>Student Name</th>
                                <th>Class & Div</th>
                                <th>Status</th>
                                <th class="text-end pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="student-list-tbody"></tbody>
                    </table>
                </div>
                <div id="no-students-message" class="text-center py-5 d-none">
                    <i class="fas fa-user-slash fa-3x text-light mb-3"></i>
                    <p class="text-muted">No students found matching current filters.</p>
                </div>
            </div>
            <div class="card-footer bg-white border-0 py-3">
                <div class="d-flex justify-content-center gap-2">
                    <button id="prev-page-btn" class="btn btn-sm btn-outline-primary px-4 shadow-sm" disabled>Previous</button>
                    <button id="next-page-btn" class="btn btn-sm btn-outline-primary px-4 shadow-sm" disabled>Next</button>
                </div>
            </div>
        </div>
    `;


    setupStudentListeners();
    updateFilterDivisions(true); 
};

function setupStudentListeners() {
    const isTeacher = currentUserRole === 'teacher';
    const teacherCharge = selectedUser?.classCharge || null;

    const els = {
        class: document.getElementById('filter-class'),
        div: document.getElementById('filter-division'),
        search: document.getElementById('student-search-input'),
        inactive: document.getElementById('show-inactive-toggle'),
        newAdm: document.getElementById('new-admissions-btn'),
        prev: document.getElementById('prev-page-btn'),
        next: document.getElementById('next-page-btn')
    };

    const updateView = () => {
        currentPage = 1;
        filterAndRenderStudents();
    };

    els.class.addEventListener('change', () => {
        updateFilterDivisions();
        updateView();
    });
    
    els.div.addEventListener('change', updateView);
    els.search.addEventListener('input', updateView);
    els.inactive.addEventListener('change', updateView);
    els.newAdm.addEventListener('change', updateView);

    els.prev.onclick = () => { if (currentPage > 1) { currentPage--; renderPaginatedStudents(); } };
    els.next.onclick = () => { currentPage++; renderPaginatedStudents(); };

    document.getElementById('reset-filters-btn').onclick = () => {
        if (!isTeacher) els.class.value = '';
        els.div.value = '';
        els.search.value = '';
        els.inactive.checked = false;
        els.newAdm.checked = false;
        updateView();
    };

    document.getElementById('toggle-report-btn').onclick = () => {
        document.getElementById('student-report-section').classList.toggle('d-none');
    };

    document.getElementById('export-students-btn').onclick = () => exportFilteredStudentsToCsv(currentFilteredStudents);
}

function updateFilterDivisions(isInitialLoad = false) {
    const classId = document.getElementById('filter-class').value;
    const divSelect = document.getElementById('filter-division');
    const isTeacher = currentUserRole === 'teacher';
    const teacherId = selectedUser.id;
    
    divSelect.innerHTML = '<option value="">-- All Divisions --</option>';
    
    if (classId) {
        let divisions = [];

        if (isTeacher) {
            // Find divisions allocated to this teacher in the selected class
            const subjectDivisions = classroomSubjects
                .filter(cs => cs.teacherId === teacherId && cs.classId === classId)
                .map(cs => cs.division);

            // Add the division they are in charge of (if same class)
            if (selectedUser.classCharge?.classId === classId) {
                subjectDivisions.push(selectedUser.classCharge.division);
            }

            divisions = [...new Set(subjectDivisions)].filter(Boolean).sort();
        } else {
            // Admin sees all divisions present in student data
            divisions = [...new Set(students.filter(s => s.classId === classId).map(s => s.division))].filter(Boolean).sort();
        }

        divisions.forEach(d => {
            divSelect.innerHTML += `<option value="${d}">${d}</option>`;
        });
        
        divSelect.disabled = false;

        // Auto-select Charge Division on load
        if (isInitialLoad && isTeacher && selectedUser.classCharge?.classId === classId) {
            divSelect.value = selectedUser.classCharge.division;
        }
    } else {
        divSelect.disabled = true;
    }
    
    currentPage = 1;
    filterAndRenderStudents();
}
const filterAndRenderStudents = () => {
    const showInactive = document.getElementById('show-inactive-toggle').checked;
    const filterClassId = document.getElementById('filter-class').value;
    const filterDivision = document.getElementById('filter-division').value;
    const searchTerm = document.getElementById('student-search-input').value.toLowerCase();
    const isNewAdmissions = document.getElementById('new-admissions-btn').checked;
    const currentYear = document.getElementById('newYear').value;

    // Filter Logic
    let filtered = students.filter(s => {
        // 1. Status Check
        const isCurrentlyInactive = (s.status === 'TC Issued' || s.status === 'Graduated');
        if (showInactive !== isCurrentlyInactive) return false;

        // 2. Class/Div Check
        if (filterClassId && s.classId !== filterClassId) return false;
        if (filterDivision && s.division !== filterDivision) return false;

        // 3. Search Term
        if (searchTerm) {
            const match = s.name?.toLowerCase().includes(searchTerm) || 
                          String(s.admissionNumber).includes(searchTerm);
            if (!match) return false;
        }

        // 4. New Admissions
        if (isNewAdmissions && s.academicYear !== currentYear) return false;

        return true;
    });

    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    currentFilteredStudents = filtered;
    
    renderPaginatedStudents();
    
    // Update Analytics if visible
    const reportContent = document.getElementById('admission-report-content');
    generateAdmissionReport(currentFilteredStudents, reportContent);
};

const renderPaginatedStudents = () => {
    const tbody = document.getElementById('student-list-tbody');
    const total = currentFilteredStudents.length;
    const startIndex = (currentPage - 1) * studentsPerPage;
    const displayList = currentFilteredStudents.slice(startIndex, startIndex + studentsPerPage);

    document.getElementById('pagination-total').textContent = total;
    document.getElementById('pagination-start').textContent = total > 0 ? startIndex + 1 : 0;
    document.getElementById('pagination-end').textContent = Math.min(startIndex + studentsPerPage, total);

    if (total === 0) {
        tbody.innerHTML = '';
        document.getElementById('no-students-message').classList.remove('d-none');
        return;
    }

    document.getElementById('no-students-message').classList.add('d-none');

    tbody.innerHTML = displayList.map((s, i) => {
        const cls = classes.find(c => c.id === s.classId);
        const statusBadge = s.status === 'TC Issued' ? 'bg-danger' : (s.status === 'Graduated' ? 'bg-secondary' : 'bg-success');
        
        return `
            <tr>
                <td class="ps-4 text-muted small">${startIndex + i + 1}</td>
                <td class="fw-bold text-dark">${s.admissionNumber || 'N/A'}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-xs me-2 bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center" style="width:30px; height:30px; font-size:11px;">
                            ${s.name?.charAt(0)}
                        </div>
                        <a href="javascript:void(0)" onclick="window.populateAndShowFullStudentModal('${s.id}')" class="text-decoration-none fw-bold text-primary">
                            ${s.name}
                        </a>
                    </div>
                </td>
                <td>${cls?.name || 'N/A'} - ${s.division || 'N/A'}</td>
                <td><span class="badge ${statusBadge} small" style="font-size:10px">${s.status || 'Active'}</span></td>
                <td class="text-end pe-4">
                    <div class="btn-group">
                        <button onclick="window.showAdmissionExtractModal('${s.id}')" class="btn btn-xs btn-outline-info" title="Form 3"><i class="fas fa-file-alt"></i></button>
                        ${currentUserRole === 'admin' ? `
                            <button onclick="window.handleEditStudent('${s.id}')" class="btn btn-xs btn-outline-primary" title="Edit"><i class="fas fa-user-edit"></i></button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
};

/**
 * Creates and downloads a CSV file from the filtered student data.
 * @param {Array<object>} students - The list of students to export.
 */
function exportFilteredStudentsToCsv(students) {
    if (!students || students.length === 0) {
        alert('No students to export.');
        return;
    }

    const headers = ["ID", "Admission Number", "Name", "Class", "Division", "Gender", "Admission Date"];
    const csvRows = [headers.join(',')];

    students.forEach(student => {
        const classInfo = classes.find(c => c.id === student.classId);
        const className = classInfo ? classInfo.name : 'N/A';

        const row = [
            `"${student.id || ''}"`,
            `"${student.admissionNumber || ''}"`,
            `"${student.name || ''}"`,
            `"${className}"`,
            `"${student.division || ''}"`,
            `"${student.gender || ''}"`,
            `"${student.admissionDate || ''}"`
        ];
        csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const date = new Date().toISOString().slice(0, 10);
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `student_list_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert(`Successfully exported ${students.length} students to CSV.`);
}

/**
 * Displays the Admission Extract (FORM 3) for a specific student in a modal.
 * @param {string} studentId - The ID of the student.
 */
window.showAdmissionExtractModal = (studentId) => {
    // 1. Find Student
    const student = students.find(s => s.id === studentId);
    if (!student) {
        showAlert('Student details not found.', 'danger');
        return;
    }

    // 2. Get Modal Elements
    const modalBody = document.getElementById('admission-extract-modal-body');
    const modalTitle = document.getElementById('admissionExtractModalLabel');

    // 3. Safety Check: Stop if HTML is missing
    if (!modalBody || !modalTitle) {
        console.error("ERROR: Modal HTML elements not found. Please paste the 'admissionExtractModal' HTML code into your body.");
        showAlert("System Error: Modal HTML is missing.", "danger");
        return;
    }

    // 4. Inject Content
    modalBody.innerHTML = generateAdmissionExtractHTML(student);
    modalTitle.textContent = `Admission Extract (FORM 3) - ${student.name}`;

    // 5. Show Modal
    const admissionExtractModal = new bootstrap.Modal(document.getElementById('admissionExtractModal'));
    admissionExtractModal.show();

    // 6. Attach Print Listener
    const printBtn = document.getElementById('print-admission-extract-btn');
    if (printBtn) {
        printBtn.onclick = () => {
            printContentOfDiv('admission-extract-modal-body', `Admission Extract - ${student.name}`, {
                pageSize: 'A4 portrait',
                pageMargins: '5mm',
                extraCss: `
                    .admission-extract-content { font-family: 'Times New Roman', serif; color: #000; }
                    table, th, td { border: 1px solid #000 !important; border-collapse: collapse; }
                    td, th { padding: 3px; }
                    img { border: 1px solid #000; }
                    @page { margin: 5mm; }
                `
            });
        };
    }
};

// Helper to format date into "DD/MM/YYYY"
window.formatSlashDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        // Ensure date is valid after parsing
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
    } catch (e) {
        console.error("Error formatting date:", dateStr, e);
        return 'N/A';
    }
};

// Helper to convert number to words for dates (simplified version)
const numberToWords = (num) => {
    const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if (num === 0) return 'zero';
    if (num < 10) return units[num];
    if (num >= 10 && num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? '-' + units[num % 10] : '');
    // For numbers > 99, this simple function will return the number as a string.
    // For full number to words (hundreds, thousands), you'd need a more extensive function.
    return String(num);
};

// Helper to convert date to words (DD Month YYYY)
const dateToWords = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'N/A';
        const day = d.getDate();
        const month = d.toLocaleString('default', { month: 'long' });
        const year = d.getFullYear();
        return `${numberToWords(day).replace('-', ' ')} ${month} ${numberToWords(year).replace('-', ' ')}`;
    } catch (e) {
        console.error("Error converting date to words:", dateStr, e);
        return 'N/A';
    }
};


/**
 * Calculates age in years and completed months based on a specific date (June 1st of admission year).
 * @param {string} dobString - Student's Date of Birth (YYYY-MM-DD format).
 * @param {string} admissionDateString - Student's Admission Date (YYYY-MM-DD format).
 * @returns {string} Age in "X Years, Y Months" format.
 */
const calculateAgeForAdmission = (dobString, admissionDateString) => {
    if (!dobString || !admissionDateString) return 'N/A';
    try {
        const dob = new Date(dobString);
        const admissionYear =  admissionDateString.split('-')[0] || new Date(admissionDateString).getFullYear();
        const calculationDate = new Date(admissionYear, 5, 1); // June 1st of Admission Year

        if (isNaN(dob.getTime()) || isNaN(calculationDate.getTime())) return 'N/A';

        let ageYears = calculationDate.getFullYear() - dob.getFullYear();
        let ageMonths = calculationDate.getMonth() - dob.getMonth();

        if (calculationDate.getDate() < dob.getDate()) {
            ageMonths--; // Subtract a month if not yet past the DOB day in the calculation month
        }

        if (ageMonths < 0) {
            ageYears--;
            ageMonths += 12; // Adjust to positive months
        }

        return `${ageYears} Years, ${ageMonths} Months`;
    } catch (e) {
        console.error("Error calculating age for admission:", dobString, admissionDateString, e);
        return 'N/A';
    }
};


/**
 * Generates the HTML for the Admission Extract (FORM 3).
 * @param {object} student - The student data object.
 * @returns {string} The full HTML content for the admission extract.
 */
function generateAdmissionExtractHTML(student) {
    console.log(student);
    const schoolName = schoolDetails.fullname || 'KATTILANGADI YATHEEMKHANA HIGHER SECONDARY SCHOOL';
    const schoolAddressLine = 'ATHAVANAD-19094';

    // Prepare data for the template using new helper functions
    const formattedDob = formatSlashDate(student.dob);
    const wordsDob = dateToWords(student.dob);
    const calculatedAge = calculateAgeForAdmission(student.dob, student.admittedYear||student.admissionDate); // Use admissionDate for age calculation base
    
    const studentAdmittedClass = classes.find(c => c.id === student.classId)?.name || student.classId;
    const studentPhotoSrc = student.photoDriveId
        ? `https://drive.google.com/thumbnail?id=${student.photoDriveId}&sz=400`
        : 'https://placehold.co/100x150?text=Student+Photo';

    const childGenderPronoun = student.guardianType === 'Local Guardian' ? '_____________': (student.gender === 'M' ? 'son' : (student.gender === 'F' ? 'daughter' : 'child'));
    const displayGuardian = student.guardianType === 'Local Guardian' ? student.localGuardianName : (student.guardianType === 'Father'?student.fatherName:student.motherName);
    const displayRelation = student.guardianType === 'Local Guardian' ? student.localGuardianRelation : (student.guardianType || '');
    const localGuardianAddress = (student.localGuardianName && student.localGuardianAddress) ? `${student.localGuardianName}, ${student.localGuardianAddress}` : '';




    return `
        <div class="admission-extract-content" style="font-family: Arial, sans-serif; font-size: 0.9em; line-height: 1.3;">
            <div style="text-align: center; margin-bottom: 3px;">
                <h6 style="margin: 0;">FORM 3</h6>
                <p style="margin: 0; font-size: 0.8em;">(See rule VI-I (1))</p>
                <h4 style="margin: 2px 0 2px 0;">${schoolName}</h4>
                <h5 style="margin: 0; font-size: 1.1em;">APPLICATION FOR ADMISSION</h5>
            </div>
            
            <p style="margin-top: 0; margin-bottom: 5px;">FORM NO: <span style="font-weight: bold; color: red;"> ${student.id || 'N/A'} _ ${student.admissionNumber || 'N/A'}</span></p>
            
            <table style="margin-top:5px; border: 1px solid #000;">
                <tr>
                    <td style="width: 35%;">Name of Pupil with Initials:</td>
                    <th colspan="4" style="text-align: center; font-weight: bold;">${student.name || 'N/A'}</th>
                </tr>
                <tr>
                    <td>Name of Parent or Guardian and Relationship to the Pupil:</td>
                    <th colspan="3" style="height: 30px;">${student.fatherName || 'N/A'} / ${student.motherName || 'N/A'}</th>
                    <td rowspan="4" class="photo-cell" style="width: 120px; text-align: center; border-left: 1px solid #000;">
                        <img src="${studentPhotoSrc}" alt="Student Photo" style="width: 100px; height: 150px; object-fit: cover; display: block; margin: 0 auto;">
                    </td>
                </tr>
                <tr>
                    <td>Local Guardian Name & Relationship:</td>
                    <th colspan="3">${displayGuardian || 'N/A'} / ${displayRelation || 'N/A'}</th>
                </tr>
                <tr>
                    <td>Mark of Identification:</td>
                    <th colspan="3">${student.identification || ''}</th>
                </tr>
                <tr>
                    <td>Occupation and Address of Parent or Guardian:</td>
                    <th colspan="3">${student.occupation || ''}<br>${student.houseName || 'N/A'} (H), ${student.postOffice || 'N/A'} (PO), ${student.place || 'N/A'} PIN:${student.pin || 'N/A'}</th>
                </tr>
                <tr>
                    <th>Aadhar Number:<br><span style="font-size: larger; font-weight: bold;">${student.aadhaar || 'N/A'}</span></th>
                    <th colspan="2">Mobile No 1 : ${student.mobile1 || 'N/A'}</th>
                    <th colspan="2">Mobile No 2 : ${student.mobile2 || 'N/A'}</th>
                </tr>
                <tr>
                    <td rowspan="2">Name, Address, and Occupation of Local Guardian:</td>
                    <th colspan="4">${student.localGuardianName || ''}<br>${localGuardianAddress || ''}</th>
                </tr>
                <tr>
                    <th colspan="2">MobileNo: ${student.guardianNumber || ''}</th>
                    <th colspan="2">WhatsApp No: ${student.whatsappNo || ''}</th>
                </tr>
                <tr>
                    <td rowspan="2" colspan="1" style="text-align: center;">School Previously Attended:</td>
                    <td>Name of School</td>
                    <td>Standard:</td>
                    <td>Admission No:</td>
                    <td>TC Date:</td>
                </tr>
                <tr>
                    <th>${student.preSchool || ''}</th>
                    <th>${student.preClass || ''}</th>
                    <th>${student.preAdnumber || ''}</th>
                    <th>${formatSlashDate(student.tcDate)||"-"}</th>
                </tr>
                <tr>
                    <td rowspan="2" colspan="2">(a) Date of Birth (in figures and words )<br>(b) Whether certified extract from Registered of birth declaration form / the declaration from the Parent or Guardian / certificate from the Registered medical Practitioner has been produced (Vide Rule VI-I) or aadhar</td>
                    <th colspan="3" style="text-align: center; font-weight: bold;">${formattedDob}</th>
                </tr>
                <tr>
                    <th colspan="3" style="text-align: center; font-weight: bold;">${wordsDob}</th>
                </tr>
                <tr>
                    <td colspan="2">Age ( year and completed month given) :</td>
                    <th colspan="3"><span style="font-weight: bold;">${calculatedAge}</span> OLD</th>
                </tr>
                <tr>
                    <td>Religion / Caste:</td>
                    <th>${student.religion || 'ISLAM MAPPILA'}</th>
                    <th colspan="2">Nationality and State to which the pupil belongs</th>
                    <th>${student.nationality || 'INDIAN'}</th>
                </tr>
                <tr>
                    <th>Does the candidate belong ' SC/ST/OBC':</th>
                    <th>${student.casteCategory || 'OBC'}</th>
                    <th colspan="2">Standard to which admission is sought (in letter and words)</th>
                    <th>${studentAdmittedClass || 'N/A'}</th>
                </tr>
                <tr>
                    <th>The language in which the pupil desires to be instructed:</th>
                    <th>${student.instructionMedium==='1'?'ENGLISH':'MALAYALAM' || 'ENGLISH'}</th>
                    <td colspan="2">Mother Tongue of the pupil:</td>
                    <th>${student.motherTongue || 'MALAYALAM'}</th>
                </tr>
                <tr>
                    <td colspan="2">No. and date of transfer certificate produced on admission.:</td>
                    <th colspan="3">${student.tcNumber || ''}</th>
                </tr>
                <tr>
                    <td colspan="2">Whether immunized from Tetanus, Diphtheria, Measles polio and B.C.G</td>
                    <th colspan="3">${student.immunized || 'NO'}</th>
                </tr>
                <tr>
                    <td colspan="2"> First language </td>
                    <th colspan="3">${student.firstLanguage || 'ARABIC'}</th>
                </tr>
                <tr>
                    <td rowspan="2" colspan="1" style="text-align: center;">School Vehicle Needed:</td>
                    <th colspan="1" style="text-align: center;">Vehicle Need</th>
                    <th colspan="2" style="text-align: center;"> Pickup Point: </th>
                    <th style="text-align: center;"> Stage:</th>
                </tr>
                <tr>
                    <td colspan="1" style="text-align: center;">${student.vehicleNeed? "Yes" : "No"}</td>
                    <td colspan="2" style="text-align: center;">${student.busPoint || ''}</td>
                    <td style="text-align: center;">${student.vehicleStage || ''}</td>
                </tr>
                <tr>
                    <td>If siblings or relatives in any class,:</td>
                    <th colspan="1" style="text-align: center;">${student.hasSibling ? "Yes" : "No"}</th>
                    <th colspan="3">${student.siblingDetails || student.siblingWhatsAppNumber || ''}</th>
                </tr>
            </table>

            <p style="margin-top: 20px; margin-bottom: 5px;">I have read the school rules and undertake that my ward will abide by them. I declare the above details are correct to the best of my knowledge.</p>
            <h6 style="text-align: center; margin: 10px 0 5px 0;text-decoration: underline;">Age Declaration</h6>
            <p>I <b style="text-decoration: underline;"> ${student.guardianType === 'Local Guardian' ? student.localGuardianName :student.guardian || student.motherName || 'N/A'} </b> do here declare the date of birth of my <b style="text-decoration: underline;"> ${childGenderPronoun} </b> ${student.name || 'N/A'} is <b style="text-decoration: underline;"> ${formattedDob} </b> in words <b style="text-decoration: underline;">${wordsDob}</b> and that I shall not ask in future for any change in the same.</p>
            
            <div style="text-align: left; margin-top: 20px; display: flex; justify-content: space-between;">
                <p>Place: KATTILANGADI</p>
                <p>Signature of Parent or Guardian: <span style="display: inline-block; width: 150px; border-bottom: 1px solid #000; height: 1em;"></span></p>
            </div>
            <p style="margin-top: 5px;">Date: ${formatSlashDate(student.admissionDate)}</p>
            
            <div style="margin-top: 20px;">
                <h6 style="margin: 0; text-align:center;text-decoration: underline;">To be filled in by the Vice Principal:</h6>
                <p style="text-align: center; display: flex; justify-content: space-between; align-items: flex-end; margin-top: 15px;">
                    <span>Date of Admission: <span style="display: inline-block; width: 100px; border-bottom: 1px solid #000; height: 1em;"></span></span>
                     <span>Standard to which admitted: <span style="display: inline-block; width: 100px; border-bottom: 1px solid #000; height: 1em;"></span></span>
                    </p>
                     <pstyle="text-align: center; display: flex; justify-content: space-between; align-items: flex-end;">
                       <span style="font-size:1.1em;"><b>Admission No: <b style="text-decoration: underline;"> ${student.admissionNumber || 'N/A'}</b></b></span>
                       <span style="text-align: right; margin-top: 30px;">Signature of Vice Principal: <span style="display: inline-block; width: 150px; border-bottom: 1px solid #000; height: 1em;"></span></span>
            
                        </p>
                </div>
        </div>
    `;
}

/**
 * Generates and displays a detailed admission report based on a given list of students.
 * The report provides a class-wise breakdown including gender counts and totals.
 * @param {Array<object>} studentsToReport - The list of students to generate the report for.
 * @param {HTMLElement} container - The DOM element to render the report into.
 */
function generateAdmissionReport(studentsToReport, container) {
    if (!container) {
        console.error('Report container not found!');
        return;
    }

    // --- Data Aggregation ---
    const reportData = {};
    let grandTotalMales = 0;
    let grandTotalFemales = 0;
    let grandOverallTotal = 0;

    studentsToReport.forEach(s => {
        const classId = s.classId || 'Unassigned';
        const division = s.division || 'Unassigned';
        const classKey = `${classId}$${division}`;

        if (!reportData[classKey]) {
            const classObj = classes.find(c => c.id === classId);
            reportData[classKey] = {
                className: classObj?.name || 'N/A',
                divisionName: division,
                males: 0,
                females: 0,
                total: 0
            };
        }

        if (s.gender === 'M') {
            reportData[classKey].males++;
            grandTotalMales++;
        } else if (s.gender === 'F') {
            reportData[classKey].females++;
            grandTotalFemales++;
        }
        reportData[classKey].total++;
        grandOverallTotal++;
    });

    // Sort report data keys by class name, then division for consistent presentation
    const sortedClassKeys = Object.keys(reportData).sort((a, b) => {
        const [classA, divA] = a.split('$');
        const [classB, divB] = b.split('$');
        const classNameA = classes.find(c => c.id === classA)?.name || '';
        const classNameB = classes.find(c => c.id === classB)?.name || '';

        if (classNameA === classNameB) {
            return divA.localeCompare(divB);
        }
        return classNameA.localeCompare(classNameB);
    });

    // --- Report HTML Generation ---
    let reportHtml = `
        <h5 class="fw-bold text-secondary mb-3">Class-wise Admission Breakdown</h5>
        <div class="table-responsive">
            <table class="table table-bordered table-striped table-sm">
                <thead class="table-light">
                    <tr>
                        <th>Class (Division)</th>
                        <th class="text-center">Males</th>
                        <th class="text-center">Females</th>
                        <th class="text-center">Total</th>
                    </tr>
                </thead>
                <tbody>`;

    if (sortedClassKeys.length === 0) {
        reportHtml += `<tr><td colspan="4" class="text-center text-muted">No data available for this report.</td></tr>`;
    } else {
        sortedClassKeys.forEach(key => {
            const data = reportData[key];
            const [classId, division] = key.split('$'); // Extract classId and division for data attributes

            reportHtml += `
                <tr>
                    <td>${data.className} (${data.divisionName})</td>
                    <td class="text-center clickable-count" data-class-id="${classId}" data-division="${division}" data-gender="M" title="Click to view male students">${data.males}</td>
                    <td class="text-center clickable-count" data-class-id="${classId}" data-division="${division}" data-gender="F" title="Click to view female students">${data.females}</td>
                    <td class="text-center clickable-count" data-class-id="${classId}" data-division="${division}" data-gender="all" title="Click to view all students in this class">${data.total}</td>
                </tr>`;
        });
    }

    // --- Grand Totals Row ---
    reportHtml += `
                </tbody>
                <tfoot class="table-primary fw-bold">
                    <tr>
                        <td>Grand Total</td>
                        <td class="text-center clickable-count" data-class-id="" data-division="" data-gender="M" title="Click to view all male students">${grandTotalMales}</td>
                        <td class="text-center clickable-count" data-class-id="" data-division="" data-gender="F" title="Click to view all female students">${grandTotalFemales}</td>
                        <td class="text-center clickable-count" data-class-id="" data-division="" data-gender="all" title="Click to view all students">${grandOverallTotal}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <p class="text-muted small mt-3">Report based on currently filtered students.</p>
    `;

    container.innerHTML = reportHtml;

    // Attach event listener for the clickable counts
    container.querySelectorAll('.clickable-count').forEach(cell => {
        cell.addEventListener('click', (event) => {
            const clickedCell = event.currentTarget;
            const classId = clickedCell.dataset.classId;
            const division = clickedCell.dataset.division;
            const gender = clickedCell.dataset.gender;

            // Trigger the main student list filtering
            applyReportFiltersToMainList(classId, division, gender);
        });
    });
}


/**
 * Applies filters from the Admission Report to the main Student List UI.
 * @param {string} classId - The class ID to filter by (or empty string for all).
 * @param {string} division - The division to filter by (or empty string for all).
 * @param {string} gender - The gender to filter by ('M', 'F', or 'all').
 */
function applyReportFiltersToMainList(classId, division, gender) {
    console.log('reportfilter mainlist');
    console.log(classId,division,gender);
    const filterClassDropdown = document.getElementById('filter-class');
    const filterDivisionDropdown = document.getElementById('filter-division');
    const studentSearchInput = document.getElementById('student-search-input');
    const newAdmissionsBtn = document.getElementById('new-admissions-btn'); // Assuming you want to reset this

    if (!filterClassDropdown || !filterDivisionDropdown || !studentSearchInput || !newAdmissionsBtn) {
        console.error("applyReportFiltersToMainList: Required DOM elements not found. Skipping filter application.");
        return;
    }

    // Reset other filters
    studentSearchInput.value = '';
    // newAdmissionsBtn.classList.remove('btn-info'); // Deactivate "New Admissions" filter visually if active
    // You might want to toggle this programmatically if it's just a visual state.
    // For now, let filterAndRenderStudents handle the actual filtering based on button's class.

    // Set class filter
    filterClassDropdown.value = classId;

    // Trigger change event on class filter to update division dropdown options
    // This is important because the division dropdown's options depend on the selected class.
    const event = new Event('change');
    filterClassDropdown.dispatchEvent(event);

    // After a small delay (to allow division options to populate), set division and trigger render
    setTimeout(() => {
        filterDivisionDropdown.value = division;
        // Call filterAndRenderStudents with the new gender parameter
        // This will trigger the final re-render of the student list.
       // filterAndRenderStudents(gender);
    }, 50); // Small delay to ensure division dropdown is populated
}

/**
 * Populates the full student detail modal with comprehensive information and shows it.
 * @param {string} studentId - The ID of the student whose details to display.
 */


window.populateAndShowFullStudentModal = function(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) {
        showAlert('Student details not found.', 'danger');
        return;
    }

    const modalEl = document.getElementById('fullStudentDetailModal');
    const modalBody = document.getElementById('fullStudentDetailModalBody');
    const modalTitle = document.getElementById('fullStudentDetailModalLabel');
    const modalFooter = modalEl.querySelector('.modal-footer');
    
    // 1. Data Preparation
    const className = classes.find(c => c.id === student.classId)?.name || 'N/A';
    const dobFormatted = student.dob ? new Date(student.dob).toLocaleDateString('en-GB') : 'N/A';
    const admissionDateFormatted = student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-GB') : 'N/A';
    const studentPhotoSrc = student.photoDriveId 
        ? `https://drive.google.com/thumbnail?id=${student.photoDriveId}&sz=400` 
        : 'https://placehold.co/150x200?text=No+Photo';

    // 2. Status Badge Logic
    const studentStatus = student.status || 'Active';
    let statusClass = 'bg-success';
    if (studentStatus === 'TC Issued') statusClass = 'bg-danger';
    if (studentStatus === 'Graduated') statusClass = 'bg-secondary';
    
    const statusBadge = `<span class="badge ${statusClass} ms-2">${studentStatus}</span>`;

    // 3. Render Modal Body content
    modalBody.innerHTML = `
        <div id="student-details-printable">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <h4 class="fw-bold text-primary">Student Profile</h4>
                ${statusBadge}
            </div>
            
            <div class="row mb-4 align-items-center">
                <div class="col-md-3 text-center">
                    <img src="${studentPhotoSrc}" alt="Student Photo" 
                         class="img-thumbnail rounded-3 shadow-sm mb-2" 
                         style="width: 150px; height: 200px; object-fit: cover; border: 2px solid #ddd;">
                    <p class="small text-muted mb-0">Admn No: <strong>${student.admissionNumber || 'N/A'}</strong></p>
                </div>
                <div class="col-md-9">
                    <h4 class="fw-bold text-primary mb-1">${student.name || 'N/A'}</h4>
                    <p class="text-muted mb-1"><strong>Class:</strong> ${className} - ${student.division || 'N/A'}</p>
                    <p class="text-muted mb-1"><strong>Gender:</strong> ${student.gender === "M" ? "Male" : "Female"}</p>
                    <p class="text-muted mb-1"><strong>Date of Birth:</strong> ${dobFormatted}</p>
                    <p class="text-muted mb-1"><strong>Mobile:</strong> ${student.mobile1 || 'N/A'}</p>
                </div>
            </div>

            <h5 class="fw-bold text-info border-bottom pb-2 mb-3"><i class="fas fa-university me-2"></i>Academic Details</h5>
            <div class="row mb-3 gx-3 gy-2 small">
                <div class="col-md-4"><strong>Admission Date:</strong> ${admissionDateFormatted}</div>
                <div class="col-md-4"><strong>Admission Sector:</strong> ${student.admissionSector || 'N/A'}</div>
                <div class="col-md-4"><strong>Medium:</strong> ${student.instructionMedium == 1 ? 'ENGLISH' : 'MALAYALAM'}</div>
                <div class="col-md-4"><strong>APL/BPL:</strong> ${student.aplBpl || 'N/A'}</div>
                <div class="col-md-4"><strong>Bus Point:</strong> ${student.busPoint || 'N/A'}</div>
                <div class="col-md-4"><strong>Vehicle Stage:</strong> ${student.vehicleStage || 'N/A'}</div>
            </div>

            <h5 class="fw-bold text-info border-bottom pb-2 mb-3"><i class="fas fa-users me-2"></i>Sibling Information</h5>
            <div class="row mb-3 gx-3 gy-2 small">
                ${student.hasSibling ? `
                    <div class="col-md-6"><strong>Has Sibling:</strong> Yes</div>
                    <div class="col-md-6"><strong>Sibling WhatsApp:</strong> ${student.siblingWhatsAppNumber || 'N/A'}</div>
                    <div class="col-md-12"><strong>Details:</strong> ${student.siblingDetailsDisplay || 'N/A'}</div>
                ` : `<div class="col-12 text-muted">No siblings recorded in this school.</div>`}
            </div>

            <h5 class="fw-bold text-info border-bottom pb-2 mb-3"><i class="fas fa-address-book me-2"></i>Contact & Address</h5>
            <div class="row mb-3 gx-3 gy-2 small">
                <div class="col-md-6"><strong>Father's Name:</strong> ${student.fatherName || 'N/A'}</div>
                <div class="col-md-6"><strong>Mother's Name:</strong> ${student.motherName || 'N/A'}</div>
                <div class="col-md-4"><strong>Mobile 1:</strong> ${student.mobile1 || 'N/A'}</div>
                <div class="col-md-4"><strong>Mobile 2:</strong> ${student.mobile2 || 'N/A'}</div>
                <div class="col-md-4"><strong>WhatsApp:</strong> ${student.whatsappNo || 'N/A'}</div>
            </div>
            
            <div class="bg-light p-3 rounded">
                <h6 class="fw-bold text-secondary mb-2">Current Address:</h6>
                <div class="row gx-3 gy-2 small">
                    <div class="col-md-6"><strong>House:</strong> ${student.houseName || 'N/A'}</div>
                    <div class="col-md-6"><strong>Place:</strong> ${student.place || 'N/A'}</div>
                    <div class="col-md-4"><strong>PO:</strong> ${student.postOffice || 'N/A'}</div>
                    <div class="col-md-4"><strong>PIN:</strong> ${student.pin || 'N/A'}</div>
                    <div class="col-md-4"><strong>Taluk:</strong> ${student.taluk || 'N/A'}</div>
                    <div class="col-md-4"><strong>District:</strong> ${student.district || 'N/A'}</div>
                    <div class="col-md-4"><strong>State:</strong> ${student.state || 'N/A'}</div>
                </div>
            </div>
        </div>
    `;

    // 4. Footer Button Management
    // Remove old dynamic buttons
    const oldIssueBtn = document.getElementById('issue-tc-btn');
    const oldViewTcBtn = document.getElementById('view-tc-btn');
    if (oldIssueBtn) oldIssueBtn.remove();
    if (oldViewTcBtn) oldViewTcBtn.remove();

    // Role and Status Based Button Injection
    if (currentUserRole === 'admin') {
        if (studentStatus === 'Active') {
            modalFooter.insertAdjacentHTML('afterbegin', `
                <button type="button" class="btn btn-warning me-auto" id="issue-tc-btn" onclick="window.checkStudentLiabilities('${student.id}')">
                    <i class="fas fa-stamp me-2"></i>Issue TC
                </button>`);
        } else {
            modalFooter.insertAdjacentHTML('afterbegin', `
                <button type="button" class="btn btn-info me-auto" id="view-tc-btn" onclick="window.showExistingTC('${student.id}')">
                    <i class="fas fa-print me-2"></i>View Issued TC
                </button>`);
        }
    }

    // Toggle Print/Extract visibility for non-admins
    const printBtn = document.getElementById('print-student-details-btn');
    const extractBtn = document.getElementById('print-student-extract-btn');
    
    if (currentUserRole !== 'admin') {
        printBtn.classList.add('d-none');
        extractBtn.classList.add('d-none');
    } else {
        printBtn.classList.remove('d-none');
        extractBtn.classList.remove('d-none');
        
        // Attach Fresh Listeners
        printBtn.onclick = () => printContentOfDiv('student-details-printable', `Profile_${student.name}`);
        extractBtn.onclick = () => window.showAdmissionExtractModal(student.id);
    }

    modalTitle.textContent = `Student Details: ${student.name}`;
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
};



        window.handleEditStudent = (id) => { studentToEdit = students.find(s => s.id === id); if(studentToEdit) navigateTo('add-student'); };


        /**
 * Gathers all outstanding dues for a student and displays them in a modal.
 * @param {string} studentId The ID of the student to check.
 */

 /**
 * Displays the previously issued Transfer Certificate for a student.
 * @param {string} studentId The ID of the student.
 */
window.showExistingTC = (studentId) => {
    const student = window.students.find(s => s.id === studentId);
    if (!student) {
        showAlert('Student data not found.', 'danger');
        return;
    }

    // 1. Generate the HTML for the Transfer Certificate
    const tcHtml = generateTCHTML(studentId);
    
    // 2. Get the TC modal elements
    const tcModalEl = document.getElementById('tcPrintModal');
    const tcModalBody = document.getElementById('tc-modal-body');
    const printTcBtn = document.getElementById('print-final-tc-btn');

    // 3. Populate and show the modal
    tcModalBody.innerHTML = tcHtml;
    printTcBtn.onclick = () => {
         printContentOfDiv('tc-modal-body', `TC_${student.name}`, { pageSize: 'A4 portrait' });
    };
    
    const tcModal = bootstrap.Modal.getOrCreateInstance(tcModalEl);
    tcModal.show();
};

window.checkStudentLiabilities = (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return showAlert('Student not found!', 'danger');

    const liabilities = [];

    // --- 1. Check for Fee Dues ---
    const setup = studentFeeSetups.find(sfs => sfs.id === student.id);
    const payments = receipts.filter(r => r.studentId === student.id && !r.isCancelled);
    const totalPaid = payments.reduce((sum, p) => sum + p.totalAmount, 0);
    const balance = setup ? (setup.totalPayable - totalPaid) : 0;

    if (balance > 0) {
        liabilities.push(`<strong>Fee Balance:</strong> An amount of ₹${balance.toFixed(2)} is outstanding.`);
    }

    // --- 2. Check for Library Dues ---
    const unreturnedBooks = bookIssuances.filter(item => item.studentId === student.id && item.status === 'Issued');
    if (unreturnedBooks.length > 0) {
        unreturnedBooks.forEach(book => {
            liabilities.push(`<strong>Unreturned Book:</strong> "${book.bookTitle}" (Due: ${new Date(book.dueDate).toLocaleDateString('en-GB')})`);
        });
    }

    // --- 3. (Future) Add checks for other liabilities here ---
    // e.g., lab equipment, sports fees, etc.

    // --- 4. Display the results in the modal ---
    showLiabilitiesModal(student, liabilities);
};

/**
 * Populates and shows the liability check modal.
 * @param {object} student The student object.
 * @param {Array<string>} liabilities An array of liability description strings.
 */
function showLiabilitiesModal(student, liabilities) {
    const modalBody = document.getElementById('liability-check-modal-body');
    const modalFooter = document.getElementById('liability-check-modal-footer');
    
    if (liabilities.length > 0) {
        // If there are dues, show them in a list
        modalBody.innerHTML = `
            <div class="alert alert-danger">
                <h6 class="alert-heading">Dues Pending!</h6>
                <p>The Transfer Certificate cannot be issued until the following liabilities are cleared:</p>
                <hr>
                <ul class="mb-0">
                    ${liabilities.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        `;
        modalFooter.innerHTML = `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>`;
    } else {
        // If everything is clear, show a success message and the "Proceed" button
        modalBody.innerHTML = `
            <div class="alert alert-success">
                <h6 class="alert-heading"><i class="fas fa-check-circle me-2"></i>All Clear!</h6>
                <p class="mb-0">No outstanding liabilities found for ${student.name}. You can proceed with issuing the Transfer Certificate.</p>
            </div>
        `;
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-success" onclick="issueTransferCertificate('${student.id}')">
                Proceed to Issue TC
            </button>
        `;
    }
    
    const liabilityModal = new bootstrap.Modal(document.getElementById('liabilityCheckModal'));
    liabilityModal.show();
}

/**
 * Final step for TC issuance. Updates student status and generates the printable TC.
 * @param {string} studentId The ID of the student.
 */
window.issueTransferCertificate = async (studentId) => {
    try {
        const studentRef = getDocRef('students', studentId);
        // First, update the student's status in the database
        await updateDoc(studentRef, {
            status: 'TC Issued',
            lastUpdated : serverTimestamp(), 
            lastDay: new Date().toISOString().slice(0, 10) // Record the date of TC issuance
        });
        
        showAlert('Student status updated to "TC Issued". Generating certificate...', 'success');
        
        // --- NEW LOGIC ---
        // 1. Generate the HTML for the Transfer Certificate
        const tcHtml = generateTCHTML(studentId);
        
        // 2. Get the new TC modal elements
        const tcModalEl = document.getElementById('tcPrintModal');
        const tcModalBody = document.getElementById('tc-modal-body');
        const printTcBtn = document.getElementById('print-final-tc-btn');

        // 3. Populate and show the modal
        tcModalBody.innerHTML = tcHtml;
        const student = students.find(s => s.id === studentId);
        printTcBtn.onclick = () => {
             printContentOfDiv('tc-modal-body', `TC_${student.name}`, { pageSize: 'A4 portrait' });
        };
        
        const tcModal = new bootstrap.Modal(tcModalEl);
        tcModal.show();
        
        // 4. Hide the previous modals
        bootstrap.Modal.getInstance(document.getElementById('liabilityCheckModal'))?.hide();
        bootstrap.Modal.getInstance(document.getElementById('fullStudentDetailModal'))?.hide();

    } catch (error) {
        console.error("Error issuing TC:", error);
        showAlert('Could not issue TC. An error occurred.', 'danger');
    }
}

/**
 * Generates the full HTML for a professional Transfer Certificate.
 * @param {string} studentId The ID of the student.
 * @returns {string} The complete HTML content for the TC.
 */
function generateTCHTML(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return `<div class="alert alert-danger">Student data not found.</div>`;

    const schoolName = schoolDetails.fullname || 'KATTILANGADI YATHEEMKHANA HIGHER SECONDARY SCHOOL';
    const schoolAddress = schoolDetails.name || 'ATHAVANAD, TIRUR';
    const schoolAffiliation = schoolDetails.affiliation || 'GOVT. AIDED';

    // Helper functions for date formatting
    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-GB') : 'N/A';
    const dateToWords = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            }).replace(/,/g, '');
        } catch (e) { return 'N/A'; }
    };

    return `
    <div style="width: 210mm; min-height: 297mm; padding: 1.5cm; border: 1px solid #ccc; box-sizing: border-box; font-family: 'Times New Roman', serif;">
        <div class="text-center mb-4">
            ${schoolDetails.logoUrl ? `<img src="${schoolDetails.logoUrl}" alt="School Logo" style="max-height: 80px;">` : ''}
            <h3 style="margin-bottom: 0;">${schoolName}</h3>
            <p style="margin-bottom: 5px;">(${schoolAffiliation})</p>
            <h4 style="border: 2px solid black; display: inline-block; padding: 5px 15px; margin-top: 10px;">TRANSFER CERTIFICATE</h4>
        </div>

        <div class="row" style="font-size: 1.1em; line-height: 1.8;">
            <div class="col-6"><strong>Admission No:</strong> ${student.admissionNumber}</div>
            <div class="col-6 text-end"><strong>Book No:</strong> _______ <strong>TC No:</strong> _______</div>
        </div>

        <table class="table table-bordered mt-3" style="font-size: 1.1em; line-height: 1.6;">
            <tbody>
                <tr><td style="width: 5%;">1.</td><td style="width: 45%;">Name of Pupil</td><td>${student.name}</td></tr>
                <tr><td>2.</td><td>Religion & Community</td><td>${student.religion || 'ISLAM MAPPILA'}</td></tr>
                <tr><td>3.</td><td>Name of Father / Guardian</td><td>${student.fatherName || 'N/A'}</td></tr>
                <tr><td>4.</td><td>Nationality</td><td>${student.nationality || 'INDIAN'}</td></tr>
                <tr><td>5.</td><td>Date of Birth (in figures & words)</td><td>${formatDate(student.dob)}<br><em>${dateToWords(student.dob)}</em></td></tr>
                <tr><td>6.</td><td>Class to which pupil was admitted</td><td>${student.preClass || 'N/A'}</td></tr>
                <tr><td>7.</td><td>Date of Admission</td><td>${formatDate(student.admissionDate)}</td></tr>
                <tr><td>8.</td><td>Class in which pupil last studied</td><td>${classes.find(c=>c.id === student.classId)?.name || 'N/A'}</td></tr>
                <tr><td>9.</td><td>Date of leaving</td><td>${formatDate(student.lastDay)}</td></tr>
                <tr><td>10.</td><td>No. of school days up to date of leaving</td><td>___</td></tr>
                <tr><td>11.</td><td>No. of school days pupil attended</td><td>___</td></tr>
                <tr><td>12.</td><td>Whether qualified for promotion</td><td>___</td></tr>
                <tr><td>13.</td><td>Whether all fees have been paid</td><td>Yes</td></tr>
                <tr><td>14.</td><td>Character and Conduct</td><td>Good</td></tr>
            </tbody>
        </table>

        <div class="row" style="margin-top: 100px;">
            <div class="col-4">
                <p>Date: ${new Date().toLocaleDateString('en-GB')}</p>
                <div style="margin-top: 80px;">
                    <p style="border-top: 1px dashed #000; display: inline-block;">School Seal</p>
                </div>
            </div>
            <div class="col-8 text-end">
                <p>Prepared by: ______________ Checked by: ______________</p>
                <div style="margin-top: 80px;">
                    ${schoolDetails.hmSignPng ? `<img src="${schoolDetails.hmSignPng}" alt="HM Signature" style="max-height: 60px; margin-bottom: -15px;">` : ''}
                    <p style="border-top: 1px dashed #000; display: inline-block; padding: 0 50px;">
                        <strong>Headmaster / Principal</strong>
                    </p>
                </div>
            </div>
        </div>
    </div>
    `;
}
