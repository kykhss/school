// =========================================================================
// --- APPLICATION STATE & REACTIVE DATA LAYER (app-state.js) ---
// =========================================================================

import { 
    db,
    systemContext, 
    loadCachedCollection, 
    setActiveYear, 
    clearYearCache,
    saveScopedDoc,
    getScopedDoc
} from "./firebase-config.js";

import { 
    collection, 
    getDoc,
    getDocs, 
    onSnapshot,
    query,
    where 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- 1. CORE APPLICATION STATE ---
export const state = {
    // Academic Year Context
    academicYears: [],
    activeYear: null,

    // Fest Context
    managingFest: null,
    festToEdit: null,
    eventToEdit: null,
    houseToEdit: null,
    groupToEdit: null,
    registrationToEdit: null,

    // Active User Context
    currentUser: null,
    currentUserRole: null, // 'admin' | 'houseCaptain' | 'judge'
    loggedInHouseId: null,

    // Primary Data Collections (Scoped to Active Year)
    classes: [],
    students: [],
    fests: [],
    festHouses: [],
    festEvents: [],
    festRegistrations: [],
    festGroups: [],
    festResults: [],

    // Temporary Working UI State
    groupBuilderMembers: [],
    unsubscribers: []
};

// Make key state items globally accessible for existing inline onclick handlers
window.state = state;

// --- 2. INITIALIZATION & YEAR SELECTION ---

/**
 * Initializes app state, loads academic years, selects the active year,
 * and primes the cached Firestore collections.
 */
export async function initializeAppState() {
    await loadAcademicYears();

    // Default to the year flagged active in DB, or fallback to localStorage
    if (!systemContext.activeYearId && state.academicYears.length > 0) {
        const defaultActive = state.academicYears.find(y => y.active) || state.academicYears[0];
        setActiveYear(defaultActive.id);
    }

    state.activeYear = state.academicYears.find(y => y.id === systemContext.activeYearId) || null;

    if (state.activeYear) {
        await loadAllYearData();
    }
}

/**
 * Fetches the root academic years list.
 */
export async function loadAcademicYears() {
    const snap = await getDocs(collection(db, "academicYears"));
    state.academicYears = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return state.academicYears || ["2026-27"];
}

/**
 * Switches the active academic year, clears memory/subscriptions, and reloads collections.
 * @param {string} yearId 
 */
export async function switchAcademicYear(yearId) {
    if (state.activeYear?.id === yearId) return;

    // Unsubscribe from real-time listeners of old year
    detachRealtimeListeners();

    setActiveYear(yearId);
    state.activeYear = state.academicYears.find(y => y.id === yearId) || { id: yearId };
    state.managingFest = null;

    // Reload cached dataset for the new year
    await loadAllYearData();

    // Notify UI components to re-render
    window.dispatchEvent(new CustomEvent("yearChanged", { detail: { yearId } }));
}

// --- 3. DATA LOADING VIA CACHE ENGINE ---

/**
 * Loads all primary collections using the Delta-Cache sync engine in firebase-config.js.
 */
export async function loadAllYearData(forceRefresh = false) {
    if (!systemContext.activeYearId) return;

    try {
        const [
            classes,
            houses,
            students,
            fests,
            events,
            registrations,
            groups,
            results
        ] = await Promise.all([
            loadCachedCollection("classes", forceRefresh),
            loadCachedCollection("festHouses", forceRefresh),
            loadCachedCollection("students", forceRefresh),
            loadCachedCollection("fests", forceRefresh),
            loadCachedCollection("festEvents", forceRefresh),
            loadCachedCollection("festRegistrations", forceRefresh),
            loadCachedCollection("festGroups", forceRefresh),
            loadCachedCollection("festResults", forceRefresh)
        ]);

        state.classes = classes;
        state.festHouses = houses;
        state.students = students;
        state.fests = fests;
        state.festEvents = events;
        state.festRegistrations = registrations;
        state.festGroups = groups;
        state.festResults = results;

        // Bridge to window for legacy template code compatibility
        window.classes = state.classes;
        window.festHouses = state.festHouses;
        window.students = state.students;
        window.fests = state.fests;
        window.festEvents = state.festEvents;
        window.festRegistrations = state.festRegistrations;
        window.festGroups = state.festGroups;
        window.festResults = state.festResults;

    } catch (error) {
        console.error("Failed to load year collections:", error);
    }
}

// --- 4. REAL-TIME SYNCHRONIZATION HELPERS ---

/**
 * Attaches a listener for live fest changes (e.g. during live scoring or registration locks).
 */
export function attachFestLiveListener(festId, onUpdateCallback) {
    if (!systemContext.activeYearId) return;

    const festDocRef = doc(db, `academicYears/${systemContext.activeYearId}/fests`, festId);
    const unsub = onSnapshot(festDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const updated = { id: docSnap.id, ...docSnap.data() };
            state.managingFest = updated;
            
            // Sync inside array
            const idx = state.fests.findIndex(f => f.id === festId);
            if (idx !== -1) state.fests[idx] = updated;

            if (onUpdateCallback) onUpdateCallback(updated);
        }
    });

    state.unsubscribers.push(unsub);
}

