
    /**
 * Generates the HTML for a student's report card.
 * @param {string} studentId - The ID of the student.
 * @param {string} examId - The ID of the exam.
 * @param {string} containerId - The ID of the HTML element to render the report into.
 */
function generateReportCardHTML(studentId, examId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID ${containerId} not found for report card.`);
        return;
    }

    const student = students.find(s => s.id === studentId);
    const exam = exams.find(e => e.id === examId);
    const studentClass = classes.find(c => c.id === student?.classId); // Defensive: student?.classId
    
    // Defensive checks for core data
    if (!student || !exam) {
        container.innerHTML = `<p class="alert alert-warning text-center">Student or Exam data not found for generating report card.</p>`;
        return;
    }

    // Filter schedules for this specific student's class and exam
    const schedules = examSchedules.filter(s =>
        s.examId === examId &&
        s.classId === student.classId &&
        s.division === student.division
    );

    // Call processExamResultsData (ensure it returns studentId and subjectId in subjectResults)
    // We pass [student] as an array, and take the first element of the result.
    const processedReportData = processExamResultsData([student], schedules, marks, examId, document.getElementById('shared-grading-system')?.value || 'type1');

    // Destructure the required properties from the first (and only) student's processed data
    const {
        studentId: processedStudentId, // Renaming to avoid conflict with outer studentId
        studentName,
        subjectResults,
        grandTotalMarks,
        grandMaxMarks,
        grandPct,
        finalStatus,
        overallGrade
    } = processedReportData[0] || {}; // Use default empty object if processedReportData[0] is undefined

    // If subjectResults is not available (e.g., marks still loading or no schedules)
    if (!subjectResults || subjectResults.length === 0) {
        container.innerHTML = `<div class="text-center p-5"><div class="spinner-border"></div><p class="mt-2">Loading marks or no subjects scheduled for this exam/class.</p></div>`;
        return;
    }

    // Get grading system safely
    const gradingSystem = document.getElementById('shared-grading-system')?.value || 'type1';
    
    // Construct photo URL: use thumbnail if photoDriveId exists, otherwise a placeholder
    const studentPhotoSrc = student.photoDriveId
        ? `https://drive.google.com/thumbnail?id=${student.photoDriveId}&sz=400`
        : 'https://placehold.co/150x200?text=No+Photo&font=roboto';


    container.innerHTML = `
    <div id="report-card-printable" class="p-4 border bg-white mx-auto" style="max-width: 210mm;">
        <div class="report-header text-center mb-4">
            ${schoolDetails.logoUrl ? `<img src="${schoolDetails.logoUrl}" alt="School Logo" style="max-height: 80px; margin-bottom: 1rem;">` : ''}
            <h3>${schoolDetails.address || 'School Name'}</h3>
            <p class="lead mb-0">${schoolDetails.name || 'School Address'}</p>
            <h5 class="mt-3">PROGRESS REPORT - ${exam.name.toUpperCase()}</h5>
        </div>

        <div class="row mb-4 align-items-center">
            <div class="col-md-8">
                <table class="table table-sm table-borderless">
                    <tbody>
                        <tr><th style="width: 150px;">Student Name</th><td>: ${student.name}</td></tr>
                        <tr><th>Admission No</th><td>: ${student.admissionNumber || 'N/A'}</td></tr>
                        <tr><th>Class</th><td>: ${studentClass?.name || 'N/A'} - ${student.division || 'N/A'}</td></tr>
                        <tr><th>Date of Birth</th><td>: ${new Date(student.dob).toLocaleDateString('en-GB') || 'N/A'}</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="col-md-3 text-center">
                <img src="${studentPhotoSrc}"
                     alt="Student Photo" class="img-thumbnail rounded-3 shadow-sm" style="width: 130px; height: 170px; object-fit: cover; border: 2px solid #ddd;">
            </div>
        </div>

        <table class="table table-bordered table-sm">
            <thead class="table-light text-center fs-6"><tr><th>SUBJECT</th><th>THEORY</th><th>INTERNAL</th><th>TOTAL</th><th>MAX</th><th>GRADE</th></tr></thead>
            <tbody>
                ${subjectResults.map(res => {
                    const subjectName = subjects.find(s => s.id === res.subjectId)?.name || 'N/A'; // Use subjectId directly
                    const totalGrade = gradingSystem === 'type1' ? calculateGrade(res.total, res.maxTE + res.maxCE) : calculateGradeType2(res.total, res.maxTE + res.maxCE);
                    
                    return `
                        <tr class="text-center">
                            <td class="text-start">${subjectName}</td>
                            <td class="text-center">${res.te}</td>
                            <td class="text-center">${res.ce}</td>
                            <td class="text-center">${res.total}</td>
                            <td class="text-center">${res.maxTE + res.maxCE}</td>
                            <td class="text-center">${totalGrade}</td>
                        </tr>`;
                }).join('')}
            </tbody>
            <tfoot class="fw-bold text-center">
                <tr>
                    <td colspan="2" class="text-end">GRAND TOTAL</td>
                    <td class="text-center">${grandTotalMarks}</td>
                    <td class="text-center">${grandMaxMarks}</td>
                    <td colspan="2"></td>
                </tr>
            </tfoot>
        </table>
        <div class="row mt-4 fw-bold text-center">
            <div class="col-6">Overall Percentage: <span class="fs-5">${grandPct?.toFixed(2) || '0.00'}%</span></div>
            <div class="col-6">Final Result: <span class="fs-5 text-${finalStatus === 'PASS' ? 'success':'danger'}">${finalStatus || 'N/A'}</span></div>
        </div>
        <div class="row mt-5 pt-5 text-center text-muted" style="font-size: 0.9rem;">
            <div class="col-6"><hr class="mx-auto w-50">Class Teacher</div>
            <div class="col-6"><hr class="mx-auto w-50">Principal</div>
        </div>
    </div>`;
}
/**
 * Generates and returns the HTML for a student's comparison report card.
 * This version includes a detailed summary and a new "Grand Total" row after the subjects.
 * @param {string} studentId - The ID of the student.
 * @param {string[]} examIds - An array of exam IDs to compare.
 * @returns {string} The complete HTML string for the report card, or an error message.
 */
