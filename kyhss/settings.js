import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * 1. LOAD SETTINGS (Call this in your main initializeApp function)
 * Fetches the master configuration from Firestore.
 */
window.fetchSystemSettings = async () => {
    try {
        // Path: artifacts/{appId}/settings/masterConfig
        const configRef = doc(window.db, `artifacts/${window.appId}/settings/masterConfig`);
        const snapshot = await getDoc(configRef);

        if (snapshot.exists()) {
            const data = snapshot.data();
            
            // Update Global State
            window.systemConfig = { ...window.systemConfig, ...data };
            
            // // Update School Details if present in DB
            // if (data.schoolDetails) {
            //     window.schoolDetails = { ...window.schoolDetails, ...data.schoolDetails };
            // }

            console.log("⚙️ System Settings Loaded:", window.systemConfig);
            
            // Update UI Header immediately
            const yearBadge = document.getElementById('current-year-display');
            if(yearBadge) yearBadge.textContent = window.systemConfig.activeYear;

        } else {
            console.warn("⚠️ No System Settings found. Using defaults.");
            // Optional: Create default doc if missing
            await setDoc(configRef, window.systemConfig);
        }

    } catch (error) {
        console.error("Error loading settings:", error);
    }
};

/**
 * 2. RENDER UI: The "Control Panel"
 */
window.renderSettingsModule = () => {
    const mainContent = document.getElementById('main-content');
    const config = window.systemConfig;
    const school = window.schoolDetails;

    mainContent.innerHTML = `
        <div class="container-fluid">
            <h1 class="h3 mb-4 text-gray-800"> <i class="fas fa-cogs me-2"></i>System Settings</h1>

            <div class="row">
                
                <div class="col-lg-6 mb-4">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3 bg-primary text-white">
                            <h6 class="m-0 fw-bold">Academic Year Configuration</h6>
                        </div>
                        <div class="card-body">
                            <form id="year-settings-form">
                                <div class="mb-3">
                                    <label class="form-label fw-bold">Active Academic Year</label>
                                    <input type="text" id="set-active-year" class="form-control" value="${config.activeYear}" placeholder="e.g. 2024-2025">
                                    <small class="text-muted">Changing this affects which classes are loaded.</small>
                                </div>

                                <div class="mb-3 p-3 border rounded bg-light">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="set-progression-toggle" ${config.isProgressionActive ? 'checked' : ''}>
                                        <label class="form-check-label fw-bold" for="set-progression-toggle">Enable Progression Module (Promotion)</label>
                                    </div>
                                    <small class="text-danger">
                                        <i class="fas fa-exclamation-triangle me-1"></i>
                                        Only enable this when you are ready to promote students to the next year.
                                    </small>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-lg-6 mb-4">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3 bg-success text-white">
                            <h6 class="m-0 fw-bold">School Identity (For Reports/TCs)</h6>
                        </div>
                        <div class="card-body">
                            <form id="school-details-form">
                                <div class="mb-3">
                                    <label class="form-label">School Full Name</label>
                                    <input type="text" id="set-school-name" class="form-control" value="${school.fullname}">
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">School Code</label>
                                        <input type="text" id="set-school-code" class="form-control" value="${school.code || ''}">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Phone Number</label>
                                        <input type="text" id="set-school-phone" class="form-control" value="${school.phone || ''}">
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Email</label>
                                    <input type="email" id="set-school-email" class="form-control" value="${school.email || ''}">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Principal Name (For TCs)</label>
                                    <input type="text" id="set-principal-name" class="form-control" value="${school.principalName || ''}">
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

            </div>

            <div class="d-grid gap-2 d-md-flex justify-content-md-end mb-5">
                <button class="btn btn-primary btn-lg px-5" onclick="window.saveSystemSettings()">
                    <i class="fas fa-save me-2"></i> Save All Changes
                </button>
            </div>
        </div>
    `;
};

/**
 * 3. SAVE LOGIC
 */
window.saveSystemSettings = async () => {
    const btn = document.querySelector('button[onclick="window.saveSystemSettings()"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Saving...`;

    try {
        // 1. Gather Data
        const newConfig = {
            activeYear: document.getElementById('set-active-year').value.trim(),
            isProgressionActive: document.getElementById('set-progression-toggle').checked,
            lastUpdated: serverTimestamp(),
            // Store school details nested
            schoolDetails4: {
                fullname: document.getElementById('set-school-name').value.trim(),
                code: document.getElementById('set-school-code').value.trim(),
                phone: document.getElementById('set-school-phone').value.trim(),
                email: document.getElementById('set-school-email').value.trim(),
                principalName: document.getElementById('set-principal-name').value.trim()
            }
        };

        // 2. Save to Firestore
        const configRef = doc(window.db, `artifacts/${window.appId}/public/data/settings/masterConfig`);
        await setDoc(configRef, newConfig, { merge: true });

        // 3. Update Local State Immediately
        window.systemConfig.activeYear = newConfig.activeYear;
        window.systemConfig.isProgressionActive = newConfig.isProgressionActive;
        window.schoolDetails = { ...window.schoolDetails, ...newConfig.schoolDetails };

        // 4. Update UI Elements
        const yearBadge = document.getElementById('current-year-display');
        if(yearBadge) yearBadge.textContent = newConfig.activeYear;

        showAlert('Settings saved successfully!', 'success');

        // Optional: Reload page if Academic Year changed to force data refresh
        if (window.systemConfig.activeYear !== newConfig.activeYear) {
            setTimeout(() => window.location.reload(), 1500);
        }
        const updatedLocalData = await appDb['classes'].toArray();
        const config = window.classes;
         const filtered = updatedLocalData.filter(item => item.academicYear === window.systemConfig.activeYear);
        config.setter(filtered);                      
                                
                                

    } catch (error) {
        console.error("Save failed:", error);
        showAlert('Failed to save settings.', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};