/**
 * Clears active Firestore real-time listeners.
 */
export function detachRealtimeListeners() {
    state.unsubscribers.forEach(unsub => {
        if (typeof unsub === "function") unsub();
    });
    state.unsubscribers = [];
}

// --- 5. SELECTORS & BUSINESS HELPERS ---

/**
 * Selects a fest and populates local session state.
 */
export function selectFest(festId) {
    state.managingFest = state.fests.find(f => f.id === festId) || null;
    systemContext.activeFestId = festId;
    return state.managingFest;
}

/**
 * Clears selected fest.
 */
export function unselectFest() {
    state.managingFest = null;
    systemContext.activeFestId = null;
}

/**
 * Resolves a student's full display class name (e.g., "Grade 5-A").
 */
export function getStudentClassName(classId, division) {
    if (!classId) return "N/A";
    const cls = state.classes.find(c => c.id === classId);
    if (!cls) return "N/A";
    return division ? `${cls.name}-${division}` : cls.name;
}

/**
 * Calculates student category based on fest settings (age vs class rules).
 */
export function getStudentCategory(student) {
    if (!student || !state.managingFest?.settings?.categories?.length) {
        return "General";
    }

    const dob = new Date(student.dob);
    const categories = [...state.managingFest.settings.categories].sort((a, b) => {
        if (a.type === "class" && b.type !== "class") return -1;
        if (a.type !== "class" && b.type === "class") return 1;
        if (a.type === "age" && b.type === "age") return new Date(b.criteria) - new Date(a.criteria);
        return 0;
    });

    for (const cat of categories) {
        if (cat.type === "class" && Array.isArray(cat.criteria) && cat.criteria.includes(student.classId)) {
            return cat.name;
        }
        if (cat.type === "age" && dob >= new Date(cat.criteria)) {
            return cat.name;
        }
    }
    return "General";
}

export async function hashPassword(plainText) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Direct Document Login: fetches ONLY the specified user's document
 */
export async function loginWithUsername(username, plainPassword, remember = true) {
    const cleanUsername = username.trim().toLowerCase();
    const hashedInput = await hashPassword(plainPassword.trim());

    try {
        // Fetch only that exact document — keeps other accounts private
        const userDocRef = getScopedDoc("festUsers", cleanUsername);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
            return { success: false, message: "User does not exist in this academic year." };
        }

        const userData = userSnap.data();
        console.log("Fetched user data:", userData);
        const hashedPasswordMatches = userData.passwordHash === hashedInput;
        const plaintextPasswordMatches = userData.password === plainPassword.trim() || userData.plainPassword === plainPassword.trim();

        if (!hashedPasswordMatches && !plaintextPasswordMatches) {
            return { success: false, message: "Incorrect password." };
        }

        // Set session state
        state.currentUser = userData;
        state.currentUserRole = userData.role;
        state.loggedInHouseId = userData.houseId || null;

        const safeUser = { id: userData.id || cleanUsername, username: userData.username || cleanUsername, role: userData.role, houseId: userData.houseId || null, name: userData.name || cleanUsername };
        sessionStorage.setItem("fest_session_user", JSON.stringify(safeUser));
        if (remember) {
            localStorage.setItem("fest_remembered_user", JSON.stringify(safeUser));
        } else {
            localStorage.removeItem("fest_remembered_user");
        }

        return { success: true, user: userData };
    } catch (err) {
        console.error("Login failed:", err);
        return { success: false, message: "Unable to connect to database." };
    }
}

export function logoutUser() {
    state.currentUser = null;
    state.currentUserRole = null;
    state.loggedInHouseId = null;
    state.managingFest = null;
    sessionStorage.removeItem("fest_session_user");
    localStorage.removeItem("fest_remembered_user");
}

// Global exposure for UI templates

window.getStudentClassName = getStudentClassName;
window.getStudentCategory = getStudentCategory;