function generateReportCardHTML_Comparison(studentId, examIds) {
    const student = students.find(s => s.id === studentId);
    if (!student) {
        console.error("Could not generate report card: Student not found for ID", studentId);
        return '<p class="alert alert-danger">Student data not found.</p>';
    }

    const studentClass = classes.find(c => c.id === student?.classId);
    const gradingSystem = document.getElementById('shared-grading-system')?.value || 'type1';
    const studentPhotoSrc = student.photoDriveId
        ? `https://drive.google.com/thumbnail?id=${student.photoDriveId}&sz=400`
        : 'https://placehold.co/150x200?text=No+Photo&font=roboto';

    const examsData = examIds.map(eId => {
        const exam = exams.find(e => e.id === eId);
        if (!exam) return null;

        const schedules = examSchedules.filter(s => s.examId === eId && s.classId === student.classId && s.division === student.division);
        const processedData = processExamResultsData([student], schedules, marks, eId, gradingSystem);
        const report = processedData[0] || {};

        const allStudentsInClass = students.filter(s => s.classId === student.classId && s.division === student.division && s.status !== 'TC Issued' && s.status !== 'Graduated').sort((a, b) => a.name.localeCompare(b.name));
        const allProcessed = processExamResultsData(allStudentsInClass, schedules, marks, eId, gradingSystem);
        allProcessed.sort((a, b) => b.grandTotalMarks - a.grandTotalMarks);
        const rank = allProcessed.findIndex(s => s.studentId === student.id) + 1;
        return { exam, report, rank };
    }).filter(Boolean);

    const allSubjectIds = [...new Set(examsData.flatMap(e => e.report.subjectResults?.map(r => r.subjectId) || []))];

    let headerRow1 = `<tr><th rowspan="2">Subject</th>`;
    let headerRow2 = ``;
    examsData.forEach(ed => {
        headerRow1 += `<th colspan="4" class="text-center">${ed.exam.name}</th>`;
        headerRow2 += `<th>TE/MaxTE</th><th>CE/MaxCE</th><th>Total/Max</th><th>Grade</th>`;
    });
    headerRow1 += `</tr>`;
    headerRow2 = `<tr>${headerRow2}</tr>`;

    let bodyRows = ``;
    allSubjectIds.forEach(subId => {
        const subjectName = subjects.find(s => s.id === subId)?.name || "N/A";
        let rowHtml = `<tr><td>${subjectName}</td>`;
        examsData.forEach(ed => {
            const res = ed.report.subjectResults?.find(r => r.subjectId === subId);
            if (res) {
                const totalMax = res.maxTE + res.maxCE;
                const totalGrade = gradingSystem === 'type1' 
                    ? calculateGrade(res.total, totalMax) 
                    : calculateGradeType2(res.total, totalMax);
                rowHtml += `
                    <td class="text-center">${res.te}/${res.maxTE} (${res.teGrade})</td>
                    <td class="text-center">${res.ce}/${res.maxCE} (${res.ceGrade})</td>
                    <td class="text-center">${res.total}/${totalMax}</td>
                    <td class="text-center">${totalGrade}</td>
                `;
            } else {
                rowHtml += `<td>-</td><td>-</td><td>-</td><td>-</td>`;
            }
        });
        rowHtml += `</tr>`;
        bodyRows += rowHtml;
    });

    // --- MODIFICATION IS HERE ---
    // A new row for the Grand Total is created.
    // This snippet replaces the previous 'grandTotalRow' block.
// It now correctly calculates the totals from the detailed subject results.

let grandTotalRow = `<tr class="table-light fw-bold"><th>Grand Total</th>`;
examsData.forEach(ed => {
    const subjectResults = ed.report.subjectResults || [];

    // Calculate TE and CE totals by iterating through the subject results
const totalTE = subjectResults.reduce((sum, res) => sum + (Number(res.te) || 0), 0);
const totalMaxTE = subjectResults.reduce((sum, res) => sum + (Number(res.maxTE) || 0), 0);
const totalCE = subjectResults.reduce((sum, res) => sum + (Number(res.ce) || 0), 0);
const totalMaxCE = subjectResults.reduce((sum, res) => sum + (Number(res.maxCE) || 0), 0);
    // Use pre-calculated grand totals if available, otherwise fall back to the new sums
    const grandTotal = ed.report.grandTotalMarks || (totalTE + totalCE);
    const grandMaxTotal = ed.report.grandTotalMaxMarks || (totalMaxTE + totalMaxCE);
    const overallGrade = ed.report.overallGrade || '-';

    // Calculate the grade for the TE total
    const teTotalGrade = gradingSystem === 'type1' 
        ? calculateGrade(totalTE, totalMaxTE) 
        : calculateGradeType2(totalTE, totalMaxTE);

    // Calculate the grade for the CE total
    const ceTotalGrade = gradingSystem === 'type1' 
        ? calculateGrade(totalCE, totalMaxCE) 
        : calculateGradeType2(totalCE, totalMaxCE);

    // Build the four distinct columns for the grand total row with the calculated data
    grandTotalRow += `
        <td class="text-center">${totalTE}/${totalMaxTE} (${teTotalGrade})</td>
        <td class="text-center">${totalCE}/${totalMaxCE} (${ceTotalGrade})</td>
        <td class="text-center">${grandTotal}/${grandMaxTotal}</td>
        <td class="text-center">${overallGrade}</td>
    `;
});
grandTotalRow += `</tr>`;

    let summaryRow = `<tr><th>Overall %</th>`;
    examsData.forEach(ed => { summaryRow += `<td colspan="4" class="text-center">${ed.report.grandPct?.toFixed(2) || "0"}%</td>`; });
    summaryRow += `</tr>`;

    let gradeRow = `<tr><th>Overall Grade</th>`;
    examsData.forEach(ed => { gradeRow += `<td colspan="4" class="text-center">${ed.report.overallGrade || "-"}</td>`; });
    gradeRow += `</tr>`;

    let resultRow = `<tr><th>Result</th>`;
    examsData.forEach(ed => {
        const status = ed.report.finalStatus || 'N/A';
        resultRow += `<td colspan="4" class="text-center text-${status === 'PASS' ? 'success' : 'danger'}">${status}</td>`;
    });
    resultRow += `</tr>`;

    let rankRow = `<tr><th>Rank</th>`;
    examsData.forEach(ed => { rankRow += `<td colspan="4" class="text-center">${ed.rank}</td>`; });
    rankRow += `</tr>`;

    let remark = "Performance is consistent.";
    if (examsData.length > 1) {
        const first = examsData[0].report.grandPct || 0;
        const last = examsData[examsData.length - 1].report.grandPct || 0;
        if (last > first) remark = "Excellent! Performance has improved.";
        else if (last < first) remark = "Performance has declined. Needs more effort.";
    }

    return `
    <div id="report-card-printable" class="p-2 border bg-white mx-auto" style="max-width: 100%;">
        <div class="report-header text-center mb-4">
            ${schoolDetails.logoUrl ? `<img src="${schoolDetails.logoUrl}" style="max-height: 80px; margin-bottom: 0.5rem;margin-top: -1rem;">` : ''}
            <h4>${schoolDetails.address.toUpperCase() || 'School Name'}</h4>
            <p>${schoolDetails.name || ''}</p>
            <h4>Progress Report Comparison</h4>
        </div>
        <div class="row mb-4 align-items-center">
            <div class="col-8">
                <table class="table table-sm table-borderless">
                    <tbody>
                        <tr><th style="width: 150px;">Student Name</th><td>: ${student.name}</td></tr>
                        <tr><th>Admission No</th><td>: ${student.admissionNumber || 'N/A'}</td></tr>
                        <tr><th>Class</th><td>: ${studentClass?.name || 'N/A'} - ${student.division || 'N/A'}</td></tr>
                        <tr><th>Date of Birth</th><td>: ${new Date(student.dob).toLocaleDateString('en-GB') || 'N/A'}</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="col-4 text-center">
                <img src="${studentPhotoSrc}" alt="Student Photo" class="img-thumbnail rounded-3 shadow-sm" style="width: 130px; height: 170px; object-fit: cover; border: 2px solid #ddd;">
            </div>
        </div>
        <table class="table table-bordered table-sm">
            <thead class="table-light text-center">${headerRow1}${headerRow2}</thead>
            <tbody>${bodyRows}${grandTotalRow}${summaryRow}${gradeRow}${resultRow}${rankRow}</tbody>
        </table>
        <div class="mt-2"><strong>Teacher's Remark:</strong> ${remark}</div>
        <div class="row mt-5 text-center text-muted" style="font-size: 0.9rem;">
            <div class="col-6"><hr class="mx-auto w-50">Class Teacher</div>
            <div class="col-6"><hr class="mx-auto w-50">Headmaster / Principal</div>
        </div>
    </div>`;
}

