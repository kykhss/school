import {writeBatch, serverTimestamp, query, where, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

    window.renderMarkEntryTab = () => {
    const container = document.getElementById('entry');
    let classOptions = '';

    // If the user is a teacher, populate classes based on their specific allocations.
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
        <div class="row g-1 align-items-end border-bottom pb-0 mb-3">
    <div class="col-6 col-md-2"><label class="form-label">Exam</label><select id="mark-entry-exam" class="form-select">${exams.filter(e => e.isActive).map(ex => `<option value="${ex.id}">${ex.name}</option>`).join('')}</select></div>
    <div class="col-6 col-md-2"><label class="form-label">Class</label><select id="mark-entry-class" class="md form-select"><option value="">-- Select Class --</option>${classOptions}</select></div>
    <div class="col-6 col-md-2"><label class="form-label">Division</label><select id="mark-entry-division" class="form-select" disabled><option value="">-- Select Division --</option></select></div>
    <div class="col-6 col-md-2"><label class="form-label">Subject</label><select id="mark-entry-subject" class="form-select" disabled><option value="">-- Select Subject --</option></select></div>
</div>
        <div id="mark-entry-sheet"></div>
        <div id="mark-entry-summary-container"></div>
    `;

    const examSelect = document.getElementById('mark-entry-exam');
    const classSelect = document.getElementById('mark-entry-class');
    const divisionSelect = document.getElementById('mark-entry-division');
    const subjectSelect = document.getElementById('mark-entry-subject');

    // --- NEW: Centralized controller for the view ---
    const updateMarkEntryView = () => {
        const examId = examSelect.value;
        const classId = classSelect.value;
        const division = divisionSelect.value;
        const subjectId = subjectSelect.value;

        // Clear both containers to prevent old content from lingering
        document.getElementById('mark-entry-sheet').innerHTML = '';
        document.getElementById('mark-entry-summary-container').innerHTML = '';
        
        // Decide what to render based on the current selections
        if (examId && classId && division && subjectId) {
            // All options selected: Load the mark entry sheet
            loadMarkEntrySheetobject(examId, classId, division, subjectId);
            
        } else if (examId && !classId) {
            // Only exam selected: Show the summary table
            renderMarkEntrySummaryTable(examId);
            document.getElementById('mark-entry-summary-container').innerHTML = '<p class="text-danger p-5 text-center">you have no proper internet connection</p>';
        
        } else {
             // Not enough options selected, show a placeholder
             document.getElementById('mark-entry-summary-container').innerHTML = '<p class="text-muted p-5 text-center">Select Exam, Class, and Division to see subjects, or just an Exam for a summary.</p>';
        }
    };

    // --- REFACTORED: This function now only populates subjects, then updates the view ---
    const populateSubjects = () => {
        const examId = examSelect.value;
        const classId = classSelect.value;
        const division = divisionSelect.value;
        
        subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
        subjectSelect.disabled = true;

        if (examId && classId && division) {
            let scheduledSubjects = examSchedules.filter(s => s.examId === examId && s.classId === classId && s.division === division);

            if (currentUserRole === 'teacher') {
                const teacherSubjectIds = classroomSubjects
                    .filter(cs => cs.teacherId === selectedUser.id && cs.classId === classId && cs.division === division)
                    .map(cs => cs.subjectId);
                scheduledSubjects = scheduledSubjects.filter(s => teacherSubjectIds.includes(s.subjectId));
            }
            
            if (scheduledSubjects.length > 0) {
                subjectSelect.innerHTML += scheduledSubjects.map(schedule => {
                    const subjectDetails = subjects.find(sub => sub.id === schedule.subjectId);
                    return subjectDetails ? `<option value="${subjectDetails.id}">${subjectDetails.name}</option>` : '';
                }).join('');
                subjectSelect.disabled = false;
            }
        }
        updateMarkEntryView(); // Call the controller to refresh the UI
    };
    
    // --- REFACTORED: A new function to handle both division and subject population ---
    const populateDivisionsAndSubjects = () => {
        const selectedClassId = classSelect.value;
        divisionSelect.innerHTML = '<option value="">-- Select Division --</option>';
        divisionSelect.disabled = true;

        if (selectedClassId) {
            let divisionOptionsHTML = '';
            if (currentUserRole === 'teacher') {
                const teacherAllocationsForClass = classroomSubjects.filter(cs => cs.teacherId === selectedUser.id && cs.classId === selectedClassId);
                const uniqueDivisions = [...new Set(teacherAllocationsForClass.map(a => a.division))];
                divisionOptionsHTML = uniqueDivisions.map(d => `<option value="${d}">${d}</option>`).join('');
            } else {
                const cls = classes.find(c => c.id === selectedClassId);
                divisionOptionsHTML = cls ? cls.divisions.map(d => `<option value="${d}">${d}</option>`).join('') : '';
            }
            if(divisionOptionsHTML) {
                divisionSelect.innerHTML += divisionOptionsHTML;
                divisionSelect.disabled = false;
            }
        }
        populateSubjects(); // This will trigger the subject population and the view update
    };

    // --- REFACTORED: Event Listeners now call the new functions ---
    examSelect.addEventListener('change', populateSubjects);
    classSelect.addEventListener('change', populateDivisionsAndSubjects);
    divisionSelect.addEventListener('change', populateSubjects);
    subjectSelect.addEventListener('change', updateMarkEntryView);

    // Initial population and view setup on page load
    if (examSelect.options.length > 0) {
        examSelect.value = examSelect.options[0].value; // Auto-select the first exam
    }
    if (classSelect.options.length > 1) { // Check if there's more than the placeholder
        classSelect.value = classSelect.options[1].value; // Auto-select the first available class
    }
    
    // Dispatch a change event to kick off the whole process
    examSelect.dispatchEvent(new Event('change'));
    if (classSelect.value) {
        classSelect.dispatchEvent(new Event('change'));
    }
}

// =========================================================================
// --- ✍️ MARK ENTRY MODULE (OPTIMIZED SAVE LOGIC) ---
// =========================================================================

async function loadMarkEntrySheet(examId, classId, division, subjectId) {
    const container = document.getElementById('mark-entry-sheet');
    if (!examId || !classId || !division || !subjectId) {
        container.innerHTML = `<div class="text-center p-5 text-muted">Please select all filters to enter marks.</div>`;
        return;
    }
    
    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary"></div><p class="mt-2">Loading student marks...</p></div>`;

    const schedule = examSchedules.find(s => s.examId === examId && s.classId === classId && s.division === division && s.subjectId === subjectId);
    if (!schedule) {
        container.innerHTML = '<div class="alert alert-danger">Could not find a valid exam schedule for this selection.</div>';
        return;
    }
    
    const maxTE = schedule.maxTE || 0;
    const maxCE = schedule.maxCE || 0;
    const studentsInClass = students
        .filter(s => s.classId === classId && s.division === division && s.status !== 'TC Issued' && s.status !== 'Graduated')
        .sort((a, b) => a.name.localeCompare(b.name));

    if (studentsInClass.length === 0) {
        container.innerHTML = '<div class="alert alert-warning">No active students found in this class/division.</div>';
        return;
    }
    
    const marksForSheet = {};
    try {
        const q = query(window.getCollectionRef('marks'), 
            where('examId', '==', examId),
            where('classId', '==', classId),
            where('division', '==', division),
            where('subjectId', '==', subjectId)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
            const markData = doc.data();
            marksForSheet[markData.studentId] = markData;
        });
    } catch (error) {
        console.error("Error fetching marks directly:", error);
        showAlert('Could not fetch the latest marks. Data may be from cache.', 'danger');
        studentsInClass.forEach(student => {
            const markId = `${examId}_${student.id}_${subjectId}`;
            if (marks[markId]) {
                marksForSheet[student.id] = marks[markId];
            }
        });
    }
    
    const enteredStudents = studentsInClass.filter(student => marksForSheet[student.id]).map(s => s.name);
    const notEnteredStudents = studentsInClass.filter(student => !marksForSheet[student.id]).map(s => s.name);

    const summaryHTML = `
        <div class="card bg-light p-1 mb-4 border-0">
            <h6 class="fw-bold">Entry Status</h6>
            <div class="d-flex justify-content-around text-center mt-2">
                <div><h5 class="mb-0">${studentsInClass.length}</h5><small class="text-muted">Total Students</small></div>
                <div><h5 class="mb-0 text-success">${enteredStudents.length}</h5><small class="text-muted">Marks Entered</small></div>
                <div><h5 class="mb-0 text-danger">${notEnteredStudents.length}</h5><small class="text-muted">Pending</small></div>
            </div>
            ${notEnteredStudents.length > 0 ? `
            <div class="mt-3">
                <a class="btn btn-sm btn-outline-secondary" data-bs-toggle="collapse" href="#pending-list-collapse" role="button">Show Pending Student List</a>
                <div class="collapse mt-2" id="pending-list-collapse">
                    <ul class="list-group list-group-flush small">${notEnteredStudents.map(name => `<li class="list-group-item py-1 bg-light">${name}</li>`).join('')}</ul>
                </div>
            </div>` : ''}
        </div>`;

    let tableHTML = `<div class="table-responsive"><table id="marks-table" class="table table-bordered">
        <thead class="table-light"><tr><th>Student Name</th><th>Admission No.</th><th>Theory / ${maxTE}</th><th>Internal / ${maxCE}</th></tr></thead><tbody>`;
    
    studentsInClass.forEach(student => {
        const mark = marksForSheet[student.id];
        const teValue = mark?.te === 'AB' ? 'AB' : (mark?.te ?? '');
        const ceValue = mark?.ce === 'AB' ? 'AB' : (mark?.ce ?? '');
        
        // --- MODIFICATION: Add data-original-value to track changes ---
        tableHTML += `<tr data-student-id="${student.id}">
            <td class="fw-bold">${student.name}</td><td>${student.admissionNumber}</td>
            <td><input type="text" name="te" class="form-control form-control-sm" value="${teValue}" data-max="${maxTE}" data-original-value="${teValue}"></td>
            <td><input type="text" name="ce" class="form-control form-control-sm" value="${ceValue}" data-max="${maxCE}" data-original-value="${ceValue}"></td>
        </tr>`;
    });
    
    tableHTML += `</tbody></table></div><div class="text-end mt-3"><button id="save-marks-btn" class="btn btn-success">Save Changes</button></div>`;
    
    container.innerHTML = summaryHTML + tableHTML;
    document.getElementById('mark-entry-summary-container').innerHTML = '';

    container.querySelectorAll('input[name="te"], input[name="ce"]').forEach(input => {
        if(input.value.toUpperCase() === 'AB') { input.classList.add('absent-mark'); }
        input.addEventListener('input', (e) => {
            e.target.classList.remove('absent-mark');
            if(e.target.value.toUpperCase() === 'AB') { e.target.classList.add('absent-mark'); return; }
            const maxValue = parseInt(e.target.dataset.max, 10);
            const currentValue = parseInt(e.target.value, 10);
            if (!isNaN(currentValue) && currentValue > maxValue) { e.target.value = '';
                 
                showAlert('marsk should be lessthan or equal to max.', 'danger' );
              }
        });
    });

    document.getElementById('save-marks-btn').addEventListener('click', () => saveMarks(examId, classId, division, subjectId));
}

