import { updateScopedDoc } from './firebase-config.js';
import { state, getStudentClassName } from './app-state.js';

const FONT_OPTIONS = ['Arial', 'Calibri', 'Cambria', 'Courier New', 'Georgia', 'Garamond', 'Montserrat', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'];
const POSITION_LABELS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];

const DEFAULT_CERTIFICATE_SETTINGS = {
    widthMm: 210,
    heightMm: 297,
    orientation: 'portrait',
    bgDataUrl: '',
    fields: {
        name: { x: 105, y: 105, fontSize: 28, color: '#111111', fontFamily: 'Times New Roman', fontWeight: 600, rotation: 0, maxLength: 28, visible: true },
        class: { x: 105, y: 135, fontSize: 18, color: '#333333', fontFamily: 'Arial', fontWeight: 600, rotation: 0, maxLength: 20, visible: true },
        event: { x: 105, y: 170, fontSize: 18, color: '#333333', fontFamily: 'Arial', fontWeight: 600, rotation: 0, maxLength: 34, visible: true },
        category: { x: 105, y: 195, fontSize: 16, color: '#555555', fontFamily: 'Arial', fontWeight: 500, rotation: 0, maxLength: 18, visible: true },
        position: { x: 105, y: 235, fontSize: 24, color: '#111111', fontFamily: 'Arial', fontWeight: 700, rotation: 0, maxLength: 18, positionType: 'number', visible: true },
        place: { x: 105, y: 255, fontSize: 20, color: '#111111', fontFamily: 'Arial', fontWeight: 700, rotation: 0, maxLength: 22, positionType: 'place', visible: false }
    }
};

function getSafeNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function getPositionText(value, fieldConfig = {}) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
        const label = POSITION_LABELS[Math.max(0, Math.min(POSITION_LABELS.length - 1, numericValue - 1))] || `${numericValue}th`;
        if ((fieldConfig.positionType || 'number') === 'place') {
            return `${label} Place`;
        }
        return String(numericValue);
    }
    return String(value ?? '');
}

function fitTextToLength(value, fieldConfig = {}) {
    const text = String(value ?? '');
    const fontSize = getSafeNumber(fieldConfig.fontSize, 12);
    const maxLength = getSafeNumber(fieldConfig.maxLength, 0);
    if (!maxLength || text.length <= maxLength) {
        return { text, fontSize };
    }
    const adjusted = fontSize * (maxLength / text.length);
    return { text, fontSize: Math.max(8, Number(adjusted.toFixed(2))) };
}

function getFieldDisplayValue(fieldName, row, fieldConfig = {}) {
    if (fieldName === 'position' || fieldName === 'place') {
        const isPlaceField = fieldName === 'place' || (fieldConfig.positionType || 'number') === 'place';
        const numericText = String(row.rank ?? '');
        return isPlaceField ? getPositionText(row.rank, { positionType: 'place' }) : numericText;
    }
    if (fieldName === 'name') return row.name || '';
    if (fieldName === 'class') return row.className || '';
    if (fieldName === 'event') return row.event?.name || '';
    if (fieldName === 'category') return row.event?.category || '';
    return '';
}

function normalizeCertificateSettings(settings = {}) {
    const base = JSON.parse(JSON.stringify(DEFAULT_CERTIFICATE_SETTINGS));
    const savedFields = settings.fields || {};
    const mergedFields = {};
    Object.entries(base.fields).forEach(([fieldName, defaultField]) => {
        const savedField = savedFields[fieldName] || {};
        mergedFields[fieldName] = {
            ...defaultField,
            ...savedField,
            visible: savedField.visible !== undefined ? Boolean(savedField.visible) : defaultField.visible !== false
        };
    });
    return {
        widthMm: Math.max(50, getSafeNumber(settings.widthMm, base.widthMm)),
        heightMm: Math.max(50, getSafeNumber(settings.heightMm, base.heightMm)),
        orientation: settings.orientation === 'landscape' ? 'landscape' : 'portrait',
        bgDataUrl: typeof settings.bgDataUrl === 'string' ? settings.bgDataUrl : '',
        fields: mergedFields
    };
}

