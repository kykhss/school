import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, addDoc, getDocs, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global Firebase variables (provided by the environment)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'kyhss';
const firebaseConfig = {
    apiKey: "AIzaSyAu5TDMWepJX7naoG5H3WpGJ1yxAu01whg",
    authDomain: "timetables-470dd.firebaseapp.com",
    projectId: "timetables-470dd",
    storageBucket: "timetables-470dd.firebaseapp.com",
    messagingSenderId: "925422681424",
    appId: "1:925422681424:web:df91ce9de4dfef9c5ec055",
    measurementId: "G-N7ND4LPL9W"
};

let app;
let db;
let auth;
let userId; // Will store the authenticated user ID
let loggedInMachineData = null; // Stores the data of the logged-in voting machine
let currentSessionId = null; // Unique ID for the current session of this machine
let readyTimeoutId = null; // Stores the ID of the timeout for 'ready' status

let posts = []; // To store all posts, sorted by order
let candidates = []; // To store all candidates
let currentPostIndex = 0; // Tracks the index of the currently displayed post
let votedPosts = new Set(); // Stores IDs of posts already voted on in the current session

// --- Persistent Storage Keys ---
const MACHINE_SESSION_KEY = 'votingMachineSession';
const CURRENT_SESSION_ID_KEY = 'currentSessionId';
const VOTING_PROGRESS_KEY = 'votingProgress'; // New key for progress

// DOM Elements
const machineLoginView = document.getElementById('machineLoginView');
const machineIdInput = document.getElementById('machineId');
const machinePasswordInput = document.getElementById('machinePassword');
const machineIdError = document.getElementById('machineIdError');
const machinePasswordError = document.getElementById('machinePasswordError');
const machineLoginBtn = document.getElementById('machineLoginBtn');

const waitingForReadyView = document.getElementById('waitingForReadyView');
const machineStatusText = document.getElementById('machineStatusText');
const readyInstructionText = document.getElementById('readyInstructionText');
const waitingSpinner = document.getElementById('waitingSpinner');
const startVotingButton = document.getElementById('startVotingButton');

const postCandidateSelectionView = document.getElementById('postCandidateSelectionView'); // Combined view
const progressBarContainer = document.getElementById('progressBarContainer');
const progressBar = document.getElementById('progressBar');
const currentPostTitle = document.getElementById('currentPostTitle');
const currentPostDescription = document.getElementById('currentPostDescription');
const candidatesContainer = document.getElementById('candidatesContainer');
const notaButton = document.getElementById('notaButton');

const completionView = document.getElementById('completionView');
const invigilatorAuthBtn = document.getElementById('invigilatorAuthBtn');

// Bootstrap Modal instance
let invigilatorPasswordModal; // This will hold the Bootstrap Modal object

const passwordModalElement = document.getElementById('passwordModal');
const invigilatorPasswordInput = document.getElementById('invigilatorPassword');
const passwordError = document.getElementById('passwordError');
const submitPasswordBtn = document.getElementById('submitPassword');

const currentUserIdSpan = document.getElementById('currentUserId');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const alertContainer = document.getElementById('alertContainer');

// --- Utility Functions ---

/**
 * Displays a temporary alert message to the user using Bootstrap's alert component.
 * @param {string} message - The message to display.
 * @param {'success'|'danger'|'warning'|'info'} type - The type of alert.
 */
