/**
 * Renders the tab for student-wise exam room allocation with all advanced features.
 */
function renderExamControlRoomAllocationTab() {
    const container = document.getElementById('exam-control-room-alloc');
    if (!container) return;

    container.innerHTML = `
        <div class="ui-card mb-4">
            <h5 class="section-header">Allocate Students to Exam Rooms</h5>
            <div class="row g-3 align-items-end">
                <div class="col-md-6"><label class="form-label">1. Select Exam</label><select id="alloc-exam-select" class="form-select">${exams.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}</select></div>
                <div class="col-md-6"><label class="form-label">2. Select Session(s)</label><select id="alloc-session-select" class="form-select" multiple size="5" disabled><option>-- Select an Exam --</option></select></div>
            </div>
            <div class="form-text text-muted mt-2">Hold Ctrl (or Cmd) to select multiple sessions. The same rules will be applied to all.</div>
            <div id="allocation-summary" class="mt-4"></div>
        </div>

        <div id="allocation-rules-grid" class="ui-card mb-4 d-none">
            <h5 class="section-header">Define Allocation Rules</h5>
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Room</th>
                            <th>Capacity</th>
                            <th>Remaining</th>
                            <th>Start Reg No.</th>
                            <th>Count</th>
                            <th>Available</th>
                            <th>End Reg No.</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="allocation-rules-tbody"></tbody>
                </table>
            </div>
            <div class="mt-2"><button id="add-alloc-rule-btn" class="btn btn-sm btn-outline-primary"><i class="fas fa-plus me-1"></i>Add Rule</button></div>
            <div class="text-end mt-4"><button id="save-all-allocations-btn" class="btn btn-success btn-lg">Save All Allocations</button></div>
        </div>

        <div id="room-allocation-list-container" class="ui-card mt-4">
            <h5 class="section-header">Current Room Allocations for First Selected Session</h5>
            <div id="current-room-allocations-table"></div>
        </div>
          <!-- 👇 NEW BUTTON FOR THE DETAILED REPORT 👇 -->
    <div class="col-md-4 d-grid">
        <button id="view-full-allocation-btn" class="btn btn-outline-secondary">
            <i class="fas fa-users me-2"></i>View Full Allocation Details
        </button>
        <div id="exam-reports-preview"></div>
    </div>
   
    `;
    attachAllocationTabListeners();
}

/**
 * Adds a new row to the allocation table, including a "Remaining" capacity cell.
 */
function addAllocationRuleRow() {
    const tbody = document.getElementById('allocation-rules-tbody');
    let nextStartRegNo = '';

    // --- NEW: LOGIC TO FIND THE NEXT REGISTRATION NUMBER ---
    const lastRow = tbody.querySelector('tr:last-child');
    if (lastRow) {
        // 1. Get the 'End Reg No.' from the last row in the table.
        const lastEndRegNo = lastRow.querySelector('.end-reg-no').textContent;
        const regNoRegex = /^([A-Z0-9]+)_(\d+)$/;
        const match = lastEndRegNo.match(regNoRegex);

        // 2. If it's a valid registration number, calculate the next one.
        if (match) {
            const prefix = match[1];
            const lastNum = parseInt(match[2], 10);
            const nextNum = lastNum + 1;
            nextStartRegNo = `${prefix}_${nextNum.toString().padStart(3, '0')}`;
        }
    }
    // --- END OF NEW LOGIC ---

    const newRow = document.createElement('tr');
    const roomOptions = examRooms.map(r => `<option value="${r.id}" data-capacity="${r.capacity}">${r.name}</option>`).join('');

    // The 'value' attribute of the start-reg-no input is now pre-filled
    newRow.innerHTML = `
        <td><select class="form-select form-select-sm room-select">${roomOptions}</select></td>
        <td class="room-capacity text-center align-middle fw-bold"></td>
        <td class="room-remaining text-center align-middle fw-bold"></td>
        <td><input type="text" class="form-control form-control-sm start-reg-no" placeholder="e.g., MV_101" value="${nextStartRegNo}"></td>
        <td><input type="number" class="form-control form-control-sm count" min="1" value="1"></td>
        <td class="available-count text-center align-middle fw-bold"></td>
        <td class="end-reg-no text-muted"></td>
        <td class="status"></td>
        <td><button type="button" class="btn btn-sm btn-outline-danger remove-rule-btn">&times;</button></td>
    `;
    tbody.appendChild(newRow);

    // This function will now run on the new row and automatically validate
    // the pre-filled registration number.
    recalculateAllocationGrid();
}

/**
 * Attaches event listeners, now delegating all calculations to a central function.
 */
