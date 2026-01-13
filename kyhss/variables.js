
  

window. mainContent = document.getElementById('main-content');
        window. sidebarNav = document.getElementById('sidebar-nav');
         window. appId = 'school-management-app';
        window. firebaseConfig = {
            apiKey: "AIzaSyAu5TDMWepJX7naoG5H3WpGJ1yxAu01whg",
            authDomain: "timetables-470dd.firebaseapp.com",
            projectId: "timetables-470dd",
            storageBucket: "timetables-470dd.appspot.com",
            messagingSenderId: "925422681424",
            appId: "1:925422681424:web:df91ce9de4dfef9c5ec055"
        };

         
// ==========================================
// 1. CONFIGURATION & SCHOOL DETAILS
// ==========================================
window.activeFinancialYear = '2025-2026';
//window.activeAcademicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

window.schoolDetails = {
    fullname: 'KATTILANGADI YATHEEMKHANA HIGHER SECONDARY SCHOOL',
    name: 'KYHSS ATHAVANAD-19094',
    address: 'KATTILANGADI YATHEEMKHANA HIGHER SECONDARY SCHOOL',
    logoUrl: 'KYHSSLOGO.jpg',
    hmSignPng: 'sign3.jpg',
    schoolSealPng: 'SEAL.jpg'
};

// ==========================================
// 2. FIREBASE & AUTHENTICATION
// ==========================================
window.db = null;
window.auth = null;
window.currentUserRole = null;
window.selectedUser = null;

// ==========================================
// 3. CORE ENTITIES (People & Structure)
// ==========================================
window.students = [];
window.getStudents = async (classId, division, examId) => {
  let students = [];
  if (classId && division && examId) {
  const allLocalMarks = await appDb.marks.where({ classId, division, examId}).toArray();//where({ classId, division })
                allLocalMarks.forEach(mark => { students[mark.id] = mark; });
  }else if(classId && division){
    const allLocalMarks = await appDb.marks.where({ classId, division }).toArray();//where({ classId, division })
                allLocalMarks.forEach(mark => { students[mark.id] = mark; });
  }else if(classId){
    const allLocalMarks = await appDb.marks.where({ classId }).toArray();//where({ classId, division })
                allLocalMarks.forEach(mark => { students[mark.id] = mark; });
  }else{
    const allLocalMarks = await appDb.marks.toArray();//where({ classId, division })
                allLocalMarks.forEach(mark => { students[mark.id] = mark; });
  }
  return students;
}
window.teachers = [];
window.classes = [];
window.subjects = [];
window.classroomSubjects = []; // Class-Subject-Teacher mapping
window.teacherAssignedClasses = []; // Specific to logged-in teacher
window.examToEdit = null;
// ==========================================
// 4. ACADEMICS, ATTENDANCE & TIMETABLE
// ==========================================
window.timetables = [];
window.attendance = [];
window.holidays = [];
window.syllabuses = [];
window.syllabusCompletion = [];
window.chapters = [];

// ==========================================
// 5. EXAMS & RESULTS
// ==========================================
window.exams = [];
window.examSchedules = [];
window.examRooms = [];
window.examDuties = [];
window.examAbsentees = [];
window.examRoomAllocationRules = [];
window.examRegistrationSettings = {}; // Single document
let isloadedmarks = false;