function showAlert(message, type) {
    // Determine if it's a mobile view (e.g., screen width less than 768px for Bootstrap's 'md' breakpoint)
    const isMobileView = window.innerWidth < 768; // You can adjust this breakpoint as needed

    // If it's a success message and we're on mobile, don't show it.
    if (type === 'success' && isMobileView) {
        return;
    }

    const alertDiv = document.createElement('div');
    let iconClass = '';
    let bsAlertType = '';

    switch (type) {
        case 'success':
            iconClass = 'fas fa-check-circle';
            bsAlertType = 'alert-success';
            break;
        case 'danger':
            iconClass = 'fas fa-exclamation-circle';
            bsAlertType = 'alert-danger';
            break;
        case 'warning':
            iconClass = 'fas fa-exclamation-triangle';
            bsAlertType = 'alert-warning';
            break;
        case 'info':
            iconClass = 'fas fa-info-circle';
            bsAlertType = 'alert-info';
            break;
    }

    alertDiv.className = `alert alert-dismissible fade show ${bsAlertType} alert-message`; // Added fade show for Bootstrap animation
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        <span class="icon"><i class="${iconClass}"></i></span>
        <div>${message}</div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    alertContainer.appendChild(alertDiv);

    // For automatic dismissal, use Bootstrap's programmatic close after a timeout
    setTimeout(() => {
        const bsAlert = bootstrap.Alert.getInstance(alertDiv) || new bootstrap.Alert(alertDiv);
        bsAlert.close();
    }, 5000);
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

/**
 * Hides all main views.
 */
function hideAllViews() {
    machineLoginView.style.display = 'none';
    waitingForReadyView.style.display = 'none';
    postCandidateSelectionView.style.display = 'none';
    completionView.style.display = 'none';
    progressBarContainer.style.display = 'none'; // Hide progress bar by default
}

/**
 * Updates the progress bar based on the current post index.
 */
function updateProgressBar() {
    if (posts.length === 0) {
        progressBarContainer.style.display = 'none';
        return;
    }
    progressBarContainer.style.display = 'block';
    const progress = ((currentPostIndex + 1) / posts.length) * 100;
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress); // Update ARIA value
}

/**
 * Displays the appropriate view based on machine status.
 */
function updateViewBasedOnStatus() {
    hideAllViews();
    if (!loggedInMachineData) {
        machineLoginView.style.display = 'block';
        return;
    }

    const status = loggedInMachineData.status;
    machineStatusText.textContent = status.charAt(0).toUpperCase() + status.slice(1); // Capitalize first letter

    // Reset visibility of elements in waitingForReadyView using Bootstrap d-none/d-block
    readyInstructionText.classList.remove('d-none');
    waitingSpinner.classList.remove('d-none');
    startVotingButton.classList.add('d-none'); // Hide by default

    // Reset badge classes for machine status
    machineStatusText.classList.remove('bg-success', 'bg-secondary', 'bg-warning', 'bg-info', 'bg-danger');

    switch (status) {
        case 'inactive':
            waitingForReadyView.style.display = 'block';
            readyInstructionText.textContent = 'Please wait for the booth invigilator to set this machine to "Ready".';
            machineStatusText.classList.add('bg-secondary'); // Bootstrap's default gray for inactive
            break;
        case 'ready':
            if (invigilatorPasswordModal) {
                invigilatorPasswordModal.hide();
            }
            waitingForReadyView.style.display = 'block';
            readyInstructionText.textContent = 'This machine is ready for voting.';
            waitingSpinner.classList.add('d-none'); // Hide spinner
            startVotingButton.classList.remove('d-none'); // Show the "Click here to Vote" button
            machineStatusText.classList.add('bg-success'); // Change badge color to success
            break;
        case 'active':
            if (invigilatorPasswordModal) {
                invigilatorPasswordModal.hide(); // Hide the modal
            }
            postCandidateSelectionView.style.display = 'block';
            renderCurrentPost(); // Render the current post when active
            break;
        case 'completed':
            completionView.style.display = 'block';
            break;
        default:
            machineLoginView.style.display = 'block'; // Fallback
            break;
    }
}

// --- Firebase Initialization and Authentication ---

