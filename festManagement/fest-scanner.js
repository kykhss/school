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
        console.log("[QR-SCANNER] Html5Qrcode library already loaded.");
        return true;
    }
    console.log("[QR-SCANNER] Fetching Html5Qrcode library...");
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
        script.async = true;
        script.onload = () => {
            console.log("[QR-SCANNER] Library ready.");
            resolve(true);
        };
        script.onerror = () => {
            console.error("[QR-SCANNER] Failed to load library.");
            reject(new Error('Failed to load html5-qrcode library.'));
        };
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
    console.log("[QR-SCANNER] Target Event ID for Judging Mode:", eventId);

    if (!eventId) {
        window.showAlert?.('Please enter or scan a valid Event ID.', 'warning');
        return;
    }

    // 1. Stop and clear camera
    if (scannerInstance && scannerInstance.isScanning) {
        try {
            await scannerInstance.stop();
            scannerInstance.clear();
        } catch (e) {
            console.warn(e);
        }
    }

    // 2. Close the scanner modal
    const modalEl = document.getElementById('global-modal');
    if (modalEl) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
    }

    // 3. Resolve fest, year, and judge code (if included in QR URL)
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

    // 4. Construct URL hash for Judge Portal
    const targetHash = `#fest-judge?year=${activeYear}&fest=${encodeURIComponent(activeFest)}&event=${encodeURIComponent(eventId)}${codeParam}`;
    window.location.hash = targetHash;

    // 5. Explicitly invoke checkForJudgingMode
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
            <!-- Camera Viewport with visual frame -->
            <div id="qr-reader" style="width: 100%; max-width: 380px; margin: 0 auto; overflow: hidden; border-radius: 8px; border: 2px dashed #0d6efd; background: #000; min-height: 260px;"></div>
            
            <!-- Live Status Alert -->
            <div id="qr-scan-status" class="alert alert-info py-2 px-2 mt-2 mb-0 small">
                <i class="fas fa-spinner fa-spin me-1"></i> Starting camera...
            </div>

            <!-- Scanned / Manual Input Field -->
            <div class="mt-3 pt-3 border-top text-start">
                <label class="form-label small fw-bold mb-1">
                    <i class="fas fa-barcode me-1 text-primary"></i>Scanned / Manual Event ID:
                </label>
                <div class="input-group input-group-sm mb-2">
                    <input type="text" id="manual-event-id-input" class="form-control font-monospace fw-bold" placeholder="Scan QR or type ID..." style="letter-spacing: 0.5px;">
                    <button class="btn btn-success fw-bold" id="btn-submit-manual-event">
                        <i class="fas fa-arrow-right me-1"></i>Load Result Entry
                    </button>
                </div>
                <small class="text-muted" style="font-size: 0.72rem;">Type the <code>ID: ...</code> found under the QR on the scorecard if your camera cannot focus.</small>
            </div>
        </div>
    `;

    const modalFooter = `
        <button class="btn btn-secondary btn-sm px-3" data-bs-dismiss="modal" id="btn-close-scanner">Cancel</button>
    `;

    window.showGlobalModal?.(`<i class="fas fa-qrcode me-2"></i>Scan Scorecard QR`, modalBody, modalFooter);

    const manualInput = document.getElementById('manual-event-id-input');
    const statusBox = document.getElementById('qr-scan-status');
    const scanner = new Html5Qrcode("qr-reader");

    let hasDetectedAnyQr = false;
    let framesScanned = 0;
    let noQrTimer = null;

    // Reset status back to "No QR found" if inactive for 3 seconds
    const kickNoQrTimer = () => {
        clearTimeout(noQrTimer);
        noQrTimer = setTimeout(() => {
            if (!hasDetectedAnyQr && statusBox) {
                statusBox.className = "alert alert-warning py-2 px-2 mt-2 mb-0 small";
                statusBox.innerHTML = `<i class="fas fa-search me-1"></i><strong>No QR found in frame.</strong> Point camera directly at the code.`;
            }
        }, 3000);
    };

    // Cleanup scanner when modal is closed
    const modalElement = document.querySelector('.modal.show');
    modalElement?.addEventListener('hidden.bs.modal', async () => {
        clearTimeout(noQrTimer);
        if (scanner.isScanning) {
            try {
                await scanner.stop();
                scanner.clear();
            } catch (e) {
                console.warn("[QR-SCANNER] Modal cleanup error:", e);
            }
        }
    }, { once: true });

    // Manual load buttons
    document.getElementById('btn-submit-manual-event')?.addEventListener('click', () => {
        clearTimeout(noQrTimer);
        navigateToEventResult(manualInput?.value || '', scanner);
    });

    manualInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(noQrTimer);
            navigateToEventResult(manualInput.value, scanner);
        }
    });

    // Success Callback
    const onScanSuccess = async (decodedText) => {
        if (!decodedText || hasDetectedAnyQr) return;
        hasDetectedAnyQr = true;
        clearTimeout(noQrTimer);

        console.log("[QR-SCANNER] Scanned payload:", decodedText);

        const eventId = extractEventId(decodedText);

        if (statusBox) {
            statusBox.className = "alert alert-success py-2 px-2 mt-2 mb-0 small";
            statusBox.innerHTML = `<i class="fas fa-check-circle me-1"></i><strong>QR Recognized!</strong> Event: <code>${eventId}</code>`;
        }

        if (manualInput) {
            manualInput.value = eventId;
            manualInput.classList.add('is-valid');
        }

        setTimeout(async () => {
            await navigateToEventResult(eventId, scanner);
        }, 400);
    };

    // Frame scan handler (fires on every camera frame processed)
    const onScanFailure = (error) => {
        framesScanned++;

        if (!hasDetectedAnyQr && framesScanned % 15 === 0 && statusBox) {
            // Live scanning indicator
            statusBox.className = "alert alert-info py-2 px-2 mt-2 mb-0 small";
            statusBox.innerHTML = `<i class="fas fa-camera me-1"></i>Scanning frame #${framesScanned}... Keep camera steady.`;
            kickNoQrTimer();
        }
    };

    // Start Scanner with responsive frame calculation
    scanner.start(
        { facingMode: "environment" },
        { 
            fps: 15, 
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                const boxSize = Math.floor(minEdge * 0.75);
                return { width: boxSize, height: boxSize };
            },
            aspectRatio: 1.0
        },
        onScanSuccess,
        onScanFailure
    ).then(() => {
        console.log("[QR-SCANNER] Camera active.");
        if (statusBox) {
            statusBox.className = "alert alert-info py-2 px-2 mt-2 mb-0 small";
            statusBox.innerHTML = `<i class="fas fa-video me-1"></i>Camera active. Center the QR code inside the box.`;
        }
        kickNoQrTimer();
    }).catch(err => {
        console.error("[QR-SCANNER] Camera failed to start:", err);
        clearTimeout(noQrTimer);
        if (statusBox) {
            statusBox.className = "alert alert-danger py-2 px-2 mt-2 mb-0 small";
            statusBox.innerHTML = `<i class="fas fa-video-slash me-1"></i>Camera permission blocked or unavailable. Type Event ID manually below.`;
        }
    });
}

window.openQrScannerModal = openQrScannerModal;
window.navigateToEventResult = navigateToEventResult;