/**
 * Saves marks ONLY for the rows that have been changed by the user.
 */
async function saveMarks(examId, classId, division, subjectId) {
    const examSelect = document.getElementById('mark-entry-exam');
    examId=examSelect.value;

    const saveButton = document.getElementById('save-marks-btn');
    if (!saveButton) return;

    const originalButtonHtml = saveButton.innerHTML;
    saveButton.disabled = false;
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Saving...`;

    try {
        const batch = writeBatch(db);
        const markRows = document.querySelectorAll('#marks-table tbody tr');
        let changesFound = 0;

        markRows.forEach(row => {
            const studentId = row.dataset.studentId;
            const teInput = row.querySelector('input[name="te"]');
            const ceInput = row.querySelector('input[name="ce"]');

            const originalTE = teInput.dataset.originalValue;
            const currentTE = teInput.value.trim();
            const originalCE = ceInput.dataset.originalValue;
            const currentCE = ceInput.value.trim();

            // --- MODIFICATION: Check if the row has changed ---
            if (originalTE !== currentTE || originalCE !== currentCE) {
                // If both inputs are now empty, it means we are clearing the mark.
                // For now, we will treat this as a change to save.
                // A more advanced version could handle deletion.
                if (currentTE === '') {
                    // Decide if clearing marks should delete the document.
                    // For simplicity, we'll just skip saving if both are blank.
                    return; 
                }
                if (currentTE === '' && currentCE === '') {
                    // Decide if clearing marks should delete the document.
                    // For simplicity, we'll just skip saving if both are blank.
                    return; 
                }

                changesFound++;
                const te = currentTE.toUpperCase() === 'AB' ? 'AB' : (parseInt(currentTE) || 0);
                const ce = currentCE.toUpperCase() === 'AB' ? 'AB' : (parseInt(currentCE) || 0);
                
                const markId = `${examId}_${studentId}_${subjectId}`;
                const markRef = window.getDocRef('marks', markId);
                batch.set(markRef, { examId, classId, division, subjectId, studentId, te, ce, lastUpdated: serverTimestamp() });
            }
        });

        if (changesFound > 0) {
            await batch.commit();
            showAlert(`${changesFound} student mark(s) saved successfully!`, 'success');
            // Reload the sheet to refresh original values and stats
            loadMarkEntrySheetobject(examId, classId, division, subjectId); 
        } else {
            showAlert('No changes detected to save.', 'info');
        }

    } catch (error) {
        console.error("Error saving marks:", error);
        showAlert("Could not save marks. Please check the console.", "danger");
        saveButton.disabled = false;
        saveButton.innerHTML = originalButtonHtml;
    } finally {
        saveButton.disabled = false;
        saveButton.innerHTML = originalButtonHtml;
    }
}

 window.attachMarksListener = async (classDataArray, refresh = false) => {
    if (!Array.isArray(classDataArray) || classDataArray.length === 0) {
        console.warn("attachMarksListener was called with an invalid or empty classDataArray.");
        return;
    }

    const academicYear = window.systemConfig.activeYear;
    const marksCollectionName = `marks-${academicYear}`;
    
    // 1. Create an array of promises (one for each class/division)
    const loadingPromises = classDataArray.map(async ({ classId, division }) => {
        return new Promise(async (resolve) => {
            if (!classId || !division) {
                resolve(); // Skip invalid items
                return;
            }

            const listenerKey = `${classId}_${division}`;
            
            // If already listening and not refreshing, we assume data is ready.
            if (activeMarksListeners[listenerKey] && !refresh) {
                resolve();
                return;
            }

            let dataLoadedViaDelta = false;

            // --- STEP 1: TRY SMART DELTA SYNC ---
            try {
                const lastLocalMark = await appDb.marks
                    .where({ classId, division })
                    .reverse()
                    .sortBy('lastUpdated');
                
                const lastLocalSyncTime = (lastLocalMark.length > 0 && lastLocalMark[0].lastUpdated) 
                    ? lastLocalMark[0].lastUpdated 
                    : new Date(0);

                const updatesQuery = query(
                    window.getCollectionRef(marksCollectionName),
                    where('classId', '==', classId),
                    where('division', '==', division),
                    where('lastUpdated', '>', lastLocalSyncTime)
                );

                const updatesSnapshot = await getDocs(updatesQuery);

                if (!updatesSnapshot.empty) {
                    // Convert docs for processing
                    const changesMock = updatesSnapshot.docs.map(doc => ({ type: 'modified', doc: doc }));
                    const { toAddOrUpdate, toDelete } = processMarksChanges(changesMock);

                    if (toAddOrUpdate.length > 0) await appDb.marks.bulkPut(toAddOrUpdate);
                    // (Deletes are handled by background listener later)
                }

                // LOAD DATA INTO MEMORY
                const allLocalMarks = await appDb.marks.where({ classId, division }).toArray();
                allLocalMarks.forEach(mark => { marks[mark.id] = mark; });

                dataLoadedViaDelta = true;
                
                // *** SUCCESS! Resolve the promise now. ***
                resolve(); 

            } catch (error) {
                console.warn(`[Marks Sync] Delta sync failed for ${listenerKey}, falling back to listener.`, error);
                // Do NOT resolve yet. We will resolve inside the listener.
            }

            // --- STEP 2: ATTACH BACKGROUND LISTENER ---
            // We still attach this to catch future updates or if Delta Sync failed.
            if (activeMarksListeners[listenerKey]) {
                 // If we resolved via Delta, we are done. 
                 // If Delta failed, but a listener exists (rare edge case), we resolve to be safe.
                 if(!dataLoadedViaDelta) resolve(); 
                 return;
            }

            const fullQuery = query(
                window.getCollectionRef(marksCollectionName),
                where('classId', '==', classId),
                where('division', '==', division)
            );

            const unsubscribe = onSnapshot(fullQuery, async (snapshot) => {
                const changes = snapshot.docChanges();
                
                // If this is the first snapshot and Delta Sync failed, we process and resolve here
                if (!dataLoadedViaDelta) {
                    if (changes.length > 0) {
                        const { toAddOrUpdate, toDelete } = processMarksChanges(changes);
                        try {
                            if (toAddOrUpdate.length > 0) {
                                await appDb.marks.bulkPut(toAddOrUpdate);
                                toAddOrUpdate.forEach(m => marks[m.id] = m);
                            }
                            if (toDelete.length > 0) {
                                await appDb.marks.bulkDelete([...new Set(toDelete)]);
                                toDelete.forEach(id => delete marks[id]);
                            }
                        } catch (error) {
                            console.error('Error syncing marks stream:', error);
                        }
                    }
                    
                    dataLoadedViaDelta = true; // Mark as loaded so we don't resolve again
                    resolve(); // *** RESOLVE PROMISE HERE (Fallback Path) ***
                } else {
                    // Normal background update
                    if (changes.length === 0) return;
                    const { toAddOrUpdate, toDelete } = processMarksChanges(changes);
                    try {
                        if (toAddOrUpdate.length > 0) await appDb.marks.bulkPut(toAddOrUpdate);
                        if (toDelete.length > 0) await appDb.marks.bulkDelete([...new Set(toDelete)]);
                        // Update memory too
                        toAddOrUpdate.forEach(m => marks[m.id] = m);
                        toDelete.forEach(id => delete marks[id]);
                    } catch(e) { console.error(e); }
                }
            }, (error) => {
                console.error(`[Firestore] Error listening to marks: `, error);
                resolve(); // Resolve on error so app doesn't hang
            });

            activeMarksListeners[listenerKey] = unsubscribe;
        });
    });

    // 2. Wait for ALL class promises to finish before letting the code continue
    await Promise.all(loadingPromises);
    console.log("All marks loaded into memory.");
}
/**
 * Loads the mark entry sheet by directly querying the database for all marks
 * matching the selected class and division for the current academic year.
 * This is the most reliable way to fetch the data.
 */
async function loadMarkEntrySheetobject(examId, classId, division, subjectId) {
    
    // --> 1. Guard against missing container
    const container = document.getElementById('mark-entry-sheet');
    if (!container) {
        console.error("Fatal Error: 'mark-entry-sheet' container not found in the DOM.");
        return;
    }

    // Helper function to show errors/messages in the container
    const showMessage = (message, type = 'muted') => {
        let alertClass = 'text-muted';
        if (type === 'danger') alertClass = 'alert alert-danger';
        if (type === 'warning') alertClass = 'alert alert-warning';
        container.innerHTML = `<div class="text-center p-5 ${alertClass}">${message}</div>`;
    };

    if (!examId || !classId || !division || !subjectId) {
        showMessage(`Please select all filters to enter marks.`);
        return;
    }
    

    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary"></div><p class="mt-2">Loading student marks...</p></div>`;

    // --> 2. Guard against missing global/external data
    if (!Array.isArray(examSchedules)) {
        showMessage('Error: Exam schedules are not loaded.', 'danger');
        return;
    }
    if (!Array.isArray(students)) {
        showMessage('Error: Student list is not loaded.', 'danger');
        return;
    }
    if (!window.activeFinancialYear) {
        showMessage('Error: Active academic year is not set.', 'danger');
        return;
    }

    const schedule = examSchedules.find(s => s.examId === examId && s.classId === classId && s.division === division && s.subjectId === subjectId);
    if (!schedule) {
        showMessage('Could not find a valid exam schedule for this selection.', 'danger');
        return;
    }
    
    const maxTE = schedule.maxTE || 0;
    const maxCE = schedule.maxCE || 0;
    const studentsInClass = students
        .filter(s => s.classId === classId && s.division === division && s.status !== 'TC Issued' && s.status !== 'Graduated')
        .sort((a, b) => a.name.localeCompare(b.name));

    if (studentsInClass.length === 0) {
        showMessage('No active students found in this class/division.', 'warning');
        return;
    }
    if (!navigator.onLine) {
        showMessage('Error: no proper internet connection.', 'danger');
        return;
    }

    // --- THIS IS THE REFACTORED FETCH LOGIC ---
    const marksForSheet = {};
    try {
        const academicYear = window.systemConfig.activeYear;
        const marksCollectionName = `marks-${academicYear}`;
        
        const q = query(window.getCollectionRef(marksCollectionName), 
            where('classId', '==', classId),
            where('division', '==', division)
        );
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(doc => {
            const allMarksForStudent = doc.data();
            // 3. Navigate the nested object to get the specific mark for this exam and subject.
            const exam = `marks.${examId}.${subjectId}`;
            const specificMark = allMarksForStudent?.[exam];
            if (specificMark) {
                marksForSheet[doc.id] = specificMark; // doc.id is the studentId
            }
        });
    } catch (error) {
        console.error("Error fetching marks directly:", error);
        // Use the helper to show a consistent error
        showMessage(`Error fetching data: ${error.message}. Please check your connection.`, 'danger');
        return;
    }
    
    // --- The rest of the function renders the UI with the fetched data ---
    const enteredStudents = studentsInClass.filter(student => marksForSheet[student.id]).map(s => s.name);
    const notEnteredStudents = studentsInClass.filter(student => !marksForSheet[student.id]).map(s => s.name);

    const summaryHTML = `
        <div class="card bg-light p-3 mb-4 border-0">
            <h6 class="fw-bold">Entry Status</h6>
            <div class="d-flex justify-content-around text-center mt-2">
                <div><h5 class="mb-0">${studentsInClass.length}</h5><small class="text-muted">Total</small></div>
                <div><h5 class="mb-0 text-success">${enteredStudents.length}</h5><small class="text-muted">Entered</small></div>
                <div><h5 class="mb-0 text-danger">${notEnteredStudents.length}</h5><small class="text-muted">Pending</small></div>
            </div>
            ${notEnteredStudents.length > 0 ? `<div class="mt-3"><a class="btn btn-sm btn-outline-secondary" data-bs-toggle="collapse" href="#pending-list-collapse">Show Pending</a><div class="collapse mt-2" id="pending-list-collapse"><ul class="list-group list-group-flush small">${notEnteredStudents.map(name => `<li class="list-group-item py-1 bg-light">${name}</li>`).join('')}</ul></div></div>` : ''}
            <p style="color:red;">for Absentees enter "00"</p>
        </div>`;

    let tableHTML = `<div class="table-responsive"><table id="marks-table" class="table table-bordered">
        <thead class="table-light"><tr><th>Sl</th><th>Student Name</th><th>Theory / ${maxTE}</th><th>Internal / ${maxCE}</th></tr></thead><tbody>`;
    let index= 0;
    studentsInClass.forEach(student => {
    index++
        const mark = marksForSheet[student.id];
        const teValue = mark?.te ?? '';
        const ceValue = mark?.ce ?? '';
        
        tableHTML += `<tr data-student-id="${student.id}"data-student-name="${student.name}">
            <td class="fw-bold">${index}</td>
            <td class="fw-bold">${student.name}<br>(${student.admissionNumber})</td>
            <td><input type="${String(teValue).toUpperCase()==="AB"?"text":"number"}"name="te" class="form-control form-control-sm" value="${teValue}" data-max="${maxTE}" data-original-value="${teValue}"></td>
            <td><input type="${parseInt(ceValue)? "number" : "text"}" name="ce" class="form-control form-control-sm" value="${ceValue}" data-max="${maxCE}" data-original-value="${ceValue}"></td>
        </tr>`;
    });
    
    tableHTML += `</tbody></table></div><div class="text-end mt-3">
    <button id="generate-pdf-btn" class="btn btn-secondary me-2">Generate PDF</button>
    <button id="save-marks-btn" class="btn btn-success">Save Changes</button></div>`;
    
    container.innerHTML = summaryHTML + tableHTML;
 const pdfButton = document.getElementById('generate-pdf-btn');
    if (pdfButton) {
        pdfButton.addEventListener('click', () => window.exportMarkEntryReportToPdf(examId));
    } else {
        console.warn("Could not find 'generate-pdf-btn' to attach listener.");
    }
    // Attach event listeners
    container.querySelectorAll('input[name="te"], input[name="ce"]').forEach(input => {
        if(String(input.value).toUpperCase() === 'AB') { input.classList.add('absent-mark'); }
        input.addEventListener('input', (e) => {
            if(pdfButton) pdfButton.disabled = true;
            e.target.classList.remove('absent-mark');
            if(e.target.value.toUpperCase() === 'AB'||e.target.value.toUpperCase() === '00') { e.target.classList.add('absent-mark'); e.target.type = "text"; e.target.value = "Ab"; return; }
            
            // --> Added a check for empty string to avoid NaN issues
            if (e.target.value === '') { return; } 

            const maxValue = parseInt(e.target.dataset.max, 10);
            const currentValue = parseInt(e.target.value, 10);
            
            // --> Handle non-numeric input gracefully
            if (!isNaN(currentValue) && currentValue > maxValue) { e.target.value = ''; }
        });
    });
    
    // --> 4. Safely attach listener for the save button
   
    const saveButton = document.getElementById('save-marks-btn');
    if (saveButton) {
        saveButton.addEventListener('click', () => saveMarksobject(examId, classId, division, subjectId));
    } else {
        console.warn("Could not find 'save-marks-btn' to attach listener.");
    }
}

