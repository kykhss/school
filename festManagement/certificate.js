import { updateScopedDoc } from './firebase-config.js';
import { state, getStudentClassName } from './app-state.js';

const DEFAULT_CERTIFICATE_SETTINGS = {
    widthMm: 210,
    heightMm: 297,
    fields: {
        name: { x: 105, y: 105, fontSize: 28, color: '#111111' },
        class: { x: 105, y: 135, fontSize: 18, color: '#333333' },
        event: { x: 105, y: 170, fontSize: 18, color: '#333333' },
        category: { x: 105, y: 195, fontSize: 16, color: '#555555' },
        position: { x: 105, y: 235, fontSize: 24, color: '#111111' }
    }
};


function getCertificateSettings(fest) {
    const saved = fest.settings?.certificate || {};
    return {
        widthMm: Number(saved.widthMm) || DEFAULT_CERTIFICATE_SETTINGS.widthMm,
        heightMm: Number(saved.heightMm) || DEFAULT_CERTIFICATE_SETTINGS.heightMm,
        fields: Object.fromEntries(Object.entries(DEFAULT_CERTIFICATE_SETTINGS.fields).map(([field, defaults]) => [field, { ...defaults, ...(saved.fields?.[field] || {}) }]))
    };
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
                    rows.push({ name: student?.name || member.studentId, className: getStudentClassName(student?.classId, student?.division), event, rank: standing.position });
                });
            } else if (standing.studentId) {
                const student = state.students.find(item => item.id === standing.studentId);
                rows.push({ name: student?.name || standing.studentId, className: getStudentClassName(student?.classId, student?.division), event, rank: standing.position });
            }
        });
    });
    return rows.sort((a, b) => Number(a.rank) - Number(b.rank) || a.event.name.localeCompare(b.event.name) || a.name.localeCompare(b.name));
}

