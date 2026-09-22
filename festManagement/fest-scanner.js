// =========================================================================
// --- FEST QR SCANNER ENGINE (fest-scanner.js) ---
// =========================================================================

import { systemContext, setActiveYear } from "./firebase-config.js";
import { state } from "./app-state.js";

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
                <div id="qr-camera-stream" style="width: 100%; min-height: 240px;"></div>
            </div>
            
            <div class="small text-muted mt-2">
                <i class="fas fa-camera me-1"></i>Point camera at the Scorecard QR code
            </div>

            <div id="qr-scan-status" class="alert alert-info py-1 px-2 mt-2 mb-0 small d-none"></div>

            <!-- Scanned / Manual Input Field -->
            <div class="mt-3 pt-3 border-top text-start">
                <label class="form-label small fw-bold mb-1">
                    <i class="fas fa-id-badge me-1 text-primary"></i>Detected / Entered Event ID:
                </label>
                <div class="input-group mb-2">
                    <input type="text" id="manual-event-id-input" class="form-control font-monospace fw-bold" placeholder="Scan QR or type ID..." style="letter-spacing: 0.5px;">
                    <button class="btn btn-success fw-bold" id="btn-submit-manual-event">
                        <i class="fas fa-arrow-right me-1"></i>Load Result Entry
                    </button>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted" style="font-size: 0.72rem;">ID format: <code>EVT_...</code></small>
                    <button class="btn btn-link btn-xs text-danger p-0" id="btn-clear-event-input">Clear</button>
                </div>
            </div>
        </div>
    `;

    const modalFooter = `
        <button class="btn btn-secondary btn-sm px-3" data-bs-dismiss="modal" id="btn-close-scanner">Close</button>
    `;

    const modal = window.showGlobalModal?.(`<i class="fas fa-qrcode me-2"></i>Event QR Scanner`, modalBody, modalFooter);

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

    const manualInput = document.getElementById('manual-event-id-input');
    const statusBox = document.getElementById('qr-scan-status');

    // Parse Event ID from raw string, URL parameters, or plain text
    function extractEventId(rawText) {
        if (!rawText) return null;
        let text = rawText.trim();
        
        if (text.includes('?')) {
            const queryString = text.split('?')[1];
            const params = new URLSearchParams(queryString);
            return params.get('event') || null;
        }
        return text;
    }

    // Function to load the event into the result-entry tab or open judge portal
    const proceedToEventResult = async (eventId) => {
        if (!eventId) {
            window.showAlert?.('Please provide an Event ID.', 'warning');
            return;
        }

        await stopCamera();
        modal?.hide();

        // 1. If currently inside admin workspace with the result entry tab available
        const adminEventSelect = document.getElementById('admin-result-event');
        const resultTabBtn = document.querySelector('button[data-bs-target="#tab-result-entry"]');

        if (adminEventSelect && resultTabBtn) {
            // Switch to result entry tab
            const tabTrigger = new bootstrap.Tab(resultTabBtn);
            tabTrigger.show();

            // Set the dropdown and click load
            adminEventSelect.value = eventId;
            document.getElementById('admin-result-load')?.click();
            window.showAlert?.(`Loaded Event: ${eventId}`, 'success');
            return;
        }

        // 2. Fallback: navigate directly to judge scoring mode
        const activeFest = state.managingFest?.id || '';
        const activeYear = systemContext.activeYearId || '';
        window.location.hash = `#fest-judge?year=${activeYear}&fest=${encodeURIComponent(activeFest)}&event=${encodeURIComponent(eventId)}`;
        window.showAlert?.(`Opening scoring for Event: ${eventId}`, 'success');
    };

    // Camera Scan Success
    const onScanSuccess = (decodedText) => {
        const foundId = extractEventId(decodedText);

        if (!foundId) {
            if (statusBox) {
                statusBox.classList.remove('d-none', 'alert-info');
                statusBox.classList.add('alert-warning');
                statusBox.innerHTML = `<i class="fas fa-exclamation-circle me-1"></i>QR scanned, but no valid Event ID detected.`;
            }
            return;
        }

        // Put the scanned ID into the text input field
        if (manualInput) {
            manualInput.value = foundId;
            manualInput.classList.add('is-valid');
        }

        if (statusBox) {
            statusBox.classList.remove('d-none', 'alert-warning');
            statusBox.classList.add('alert-success');
            statusBox.innerHTML = `<i class="fas fa-check-circle me-1"></i>Found Event ID: <strong>${foundId}</strong>. Loading...`;
        }

        // Automatically trigger load after a brief 500ms pause so the user sees the filled ID
        setTimeout(() => {
            proceedToEventResult(foundId);
        }, 500);
    };

    // Manual Buttons
    document.getElementById('btn-submit-manual-event')?.addEventListener('click', () => {
        const id = extractEventId(manualInput.value);
        proceedToEventResult(id);
    });

    manualInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const id = extractEventId(manualInput.value);
            proceedToEventResult(id);
        }
    });

    document.getElementById('btn-clear-event-input')?.addEventListener('click', () => {
        if (manualInput) {
            manualInput.value = '';
            manualInput.classList.remove('is-valid');
        }
        if (statusBox) statusBox.classList.add('d-none');
    });

    // Start Camera Feed
    try {
        html5QrCode = new window.Html5Qrcode("qr-camera-stream");
        const config = { 
            fps: 10, 
            qrbox: { width: 200, height: 200 },
            aspectRatio: 1.0
        };

        await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess);

    } catch (err) {
        console.error("Camera access error:", err);
        if (statusBox) {
            statusBox.classList.remove('d-none', 'alert-info');
            statusBox.classList.add('alert-warning');
            statusBox.innerHTML = `<i class="fas fa-video-slash me-1"></i>Camera unavailable. Type the ID in the box below.`;
        }
    }
}

window.openQrScannerModal = openQrScannerModal;
