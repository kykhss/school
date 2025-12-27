import { setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
const mainContent = document.getElementById('main-content');
// --- CLASS MANAGEMENT ---
window.renderClassManagement = () => {
    const isEditMode = window.classToEdit !== null;
    
    // Inject Custom Styles for Toggles and Hover effects
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
        .action-btn { transition: all 0.2s; }
        .action-btn:hover { transform: translateY(-2px); }
        .table-hover tbody tr:hover { background-color: #f8f9fa; }
        .toggle-group { display: flex; flex-direction: column; gap: 5px; }
        .fw-medium { font-weight: 500; }
    `;
    document.head.appendChild(styleElement);

    mainContent.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1 class="h3 text-gray-800"><i class="fas fa-chalkboard text-primary me-2"></i>Class Management</h1>
        </div>

        <div class="row">
            <div class="col-lg-4">
                <div class="card shadow-sm border-0 mb-4 sticky-top" style="top: 20px; z-index: 1;">
                    <div class="card-header bg-white py-3 border-bottom-0">
                        <h6 class="m-0 fw-bold text-primary"><i class="fas ${isEditMode ? 'fa-edit' : 'fa-plus-circle'} me-2"></i>${isEditMode ? "Edit Class Details" : "Create New Class"}</h6>
                    </div>
                    <div class="card-body">
                        <form id="class-form">
                            
                            <div class="form-floating mb-3">
                                <input type="text" id="academic-year" class="form-control" required ${isEditMode ? 'readonly' : ''} placeholder="Year">
                                <label for="academic-year">Academic Year</label>
                            </div>

                            <div class="row g-2">
                                <div class="col-8">
                                    <div class="form-floating mb-3">
                                        <input type="text" id="class-name" class="form-control" required ${isEditMode ? 'readonly' : ''} placeholder="Name">
                                        <label for="class-name">Class Name (e.g., CLASS X)</label>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="form-floating mb-3">
                                        <input type="number" id="class-order" class="form-control" required placeholder="10">
                                        <label for="class-order">Order</label>
                                    </div>
                                </div>
                            </div>

                            <div class="row g-2">
                                <div class="col-6">
                                    <div class="form-floating mb-3">
                                        <input type="text" id="class-alias" class="form-control" required placeholder="Alias">
                                        <label for="class-alias">Alias (e.g., 10)</label>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="form-floating mb-3">
                                        <input type="text" id="class-sector" class="form-control" required placeholder="Sector">
                                        <label for="class-sector">Sector (KG, HS)</label>
                                    </div>
                                </div>
                            </div>

                            <div class="form-floating mb-3">
                                <input type="text" id="class-divisions" class="form-control" required placeholder="A,B,C">
                                <label for="class-divisions">Divisions (Comma Separated)</label>
                            </div>

                            <div class="input-group mb-4">
                                <span class="input-group-text"><i class="fas fa-rupee-sign"></i></span>
                                <div class="form-floating">
                                    <input type="number" id="class-admission-fee" class="form-control" required placeholder="Fee">
                                    <label for="class-admission-fee">Admission Fee</label>
                                </div>
                            </div>
                            

                            <div class="form-check form-switch mb-3 p-3 bg-light rounded border">
                                
                                <label class="form-check-label fw-medium" for="form-admission-toggle">Open for Admissions?</label>
                                <input class="form-check-input" type="checkbox" role="switch" id="form-admission-toggle" checked>
                            </div>

                            <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                                <button type="button" id="cancel-edit-btn" class="btn btn-light me-md-2 ${!isEditMode ? 'd-none' : ''}">Cancel</button>
                                <button type="submit" class="btn btn-primary px-4"><i class="fas fa-save me-2"></i>${isEditMode ? "Update" : "Save Class"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <div class="col-lg-8">
                <div class="card shadow-sm border-0 mb-4">
                    <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                        <h6 class="m-0 fw-bold text-primary">Class List</h6>
                        <span class="badge bg-light text-dark border">Sorted by Order</span>
                    </div>
                    <div class="card-body p-0" id="classes-list-container">
                        </div>
                </div>
            </div>
        </div>`;

    renderClassesList();
    
    // Bind Elements
    const form = document.getElementById('class-form');
    const yearInput = document.getElementById('academic-year');
    const nameInput = document.getElementById('class-name');
    const orderInput = document.getElementById('class-order');
    const aliasInput = document.getElementById('class-alias');
    const divInput = document.getElementById('class-divisions');
    const admissionFeeInput = document.getElementById('class-admission-fee');
    const sectorInput = document.getElementById('class-sector');
    const admissionToggleInput = document.getElementById('form-admission-toggle'); // New Input

    // Populate Form if Edit Mode
    if (isEditMode) {
        yearInput.value = classToEdit.year;
        nameInput.value = classToEdit.name;
        orderInput.value = classToEdit.order || '';
        aliasInput.value = classToEdit.alias;
        divInput.value = (classToEdit.divisions || []).join(', ');
        admissionFeeInput.value = classToEdit.admissionFee || '';
        sectorInput.value = classToEdit.sector || '';
        admissionToggleInput.checked = classToEdit.admissionOpen !== false; // Default true if undefined
    } else {
        yearInput.value = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    }

    document.getElementById('cancel-edit-btn').addEventListener('click', () => { classToEdit = null; renderClassManagement(); });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const docId = isEditMode ? classToEdit.id : `${yearInput.value}_${nameInput.value.toUpperCase().replace(/\s+/g, '_')}`;
        const data = {
            id: docId,
            year: yearInput.value,
            name: nameInput.value.toUpperCase(),
            order: parseInt(orderInput.value, 10) || 0,
            alias: aliasInput.value.toUpperCase(),
            divisions: divInput.value.split(',').map(d => d.trim().toUpperCase()).filter(Boolean),
            admissionFee: parseFloat(admissionFeeInput.value) || 0,
            sector: sectorInput.value.toUpperCase() || "GENERAL",
            admissionOpen: admissionToggleInput.checked, // New Field
            isActive: true, // Default active on create
            lastUpdated: serverTimestamp()
        };
        await setDoc(window.getDocRef('classes', docId), data, { merge: true });
        window.showAlert(`Class '${data.name}' ${isEditMode ? 'updated' : 'saved'} successfully.`, 'success');
        classToEdit = null;
        renderClassManagement();
    });
};

