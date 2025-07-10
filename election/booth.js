import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDocs, setDoc, onSnapshot, collection, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global Firebase variables (provided by the environment)
function loadParamsFromBase64Url() {
                const urlParams = new URLSearchParams(window.location.search);
                const dataParam = urlParams.get('wxev');

                if (dataParam) {
                    try {
                        console.log("dataparam",dataParam);
                        const decoded = dataParam;// base64Decode(dataParam);
                        const userId = decoded;
                        if (userId) {
                            localStorage.setItem('userId', userId);
                            //localStorage.setItem('appId', appId);
                            return userId ;
                        }
                    } catch (e) {
                        console.error('Invalid Base64 data:', e);
                    }
                }

                // fallback
                return 
                    localStorage.getItem('userId') || 'defaultUser';
            }

           // setBase64ParamsInUrl('kyhss');
           // let appId = "timetableData"
            // Later in your app, decode from URL or localStorage
            const currentUserId= loadParamsFromBase64Url();
            const appId = typeof __app_id !== 'undefined' ? __app_id :currentUserId
            
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyABrgqY0EpBVJF_jQ6Zpvo7whtxbaYB_b8",
  authDomain: "kyhss-athavanad.firebaseapp.com",
  projectId: "kyhss-athavanad",
  storageBucket: "kyhss-athavanad.firebasestorage.app",
  messagingSenderId: "471650360488",
  appId: "1:471650360488:web:88483d99ac63075addb69d",
  measurementId: "G-ETE3YCBXVD"
}; 
//const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app;
let db;
let auth;
let userId; // Will store the authenticated user ID
let loggedInBoothData = null; // Stores the data of the logged-in booth

// DOM Elements
const boothLoginCard = document.getElementById('boothLoginCard');
const boothUser = document.getElementById('boothUser');
const boothPassword = document.getElementById('boothPassword');
const boothUserError = document.getElementById('boothUserError');
const boothPasswordError = document.getElementById('boothPasswordError');
const boothLoginBtn = document.getElementById('boothLoginBtn');
const boothContent = document.getElementById('boothContent');
const currentUserIdSpan = document.getElementById('currentUserId');
const loggedInBoothName = document.getElementById('loggedInBoothName');
const loggedInBoothId = document.getElementById('loggedInBoothId');
const votingMachinesTableBody = document.getElementById('votingMachinesTableBody');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.querySelector('#loadingOverlay .loading-text');
const alertContainer = document.getElementById('alertContainer');

// --- Utility Functions ---

