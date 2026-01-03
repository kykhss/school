import {
    getDocs,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    setDoc,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- HELPERS ---
const formatDateForDisplay = (dateString) => {
    if (!dateString || !dateString.includes('-')) return dateString || '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

// Get Today's Date in YYYY-MM-DD for input fields
const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

// Global reference for table data
let recentStudentsList = [];

// Helper: Ensures date is always YYYY-MM-DD or empty string
window.formatDateForSave = (dateValue) => {
    if (!dateValue) return '';

    // 1. If it is already YYYY-MM-DD (e.g. from type="date" input), return it
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
    }

    // 2. Handle dd/mm/yyyy (The format you specifically asked about)
    if (dateValue.includes('/')) {
        const parts = dateValue.split('/'); 
        // Expected parts: [dd, mm, yyyy]
        if (parts.length === 3) {
            // Return as YYYY-MM-DD
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }

    // 3. Fallback: Try standard parsing for other formats
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return ''; 
    return date.toISOString().split('T')[0];
};

window.renderAddStudentForm = async () => {
    const isEditMode = studentToEdit !== null;
    const currentStudent = studentToEdit || {};
    const formId = 'add-student-form';

    // 1. ACADEMIC YEAR LOGIC (Local Storage + Persistence)
    let initialAcademicYear = '';
    
    if (isEditMode && currentStudent.academicYear) {
        initialAcademicYear = currentStudent.academicYear;
    } else {
        // Try to get from Local Storage first
        const savedYear = localStorage.getItem('system_activeYear');
        if (savedYear) {
            initialAcademicYear = savedYear;
        } else if (typeof systemConfig !== 'undefined' && systemConfig.activeYear) {
            initialAcademicYear = systemConfig.activeYear;
        } else {
            const curYear = new Date().getFullYear();
            initialAcademicYear = `${curYear}-${curYear + 1}`;
        }
    }

    // 2. ADMISSION DATE LOGIC (Default to Today)
    let initialAdmissionDate = '';
    if (currentStudent.admissionDate) {
        // If it's stored as DD/MM/YYYY, we might need to display it as such
        // But inputs type="date" (if used) need YYYY-MM-DD. 
        // Assuming we are using text input with formatDate(this) helper
        initialAdmissionDate = formatDateForDisplay(currentStudent.admissionDate);
    } else {
        // Default to today formatted
        const t = new Date();
        initialAdmissionDate = `${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()}`;
    }

    const formTitle = isEditMode ? 'Edit Student Details' : 'New Admission';
    const buttonText = isEditMode ? 'Update Student' : 'Complete Admission';
    const isBPLChecked = currentStudent.aplBpl === 'BPL';

    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const dob = formatDateForDisplay(currentStudent.dob);

    // --- HTML RENDER ---
    mainContent.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1 class="h2 text-dark border-start border-5 border-primary ps-3">${formTitle}</h1>
            ${isEditMode ? `<span class="badge bg-warning text-dark"><i class="fas fa-edit"></i> Editing Mode</span>` : ''}
        </div>

        <div class="card shadow-sm border-0 mb-5">
            <div class="card-body p-4">
                <form id="add-student-form" class="needs-validation" novalidate>
                    
                    <div class="bg-light p-3 rounded border mb-4 position-relative">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="text-primary fw-bold m-0"><i class="fas fa-cog me-2"></i>Academic Settings & ID</h6>
                            ${!isEditMode ? `
                            <button type="button" id="btn-book-slot" class="btn btn-warning btn-sm fw-bold shadow-sm">
                                <i class="fas fa-bookmark me-1"></i> Reserve Seat (Generate ID)
                            </button>` : ''}
                        </div>
                        
                        <div class="row g-3">
                            <div class="col-md-3">
                                <label for="academicYear" class="form-label fw-bold">Academic Year <span class="text-danger">*</span></label>
                                <input id="academicYear" type="text" class="form-control fw-bold text-primary border-primary" 
                                       placeholder="YYYY-YYYY" value="${initialAcademicYear}" required ${isEditMode ? 'readonly' : ''}>
                                <div class="invalid-feedback">Year required</div>
                            </div>

                            <div class="col-md-3">
                                <label for="admissionSector" class="form-label fw-bold">Sector <span class="text-danger">*</span></label>
                                <select id="admissionSector" class="form-select fw-bold" required ${isEditMode ? 'disabled' : ''}>
                                    <option value="">-- Select --</option>
                                    <option value="KG" ${currentStudent.admissionSector === 'KG' ? 'selected' : ''}>KG (Kindergarten)</option>
                                    <option value="HS" ${currentStudent.admissionSector === 'HS' ? 'selected' : ''}>HS (High School)</option>
                                    <option value="HSS" ${currentStudent.admissionSector === 'HSS' ? 'selected' : ''}>HSS (Higher Secondary)</option>
                                </select>
                                <div class="invalid-feedback">Select Sector</div>
                            </div>

                            <div class="col-md-3">
                                <label for="admissionNumber" class="form-label">Admission No.</label>
                                <input id="admissionNumber" type="text" class="form-control bg-white fw-bold is-valid" readonly value="${currentStudent.admissionNumber || 'Pending...'}">
                            </div>
                            <div class="col-md-3">
                                <label for="admissionId" class="form-label">System ID</label>
                                <input id="admissionId" type="text" class="form-control bg-secondary text-white small" value="${currentStudent.id || ''}"> 
                            </div>
                        </div>
                    </div>

                    <h5 class="text-primary fw-bold mb-3"><i class="fas fa-graduation-cap me-2"></i>Class</h5>
                    <div class="row g-3 mb-4">
                        <div class="col-md-3">
                            <label for="admissionDate" class="form-label">Admission Date <span class="text-danger">*</span></label>
                            <input id="admissionDate" type="text" onkeyup="formatDate(this)" placeholder="DD/MM/YYYY" required class="form-control" value="${initialAdmissionDate}">
                        </div>

                        <div class="col-md-3">
                            <label for="instructionMedium" class="form-label">Medium</label>
                            <select id="instructionMedium" class="form-select">
                                <option value="1" ${currentStudent.instructionMedium === '1' ? 'selected' : ''}>English</option>
                                <option value="0" ${currentStudent.instructionMedium === '0' ? 'selected' : ''}>Malayalam</option>
                            </select>
                        </div>

                        <div class="col-md-3">
                            <label for="classId" class="form-label">Class <span class="text-danger">*</span></label>
                            <select id="classId" required class="form-select">
                                <option value="">-- Select --</option>
                            </select>
                        </div>

                        <div class="col-md-3">
                            <label for="division" class="form-label">Division <span class="text-danger">*</span></label>
                            <select id="division" required class="form-select">
                                <option value="">-- Select Class First --</option>
                            </select>
                        </div>
                        
                    </div>

                    <hr class="text-muted opacity-25">

                    <h5 class="text-primary fw-bold mb-3"><i class="fas fa-user-circle me-2"></i>Personal Information</h5>
                    <div class="row g-3 mb-4">
                        <div class="col-md-4">
                            <label for="name" class="form-label">Full Name <span class="text-danger">*</span></label>
                            <input id="name" type="text" required class="form-control" value="${currentStudent.name || ''}">
                             <div class="invalid-feedback">Name is required</div>
                        </div>
                        <div class="col-md-4">
                            <label for="dob" class="form-label">Date of Birth <span class="text-danger">*</span></label>
                            <input id="dob" type="text" onkeyup="formatDate(this)" placeholder="DD/MM/YYYY" required class="form-control" value="${dob}">
                            <span id="dob-words" class="text-muted small mt-1 d-block"></span>
                        </div>
                        <div class="col-md-4">
                            <label for="gender" class="form-label">Gender</label>
                            <select id="gender" class="form-select">
                                <option value="M" ${currentStudent.gender === 'M' ? 'selected' : ''}>MALE</option>
                                <option value="F" ${currentStudent.gender === 'F' ? 'selected' : ''}>FEMALE</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label for="aadhaar" class="form-label">Aadhaar Number</label>
                            <input id="aadhaar" type="text" maxlength="14" onkeyup="formatAadhaar(this)" class="form-control" value="${currentStudent.aadhaar || ''}">
                        </div>
                        
                        <div class="col-md-4">
                            <label class="form-label d-block mb-2">&nbsp;</label>
                            <div class="form-check form-switch p-2 border rounded bg-light">
                                <input class="form-check-input ms-0 me-2" type="checkbox" id="isBpl" ${isBPLChecked ? 'checked' : ''} style="float:none;">
                                <label class="form-check-label fw-bold" for="isBpl">Is BPL Student?</label>
                            </div>
                        </div>
                         
                         <div class="col-md-4">
                            <label for="birthPlace" class="form-label">Birth Place</label>
                            <input id="birthPlace" type="text" class="form-control" value="${currentStudent.birthPlace || ''}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">WhatsApp (Student)</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="fab fa-whatsapp text-success"></i></span>
                                <input id="whatsappNo" type="tel" class="form-control" value="${currentStudent.whatsappNo || ''}">
                                <button type="button" id="check-sibling-btn" class="btn btn-outline-secondary" title="Check Sibling"> checkSibling </button>
                                </div>
                        </div>

                        <div class="row mb-3 gx-3 gy-2">
                            <div id="sibling-details" class="col-md-12"><strong>Sibling Details:</strong> ${currentStudent.siblingDetailsDisplay}</div>
                        </div>

                    </div>

                    <hr class="text-muted opacity-25">

                    <h5 class="text-primary fw-bold mb-3"><i class="fas fa-users me-2"></i>Family & Contact</h5>
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label for="fatherName" class="form-label">Father's Name</label>
                            <input id="fatherName" type="text" class="form-control" value="${currentStudent.fatherName || ''}">
                        </div>
                        <div class="col-md-6">
                            <label for="motherName" class="form-label">Mother's Name</label>
                            <input id="motherName" type="text" class="form-control" value="${currentStudent.motherName || ''}">
                        </div>
                        <! -- Occupation -->
                        <div class="col-md-6">
                            <label for="occupation" class="form-label">Occupation</label>
                            <input id="occupation" type="text" class="form-control" value="${currentStudent.occupation || ''}">
                        </div>
                    </div>
                    <div class="row g-3 mb-3">
                        <div class="col-md-4">
                            <label for="guardian-type" class="form-label">Guardian</label>
                            <select id="guardian-type" class="form-select bg-light">
                                <option value="Father" ${currentStudent.guardianType === 'Father' || !currentStudent.guardianType ? 'selected' : ''}>Father</option>
                                <option value="Mother" ${currentStudent.guardianType === 'Mother' ? 'selected' : ''}>Mother</option>
                                <option value="Local Guardian" ${currentStudent.guardianType === 'Local Guardian' ? 'selected' : ''}>Local Guardian</option>
                            </select>
                        </div>
                        <div id="local-guardian-fields" class="col-md-8 row g-3 ${currentStudent.guardianType === 'Local Guardian' ? '' : 'd-none'}">
                            <div class="col-6">
                                <label class="form-label">Guardian Name</label>
                                <input id="localGuardianName" type="text" class="form-control" value="${currentStudent.localGuardianName || ''}">
                            </div>
                            <div class="col-6">
                                <label class="form-label">Relation</label>
                                <input id="localGuardianRelation" type="text" class="form-control" value="${currentStudent.localGuardianRelation || ''}">
                            </div>
                        </div>
                    </div>

                     <div class="row g-3 mb-4">
                        <div class="col-md-4">
                            <label class="form-label">Mobile 1</label>
                             <div class="input-group">
                                <span class="input-group-text"><i class="fas fa-phone"></i></span>
                                <input id="mobile1" type="tel" class="form-control" value="${currentStudent.mobile1 || ''}">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Mobile 2</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="fas fa-phone"></i></span>
                                <input id="mobile2" type="tel" class="form-control" value="${currentStudent.mobile2 || ''}">
                            </div>
                        </div>
                        
                    </div>        
                    <h6 class="text-secondary border-bottom pb-2 mb-3">Address Details</h6>
                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <label for="houseName" class="form-label">House Name / No</label>
                            <input id="houseName" type="text" class="form-control" value="${currentStudent.houseName || ''}">
                        </div>
                        <div class="col-md-6">
                            <label for="place" class="form-label">Place</label>
                            <input id="place" type="text" class="form-control" value="${currentStudent.place || ''}">
                        </div>
                        <div class="col-md-4">
                            <label for="postOffice" class="form-label">Post Office</label>
                            <input id="postOffice" type="text" class="form-control" value="${currentStudent.postOffice || ''}">
                        </div>
                        <div class="col-md-4">
                            <label for="pin" class="form-label">PIN Code</label>
                            <input id="pin" type="text" maxlength="6" class="form-control" value="${currentStudent.pin || ''}">
                        </div>
                        <div class="col-md-4">
                             <label for="district" class="form-label">District</label>
                                <select id="district" class="form-select">
                                    <option value="Malappuram" ${currentStudent.district === 'Malappuram' || !currentStudent.district ? 'selected' : ''}>Malappuram</option>
                                    <option value="Other" ${currentStudent.district === 'Other' ? 'selected' : ''}>Other</option>
                                </select>
                        </div>
                    
                        <div class="col-md-4">
                            <label for="taluk" class="form-label">Taluk</label>
                            <input id="taluk" type="text" class="form-control" value="${currentStudent.taluk || ''}">
                        </div>

                        <div class="col-md-4">
                            <label for="nationality" class="form-label">Nationality</label>
                            <select id="nationality" class="form-select">
                                <option value="Indian" ${currentStudent.nationality === 'Indian' || !currentStudent.nationality ? 'selected' : ''}>Indian</option>
                                <option value="Other" ${currentStudent.nationality === 'Other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                    </div>
                     <hr class="text-muted opacity-25">
                    <h5 class="text-primary fw-bold mb-3"><i class="fas fa-graduation-cap me-2"></i>Transport</h5>
                    <div class="row g-3 mb-4">
                       
                        <!--- TRANSPORT OPTIONS --->
                        <div class="col-md-3">
                            <label class="form-label d-block mb-2">&nbsp;</label>
                            <div class="form-check form-switch p-2 border rounded bg-light">
                                <input class="form-check-input ms-0 me-2" type="checkbox" id="vehicleNeed" ${currentStudent.vehicleNeed ? 'checked' : ''} style="float:none;">
                                <label class="form-check-label fw-bold" for="vehicleNeed">Vehicle Needed?</label>
                            </div>
                        </div>
                        
                        <div class="col-md-3">
                            <label for="vehiclePoint" class="form-label">Vehicle Point/Stop</label>
                            <input id="vehiclePoint" type="text" class="form-control" value="${currentStudent.vehiclePoint || currentStudent.busPoint||''}">
                        </div>
                         <!--- VEHICLE STAGE --->
                        <div class="col-md-3">
                            <label for="vehicleStage" class="form-label">Vehicle Stage</label> 
                            <input id="vehicleStage" type="text" class="form-control" value="${currentStudent.vehicleStage || ''}">
                        </div>
                        <!-- admissionfee -->

                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label for="admissionFee" class="form-label">Admission Fee Paid (&#8377;)</label>
                            <input id="admissionFee" type="text" class="form-control" value="${currentStudent.admissionFee || ''}">
                        </div>
                    </div>

                    <hr class="text-muted opacity-25">

                    <h5 class="text-primary fw-bold mb-3"><i class="fas fa-camera me-2"></i>Student Photo</h5>
                    <div class="card bg-light border-dashed">
                        <div class="card-body">
                            <div class="d-flex flex-column flex-md-row align-items-center gap-4">
                                <div class="position-relative">
                                    <div class="w-36 h-48 bg-white rounded shadow-sm border d-flex justify-content-center align-items-center overflow-hidden" style="width: 150px; height: 200px;">
                                        <img id="student-photo-display" class="w-100 h-100 object-fit-cover" 
                                             src="${currentStudent.photoDriveId ? `https://drive.google.com/thumbnail?id=${currentStudent.photoDriveId}&sz=400` : 'https://placehold.co/150x200?text=No+Photo'}" 
                                             alt="Student Photo">
                                    </div>
                                </div>
                                <div class="flex-grow-1 text-center text-md-start">
                                    <h6 class="fw-bold text-dark">Upload Profile Picture</h6>
                                    <p class="text-muted small mb-3">Supported formats: JPG, PNG. Image will be cropped to 3:4.</p>
                                    <div class="d-flex flex-wrap gap-2 justify-content-center justify-content-md-start">
                                        <label class="btn btn-primary btn-sm">
                                            <i class="fas fa-upload me-1"></i> Choose File
                                            <input id="photo-upload-input" type="file" accept="image/*" class="d-none">
                                        </label>
                                        <button type="button" id="remove-photo-btn" class="btn btn-outline-danger btn-sm ${currentStudent.photoURL ? '' : 'd-none'}">
                                            <i class="fas fa-trash me-1"></i> Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="position-sticky bottom-0 bg-white border-top p-3 mt-4 d-flex justify-content-end gap-2" style="z-index: 10;">
                        <button type="button" class="btn btn-light" onclick="navigateTo('student-mgt')">Cancel</button>
                        <button type="submit" class="btn btn-success px-5 shadow-sm fw-bold">
                            <i class="fas fa-save me-2"></i> ${buttonText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        </div>
         <div class="bg-white py-2 d-flex justify-content-between align-items-center" id="summary-div">
                <h6 class="mb-0 text-secondary fw-bold">Summary: 
                    <span class="badge bg-info text-dark ms-2">Total: <span id="summary-total">0</span></span>
                    <span class="badge bg-warning text-dark ms-2">Male: <span id="summary-male">0</span></span>
                    <span class="badge bg-danger text-dark ms-2">Female: <span id="summary-female">0</span></span>
                </h6>
            </div>  

        <div class="card shadow-sm border-0 mb-5">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 class="mb-0 text-danger fw-bold"><i class="fas fa-list me-2"></i>Recently Admitted Students</h5>
                <div>
                     <input type="text" id="recent-search" class="form-control form-control-sm d-inline-block w-auto" placeholder="Search...">
                     <button class="btn btn-outline-secondary btn-sm ms-2" onclick="downloadRecentPDF()"><i class="fas fa-file-pdf"></i> PDF</button>
                </div>
            </div>
           
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0" id="recent-students-table">
                        <thead class="bg-light text-secondary small text-uppercase">
                            <tr>
                                <th class="ps-3">ID</th>
                                <th>Name</th>
                                <th>Class</th>
                                <th>Vehicle</th>
                                <th class="text-end pe-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="recent-students-body">
                            <tr><td colspan="5" class="text-center py-4 text-muted">Loading recent admissions...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="photo-crop-modal" class="modal fade" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header py-2 bg-light">
                        <h5 class="modal-title fs-6"><i class="fas fa-crop me-2"></i>Adjust Photo</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-0 bg-dark d-flex justify-content-center align-items-center" style="height: 75vh; overflow:hidden;">
                        <img id="image-to-crop" src="" alt="Crop" style="max-width: 100%; max-height: 100%; display: block;">
                    </div>
                    <div class="modal-footer bg-light justify-content-center py-3">
                        <div class="btn-group me-3">
                            <button type="button" id="rotate-left-btn" class="btn btn-outline-secondary"><i class="fas fa-undo"></i></button>
                            <button type="button" id="rotate-right-btn" class="btn btn-outline-secondary"><i class="fas fa-redo"></i></button>
                           <!-- Zoom & Move Buttons -->
                            <button type="button" id="zoom-in-btn" class="btn btn-outline-secondary"><i class="fas fa-search-plus"></i></button>
                            <button type="button" id="zoom-out-btn" class="btn btn-outline-secondary"><i class="fas fa-search-minus"></i></button>
                            <!-- Move Buttons -->
                            <button type="button" id="move-left-btn" class="btn btn-outline-secondary"><i class="fas fa-arrow-left"></i></button>
                            <button type="button" id="move-right-btn" class="btn btn-outline-secondary"><i class="fas fa-arrow-right"></i></button> 
                            <button type="button" id="move-up-btn" class="btn btn-outline-secondary"><i class="fas fa-arrow-up"></i></button>
                            <button type="button" id="move-down-btn" class="btn btn-outline-secondary"><i class="fas fa-arrow-down"></i></button>
                        </div>
                        <button type="button" id="crop-photo-btn" class="btn btn-primary px-4 fw-bold">
                            <i class="fas fa-check me-2"></i> CROP & SAVE
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // --- DOM REFERENCES ---
    const academicYearInput = document.getElementById('academicYear');
    const classDropdown = document.getElementById('classId');
    const divisionDropdown = document.getElementById('division');
    const admnSector = document.getElementById('admissionSector');
    const admnNum = document.getElementById('admissionNumber');
    const admnId = document.getElementById('admissionId');
    const bookSlotBtn = document.getElementById('btn-book-slot');

    //RECENT STUDENTS TABLE
    const recentStudentsBody = document.getElementById('recent-students-body');
    const recentSearchInput = document.getElementById('recent-search');

    // Toggles & Inputs
    const guardianTypeSelect = document.getElementById('guardian-type');
    const localGuardianFieldsDiv = document.getElementById('local-guardian-fields');
    
    // Photo Logic
    const photoUploadInput = document.getElementById('photo-upload-input');
    const studentPhotoDisplay = document.getElementById('student-photo-display');
    const removePhotoBtn = document.getElementById('remove-photo-btn');
    const photoCropModalElement = document.getElementById('photo-crop-modal');
    const photoCropModal = new bootstrap.Modal(photoCropModalElement);
    const imageToCrop = document.getElementById('image-to-crop');

    //photo controls
    const rotateLeftBtn = document.getElementById('rotate-left-btn');
    const rotateRightBtn = document.getElementById('rotate-right-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const moveLeftBtn = document.getElementById('move-left-btn');
    const moveRightBtn = document.getElementById('move-right-btn');
    const moveUpBtn = document.getElementById('move-up-btn');
    const moveDownBtn = document.getElementById('move-down-btn');
    const cropPhotoBtn = document.getElementById('crop-photo-btn');
    const siblingCheckBtn = document.getElementById('check-sibling-btn');
    let siblingData = [];

    //sibling details
    const siblingDetailsDiv = document.getElementById('sibling-details');

    let availableClasses = [];
    // check siblings that match whatsapp number of students if any 
    // Sibling WhatsApp Number Lookup
    const checkSibling = async () => {
    const whatsappNoInput = document.getElementById('whatsappNo');
    const whatsappNo = whatsappNoInput.value.trim();

    // 1. Validation
    if (!whatsappNo) {
        alert('Please enter a WhatsApp number to check for siblings.');
        return;
    }

    try {
        // 2. Query Database
        // Note: Ensure window.getCollectionRef is defined, or use collection(db, 'students')
        const q = query(window.getCollectionRef('students'), where('whatsappNo', '==', whatsappNo));
        const snapshot = await getDocs(q);

        // 3. Handle No Matches
        if (snapshot.empty) {
            alert('No sibling found with this WhatsApp number.');
            siblingDetailsDiv.classList.add('d-none');
            siblingDetailsDiv.innerHTML = '';
            return;
        }

        // 4. Process Siblings
        let siblingListHTML = '<ul class="list-group mb-3">';
        let siblingNames = [];
        let firstSiblingData = null; // Store data of the first sibling found

        snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            
            // Store the first valid record we find to use for autofill later
            if (index === 0) {
                firstSiblingData = data;
            }

            // Add to display list
            const className = window.classes?.find(c => c.id === data.classId)?.name || data.classId || 'Unknown Class';
            siblingListHTML += `
                <li class="list-group-item">
                    <strong>${data.name}</strong> 
                    <small class="text-muted">(Class: ${className}, Adm No: ${data.admissionNumber || 'N/A'})</small>
                </li>`;
            
            siblingNames.push(data.name);
            siblingData.push(`${data.admissionNumber}-${data.name}`); // Store sibling data for potential future use
        });
        siblingListHTML += '</ul>';

        // 5. Update UI
        siblingDetailsDiv.innerHTML = `
            <div class="alert alert-info">
                <h6><i class="fas fa-users me-2"></i>Siblings Found:</h6>
                ${siblingListHTML}
            </div>
        `;
        siblingDetailsDiv.classList.remove('d-none');

        // 6. Autofill Logic (Single Confirmation)
        if (firstSiblingData) {
            const shouldAutofill = confirm(
                `Found ${siblingNames.length} sibling(s): ${siblingNames.join(', ')}.\n\n` +
                `Do you want to use details from "${firstSiblingData.name}" to fill Parent & Address fields?`
            );

            if (shouldAutofill) {
                // Helper to safely set value AND trigger change event (Crucial for dropdowns)
                const setValue = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) {
                        // For select/text inputs, this works the same way
                        // The 'val' must match the <option value="..."> exactly
                        el.value = val || ''; 
                        
                        // Trigger 'change' so any attached listeners update (e.g. if District change loads Taluks)
                        el.dispatchEvent(new Event('change'));
                    }
                };

                // Fill Parent Details
                setValue('fatherName', firstSiblingData.fatherName);
                setValue('motherName', firstSiblingData.motherName);
                setValue('occupation', firstSiblingData.parentOccupation || firstSiblingData.occupation); // Handle potential field name diff
                
                // Fill Contact
                setValue('mobile1', firstSiblingData.mobile1);
                setValue('mobile2', firstSiblingData.mobile2);
                // We don't overwrite whatsappNo because that's what we searched with
                
                // Fill Address
                setValue('houseName', firstSiblingData.houseName);
                setValue('place', firstSiblingData.place);
                setValue('postOffice', firstSiblingData.postOffice);
                setValue('pin', firstSiblingData.pin || firstSiblingData.pincode); // Handle potential field name diff
                //dropdowns district,nationality
                setValue('district', firstSiblingData.district);
                setValue('nationality', firstSiblingData.nationality);
                setValue('taluk', firstSiblingData.birthPlace);
                

                // Fill Local Guardian if applicable
                if (firstSiblingData.guardianType === 'Local Guardian') {
                    setValue('guardian-type', 'Local Guardian');
                    localGuardianFieldsDiv.classList.remove('d-none');
                    setValue('localGuardianName', firstSiblingData.localGuardianName);
                    setValue('localGuardianRelation', firstSiblingData.localGuardianRelation);
                } else {
                    setValue('guardian-type', firstSiblingData.guardianType || 'Father');
                    localGuardianFieldsDiv.classList.add('d-none');
                }

                // vehicle details
                 setValue('vehicleNeed', firstSiblingData.vehicleNeed ? 'checked' : '');
                setValue('vehiclePoint', firstSiblingData.vehiclePoint);
                setValue('vehicleStage', firstSiblingData.vehicleStage);
                   
                 
                
                alert('Details autofilled successfully!');
            }
        }

    } catch (error) {
        console.error("Error checking sibling:", error);
        alert('Error occurred while checking for siblings. See console for details.');
    }
};




    siblingCheckBtn.addEventListener('click', checkSibling);

    // Show/hide local guardian fields based on selection
    guardianTypeSelect.addEventListener('change', () => {
        if (guardianTypeSelect.value === 'Local Guardian') {
            localGuardianFieldsDiv.classList.remove('d-none');
        } else {
            localGuardianFieldsDiv.classList.add('d-none');
        }
    });
    // show/hide vehicle point and vehicleStage  based on vehicle need
    const vehicleNeedCheckbox = document.getElementById('vehicleNeed');
    const vehiclePointInput = document.getElementById('vehiclePoint');
    const vehicleStageInput = document.getElementById('vehicleStage');

    vehicleNeedCheckbox.addEventListener('change', () => {
        if (!vehicleNeedCheckbox.checked) {
            vehiclePointInput.value = '';
            vehicleStageInput.value = '';  
        }else {
            vehiclePointInput.value = currentStudent.vehiclePoint || '';
            vehicleStageInput.value = currentStudent.vehicleStage || '';
        }

    });

    // --- 1. SECTOR & ACADEMIC YEAR FILTERING ---
    const populateClassDropdown = async () => {
        try {
            const selectedYear = academicYearInput.value;
            const selectedSector = admnSector.value;

            // Save Year to LocalStorage
            localStorage.setItem('system_activeYear', selectedYear);

            classDropdown.innerHTML = '<option value="">Loading...</option>';
            
            const allClasses = await appDb['classes'].toArray();
            
            // STRICT FILTER: Year matches AND (if Sector is selected, Sector matches)
            availableClasses = allClasses.filter(item => {
                const yearMatch = String(item.academicYear) === String(selectedYear);
                const sectorMatch = selectedSector ? item.sector === selectedSector : true; // Assuming class has 'sector' field
                // Note: If your Class DB doesn't have 'sector' field, you might need to map class names (e.g. 1-4 is KG/LP)
                // For now, relying on user adding 'sector' to class or generic filtering.
                // If specific requirement: "IF KG CLASS ONLY LOAD CLASS.SECTOR===KG"
                return yearMatch && sectorMatch;
            });
            
            classDropdown.innerHTML = '<option value="">-- Select Class --</option>';
            
            if (availableClasses.length === 0) {
                classDropdown.innerHTML += `<option value="" disabled>No classes for ${selectedSector} in ${selectedYear}</option>`;
            } else {
                availableClasses.forEach(c => {
                    const isSelected = currentStudent.classId === c.id ? 'selected' : '';
                    classDropdown.innerHTML += `<option value="${c.id}" ${isSelected}>${c.name}</option>`;
                });
            }

            if (currentStudent.classId) updateDivisions();
        } catch (error) {
            console.error("Error loading classes:", error);
            classDropdown.innerHTML = '<option value="">Error</option>';
        }
    };

    const updateDivisions = () => {
        const selectedClassId = classDropdown.value;
        const selectedClassData = availableClasses.find(c => c.id === selectedClassId);
        divisionDropdown.innerHTML = '<option value="">-- Select --</option>';
        if (selectedClassData && selectedClassData.divisions) {
            selectedClassData.divisions.forEach(d => {
                const isSelected = currentStudent.division === d ? 'selected' : '';
                divisionDropdown.innerHTML += `<option value="${d}" ${isSelected}>${d}</option>`;
            });
        }
    };

    // --- 2. ID GENERATION & BOOKING SLOT ---
    const generateAdmnNo = async () => {
        if (isEditMode) return;
        admnNum.value = "Scanning...";
        const sector = admnSector.value;
        const selectedYear = academicYearInput.value;
        if (!sector || !selectedYear) return;

        try {
            const q = query(window.getCollectionRef('students'), where('academicYear', '==', selectedYear),
             where('admissionSector', '==', sector));
            const snapshot = await getDocs(q);
            let maxAdmnNum = 0;
            snapshot.docs.forEach(doc => {
                const num = parseInt(doc.data().admissionNumber, 10);
                if (!isNaN(num) && num > maxAdmnNum) maxAdmnNum = num;
            });

            const nextAdmnNum = maxAdmnNum + 1;
            const formattedNum = nextAdmnNum.toString().padStart(4, '0');
            
            // Year Code (2025-2026 -> 25)
            let yearForId = selectedYear;
            if (selectedYear.includes('-')) yearForId = selectedYear.split('-')[0];
            const shortYear = yearForId.trim().slice(-2); 

            const newId = `${sector}_${shortYear}_${formattedNum}`;
            
            admnNum.value = formattedNum;
            admnId.value = newId;
            return { admnNum: formattedNum, admnId: newId }; // Return for booking function
        } catch (e) {
            console.error("ID Generation Error:", e);
            admnNum.value = "Error";
        }
    };

    // BOOK SLOT FUNCTION
    if(bookSlotBtn) {
        bookSlotBtn.addEventListener('click', async () => {
            const sector = admnSector.value;
            const name = document.getElementById('name').value;
            const year = academicYearInput.value;

            if(!sector || !name || !year) {
                showAlert("Please enter Name, Year, and Sector to reserve.", "warning");
                return;
            }

            if(!confirm("Reserve this ID and admission number now? This will prevent double entry.")) return;

            bookSlotBtn.disabled = true;
            bookSlotBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Reserving...';

            try {
                // 1. Generate ID
                const idData = await generateAdmnNo();
                if(!idData || !idData.admnId) throw new Error("ID Gen failed");

                // 2. Check existence strictly
                const docRef = window.getDocRef( 'students',idData.admnId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                     showAlert("Slot just taken! Retrying...", "warning");
                     await generateAdmnNo(); // Retry
                     bookSlotBtn.disabled = false;
                     return;
                }

                // 3. Create Draft Document
                const draftData = {
                    id: idData.admnId,
                    admissionNumber: idData.admnNum,
                    admissionSector: sector,
                    academicYear: year,
                    name: name,
                    createdAt: serverTimestamp(),
                    isDraft: true // Flag to know it's not fully admitted
                };

                await setDoc(docRef, draftData);
                
                // 4. Reload in Edit Mode
                showAlert("Slot Reserved! Loading form...", "success");
                studentToEdit = draftData;
                renderAddStudentForm(); // Reload form in edit mode

            } catch (e) {
                console.error(e);
                showAlert("Booking failed.", "danger");
                bookSlotBtn.disabled = false;
                bookSlotBtn.innerHTML = 'Reserve Seat';
            }
        });
    }

    // --- EVENT LISTENERS ---
    academicYearInput.addEventListener('change', () => {
        populateClassDropdown();
        generateAdmnNo(); 
    });
    admnSector.addEventListener('change', () => {
        populateClassDropdown();
        generateAdmnNo();
    });
    classDropdown.addEventListener('change', updateDivisions);
   
    //update admissionfee based on class selection
    classDropdown.addEventListener('change', () => {
        const selectedClass = availableClasses.find(c => c.id === classDropdown.value);
        const admissionFeeInput = document.getElementById('admissionFee');
        if (selectedClass && selectedClass.admissionFee) {
            admissionFeeInput.value = selectedClass.admissionFee;
        } else {
            admissionFeeInput.value = '';
        }
    });

    guardianTypeSelect.addEventListener('change', () => {
        localGuardianFieldsDiv.classList.toggle('d-none', guardianTypeSelect.value !== 'Local Guardian');
    });

    // --- PHOTO LOGIC (Standard) ---
    // ... (Keep existing Cropper Logic here from previous code) ...
    let cropper = null;
    let rawPhotoFile = null;
    let croppedPhotoBlob = null;
    let currentPhotoURL = currentStudent.photoURL || '';

    photoUploadInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (!files || !files.length) return;
        rawPhotoFile = files[0];
        const reader = new FileReader();
        reader.onload = (evt) => { imageToCrop.src = evt.target.result; photoCropModal.show(); };
        reader.readAsDataURL(rawPhotoFile);
    });

    photoCropModalElement.addEventListener('shown.bs.modal', () => {
        if (cropper) cropper.destroy();
        cropper = new Cropper(imageToCrop, { aspectRatio: 3 / 4, viewMode: 1, autoCropArea: 0.95 });
    });

    document.getElementById('crop-photo-btn')?.addEventListener('click', () => {
        if (!cropper) return;
        cropper.getCroppedCanvas({ width: 450, height: 600 }).toBlob((blob) => {
            croppedPhotoBlob = blob;
            studentPhotoDisplay.src = URL.createObjectURL(blob);
            removePhotoBtn.classList.remove('d-none');
            photoCropModal.hide();
        }, 'image/jpeg', 0.95);
        
    });

    moveLeftBtn.addEventListener('click', () => { if(cropper) cropper.move(-10, 0); });
    moveRightBtn.addEventListener('click', () => { if(cropper) cropper.move(10, 0); });
    moveUpBtn.addEventListener('click', () => { if(cropper) cropper.move(0, -10); });
    moveDownBtn.addEventListener('click', () => { if(cropper) cropper.move(0, 10); });
    rotateLeftBtn.addEventListener('click', () => { if(cropper) cropper.rotate(-15); });
    rotateRightBtn.addEventListener('click', () => { if(cropper) cropper.rotate(15); });
    zoomInBtn.addEventListener('click', () => { if(cropper) cropper.zoom(0.1); });
    zoomOutBtn.addEventListener('click', () => { if(cropper) cropper.zoom(-0.1); });

    removePhotoBtn.addEventListener('click', () => {
        if (!confirm("Remove current photo?")) return;
        croppedPhotoBlob = null;
        rawPhotoFile = null;
        studentPhotoDisplay.src = 'https://placehold.co/150x200?text=No+Photo';
        removePhotoBtn.classList.add('d-none');
    });

    // --- SUBMIT LOGIC ---
    document.getElementById('add-student-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        form.classList.add('was-validated'); // Triggers Green Ticks
        
        if (!form.checkValidity()) {
            e.stopPropagation();
            showAlert('Please complete all required fields (marked green).', 'warning');
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Saving...`;

        try {
             // Gather Data
            
            const studentData = {
            // --- A. SYSTEM & IDENTITY ---
            id: isEditMode ? currentStudent.id : admnId.value, // Generate ID if new
            admissionNumber: document.getElementById('admissionNumber').value,
            academicYear: document.getElementById('academicYear').value,
            admittedYear: document.getElementById('academicYear').value,
             
            admissionSector: document.getElementById('admissionSector').value,
            createdAt: isEditMode ? (currentStudent.createdAt || serverTimestamp()) : serverTimestamp(), // Keep original date on edit
            lastUpdated: serverTimestamp(),
            isDraft: false,
            status: isEditMode ? currentStudent.status|| 'Active': 'Active', // Default status

            // --- B. CLASS & ACADEMIC ---
            admissionDate: formatDateForSave(document.getElementById('admissionDate').value),
            instructionMedium: document.getElementById('instructionMedium').value,
            classId: document.getElementById('classId').value,
            division: document.getElementById('division').value,
            
            // --- C. PERSONAL DETAILS ---
            name: document.getElementById('name').value.trim(),
            dob: formatDateForSave(document.getElementById('dob').value),
            gender: document.getElementById('gender').value,
            aadhaar: document.getElementById('aadhaar').value.trim(),
            birthPlace: document.getElementById('birthPlace').value.trim(),
            nationality: document.getElementById('nationality').value,
            isBPL: document.getElementById('isBpl').checked, // Boolean from checkbox

            // --- D. FAMILY & CONTACT ---
            fatherName: document.getElementById('fatherName').value.trim(),
            motherName: document.getElementById('motherName').value.trim(),
            occupation: document.getElementById('occupation').value.trim(),
            guardianType: document.getElementById('guardian-type').value,
            
            // Conditional: Local Guardian Fields
            localGuardianName: document.getElementById('guardian-type').value === 'Local Guardian' 
                               ? document.getElementById('localGuardianName').value.trim() : '',
            localGuardianRelation: document.getElementById('guardian-type').value === 'Local Guardian' 
                                   ? document.getElementById('localGuardianRelation').value.trim() : '',

            whatsappNo: document.getElementById('whatsappNo').value.trim(),
            mobile1: document.getElementById('mobile1').value.trim(),
            mobile2: document.getElementById('mobile2').value.trim(),

            // --- E. ADDRESS ---
            houseName: document.getElementById('houseName').value.trim(),
            place: document.getElementById('place').value.trim(),
            postOffice: document.getElementById('postOffice').value.trim(),
            pin: document.getElementById('pin').value.trim(),
            district: document.getElementById('district').value,
            taluk: document.getElementById('taluk').value,

            // --- F. TRANSPORT ---
            vehicleNeed:document.getElementById('vehicleNeed').checked,
            vehicleStage: document.getElementById('vehicleStage').value.trim(),
            vehiclePoint: document.getElementById('vehiclePoint').value.trim(),
            admissionFee: parseFloat(document.getElementById('admissionFee').value) || 0,

            // sibling details
            siblingDetails: siblingData,
            
            //photo details to be updated later
            photoURL: '',
            photoDriveId: ''

            };
            // Photo Upload Logic...
            if (croppedPhotoBlob) {
                const uploadResult = await uploadPhotoToDrive(croppedPhotoBlob, studentData.admissionNumber);
                if (uploadResult.success) {
                    studentData.photoURL = uploadResult.fileUrl;
                    studentData.photoDriveId = uploadResult.fileId;
                }
            } else {
                studentData.photoURL = currentPhotoURL||"";
                studentData.photoDriveId = currentStudent.photoDriveId||"";
            }

            await setDoc(window.getDocRef('students', studentData.id), studentData, { merge: true });


            showAlert('Admission Complete!', 'success');
            renderRecentTable(); // Refresh table
            
            if (isEditMode) {
                studentToEdit = null;
                //navigateTo('student-mgt');
                form.reset();
                form.classList.remove('was-validated');
                studentPhotoDisplay.src = 'https://placehold.co/150x200?text=No+Photo';
                academicYearInput.value = initialAcademicYear; // Restore year
                generateAdmnNo();
            } else {
                form.reset();
                form.classList.remove('was-validated');
                studentPhotoDisplay.src = 'https://placehold.co/150x200?text=No+Photo';
                academicYearInput.value = initialAcademicYear; // Restore year
                generateAdmnNo();
            }

        } catch (error) {
            console.error(error);
            showAlert('Error: ' + error.message, 'danger');
        } finally {
            submitButton.disabled = false;
        }
    });

    // --- RECENT STUDENTS TABLE LOGIC ---
    // --- RECENT STUDENTS TABLE LOGIC (LOCAL DB VERSION) ---
    //reder recent summary
    const renderRecentSummary = (students) => {
    const summaryDiv = document.getElementById('summary-div');
    if (!summaryDiv) return;

    if (students.length === 0) {
        summaryDiv.innerHTML = '<p class="text-muted text-center">No students to summarize.</p>';
        return;
    }

    // 1. Process Data: Group by Class -> Division
    const summaryMap = {}; // { classId: { divA: {M:0, F:0}, divB: {...} } }
    const allDivisions = new Set();

    students.forEach(s => {
        const classId = s.classId || 'Unknown';
        const div = s.division || 'N/A';
        const gender = s.gender; // Assumes 'M' or 'F'

        if (!summaryMap[classId]) summaryMap[classId] = {};
        if (!summaryMap[classId][div]) summaryMap[classId][div] = { M: 0, F: 0, Total: 0 };

        if (gender === 'M') summaryMap[classId][div].M++;
        else if (gender === 'F') summaryMap[classId][div].F++;
        
        summaryMap[classId][div].Total++;
        allDivisions.add(div);
    });

    // 2. Sort Keys for Display
    const sortedDivisions = Array.from(allDivisions).sort(); // ['A', 'B', 'C'...]
    const sortedClassIds = Object.keys(summaryMap).sort();   // Sort class IDs

    // 3. Build HTML Table
    let tableHTML = `
        <div class="table-responsive">
            <table class="table table-bordered table-striped table-sm text-center" style="font-size: 0.9rem;">
                <thead class="table-dark">
                    <tr>
                        <th class="align-middle bg-primary">Class</th>
                        ${sortedDivisions.map(d => `<th class="align-middle bg-primary">Div ${d}</th>`).join('')}
                        <th class="align-middle bg-secondary">Total</th>
                    </tr>
                </thead>
                <tbody>`;

    let grandTotal = 0;

    sortedClassIds.forEach(clsId => {
        // Try to get Class Name from global 'classes' array, else use ID
        const className = window.classes?.find(c => c.id === clsId)?.name || clsId;
        let classRowTotal = 0;

        tableHTML += `<tr><td class="fw-bold text-start">${className}</td>`;

        sortedDivisions.forEach(div => {
            const data = summaryMap[clsId][div];
            
            if (data) {
                classRowTotal += data.Total;
                // Cell Format:  B: 10 | G: 12
                tableHTML += `
                    <td>
                        <span class="text-primary fw-bold" title="Boys">B:${data.M}</span> <span class="text-muted">|</span> 
                        <span class="text-danger fw-bold" title="Girls">G:${data.F}</span>
                        <div class="small text-muted bg-light rounded mt-1">Tot: ${data.Total}</div>
                    </td>`;
            } else {
                tableHTML += `<td class="text-muted bg-light">-</td>`;
            }
        });

        grandTotal += classRowTotal;
        tableHTML += `<td class="fw-bold bg-light align-middle">${classRowTotal}</td></tr>`;
    });

    tableHTML += `
                </tbody>
                <tfoot class="table-light fw-bold">
                    <tr>
                        <td>Grand Total</td>
                        <td colspan="${sortedDivisions.length}" class="text-end">Total Students:</td>
                        <td class="bg-warning">${grandTotal}</td>
                    </tr>
                </tfoot>
            </table>
        </div>`;

    summaryDiv.innerHTML = tableHTML;
};
    let recentStudentsList = []; // For PDF Export

    const renderRecentTable = async () => {
        const tbody = document.getElementById('recent-students-body');
        //recentSearchInput SEARCH FUNCTION
        recentSearchInput.addEventListener('input', () => {
            const filter = recentSearchInput.value.toLowerCase();
            const rows = tbody.getElementsByClassName('student-row');
            for (let i = 0; i < rows.length; i++) {

                const row = rows[i];
                const nameCell = row.cells[1].innerText.toLowerCase();
                const admnCell = row.cells[0].innerText.toLowerCase();
                const classCell = row.cells[2].innerText.toLowerCase();
                const vehicleCell = row.cells[4].innerText.toLowerCase();

                if (nameCell.includes(filter) || admnCell.includes(filter) || classCell.includes(filter) ||
                    vehicleCell.includes(filter)) {
                    row.style.display = '';
                } else
                    row.style.display = 'none';
            }
        });

        try {
            // CHANGED: Get from Local AppDB instead of Firestore Query
            const allStudents = await appDb['students'].toArray();
            
            // Filter out drafts
            const validStudents = allStudents.filter(s => s.admittedYear === initialAcademicYear);
            renderRecentSummary(validStudents);

            // Sort Descending by CreatedAt (Handles Firestore Timestamp or Date strings)
            validStudents.sort((a, b) => {
                const timeA = a.createdAt?.seconds ? a.createdAt.seconds : (new Date(a.createdAt || 0).getTime() / 1000);
                const timeB = b.createdAt?.seconds ? b.createdAt.seconds : (new Date(b.createdAt || 0).getTime() / 1000);
                return timeB - timeA;
            });

            // Take Top 10
            const recent10 = validStudents.slice(0, 10);
            
            recentStudentsList = recent10; // Store for PDF export
            let html = '';

            if(recent10.length === 0) {
                 tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No recent admissions found locally.</td></tr>';
                 return;
            }

            recent10.forEach(s => {
                html += `
                <tr class="student-row">
                    <td class="ps-3 fw-bold text-primary">${s.admissionNumber}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${s.photoDriveId ? `https://drive.google.com/thumbnail?id=${s.photoDriveId}&sz=400` : 'https://placehold.co/40'}" class="rounded-circle me-2" width="30" height="30" style="object-fit:cover;">
                            <div>
                                <div class="fw-bold text-dark">${s.name}</div>
                                <div class="small text-muted">${s.fatherName || ''}</div>
                            </div>
                        </div>
                        <div class="collapse mt-2 small text-muted" id="details-${s.id}">
                            <strong>Mobile:</strong> ${s.mobile1 || '-'}<br>
                            <strong>Place:</strong> ${s.place || '-'}<br>
                            <strong>DOB:</strong> ${s.dob || '-'}
                        </div>
                    </td>
                    <td><span class="badge bg-light text-dark border">${s.classId || '?'} - ${s.division || '?'}</span></td>
                    <td>${s.vehicleStage || '-'}-${s.vehiclePoint||s.busPoint ||'-'}</td>
                    <td class="text-end pe-3">
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#details-${s.id}">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="sendWhatsApp('${s.id}')" title="WhatsApp">
                                <i class="fab fa-whatsapp"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="generateWelcomePoster('${s.name}', '${s.admissionNumber}', '${s.photoDriveId}')" title="Poster">
                                <i class="fas fa-image"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary" onclick="handleEditStudent('${s.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="window.showAdmissionExtractModal('${s.id}')" class="btn btn-sm btn-outline-info ad-form-btn" title="Admission Form"><i class="fas fa-file-alt"></i></button>
                            
                        </div>
                    </td>
                </tr>
                `;
            });
            tbody.innerHTML = html;
        } catch (e) {
            console.error("Error rendering local recent table:", e);
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading local data.</td></tr>';
        }
    };

    recentSearchInput.addEventListener('input', () => {
        const tbody = document.getElementById('recent-students-body');
            const filter = recentSearchInput.value.toLowerCase();
            const rows = tbody.getElementsByClassName('student-row');
            for (let i = 0; i < rows.length; i++) {

                const row = rows[i];
                const nameCell = row.cells[1].innerText.toLowerCase();
                const admnCell = row.cells[0].innerText.toLowerCase();
                const classCell = row.cells[2].innerText.toLowerCase();
                const vehicleCell = row.cells[4].innerText.toLowerCase();

                if (nameCell.includes(filter) || admnCell.includes(filter) || classCell.includes(filter) ||
                    vehicleCell.includes(filter)) {
                    row.style.display = '';
                } else
                    row.style.display = 'none';
            }
        });

    // --- GLOBAL ACTIONS (Exposed to window) ---
    window.sendWhatsApp = (id) => {
        // 1. Find the student object from the local list
        const s = recentStudentsList.find(item => item.id === id);
        
        if (!s) { 
            alert("Student details not found currently loaded."); 
            return; 
        }
        if (!s.whatsappNo) { 
            alert("No WhatsApp number provided for this student."); 
            return; 
        }

        // 2. Construct the formatted message
        // Note: \n creates a new line, *text* makes it bold
        let msg = `*🎓 ADMISSION DETAILS VERIFICATION 🎓*\n\n`;
        msg += `Dear Parent, \n`;
        msg += `Please verify the official details entered for your ward:\n\n`;

        msg += `*👤 STUDENT INFO*\n`;
        msg += `*Name:* ${s.name}\n`;
        msg += `*Adm No:* ${s.admissionNumber}\n`;
        msg += `*Adm Date:* ${s.admissionDate || '-'}\n`;
        msg += `*Class:* ${s.classId} - ${s.division}\n`;
        msg += `*DOB:* ${s.dob}\n`;
        msg += `*Gender:* ${s.gender === 'M' ? 'Male' : 'Female'}\n`;
        msg += `*Aadhaar:* ${s.aadhaar || '-'}\n\n`;

        msg += `*👨‍👩‍👦 FAMILY DETAILS*\n`;
        msg += `*Father:* ${s.fatherName || '-'}\n`;
        msg += `*Mother:* ${s.motherName || '-'}\n`;
        if (s.guardianType === 'Local Guardian') {
             msg += `*Guardian:* ${s.localGuardianName} (${s.localGuardianRelation})\n`;
        }
        msg += `*BPL Status:* ${s.aplBpl || 'APL'}\n\n`;

        msg += `*🚌 TRANSPORT*\n`;
        msg += `*Vehicle:* ${s.vehicleNeed ? (s.vehicleStage|| 'None') : '-'}\n`;
        msg += `*Bus Point:* ${s.busPoint || '-'}\n\n`;

        msg += `*📍 CONTACT & ADDRESS*\n`;
        msg += `*Mobile:* ${s.mobile1} ${s.mobile2 ? '/ ' + s.mobile2 : ''}\n`;
        msg += `*Address:* ${s.houseName || ''}, ${s.place || ''}\n`;
        msg += `*PO:* ${s.postOffice || ''}, *PIN:* ${s.pin || ''}\n`;
        msg += `*District:* ${s.district || ''}\n\n`;
        msg += `*Taluk:* ${s.taluk || ''}\n`;
        msg += `*Nationality:* ${s.nationality || ''}\n`;

        msg += `_⚠️ Please review these details carefully. If there are any spelling mistakes or errors, kindly reply to this message immediately._`;

        // 3. Open WhatsApp API
        window.open(`https://wa.me/${s.whatsappNo}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    window.editStudent = async (id) => {
        const docRef = doc(window.db, 'students', id);
        const snap = await getDoc(docRef);
        if(snap.exists()){
            studentToEdit = snap.data();
            renderAddStudentForm();
        }
    };

    window.downloadRecentPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.text("Recently Admitted Students", 14, 15);
        
        const tableData = recentStudentsList.map(s => [
            s.admissionNumber, 
            s.name, 
            `${s.classId} ${s.division}`, 
            s.vehicle, 
            s.mobile1
        ]);

        doc.autoTable({
            head: [['Adm No', 'Name', 'Class', 'Vehicle', 'Mobile']],
            body: tableData,
            startY: 20,
        });

        doc.save(`Recent_Admissions_${getTodayDate()}.pdf`);
    };

    window.generateWelcomePoster = (name, admNo, photoDriveId) => {
        const queryString = new URLSearchParams({
            is: 'welcome',
            user: 'admin',
            name: name,
            admNo: admNo,
            photoDriveId: photoDriveId
        }).toString();
   
const editorUrl = `poster-editor.html?${queryString}`;
window.open(editorUrl, '_blank');
    };

    // Initial Load
    await populateClassDropdown();
    if (!isEditMode) generateAdmnNo();
    renderRecentTable();
};

window.generateTopperPoster = async (studentId, examId, rank) => {
    const student = window.students.find(s => s.id === studentId);
    const exam = window.exams.find(e => e.id === examId);

    if (!student || !exam) {
        showAlert('Could not find student or exam data.', 'danger');
        return;
    }

    const className = window.classes.find(c => c.id === student.classId)?.name || '';
    const classDiv = `${className}-${student.division}`;

    // 1. Construct the student object for the new Editor
    // We try to convert the Drive ID to a viewable URL here
    const photoUrl = student.photoDriveId 
        ? `https://drive.google.com/thumbnail?id=${student.photoDriveId}&sz=400`
        : 'https://placehold.co/400?text=No+Photo';

    const newPosterData = {
        id: student.id,         // Keep ID consistent
        name: student.name,
        class: classDiv,
        rank: rank.toString(),
        photo: photoUrl         // The new editor expects a direct URL link here
    };

    // 2. Inject into LocalStorage (The bridge to the new Editor)
    const DB_KEY = 'school_poster_data';
    let currentData = [];
    
    try {
        currentData = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
    } catch (e) {
        currentData = [];
    }

    // Remove old entry for this student (if exists) and add the new one to the top
    currentData = currentData.filter(item => item.id !== newPosterData.id);
    currentData.unshift(newPosterData);

    localStorage.setItem(DB_KEY, JSON.stringify(currentData));

    // 3. Open Editor with a flag to auto-select this student
    // Note: ensure your HTML file is named 'robust-editor.html' or update the line below
    const editorUrl = `robust-editor.html?selectId=${student.id}&template=topper`;
    window.open(editorUrl, '_blank');
};

