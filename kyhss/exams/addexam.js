import {setDoc, updateDoc, serverTimestamp} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

 /**
 * Renders the "Add Exam" tab, now including an 'isActive' field on creation.
 */
window.renderExamAddTab = async function() {
    const container = document.getElementById('add-exam');
    if (!container) return; // Exit if the container isn't on the page

    const isEditMode = window.examToEdit !== null;
    const currentExam = window.examToEdit || {}; // Use current exam or empty object

    container.innerHTML = `
        <div class="row">
            <div class="col-lg-12"> <div class="card shadow mb-4">
                    <div class="card-header fw-bold text-primary">
                        ${isEditMode ? `Edit Exam: ${currentExam.name}` : 'Add Exam Title'}
                    </div>
                    <div class="card-body">
                        <form id="add-exam-form">
                            <div class="mb-3">
                                <label class="form-label">Sector</label>
                                <input id="exam-sector" class="form-control" placeholder="e.g., SCHOOL or MADRASSA" 
                                       value="${currentExam.sector || 'SCHOOL'}" required ${isEditMode ? 'readonly' : ''}>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Exam Name</label>
                                <input id="exam-name" class="form-control" placeholder="e.g., QUARTERLY EXAM" 
                                       value="${currentExam.name || ''}" required>
                            </div>
                            
                            <div class="d-flex justify-content-around mb-3">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" role="switch" id="exam-is-active" 
                                           ${(isEditMode ? currentExam.isActive : true) ? 'checked' : ''}>
                                    <label class="form-check-label" for="exam-is-active">Is Active</label>
                                </div>
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" role="switch" id="exam-is-published" 
                                           ${(currentExam.isPublished || false) ? 'checked' : ''}>
                                    <label class="form-check-label" for="exam-is-published">Publish Results</label>
                                </div>
                            </div>
                            
                            <div class="d-flex justify-content-end gap-2">
                                ${isEditMode ? `<button type="button" class="btn btn-secondary" onclick="window.clearExamEdit()">Cancel</button>` : ''}
                                <button type="submit" class="btn btn-primary">
                                    ${isEditMode ? 'Update Exam' : 'Add Exam'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <div class="col-lg-12"> <div class="card shadow">
                    <div class="card-header fw-bold">Existing Exams</div>
                    <div class="card-body" id="exams-list">
                        </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('add-exam-form').addEventListener('submit', async e => { 
        e.preventDefault(); 
        const examName = document.getElementById('exam-name').value;
        const sector = document.getElementById('exam-sector').value;
        
        // --- NEW: Read from toggles and form ---
        const isActive = document.getElementById('exam-is-active').checked;
        const isPublished = document.getElementById('exam-is-published').checked;

        if(examName && sector) {
            // --- NEW: Handle both Edit and Add ---
            const examId = isEditMode ? 
                window.examToEdit.id : // Use existing ID if editing
                `${window.activeFinancialYear.replace('-', '')}_${examName.replace(/\s+/g, '_').toUpperCase()}`; // Create new ID if adding

            const examData = {
                ...window.examToEdit, // Spread existing data (like posterSettings)
                id: examId,
                name: examName,
                sector: sector,
                isActive: isActive,
                isPublished: isPublished,
                lastUpdated: serverTimestamp()
            };

            await setDoc(window.getDocRef('exams', examId), examData, { merge: true });
            showAlert(`Exam '${examName}' ${isEditMode ? 'updated' : 'added'}.`, 'success');
            
            clearExamEdit(); // This will reset the form
        }
    });
    
    // This function call remains the same, but the list it renders will be updated
    renderExamsList();
}

/**
 * Renders the list of existing exams, now with an "Is Active" toggle switch.
 */
function renderExamsList() {
    const list = document.getElementById('exams-list');
    if (!list) return;

    // Sort exams to show active ones first
    const sortedExams = [...exams].sort((a, b) => (b.isActive || false) - (a.isActive || false));

    list.innerHTML = sortedExams.length > 0 ? 
        `<ul class="list-group list-group-flush">${sortedExams.map(e => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>${e.name} <span class="badge bg-secondary">${e.sector}</span></span>
                <div class="d-flex align-items-center">
                    <div class="form-check form-switch me-3">
                        <input class="form-check-input" type="checkbox" role="switch" 
                               id="exam-toggleS-${e.id}" ${e.isActive ? 'checked' : ''} 
                               onchange="window.toggleExamStatus('${e.id}', this.checked)">
                        <label class="form-check-label" for="exam-toggleS-${e.id}">${e.isActive ? 'Active' : 'Inactive'}</label>
                    </div>
                    <div class="form-check form-switch me-3">
                        <input class="form-check-input" type="checkbox" role="switch" 
                               id="exam-toggle-${e.id}" ${e.isPublished ? 'checked' : ''} 
                               onchange="window.toggleExamStatusPublish('${e.id}', this.checked)">
                        <label class="form-check-label" for="exam-toggle-${e.id}">${e.isActive ? 'Published' : 'Unpublish'}</label>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.handleDeleter('exams', '${e.id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </li>`).join('')}
        </ul>` : 
        `<p class="text-muted">No exams created.</p>`;
}

/**
 * NEW: Updates the 'isActive' status of an exam in Firestore.
 * @param {string} examId The ID of the exam to update.
 * @param {boolean} newStatus The new status (true for active, false for inactive).
 */
window.toggleExamStatusPublish = async function(examId, newStatus) {
    try {
        const examRef = window.getDocRef('exams', examId);
        await updateDoc(examRef, { isPublished: newStatus });
        showAlert(`Exam status updated to ${newStatus ? 'Active' : 'Inactive'}.`, 'success');
        // The real-time listener will automatically call renderExamsList() to refresh the UI.
    } catch (error) {
        console.error("Error updating exam status:", error);
        showAlert('Failed to update exam status.', 'danger');
    }
};
window.toggleExamStatus = async function(examId, newStatus) {
    try {
        const examRef = window.getDocRef('exams', examId);
        await updateDoc(examRef, { isActive: newStatus });
        showAlert(`Exam status updated to ${newStatus ? 'Active' : 'Inactive'}.`, 'success');
        // The real-time listener will automatically call renderExamsList() to refresh the UI.
    } catch (error) {
        console.error("Error updating exam status:", error);
        showAlert('Failed to update exam status.', 'danger');
    }
};
        

/**
 * Sets the form to edit a specific exam.
 * @param {string} examId - The ID of the exam to edit.
 */
window.editExamDetails = (examId) => {
    window.examToEdit = window.exams.find(e => e.id === examId);
    if (!window.examToEdit) {
        return showAlert('Could not find that exam to edit.', 'danger');
    }

    // This logic handles finding the correct "Add Exam" form to update,
    // whether it's in the "Exam Selection" screen or the "Exam Control" tab.
    
    let container = document.getElementById('add-exam-container');
    let formId = 'add-exam';

    if (container) {
        // We are on the Exam Selection screen
        container.innerHTML = `<div id="${formId}"></div>`;
        renderExamAddTab();
        
        // This is your clever hack to hide the redundant list; we must re-apply it.
        const examListInCard = container.querySelector('#exams-list');
        if (examListInCard) {
            examListInCard.parentElement.style.display = 'none';
        }
        // Scroll to the form for editing
        container.scrollIntoView({ behavior: 'smooth' });

    } else if (document.getElementById('add-exam')) {
        // We are on the "Exam Control" screen's "Add Exam" tab
        renderExamAddTab();
    }
};

/**
 * Clears the exam edit state and resets the form.
 */

window.clearExamEdit = () => {
    window.examToEdit = null;
    
    // Re-render the form container wherever it might be
    let container = document.getElementById('add-exam-container');
    if (container) {
        container.innerHTML = '<div id="add-exam"></div>';
        renderExamAddTab();
        const examListInCard = container.querySelector('#exams-list');
        if (examListInCard) {
            examListInCard.parentElement.style.display = 'none';
        }
    } else if (document.getElementById('add-exam')) {
        renderExamAddTab();
    }
};
/**
 * Sets the form to edit a specific exam.
 * @param {string} examId - The ID of the exam to edit.
 */
window.editExamDetails = (examId) => {
    window.examToEdit = window.exams.find(e => e.id === examId);
    if (!window.examToEdit) {
        return showAlert('Could not find that exam to edit.', 'danger');
    }

    // This logic handles finding the correct "Add Exam" form to update,
    // whether it's in the "Exam Selection" screen or the "Exam Control" tab.
    
    let container = document.getElementById('add-exam-container');
    let formId = 'add-exam';

    if (container) {
        // We are on the Exam Selection screen
        container.innerHTML = `<div id="${formId}"></div>`;
        renderExamAddTab();
        
        // This is your clever hack to hide the redundant list; we must re-apply it.
        const examListInCard = container.querySelector('#exams-list');
        if (examListInCard) {
            examListInCard.parentElement.style.display = 'none';
        }
        // Scroll to the form for editing
        container.scrollIntoView({ behavior: 'smooth' });

    } else if (document.getElementById('add-exam')) {
        // We are on the "Exam Control" screen's "Add Exam" tab
        renderExamAddTab();
    }
};

/**
 * Clears the exam edit state and resets the form.
 */
window.clearExamEdit = () => {
    window.examToEdit = null;
    
    // Re-render the form container wherever it might be
    let container = document.getElementById('add-exam-container');
    if (container) {
        container.innerHTML = '<div id="add-exam"></div>';
        renderExamAddTab();
        const examListInCard = container.querySelector('#exams-list');
        if (examListInCard) {
            examListInCard.parentElement.style.display = 'none';
        }
    } else if (document.getElementById('add-exam')) {
        renderExamAddTab();
    }
};
/**
 * Helper function to set the global state and re-render the module.
 * @param {string} examId The ID of the exam to manage.
 */
window.selectExamToManage = (examId) => {
    window.selectedExamForControl = examId;
    renderExamControlModule(); // This will now render the dashboard
};

/**
 * Helper function to clear the global state and return to the selection screen.
 */
window.unselectExam = () => {
    window.selectedExamForControl = null;
    renderExamControlModule(); // This will now render the selection screen
};
       function renderExamControlOverviewTab() {
    const container = document.getElementById('exam-control-overview');
    if (!container) return;

    // This tab is now much simpler. It just displays details for the selected exam.
    // The dropdown is removed.
    container.innerHTML = `
        <div id="exam-overview-details-container">
            <p class="text-muted text-center p-4">Loading exam details...</p>
        </div>
    `;

    if (window.selectedExamForControl) {
        displayExamOverviewDetails(window.selectedExamForControl);
    } else {
        document.getElementById('exam-overview-details-container').innerHTML = 
            `<p class="text-muted text-center p-4">No exam selected.</p>`;
    }
}