function getCertificateSettings(fest) {
    const saved = fest.settings?.certificate || {};
    return normalizeCertificateSettings(saved);
}

function selectedEventIds() {
    return Array.from(document.getElementById('certificate-events')?.selectedOptions || []).map(option => option.value);
}

function getWinnerRows(eventIds) {
    const fest = state.managingFest;
    const rows = [];
    state.festResults.filter(result => result.festId === fest.id && eventIds.includes(result.eventId)).forEach(result => {
        const event = state.festEvents.find(item => item.id === result.eventId);
        (result.results || []).forEach(standing => {
            if (standing.groupId) {
                const group = state.festGroups.find(item => item.id === standing.groupId);
                (group?.members || []).forEach(member => {
                    const student = state.students.find(item => item.id === member.studentId);
                    rows.push({ 
                        name: student?.name || member.studentId, 
                        admissionNumber: student?.admissionNumber || '', // <-- Added
                        className: getStudentClassName(student?.classId, student?.division), 
                        event, 
                        rank: standing.position 
                    });
                });
            } else if (standing.studentId) {
                const student = state.students.find(item => item.id === standing.studentId);
                rows.push({ 
                    name: student?.name || standing.studentId, 
                    admissionNumber: student?.admissionNumber || '', // <-- Added
                    className: getStudentClassName(student?.classId, student?.division), 
                    event, 
                    rank: standing.position 
                });
            }
        });
    });
    return rows.sort((a, b) => Number(a.rank) - Number(b.rank) || a.event.name.localeCompare(b.event.name) || a.name.localeCompare(b.name));
}