function attachAllocationTabListeners() {
    const examSelect = document.getElementById('alloc-exam-select');
    const sessionSelect = document.getElementById('alloc-session-select');
    const rulesGrid = document.getElementById('allocation-rules-grid');
    const rulesTbody = document.getElementById('allocation-rules-tbody');
    const selectedSessions = Array.from(sessionSelect.selectedOptions).map(opt => opt.value);
    examSelect.addEventListener('change', () => {
        const examId = examSelect.value;
        sessionSelect.innerHTML = '';
        if (examId) {
            const uniqueSessions = new Set(examSchedules.filter(s => s.examId === examId).map(s => `${s.date}_${s.session}`));
            Array.from(uniqueSessions).sort().forEach(sessionKey => {
                const [date, session] = sessionKey.split('_');
                const sessionText = session === 'FN' ? 'Forenoon' : 'Afternoon';
                sessionSelect.innerHTML += `<option value="${sessionKey}">${new Date(date).toLocaleDateString('en-GB')} (${sessionText})</option>`;
            });
            sessionSelect.disabled = false;
        } else {
            sessionSelect.innerHTML = '<option>-- Select an Exam First --</option>';
            sessionSelect.disabled = true;
        }
        loadDataForSession();
    });

    const loadDataForSession = () => {
        const examId = examSelect.value;
        const selectedSessions = Array.from(sessionSelect.selectedOptions).map(opt => opt.value);
        updateAllocationStatusSummary(examId, selectedSessions);

        if (examId && selectedSessions.length > 0) {
            rulesGrid.classList.remove('d-none');
            rulesTbody.innerHTML = '';
            addAllocationRuleRow();
            const [firstDate, firstSession] = selectedSessions[0].split('_');
            displayRoomAllocations(examId, firstDate, firstSession);
        } else {
            rulesGrid.classList.add('d-none');
            displayRoomAllocations(null, null, null);
        }
    };

    sessionSelect.addEventListener('change', loadDataForSession);
    
    // All input/change events now trigger a full grid recalculation
    rulesTbody.addEventListener('input', recalculateAllocationGrid);
    rulesTbody.addEventListener('change', recalculateAllocationGrid); // For select dropdowns

    rulesTbody.addEventListener('click', (e) => {
        if (e.target.closest('.remove-rule-btn')) {
            e.target.closest('tr').remove();
            recalculateAllocationGrid(); // Recalculate after removing a row
        }
    });
    
    document.getElementById('add-alloc-rule-btn').addEventListener('click', addAllocationRuleRow);
    document.getElementById('save-all-allocations-btn').addEventListener('click', saveAllAllocations);
     document.getElementById('view-full-allocation-btn').addEventListener('click', () => {
    const examId = document.getElementById('report-exam-select').value;
    const date = document.getElementById('report-date-select').value;
    displayFullAllocationDetailsByClass(examSelect, sessionSelect);
});
}
async function updateAllocationStatusSummary(examId, selectedSessions) {
    const summaryContainer = document.getElementById('allocation-summary');
    if (!summaryContainer || !examId || selectedSessions.length === 0) {
        summaryContainer.innerHTML = '';
        return;
    }

    const uniqueStudentIdsForSessions = new Set();
    let totalSlotsToFill = 0;
    let totalAllocatedSlots = 0;

    for (const sessionKeyString of selectedSessions) {
        const [date, session] = sessionKeyString.split('_');
        
        // Find students scheduled for this specific session
        const schedulesForSession = examSchedules.filter(s => s.examId === examId && s.date === date && s.session === session);
        let studentsInThisSession = 0;
        schedulesForSession.forEach(schedule => {
            studentsInThisSession += students.filter(student => student.classId === schedule.classId && student.division === schedule.division).length;
        });
        totalSlotsToFill += studentsInThisSession;

        // Find students already allocated for this specific session
        const firestoreSessionKey = `${examId}_${date.replace(/-/g, '')}_${session}`;
        students.forEach(student => {
            if (student.examRoomAllocations?.[firestoreSessionKey]) {
                totalAllocatedSlots++;
            }
        });
    }

    const balance = totalSlotsToFill - totalAllocatedSlots;

    summaryContainer.innerHTML = `
        <div class="row text-center g-3">
            <div class="col"><div class="p-3 border rounded bg-light"><h6 class="text-muted mb-1">Total Slots to Fill</h6><h4 class="fw-bold mb-0">${totalSlotsToFill}</h4></div></div>
            <div class="col"><div class="p-3 border rounded bg-light"><h6 class="text-muted mb-1">Slots Allocated</h6><h4 class="fw-bold mb-0 text-success">${totalAllocatedSlots}</h4></div></div>
            <div class="col"><div class="p-3 border rounded ${balance > 0 ? 'bg-danger text-white' : 'bg-success text-white'}"><h6 class="mb-1">Balance</h6><h4 class="fw-bold mb-0">${balance}</h4></div></div>
        </div>`;
}

