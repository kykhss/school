// backup.js

// 1. Import necessary Firebase functions
// Adjust the source URL below to match what you use in your main file
import { collection, getDocs ,query} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// import { collection, getDocs } from "firebase/firestore"; // Use this if you use a bundler like Webpack/Vite
/**
 * 2. Renders the Backup Module UI
 */


window.renderBackupDataModule = () => {
    const mainContent = document.getElementById('main-content');
    
    const collections = [
        { id: 'students', label: 'Students' },
        { id: 'teachers', label: 'Teachers' },
        { id: 'classes', label: 'Classes / ClassroomSubjects' },
        { id: 'exams', label: 'Exams' },
        { id: 'examDuties', label: 'Exam Duties' },
        { id: 'examRooms', label: 'Exam Rooms' },
        { id: 'examRoomAllocationRules', label: 'Allocations (Rules)' }
    ];

    mainContent.innerHTML = `
        <h1 class="h2 mb-4">System Backup</h1>
        
        <div class="card shadow mb-4">
            <div class="card-header py-3 bg-primary text-white">
                <h6 class="m-0 fw-bold"><i class="fas fa-database me-2"></i>Export Data to Excel</h6>
            </div>
            <div class="card-body">
                <p class="text-muted">Select the collections you want to backup. This will generate a single Excel file with multiple sheets.</p>
                
                <div class="row mb-3">
                    <div class="col-12">
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="backup-select-all" onchange="window.toggleBackupCheckboxes(this)">
                            <label class="form-check-label fw-bold" for="backup-select-all">Select All</label>
                        </div>
                        <hr>
                        <div class="row" id="backup-collections-list">
                            ${collections.map(col => `
                                <div class="col-md-4 mb-2">
                                    <div class="form-check">
                                        <input class="form-check-input backup-checkbox" type="checkbox" value="${col.id}" id="chk-${col.id}">
                                        <label class="form-check-label" for="chk-${col.id}">${col.label}</label>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div id="backup-status" class="alert alert-info d-none"></div>

                <button id="start-backup-btn" class="btn btn-success btn-lg" onclick="window.initiateExcelBackup()">
                    <i class="fas fa-file-excel me-2"></i>Start Backup
                </button>
            </div>
        </div>
    `;
};

/**
 * 3. Helper: Toggle all checkboxes
 */
window.toggleBackupCheckboxes = (source) => {
    const checkboxes = document.querySelectorAll('.backup-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
};
/**
 * Helper to handle nested objects (Firestore Timestamps, Arrays)
 * so they look readable in Excel cells.
 */
  window.flattenObjectForExcel = (obj) =>  {
    const newObj = {};
    for (const key in obj) {
        const value = obj[key];
        
        if (value === null || value === undefined) {
            newObj[key] = "";
        }
        // Handle Firestore Timestamp
        else if (typeof value === 'object' && value.seconds !== undefined) {
            newObj[key] = new Date(value.seconds * 1000).toLocaleString('en-GB');
        } 
        // Handle Arrays
        else if (Array.isArray(value)) {
             newObj[key] = value.map(v => (typeof v === 'object' ? JSON.stringify(v) : v)).join(', ');
        } 
        // Handle Objects
        else if (typeof value === 'object') {
            newObj[key] = JSON.stringify(value);
        }
        else {
            newObj[key] = value;
        }
    }
    return newObj;
}
/** 4. Initiates the Excel Backup Process
 */
window.initiateExcelBackup = async () => {
    // ==========================================
    // 1. VALIDATION
    // ==========================================
    if (typeof window.db === 'undefined' || typeof window.appId === 'undefined') {
        alert("Error: Database connection (db) or App ID is missing. Ensure variables.js is loaded.");
        return;
    }

    const checkboxes = document.querySelectorAll('.backup-checkbox:checked');
    const selectedCollections = Array.from(checkboxes).map(cb => cb.value);

    if (selectedCollections.length === 0) {
        alert('Please select at least one collection to backup.');
        return;
    }

    // ==========================================
    // 2. UI UPDATE (LOCK BUTTON)
    // ==========================================
    const btn = document.getElementById('start-backup-btn');
    const statusDiv = document.getElementById('backup-status');
    
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Processing...`;
    statusDiv.classList.remove('d-none');
    statusDiv.className = 'alert alert-info';
    statusDiv.textContent = 'Initializing backup...';

    try {
        // ==========================================
        // 3. CREATE WORKBOOK
        // ==========================================
        const wb = XLSX.utils.book_new();
        const dateStr = new Date().toISOString().slice(0,10);

        for (const colName of selectedCollections) {
            statusDiv.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>Fetching collection: <strong>${colName}</strong>...`;
            
            // ==========================================
            // 4. FETCH DATA FROM FIRESTORE
            // ==========================================
            const queryRef = collection(window.db, `artifacts/${window.appId}/public/data/${colName}`);
            const snapshot = await getDocs(queryRef);
            
            if (snapshot.empty) {
                console.warn(`Collection ${colName} is empty. Skipping sheet.`);
                continue; 
            }

            // ==========================================
            // 5. PROCESS & FLATTEN DATA
            // ==========================================
            const data = snapshot.docs.map(doc => {
                const docData = doc.data();
                // Add ID as first column and flatten nested objects
                return { _ID: doc.id, ...window.flattenObjectForExcel(docData) };
            });

            // ==========================================
            // 6. ADD SHEET TO WORKBOOK
            // ==========================================
            const ws = XLSX.utils.json_to_sheet(data);
            // Excel sheet names cannot exceed 31 chars
            const safeSheetName = colName.length > 30 ? colName.substring(0, 30) : colName;
            XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
        }

        // ==========================================
        // 7. SAVE FILE (BLOB METHOD)
        // ==========================================
        statusDiv.textContent = 'Generating Excel file...';

        const schoolName = (typeof window.schoolDetails !== 'undefined' && window.schoolDetails.name) 
                            ? window.schoolDetails.name.replace(/[^a-z0-9]/gi, '_') 
                            : 'School_Data';
        const fileName = `Backup_${schoolName}_${dateStr}.xlsx`;

        // A. Create Binary String
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

        // B. Convert to ArrayBuffer -> Blob
        function s2ab(s) {
            const buf = new ArrayBuffer(s.length);
            const view = new Uint8Array(buf);
            for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
            return buf;
        }
        const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
        const url = window.URL.createObjectURL(blob);

        // C. Trigger Auto-Download
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // ==========================================
        // 8. SUCCESS MESSAGE (WITH MANUAL LINK)
        // ==========================================
        statusDiv.className = 'alert alert-success';
        statusDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span><i class="fas fa-check-circle me-2"></i>Backup Complete!</span>
                <a href="${url}" download="${fileName}" class="btn btn-sm btn-light border fw-bold text-success">
                    <i class="fas fa-download me-1"></i> Download Again
                </a>
            </div>
        `;

    } catch (error) {
        console.error("Backup Error:", error);
        statusDiv.className = 'alert alert-danger';
        statusDiv.innerHTML = `<strong>Error:</strong> ${error.message}`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-file-excel me-2"></i>Start Backup`;
    }
};
/** Exported for testing purposes
 */

/** END OF FILE **/
