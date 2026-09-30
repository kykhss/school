// =========================================================================
// --- FEST ROUTING & PORTAL LINK UTILITIES (fest-router.js) ---
// =========================================================================

import { openQrScannerModal } from "./fest-scanner.js";
import { db, systemContext, setActiveYear } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


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

    // =========================================================================
    // 1. ROUTE: #j/ (Short QR Token for Judges)
    // Supports #j/YEAR_ID/TOKEN (e.g., #j/2026-27/A7X) and #j/TOKEN (e.g., #j/A7X)
    // =========================================================================
    // =========================================================================
// ROUTE: #j/ (Short Token Handler)
// =========================================================================
if (hash.startsWith('#j/')) {
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
        window.showAlert?.('Academic year not identified in link.', 'danger');
        return;
    }

    if (typeof setActiveYear === 'function') {
        setActiveYear(targetYearId);
    } else {
        if (systemContext) systemContext.activeYearId = targetYearId;
        localStorage.setItem('activeYearId', targetYearId);
    }

    try {
        const tokenRef = doc(db, `academicYears/${targetYearId}/festTokens`, targetToken);
        const tokenSnap = await getDoc(tokenRef);

        if (!tokenSnap.exists()) {
            window.showAlert?.(`Invalid or expired token: ${targetToken}`, 'danger');
            return;
        }

        const tokenData = tokenSnap.data();
        const resolvedYearId = tokenData.yearId || targetYearId;
        const festId = tokenData.festId || '';
        const eventId = tokenData.eventId || '';
        const judgeCode = tokenData.judgeCode || '';
        const judgeName = tokenData.judgeName || '';

        // Build URL params including both code and judgeName
        const codeParam = judgeCode ? `&code=${encodeURIComponent(judgeCode)}` : '';
        const nameParam = judgeName ? `&judgeName=${encodeURIComponent(judgeName)}` : '';

        // Seamless routing into fest-judge with Judge Name attached
        const targetHash = `#fest-judge?year=${encodeURIComponent(resolvedYearId)}&fest=${encodeURIComponent(festId)}&event=${encodeURIComponent(eventId)}${codeParam}${nameParam}`;

        window.location.replace(targetHash);

        if (typeof window.checkForJudgingMode === 'function') {
            await window.checkForJudgingMode();
        }
        return;
    } catch (err) {
        console.error("Token resolution error:", err);
        window.showAlert?.('Failed to resolve event token from database.', 'danger');
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
        if (typeof window.checkForJudgingMode === 'function') {
            await window.checkForJudgingMode();
        }
        return;
    }

    // =========================================================================
    // 4. ROUTE: #fest-entry (House Captain Portal)
    // =========================================================================
    if (hash.startsWith('#fest-entry')) {
        if (typeof window.checkForDataEntryMode === 'function') {
            await window.checkForDataEntryMode();
        }
        return;
    }

    // =========================================================================
    // 5. ROUTE: #fest-admin or Default Fallback
    // =========================================================================
    if (hash.startsWith('#fest-admin') || !hash || hash === '#') {
        if (typeof window.checkForAdminMode === 'function') {
            await window.checkForAdminMode();
        }
        return;
    }
}

/**
 * Initializes hash routing listener.
 */
export function initRouter() {
    window.addEventListener('hashchange', handleHashRoute);
}