function recalculateAllocationGrid() {
    const examId = document.getElementById('alloc-exam-select').value;
    const selectedSessions = Array.from(document.getElementById('alloc-session-select').selectedOptions).map(opt => opt.value);
    
    // We only validate against the FIRST selected session for the UI feedback.
    const [date, session] = selectedSessions[0] ? selectedSessions[0].split('_') : [null, null];
    if (!date || !session) return;
    
    const sessionKey = `${examId}_${date.replace(/-/g, '')}_${session}`;

    // --- THE FIX STARTS HERE ---

    // 1. First, calculate room usage from students already SAVED in the database for this session.
    const roomUsageFromDB = {};
    students.forEach(student => {
        const roomId = student.examRoomAllocations?.[sessionKey];
        if (roomId) {
            roomUsageFromDB[roomId] = (roomUsageFromDB[roomId] || 0) + 1;
        }
    });

    // 2. These will be updated as we loop through the rows in the current grid.
    const roomUsageInGrid = {}; // Tracks seats used by rows above in THIS grid.
    const allocatedRegNosInGrid = new Set(); // Tracks reg numbers used by rows above.

    // Get a baseline of allocated reg numbers from the DB.
    const allocatedRegNosFromDB = new Set(students.filter(s => s.examRoomAllocations?.[sessionKey]).map(s => s.examRegNumbers?.[examId]));

    const rows = document.querySelectorAll('#allocation-rules-tbody tr');
    rows.forEach(row => {
        // Create a combined set of all numbers allocated so far (from DB + rows above).
        const combinedAllocatedNos = new Set([...allocatedRegNosFromDB, ...allocatedRegNosInGrid]);
        
        // Update the current row's status, passing all necessary context.
        const countForThisRow = updateAllocationRow(row, roomUsageInGrid, roomUsageFromDB, combinedAllocatedNos);
        
        // After updating, add this row's data to our running tallies for the *next* row to use.
        const roomId = row.querySelector('.room-select').value;
        roomUsageInGrid[roomId] = (roomUsageInGrid[roomId] || 0) + countForThisRow.count;
        countForThisRow.regNos.forEach(regNo => allocatedRegNosInGrid.add(regNo));
    });
}




/**
 * Updates a SINGLE row based on its own data, usage from rows above, and saved data.
 * Returns the count and reg numbers used by this row.
 */
function updateAllocationRow(rowElement, roomUsageInGrid, roomUsageFromDB, combinedAllocatedNos) {
    
    // This function's setup remains the same...
    const roomSelect = rowElement.querySelector('.room-select');
    const capacityCell = rowElement.querySelector('.room-capacity');
    const remainingCell = rowElement.querySelector('.room-remaining');
    const startRegNoInput = rowElement.querySelector('.start-reg-no');
    const countInput = rowElement.querySelector('.count');
    const availableCountCell = rowElement.querySelector('.available-count');
    const endRegNoCell = rowElement.querySelector('.end-reg-no');
    const statusCell = rowElement.querySelector('.status');

    const totalCapacity = parseInt(roomSelect.options[roomSelect.selectedIndex]?.dataset.capacity) || 0;
    capacityCell.textContent = totalCapacity;

    // --- THE FIX FOR REMAINING CAPACITY CALCULATION ---
    const usedInDB = roomUsageFromDB[roomSelect.value] || 0;
    const usedInGridAbove = roomUsageInGrid[roomSelect.value] || 0;
    const remainingCapacity = totalCapacity - usedInDB - usedInGridAbove;
    remainingCell.textContent = remainingCapacity;
    remainingCell.className = `room-remaining text-center align-middle fw-bold ${remainingCapacity < 0 ? 'text-danger' : ''}`;
    
    // The rest of the validation logic continues as before, but is now more accurate...
    const startRegNo = startRegNoInput.value.trim().toUpperCase();
    const count = parseInt(countInput.value) || 0;
    const regNoRegex = /^([A-Z0-9]+)_(\d+)$/;
    const match = startRegNo.match(regNoRegex);

    if (!match || count <= 0) {
        endRegNoCell.textContent = '';
        statusCell.innerHTML = '';
        availableCountCell.textContent = '';
        return { count: 0, regNos: [] };
    }

    const prefix = match[1], startNum = parseInt(match[2], 10);
    const endNum = startNum + count - 1;
    endRegNoCell.textContent = `${prefix}_${endNum.toString().padStart(3, '0')}`;

    const examId = document.getElementById('alloc-exam-select').value;
    const rangeRegNos = Array.from({length: count}, (_, i) => `${prefix}_${(startNum + i).toString().padStart(3, '0')}`);
    
    // It now uses the fully combined set of allocated numbers for validation
    const alreadyAllocated = rangeRegNos.filter(regNo => combinedAllocatedNos.has(regNo));
    const nonExistent = rangeRegNos.filter(regNo => !students.some(s => s.examRegNumbers?.[examId] === regNo));
    
    const availableCount = count - nonExistent.length - alreadyAllocated.length;
    availableCountCell.textContent = availableCount;
    availableCountCell.className = `available-count text-center align-middle fw-bold ${availableCount < count ? 'text-danger' : 'text-success'}`;

    let statusHtml = '';
    if (count > remainingCapacity) {
        statusHtml = `<span class="badge bg-danger">Capacity Exceeded</span>`;
    } else if (alreadyAllocated.length > 0) {
        statusHtml = `<span class="badge bg-danger" title="${alreadyAllocated.join(', ')}">${alreadyAllocated.length} Already Allocated</span>`;
    } else if (nonExistent.length > 0) {
        statusHtml = `<span class="badge bg-warning text-dark" title="${nonExistent.join(', ')}">${nonExistent.length} Do Not Exist</span>`;
    } else {
        statusHtml = `<span class="badge bg-success">OK</span>`;
    }
    statusCell.innerHTML = statusHtml;
    
    return { count: count, regNos: rangeRegNos };
}

