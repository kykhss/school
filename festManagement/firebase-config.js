// =========================================================================
// --- FIREBASE CONFIGURATION & CACHED DATA ENGINE (firebase-config.js) ---
// =========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { 
    getFirestore, 
    doc, 
    collection, 
    getDocs, 
    setDoc, 
    updateDoc, 
    query, 
    where, 
    writeBatch, 
    serverTimestamp,
    Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- 1. FIREBASE INITIALIZATION ---
const firebaseConfig = {
    apiKey: "AIzaSyAu5TDMWepJX7naoG5H3WpGJ1yxAu01whg",
    authDomain: "timetables-470dd.firebaseapp.com",
    projectId: "timetables-470dd",
    storageBucket: "timetables-470dd.firebasestorage.app",
    messagingSenderId: "925422681424",
    appId: "1:925422681424:web:df91ce9de4dfef9c5ec055",
    measurementId: "G-N7ND4LPL9W"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);

// --- 2. GLOBAL CONTEXT & STORAGE VERSION CONTROL ---
export const STORAGE_VERSION = "1.0";
const VERSION_KEY = "APP_STORAGE_VERSION";
const CACHE_PREFIX = "FEST_CACHE_";
const META_PREFIX = "FEST_META_LAST_SYNC_";

/**
 * Checks local storage version on initialization.
 * If outdated or missing, clears all fest-related caches and writes the current version.
 */
function verifyStorageVersion() {
    const currentVer = localStorage.getItem(VERSION_KEY);
    if (currentVer !== STORAGE_VERSION) {
        console.warn(`Storage version mismatch (found: "${currentVer}", required: "${STORAGE_VERSION}"). Resetting local cache...`);
        
        // Remove all cache-related keys while keeping user preferences like activeYearId intact
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_PREFIX) || key.startsWith(META_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
        localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
    }
}
verifyStorageVersion();

export const systemContext = {
    activeYearId: localStorage.getItem('activeYearId') || null,
    activeFestId: null
};

// --- 3. ACADEMIC YEAR SCOPING HELPERS ---

export function getScopedCollection(collectionName) {
    if (!systemContext.activeYearId) {
        throw new Error("Active academic year is not selected.");
    }
    return collection(db, `academicYears/${systemContext.activeYearId}/${collectionName}`);
}

export function getScopedDoc(collectionName, docId) {
    if (!systemContext.activeYearId) {
        throw new Error("Active academic year is not selected.");
    }
    return doc(db, `academicYears/${systemContext.activeYearId}/${collectionName}`, docId);
}

// --- 4. DELTA CACHE ENGINE WITH SOFT DELETES ---

function toEpochMillis(val) {
    if (!val) return 0;
    if (val instanceof Timestamp) return val.toMillis();
    if (val.seconds) return val.seconds * 1000;
    if (typeof val === 'string' || typeof val === 'number') return new Date(val).getTime();
    return 0;
}

/**
 * Loads records using localStorage cache.
 * Automatically handles soft-deleted records: if isDeleted === true comes down in the delta,
 * it is stripped from localStorage so UI consumers only receive active records.
 *
 * @param {string} collectionName 
 * @param {boolean} forceRefresh 
 * @returns {Promise<Array<Object>>}
 */
export async function loadCachedCollection(collectionName, forceRefresh = false) {
    if (!systemContext.activeYearId) {
        throw new Error("Academic Year must be selected before loading data.");
    }

    const cacheKey = `${CACHE_PREFIX}${systemContext.activeYearId}_${collectionName}`;
    const metaKey = `${META_PREFIX}${systemContext.activeYearId}_${collectionName}`;

    let localData = [];
    let lastSyncEpoch = 0;

    if (!forceRefresh) {
        const storedJson = localStorage.getItem(cacheKey);
        const storedMeta = localStorage.getItem(metaKey);
        if (storedJson) {
            try {
                localData = JSON.parse(storedJson);
                lastSyncEpoch = storedMeta ? parseInt(storedMeta, 10) : 0;
            } catch (e) {
                console.warn(`Cache parse failed for ${collectionName}, reading fresh.`, e);
                localData = [];
                lastSyncEpoch = 0;
            }
        }
    }

    const collRef = getScopedCollection(collectionName);
    let deltaQuery;

    if (lastSyncEpoch > 0 && !forceRefresh) {
        const syncTimestamp = Timestamp.fromMillis(lastSyncEpoch);
        deltaQuery = query(collRef, where("lastUpdated", ">", syncTimestamp));
    } else {
        deltaQuery = collRef;
    }

    const snapshot = await getDocs(deltaQuery);

    // No updates on server -> return existing cache
    if (snapshot.empty && localData.length > 0) {
        return localData;
    }

    const dataMap = new Map(localData.map(item => [item.id, item]));
    let maxSeenEpoch = lastSyncEpoch;

    snapshot.docs.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() };
        const itemUpdatedEpoch = toEpochMillis(data.lastUpdated);

        if (itemUpdatedEpoch > maxSeenEpoch) {
            maxSeenEpoch = itemUpdatedEpoch;
        }

        // SOFT DELETE PRUNING: If record is marked deleted on server, drop from local cache
        if (data.isDeleted === true) {
            dataMap.delete(docSnap.id);
        } else {
            dataMap.set(docSnap.id, data);
        }
    });

    const activeList = Array.from(dataMap.values()).filter(item => !item.isDeleted);

    try {
        localStorage.setItem(cacheKey, JSON.stringify(activeList));
        localStorage.setItem(metaKey, (maxSeenEpoch || Date.now()).toString());
    } catch (err) {
        console.error("Local storage quota limit reached. Cache bypassed.", err);
    }

    return activeList;
}

