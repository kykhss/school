// =========================================================================
// --- FEST ROUTING & PORTAL LINK UTILITIES (fest-router.js) ---
// =========================================================================

import { openQrScannerModal } from "./fest-scanner.js";
import { db, systemContext, setActiveYear } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Polls until a named global or imported function exists on window.
 */
export function waitForRouteHandler(handlerName, timeout = 7000) {
    return new Promise(resolve => {
        const startedAt = Date.now();
        const check = () => {
            if (typeof window[handlerName] === 'function') {
                resolve(window[handlerName]);
                return;
            }
            if (Date.now() - startedAt >= timeout) {
                console.warn(`[ROUTER] Timeout waiting for route handler: ${handlerName}`);
                resolve(null);
                return;
            }
            setTimeout(check, 30);
        };
        check();
    });
}
window.waitForRouteHandler = waitForRouteHandler;

// --- PORTAL LINK GENERATORS & CLIPBOARD ACTIONS ---

export function copyHousePortalLink(festId, houseId) {
    const root = window.location.href.split('#')[0];
    const targetUrl = `${root}#fest-entry?year=${systemContext.activeYearId}&fest=${festId}&house=${houseId}`;
    navigator.clipboard.writeText(targetUrl);
    window.showAlert?.('House entry link copied to clipboard!', 'success');
}

export function copyAdminPortalLink() {
    const root = window.location.href.split('#')[0];
    navigator.clipboard.writeText(`${root}#fest-admin`);
    window.showAlert?.('Admin portal link copied to clipboard.', 'success');
}

export function copyJudgeScannerLink(festId) {
    const root = window.location.href.split('#')[0];
    const activeFest = festId || window.state?.managingFest?.id || '';
    const targetUrl = `${root}#fest-scan?year=${systemContext.activeYearId}&fest=${activeFest}`;
    navigator.clipboard.writeText(targetUrl);
    window.showAlert?.('Result scanner link copied to clipboard!', 'success');
}

window.copyHousePortalLink = copyHousePortalLink;
window.copyAdminPortalLink = copyAdminPortalLink;
window.copyJudgeScannerLink = copyJudgeScannerLink;

// Internal lock to prevent double execution between location.replace and hashchange
let isResolvingShortToken = false;

// --- CENTRAL HASH ROUTE DISPATCHER ---