window.onload = async function() {
    showLoading(true, 'Initializing Firebase...');
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app); // Initialize db immediately
        auth = getAuth(app);

        // Initialize Bootstrap Modal instance AFTER the DOM is loaded
        invigilatorPasswordModal = new bootstrap.Modal(passwordModalElement);

        // --- Load stored session data on page load ---
        const storedMachineData = localStorage.getItem(MACHINE_SESSION_KEY);
        const storedSessionId = localStorage.getItem(CURRENT_SESSION_ID_KEY);
        const storedVotingProgress = localStorage.getItem(VOTING_PROGRESS_KEY);

        if (storedMachineData && storedSessionId) {
            loggedInMachineData = JSON.parse(storedMachineData);
            currentSessionId = storedSessionId;

            if (loggedInMachineData && loggedInMachineData.docId) {
                if (storedVotingProgress) {
                    const progress = JSON.parse(storedVotingProgress);
                    currentPostIndex = progress.currentPostIndex;
                    votedPosts = new Set(progress.votedPosts);
                }
                listenToMachineStatus(loggedInMachineData.docId);
                await verifyMachineSession(loggedInMachineData.docId, currentSessionId);
            } else {
                forceLogout(); // Data corrupted or incomplete, force login
            }
        }

        await fetchAllPostsAndCandidates(); // Fetch posts and candidates early

        // Perform initial sign-in (anonymous or custom token) to establish user context
        // This must happen after app initialization
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                currentUserIdSpan.textContent = userId;

                // This block ensures the view is updated even if auth state changes after initial load
                // It mostly handles the case where `loggedInMachineData` might not have been fully
                // processed by the time `updateViewBasedOnStatus` is first called if `localStorage` was empty.
                if (!loggedInMachineData) { // If not already loaded by the initial check
                    const storedMachineDataAfterAuth = localStorage.getItem(MACHINE_SESSION_KEY);
                    if (storedMachineDataAfterAuth) {
                         loggedInMachineData = JSON.parse(storedMachineDataAfterAuth);
                         currentSessionId = localStorage.getItem(CURRENT_SESSION_ID_KEY);
                         if (loggedInMachineData && loggedInMachineData.docId) {
                             listenToMachineStatus(loggedInMachineData.docId);
                             await verifyMachineSession(loggedInMachineData.docId, currentSessionId);
                         } else {
                             forceLogout();
                         }
                    } else {
                        updateViewBasedOnStatus(); // Show login if no session even after auth
                    }
                }
            } else {
                // Not authenticated, ensure all session data is cleared and show login
                forceLogout();
            }
            showLoading(false); // Hide loading once auth state is settled
        });

    } catch (error) {
        console.error("Error initializing Firebase:", error);
        showAlert("Failed to initialize Firebase. Check console for details.", "danger");
        showLoading(false);
    }
};

/**
 * Handles voting machine login.
 */
