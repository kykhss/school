// =========================================================================
// --- FEST ROUTING & PORTAL LINK UTILITIES (fest-router.js) ---
// =========================================================================

import { systemContext } from "./firebase-config.js";
import { openQrScannerModal } from "./fest-scanner.js";

/**
 * Polls until a named global or imported function exists on window.
 */
export function waitForRouteHandler(handlerName, timeout = 5000) {
    return new Promise(resolve => {
        const startedAt = Date.now();
        const check = () => {
            if (typeof window[handlerName] === 'function') {
                resolve(window[handlerName]);
                return;
            }
            if (Date.now() - startedAt >= timeout) {
                resolve(null);
                return;
            }
            setTimeout(check, 25);
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

// Global exposure for inline onclick handlers in tabs
window.copyHousePortalLink = copyHousePortalLink;
window.copyAdminPortalLink = copyAdminPortalLink;
window.copyJudgeScannerLink = copyJudgeScannerLink;

// --- CENTRAL HASH ROUTE DISPATCHER ---

export async function handleHashRoute() {
    const hash = window.location.hash || '';

    // Route: #fest-scan
    if (hash.startsWith('#fest-scan')) {
        openQrScannerModal();
        return;
    }

    // Route: #fest-judge
    if (hash.startsWith('#fest-judge')) {
        const handler = await waitForRouteHandler('checkForJudgingMode');
        if (handler) await handler();
        return;
    }

    // Route: #fest-entry
    if (hash.startsWith('#fest-entry')) {
        const handler = await waitForRouteHandler('checkForDataEntryMode');
        if (handler) await handler();
        return;
    }

    // Route: #fest-admin or fallback
    if (hash.startsWith('#fest-admin') || !hash || hash === '#') {
        const handler = await waitForRouteHandler('checkForAdminMode');
        if (handler) await handler();
        return;
    }
}

/**
 * Initializes hash routing listener.
 */
export function initRouter() {
    window.addEventListener('hashchange', handleHashRoute);
}
