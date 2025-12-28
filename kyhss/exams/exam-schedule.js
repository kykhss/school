import {writeBatch, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
/**
 * Renders the main UI for the "Schedule" tab with multi-division checkbox selection.
 */
window.renderExamScheduleTab = () =>{
    const container = document.getElementById('schedule');
    if (!container) return;
    
    let classOptions = '';
    // (Your existing classOptions logic is correct)
    if (currentUserRole === 'teacher') {
        const teacherAllocations = classroomSubjects.filter(cs => cs.teacherId === selectedUser.id);
        const uniqueClassIds = [...new Set(teacherAllocations.map(a => a.classId))];
        classOptions = uniqueClassIds.map(classId => {
            const c = classes.find(cls => cls.id === classId);
            return c ? `<option value="${c.id}">${c.name}</option>` : '';
        }).join('');
    } else {
        classOptions = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    container.innerHTML = `
        <div class="row g-3 align-items-end border-bottom pb-3 mb-3">
            <div class="col-md-4"><label class="form-label fw-bold">Exam</label><select id="sched-exam" class="form-select">${exams.map(ex=>`<option value="${ex.id}">${ex.name}</option>`).join('')}</select></div>
            <div class="col-md-4"><label class="form-label fw-bold">Class</label><select id="sched-class" class="form-select">${classOptions}</select></div>
            <div class="col-md-4">
                <label class="form-label fw-bold">Divisions (select one or more)</label>
                <div id="sched-division-checkboxes" class="border rounded p-2" style="max-height: 120px; overflow-y: auto;"></div>
            </div>
        </div>
        <div id="schedule-sheet">
            <p class="text-center p-5 text-muted">Please select a class and at least one division to create the schedule.</p>
        </div>`;
    
    const examSelect = document.getElementById('sched-exam');
    const classSelect = document.getElementById('sched-class');
    const divisionContainer = document.getElementById('sched-division-checkboxes');
    // After setting innerHTML, find the active exam and set the value
const firstActiveExam = exams.find(ex => ex.isActive);
if (firstActiveExam) {
    examSelect.value = firstActiveExam.id;
}

    // --- THIS IS THE NEW LOGIC ---
    if (window.selectedExamForControl) {
        examSelect.value = window.selectedExamForControl;
        examSelect.disabled = true;
    }
    // --- END NEW LOGIC ---

    const updateScheduleView = () => {
        const classId = classSelect.value;
        const selectedDivisions = Array.from(divisionContainer.querySelectorAll('input:checked')).map(cb => cb.value);
        const examId = examSelect.value; // Will be the pre-selected one
        if (classId && selectedDivisions.length > 0 && examId) {
            loadScheduleSheet(examId, classId, selectedDivisions);
        } else {
            document.getElementById('schedule-sheet').innerHTML = `<p class="text-center p-5 text-muted">Please select a class and at least one division.</p>`;
        }
    };

    classSelect.addEventListener('change', () => {
        const selectedClassId = classSelect.value;
        divisionContainer.innerHTML = '';
        let divisionsToShow = [];
        if (currentUserRole === 'teacher') {
            const teacherAllocationsForClass = classroomSubjects.filter(cs => cs.teacherId === selectedUser.id && cs.classId === selectedClassId);
            divisionsToShow = [...new Set(teacherAllocationsForClass.map(a => a.division))];
        } else {
            const cls = classes.find(c => c.id === selectedClassId);
            if (cls) divisionsToShow = cls.divisions;
        }
        divisionsToShow.forEach(d => {
            divisionContainer.innerHTML += `<div class="form-check"><input class="form-check-input" type="checkbox" value="${d}" id="div_${d}"><label class="form-check-label" for="div_${d}">${d}</label></div>`;
        });
        updateScheduleView();
    });

    divisionContainer.addEventListener('change', updateScheduleView);
    examSelect.addEventListener('change', updateScheduleView);
    
    // Auto-trigger the first class if it exists
    if (classSelect.options.length > 0) {
        classSelect.value = classSelect.options[0].value;
        classSelect.dispatchEvent(new Event('change'));
    }
}

/**
 * Loads the scheduling data entry table for a class, applying the data to all selected divisions.
 */
async function loadScheduleSheet(examId, classId, divisions) {
    const container = document.getElementById('schedule-sheet');
    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>`;

    const selectedExam = exams.find(ex => ex.id === examId);
    const subjectIds = new Set();
    let relevantSubjects;

    const isAdminOrController = currentUserRole === 'admin' || (currentUserRole === 'teacher' && selectedUser.roles?.includes('exam_controller'));

    if (isAdminOrController) {
        relevantSubjects = classroomSubjects.filter(cs => cs.classId === classId && divisions.includes(cs.division));
    } else {
        relevantSubjects = classroomSubjects.filter(cs => cs.classId === classId && cs.teacherId === selectedUser.id && divisions.includes(cs.division));
    }

    relevantSubjects.forEach(cs => subjectIds.add(cs.subjectId));
    const allocatedSubjects = Array.from(subjectIds).map(id => subjects.find(s => s.id === id && s.sector === selectedExam.sector)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name));

    if (allocatedSubjects.length === 0) {
        container.innerHTML = `<div class="alert alert-warning">No subjects allocated for this combination that match your permissions.</div>`;
        return;
    }

    // Pre-fill the form using the schedule from the FIRST selected division
    const existingSchedules = examSchedules.filter(s => s.examId === examId && s.classId === classId && s.division === divisions[0]);

    let tableHTML = `
        <p class="text-muted">Enter schedule details. This will apply to all selected divisions: <strong>${divisions.join(', ')}</strong>.</p>
        <div class="table-responsive">
            <table id="schedule-table" class="table table-bordered table-sm">
                <thead class="table-light">
                    <tr><th>Subject</th><th>Exam Date</th><th>Session (FN/AN)</th><th>Max Marks (Theory)</th><th>Max Marks (Internal)</th><th class="text-end">Actions</th></tr>
                </thead>
                <tbody>`;
    
    allocatedSubjects.forEach(subject => {
        const schedule = existingSchedules.find(es => es.subjectId === subject.id);
        tableHTML += `<tr data-subject-id="${subject.id}" data-schedule-id="${schedule?.id || ''}">
            <td class="fw-bold">${subject.name}</td>
            <td><input type="date" name="date" value="${schedule?.date || getTodayISO()}" class="form-control form-control-sm"></td>
            <td><select name="session" class="form-select form-select-sm"><option value="">--</option><option value="FN" ${schedule?.session === 'FN' ? 'selected' : ''}>FN</option><option value="AN" ${schedule?.session === 'AN' ? 'selected' : ''}>AN</option></select></td>
            <td><input type="number" name="maxTE" value="${schedule?.maxTE || ''}" class="form-control form-control-sm"></td>
            <td><input type="number" name="maxCE" value="${schedule?.maxCE || ''}" class="form-control form-control-sm"></td>
            <td class="text-end">${schedule ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteExamSchedule('${schedule.id}')"><i class="fas fa-trash"></i></button>` : ''}</td>
        </tr>`;
    });

    tableHTML += `</tbody></table></div><div class="text-end mt-3"><button id="save-schedule-btn" class="btn btn-success">Save for All Selected Divisions</button></div>`;
    container.innerHTML = tableHTML;
    document.getElementById('save-schedule-btn').addEventListener('click', () => saveExamSchedule(examId, classId, divisions));
}
//Function to format the current date as YYYY-MM-DD
    function getTodayISO() {
        const today = new Date();
        // toLocaleDateString('en-CA') is a reliable way to get 'YYYY-MM-DD' in JS
        return today.toLocaleDateString('en-CA'); 
    }

/**
 * Deletes a single exam schedule entry.
 */
window.deleteExamSchedule = async (scheduleId) => {
    if (!confirm("Are you sure you want to delete this schedule entry?")) return;

    try {
        await deleteDoc(window.getDocRef('examSchedules', scheduleId));
        showAlert('Schedule entry deleted successfully.', 'success');
    } catch (error) {
        console.error("Error deleting schedule:", error);
        showAlert("Failed to delete schedule entry.", "danger");
    }
};

// Reverted and enhanced version of saveExamSchedule
async function saveExamSchedule(examId, classId, divisions) {
    const saveButton = document.getElementById('save-schedule-btn');
    if (!saveButton) return;

    // Store original button state and disable it
    const originalButtonHtml = saveButton.innerHTML;
    saveButton.disabled = true;
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Saving...`;

    try{
    const batch = writeBatch(db);
    const scheduleRows = document.querySelectorAll('#schedule-table tbody tr');
    let hasDataToSave = false;

    scheduleRows.forEach(row => {
        const subjectId = row.dataset.subjectId;
        const date = row.querySelector('input[name="date"]').value;
        const session = row.querySelector('select[name="session"]').value;
               
        
        if (subjectId && date&&session) {
            hasDataToSave = true;
            const subjectScheduleData = {
                examId,
                classId,
                subjectId,
                date: date,
                session: row.querySelector('select[name="session"]').value,
                maxTE: parseInt(row.querySelector('input[name="maxTE"]').value) || 0,
                maxCE: parseInt(row.querySelector('input[name="maxCE"]').value) || 0,
            };

            // Apply this schedule to all selected divisions
            divisions.forEach(division => {
                const scheduleId = `${examId}_${classId}_${division}_${subjectId}`;
                const scheduleRef = getDocRef('examSchedules', scheduleId);
                batch.set(scheduleRef, { ...subjectScheduleData, division: division, id: scheduleId });
            });
        }
    });

    if (hasDataToSave) {
            await batch.commit();
            showAlert(`Schedule saved successfully for divisions: ${divisions.join(', ')}!`, 'success');
        } else {
            showAlert('No schedule data entered to save.', 'warning');
        }
    } catch (error) {
        console.error("Error saving exam schedule:", error);
        showAlert("Failed to save schedule. Please check your connection and try again.", "danger");
    } finally {
        // This block ALWAYS runs, ensuring the UI is restored.
        saveButton.disabled = false;
        saveButton.innerHTML = originalButtonHtml;
    }
}