machineLoginBtn.addEventListener('click', async () => {
    const machineId = machineIdInput.value.trim();
    const password = machinePasswordInput.value.trim();

    // Clear previous errors using Bootstrap's 'is-invalid' class and 'invalid-feedback'
    machineIdInput.classList.remove('is-invalid');
    machineIdError.textContent = '';
    machinePasswordInput.classList.remove('is-invalid');
    machinePasswordError.textContent = '';

    let isValid = true;
    if (!machineId) {
        machineIdInput.classList.add('is-invalid');
        machineIdError.textContent = 'Machine ID is required.';
        isValid = false;
    }

    if (!password) {
        machinePasswordInput.classList.add('is-invalid');
        machinePasswordError.textContent = 'Password is required.';
        isValid = false;
    }

    if (!isValid) {
        return;
    }

    showLoading(true, 'Logging in machine...');
    try {
        const machinesRef = collection(db, `artifacts/${appId}/public/data/votingMachines`);
        const q = query(machinesRef, where('votingId', '==', machineId), where('password', '==', password));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const machineDoc = snapshot.docs[0];
            const machineData = machineDoc.data();

            // --- Session Management: Prevent duplicate logins ---
            const newSessionId = crypto.randomUUID ? crypto.randomUUID() : `temp-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

            if (machineData.currentSessionId && machineData.currentSessionId !== newSessionId && machineData.status !== 'inactive' && machineData.status !== 'completed') {
                showAlert('This machine is already active elsewhere. Please contact invigilator.', 'danger');
                showLoading(false);
                return;
            }

            await updateDoc(machineDoc.ref, {
                currentSessionId: newSessionId,
                lastActiveTime: Timestamp.now()
            });

            loggedInMachineData = { docId: machineDoc.id, ...machineData };
            currentSessionId = newSessionId;
            localStorage.setItem(MACHINE_SESSION_KEY, JSON.stringify(loggedInMachineData));
            localStorage.setItem(CURRENT_SESSION_ID_KEY, currentSessionId);

            // IMPORTANT: Reset voting progress for a NEW login session
            currentPostIndex = 0;
            votedPosts.clear();
            localStorage.removeItem(VOTING_PROGRESS_KEY); // Clear any old progress

            showAlert(`Logged in to Voting Machine: ${machineId}`, 'success');
            listenToMachineStatus(machineDoc.id); // Start listening to its status
            // updateViewBasedOnStatus will be called by the snapshot listener
        } else {
            showAlert('Invalid machine ID or password.', 'danger');
            machineIdInput.classList.add('is-invalid');
            machinePasswordInput.classList.add('is-invalid');
            machineIdError.textContent = 'Invalid credentials.';
            machinePasswordError.textContent = 'Invalid credentials.';
        }
    } catch (error) {
        console.error("Error during machine login:", error);
        showAlert(`Login failed: ${error.message}`, 'danger');
    } finally {
        showLoading(false);
    }
});

/**
 * Verifies if the current session ID matches the one stored in Firestore.
 * If not, it means another instance logged in and forces logout.
 * @param {string} vmDocId - The document ID of the voting machine.
 * @param {string} expectedSessionId - The session ID expected for this client.
 */
async function verifyMachineSession(vmDocId, expectedSessionId) {
    try {
        const vmDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/votingMachines`, vmDocId));
        if (vmDoc.exists()) {
            const vmData = vmDoc.data();
            if (vmData.currentSessionId !== expectedSessionId && vmData.status !== 'inactive') {
                showAlert('Another instance of this machine has logged in. This session will be logged out.', 'danger');
                forceLogout();
            }
        } else {
            forceLogout(); // Machine no longer exists
        }
    } catch (error) {
        console.error("Error verifying machine session:", error);
        forceLogout();
    }
}

/**
 * Forcefully logs out the machine and clears all session data.
 */
function forceLogout() {
    localStorage.removeItem(MACHINE_SESSION_KEY);
    localStorage.removeItem(CURRENT_SESSION_ID_KEY);
    localStorage.removeItem(VOTING_PROGRESS_KEY); // Clear voting progress on full logout

    loggedInMachineData = null;
    currentSessionId = null;
    currentPostIndex = 0; // Reset post index on logout
    votedPosts.clear(); // Clear voted posts on logout

    // If there's an active Firebase listener for machine status, unsubscribe it.
    if (listenToMachineStatus.unsubscribe) {
        listenToMachineStatus.unsubscribe();
        listenToMachineStatus.unsubscribe = null;
    }

    // Clear any pending 'ready' timeout
    if (readyTimeoutId) {
        clearTimeout(readyTimeoutId);
        readyTimeoutId = null;
    }

    updateViewBasedOnStatus(); // Ensure UI reflects logout
    showAlert('You have been logged out.', 'info');
}

/**
 * Listens for real-time updates to the logged-in voting machine's status.
 * @param {string} vmDocId - The document ID of the voting machine.
 */