function renderCertificateControls(fest) {
    const events = state.festEvents.filter(event => event.festId === fest.id);
    return `
        <div class="ui-card">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <h5 class="section-header mb-1"><i class="fas fa-certificate me-2 text-warning"></i>Certificate Printing & Winner Checklists</h5>
                    <p class="small text-muted mb-0">Design, preview, print certificates, and download winner lists to track printed status.</p>
                </div>
                <button class="btn btn-sm btn-primary" onclick="window.openCertificateDesigner()"><i class="fas fa-paint-brush me-1"></i>Open Certificate Designer</button>
            </div>
            <div class="row g-2 align-items-end mt-2">
                <div class="col-md-7">
                    <label class="small fw-bold" for="certificate-events">Finalized Events</label>
                    <select id="certificate-events" class="form-select form-select-sm" multiple size="6">
                        ${events.filter(event => state.festResults.some(result => result.eventId === event.id)).map(event => `<option value="${event.id}">${event.name} (${event.category})</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-5">
                    <div class="card p-2 bg-light border">
                        <span class="small fw-bold text-muted mb-2 d-block">Actions & Reports</span>
                        <div class="row g-2">
                            <div class="col-6">
                                <button class="btn btn-warning btn-sm w-100" onclick="window.printCertificateEntries()"><i class="fas fa-print me-1"></i>Print Certs</button>
                            </div>
                            <div class="col-6">
                                <button class="btn btn-outline-secondary btn-sm w-100" onclick="window.exportCertificatePdf()"><i class="fas fa-file-pdf me-1"></i>Certs PDF</button>
                            </div>
                            <div class="col-6">
                                <button class="btn btn-success btn-sm w-100" onclick="window.exportWinnersCsv()"><i class="fas fa-file-csv me-1"></i>Winners CSV</button>
                            </div>
                            <div class="col-6">
                                <button class="btn btn-outline-dark btn-sm w-100" onclick="window.exportWinnersSummaryPdf()"><i class="fas fa-clipboard-check me-1"></i>Checklist PDF</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="certificate-entry-preview" class="table-responsive mt-3"></div>
        </div>`;
}

window.renderCertificateTab = function() {
    const container = document.getElementById('tab-certificate');
    if (!container || !state.managingFest) return;
    container.innerHTML = renderCertificateControls(state.managingFest);
    document.getElementById('certificate-events')?.addEventListener('change', window.renderCertificatePreview);
};

window.renderCertificatePreview = function() {
    const rows = getWinnerRows(selectedEventIds());
    const preview = document.getElementById('certificate-entry-preview');
    if (!preview) return;
    preview.innerHTML = rows.length ? `
        <table class="table table-sm table-bordered align-middle">
            <thead class="table-light">
                <tr>
                    <th style="width: 40px; text-align: center;">#</th>
                    <th>adNo</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Event</th>
                    <th>Category</th>
                    <th>Position</th>
                    <th style="width: 110px; text-align: center;">Printed?</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map((row, idx) => `
                    <tr>
                        <td class="text-center text-muted small">${idx + 1}</td>
                        <td class="fw-bold">${row.admissionNumber}</td>
                        <td class="fw-bold">${row.name}</td>
                        <td>${row.className}</td>
                        <td>${row.event.name}</td>
                        <td>${row.event.category || ''}</td>
                        <td><span class="badge bg-primary">${getPositionText(row.rank, getCertificateSettings(state.managingFest).fields.position)}</span></td>
                        <td class="text-center">
                            <input type="checkbox" class="form-check-input certificate-check" title="Mark as Printed">
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>` : '<div class="small text-muted border rounded p-3">Select finalized events to preview certificate winners and export lists.</div>';
};

window.exportWinnersCsv = function() {
    const rows = getWinnerRows(selectedEventIds());
    if (!rows.length) return window.showAlert('Select at least one finalized event.', 'warning');
    
    const settings = getCertificateSettings(state.managingFest);
    const headers = ['#','AdNo', 'Student Name', 'Class', 'Event', 'Category', 'Position', 'Printed (Y/N)'];
    
    const csvRows = [headers.join(',')];
    rows.forEach((row, index) => {
        const position = getPositionText(row.rank, settings.fields.position);
        const values = [
            index + 1,
            `"${(row.name || '').replace(/"/g, '""')}"`,
            `"${(row.admissionNumber || '').replace(/"/g, '""')}"`,
            `"${(row.className || '').replace(/"/g, '""')}"`,
            `"${(row.event?.name || '').replace(/"/g, '""')}"`,
            `"${(row.event?.category || '').replace(/"/g, '""')}"`,
            `"${position.replace(/"/g, '""')}"`,
            '""'
        ];
        csvRows.push(values.join(','));
    });

    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Winners_Checklist_${state.managingFest.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

window.exportWinnersSummaryPdf = function() {
    const rows = getWinnerRows(selectedEventIds());
    if (!rows.length) return window.showAlert('Select at least one finalized event.', 'warning');
    if (!window.jspdf || !window.jspdf.jsPDF) return window.showAlert('PDF library is not available. Please reload.', 'warning');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const settings = getCertificateSettings(state.managingFest);

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Winners & Certificate Printing Checklist`, 14, 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Fest: ${state.managingFest.name} | Date: ${new Date().toLocaleDateString()}`, 14, 25);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 28, 196, 28);

    let startY = 36;
    const lineHeight = 8;
    const marginX = 14;

    // Table Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('#', marginX, startY);
    doc.text('Name', marginX + 8, startY);
    doc.text('Class', marginX + 60, startY);
    doc.text('Event', marginX + 90, startY);
    doc.text('Pos', marginX + 145, startY);
    doc.text('Printed Mark', marginX + 165, startY);

    doc.line(marginX, startY + 2, 196, startY + 2);
    startY += 7;

    doc.setFont('helvetica', 'normal');
    rows.forEach((row, i) => {
        if (startY > 275) {
            doc.addPage();
            startY = 20;
            // Repeat Header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('#', marginX, startY);
            doc.text('Name', marginX + 8, startY);
            doc.text('Class', marginX + 60, startY);
            doc.text('Event', marginX + 90, startY);
            doc.text('Pos', marginX + 145, startY);
            doc.text('Printed Mark', marginX + 165, startY);
            doc.line(marginX, startY + 2, 196, startY + 2);
            startY += 7;
            doc.setFont('helvetica', 'normal');
        }

        const position = getPositionText(row.rank, settings.fields.position);
        doc.text(String(i + 1), marginX, startY);
        doc.text(String(row.name || '').substring(0, 28), marginX + 8, startY);
        doc.text(String(row.className || '').substring(0, 16), marginX + 60, startY);
        doc.text(String(row.event?.name || '').substring(0, 28), marginX + 90, startY);
        doc.text(String(position).substring(0, 10), marginX + 145, startY);

        // Printable checkbox box [ ]
        doc.rect(marginX + 172, startY - 3.5, 4.5, 4.5);

        doc.setDrawColor(240, 240, 240);
        doc.line(marginX, startY + 2.5, 196, startY + 2.5);
        startY += lineHeight;
    });

    doc.save(`Winners_Checklist_${state.managingFest.name.replace(/\s+/g, '_')}.pdf`);
};

window.saveCertificateSettings = async function(settings) {
    const fest = state.managingFest;
    if (!fest) return window.showAlert('No fest selected.', 'warning');
    const value = normalizeCertificateSettings(settings || getCertificateSettings(fest));
    const festSettings = { ...(fest.settings || {}), certificate: value };
    await updateScopedDoc('fests', fest.id, { settings: festSettings });
    fest.settings = festSettings;
    window.showAlert('Certificate arrangement saved.', 'success');
};

window.openCertificateDesigner = function() {
    const fest = state.managingFest;
    if (!fest) return window.showAlert('No fest selected.', 'warning');
    const popup = window.open('', 'certificate-designer', 'width=1240,height=880,resizable=yes,scrollbars=yes');
    if (!popup) return window.showAlert('Please allow pop-ups for the certificate designer.', 'warning');
    
    const settings = getCertificateSettings(fest);
    const fields = Object.keys(settings.fields);
    const samples = { name: 'Student Name', class: 'Class 10 A', event: 'Classical Dance', category: 'General', position: '1', place: 'First Place' };
    
    popup.document.write(`<!doctype html><html><head><title>Certificate Designer</title><style>
        *{box-sizing:border-box}
        body{margin:0;background:#eef1f5;color:#1d2630;font-family:Segoe UI,Arial}
        header{padding:12px 20px;background:#162536;color:#fff;display:flex;justify-content:space-between;align-items:center}
        header h1{margin:0;font-size:18px}
        .toolbar{padding:8px 20px;background:#fff;border-bottom:1px solid #d5dbe2;display:flex;align-items:center;flex-wrap:wrap;gap:8px}
        button{border:0;border-radius:4px;padding:7px 13px;cursor:pointer;font-weight:600;font-size:12px}
        .primary{background:#1677d2;color:#fff}
        .secondary{background:#e6ebf0;color:#1d2630}
        .danger{background:#fee2e2;color:#b91c1c}
        .toolbar-group{display:flex;align-items:center;gap:6px;border-left:1px solid #e2e8f0;padding-left:8px;margin-left:4px}
        .toolbar-group label{font-size:11px;font-weight:600;color:#4a5568}
        .layout{display:grid;grid-template-columns:480px 1fr;gap:16px;padding:16px;height:calc(100vh - 95px)}
        .panel{background:#fff;border:1px solid #d5dbe2;border-radius:6px;padding:14px;overflow-y:auto}
        .panel h3{margin-top:0;font-size:14px;margin-bottom:10px}
        .dimensions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px}
        .field{padding:10px 0;border-top:1px solid #edf0f2}
        .field-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
        .field-head strong{text-transform:capitalize;font-size:12px;color:#1d2630}
        .field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
        .field label{display:block;font-size:10px;font-weight:700;color:#536372;text-transform:uppercase;margin-bottom:2px}
        .input-wrap{display:flex;flex-direction:column;min-width:0}
        .field input,.field select{width:100%;padding:5px 7px;border:1px solid #c8d0d8;border-radius:4px;min-height:28px;font-size:12px}
        .field input[type="color"]{padding:2px;height:28px}
        .visible-toggle{display:flex;align-items:center;cursor:pointer;font-size:12px}
        .visible-toggle input{width:14px;height:14px;margin-right:4px}
        .preview-wrap{display:flex;justify-content:center;align-items:center;background:#cbd5e1;padding:20px;overflow:auto;border-radius:6px;border:1px solid #cbd5e1}
        #preview{position:relative;background:#fff;box-shadow:0 8px 24px rgba(0,0,0,0.18);flex:0 0 auto;user-select:none;background-size:100% 100%;background-repeat:no-repeat}
        .drag{position:absolute;transform:translate(-50%,-50%);white-space:nowrap;cursor:move;padding:2px 6px;border:1px dashed transparent;border-radius:3px;user-select:none}
        .drag:hover{border-color:#1677d2;background:rgba(22,119,210,0.12)}
        @media (max-width: 980px){.layout{grid-template-columns:1fr;height:auto}.field-grid{grid-template-columns:1fr 1fr}}
    </style></head><body>
    <header><h1>Certificate Designer</h1><span>${fest.name}</span></header>
    <div class="toolbar">
        <button class="primary" id="save">Save Settings</button>
        <button class="secondary" id="reset">Reset</button>
        
        <div class="toolbar-group">
            <input type="file" id="bg-uploader" accept="image/*" style="display:none">
            <button class="secondary" onclick="document.getElementById('bg-uploader').click()">Upload Reference BG</button>
            <button class="danger" id="remove-bg" style="display:none">Clear BG</button>
            <label for="bg-opacity">Opacity:</label>
            <input type="range" id="bg-opacity" min="0.1" max="1" step="0.05" value="0.8" style="width:70px">
        </div>

        <div class="toolbar-group">
            <button class="secondary" id="print">Print</button>
            <button class="secondary" id="save-pdf">Export PDF</button>
        </div>
        <span id="status" style="margin-left:auto;font-weight:600;font-size:12px;color:#16a34a"></span>
    </div>
    <div class="layout">
        <section class="panel">
            <h3>Dimensions & Layout</h3>
            <div class="dimensions">
                <div><label>Width (mm)</label><input id="width" type="number"></div>
                <div><label>Height (mm)</label><input id="height" type="number"></div>
                <div><label>Orientation</label><select id="orientation"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></div>
            </div>
            <div id="fields"></div>
        </section>
        <section class="preview-wrap">
            <div id="preview"></div>
        </section>
    </div>
    <script>
        const fontOptions = ${JSON.stringify(FONT_OPTIONS)};
        const model = ${JSON.stringify(settings)};
        const names = ${JSON.stringify(fields)};
        const samples = ${JSON.stringify(samples)};
        const preview = document.getElementById('preview');
        const fields = document.getElementById('fields');
        const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v) || min));

        function setOrientationValue() {
            document.getElementById('orientation').value = model.orientation === 'landscape' ? 'landscape' : 'portrait';
        }

        function controls() {
            document.getElementById('width').value = model.widthMm;
            document.getElementById('height').value = model.heightMm;
            setOrientationValue();
            
            fields.innerHTML = names.map(name => {
                const field = model.fields[name] || {};
                const positionType = field.positionType || 'number';
                const fontMarkup = fontOptions.map(font => '<option value="'+font+'"'+(field.fontFamily===font?' selected':'')+'>'+font+'</option>').join('');
                const positionMarkup = '<option value="number"'+(positionType==='number'?' selected':'')+'>1, 2, 3</option><option value="place"'+(positionType==='place'?' selected':'')+'>First Place</option>';
                const typeControl = (name === 'position' || name === 'place') 
                    ? '<div class="input-wrap"><label>Type</label><select data-f="'+name+'" data-p="positionType">'+positionMarkup+'</select></div>' 
                    : '<div class="input-wrap"><label>Type</label><input value="—" readonly disabled></div>';
                
                return '<div class="field">' +
                    '<div class="field-head">' +
                        '<strong>' + name + '</strong>' +
                        '<label class="visible-toggle"><input type="checkbox" data-f="'+name+'" data-p="visible" '+(field.visible !== false ? 'checked' : '')+'> Show</label>' +
                    '</div>' +
                    '<div class="field-grid">' +
                        '<div class="input-wrap"><label>X (mm)</label><input type="number" data-f="'+name+'" data-p="x" value="'+(field.x||0)+'"></div>' +
                        '<div class="input-wrap"><label>Y (mm)</label><input type="number" data-f="'+name+'" data-p="y" value="'+(field.y||0)+'"></div>' +
                        '<div class="input-wrap"><label>Size (pt)</label><input type="number" data-f="'+name+'" data-p="fontSize" value="'+(field.fontSize||12)+'"></div>' +
                        '<div class="input-wrap"><label>Color</label><input type="color" data-f="'+name+'" data-p="color" value="'+(field.color||'#111111')+'"></div>' +
                        '<div class="input-wrap"><label>Font</label><select data-f="'+name+'" data-p="fontFamily">'+fontMarkup+'</select></div>' +
                        '<div class="input-wrap"><label>Rot (°)</label><input type="number" data-f="'+name+'" data-p="rotation" value="'+(field.rotation||0)+'"></div>' +
                        '<div class="input-wrap"><label>Max Chars</label><input type="number" data-f="'+name+'" data-p="maxLength" value="'+(field.maxLength||0)+'"></div>' +
                        typeControl +
                    '</div>' +
                '</div>';
            }).join('');

            document.querySelectorAll('input, select').forEach(i => i.oninput = sync);
        }

        function sync(e) {
            const orientation = document.getElementById('orientation').value;
            model.orientation = orientation;
            model.widthMm = Math.max(50, Number(document.getElementById('width').value) || model.widthMm);
            model.heightMm = Math.max(50, Number(document.getElementById('height').value) || model.heightMm);
            
            if (e && e.target && e.target.id === 'orientation') {
                if (orientation === 'landscape' && model.widthMm < model.heightMm) {
                    [model.widthMm, model.heightMm] = [model.heightMm, model.widthMm];
                    document.getElementById('width').value = model.widthMm;
                    document.getElementById('height').value = model.heightMm;
                } else if (orientation === 'portrait' && model.heightMm < model.widthMm) {
                    [model.widthMm, model.heightMm] = [model.heightMm, model.widthMm];
                    document.getElementById('width').value = model.widthMm;
                    document.getElementById('height').value = model.heightMm;
                }
            }

            document.querySelectorAll('[data-f]').forEach(i => {
                const fieldName = i.dataset.f;
                const prop = i.dataset.p;
                const target = model.fields[fieldName] = model.fields[fieldName] || {};
                if (i.type === 'checkbox') {
                    target[prop] = i.checked;
                } else if (i.type === 'color' || prop === 'fontFamily' || prop === 'positionType') {
                    target[prop] = i.value;
                } else if (prop === 'maxLength' || prop === 'fontSize' || prop === 'x' || prop === 'y' || prop === 'rotation') {
                    target[prop] = Number(i.value) || 0;
                }
            });

            render();
        }

        function render() {
            let scale = Math.min(680 / model.widthMm, 680 / model.heightMm);
            preview.style.width = (model.widthMm * scale) + 'px';
            preview.style.height = (model.heightMm * scale) + 'px';
            
            if (model.bgDataUrl) {
                preview.style.backgroundImage = 'url("' + model.bgDataUrl + '")';
                document.getElementById('remove-bg').style.display = 'inline-block';
            } else {
                preview.style.backgroundImage = 'none';
                document.getElementById('remove-bg').style.display = 'none';
            }

            preview.innerHTML = names.filter(name => (model.fields[name] || {}).visible !== false).map(name => {
                const x = model.fields[name] || {};
                const sample = samples[name] || name;
                const fontSize = x.fontSize || 12;
                const fit = (x.maxLength && sample.length > x.maxLength) 
                    ? { fontSize: Math.max(8, fontSize * (x.maxLength / sample.length)) } 
                    : { fontSize };
                
                return '<div class="drag" data-f="'+name+'" style="left:'+(x.x * scale)+'px;top:'+(x.y * scale)+'px;font-size:'+(fit.fontSize * scale * 0.3528)+'px;color:'+(x.color||'#000')+';font-family:'+(x.fontFamily||'Arial')+';font-weight:'+(x.fontWeight||600)+';transform:translate(-50%,-50%) rotate('+(x.rotation || 0)+'deg);">'+sample+'</div>';
            }).join('');

            document.querySelectorAll('.drag').forEach(el => {
                el.onpointerdown = e => {
                    const name = el.dataset.f;
                    const rect = preview.getBoundingClientRect();
                    
                    const move = m => {
                        const newX = Math.round(clamp((m.clientX - rect.left) / scale, 0, model.widthMm));
                        const newY = Math.round(clamp((m.clientY - rect.top) / scale, 0, model.heightMm));
                        
                        model.fields[name].x = newX;
                        model.fields[name].y = newY;
                        
                        const inputX = document.querySelector('input[data-f="'+name+'"][data-p="x"]');
                        const inputY = document.querySelector('input[data-f="'+name+'"][data-p="y"]');
                        if (inputX) inputX.value = newX;
                        if (inputY) inputY.value = newY;
                        
                        el.style.left = (newX * scale) + 'px';
                        el.style.top = (newY * scale) + 'px';
                    };
                    
                    el.setPointerCapture(e.pointerId);
                    el.onpointermove = move;
                    el.onpointerup = () => {
                        el.onpointermove = null;
                        el.onpointerup = null;
                    };
                };
            });
        }

        document.getElementById('bg-uploader').onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = evt => {
                const img = new Image();
                img.onload = () => {
                    model.bgDataUrl = evt.target.result;
                    if (img.naturalWidth > img.naturalHeight) {
                        model.orientation = 'landscape';
                        model.widthMm = 297;
                        model.heightMm = 210;
                    } else {
                        model.orientation = 'portrait';
                        model.widthMm = 210;
                        model.heightMm = 297;
                    }
                    controls();
                    render();
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        };

        document.getElementById('remove-bg').onclick = () => {
            model.bgDataUrl = '';
            document.getElementById('bg-uploader').value = '';
            render();
        };

        document.getElementById('bg-opacity').oninput = e => {
            preview.style.opacity = e.target.value;
        };

        controls();
        render();

        document.getElementById('save')?.addEventListener('click', async () => {
            const status = document.getElementById('status');
            status.textContent = 'Saving...';
            await opener.saveCertificateSettings(model);
            status.textContent = 'Saved!';
            setTimeout(() => { status.textContent = ''; }, 3000);
        });
        document.getElementById('reset')?.addEventListener('click', () => location.reload());
        document.getElementById('print')?.addEventListener('click', () => opener.printCertificateEntries());
        document.getElementById('save-pdf')?.addEventListener('click', () => opener.exportCertificatePdf());
    <\/script></body></html>`);
    popup.document.close();
};

function buildCertificatePageMarkup(rows, certificate) {
    const buildFieldStyle = (field, value) => {
        const setting = { ...DEFAULT_CERTIFICATE_SETTINGS.fields.name, ...field };
        const fitValue = fitTextToLength(value, setting);
        return `left:${setting.x}mm;top:${setting.y}mm;font-size:${fitValue.fontSize}pt;color:${setting.color};font-family:${setting.fontFamily || 'Arial'};font-weight:${setting.fontWeight || 600};transform:translate(-50%,-50%) rotate(${setting.rotation || 0}deg);text-align:center;white-space:nowrap;`;
    };

    return rows.map(row => {
        const blocks = Object.entries(certificate.fields)
            .filter(([fieldName, field]) => field.visible !== false)
            .map(([fieldName, field]) => {
                const value = getFieldDisplayValue(fieldName, row, field);
                return `<div style="${buildFieldStyle(field, value)}">${value}</div>`;
            }).join('');
        return `<section class="certificate-page">${blocks}</section>`;
    }).join('');
}

window.printCertificateEntries = function() {
    const rows = getWinnerRows(selectedEventIds());
    if (!rows.length) return window.showAlert('Select at least one finalized event.', 'warning');
    const certificate = getCertificateSettings(state.managingFest);
    const contentHtml = buildCertificatePageMarkup(rows, certificate);
    const extraCss = `html,body{margin:0;padding:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.certificate-page{position:relative;width:${certificate.widthMm}mm;height:${certificate.heightMm}mm;page-break-after:always;break-after:page;overflow:hidden;margin:0}.certificate-page:last-child{page-break-after:auto}.certificate-page>div{position:absolute;transform-origin:center center;white-space:nowrap}@page{size:${certificate.widthMm}mm ${certificate.heightMm}mm;margin:0}`;
    window.printReport({ contentHtml, title: `Certificates_${state.managingFest.name}`, extraCss, pageSize: `${certificate.widthMm}mm ${certificate.heightMm}mm` });
};

window.exportCertificatePdf = function() {
    const rows = getWinnerRows(selectedEventIds());
    if (!rows.length) return window.showAlert('Select at least one finalized event.', 'warning');
    if (!window.jspdf || !window.jspdf.jsPDF) return window.showAlert('PDF library is not available. Please reload the page and try again.', 'warning');

    const certificate = getCertificateSettings(state.managingFest);
    const { jsPDF } = window.jspdf;
    const pageWidth = Number(certificate.widthMm) || 210;
    const pageHeight = Number(certificate.heightMm) || 297;
    const doc = new jsPDF({
        orientation: certificate.orientation === 'landscape' ? 'l' : 'p',
        unit: 'mm',
        format: [pageWidth, pageHeight]
    });

    const hexToRgb = hex => {
        const value = hex.replace('#', '').trim();
        if (value.length === 3) return value.split('').map(ch => ch + ch).map(Number.parseInt, 10);
        if (value.length !== 6) return [17, 17, 17];
        const num = Number.parseInt(value, 16);
        return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    };

    const setPdfFont = (field = {}) => {
        const fontName = field.fontFamily || 'helvetica';
        const supported = ['helvetica', 'times', 'courier'];
        const safeFont = supported.includes(fontName.toLowerCase()) ? fontName.toLowerCase() : 'helvetica';
        doc.setFont(safeFont, field.fontWeight && field.fontWeight >= 600 ? 'bold' : 'normal');
    };

    rows.forEach((row, index) => {
        if (index > 0) doc.addPage([pageWidth, pageHeight], certificate.orientation === 'landscape' ? 'l' : 'p');

        Object.entries(certificate.fields)
            .filter(([fieldName, field]) => field.visible !== false)
            .forEach(([fieldName, field]) => {
                const value = getFieldDisplayValue(fieldName, row, field);
                const fitValue = fitTextToLength(value, field);
                const [r, g, b] = hexToRgb(field.color || '#111111');
                const x = Number(field.x) || 0;
                const y = Number(field.y) || 0;
                const angle = Number(field.rotation) || 0;

                setPdfFont(field);
                doc.setFontSize(fitValue.fontSize);
                doc.setTextColor(r, g, b);
                doc.text(String(value), x, y, { align: 'center', baseline: 'middle', angle });
            });
    });

    const filename = `Certificates_${state.managingFest.name}.pdf`;
    doc.save(filename);
};