window.getmarks = async (classId, division, examId) => {
  const loadMarksBtn = document.getElementById('loadmarks-btn');
  const textBefore = loadMarksBtn ? loadMarksBtn.innerHTML : '';
  if(loadMarksBtn){
    loadMarksBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...`;
  }
  let markss = {};
  let allLocalMarks = [];

  if (classId && division && examId) {
  allLocalMarks = await appDb.marks.where({ classId, division, examId}).toArray();//where({ classId, division })
                
  }else if(classId && division){
    allLocalMarks = await appDb.marks.where({ classId, division }).toArray();//where({ classId, division })
  }else if(classId){
     allLocalMarks = await appDb.marks.where({ classId }).toArray();//where({ classId, division })
               
  }else{
     allLocalMarks = await appDb.marks.toArray();//where({ classId, division })
     if(allLocalMarks.length>0){
      allLocalMarks.forEach(mark => { markss[mark.id] = mark; });
     }
     window.attachMarksListener(teacherAssignedClasses);
     isloadedmarks = true;
     }
  if(allLocalMarks.length>0){
    
  allLocalMarks.forEach(mark => { markss[mark.id] = mark; });
  if(!isloadedmarks){
  window.attachMarksListener([{classId:classId, division:division}]);
  isloadedmarks = true;
  }
  }else{
    window.attachMarksListener([{classId:classId, division:division}]);
    if(!isloadedmarks){
    window.attachMarksListener([{classId:classId, division:division}]);
    getmarks(classId, division, examId);
    isloadedmarks = true;
  }
  }
  if(loadMarksBtn){
    window.updateLoadMarksButton('noChanges');
    }
  return markss;
}

window.activeMarksListeners = {}; // Store multiple listeners

// ==========================================
// 6. LIBRARY MANAGEMENT
// ==========================================
window.books = [];
window.bookIssuances = [];
window.bookAllotments = [];
window.currentLibraryReportData = [];
window.libraryReportSort = {
    column: 'dueDate',
    direction: 'asc'
};

// ==========================================
// 7. FEES & FINANCE
// ==========================================
window.feeStructures = [];
window.studentFeeSetups = [];
window.receipts = [];
window.pendingPayments = [];

// ==========================================
// 8. ARTS FEST & EVENTS
// ==========================================
window.fests = [];
window.festHouses = [];
window.festEvents = [];
window.festGroups = [];
window.festRegistrations = [];
window.festResults = [];
window.festSettings = {};
window.festParticipantFilters = {
    festId: '',
    classId: ''
};

// ==========================================
// 9. FORMS & SURVEYS
// ==========================================
window.forms = [];
window.formResponses = [];

// ==========================================
// 10. MISCELLANEOUS DATA
// ==========================================
window.reports = [];
window.vehicles = [];
window.customNotifications = [];

// ==========================================
// 11. UI STATE & EDITING PLACEHOLDERS
// ==========================================
window.currentViewId = null;
window.apptitle = null; // Will be set by main script

// -- Temporary Editing Objects --
window.classToEdit = null;
window.teacherToEdit = null;
window.studentToEdit = null;
window.subjectToEdit = null;
window.allocationToEdit = null;
window.roomToEdit = null;
window.receiptToEdit = null;
window.feeStructureToEdit = null;
window.formToEdit = null;
window.houseToEdit = null;
window.festToEdit = null;
window.eventToEdit = null;

// -- UI Components Instances --
window.attendanceChart = null;
window.completionModalInstance = null;

// ==========================================
// 12. IMAGE PROCESSING (CROPPER)
// ==========================================
window.cropper = null;
window.rawPhotoFile = null;
window.croppedPhotoBlob = null;
window.currentPhotoURL = '';

// ==========================================
// 13. SYSTEM & LOADING STATE
// ==========================================
window.unsubscribeListeners = [];
window.unsubscribeFeeListeners = [];
window.dataLoadStatus = {};
window.initialDataPromises = {};
window.collectionLoadPromises = {};

// -- Dashboard Caching --
window.isDashboardDataLoaded = false;
window.dashboardStats = {};

// Log to confirm initialization

        window. adminNav = [
  { id: 'dashboard', icon: 'fa-tachometer-alt', text: 'Dashboard' },
  { id: 'add-student', icon: 'fa-user-plus', text: 'Add Student' },
  { id: 'student-mgt', icon: 'fa-users', text: 'Student Management' },
  { id: 'progression-mgt', icon: 'fa-user-graduate', text: 'Progression' }, // <-- ADD THIS LINE
  
  { id: 'teacher-mgt', icon: 'fa-chalkboard-teacher', text: 'Teacher Management' },
  { id: 'class-mgt', icon: 'fa-school', text: 'Class Management' },
  { id: 'subject-mgt', icon: 'fa-book', text: 'Subject Management' },
  { id: 'subject-allocation', icon: 'fa-tasks', text: 'Subject Allocation' },
  { id: 'exam-mgt', icon: 'fa-file-signature', text: 'Exam Management' },
  { id: 'exam-control', icon: 'fa-clipboard-check', text: 'Exam Control' }, // <-- ADD THIS LINE
  { id: 'exam-reports', icon: 'fa-chart-pie', text: 'Exam Toppers' }, // <-- NEW TOP-LEVEL MODULE
  { id: 'fee-mgt', icon: 'fa-receipt', text: 'Fee Management' },
  { id: 'attendance-mgt', icon: 'fa-calendar-check', text: 'Attendance' },
  { id: 'holiday-mgt', icon: 'fa-calendar-alt', text: 'Holiday Management' },
  { id: 'syllabus-tracker', icon: 'fa-tasks', text: 'Syllabus Tracker' },
  { id: 'form-mgt', icon: 'fa-wpforms', text: 'Form Creator' },
  { id: 'classwise-forms', icon: 'fa-edit', text: 'ClassWiseEntry' },
  { id: 'reports', icon: 'fa-chart-bar', text: 'Reports' }, // <-- ADD THIS LINE
  { id: 'school-details', icon: 'fa-university', text: 'School Details' }, // <-- ADD THIS
  { id: 'vehicle-mgt', icon: 'fa-bus', text: 'Vehicle Mgt' }, // <-- ADD THIS LINE
  { id: 'library-mgt', icon: 'fa-book-reader', text: 'Library Management' },
  { id: 'bulk-import', icon: 'fa-file-import', text: 'Bulk Import' },
  { id: 'fest-mgt', icon: 'fa-trophy', text: 'Fest Management' },
  { id: 'timetable-mgt', icon: 'fa-calendar-alt', text: 'Timetable Mgt' },
  { id: 'birthdays', icon: 'fa-birthday-cake', text: 'Today\'s Birthdays' }, // 🎂 Add this line
{ id: 'student-360-profile', icon: 'fa-user-circle', text: 'Student 360° Profile' }, 
{ id: 'fest-scoreboard', icon: 'fa-chart-line', text: 'Live Scoreboard' },
{ id: 'master-control', icon: 'fa-cogs', text: 'Master Control' },
{ id: 'data-migration', icon: 'fa-database', text: 'Data Migration Tool' }, // <-- ADD THIS LINE
  { id: 'settings', icon: 'fa-cog', text: 'Settings' },
  {id: 'notification-mgt', icon: 'fa-bullhorn', text: 'Notification Manager'},
  { id: 'bulk-manager', icon: 'fa-database', text: 'Bulk Manager' },

 
];
window. teacherNav = [
  { id: 'dashboard', icon: 'fa-tachometer-alt', text: 'Dashboard' },
  { id: 'student-mgt', icon: 'fa-users', text: 'Student List' },
  { id: 'student-360-profile', icon: 'fa-user-circle', text: 'Student 360° Profile' }, 
  { id: 'attendance-mgt', icon: 'fa-calendar-check', text: 'My Class Attendance' },
  { id: 'exam-mgt', icon: 'fa-file-signature', text: 'Mark Entry' },
  { id: 'syllabus-tracker', icon: 'fa-tasks', text: 'Syllabus Tracker' },
  { id: 'teacher-forms', icon: 'fa-clipboard-check', text: 'Forms' }, // ✅ NEW
  //{ id: 'response-forms', icon: 'fa-table', text: 'Form Responses' },
  { id: 'classwise-forms', icon: 'fa-edit', text: 'Class Data Entry' },
  { id: 'mark-absentee', icon: 'fa-user-times', text: 'Mark Absentee' }, 
  { id: 'fee-details', icon: 'fa-receipt', text: 'FeeDetails'},
  { id: 'exam-timetable', icon: 'fa-calendar-alt', text: 'Exam Timetable' },
  { id: 'exam-reports', icon: 'fa-chart-pie', text: 'Exam Toppers' }, // <-- NEW TOP-LEVEL MODULE
  { id: 'class-timetable', icon: 'fa-calendar-days', text: 'Class Timetable' },{ id: 'library-mgt', icon: 'fa-book-reader', text: 'Library Management' },
{ id: 'class-timetable', icon: 'fa-calendar-days', text: 'Class Timetable' },
{ id: 'birthdays', icon: 'fa-birthday-cake', text: 'Today\'s Birthdays' }, // 🎂 Add this line

{ id: 'library-status', icon: 'fa-books', text: 'Library Status' },
{ id: 'fest-registration', icon: 'fa-user-check', text: 'Fest Registration' },
{ id: 'fest-scoreboard', icon: 'fa-chart-line', text: 'Live Scoreboard' },
{ id: 'progression-mgt', icon: 'fa-user-graduate', text: 'Class Progression' }, // <-- ADD THIS LINE

];
window. studentNav = [
  { id: 'dashboard', icon: 'fa-tachometer-alt', text: 'Dashboard' },
  { id: 'my-results', icon: 'fa-poll', text: 'My Results' },
  { id: 'my-attendance', icon: 'fa-calendar-alt', text: 'My Attendance' },
  { id: 'my-fees', icon: 'fa-rupee-sign', text: 'My Fees' },
  { id: 'forms', icon: 'fa-clipboard-check', text: 'Forms' }, // ✅ NEW
  { id: 'my-forms', icon: 'fa-file-alt', text: 'My Submissions' } ,// In your adminNav array
{ id: 'class-timetable', icon: 'fa-calendar-days', text: 'Class Timetable' },
{ id: 'my-library', icon: 'fa-book-open', text: 'My Library' },
{ id: 'my-fest-events', icon: 'fa-running', text: 'My Fest Events' },
{ id: 'fest-scoreboard', icon: 'fa-chart-line', text: 'Live Scoreboard' },


];

// ==========================================
// SYSTEM CONFIGURATION (Loaded from DB)
// ==========================================
window.systemConfig = {
    activeYear: '2025-2026',     // Default fallback
    admissionYear:'2026-2027',
    isProgressionActive: false,  // Master switch for promotion
};

// We will map the DB data to this object at startup
console.log("✅ System Config variables initialized.");
