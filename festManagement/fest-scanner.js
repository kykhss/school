// =========================================================================
// --- FEST QR SCANNER ENGINE (fest-scanner.js) ---
// =========================================================================

import { systemContext, setActiveYear } from "./firebase-config.js";

async function ensureQrScannerLibrary() {
    if (window.Html5Qrcode) return true;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error('Failed to load html5-qrcode library.'));
        document.head.appendChild(script);
    });
}

export async function openQrScannerModal() {
    try {
        await ensureQrScannerLibrary();
    } catch (err) {
        console.error(err);
        window.showAlert?.('Could not load camera scanner library.', 'danger');
        return;
    }

    const modalBody = `
        <div class="text-center p-2">
            <!-- Camera Stream Area -->
            <div id="qr-reader-container" style="width: 100%; max-width: 400px; margin: 0 auto; overflow: hidden; border-radius: 8px; border: 2px dashed #0d6efd; background: #000;">
                <div id="qr-camera-stream" style="width: 100%; min-height: 250px;"></div>
            </div>
            
            <div class="small text-muted mt-2">
                <i class="fas fa-camera me-1"></i>Align the <strong>Scorecard QR Code</strong> within the frame
            </div>

            <div id="qr-scan-status" class="alert alert-info py-1 px-2 mt-2 mb-0 small d-none"></div>

            <!-- Manual Fallback Entry -->
            <div class="mt-3 pt-3 border-top text-start">
                <label class="form-label small fw-bold mb-1">
                    <i class="fas fa-keyboard me-1 text-secondary"></i>Camera not working? Enter Event ID manually:
                </label>
                <div class="input-group input-group-sm">
                    <input type="text" id="manual-event-id-input" class="form-control font-monospace" placeholder="e.g. EVT_1726000000_SENIOR_M">
                    <button class="btn btn-primary" id="btn-submit-manual-event">
                        <i class="fas fa-arrow-right me-1"></i>Open Event
                    </button>
                </div>
                <small class="text-muted" style="font-size: 0.72rem;">Look for the <code>ID: ...</code> printed directly below the QR code on the scorecard.</small>
            </div>
        </div>
    `;

    const modalFooter = `
        <button class="btn btn-secondary btn-sm px-3" data-bs-dismiss="modal" id="btn-close-scanner">Cancel</button>
    `;

    const modal = window.showGlobalModal?.(`<i class="fas fa-qrcode me-2"></i>Scorecard Result Entry`, modalBody, modalFooter);

    let html5QrCode = null;

    const stopCamera = async () => {
        if (html5QrCode && html5QrCode.isScanning) {
            try {
                await html5QrCode.stop();
                html5QrCode.clear();
            } catch (e) {
                console.warn('Camera stop warning:', e);
            }
        }
    };

    const modalElement = document.querySelector('.modal.show');
    modalElement?.addEventListener('hidden.bs.modal', stopCamera, { once: true });

    // Helper to process both scanned QR URLs and manually typed event IDs
    const navigateToEvent = async (rawInput) => {
        const text = rawInput.trim();
        if (!text) {
            window.showAlert?.('Please enter an Event ID.', 'warning');
            return;
        }

        await stopCamera();
        modal?.hide();

        let targetEventId = text;
        let targetFestId = null;
        let targetYearId = null;
        let targetJudgeCode = '';

        if (text.includes('?')) {
            const queryString = text.split('?')[1];
            const params = new URLSearchParams(queryString);
            targetEventId = params.get('event') || text;
            targetFestId = params.get('fest');
            targetYearId = params.get('year');
            targetJudgeCode = params.get('code') || '';
        }

        if (targetYearId && typeof setActiveYear === 'function') {
            setActiveYear(targetYearId);
        }

        const activeFest = targetFestId || window.state?.managingFest?.id || '';
        const activeYear = targetYearId || systemContext.activeYearId || '';
        const codeParam = targetJudgeCode ? `&code=${encodeURIComponent(targetJudgeCode)}` : '';

        window.location.hash = `#fest-judge?year=${activeYear}&fest=${encodeURIComponent(activeFest)}&event=${encodeURIComponent(targetEventId)}${codeParam}`;
        window.showAlert?.(`Loaded Event: ${targetEventId}`, 'success');
    };

    // Attach manual submit click & enter key
    const manualBtn = document.getElementById('btn-submit-manual-event');
    const manualInput = document.getElementById('manual-event-id-input');

    manualBtn?.addEventListener('click', () => {
        navigateToEvent(manualInput?.value || '');
    });

    manualInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            navigateToEvent(manualInput?.value || '');
        }
    });

    // Start camera scanning
    try {
        html5QrCode = new window.Html5Qrcode("qr-camera-stream");
        const statusBox = document.getElementById('qr-scan-status');

        const onScanSuccess = async (decodedText) => {
            if (!decodedText) return;
            if (statusBox) {
                statusBox.classList.remove('d-none');
                statusBox.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i>QR detected! Loading event...`;
            }
            navigateToEvent(decodedText);
        };

        const config = { 
            fps: 10, 
            qrbox: { width: 200, height: 200 },
            aspectRatio: 1.0
        };

        await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess);

    } catch (err) {
        console.error("Camera access error:", err);
        const statusBox = document.getElementById('qr-scan-status');
        if (statusBox) {
            statusBox.classList.remove('d-none', 'alert-info');
            statusBox.classList.add('alert-warning');
            statusBox.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i>Camera unavailable or permission denied. Use the manual ID box below.`;
        }
    }
}

window.openQrScannerModal = openQrScannerModal;
