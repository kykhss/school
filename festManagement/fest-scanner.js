// =========================================================================
// --- FEST QR SCANNER ENGINE (fest-scanner.js) ---
// =========================================================================

import { systemContext, setActiveYear, db } from "./firebase-config.js"; //[cite: 7]
import { state } from "./app-state.js"; //[cite: 1]
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

/**
 * Extracts event ID, token, and yearId from raw text, QR URLs, or short links.
 */
function extractEventOrToken(text) {
    if (!text) return { type: 'event', value: '', yearId: '' };
    const clean = text.trim();

    // 1. Matches short token with yearId: #j/2026-27/A7X
    if (clean.includes('#j/')) {
        const parts = clean.split('#j/')[1].split('/').filter(Boolean);
        if (parts.length >= 2) {
            return { type: 'token', yearId: parts[0], value: parts[1].toUpperCase() };
        }
        return { type: 'token', yearId: '', value: parts[0].toUpperCase() };
    }

    // 2. Matches full judge query parameters: ?year=2026-27&event=...
    if (clean.includes('?')) {
        const params = new URLSearchParams(clean.split('?')[1]);
        const event = params.get('event') || clean;
        const year = params.get('year') || '';
        return { type: 'event', value: event, yearId: year };
    }

    // 3. Fallback 3-4 character manual token
    if (clean.length <= 5 && !clean.toUpperCase().startsWith('EVT_')) {
        return { type: 'token', value: clean.toUpperCase(), yearId: '' };
    }

    return { type: 'event', value: clean, yearId: '' };
}

/**
 * Resolves short token details from Firestore using the verified yearId.
 */
async function resolveShortToken(token, yearId) {
    if (!yearId) return null;
    try {
        const tokenRef = doc(db, `academicYears/${yearId}/festTokens`, token.toUpperCase());
        const snap = await getDoc(tokenRef);
        if (snap.exists()) {
            return snap.data();
        }
    } catch (e) {
        console.error("[QR-SCANNER] Token lookup error:", e);
    }
    return null;
}

/**
 * Resolves event details and navigates directly to Judge mode.
 */
export async function navigateToEventResult(rawInput) {
    if (!rawInput) {
        window.showAlert?.('Please enter or scan a valid Event ID.', 'warning');
        return;
    }

    const parsed = extractEventOrToken(rawInput);
    
    // Anchor yearId: prioritize the year embedded in the QR link, then context/localStorage
    let targetYearId = parsed.yearId || systemContext.activeYearId || localStorage.getItem('activeYearId') || ''; //[cite: 7]
    let targetEventId = parsed.value;
    let targetFestId = state.managingFest?.id || ''; //[cite: 1]
    let targetJudgeCode = '';

    // Immediately anchor active year so Firestore scoped paths function correctly
    if (targetYearId && typeof setActiveYear === 'function') {
        setActiveYear(targetYearId); //[cite: 7]
    }

    // If short token, resolve from Firestore
    if (parsed.type === 'token') {
        if (!targetYearId) {
            window.showAlert?.('Academic year is missing. Scan the scorecard QR directly.', 'warning');
            return;
        }

        const tokenData = await resolveShortToken(parsed.value, targetYearId);
        if (!tokenData) {
            window.showAlert?.(`Invalid or expired token code: ${parsed.value}`, 'danger');
            return;
        }

        targetEventId = tokenData.eventId;
        targetFestId = tokenData.festId || targetFestId;
        targetYearId = tokenData.yearId || targetYearId;
        targetJudgeCode = tokenData.judgeCode || '';
    } else if (rawInput.includes('?')) {
        const params = new URLSearchParams(rawInput.split('?')[1]);
        targetJudgeCode = params.get('code') || '';
        targetFestId = params.get('fest') || targetFestId;
        targetYearId = params.get('year') || targetYearId;
    }

    if (!targetYearId) {
        window.showAlert?.('Academic Year context missing. Cannot access database.', 'danger');
        return;
    }

    if (!targetEventId) {
        window.showAlert?.('No Event ID could be found.', 'warning');
        return;
    }

    // Stop camera and cleanup scanner instance
    await cleanupScanner();

    // Close Bootstrap modal
    const modalEl = document.getElementById('global-modal') || document.querySelector('.modal.show');
    if (modalEl && window.bootstrap) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
    }

    // Final confirmation of active year
    setActiveYear(targetYearId); //[cite: 7]

    // Route directly into judge mode
    const codeParam = targetJudgeCode ? `&code=${encodeURIComponent(targetJudgeCode)}` : '';
    window.location.hash = `#fest-judge?year=${targetYearId}&fest=${encodeURIComponent(targetFestId)}&event=${encodeURIComponent(targetEventId)}${codeParam}`; //[cite: 5]

    if (typeof window.checkForJudgingMode === 'function') {
        await window.checkForJudgingMode(); //[cite: 5]
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
            // Ignore teardown warnings
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
            <div id="qr-reader" style="width: 100%; margin: 0 auto; border-radius: 8px; overflow: hidden; min-height: 250px;"></div>

            <div class="mt-3 pt-3 border-top text-start">
                <label class="form-label small fw-bold mb-1">
                    <i class="fas fa-barcode me-1 text-primary"></i>Scanned / Manual Event ID:
                </label>
                <div class="input-group input-group-sm mb-2">
                    <input type="text" id="manual-event-id-input" class="form-control font-monospace fw-bold text-uppercase" placeholder="Scan QR or enter Code / ID...">
                    <button class="btn btn-success fw-bold" id="btn-submit-manual-event" type="button">
                        <i class="fas fa-arrow-right me-1"></i>Open Event
                    </button>
                </div>
                <small class="text-muted" style="font-size: 0.72rem;">Enter the short <code>ID: ...</code> found under the QR on the scorecard.</small>
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

        const cameraScanType = window.Html5QrcodeScanType?.SCAN_TYPE_CAMERA ?? 0;

        scannerWidget = new window.Html5QrcodeScanner(
            "qr-reader",
            {
                fps: 15,
                qrbox: { width: 240, height: 240 },
                rememberLastUsedCamera: true,
                supportedScanTypes: [cameraScanType]
            },
            false
        );

        scannerWidget.render(
            async (decodedText) => {
                if (hasScanned || !decodedText) return;
                hasScanned = true;

                const parsed = extractEventOrToken(decodedText);
                if (manualInput) {
                    manualInput.value = parsed.value;
                    manualInput.classList.add('is-valid');
                }

                await navigateToEventResult(decodedText);
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
