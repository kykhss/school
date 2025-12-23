
        import {setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";  
        // --- CLASS MANAGEMENT (WITH ORDER FIELD) ---
window.renderClassManagement = () => {
    const isEditMode = window.classToEdit !== null;
    mainContent.innerHTML = `
        <h1 class="h2 mb-4">Class Management</h1>
        <div class="row">
            <div class="col-lg-4">
                <div class="card shadow mb-4">
                    <div class="card-header py-3"><h6 class="m-0 fw-bold text-primary">${isEditMode ? "Edit Class" : "Add New Class"}</h6></div>
                    <div class="card-body">
                        <form id="class-form">
                            <div class="mb-3"><label class="form-label">Academic Year</label><input id="academic-year" required class="form-control" ${isEditMode ? 'readonly' : ''}></div>
                            <div class="row">
                                <div class="col-8"><label class="form-label">Class Name</label><input id="class-name" placeholder="E.g., CLASS X" required class="form-control" ${isEditMode ? 'readonly' : ''}></div>
                                <div class="col-4"><label class="form-label">Order</label><input type="number" id="class-order" placeholder="e.g., 10" required class="form-control"></div>
                            </div>
                            <div class="mb-3"><label class="form-label">Class Alias</label><input id="class-alias" placeholder="E.g., X" required class="form-control"></div>
                            <div class="mb-3"><label class="form-label">Divisions (comma-separated)</label><input id="class-divisions" placeholder="A,B,C" required class="form-control"></div>
                            <div class="mb-3"><label class="form-label">Admission Fee</label><input type="number" id="class-admission-fee" placeholder="e.g., 10000" required class="form-control"></div>
                           
                            <div class="mb-3"><label class="form-label">Sector</label><input id="class-sector" placeholder="E.g.,KG,UP,HS" required class="form-control"></div>

                            <div class="d-flex justify-content-end gap-2">
                                <button type="button" id="cancel-edit-btn" class="btn btn-secondary ${!isEditMode ? 'd-none' : ''}">Cancel</button>
                                <button type="submit" class="btn btn-primary">${isEditMode ? "Update Class" : "Add Class"}</button>
                            </div>
                            
                        </form>
                    </div>
                </div>
            </div>
            <div class="col-lg-8">
                <div class="card shadow mb-4">
                    <div class="card-header py-3"><h6 class="m-0 fw-bold text-primary">Existing Classes</h6></div>
                    <div class="card-body" id="classes-list-container"></div>
                </div>
            </div>
        </div>`;

    renderClassesList(); // This function also needs a small update (see below)
    const form = document.getElementById('class-form');
    const yearInput = document.getElementById('academic-year');
    const nameInput = document.getElementById('class-name');
    const orderInput = document.getElementById('class-order'); // New
    const aliasInput = document.getElementById('class-alias');
    const divInput = document.getElementById('class-divisions');
    const admissionFeeInput = document.getElementById('class-admission-fee');
    const sectorInput = document.getElementById('class-sector');


    if (isEditMode) {
        yearInput.value = classToEdit.year;
        nameInput.value = classToEdit.name;
        orderInput.value = classToEdit.order || ''; // New
        aliasInput.value = classToEdit.alias;
        divInput.value = (classToEdit.divisions || []).join(', ');
        admissionFeeInput.value = classToEdit.admissionFee || '';
        sectorInput.value = classToEdit.sector || '';
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
            order: parseInt(orderInput.value, 10) || 0, // New
            alias: aliasInput.value.toUpperCase(),
            divisions: divInput.value.split(',').map(d => d.trim().toUpperCase()).filter(Boolean),
            admissionFee: parseFloat(admissionFeeInput.value) || 0,
            sector: sectorInput.value.toUpperCase()||"GENERAL",
            isActive: true,
            lastUpdated: serverTimestamp()
        };
        await setDoc(window.getDocRef('classes', docId), data);
        window.showAlert(`Class '${data.name}' ${isEditMode ? 'updated' : 'saved'}.`, 'success');
        classToEdit = null;
        renderClassManagement();
    });
};

// Also, replace your old renderClassesList with this one to show the order
function renderClassesList() {
    const container = document.getElementById('classes-list-container');
    if (!container) return;
    if (!classes || classes.length === 0) { container.innerHTML = `<p class="text-muted">No classes added.</p>`; return; }
    
    // Sort by the new 'order' property
    const sortedClasses = [...classes].sort((a, b) => (a.order || 0) - (b.order || 0));

    container.innerHTML = `<div class="list-group list-group-flush">${sortedClasses.map(cls => `
        <div class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <h6 class="mb-0">${cls.name} <span class="badge bg-primary rounded-pill">${cls.order}</span></h6>
                <div>${(cls.divisions || []).map(d => `<span class="badge bg-secondary me-1">${d}</span>`).join('')}</div>
            </div>
            <div>
                <span class="badge bg-info text-dark">${cls.sector || 'GENERAL'}</span>
            </div>
            <div>Ad Fee: ₹${cls.admissionFee || 0}</div>
            <div>
                <span class="text-muted">(${cls.year})</span>
            </div>
            <div>
                <span class="text-bold">${cls.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            <div>
                <span class="text-muted">(${cls.year})</span>
            </div>
            
            <div>
                <div class="form-check form-switch d-inline-block me-3">
                    <input class="form-check-input" type="checkbox" role="switch" 
                           id="class-toggle-${cls.id}" ${cls.isActive ? 'checked' : ''} 
                           onchange="window.toggleClassStatus('${cls.id}', this.checked)">
                    <label class="form-check-label" for="class-toggle-${cls.id}">${cls.isActive ? 'Active' : 'Inactive'}</label>
                </div>
                <button onclick="window.handleEditClass('${cls.id}')" class="btn btn-sm btn-outline-primary me-2" title="Edit"><i class="fas fa-edit"></i></button>
                <button onclick="window.handleDelete('classes', '${cls.id}')" class="btn btn-sm btn-outline-danger" title="Delete"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`).join('')}</div>`;
}
        window.handleEditClass = (id) => { classToEdit = classes.find(c => c.id === id); if(classToEdit) renderClassManagement(); };
        window.handleDelete = async (coll, id) => { if (confirm("Are you sure? This cannot be undone.")) { await deleteDoc(window.getDocRef(coll, id)); showAlert('Item deleted.', 'success'); }};

        //toggle class active/inactive status
        window.toggleClassStatus = async (id, isActive) => {
            const classRef = window.getDocRef('classes', id);
            await setDoc(classRef, { isActive: isActive, lastUpdated: serverTimestamp() }, { merge: true });
            window.showAlert(`Class ${isActive ? 'activated' : 'deactivated'}.`, 'success');
        };