/**
 * Reads all valid rules from the grid and saves them to ALL selected sessions,
 * now generating a UNIQUE ID for each rule.
 */
async function saveAllAllocations() {
    const examId = document.getElementById('alloc-exam-select').value;
    const selectedSessions = Array.from(document.getElementById('alloc-session-select').selectedOptions).map(opt => opt.value);
    
    if (!examId || selectedSessions.length === 0) {
        showAlert('Please select an exam and at least one session.', 'danger');
        return;
    }

    const batch = writeBatch(db);
    let totalStudentsAllocated = 0;
    const rows = document.querySelectorAll('#allocation-rules-tbody tr');

    for (const sessionKeyString of selectedSessions) {
        const [date, session] = sessionKeyString.split('_');
        const firestoreSessionKey = `${examId}_${date.replace(/-/g, '')}_${session}`;

        for (const row of rows) {
            const status = row.querySelector('.status .badge')?.textContent;
            if (status !== 'OK') continue;

            const roomId = row.querySelector('.room-select').value;
            const startRegNo = row.querySelector('.start-reg-no').value.trim().toUpperCase();
            const count = parseInt(row.querySelector('.count').value);
            const regNoRegex = /^([A-Z0-9]+)_(\d+)$/;
            const match = startRegNo.match(regNoRegex);
            if (!match) continue;
            
            const prefix = match[1];
            const startNum = parseInt(match[2], 10);
            const endNum = startNum + count - 1;

            const studentsToAllocate = [];
            for (let i = startNum; i <= endNum; i++) {
                const regNo = `${prefix}_${i.toString().padStart(3, '0')}`;
                const student = students.find(s => s.examRegNumbers?.[examId] === regNo);
                if (student) studentsToAllocate.push(student);
            }

            if (studentsToAllocate.length > 0) {
                // Apply the allocation to the students
                studentsToAllocate.forEach(student => {
                    const studentRef = getDocRef('students', student.id);
                    const updatedAllocations = { ...student.examRoomAllocations, [firestoreSessionKey]: roomId };
                    batch.update(studentRef, { examRoomAllocations: updatedAllocations });
                });
                totalStudentsAllocated += studentsToAllocate.length;
                
                // --- THE FIX IS HERE ---

                // 1. Generate a new, unique document reference for EACH rule.
                const newRuleRef = doc(collection(db, `/artifacts/${appId}/public/data/examRoomAllocationRules`));

                // 2. Create the rule data, making sure to include the new unique ID inside the document.
                const ruleData = {
                    id: newRuleRef.id, // This is the auto-generated ID.
                    examId, 
                    date, 
                    session, 
                    roomId,
                    regNoRangeText: `${startRegNo} - ${row.querySelector('.end-reg-no').textContent}`,
                    allocatedBy: selectedUser.id,
                    allocatedAt: serverTimestamp()
                };
                
                // 3. Use the new reference in the batch operation.
                batch.set(newRuleRef, ruleData);
            }
        }
    }

    if (totalStudentsAllocated > 0) {
        try {
            await batch.commit();
            showAlert(`${totalStudentsAllocated} student allocations saved successfully for ${selectedSessions.length} session(s)!`, 'success');
            // Refresh the view
            document.getElementById('alloc-session-select').dispatchEvent(new Event('change'));
        } catch (error) {
            console.error("Error saving allocations:", error);
            showAlert('Failed to save allocations.', 'danger');
        }
    } else {
        showAlert('No valid allocation rules to save.', 'info');
    }
}
function displayRoomAllocationsSTUW2(examId, date, session) {
    const container = document.getElementById('current-room-allocations-table');
    if (!container || !examId || !date || !session) {
        container.innerHTML = `<p class="text-muted text-center p-4">Select exam, date, and session to view allocations.</p>`;
        return;
    }

    // 1. Find the allocation RULES for the current session
    const rulesForSession = examRoomAllocationRules.filter(rule =>
        rule.examId === examId && rule.date === date && rule.session === session
    ).sort((a, b) => {
        // Sort by room name for a consistent order
        const roomNameA = examRooms.find(r => r.id === a.roomId)?.name || '';
        const roomNameB = examRooms.find(r => r.id === b.roomId)?.name || '';
        return roomNameA.localeCompare(roomNameB);
    });

    if (rulesForSession.length === 0) {
        container.innerHTML = `<p class="alert alert-info text-center">No allocation rules have been created for this session yet.</p>`;
        return;
    }

    // 2. To get the student counts, we still need to check the student data
    const sessionKey = `${examId}_${date.replace(/-/g, '')}_${session}`;
    const studentCountsByRoom = students.reduce((acc, student) => {
        const roomId = student.examRoomAllocations?.[sessionKey];
        if (roomId) {
            acc[roomId] = (acc[roomId] || 0) + 1;
        }
        return acc;
    }, {});

    // 3. Build the new, simpler table focused on rules
    let html = `
        <h5>Allocations for ${new Date(date).toLocaleDateString()} (${session})</h5>
        <div class="table-responsive">
            <table class="table table-striped table-hover table-sm">
                <thead class="table-light">
                    <tr>
                        <th>Room</th>
                        <th>Allocation Rule (Reg. No. Range)</th>
                        <th>Student Count</th>
                        <th class="text-end">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${rulesForSession.map(rule => {
                        const roomName = examRooms.find(r => r.id === rule.roomId)?.name || rule.roomId;
                        const studentCount = studentCountsByRoom[rule.roomId] || 0;
                        return `
                            <tr>
                                <td><strong>${roomName}</strong></td>
                                <td>${rule.regNoRangeText.replace(/\n/g, ', ')}</td>
                                <td>${studentCount}</td>
                                <td class="text-end">
                                    <button class="btn btn-sm btn-outline-primary me-2" onclick="editAllocationRule('${rule.id}')" title="Edit Rule">Edit</button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAllocationRule('${rule.id}')" title="Delete Rule">Delete</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = html;
}
/**
 * Displays a detailed, student-wise allocation report for all classes on a given day.
 * @param {string} examId The ID of the exam.
 * @param {string} date The date for the report (YYYY-MM-DD).
 */