/**
 * Displays a temporary alert message to the user.
 * @param {string} message - The message to display.
 * @param {'success'|'danger'|'warning'|'info'} type - The type of alert.
 */
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show alert-message`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        <span class="icon me-2">
            ${type === 'success' ? '<i class="fas fa-check-circle"></i>' : ''}
            ${type === 'danger' ? '<i class="fas fa-exclamation-circle"></i>' : ''}
            ${type === 'warning' ? '<i class="fas fa-exclamation-triangle"></i>' : ''}
            ${type === 'info' ? '<i class="fas fa-info-circle"></i>' : ''}
        </span>
        <div>${message}</div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    alertContainer.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.classList.remove('show');
        alertDiv.classList.add('fade');
        alertDiv.addEventListener('transitionend', () => alertDiv.remove());
    }, 5000); // Alert disappears after 5 seconds
}

/**
 * Shows or hides the loading overlay.
 * @param {boolean} show - True to show, false to hide.
 * @param {string} message - Message to display during loading.
 */
function showLoading(show, message = 'Loading...') {
    loadingText.textContent = message;
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// --- Firebase Initialization and Authentication ---

window.onload = async function() {
    showLoading(true, 'Initializing Firebase...');
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Listen for authentication state changes
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                currentUserIdSpan.textContent = userId;
                // Check if a booth session exists in localStorage
                const storedBoothData = localStorage.getItem('boothSession');
                if (storedBoothData) {
                    loggedInBoothData = JSON.parse(storedBoothData);
                    showBoothContent();
                } else {
                    showLoginCard();
                }
            } else {
                userId = 'Not Authenticated';
                currentUserIdSpan.textContent = userId;
                showLoginCard();
            }
            showLoading(false);
        });

        // Attempt to sign in with custom token if available (for Canvas environment)
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            // Sign in anonymously if no custom token (for local testing)
            await signInAnonymously(auth);
        }

    } catch (error) {
        console.error("Error initializing Firebase:", error);
        showAlert("Failed to initialize Firebase. Check console for details.", "danger");
        showLoading(false);
    }
};

/**
 * Handles booth login.
 */
boothLoginBtn.addEventListener('click', async () => {
    const user = boothUser.value.trim();
    const password = boothPassword.value.trim();

    if (!user) {
        boothUser.classList.add('is-invalid');
        boothUserError.textContent = 'Booth username is required.';
        return;
    } else {
        boothUser.classList.remove('is-invalid');
        boothUserError.textContent = '';
    }

    if (!password) {
        boothPassword.classList.add('is-invalid');
        boothPasswordError.textContent = 'Booth password is required.';
        return;
    } else {
        boothPassword.classList.remove('is-invalid');
        boothPasswordError.textContent = '';
    }

    showLoading(true, 'Logging in...');
    try {
        const boothsRef = collection(db, `artifacts/${appId}/public/data/booths`);
        const q = query(boothsRef, where('user', '==', user), where('password', '==', password));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            loggedInBoothData = { docId: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            localStorage.setItem('boothSession', JSON.stringify(loggedInBoothData));
            showBoothContent();
            showAlert(`Logged in to Booth: ${loggedInBoothData.name}`, 'success');
        } else {
            showAlert('Invalid booth username or password.', 'danger');
            boothUser.classList.add('is-invalid');
            boothPassword.classList.add('is-invalid');
            boothUserError.textContent = 'Invalid credentials.';
            boothPasswordError.textContent = 'Invalid credentials.';
        }
    } catch (error) {
        console.error("Error during booth login:", error);
        showAlert(`Login failed: ${error.message}`, 'danger');
    } finally {
        showLoading(false);
    }
});

function showBoothContent() {
    boothLoginCard.style.display = 'none';
    boothContent.style.display = 'block';
    loggedInBoothName.textContent = loggedInBoothData.name;
    loggedInBoothId.textContent = loggedInBoothData.boothId;
    listenToVotingMachinesForBooth(loggedInBoothData.docId);
}

function showLoginCard() {
    boothLoginCard.style.display = 'block';
    boothContent.style.display = 'none';
    localStorage.removeItem('boothSession'); // Clear session
    loggedInBoothData = null;
}

// --- Voting Machine Management for Booth ---

/**
 * Listens for real-time updates to voting machines associated with the logged-in booth.
 * @param {string} boothDocId - The Firestore document ID of the logged-in booth.
 */
function listenToVotingMachinesForBooth(boothDocId) {
    const votingMachinesRef = collection(db, `artifacts/${appId}/public/data/votingMachines`);
    const q = query(votingMachinesRef, where('boothDocId', '==', boothDocId));

    onSnapshot(q, (snapshot) => {
        votingMachinesTableBody.innerHTML = '';
        if (snapshot.empty) {
            votingMachinesTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No voting machines assigned to this booth.</td></tr>';
            return;
        }

        snapshot.forEach((doc) => {
            const vm = doc.data();
            const row = votingMachinesTableBody.insertRow();
            const lastActive = vm.lastActiveTime ? new Date(vm.lastActiveTime.toDate()).toLocaleString() : 'N/A';
            row.innerHTML = `
                <td>${vm.votingId}</td>
                <td><span class="badge ${getVmStatusClass(vm.status)}">${vm.status || 'inactive'}</span></td>
                <td>${lastActive}</td>
                <td>
                    ${vm.status === 'completed' || vm.status === 'ready' ?
                        `<button class="btn btn-sm btn-success set-ready-vm" data-id="${doc.id}">
                            <i class="fas fa-check-circle"></i> Set Ready
                        </button>` :
                        `<button class="btn btn-sm btn-secondary" disabled>
                            <i class="fas fa-hourglass-half"></i> ${vm.status === 'active' ? 'In Use' : 'In Ready'}
                        </button>`
                    }
                </td>
            `;
        });
        attachVotingMachineEventListeners();
    }, (error) => {
        console.error("Error listening to voting machines for booth:", error);
        showAlert("Error loading voting machines for this booth.", "danger");
    });
}

/**
 * Helper to get Bootstrap badge class based on status.
 * @param {string} status
 */
function getVmStatusClass(status) {
    switch (status) {
        case 'ready': return 'bg-success';
        case 'active': return 'bg-primary';
        case 'completed': return 'bg-warning text-dark';
        case 'inactive': return 'bg-secondary';
        default: return 'bg-light text-dark';
    }
}

/**
 * Attaches event listeners to dynamically created voting machine action buttons.
 */
function attachVotingMachineEventListeners() {
    document.querySelectorAll('.set-ready-vm').forEach(button => {
        button.onclick = async (e) => {
            const vmDocId = e.currentTarget.dataset.id;
            await setVotingMachineReady(vmDocId);
        };
    });
}

/**
 * Sets the status of a voting machine to 'ready'.
 * @param {string} vmDocId - The document ID of the voting machine.
 */
async function setVotingMachineReady(vmDocId) {
    showLoading(true, 'Setting machine ready...');
    try {
        await updateDoc(doc(db, `artifacts/${appId}/public/data/votingMachines`, vmDocId), {
            status: 'active',
            //currentSessionId: null // Clear any previous session
        });
        showAlert('Voting machine set to READY!', 'success');
    } catch (error) {
        console.error("Error setting voting machine ready:", error);
        showAlert(`Failed to set machine ready: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
}