function generateReportCardHTML_Comparisonnew(studentId, examIds) {
    const student = students.find(s => s.id === studentId);
    if (!student) {
        console.error("Could not generate report card: Student not found for ID", studentId);
        return '<p class="alert alert-danger">Student data not found.</p>';
    }

    const studentClass = classes.find(c => c.id === student?.classId);
    const gradingSystem = document.getElementById('shared-grading-system')?.value || 'type1';
    const gradeFunc = gradingSystem === 'type1' ? calculateGrade : calculateGradeType2;
    const studentPhotoSrc = student.photoDriveId
        ? `https://drive.google.com/thumbnail?id=${student.photoDriveId}&sz=400`
        : 'https://placehold.co/150x200?text=No+Photo&font=roboto';

    const examsData = examIds.map(eId => {
        const exam = exams.find(e => e.id === eId);
        if (!exam) return null;

        const schedules = examSchedules.filter(s => s.examId === eId && s.classId === student.classId && s.division === student.division);
        const allStudentsInClass = students.filter(s => s.classId === student.classId && s.division === student.division && s.status !== 'TC Issued' && s.status !== 'Graduated').sort((a, b) => a.name.localeCompare(b.name));
        
        const allProcessed = processExamResultsData(allStudentsInClass, schedules, marks, eId, gradingSystem);

        allProcessed.forEach(procStudent => {
            let totalTE = 0, maxTE = 0, totalCE = 0, maxCE = 0;
            procStudent.subjectResults.forEach(res => {
                if (res.te !== 'AB' && res.te !== 'N/A') totalTE += Number(res.te);
                if (res.ce !== 'AB' && res.ce !== 'N/A') totalCE += Number(res.ce);
                maxTE += res.maxTE;
                maxCE += res.maxCE;
            });
            procStudent.grandTotalTE = totalTE;
            procStudent.grandMaxTE = maxTE;
            procStudent.grandTotalCE = totalCE;
            procStudent.grandMaxCE = maxCE;
        });

        const report = allProcessed.find(s => s.studentId === studentId) || {};

        allProcessed.sort((a, b) => b.grandTotalMarks - a.grandTotalMarks);
        const totalRank = (allProcessed.findIndex(s => s.studentId === studentId) + 1) || 0;
        allProcessed.sort((a, b) => b.grandTotalTE - a.grandTotalTE);
        const teRank = (allProcessed.findIndex(s => s.studentId === studentId) + 1) || 0;
        allProcessed.sort((a, b) => b.grandTotalCE - a.grandTotalCE);
        const ceRank = (allProcessed.findIndex(s => s.studentId === studentId) + 1) || 0;

        return { exam, report, totalRank, teRank, ceRank };
    }).filter(Boolean);

    const allSubjectIds = [...new Set(examsData.flatMap(e => e.report.subjectResults?.map(r => r.subjectId) || []))];

    let headerRow1 = `<tr><th rowspan="2">Subject</th>`;
    let headerRow2 = ``;
    examsData.forEach(ed => {
        headerRow1 += `<th colspan="4" class="text-center">${ed.exam.name}</th>`;
        headerRow2 += `<th>TE/MaxTE (Grade)</th><th>CE/MaxCE (Grade)</th><th>Total/Max</th><th>Grade</th>`;
    });
    headerRow1 += `</tr>`;
    headerRow2 = `<tr>${headerRow2}</tr>`;

    let bodyRows = ``;
    allSubjectIds.forEach(subId => {
        const subjectName = subjects.find(s => s.id === subId)?.name || "N/A";
        let rowHtml = `<tr><td>${subjectName}</td>`;
        examsData.forEach(ed => {
            const res = ed.report.subjectResults?.find(r => r.subjectId === subId);
            if (res) {
                const totalMax = res.maxTE + res.maxCE;
                const totalGrade = gradeFunc(res.total, totalMax);
                rowHtml += `
                    <td class="text-center">${res.te}/${res.maxTE} (${res.teGrade})</td>
                    <td class="text-center">${res.ce}/${res.maxCE} (${res.ceGrade})</td>
                    <td class="text-center">${res.total}/${totalMax}</td>
                    <td class="text-center">${totalGrade}</td>`;
            } else {
                rowHtml += `<td colspan="4" class="text-center">-</td>`;
            }
        });
        rowHtml += `</tr>`;
        bodyRows += rowHtml;
    });

    // --- NEW: Create the "Grand Total" row ---
    let grandTotalRow = `<tr class="fw-bold table-primary"><th>Grand Total</th>`;
    examsData.forEach(ed => {
        const totalMarks = ed.report.grandTotalMarks || 0;
        const maxMarks = ed.report.grandMaxMarks || 0;
        const overallGrade = ed.report.overallGrade || '-';
        grandTotalRow += `<td colspan="4" class="text-center">${totalMarks} / ${maxMarks} (${overallGrade})</td>`;
    });
    grandTotalRow += `</tr>`;
    
    // Create detailed summary rows
    let summaryRows = `<tr class="table-light"><th colspan="${1 + examsData.length * 4}" class="text-primary">PERFORMANCE SUMMARY</th></tr>`;
    summaryRows += `<tr><th>Overall %</th>`;
    examsData.forEach(ed => {
        const pctTE = ed.report.grandMaxTE > 0 ? (ed.report.grandTotalTE / ed.report.grandMaxTE * 100).toFixed(2) : 0;
        const pctCE = ed.report.grandMaxCE > 0 ? (ed.report.grandTotalCE / ed.report.grandMaxCE * 100).toFixed(2) : 0;
        summaryRows += `<td colspan="4" class="text-center">TE: ${pctTE}% | CE: ${pctCE}% | <strong>Total: ${ed.report.grandPct?.toFixed(2) || 0}%</strong></td>`;
    });
    summaryRows += `</tr>`;
    summaryRows += `<tr><th>Overall Grade</th>`;
    examsData.forEach(ed => {
        const gradeTE = gradeFunc(ed.report.grandTotalTE, ed.report.grandMaxTE);
        const gradeCE = gradeFunc(ed.report.grandTotalCE, ed.report.grandMaxCE);
        summaryRows += `<td colspan="4" class="text-center">TE: ${gradeTE} | CE: ${gradeCE} | <strong>Total: ${ed.report.overallGrade || "-"}</strong></td>`;
    });
    summaryRows += `</tr>`;
    summaryRows += `<tr><th>Result</th>`;
    examsData.forEach(ed => {
        const resultTE = (gradeFunc(ed.report.grandTotalTE, ed.report.grandMaxTE) === 'E' || gradeFunc(ed.report.grandTotalTE, ed.report.grandMaxTE) === 'F') ? 'FAIL' : 'PASS';
        const resultCE = (gradeFunc(ed.report.grandTotalCE, ed.report.grandMaxCE) === 'E' || gradeFunc(ed.report.grandTotalCE, ed.report.grandMaxCE) === 'F') ? 'FAIL' : 'PASS';
        const resultTotal = ed.report.finalStatus || 'N/A';
        summaryRows += `<td colspan="4" class="text-center text-${resultTotal === 'PASS' ? 'success' : 'danger'}">TE: ${resultTE} | CE: ${resultCE} | <strong>Total: ${resultTotal}</strong></td>`;
    });
    summaryRows += `</tr>`;
    summaryRows += `<tr><th>Rank</th>`;
    examsData.forEach(ed => {
        summaryRows += `<td colspan="4" class="text-center">TE: ${ed.teRank || '-'} | CE: ${ed.ceRank || '-'} | <strong>Total: ${ed.totalRank || '-'}</strong></td>`;
    });
    summaryRows += `</tr>`;

    let remark = "Performance is consistent.";
    if (examsData.length > 1) {
        const first = examsData[0].report.grandPct || 0;
        const last = examsData[examsData.length - 1].report.grandPct || 0;
        if (last > first) remark = "Excellent! Performance has improved.";
        else if (last < first) remark = "Performance has declined. Needs more effort.";
    }

    // --- FINAL HTML ASSEMBLY ---
    return `
    <div id="report-card-printable" class="p-2 border bg-white mx-auto" style="max-width: 100%;">
        <div class="report-header text-center mb-4">
            ${schoolDetails.logoUrl ? `<img src="${schoolDetails.logoUrl}" style="max-height: 80px; margin-bottom: 0.5rem;margin-top: -1rem;">` : ''}
            <h4>${schoolDetails.address.toUpperCase() || 'School Name'}</h4>
            <p>${schoolDetails.name || ''}</p>
            <h4>Progress Report Comparison</h4>
        </div>
        <div class="row mb-4 align-items-center">
            <div class="col-8">
                <table class="table table-sm table-borderless">
                    <tbody>
                        <tr><th style="width: 150px;">Student Name</th><td>: ${student.name}</td></tr>
                        <tr><th>Admission No</th><td>: ${student.admissionNumber || 'N/A'}</td></tr>
                        <tr><th>Class</th><td>: ${studentClass?.name || 'N/A'} - ${student.division || 'N/A'}</td></tr>
                        <tr><th>Date of Birth</th><td>: ${new Date(student.dob).toLocaleDateString('en-GB') || 'N/A'}</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="col-4 text-center">
                <img src="${studentPhotoSrc}" alt="Student Photo" class="img-thumbnail rounded-3 shadow-sm" style="width: 130px; height: 170px; object-fit: cover; border: 2px solid #ddd;">
            </div>
        </div>
        <table class="table table-bordered table-sm">
            <thead class="table-light text-center">${headerRow1}${headerRow2}</thead>
            
            <tbody>${bodyRows}${grandTotalRow}${summaryRows}</tbody>
            
        </table>
        <div class="mt-2"><strong>Teacher's Remark:</strong> ${remark}</div>
        <div class="row mt-5 text-center text-muted" style="font-size: 0.9rem;">
            <div class="col-6"><hr class="mx-auto w-50">Class Teacher</div>
            <div class="col-6"><hr class="mx-auto w-50">Headmaster / Principal</div>
        </div>
    </div>`;
}