// --- 5. WRITE & SOFT-DELETE OPERATIONS ---

export async function saveScopedDoc(collectionName, docId, data, merge = true) {
    const docRef = getScopedDoc(collectionName, docId);
    const payload = {
        ...data,
        id: docId,
        isDeleted: false,
        lastUpdated: serverTimestamp()
    };
    return await setDoc(docRef, payload, { merge });
}

export async function updateScopedDoc(collectionName, docId, data) {
    const docRef = getScopedDoc(collectionName, docId);
    return await updateDoc(docRef, {
        ...data,
        lastUpdated: serverTimestamp()
    });
}

/**
 * Marks a document as soft-deleted in Firestore and purges it from local storage.
 * @param {string} collectionName 
 * @param {string} docId 
 */
export async function DeleteScopedDoc(collectionName, docId) {
    const docRef = getScopedDoc(collectionName, docId);
    
    // Write soft-delete flag to Firestore
    await updateDoc(docRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
    });

    // Remove from local cache immediately
    const cacheKey = `${CACHE_PREFIX}${systemContext.activeYearId}_${collectionName}`;
    const storedJson = localStorage.getItem(cacheKey);
    if (storedJson) {
        try {
            const data = JSON.parse(storedJson).filter(item => item.id !== docId);
            localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (e) {
            console.error("Local cache sync error on soft delete:", e);
        }
    }
}

/**
 * Bulk soft-delete a list of document IDs
 */
export async function batchDeleteScoped(collectionName, docIds) {
    const CHUNK_SIZE = 450;
    const chunks = [];

    for (let i = 0; i < docIds.length; i += CHUNK_SIZE) {
        chunks.push(docIds.slice(i, i + CHUNK_SIZE));
    }

    for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(id => {
            const docRef = getScopedDoc(collectionName, id);
            batch.update(docRef, {
                isDeleted: true,
                deletedAt: serverTimestamp(),
                lastUpdated: serverTimestamp()
            });
        });
        await batch.commit();
    }

    // Prune all deleted IDs from local cache
    const cacheKey = `${CACHE_PREFIX}${systemContext.activeYearId}_${collectionName}`;
    const storedJson = localStorage.getItem(cacheKey);
    if (storedJson) {
        try {
            const idSet = new Set(docIds);
            const data = JSON.parse(storedJson).filter(item => !idSet.has(item.id));
            localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (e) {
            console.error("Local cache prune error on batch soft delete:", e);
        }
    }
}

export async function batchWriteScoped(collectionName, items, merge = true) {
    const CHUNK_SIZE = 450;
    const chunks = [];

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        chunks.push(items.slice(i, i + CHUNK_SIZE));
    }

    for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(item => {
            if (!item.id) throw new Error("Batch record missing required document ID.");
            const docRef = getScopedDoc(collectionName, item.id);
            batch.set(docRef, {
                ...item,
                isDeleted: false,
                lastUpdated: serverTimestamp()
            }, { merge });
        });
        await batch.commit();
    }
}

// --- 6. YEAR & SESSION SWITCHING ---

export function setActiveYear(yearId) {
    systemContext.activeYearId = yearId;
    localStorage.setItem('activeYearId', yearId);
}

export function clearYearCache(yearId = systemContext.activeYearId) {
    if (!yearId) return;
    Object.keys(localStorage).forEach(key => {
        if (key.includes(`${CACHE_PREFIX}${yearId}`) || key.includes(`${META_PREFIX}${yearId}`)) {
            localStorage.removeItem(key);
        }
    });
}