function renderCertificateControls(fest) {
    const events = state.festEvents.filter(event => event.festId === fest.id);
    const settings = getCertificateSettings(fest);
    return `
        <div class="ui-card">
            <div class="d-flex justify-content-between align-items-center mb-2"><div><h5 class="section-header mb-1"><i class="fas fa-certificate me-2 text-warning"></i>Certificate Printing</h5><p class="small text-muted mb-0">Design, save, preview, and print certificates for finalized event results.</p></div><button class="btn btn-sm btn-primary" onclick="window.openCertificateDesigner()"><i class="fas fa-paint-brush me-1"></i>Open Certificate Designer</button></div>
            <div class="row g-2 align-items-end mt-2"><div class="col-md-9"><label class="small fw-bold" for="certificate-events">Finalized Events</label><select id="certificate-events" class="form-select form-select-sm" multiple size="5">${events.filter(event => state.festResults.some(result => result.eventId === event.id)).map(event => `<option value="${event.id}">${event.name} (${event.category})</option>`).join('')}</select></div><div class="col-md-3 d-grid"><button class="btn btn-warning" onclick="window.printCertificateEntries()"><i class="fas fa-print me-1"></i>Print Certificates</button></div></div>
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
    preview.innerHTML = rows.length ? `<table class="table table-sm table-bordered"><thead><tr><th>Name</th><th>Class</th><th>Event</th><th>Category</th><th>Position</th></tr></thead><tbody>${rows.map(row => `<tr><td>${row.name}</td><td>${row.className}</td><td>${row.event.name}</td><td>${row.event.category || ''}</td><td>${row.rank}</td></tr>`).join('')}</tbody></table>` : '<div class="small text-muted border rounded p-3">Select finalized events to preview certificate winners.</div>';
};

window.saveCertificateSettings = async function(settings) {
    const fest = state.managingFest;
    if (!fest) return window.showAlert('No fest selected.', 'warning');
    const value = settings || getCertificateSettings(fest);
    const festSettings = { ...(fest.settings || {}), certificate: value };
    await updateScopedDoc('fests', fest.id, { settings: festSettings });
    fest.settings = festSettings;
    window.showAlert('Certificate arrangement saved.', 'success');
};

window.openCertificateDesigner = function() {
    const fest = state.managingFest;
    if (!fest) return window.showAlert('No fest selected.', 'warning');
    const popup = window.open('', 'certificate-designer', 'width=1200,height=850,resizable=yes,scrollbars=yes');
    if (!popup) return window.showAlert('Please allow pop-ups for the certificate designer.', 'warning');
    const settings = getCertificateSettings(fest);
    const fields = Object.keys(settings.fields);
    const samples = { name: 'Student Name', class: 'Class 10 A', event: 'Classical Dance', category: 'General', position: 'First Position' };
    popup.document.write(`<!doctype html><html><head><title>Certificate Designer</title><style>
        *{box-sizing:border-box}body{margin:0;background:#eef1f5;color:#1d2630;font-family:Segoe UI,Arial}header{padding:14px 20px;background:#162536;color:#fff}header h1{margin:0;font-size:20px}.toolbar{padding:10px 20px;background:#fff;border-bottom:1px solid #d5dbe2}button{border:0;border-radius:4px;padding:8px 13px;margin-right:6px;cursor:pointer;font-weight:600}.primary{background:#1677d2;color:#fff}.secondary{background:#e6ebf0}.layout{display:grid;grid-template-columns:340px 1fr;gap:18px;padding:18px}.panel{background:#fff;border:1px solid #d5dbe2;border-radius:6px;padding:14px}.dimensions,.field{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}label{display:block;font-size:11px;font-weight:700;color:#536372;text-transform:uppercase}input{width:100%;padding:6px;border:1px solid #c8d0d8;border-radius:3px}.field{grid-template-columns:55px 1fr 1fr 1fr 38px;padding:8px 0;border-top:1px solid #edf0f2}.field strong{padding-top:18px;text-transform:capitalize;font-size:12px}.preview-wrap{display:flex;justify-content:center;background:#dce2e8;padding:18px;overflow:auto}#preview{position:relative;background:#fff;box-shadow:0 5px 18px #75829166;flex:0 0 auto}.drag{position:absolute;transform:translate(-50%,-50%);white-space:nowrap;cursor:move;padding:3px 6px;border:1px dashed transparent}.drag:hover{border-color:#1677d2;background:#eaf4ff}</style></head><body><header><h1>Certificate Designer</h1><span>${fest.name}</span></header><div class="toolbar"><button class="primary" id="save">Save Arrangement</button><button class="secondary" id="reset">Reset</button><button class="secondary" id="print">Print</button><span id="status"></span></div><div class="layout"><section class="panel"><h3>Certificate Setup</h3><div class="dimensions"><div><label>Width mm</label><input id="width" type="number"></div><div><label>Height mm</label><input id="height" type="number"></div></div><div id="fields"></div><p>Drag any field in the preview. X/Y positions are measured from the top-left.</p></section><section class="preview-wrap"><div id="preview"></div></section></div><script>
        let model=${JSON.stringify(settings)};const names=${JSON.stringify(fields)};const samples=${JSON.stringify(samples)};const preview=document.getElementById('preview');const fields=document.getElementById('fields');const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||min));
        function controls(){document.getElementById('width').value=model.widthMm;document.getElementById('height').value=model.heightMm;fields.innerHTML=names.map(n=>{let x=model.fields[n];return '<div class="field"><strong>'+n+'</strong><div><label>X</label><input data-f="'+n+'" data-p="x" value="'+x.x+'"></div><div><label>Y</label><input data-f="'+n+'" data-p="y" value="'+x.y+'"></div><div><label>Pt</label><input data-f="'+n+'" data-p="fontSize" value="'+x.fontSize+'"></div><div><label>Color</label><input type="color" data-f="'+n+'" data-p="color" value="'+x.color+'"></div></div>'}).join('');document.querySelectorAll('input').forEach(i=>i.oninput=sync)}
        function sync(){model.widthMm=Math.max(50,Number(document.getElementById('width').value)||model.widthMm);model.heightMm=Math.max(50,Number(document.getElementById('height').value)||model.heightMm);document.querySelectorAll('[data-f]').forEach(i=>model.fields[i.dataset.f][i.dataset.p]=i.dataset.p==='color'?i.value:Math.max(0,Number(i.value)||model.fields[i.dataset.f][i.dataset.p]));render()}
        function render(){let scale=Math.min(720/model.widthMm,720/model.heightMm);preview.style.width=model.widthMm*scale+'px';preview.style.height=model.heightMm*scale+'px';preview.innerHTML=names.map(n=>{let x=model.fields[n];return '<div class="drag" data-f="'+n+'" style="left:'+x.x*scale+'px;top:'+x.y*scale+'px;font-size:'+x.fontSize*scale*.3528+'px;color:'+x.color+'">'+samples[n]+'</div>'}).join('');document.querySelectorAll('.drag').forEach(el=>{el.onpointerdown=e=>{let n=el.dataset.f,r=preview.getBoundingClientRect();let move=m=>{model.fields[n].x=clamp((m.clientX-r.left)/scale,0,model.widthMm);model.fields[n].y=clamp((m.clientY-r.top)/scale,0,model.heightMm);controls();render()};el.setPointerCapture(e.pointerId);el.onpointermove=move;el.onpointerup=()=>el.onpointermove=null}})}
        document.getElementById('save').onclick=async()=>{await opener.saveCertificateSettings(model);document.getElementById('status').textContent='Saved'};document.getElementById('reset').onclick=()=>{location.reload()};document.getElementById('print').onclick=()=>opener.printCertificateEntries();controls();render();
    <\/script></body></html>`);
    popup.document.close();
};

window.printCertificateEntries = function() {
    const rows = getWinnerRows(selectedEventIds());
    if (!rows.length) return window.showAlert('Select at least one finalized event.', 'warning');
    const certificate = getCertificateSettings(state.managingFest);
    const style = field => `left:${field.x}mm;top:${field.y}mm;font-size:${field.fontSize}pt;color:${field.color};`;
    const contentHtml = rows.map(row => `<section class="certificate-page"><div style="${style(certificate.fields.name)}">${row.name}</div><div style="${style(certificate.fields.class)}">${row.className}</div><div style="${style(certificate.fields.event)}">${row.event.name}</div><div style="${style(certificate.fields.category)}">${row.event.category || ''}</div><div style="${style(certificate.fields.position)}">${row.rank}</div></section>`).join('');
    const extraCss = `@page{size:${certificate.widthMm}mm ${certificate.heightMm}mm;margin:0}body{margin:0;padding:0}.certificate-page{position:relative;width:${certificate.widthMm}mm;height:${certificate.heightMm}mm;page-break-after:always;break-after:page;overflow:hidden}.certificate-page:last-child{page-break-after:auto}.certificate-page>div{position:absolute;transform:translateX(-50%);width:90%;text-align:center;font-family:Arial,sans-serif;font-weight:600}`;
    window.printReport({ contentHtml, title: `Certificates_${state.managingFest.name}`, extraCss, pageSize: `${certificate.widthMm}mm ${certificate.heightMm}mm` });
};