export async function handleHashRoute() {
    if (isResolvingShortToken) return;

    const hash = window.location.hash || '';

    // =========================================================================
    // 1. ROUTE: #j/ (Short QR Token for Judges)
    // =========================================================================
    if (hash.startsWith('#j/')) {
        isResolvingShortToken = true;

        const rawPath = hash.replace('#j/', '').trim();
        const parts = rawPath.split('/').filter(Boolean);

        let targetYearId = '';
        let targetToken = '';

        if (parts.length >= 2) {
            targetYearId = decodeURIComponent(parts[0]);
            targetToken = decodeURIComponent(parts[1]).toUpperCase();
        } else if (parts.length === 1) {
            targetToken = decodeURIComponent(parts[0]).toUpperCase();
            targetYearId = systemContext?.activeYearId || localStorage.getItem('activeYearId') || '';
        }

        if (!targetYearId) {
            isResolvingShortToken = false;
            window.showAlert?.('Academic year not identified in link.', 'danger');
            return;
        }

        if (typeof setActiveYear === 'function') {
            setActiveYear(targetYearId);
        } else {
            if (systemContext) systemContext.activeYearId = targetYearId;
            localStorage.setItem('activeYearId', targetYearId);
        }

        // Show immediate loader while resolving token
        document.body.innerHTML = `
            <div class="vh-100 d-flex flex-column align-items-center justify-content-center bg-light text-center p-3">
                <div class="spinner-border text-primary mb-3" role="status"></div>
                <h6 class="fw-bold mb-1">Connecting to Scorecard...</h6>
                <p class="small text-muted mb-0 font-monospace">Token: ${targetToken}</p>
            </div>
        `;

        try {
            const tokenRef = doc(db, `academicYears/${targetYearId}/festTokens`, targetToken);
            const tokenSnap = await getDoc(tokenRef);

            if (!tokenSnap.exists()) {
                isResolvingShortToken = false;
                document.body.innerHTML = `
                    <div class="container py-5 text-center" style="max-width: 480px;">
                        <div class="alert alert-danger py-4 shadow-sm border-0">
                            <i class="fas fa-triangle-exclamation fa-2x mb-2 text-danger"></i>
                            <h5 class="fw-bold">Invalid QR Token</h5>
                            <p class="small mb-0">The scorecard token <code>${targetToken}</code> does not exist or has expired.</p>
                        </div>
                    </div>
                `;
                return;
            }

            const tokenData = tokenSnap.data();
            const resolvedYearId = tokenData.yearId || targetYearId;
            const festId = tokenData.festId || '';
            const eventId = tokenData.eventId || '';
            const judgeCode = tokenData.judgeCode || '';
            const judgeName = tokenData.judgeName || '';

            const codeParam = judgeCode ? `&code=${encodeURIComponent(judgeCode)}` : '';
            const nameParam = judgeName ? `&judgeName=${encodeURIComponent(judgeName)}` : '';

            // Update URL hash directly without triggering a separate navigation cycle
            const destinationHash = `#fest-judge?year=${encodeURIComponent(resolvedYearId)}&fest=${encodeURIComponent(festId)}&event=${encodeURIComponent(eventId)}${codeParam}${nameParam}`;
            history.replaceState(null, '', destinationHash);

            // Wait until fest-judge module is initialized on window
            const handler = await waitForRouteHandler('checkForJudgingMode');
            isResolvingShortToken = false;

            if (typeof handler === 'function') {
                await handler();
            } else {
                window.location.hash = destinationHash;
                window.location.reload();
            }
            return;

        } catch (err) {
            isResolvingShortToken = false;
            console.error("[ROUTER] Token resolution error:", err);
            document.body.innerHTML = `
                <div class="container py-5 text-center" style="max-width: 460px;">
                    <div class="alert alert-danger py-4 shadow-sm border-0">
                        <i class="fas fa-wifi fa-2x mb-2"></i>
                        <h6 class="fw-bold">Connection Error</h6>
                        <p class="small mb-0">Failed to resolve event token from database.</p>
                    </div>
                </div>
            `;
            return;
        }
    }

    // =========================================================================
    // 2. ROUTE: #fest-scan (Admin Camera Result Scanner)
    // =========================================================================
    if (hash.startsWith('#fest-scan')) {
        if (typeof window.openQrScannerModal === 'function') {
            window.openQrScannerModal();
        } else if (typeof openResultScannerModal === 'function') {
            openResultScannerModal();
        }
        return;
    }

    // =========================================================================
    // 3. ROUTE: #fest-judge (Judges Score Entry Screen)
    // =========================================================================
    if (hash.startsWith('#fest-judge')) {
        const handler = await waitForRouteHandler('checkForJudgingMode');
        if (typeof handler === 'function') {
            await handler();
        }
        return;
    }

    // =========================================================================
    // 4. ROUTE: #fest-entry (House Captain Portal)
    // =========================================================================
    if (hash.startsWith('#fest-entry')) {
        const handler = await waitForRouteHandler('checkForDataEntryMode');
        if (typeof handler === 'function') {
            await handler();
        }
        return;
    }

    // =========================================================================
    // 5. ROUTE: #fest-admin or Default Fallback
    // =========================================================================
    if (hash.startsWith('#fest-admin') || !hash || hash === '#') {
        const handler = await waitForRouteHandler('checkForAdminMode');
        if (typeof handler === 'function') {
            await handler();
        }
        return;
    }
}

/**
 * Initializes hash routing listener and handles cold boots.
 */
export function initRouter() {
    window.addEventListener('hashchange', handleHashRoute);
    // Execute route check immediately on initial page boot
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        handleHashRoute();
    } else {
        document.addEventListener('DOMContentLoaded', handleHashRoute, { once: true });
    }
}
