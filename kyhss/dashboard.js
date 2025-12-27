import { 
    query, 
    where, 
    getCountFromServer 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

window.renderDashboard = async () => {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return console.error("Main content container not found!");

    // 1. Handle Navigation based on Role
    let navs = window.adminNav;
    if (window.currentUserRole !== "admin") {
        if (window.currentUserRole === "teacher") {
            navs = window.teacherNav;
            // return window.renderTeacherDashboard(); // Uncomment when ready
        } else if (window.currentUserRole === "student") {
            navs = window.studentNav;
            return window.renderStudentDashboardData();
        }
    }

    // 2. Memory Cache Check: If data is already in RAM, show it immediately
    if (window.isDashboardDataLoaded && window.dashboardStats) {
        console.log("🚀 Rendering dashboard from memory cache.");
        renderDashboardHTML(window.dashboardStats);
        return;
    }

    // 3. Show Loading Spinner
    mainContent.innerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center" style="height: 60vh;">
            <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status"></div>
            <p class="mt-3 text-muted fw-bold">Loading Dashboard Statistics...</p>
        </div>`;

    try {
        let shouldFetchFromCloud = false;
        const storedStats = localStorage.getItem('dashboardStats');
        const storedTimestamp = parseInt(localStorage.getItem('dashboardStatsTimestamp') || '0');

        // 4. Stale Data Check (Only if Online)
        if (navigator.onLine) {
            // Check IndexedDB 'lastSynced' to see if data changed since our last dashboard load
            const lastUpdatedRecords = await window.appDb.lastSynced.toArray();
            
            // Collections that affect dashboard counts
            const criticalCollections = ['students', 'teachers', 'classes', 'fests'];
            
            // Check if any critical collection has a newer timestamp than our stored dashboard stats
            const hasNewData = lastUpdatedRecords.some(record => 
                criticalCollections.includes(record.id) && record.timestamp > storedTimestamp
            );

            if (hasNewData || !storedStats) {
                shouldFetchFromCloud = true;
                console.log("🔄 New data detected on server. Refreshing dashboard...");
            }
        }

        // 5. Fetch Data (Cloud vs Local)
        if (navigator.onLine && shouldFetchFromCloud) {
            await fetchDashboardStatsFromCloud();
        } else {
            // Load from LocalStorage if offline or data is fresh enough
            console.log("📂 Loading dashboard from LocalStorage.");
            if (storedStats) {
                window.dashboardStats = JSON.parse(storedStats);
                window.isDashboardDataLoaded = true;
                renderDashboardHTML(window.dashboardStats);
            } else {
                // Edge case: Online but fetch failed, or Offline with no local data
                if (navigator.onLine) await fetchDashboardStatsFromCloud(); // Try force fetch
                else renderDashboardHTML(getEmptyStats()); // Show zeros
            }
        }

    } catch (error) {
        console.error("❌ Error loading dashboard:", error);
        mainContent.innerHTML = `<div class="alert alert-danger m-4">Error loading dashboard: ${error.message}</div>`;
    }
};

/**
 * Helper: Fetch fresh counts from Firestore
 */
window.fetchDashboardStatsFromCloud =async () =>{
    console.log("☁️ Fetching counts from Firestore...");

    // A. Prepare Queries
    const studentsColl = window.getCollectionRef('students');
    const teachersColl = window.getCollectionRef('teachers');
    const classesColl = window.getCollectionRef('classes');
    const festsColl = window.getCollectionRef('fests');

    const activeStudentsQuery = query(studentsColl, where('status', '==', 'Active'));
    const activeTeachersQuery = query(teachersColl, where('status', '==', 'Active'));
    const activeFestsQuery = query(festsColl, where('registrationOpen', '==', true));

    // B. Execute Parallel Requests
    const [studentSnap, teacherSnap, classSnap, festSnap] = await Promise.all([
        getCountFromServer(activeStudentsQuery),
        getCountFromServer(activeTeachersQuery),
        getCountFromServer(classesColl),
        getCountFromServer(activeFestsQuery)
    ]);

    // C. Calculate Financials (From local arrays loaded in memory)
    // Note: ensure 'studentFeeSetups' and 'receipts' are populated in variables.js
    const totalPayable = (window.studentFeeSetups || []).reduce((sum, sfs) => sum + (Number(sfs.totalPayable) || 0), 0);
    const totalPaid = (window.receipts || [])
        .filter(r => !r.isCancelled)
        .reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);

    // D. Construct Stats Object
    const stats = {
        studentCount: studentSnap.data().count,
        teacherCount: teacherSnap.data().count,
        classCount: classSnap.data().count,
        festCount: festSnap.data().count,
        totalBalance: totalPayable - totalPaid
    };

    // E. Update State & Cache
    window.dashboardStats = stats;
    window.isDashboardDataLoaded = true;
    
    localStorage.setItem('dashboardStats', JSON.stringify(stats));
    localStorage.setItem('dashboardStatsTimestamp', Date.now().toString());

    // F. Render
    renderDashboardHTML(stats);
}

/**
 * Helper: Returns zeroed-out stats object
 */
function getEmptyStats() {
    return {
        studentCount: 0,
        teacherCount: 0,
        classCount: 0,
        festCount: 0,
        totalBalance: 0
    };
}

/**
 * Helper: Renders the HTML
 */
function renderDashboardHTML(stats) {
    if (!stats) stats = getEmptyStats();
    const mainContent = document.getElementById('main-content');

    mainContent.innerHTML = `
        <div class="container-fluid">
            <div class="d-sm-flex align-items-center justify-content-between mb-4">
                <h1 class="h3 mb-0 text-gray-800">Dashboard</h1>
                <a href="#" class="d-none d-sm-inline-block btn btn-sm btn-primary shadow-sm">
                    <i class="fas fa-download fa-sm text-white-50"></i> Generate Report
                </a>
            </div>

            <div class="row">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card border-left-primary shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">Total Students</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800">${stats.studentCount}</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-user-graduate fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card border-left-success shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs font-weight-bold text-success text-uppercase mb-1">Teachers</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800">${stats.teacherCount}</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-chalkboard-teacher fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card border-left-info shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs font-weight-bold text-info text-uppercase mb-1">Classes</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800">${stats.classCount}</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-school fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card border-left-warning shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">Pending Fees</div>
                                    <div class="h5 mb-0 font-weight-bold text-gray-800">₹${stats.totalBalance.toLocaleString('en-IN')}</div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-rupee-sign fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Quick Actions</h6>
                        </div>
                        <div class="card-body d-flex gap-2 flex-wrap">
                            <button class="btn btn-outline-primary" onclick="window.navigateTo('add-student')">
                                <i class="fas fa-user-plus me-2"></i>New Admission
                            </button>
                            <button class="btn btn-outline-success" onclick="window.navigateTo('fee-collections')">
                                <i class="fas fa-hand-holding-usd me-2"></i>Collect Fees
                            </button>
                            <button class="btn btn-outline-info" onclick="window.renderAttendance()">
                                <i class="fas fa-calendar-check me-2"></i>Mark Attendance
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.updateDashboardModuleBadges = async () => {
    // 1. Create a count of notifications for each module
    const counts = window. allNotifications.reduce((acc, notification) => {
        const view = notification.targetView;
        if (view) {
            acc[view] = (acc[view] || 0) + 1;
        }
        return acc;
    }, {});

    // 2. Loop over *all* adminNav items to update or hide their badges
    // We check adminNav because only admins see this dashboard.
    navs.forEach(item => {
        const badgeId = `dashboard-badge-${item.id}`;
        const badgeEl = document.getElementById(badgeId);
        
        if (badgeEl) {
            const count = counts[item.id] || 0;
            if (count > 0) {
                badgeEl.textContent = count;
                badgeEl.classList.remove('d-none');
            } else {
                badgeEl.textContent = '';
                badgeEl.classList.add('d-none');
            }
        }
    });
}