function generateReportCardHTML_Comparisonold(studentId, examIds) {
    const student = students.find(s => s.id === studentId);
    if (!student) {
        console.error("Could not generate report card: Student not found for ID", studentId);
        return '<p class="alert alert-danger">Student data not found.</p>';
    }

    const studentClass = classes.find(c => c.id === student?.classId);
    const gradingSystem = document.getElementById('shared-grading-system')?.value || 'type1';
    const studentPhotoSrc = student.photoDriveId
        ? `https://drive.google.com/thumbnail?id=${student.photoDriveId}&sz=400`
        : 'https://placehold.co/150x200?text=No+Photo&font=roboto';

    const examsData = examIds.map(eId => {
        const exam = exams.find(e => e.id === eId);
        if (!exam) return null;

        const schedules = examSchedules.filter(s => s.examId === eId && s.classId === student.classId && s.division === student.division);
        const processedData = processExamResultsData([student], schedules, marks, eId, gradingSystem);
        const report = processedData[0] || {};

        const allStudentsInClass = students.filter(s => s.classId === student.classId && s.division === student.division && s.status !== 'TC Issued' && s.status !== 'Graduated').sort((a, b) => a.name.localeCompare(b.name));
        const allProcessed = processExamResultsData(allStudentsInClass, schedules, marks, eId, gradingSystem);
        allProcessed.sort((a, b) => b.grandTotalMarks - a.grandTotalMarks);
        const rank = allProcessed.findIndex(s => s.studentId === student.id) + 1;
        return { exam, report, rank };
    }).filter(Boolean);

    const allSubjectIds = [...new Set(examsData.flatMap(e => e.report.subjectResults?.map(r => r.subjectId) || []))];

    let headerRow1 = `<tr><th rowspan="2">Subject</th>`;
    let headerRow2 = ``;
    examsData.forEach(ed => {
        headerRow1 += `<th colspan="4" class="text-center">${ed.exam.name}</th>`;
        headerRow2 += `<th>TE/MaxTE</th><th>CE/MaxCE</th><th>Total/Max</th><th>Grade</th>`;
    });
    headerRow1 += `</tr>`;
    headerRow2 = `<tr>${headerRow2}</tr>`;

    let bodyRows = ``;
    allSubjectIds.forEach(subId => {
        const subjectName = subjects.find(s => s.id === subId)?.name || "N/A";
        let rowHtml = `<tr><td>${subjectName}</td>`;
        // This loop builds the main body of the marks table
examsData.forEach(ed => {
    const res = ed.report.subjectResults?.find(r => r.subjectId === subId);
    if (res) {
        const totalMax = res.maxTE + res.maxCE;

        // The grade for the total marks of the subject
        const totalGrade = gradingSystem === 'type1' 
            ? calculateGrade(res.total, totalMax) 
            : calculateGradeType2(res.total, totalMax);

        // --- MODIFICATION IS HERE ---
        // The individual grades for TE and CE are now included in brackets
        rowHtml += `
            <td class="text-center">${res.te}/${res.maxTE} (${res.teGrade})</td>
            <td class="text-center">${res.ce}/${res.maxCE} (${res.ceGrade})</td>
            <td class="text-center">${res.total}/${totalMax}</td>
            <td class="text-center">${totalGrade}</td>
        `;
    } else {
        // If no results, add empty cells
        rowHtml += `<td>-</td><td>-</td><td>-</td><td>-</td>`;
    }
});
        rowHtml += `</tr>`;
        bodyRows += rowHtml;
    });

    let summaryRow = `<tr><th>Overall %</th>`;
    examsData.forEach(ed => { summaryRow += `<td colspan="4" class="text-center">${ed.report.grandPct?.toFixed(2) || "0"}%</td>`; });
    summaryRow += `</tr>`;

    let gradeRow = `<tr><th>Overall Grade</th>`;
    examsData.forEach(ed => { gradeRow += `<td colspan="4" class="text-center">${ed.report.overallGrade || "-"}</td>`; });
    gradeRow += `</tr>`;

    let resultRow = `<tr><th>Result</th>`;
    examsData.forEach(ed => {
        const status = ed.report.finalStatus || 'N/A';
        resultRow += `<td colspan="4" class="text-center text-${status === 'PASS' ? 'success' : 'danger'}">${status}</td>`;
    });
    resultRow += `</tr>`;

    let rankRow = `<tr><th>Rank</th>`;
    examsData.forEach(ed => { rankRow += `<td colspan="4" class="text-center">${ed.rank}</td>`; });
    rankRow += `</tr>`;

    let remark = "Performance is consistent.";
    if (examsData.length > 1) {
        const first = examsData[0].report.grandPct || 0;
        const last = examsData[examsData.length - 1].report.grandPct || 0;
        if (last > first) remark = "Excellent! Performance has improved.";
        else if (last < first) remark = "Performance has declined. Needs more effort.";
    }

    return `
    <div id="report-card-printable" class="p-2 border bg-white mx-auto" style="max-width: 100%;">
        <div class="report-header text-center mb-4">
            ${schoolDetails.logoUrl ? `<img src="${schoolDetails.logoUrl}" style="max-height: 80px; margin-bottom: 0.5rem;margin-top: -1rem;">` : ''}
            <h4>${schoolDetails.address.toUpperCase() || 'School Name'}</h4>
            <p>${schoolDetails.name || ''}</p>
            <h4>Progress Report Comparison</h4>
        </div>
        <div class="row mb-4 align-items-center">
            <div class="col-8">
                <table class="table table-sm table-borderless">
                    <tbody>
                        <tr><th style="width: 150px;">Student Name</th><td>: ${student.name}</td></tr>
                        <tr><th>Admission No</th><td>: ${student.admissionNumber || 'N/A'}</td></tr>
                        <tr><th>Class</th><td>: ${studentClass?.name || 'N/A'} - ${student.division || 'N/A'}</td></tr>
                        <tr><th>Date of Birth</th><td>: ${new Date(student.dob).toLocaleDateString('en-GB') || 'N/A'}</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="col-4 text-center">
                <img src="${studentPhotoSrc}" alt="Student Photo" class="img-thumbnail rounded-3 shadow-sm" style="width: 130px; height: 170px; object-fit: cover; border: 2px solid #ddd;">
            </div>
        </div>
        <table class="table table-bordered table-sm">
            <thead class="table-light text-center">${headerRow1}${headerRow2}</thead>
            <tbody>${bodyRows}${summaryRow}${gradeRow}${resultRow}${rankRow}</tbody>
        </table>
        <div class="mt-2"><strong>Teacher's Remark:</strong> ${remark}</div>
        <div class="row mt-5 text-center text-muted" style="font-size: 0.9rem;">
            <div class="col-6"><hr class="mx-auto w-50">Class Teacher</div>
            <div class="col-6"><hr class="mx-auto w-50">Headmaster / Principal</div>
        </div>
    </div>`;
}

        function calculateGrade(score, maxScore) {
            if (String(score).toUpperCase() === 'AB') return 'AB';
            //if (score === 'AB') return 'AB';
            if (maxScore === 0) return '-';
            const percentage = (score / maxScore) * 100;
            if (percentage >= 90) return 'A+'; if (percentage >= 80) return 'A';
            if (percentage >= 70) return 'B+'; if (percentage >= 60) return 'B';
            if (percentage >= 50) return 'C+'; if (percentage >= 40) return 'C';
            if (percentage >= 30) return 'D';
            return 'E';
        }