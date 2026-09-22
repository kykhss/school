// =========================================================================
// --- FEST QR SCANNER ENGINE (fest-scanner.js) ---
// =========================================================================

import { systemContext, setActiveYear } from "./firebase-config.js";
import { state } from "./app-state.js";

let scannerWidget = null;

async function ensureQrScannerLibrary() {
    if (window.Html5QrcodeScanner) return true;
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

export async function navigateToEventResult(rawInput) {
    const eventId = extractEventId(rawInput);
    if (!eventId) {
        window.showAlert?.('Please enter or scan a valid Event ID.', 'warning');
        return;
    }

    // Stop and clear scanner instance
    await cleanupScanner();

    // Close Bootstrap modal
    const modalEl = document.getElementById('global-modal') || document.querySelector('.modal.show');
    if (modalEl && window.bootstrap) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
    }

    // Parse parameters
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

    // Direct hash routing
    window.location.hash = `#fest-judge?year=${activeYear}&fest=${encodeURIComponent(activeFest)}&event=${encodeURIComponent(eventId)}${codeParam}`;

    if (typeof window.checkForJudgingMode === 'function') {
        await window.checkForJudgingMode();
    } else if (typeof window.waitForRouteHandler === 'function') {
        const handler = await window.waitForRouteHandler('checkForJudgingMode');
        if (handler) await handler();
    }
}

async function cleanupScanner() {
    if (scannerWidget) {
        try {
            await scannerWidget.clear();
        } catch (e) {
            // Ignore clean-up teardown warnings
        }
        scannerWidget = null;
    }
}

export async function openQrScannerModal() {
    try {
        await ensureQrScannerLibrary();
    } catch (err) {
        window.showAlert?.('Could not load camera scanner library.', 'danger');
        return;
    }

    await cleanupScanner();

    const modalBody = `
        <div class="text-center p-2">
            <!-- Native Library Scanning Viewport -->
            <div id="qr-reader" style="width: 100%; margin: 0 auto; border-radius: 8px; overflow: hidden; min-height: 250px;"></div>

            <!-- Manual input fallback -->
            <div class="mt-3 pt-3 border-top text-start">
                <label class="form-label small fw-bold mb-1">
                    <i class="fas fa-barcode me-1 text-primary"></i>Scanned / Manual Event ID:
                </label>
                <div class="input-group input-group-sm mb-2">
                    <input type="text" id="manual-event-id-input" class="form-control font-monospace fw-bold" placeholder="Scan QR or type ID...">
                    <button class="btn btn-success fw-bold" id="btn-submit-manual-event" type="button">
                        <i class="fas fa-arrow-right me-1"></i>Load Result Entry
                    </button>
                </div>
            </div>
        </div>
    `;

    const modalFooter = `
        <button class="btn btn-secondary btn-sm px-3" data-bs-dismiss="modal" type="button">Cancel</button>
    `;

    window.showGlobalModal?.(`<i class="fas fa-qrcode me-2"></i>Scan Scorecard QR`, modalBody, modalFooter);

    const manualInput = document.getElementById('manual-event-id-input');
    let hasScanned = false;

    const initScanner = () => {
        if (scannerWidget || !document.getElementById('qr-reader')) return;

        scannerWidget = new Html5QrcodeScanner(
            "qr-reader",
            {
                fps: 15,
                qrbox: { width: 250, height: 250 },
                rememberLastUsedCamera: true,
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                }
            },
            false
        );

        scannerWidget.render(
            (decodedText) => {
                if (hasScanned) return;
                hasScanned = true;

                if (manualInput) {
                    manualInput.value = extractEventId(decodedText);
                }

                navigateToEventResult(decodedText);
            },
            () => {
                // Ignore per-frame misses
            }
        );
    };

    const modalElement = document.getElementById('global-modal') || document.querySelector('.modal');
    if (modalElement) {
        modalElement.addEventListener('shown.bs.modal', initScanner, { once: true });
        modalElement.addEventListener('hidden.bs.modal', cleanupScanner, { once: true });
    }

    setTimeout(() => {
        if (!scannerWidget && document.getElementById('qr-reader')) {
            initScanner();
        }
    }, 350);

    document.getElementById('btn-submit-manual-event')?.addEventListener('click', () => {
        navigateToEventResult(manualInput?.value || '');
    });

    manualInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            navigateToEventResult(manualInput.value);
        }
    });
}

window.openQrScannerModal = openQrScannerModal;
window.navigateToEventResult = navigateToEventResult;