// --- RENDER LIST (Updated to Table View) ---
function renderClassesList() {
    const container = document.getElementById('classes-list-container');
    if (!container) return;
    if (!classes || classes.length === 0) { 
        container.innerHTML = `<div class="p-5 text-center text-muted"><i class="fas fa-folder-open fa-2x mb-3"></i><p>No classes found. Add one to get started.</p></div>`; 
        return; 
    }
    
    const sortedClasses = [...classes].sort((a, b) => (a.order || 0) - (b.order || 0));

    container.innerHTML = `
    <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
            <thead class="bg-light">
                <tr>
                    <th class="ps-4">Class Name</th>
                    <th>Info</th>
                    <th>Divisions</th>
                    <th>Fee</th>
                    <th class="text-center">Controls</th>
                    <th class="text-end pe-4">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${sortedClasses.map(cls => {
                    // Check logic
                    const isAdmOpen = cls.admissionOpen !== false; 
                    const isActive = cls.isActive !== false;

                    return `
                    <tr class="${!isActive ? 'bg-light text-muted' : ''}">
                        <td class="ps-4">
                            <div class="fw-bold text-dark">${cls.name}</div>
                            <small class="text-muted">Alias: ${cls.alias}</small>
                        </td>
                        <td>
                            <span class="badge bg-info text-dark mb-1">${cls.sector || 'GEN'}</span><br>
                            <small class="text-muted">Order: ${cls.order}</small>
                        </td>
                        <td>
                            <div style="max-width: 150px; white-space: normal;">
                                ${(cls.divisions || []).map(d => `<span class="badge bg-secondary me-1 mb-1">${d}</span>`).join('')}
                            </div>
                        </td>
                        <td class="fw-medium text-success">₹${cls.admissionFee || 0}</td>
                        
                        <td>
                            <div class="toggle-group">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" role="switch" 
                                           id="active-${cls.id}" ${isActive ? 'checked' : ''} 
                                           onchange="window.toggleField('${cls.id}', 'isActive', this.checked)">
                                    <label class="form-check-label small" for="active-${cls.id}">${isActive ? 'Active' : 'Inactive'}</label>
                                </div>
                                
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" role="switch" 
                                           id="adm-${cls.id}" ${isAdmOpen ? 'checked' : ''} 
                                           onchange="window.toggleField('${cls.id}', 'admissionOpen', this.checked)">
                                    <label class="form-check-label small ${isAdmOpen ? 'text-primary' : 'text-muted'}" for="adm-${cls.id}">Admissions</label>
                                </div>
                            </div>
                        </td>

                        <td class="text-end pe-4">
                            <button onclick="window.handleEditClass('${cls.id}')" class="btn btn-sm btn-light text-primary action-btn shadow-sm me-1" title="Edit">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button onclick="window.handleDelete('classes', '${cls.id}')" class="btn btn-sm btn-light text-danger action-btn shadow-sm" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>`;
}

// --- HANDLERS ---

window.handleEditClass = (id) => { 
    classToEdit = classes.find(c => c.id === id); 
    if(classToEdit) renderClassManagement(); 
};

window.handleDelete = async (coll, id) => { 
    if (confirm("Are you sure? This will delete the class permanently.")) { 
        await deleteDoc(window.getDocRef(coll, id)); 
        window.showAlert('Item deleted successfully.', 'success'); 
    }
};

// Updated Generic Toggle Function (Works for both Active and AdmissionOpen)
window.toggleField = async (id, field, value) => {
    const classRef = window.getDocRef('classes', id);
    const updateData = {};
    updateData[field] = value;
    updateData.lastUpdated = serverTimestamp();
    
    await setDoc(classRef, updateData, { merge: true });
    
    const label = field === 'isActive' ? 'Class status' : 'Admission status';
    window.showAlert(`${label} updated.`, 'success');
    // Optional: Refresh list to update visual styles immediately if needed
    // renderClassesList(); 
};