function listenToMachineStatus(vmDocId) {
    // Unsubscribe from previous listener if exists (good practice for singletons)
    if (listenToMachineStatus.unsubscribe) {
        listenToMachineStatus.unsubscribe();
    }

    listenToMachineStatus.unsubscribe = onSnapshot(doc(db, `artifacts/${appId}/public/data/votingMachines`, vmDocId), (docSnapshot) => {
        if (docSnapshot.exists()) {
            loggedInMachineData = { docId: docSnapshot.id, ...docSnapshot.data() };
            localStorage.setItem(MACHINE_SESSION_KEY, JSON.stringify(loggedInMachineData)); // Keep local storage updated
            updateViewBasedOnStatus();

            // Clear any existing timeout
            if (readyTimeoutId) {
                clearTimeout(readyTimeoutId);
                readyTimeoutId = null;
            }

            // If machine is ready, start a timeout to revert to inactive
            if (loggedInMachineData.status === 'ready') {
                readyTimeoutId = setTimeout(async () => {
                    try {
                        const currentVmDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/votingMachines`, vmDocId));
                        // Only revert if status is still 'ready' and session ID matches
                        if (currentVmDoc.exists() && currentVmDoc.data().status === 'ready' && currentVmDoc.data().currentSessionId === currentSessionId) {
                            await updateDoc(doc(db, `artifacts/${appId}/public/data/votingMachines`, vmDocId), {
                                status: 'inactive',
                                currentSessionId: null // Clear session as it timed out
                            });
                            showAlert('Voting machine timed out. Set to inactive.', 'warning');
                            forceLogout(); // Log out this client as session ended
                        }
                    } catch (error) {
                        console.error("Error during ready status timeout:", error);
                        showAlert("Error during ready status timeout.", "danger");
                    }
                }, 5 * 60 * 1000); // 5 minutes in milliseconds
            } else if (loggedInMachineData.status === 'active' || loggedInMachineData.status === 'completed') {
                // If it becomes active or completed, clear the ready timeout immediately if it exists
                if (readyTimeoutId) {
                    clearTimeout(readyTimeoutId);
                    readyTimeoutId = null;
                }
            }

            // Check if current session ID is still valid (important for duplicate login detection)
            // This check is crucial to ensure only one client for a machine is active.
            if (loggedInMachineData.currentSessionId !== currentSessionId && loggedInMachineData.status !== 'inactive') {
                showAlert('Another instance of this machine has logged in. This session will be logged out.', 'danger');
                forceLogout();
            }
        } else {
            // Document no longer exists, machine was deleted from admin panel
            showAlert('This voting machine has been deactivated by an administrator.', 'danger');
            forceLogout();
        }
    }, (error) => {
        console.error("Error listening to machine status:", error);
        showAlert("Error updating machine status.", "danger");
        forceLogout(); // Force logout on error
    });
}

/**
 * Fetches all posts and candidates from Firestore.
 */
async function fetchAllPostsAndCandidates() {
    showLoading(true, 'Loading voting data...');
    try {
        const postsSnapshot = await getDocs(query(collection(db, `artifacts/${appId}/public/data/posts`), orderBy('order', 'asc')));
        posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const candidatesSnapshot = await getDocs(collection(db, `artifacts/${appId}/public/data/candidates`));
        candidates = candidatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Initial render of the current post if already active
        if (loggedInMachineData && loggedInMachineData.status === 'active') {
            renderCurrentPost();
        }
    } catch (error) {
        console.error("Error fetching posts and candidates:", error);
        showAlert("Failed to load voting data.", "danger");
    } finally {
        showLoading(false);
    }
}

// --- Voting Logic ---

/**
 * Renders the current post and its candidates.
 */
function renderCurrentPost() {
    if (posts.length === 0) {
        currentPostTitle.textContent = 'No Posts Available';
        currentPostDescription.textContent = 'Please check with the administrator.';
        candidatesContainer.innerHTML = '';
        notaButton.classList.add('d-none'); // Hide NOTA if no posts
        progressBarContainer.style.display = 'none';
        return;
    }

    // Ensure currentPostIndex is within bounds
    if (currentPostIndex >= posts.length) {
        // All posts voted, transition to completion view
        handleAllPostsVoted();
        return;
    }

    const currentPost = posts[currentPostIndex];
    currentPostTitle.textContent = currentPost.title;
    currentPostDescription.textContent = currentPost.description;
    candidatesContainer.innerHTML = ''; // Clear previous candidates
    notaButton.classList.remove('selected'); // Deselect NOTA if it was selected by custom class

    // Filter candidates for the current post
    const filteredCandidates = candidates.filter(c => c.postId === currentPost.id);

    if (filteredCandidates.length === 0) {
        candidatesContainer.innerHTML = '<div class="col-12 text-center text-secondary p-1">No candidates for this post yet.</div>'; // Bootstrap col-12
    } else {
        filteredCandidates.forEach(candidate => {
            const candidateCardCol = document.createElement('div');
            candidateCardCol.className = 'col-12 col-sm-6 col-md-4 mb-3';

            candidateCardCol.innerHTML = `
  <div class="candidate-card card h-100">
  <div class="d-flex" >
    <div class="card-body d-flex flex-sm-row flex-lg-column align-items-stretch p-3 gap-3" style="height: 100%;">

      <!-- Image -->
      <div class="d-flex align-items-center justify-content-center flex-shrink-0 bg-light border rounded" style="width: 80px; height: 100px;">
        <img src="${candidate.photoUrl ? 'https://drive.google.com/thumbnail?id=' + candidate.photoUrl : 'https://placehold.co/80x100/cccccc/333333?text=No+Photo'}"
             alt="${candidate.name}"
             class="img-fluid"
             style="max-width: 100%; max-height: 100%; object-fit: cover;"
             onerror="this.onerror=null;this.src='https://placehold.co/80x100/cccccc/333333?text=No+Photo';">
      </div>

      <!-- Name -->
     <div class="d-flex align-items-center justify-content-start flex-grow-1 text-start">
  <h5 class="mb-0 fw-semibold text-dark text-break text-wrap">
    ${candidate.name}
  </h5>
</div>
</div>
      <!-- Vote Button -->
      <div class="d-flex align-items-center justify-content-start flex-shrink-0" style="min-width: 60px; min-height:80px">
        <button type="button" data-candidate-id="${candidate.id}"
                class="vote-button btn btn-primary">
          <i class="fas fa-check-circle me-1"></i> Vote
        </button>
      </div>

    </div>
  </div>
`;
candidatesContainer.appendChild(candidateCardCol);
});

// After looping through all candidates
const notaCard = document.createElement('div');
notaCard.classList.add('col-md-4', 'mb-4'); // Adjust grid class as needed

notaCard.innerHTML = `
  <div class="candidate-card card h-100">
    <div class="card-body d-flex flex-sm-row flex-lg-column align-items-stretch p-3 gap-3" style="height: 100%;">

      <!-- Image -->
      <div class="d-flex align-items-center justify-content-center flex-shrink-0 bg-light border rounded" style="width: 80px; height: 100px;">
        <img src="https://placehold.co/80x100/cccccc/333333?text=NOTA"
             alt="NOTA"
             class="img-fluid"
             style="max-width: 100%; max-height: 100%; object-fit: cover;">
      </div>

      <!-- Name -->
      <div class="d-flex align-items-center justify-content-center flex-grow-1">
        <h5 class="mb-0 fw-semibold text-dark">NOTA</h5>
      </div>

      <!-- Vote Button -->
      <div class="d-flex align-items-center justify-content-center flex-shrink-0" style="min-width: 120px;">
        <button type="button" data-candidate-id="NOTA"
                class="vote-button btn btn-outline-danger w-100">
          <i class="fas fa-ban me-1"></i> Vote
        </button>
      </div>

    </div>
  </div>
`;

candidatesContainer.appendChild(notaCard);

}

    // Re-attach event listeners for dynamically added vote buttons
    document.querySelectorAll('.vote-button').forEach(button => {
        // Remove existing listener to prevent duplicates if renderCurrentPost is called multiple times
        button.removeEventListener('click', handleVoteButtonClick);
        button.addEventListener('click', handleVoteButtonClick);
    });

    // Show NOTA button
    notaButton.classList.add('d-none'); // Ensure NOTA is visible
    notaButton.removeEventListener('click', handleNotaClick);
    notaButton.addEventListener('click', handleNotaClick);

    updateProgressBar(); // Update progress bar for the current post
}

/**
 * Generic handler for vote button clicks.
 * Separated to ensure proper re-attachment and avoid multiple listeners.
 */
function handleVoteButtonClick(e) {
    playBeep();
    const candidateId = e.currentTarget.dataset.candidateId;
    // Ensure currentPost is valid before proceeding
    if (posts[currentPostIndex]) {
        handleVoteSubmission(posts[currentPostIndex].id, candidateId);
    } else {
        console.error("No valid current post found for vote submission.");
        showAlert("Error: Cannot submit vote, post data missing.", "danger");
    }
}

/**
 * Handles NOTA button click.
 */
function handleNotaClick() {
    playBeep();
    // Ensure currentPost is valid before proceeding
    if (posts[currentPostIndex]) {
        handleVoteSubmission(posts[currentPostIndex].id, 'NOTA');
    } else {
        console.error("No valid current post found for NOTA vote submission.");
        showAlert("Error: Cannot submit NOTA vote, post data missing.", "danger");
    }
}

/**
 * Handles vote submission for a specific candidate or NOTA.
 * @param {string} postId - The ID of the post being voted for.
 * @param {string} candidateId - The ID of the selected candidate, or 'NOTA'.
 */
async function handleVoteSubmission(postId, candidateId) {
    if (votedPosts.has(postId)) {
        showAlert('You have already voted for this post.', 'warning');
        return;
    }

    showLoading(true, 'Submitting Vote...');
    try {
        // Record the vote
        await addDoc(collection(db, `artifacts/${appId}/public/data/votes`), {
            postId: postId,
            candidateId: candidateId,
            votingMachineDocId: loggedInMachineData.docId,
            boothDocId: loggedInMachineData.boothDocId,
            sessionId: currentSessionId, // Link vote to the specific session
            timestamp: Timestamp.now()
        });

        votedPosts.add(postId); // Mark post as voted

        // --- Store current progress after a successful vote ---
        const votingProgress = {
            currentPostIndex: currentPostIndex + 1, // Store the NEXT post index
            votedPosts: Array.from(votedPosts) // Convert Set to Array for storage
        };
        localStorage.setItem(VOTING_PROGRESS_KEY, JSON.stringify(votingProgress));

        showAlert('Vote submitted successfully!', 'success');

        // Move to the next post or complete the session
        currentPostIndex++;
        if (currentPostIndex < posts.length) {
            renderCurrentPost(); // Render the next post
        } else {
            // All posts have been voted on
            handleAllPostsVoted();
        }

    } catch (error) {
        console.error("Error submitting vote:", error);
        showAlert(`Failed to submit vote: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
}

/**
 * Handles the state when all posts have been voted on.
 */
async function handleAllPostsVoted() {
    showLoading(true, 'Finalizing session...');
    try {
        // Update voting machine status to 'completed'
        await updateDoc(doc(db, `artifacts/${appId}/public/data/votingMachines`, loggedInMachineData.docId), {
            status: 'completed'
        });

        // Clear voting progress from localStorage as the session is completed
        localStorage.removeItem(VOTING_PROGRESS_KEY);

        // The status listener will handle showing the completion view
        if (invigilatorPasswordModal) {
            invigilatorPasswordModal.hide(); // Hide the modal if it's open
        }
        // These resets are now handled by forceLogout or by the invigilator authentication path
        // currentPostIndex = 0;
        // votedPosts.clear();

    } catch (error) {
        console.error("Error setting machine to completed:", error);
        showAlert("Failed to finalize voting session.", "danger");
    } finally {
        showLoading(false);
    }
}

// --- "Click here to Vote" button listener ---
startVotingButton.addEventListener('click', async () => {
    if (loggedInMachineData && loggedInMachineData.status === 'ready') {
        showLoading(true, 'Starting voting session...');
        try {
            await updateDoc(doc(db, `artifacts/${appId}/public/data/votingMachines`, loggedInMachineData.docId), {
                status: 'active'
            });
            showAlert('Voting session started!', 'success');

            // Explicitly clear progress if starting a new session from 'ready'
            currentPostIndex = 0;
            votedPosts.clear();
            localStorage.removeItem(VOTING_PROGRESS_KEY);

            // updateViewBasedOnStatus will be triggered by the snapshot listener
            // which will then call renderCurrentPost()
        } catch (error) {
            console.error("Error setting machine to active:", error);
            showAlert(`Failed to start voting session: ${error.message}`, 'danger');
        } finally {
            showLoading(false);
        }
    } else {
        showAlert('Machine is not in a "ready" state to start voting.', 'warning');
    }
});

// --- Invigilator Authentication for Completion ---

invigilatorAuthBtn.addEventListener('click', () => {
    invigilatorPasswordInput.value = '';
    passwordError.textContent = '';
    invigilatorPasswordInput.classList.remove('is-invalid'); // Bootstrap class for error
    if (invigilatorPasswordModal) {
        invigilatorPasswordModal.show(); // Show the modal using Bootstrap's JS API
    }
});

submitPasswordBtn.addEventListener('click', async () => {
    const enteredPassword = invigilatorPasswordInput.value;

    if (!enteredPassword) {
        invigilatorPasswordInput.classList.add('is-invalid');
        passwordError.textContent = 'Password cannot be empty.';
        return;
    }

    showLoading(true, 'Authenticating Invigilator...');
    try {
        // Ensure loggedInMachineData and its boothDocId exist
        if (!loggedInMachineData || !loggedInMachineData.boothDocId) {
            showAlert('Booth information missing. Cannot authenticate.', 'danger');
            showLoading(false);
            return;
        }

        const boothDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/booths`, loggedInMachineData.boothDocId));

        if (boothDoc.exists()) {
            const boothData = boothDoc.data();
            if (enteredPassword === boothData.password) {
                // Invigilator authenticated. Reset machine to 'ready'
                await updateDoc(doc(db, `artifacts/${appId}/public/data/votingMachines`, loggedInMachineData.docId), {
                    status: 'ready'
                });
                showAlert('Invigilator authenticated. Machine reset to Ready.', 'success');
                if (invigilatorPasswordModal) {
                    invigilatorPasswordModal.hide(); // Hide the modal
                }
                // Reset voting session state for the next voter
                currentPostIndex = 0;
                votedPosts.clear();
                localStorage.removeItem(VOTING_PROGRESS_KEY); // Clear progress on invigilator reset

                // The onSnapshot listener will pick up the status change and update the view.
            } else {
                invigilatorPasswordInput.classList.add('is-invalid');
                passwordError.textContent = 'Incorrect password.';
                showAlert('Incorrect invigilator password.', 'danger');
            }
        } else {
            showAlert('Associated booth not found. Cannot authenticate.', 'danger');
        }
    } catch (error) {
        console.error("Error during invigilator authentication:", error);
        showAlert(`Authentication failed: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
});


function playBeep() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';      // you can use 'square', 'triangle', etc.
    oscillator.frequency.setValueAtTime(800, ctx.currentTime); // frequency in Hz
    gainNode.gain.setValueAtTime(7, ctx.currentTime); // volume

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.5); // beep duration: 0.2s
}