function displayFullAllocationDetailsByClass(examId, sessionSelect) {
    const container = document.getElementById('exam-reports-preview'); // Assuming this is your target container
    if (!container) return;
    const selectedSessions = Array.from(sessionSelect.selectedOptions).map(opt => opt.value);
    const [date, firstSession] = selectedSessions[0].split('_');
    console.log(date);
    if (!examId || !date) {
        showAlert('Please select an Exam and a Date to generate the report.', 'danger');
        return;
    }

    // 1. Find all students who have an allocation on this specific day for this exam
    const fnSessionKey = `${examId}_${date.replace(/-/g, '')}_FN`;
    const anSessionKey = `${examId}_${date.replace(/-/g, '')}_AN`;

    const allocatedStudents = students.filter(s => 
        (s.examRoomAllocations && (s.examRoomAllocations[fnSessionKey] || s.examRoomAllocations[anSessionKey]))
    );

    if (allocatedStudents.length === 0) {
        container.innerHTML = `<p class="alert alert-info text-center">No students have been allocated to any room for this date.</p>`;
        return;
    }

    // 2. Group these students by their classId
    const studentsByClass = allocatedStudents.reduce((acc, student) => {
        const classId = student.classId;
        if (!acc[classId]) {
            acc[classId] = [];
        }
        acc[classId].push(student);
        return acc;
    }, {});

    // 3. Sort the classes for a logical display order
    const sortedClassIds = Object.keys(studentsByClass).sort((a, b) => {
        const nameA = classes.find(c => c.id === a)?.name || '';
        const nameB = classes.find(c => c.id === b)?.name || '';
        return nameA.localeCompare(nameB, undefined, { numeric: true });
    });

    // 4. Build the HTML for the report
    let reportHtml = `<h4 class="text-center">Full Allocation Details for ${new Date(date).toLocaleDateString('en-GB')}</h4>`;

    sortedClassIds.forEach(classId => {
        const className = classes.find(c => c.id === classId)?.name || classId;
        const studentsInClass = studentsByClass[classId];
        
        // Sort students within the class by their registration number
        studentsInClass.sort((a, b) => {
            const regNoA = a.examRegNumbers?.[examId] || '';
            const regNoB = b.examRegNumbers?.[examId] || '';
            return regNoA.localeCompare(regNoB, undefined, { numeric: true });
        });

        reportHtml += `
            <div class="mt-4">
                <h5 class="section-header">${className}</h5>
                <div class="table-responsive">
                    <table class="table table-bordered table-sm table-striped">
                        <thead class="table-light">
                            <tr>
                                <th>Reg. No</th>
                                <th>Student Name</th>
                                <th>Division</th>
                                <th>Forenoon Room</th>
                                <th>Afternoon Room</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${studentsInClass.map(student => {
                                const fnRoomId = student.examRoomAllocations[fnSessionKey];
                                const anRoomId = student.examRoomAllocations[anSessionKey];
                                const fnRoomName = fnRoomId ? (examRooms.find(r => r.id === fnRoomId)?.name || fnRoomId) : 'N/A';
                                const anRoomName = anRoomId ? (examRooms.find(r => r.id === anRoomId)?.name || anRoomId) : 'N/A';

                                return `
                                    <tr>
                                        <td>${student.examRegNumbers?.[examId] || 'N/A'}</td>
                                        <td>${student.name}</td>
                                        <td>${student.division}</td>
                                        <td>${fnRoomName}</td>
                                        <td>${anRoomName}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    container.innerHTML = reportHtml;
}
/**
 * Displays current room allocation RULES for a specific exam date and session.
 * Includes "Edit" and "Delete" actions for each rule.
 * @param {string} examId
 * @param {string} date
 * @param {string} session
 */
function displayRoomAllocationsSTUW(examId, date, session) {
    const container = document.getElementById('current-room-allocations-table');
    if (!container || !examId || !date || !session) {
        container.innerHTML = `<p class="text-muted text-center p-4">Select exam, date, and session to view allocations.</p>`;
        return;
    }

    const rulesForSession = examRoomAllocationRules.filter(rule =>
        rule.examId === examId && rule.date === date && rule.session === session
    ).sort((a, b) => {
        const roomNameA = examRooms.find(r => r.id === a.roomId)?.name || '';
        const roomNameB = examRooms.find(r => r.id === b.roomId)?.name || '';
        return roomNameA.localeCompare(roomNameB);
    });

    if (rulesForSession.length === 0) {
        container.innerHTML = `<p class="alert alert-info text-center">No allocation rules have been created for this session yet.</p>`;
        return;
    }

    const sessionKey = `${examId}_${date.replace(/-/g, '')}_${session}`;
    const studentCountsByRoom = students.reduce((acc, student) => {
        const roomId = student.examRoomAllocations?.[sessionKey];
        if (roomId) {
            acc[roomId] = (acc[roomId] || 0) + 1;
        }
        return acc;
    }, {});

    let html = `
        <h5>Allocations for ${new Date(date).toLocaleDateString()} (${session})</h5>
        <div class="table-responsive">
            <table class="table table-striped table-hover table-sm">
                <thead class="table-light">
                    <tr>
                        <th>Room</th>
                        <th>Allocation Rule (Reg. No. Range)</th>
                        <th>Student Count</th>
                        <th class="text-end">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${rulesForSession.map(rule => {
                        const roomName = examRooms.find(r => r.id === rule.roomId)?.name || rule.roomId;
                        const studentCount = studentCountsByRoom[rule.roomId] || 0;
                        return `
                            <tr>
                                <td><strong>${roomName}</strong></td>
                                <td>${rule.regNoRangeText.replace(/\n/g, ', ')}</td>
                                <td>${studentCount}</td>
                                <td class="text-end">
                                    <button class="btn btn-sm btn-outline-primary me-2" onclick="editAllocationRule('${rule.id}')" title="Edit Rule">Edit</button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAllocationRule('${rule.id}')" title="Delete Rule">Delete</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = html;
}

/**
 * Deletes an allocation rule and de-allocates all associated students from that room for that session.
 * @param {string} ruleId - The ID of the examRoomAllocationRules document.
 */
window.deleteAllocationRule = async(ruleId) => {
    if (!confirm('Are you sure you want to delete this rule? This will de-allocate all students assigned by it.')) {
        return;
    }

    const rule = examRoomAllocationRules.find(r => r.id === ruleId);
    if (!rule) {
        showAlert('Allocation rule not found.', 'danger');
        return;
    }

    // 1. Deconstruct the rule to get the context
    const { examId, date, session, regNoRangeText } = rule;
    const sessionKey = `${examId}_${date.replace(/-/g, '')}_${session}`;

    // 2. Find all student registration numbers that were affected by this rule
    const regNoRegex = /^([A-Z0-9]+)_(\d+)$/;
    const affectedRegNos = new Set();
    const lines = (regNoRangeText || '').split('\n').map(line => line.trim()).filter(Boolean);

    lines.forEach(line => {
        const rangeParts = line.split('-').map(p => p.trim());
        const startMatch = rangeParts[0].match(regNoRegex);
        const endMatch = (rangeParts[1] || rangeParts[0]).match(regNoRegex);
        if (startMatch && endMatch && startMatch[1] === endMatch[1]) {
            const prefix = startMatch[1];
            for (let i = parseInt(startMatch[2]); i <= parseInt(endMatch[2]); i++) {
                affectedRegNos.add(`${prefix}_${i.toString().padStart(3, '0')}`);
            }
        }
    });

    // 3. Find the actual student objects to update
    const studentsToDeallocate = students.filter(s => affectedRegNos.has(s.examRegNumbers?.[examId]));
    const batch = writeBatch(db);

    // 4. De-allocate each student by updating their record
    studentsToDeallocate.forEach(student => {
        const studentRef = getDocRef('students', student.id);
        let updatedAllocations = { ...student.examRoomAllocations };
        delete updatedAllocations[sessionKey]; // Remove the allocation for this specific session
        batch.update(studentRef, { examRoomAllocations: updatedAllocations });
    });

    // 5. Delete the rule document itself
    batch.delete(getDocRef('examRoomAllocationRules', ruleId));

    try {
        await batch.commit();
        showAlert('Allocation rule and student assignments have been successfully removed.', 'success');
        // The real-time listener will automatically refresh the data,
        // but an explicit call ensures the UI updates instantly.
        displayRoomAllocations(examId, date, session);
    } catch (error) {
        console.error("Error deleting allocation rule:", error);
        showAlert('Failed to delete the rule. See console for details.', 'danger');
    }
}
function displayRoomAllocations(examId, date, session) {
    const container = document.getElementById('current-room-allocations-table');
    if (!container || !examId || !date || !session) {
        container.innerHTML = `<p class="text-muted text-center p-4">Select exam, date, and session to view allocations.</p>`;
        return;
    }

    const sessionKey = `${examId}_${date.replace(/-/g, '')}_${session}`;
    const studentsWithAllocation = students.filter(s => s.examRoomAllocations?.[sessionKey]);

    if (studentsWithAllocation.length === 0) {
        container.innerHTML = `<p class="alert alert-info text-center">No students allocated for ${examId} on ${new Date(date).toLocaleDateString()} (${session}) yet.</p>`;
        return;
    }

    // Group by room
    const allocationsByRoom = {};
    studentsWithAllocation.forEach(student => {
        const roomId = student.examRoomAllocations[sessionKey];
        if (!allocationsByRoom[roomId]) {
            allocationsByRoom[roomId] = {
                roomName: examRooms.find(r => r.id === roomId)?.name || roomId,
                students: [],
                rule: null // Placeholder for the rule
            };
        }
        allocationsByRoom[roomId].students.push(student);
    });

    let html = `<h5>Allocations for ${new Date(date).toLocaleDateString()} (${session})</h5>`;
    Object.keys(allocationsByRoom).sort().forEach(roomId => {
        const roomData = allocationsByRoom[roomId];
        roomData.students.sort((a, b) => (a.examRegNumbers?.[examId] || '').localeCompare(b.examRegNumbers?.[examId] || '')); // Sort by exam reg no

        // --- NEW: Look up the allocation rule for this room/session ---
        const allocationRule = examRoomAllocationRules.find(rule =>
            rule.examId === examId &&
            rule.date === date &&
            rule.session === session &&
            rule.roomId === roomId
        );
        const ruleDisplay = [];
        if (allocationRule?.classRangeStart && allocationRule?.classRangeEnd) {
            // Display the user-friendly range
            const startName = classes.find(c => c.id === allocationRule.classRangeStart.split('-')[0])?.name + '-' + allocationRule.classRangeStart.split('-')[1];
            const endName = classes.find(c => c.id === allocationRule.classRangeEnd.split('-')[0])?.name + '-' + allocationRule.classRangeEnd.split('-')[1];
            
            if (startName === endName) {
                ruleDisplay.push(`Class: <strong>${startName}</strong>`);
            } else {
                ruleDisplay.push(`Class Range: <strong>${startName} to ${endName}</strong>`);
            }
        }
        if (allocationRule?.regNoRangeText) {
            ruleDisplay.push(`Reg. No. Range: <strong>${allocationRule.regNoRangeText.replace(/\n/g, ', ')}</strong>`);
        }
        const ruleHtml = ruleDisplay.length > 0 ? `<p class="small text-muted mb-2">Rule: ${ruleDisplay.join('; ')}</p>` : '';


        html += `<div class="card mb-3 shadow-sm">
                    <div class="card-header bg-light">
                        <h6 class="mb-0">Room: ${roomData.roomName} (${roomId}) - Total: ${roomData.students.length} students</h6>
                    </div>
                    <div class="card-body">
                        ${ruleHtml}
                        <div class="table-responsive">
                            <table class="table table-bordered table-sm">
                                <thead><tr><th>Reg. No.</th><th>Student Name</th><th>Class (Div)</th><th>Actions</th></tr></thead>
                                <tbody>
                                    ${roomData.students.map(student => `
                                        <tr>
                                            <td>${student.examRegNumbers?.[examId] || 'N/A'}</td>
                                            <td>${student.name}</td>
                                            <td>${classes.find(c => c.id === student.classId)?.name} - ${student.division}</td>
                                            <td class="text-end">
                                                <button class="btn btn-sm btn-outline-danger py-0 px-1" onclick="window.removeStudentRoomAllocation('${examId}', '${date}', '${session}', '${student.id}')">Remove</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>`;
    });
    container.innerHTML = html;

    window.removeStudentRoomAllocation = async (examId, date, session, studentId) => {
        if (confirm("Are you sure you want to remove this student's room allocation for this session?")) {
            const studentRef = getDocRef('students', studentId);
            const student = students.find(s => s.id === studentId);
            if (!student) return;

            const sessionKey = `${examId}_${date.replace(/-/g, '')}_${session}`;
            let updatedRoomAllocations = { ...student.examRoomAllocations };
            delete updatedRoomAllocations[sessionKey];

            try {
                await updateDoc(studentRef, { examRoomAllocations: updatedRoomAllocations });
                showAlert('Student room allocation removed.', 'success');
                displayRoomAllocations(examId, date, session); // Refresh
            } catch (error) {
                console.error("Error removing allocation:", error);
                showAlert('Failed to remove allocation. See console.', 'danger');
            }
        }
    };
}

/**
 * Deletes an allocation rule and de-allocates all associated students.
 * @param {string} ruleId - The ID of the examRoomAllocationRules document.
 * @param {boolean} [confirmDelete=true] - Whether to show a confirmation prompt.
 */
window.deleteAllocationRuleOLD = async(ruleId, confirmDelete = true) => {
    if (confirmDelete && !confirm('Are you sure you want to delete this rule and de-allocate its students?')) {
        return;
    }

    const rule = examRoomAllocationRules.find(r => r.id === ruleId);
    if (!rule) {
        showAlert('Allocation rule not found.', 'danger');
        return;
    }

    // Deconstruct the rule to get context
    const { examId, date, session, regNoRangeText } = rule;
    const sessionKey = `${examId}_${date.replace(/-/g, '')}_${session}`;

    // Find all student registration numbers affected by this rule
    const regNoRegex = /^([A-Z0-9]+)_(\d+)$/;
    const affectedRegNos = new Set();
    const lines = regNoRangeText.split('\n').map(line => line.trim()).filter(Boolean);

    lines.forEach(line => {
        const parts = line.split(',');
        if (parts.length > 1) {
            parts.forEach(part => affectedRegNos.add(part.trim()));
        } else {
            const rangeParts = line.split('-').map(p => p.trim());
            const startMatch = rangeParts[0].match(regNoRegex);
            const endMatch = (rangeParts[1] || rangeParts[0]).match(regNoRegex);
            if (startMatch && endMatch && startMatch[1] === endMatch[1]) {
                const prefix = startMatch[1];
                for (let i = parseInt(startMatch[2]); i <= parseInt(endMatch[2]); i++) {
                    affectedRegNos.add(`${prefix}_${i.toString().padStart(3, '0')}`);
                }
            }
        }
    });

    // Find the actual student objects to update
    const studentsToDeallocate = students.filter(s => affectedRegNos.has(s.examRegNumbers?.[examId]));
    const batch = writeBatch(db);

    // De-allocate students
    studentsToDeallocate.forEach(student => {
        const studentRef = getDocRef('students', student.id);
        let updatedAllocations = { ...student.examRoomAllocations };
        delete updatedAllocations[sessionKey];
        batch.update(studentRef, { examRoomAllocations: updatedAllocations });
    });

    // Delete the rule itself
    batch.delete(getDocRef('examRoomAllocationRules', ruleId));

    try {
        await batch.commit();
        showAlert('Allocation rule and student assignments have been removed.', 'success');
        displayRoomAllocations(examId, date, session); // Refresh the view
    } catch (error) {
        console.error("Error deleting allocation rule:", error);
        showAlert('Failed to delete the rule.', 'danger');
    }
}


/**
 * Prepares the UI for editing an allocation rule by first deleting the old one
 * and then repopulating the input grid with its values.
 * @param {string} ruleId - The ID of the rule to edit.
 */
window.editAllocationRule = async(ruleId) =>{
    const rule = examRoomAllocationRules.find(r => r.id === ruleId);
    if (!rule) return;

    // Store the rule's details before deleting it
    const { roomId, regNoRangeText } = rule;

    // Delete the existing rule and its allocations without a confirmation prompt
    await deleteAllocationRule(ruleId, false);

    // Scroll to the top to see the input grid
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Find an empty row or create a new one in the input grid
    const tbody = document.getElementById('allocation-rules-tbody');
    let targetRow = Array.from(tbody.querySelectorAll('tr')).find(row => !row.querySelector('.start-reg-no').value);
    if (!targetRow) {
        addAllocationRuleRow();
        targetRow = tbody.lastElementChild;
    }

    // Populate the row with the old rule's data
    targetRow.querySelector('.room-select').value = roomId;
    const startRegNoInput = targetRow.querySelector('.start-reg-no');
    
    // Simplified logic: Put the entire rule text into the start reg no field for manual editing/splitting.
    // A more complex parser could split ranges into start/count, but this is safer.
    const firstRegNo = regNoRangeText.split(/[,-]/)[0].trim();
    startRegNoInput.value = firstRegNo;

    // You might need a more sophisticated way to recalculate the 'count' if the rule is complex.
    // For a simple range "MV_101-MV_110", we can calculate the count.
    const rangeParts = regNoRangeText.split('-').map(p => p.trim());
    const regNoRegex = /^([A-Z0-9]+)_(\d+)$/;
    const startMatch = rangeParts[0]?.match(regNoRegex);
    const endMatch = rangeParts[1]?.match(regNoRegex);
    
    if(startMatch && endMatch) {
         const count = parseInt(endMatch[2]) - parseInt(startMatch[2]) + 1;
         targetRow.querySelector('.count').value = count;
    } else {
         targetRow.querySelector('.count').value = 1; // Default to 1 if not a clear range
    }

    // Trigger an update to validate the repopulated row
    updateAllocationRow(targetRow);
}
