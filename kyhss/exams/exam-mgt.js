window.renderExamManagement = () => {
    // 1. Determine user roles for access control
    const isAdmin = window.currentUserRole === 'admin';
    // Use optional chaining (?.) for safety in case selectedUser.roles is null/undefined
    const isExamController = window.currentUserRole === 'teacher' || window.selectedUser.roles?.includes('exam_controller');
    const mainContent = document.getElementById('main-content');
    const apptitle = document.getElementById('app-bar-title');

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
        { id: 'add-exam',          title: 'Add Exam',          roles: ['admin'],               renderFunc: window.renderExamAddTab },
        { id: 'schedule',          title: 'Schedule',          roles: ['admin', 'exam_controller'], renderFunc: window.renderExamScheduleTab },
        { id: 'timetable-view',    title: 'Timetable',         roles: ['admin', 'exam_controller'], renderFunc: window.renderExamTimetableView },
        { id: 'consolidated-view', title: 'Consolidated View', roles: ['admin', 'exam_controller'], renderFunc: window.renderConsolidatedTimetableView },
        { id: 'entry',             title: 'Mark Entry',        roles: ['admin', 'exam_controller'], renderFunc: window.renderMarkEntryTab },
        { id: 'entry-report',      title: 'Entry Report',      roles: ['admin', 'exam_controller'], renderFunc: window.renderEntryReportTab },
        { id: 'results',           title: 'Results',           roles: ['admin', 'exam_controller'], renderFunc: window.renderResultsTab }
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
