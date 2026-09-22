// =========================================================================
// --- FEST QR SCANNER ENGINE (fest-scanner.js) ---
// =========================================================================

import { systemContext, setActiveYear } from "./firebase-config.js";
import { state } from "./app-state.js";

/**
 * Ensures the html5-qrcode script is loaded from CDN before camera init.
 */
async function ensureQrScannerLibrary() {
    if (window.Html5Qrcode) {
        return true;
    }
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error('Failed to load html5-qrcode library.'));
        document.head.appendChild(script);
    });
}

function extractEventId(rawText) {
    if (!rawText) return '';
    const text = rawText.trim();
    if (text.includes('?')) {
        const queryString = text.split('?')[1];
        const params = new URLSearchParams(queryString);
        return params.get('event') || text;
    }
    return text;
}

export async function navigateToEventResult(rawInput, scannerInstance = null) {
    const eventId = extractEventId(rawInput);

    if (!eventId) {
        window.showAlert?.('Please enter or scan a valid Event ID.', 'warning');
        return;
    }

    // 1. Stop and clear camera
    if (scannerInstance) {
        try {
            if (scannerInstance.isScanning) {
                await scannerInstance.stop();
            }
            scannerInstance.clear();
        } catch (e) {
            console.warn("[QR-SCANNER] Stop error:", e);
        }
    }

    // 2. Close modal
    const modalEl = document.getElementById('global-modal');
    if (modalEl) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
    }

    // 3. Resolve fest, year, and judge code
    let targetJudgeCode = '';
    let targetFestId = '';
    let targetYearId = '';

    if (rawInput.includes('?')) {
        const params = new URLSearchParams(rawInput.split('?')[1]);
        targetJudgeCode = params.get('code') || '';
        targetFestId = params.get('fest') || '';
        targetYearId = params.get('year') || '';
    }

    const activeFest = targetFestId || state.managingFest?.id || '';
    const activeYear = targetYearId || systemContext.activeYearId || localStorage.getItem('activeYearId') || '';
    const codeParam = targetJudgeCode ? `&code=${encodeURIComponent(targetJudgeCode)}` : '';

    if (activeYear && typeof setActiveYear === 'function') {
        setActiveYear(activeYear);
    }

    // 4. Construct URL hash
    window.location.hash = `#fest-judge?year=${activeYear}&fest=${encodeURIComponent(activeFest)}&event=${encodeURIComponent(eventId)}${codeParam}`;

    // 5. Invoke handler
    if (typeof window.checkForJudgingMode === 'function') {
        await window.checkForJudgingMode();
    } else if (typeof window.waitForRouteHandler === 'function') {
        const handler = await window.waitForRouteHandler('checkForJudgingMode');
        if (handler) await handler();
    }
}

export async function openQrScannerModal() {
    try {
        await ensureQrScannerLibrary();
    } catch (err) {
        window.showAlert?.('Could not load camera scanner library.', 'danger');
        return;
    }

    const modalBody = `
        <div class="text-center p-2">
            <!-- Fixed camera container -->
            <div id="qr-reader" style="width: 100%; max-width: 320px; min-height: 250px; margin: 0 auto; border-radius: 8px; overflow: hidden; background: #000;"></div>
            
            <div id="qr-scan-status" class="alert alert-info py-2 px-2 mt-2 mb-0 small">
                <i class="fas fa-spinner fa-spin me-1"></i> Starting camera...
            </div>

            <div class="mt-3 pt-3 border-top text-start">
                <label class="form-label small fw-bold mb-1">
                    <i class="fas fa-barcode me-1 text-primary"></i>Scanned / Manual Event ID:
                </label>
                <div class="input-group input-group-sm mb-2">
                    <input type="text" id="manual-event-id-input" class="form-control font-monospace fw-bold" placeholder="Scan QR or type ID...">
                    <button class="btn btn-success fw-bold" id="btn-submit-manual-event">
                        <i class="fas fa-arrow-right me-1"></i>Load Result Entry
                    </button>
                </div>
            </div>
        </div>
    `;

    const modalFooter = `
        <button class="btn btn-secondary btn-sm px-3" data-bs-dismiss="modal" id="btn-close-scanner">Cancel</button>
    `;

    window.showGlobalModal?.(`<i class="fas fa-qrcode me-2"></i>Scan Scorecard QR`, modalBody, modalFooter);

    const manualInput = document.getElementById('manual-event-id-input');
    const statusBox = document.getElementById('qr-scan-status');

    let scanner = null;
    let hasDetectedAnyQr = false;

    // Routine to run the camera safely
    const startScanning = async () => {
        scanner = new Html5Qrcode("qr-reader");

        // Success Callback
        const onScanSuccess = async (decodedText) => {
            if (!decodedText || hasDetectedAnyQr) return;
            hasDetectedAnyQr = true;

            // Direct terminal/DevTools log
            console.log("%c[QR-SCANNER] SCANNED VALUE:", "background: #28a745; color: #fff; font-size: 14px; padding: 4px;", decodedText);

            const eventId = extractEventId(decodedText);

            if (statusBox) {
                statusBox.className = "alert alert-success py-2 px-2 mt-2 mb-0 small";
                statusBox.innerHTML = `<i class="fas fa-check-circle me-1"></i>Scanned: <code>${eventId}</code>`;
            }

            if (manualInput) {
                manualInput.value = eventId;
            }

            // Pause just like your working project to stop rapid re-triggers
            try {
                scanner.pause(true);
            } catch (e) {}

            setTimeout(async () => {
                await navigateToEventResult(decodedText, scanner);
            }, 300);
        };

        try {
            // Use static qrbox dimensions like your working project
            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 240, height: 240 }
                },
                onScanSuccess,
                () => {} // Silent on intermediate scan frames
            );

            if (statusBox) {
                statusBox.className = "alert alert-info py-2 px-2 mt-2 mb-0 small";
                statusBox.innerHTML = `<i class="fas fa-camera me-1"></i>Point camera directly at the QR code.`;
            }
        } catch (err) {
            console.error("[QR-SCANNER] Start failed:", err);
            if (statusBox) {
                statusBox.className = "alert alert-danger py-2 px-2 mt-2 mb-0 small";
                statusBox.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i>Camera error: ${err.message || "Permission denied."}`;
            }
        }
    };

    // Wait for Bootstrap modal transition to finish so #qr-reader has true DOM dimensions
    const modalElement = document.getElementById('global-modal') || document.querySelector('.modal');
    if (modalElement && modalElement.classList.contains('show')) {
        startScanning();
    } else if (modalElement) {
        modalElement.addEventListener('shown.bs.modal', () => {
            startScanning();
        }, { once: true });
    } else {
        setTimeout(startScanning, 300);
    }

    // Modal close & cleanup
    modalElement?.addEventListener('hidden.bs.modal', async () => {
        if (scanner) {
            try {
                if (scanner.isScanning) {
                    await scanner.stop();
                }
                scanner.clear();
            } catch (e) {
                console.warn("[QR-SCANNER] Cleanup error:", e);
            }
        }
    }, { once: true });

    // Manual input triggers
    document.getElementById('btn-submit-manual-event')?.addEventListener('click', () => {
        navigateToEventResult(manualInput?.value || '', scanner);
    });

    manualInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            navigateToEventResult(manualInput.value, scanner);
        }
    });
}

window.openQrScannerModal = openQrScannerModal;
window.navigateToEventResult = navigateToEventResult;
