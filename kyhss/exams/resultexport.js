/**
 * RESULT DOWNLOADER MODULE
 * Provides a UI to select multiple divisions and download a flat CSV.
 * Format: AdNumber, Name, Class (Div), Subject, MaxMark (TE_CE), ObtainedMark (TE_CE)
 */

window.renderResultDownload = async () => {
    const container = document.getElementById('main-content'); 
    if (!container) return;

    // 1. Prepare Class Options (Role-based)
    let classOptions = '';
    if (currentUserRole === 'teacher') {
        const teacherAllocations = classroomSubjects.filter(cs => cs.teacherId === selectedUser.id);
        const uniqueClassIds = [...new Set(teacherAllocations.map(a => a.classId))];
        classOptions = uniqueClassIds.map(classId => {
            const c = classes.find(cls => cls.id === classId);
            return c ? `<option value="${c.id}">${c.alias}</option>` : '';
        }).join('');
    } else {
        classOptions = classes.map(c => `<option value="${c.id}">${c.alias}</option>`).join('');
    }

    // 2. Build the UI
    container.innerHTML = `
        <div class="card shadow-sm border-0 mb-4">
            <div class="card-header bg-dark text-white py-3">
                <h5 class="mb-0"><i class="fas fa-file-csv me-2"></i>Bulk Result Export (CSV)</h5>
            </div>
            <div class="card-body bg-light">
                <div class="row g-3">
                    <div class="col-md-3">
                        <label class="form-label fw-bold">Exam</label>
                        <select id="dl-exam" class="form-select shadow-sm">
                            ${exams.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label fw-bold">Class</label>
                        <select id="dl-class" class="form-select shadow-sm">
                            <option value="">-- Choose Class --</option>
                            ${classOptions}
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label fw-bold">Division(s)</label>
                        <select id="dl-division" class="form-select shadow-sm" multiple style="min-height: 100px;">
                        </select>
                        <small class="text-muted d-block mt-1">Hold Ctrl/Cmd to select multiple</small>
                    </div>
                    <div class="col-md-3 d-flex align-items-end">
                        <button id="dl-btn" class="btn btn-primary w-100 shadow-sm py-2">
                            <i class="fas fa-download me-2"></i>Download CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const classSelect = document.getElementById('dl-class');
    const divSelect = document.getElementById('dl-division');
    const downloadBtn = document.getElementById('dl-btn');

    // Populate divisions dynamically
    classSelect.addEventListener('change', () => {
        const classId = classSelect.value;
        divSelect.innerHTML = '';
        if (!classId) return;

        let divisions = [];
        if (currentUserRole === 'teacher') {
            divisions = [...new Set(classroomSubjects
                .filter(cs => cs.teacherId === selectedUser.id && cs.classId === classId)
                .map(a => a.division))];
        } else {
            const cls = classes.find(c => c.id === classId);
            divisions = cls ? cls.divisions : [];
        }
        divSelect.innerHTML = divisions.map(d => `<option value="${d}">${d}</option>`).join('');
    });

    // 3. Process CSV Data
    downloadBtn.addEventListener('click', async () => {
        const examId = document.getElementById('dl-exam').value;
        const classId = classSelect.value;
        const selectedDivs = Array.from(divSelect.selectedOptions).map(opt => opt.value);

        if (!classId || selectedDivs.length === 0) {
            return window.showAlert('Select a class and at least one division.', 'warning');
        }

        downloadBtn.disabled = true;
        downloadBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Processing...`;

        try {
            // Header: AdNumber, Name, Class, Subject, MaxMark, ObtainedMark
            //const csvRows = [["AdNumber", "Name", "Class", "Subject", "MaxMark", "ObtainedMark"]];
            const csvRows = [[]];
            const className = classes.find(c => c.id === classId)?.alias || 'Class';

            for (const div of selectedDivs) {
                const marksData = await window.getmarks(classId, div, examId);
                const studentsInDiv = students.filter(s => s.classId === classId && s.division === div);
                const schedules = examSchedules.filter(s => s.examId === examId && s.classId === classId && s.division === div);

                studentsInDiv.forEach(student => {
                    schedules.forEach(sched => {
                        const subject = subjects.find(sub => sub.id === sched.subjectId);
                        const markKey = `${examId}_${student.id}_${sched.subjectId}`;
                        const entry = marksData[markKey];

                        // Formatting as requested: te_ce
                        const maxFormatted = `${sched.maxTE || 0}_${sched.maxCE || 0}`;
                        const obtFormatted = `${entry?.te ?? 0}_${entry?.ce ?? 0}`;

                        csvRows.push([
                            `${student.admissionNumber}`,
                            `${student.name}`,
                            `${className} ${div}`,
                            `${subject ? subject.name : 'Unknown'}`,
                            `${maxFormatted}`,
                            `${obtFormatted}`
                        ]);
                    });
                });
            }

            // 4. Trigger Download
            const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(r => r.join(",")).join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Result_Export_${className}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.showAlert('CSV downloaded successfully!', 'success');
        } catch (err) {
            console.error(err);
            window.showAlert('Error exporting data.', 'danger');
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = `<i class="fas fa-download me-2"></i>Download CSV`;
        }
    });
};