/**
 * Saves marks ONLY for the rows that have been changed by the user, using the
 * new, efficient student-centric and year-based data model.
 * @param {string} examId
 * @param {string} classId
 * @param {string} division
 * @param {string} subjectId
 */
async function saveMarksobject(examId, classId, division, subjectId) {
    const pdfButton = document.getElementById('generate-pdf-btn');
    if (pdfButton) {
        pdfButton.disabled = true;
    }
    const saveButton = document.getElementById('save-marks-btn');
    if (!saveButton) return;

    const originalButtonHtml = saveButton.innerHTML;
    saveButton.disabled = true;
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Saving...`;

    try {
        const batch = writeBatch(db);
        const markRows = document.querySelectorAll('#marks-table tbody tr');
        let changesFound = 0;
        const academicYear = window.systemConfig.activeYear; // Get the current academic year

        for (const row of markRows) {
            
            const studentId = row.dataset.studentId;
            const studentAdnumber = row.dataset.studentName;
            const teInput = row.querySelector('input[name="te"]');
            const ceInput = row.querySelector('input[name="ce"]');

            const originalTE = teInput.dataset.originalValue;
            const currentTE = teInput.value.trim();
            const originalCE = ceInput.dataset.originalValue;
            const currentCE = ceInput.value.trim();

            // Only process rows where marks have actually changed
            if (originalTE !== currentTE || originalCE !== currentCE) {
                if (currentTE === '' && currentCE === '') {
                    // If both fields are cleared, skip saving to avoid empty records.
                    // A more advanced version could delete the mark field here.
                    continue;
                }

                
                changesFound++;

                const te = currentTE.toUpperCase() === 'AB' ? 'AB' : currentTE.toUpperCase() === '0'? '0':(parseInt(currentTE)||"");
                const ce = currentCE.toUpperCase() === 'AB' ? 'AB' : currentCE.toUpperCase() === '0' ? '0' :(parseInt(currentCE)||"");
                
                if(te===""){
                    var message = `No empty marks save.${studentAdnumber}`;
                    showAlert(message, 'info');
                    saveButton.disabled = false;
                    saveButton.innerHTML = originalButtonHtml;
                    return
                }
                
                // 1. The collection name is now dynamic, based on the active year.
                const marksCollectionName = `marks-${academicYear}`;
                // 2. The document ID is just the student's ID.
                const markRef = window.getDocRef(marksCollectionName, studentId);

                // 3. We use dot notation to update a specific, nested field within the document.
                const updateData = {
                    [`marks.${examId}.${subjectId}`]: { te, ce },
                    // Store student info for easier querying
                    studentId: studentId, 
                    classId: classId,
                    division: division,
                    lastUpdated: serverTimestamp()
                };
                
                // 4. Use { merge: true } to add/update marks without overwriting the whole document.
                batch.set(markRef, updateData, { merge: true });
            }
        }

        if (changesFound > 0) {
            await batch.commit();
            showAlert(`${changesFound} student mark(s) saved successfully!`, 'success');
            // Reload the sheet to refresh the "original values" and entry stats
            loadMarkEntrySheetobject(examId, classId, division, subjectId); 
        } else {
            showAlert('No changes were detected to save.', 'info');
        }

    } catch (error) {
        console.error("Error saving marks:", error);
        showAlert("Could not save marks. Please check the console.", "danger");
    } finally {
        // This block always runs, ensuring the button is restored to its original state
        saveButton.disabled = false;
        saveButton.innerHTML = originalButtonHtml;
    }
}

window.exportMarkEntryReportToPdf = async (examId) => {
    const { jsPDF } = window.jspdf;
    const input = document.getElementById('marks-table');
    
    if (!input) {
        showAlert('Error: Report table not found for export.', 'danger');
        return;
    }

    const examName = exams.find(e => e.id === examId)?.name || 'Exam Report';   
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.setFontSize(18);
    pdf.text('Mark Entry Report', 105, 15, null, null, 'center');
    pdf.setFontSize(12);
    pdf.text(`Exam: ${examName}`, 105, 25, null, null, 'center');
    pdf.line(15, 30, 195, 30); // Draw a line
    pdf.text(`Exam: ${examName}`, 105, 25, null, null, 'center');
    pdf.line(15, 30, 195, 30); // Draw a line

    const canvas = await html2canvas(input, {
        scale: 2,   // Increase scale for better resolution 
        useCORS: true,
        logging: false,
    }); 
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = canvas.height * imgWidth / canvas.width;
    let heightLeft = imgHeight;
    let position = 35; // Start position for the image after the header

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - position);
    while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();  // Add a new page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
    }
    pdf.save(`Mark_Entry_Report_${examName.replace(/\s/g, '_')}.pdf`);
    showAlert('PDF export successful!', 'success');
};


/**
 * Processes Firestore document changes from the student-centric marks collection,
 * flattens the data for local storage, and includes the parent document's timestamp.
 * @param {Array} changes - Array of document changes from a snapshot.
 * @returns {{toAddOrUpdate: Array<Object>, toDelete: Array<string>}} - Objects for IndexedDB operations.
 */
window.processMarksChanges = (changes) => {
    const toAddOrUpdate = [];
    const studentIdsToProcess = new Set();
    const studentDocsToRemove = new Set();

    changes.forEach(change => {
        const studentId = change.doc.id;
        if (change.type === "removed") {
            studentDocsToRemove.add(studentId);
        } else { // 'added' or 'modified'
            studentIdsToProcess.add(studentId);
            const studentMarksDoc = { id: studentId, ...change.doc.data() };
            const lastUpdated = studentMarksDoc.lastUpdated; // Get the top-level timestamp

            for (const key in studentMarksDoc) {
                if (key.startsWith('marks.')) {
                    const [, examId, subjectId] = key.split('.');
                    const markData = studentMarksDoc[key];
                    
                    const flatMarkId = `${examId}_${studentId}_${subjectId}`;
                    const flatMarkData = {
                        id: flatMarkId,
                        examId, subjectId, studentId,
                        classId: studentMarksDoc.classId,
                        division: studentMarksDoc.division,
                        te: markData.te,
                        ce: markData.ce,
                        lastUpdated: lastUpdated // Add the timestamp to each flattened record
                    };
                    
                    marks[flatMarkId] = flatMarkData;
                    toAddOrUpdate.push(flatMarkData);
                }
            }
        }
    });
    
    // Determine which flat mark records need to be deleted
    const toDelete = [];
    Object.keys(marks).forEach(key => {
        const studentIdInKey = key.split('_')[1];
        // Delete if the student's doc was removed OR if it was modified (to clear out old marks before adding new ones)
        if (studentDocsToRemove.has(studentIdInKey) || studentIdsToProcess.has(studentIdInKey)) {
             // We need to find all marks for the student that are no longer in the toAddOrUpdate list
            if (!toAddOrUpdate.some(item => item.id === key)) {
                delete marks[key];
                toDelete.push(key);
            }
        }
    });

    return { toAddOrUpdate, toDelete };
}

/**
 * Attaches real-time listeners for marks data with an intelligent sync strategy.
 * This version correctly loads local data into memory if a network sync is skipped.
 * @param {Array<object>} classDataArray - An array of objects, e.g., [{ classId: 'C1', division: 'A' }]
 * @param {boolean} [refresh=false] - If true, a new listener is created even if one exists.
 */
/**
 * (OPTIMIZED) Attaches real-time listeners for marks with Delta Sync.
 * 1. Fetches only changed data (Delta) based on lastUpdated.
 * 2. Updates local DB.
 * 3. Loads data to memory and Resolves Promise (UI Unblocks).
 * 4. Attaches background listener for full consistency.
 */
/**
 * (FINAL ROBUST VERSION) Attaches listeners and WAITS for data to load.
 * This version returns a Promise that only resolves when all marks are
 * loaded into memory, ensuring 'await' works perfectly.
 */



function attachMarksListenerarray(examId, classDataArray = []) {
    // If no classDataArray is provided, fallback to selected class/division
    if (!Array.isArray(classDataArray) || classDataArray.length === 0) {
        const classId = selectedUser?.classId || null;
        const division = selectedUser?.division || null;
        if (classId && division) {
            classDataArray = [{ classId, division }];
        } else {
            console.warn('attachMarksListener: No valid class/division available.');
            return;
        }
    }

    classDataArray.forEach(({ classId, division }) => {
        const listenerKey = `${classId}_${division}`;

        if (activeMarksListeners[listenerKey]) {
            // Already listening for this combination, re-render if needed
            generateExamWiseResultsTable(examId,classId, division);
            return;
        }

        // Create Firestore query
        let marksQuery;
        if (examId) {
            marksQuery = query(
                window.getCollectionRef('marks'),
                where('examId', '==', examId),
                where('classId', '==', classId),
                where('division', '==', division)
            );
        } else {
            marksQuery = query(
                window.getCollectionRef('marks'),
                where('classId', '==', classId),
                where('division', '==', division)
            );
        }

        const unsubscribe = onSnapshot(marksQuery, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "removed") {
                    delete marks[change.doc.id];
                } else {
                    marks[change.doc.id] = { id: change.doc.id, ...change.doc.data() };
                }
            });

            generateExamWiseResultsTable(examId, classId, division);
        }, (error) => {
            console.error(`[Firestore] Error listening to marks for ${listenerKey}:`, error);
        });

        activeMarksListeners[listenerKey] = unsubscribe;
    });
}



function unsubscribeAllListeners() {
    // Unsubscribe from general listeners
    for (const key in activeListeners) {
        if (typeof activeListeners[key] === 'function') {
            activeListeners[key]();
        }
    }
    activeListeners = {};

    // --- NEW: Also unsubscribe from all active marks listeners ---
    for (const key in activeMarksListeners) {
        if (typeof activeMarksListeners[key] === 'function') {
            activeMarksListeners[key]();
        }
    }
    activeMarksListeners = {};
}
