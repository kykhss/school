import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, addDoc, getDocs, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global Firebase variables (provided by the environment)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'kyhss';
const firebaseConfig = {
    apiKey: "AIzaSyAu5TDMWepJX7naoG5H3WpGJ1yxAu01whg",
    authDomain: "timetables-470dd.firebaseapp.com",
    projectId: "timetables-470dd",
    storageBucket: "timetables-470dd.firebasestorage.app",
    messagingSenderId: "925422681424",
    appId: "1:925422681424:web:df91ce9de4dfef9c5ec055",
    measurementId: "G-N7ND4LPL9W"
    };  
    //const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

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

const passwordModal = document.getElementById('passwordModal'); // Changed to direct element
const invigilatorPasswordInput = document.getElementById('invigilatorPassword');
const passwordError = document.getElementById('passwordError');
const submitPasswordBtn = document.getElementById('submitPassword');

const currentUserIdSpan = document.getElementById('currentUserId');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText'); // Updated ID
const alertContainer = document.getElementById('alertContainer');

// --- Utility Functions ---

/**
 * Displays a temporary alert message to the user.
 * @param {string} message - The message to display.
 * @param {'success'|'danger'|'warning'|'info'} type - The type of alert.
 */
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    let iconClass = '';
    let bgColor = '';
    let textColor = '';

    switch (type) {
        case 'success':
            iconClass = 'fas fa-check-circle';
            bgColor = 'bg-green-100';
            textColor = 'text-green-700';
            break;
        case 'danger':
            iconClass = 'fas fa-exclamation-circle';
            bgColor = 'bg-red-100';
            textColor = 'text-red-700';
            break;
        case 'warning':
            iconClass = 'fas fa-exclamation-triangle';
            bgColor = 'bg-yellow-100';
            textColor = 'text-yellow-700';
            break;
        case 'info':
            iconClass = 'fas fa-info-circle';
            bgColor = 'bg-blue-100';
            textColor = 'text-blue-700';
            break;
    }

    alertDiv.className = `alert-message ${bgColor} ${textColor} transition-opacity duration-500 ease-out opacity-0`;
    alertDiv.innerHTML = `
        <span class="icon"><i class="${iconClass}"></i></span>
        <div>${message}</div>
        <button type="button" class="ml-auto text-gray-500 hover:text-gray-700" onclick="this.closest('.alert-message').remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    alertContainer.appendChild(alertDiv);

    // Trigger fade-in
    setTimeout(() => alertDiv.classList.remove('opacity-0'), 10);

    // Trigger fade-out
    setTimeout(() => {
        alertDiv.classList.add('opacity-0');
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

    // Reset visibility of elements in waitingForReadyView
    readyInstructionText.style.display = 'block';
    waitingSpinner.style.display = 'block';
    startVotingButton.classList.add('hidden'); // Hide by default

    switch (status) {
        case 'inactive':
            // waitingForReadyView.style.display = 'block';
            // readyInstructionText.textContent = 'Please wait for the booth invigilator to set this machine to "Ready".';
            // machineStatusText.classList.remove('bg-green-500'); // Ensure correct badge color
            // machineStatusText.classList.add('bg-gray-500');
            machineLoginView.style.display = 'block'; // Fallback
            break;
        case 'ready':
            passwordModal.classList.add('hidden'); // Hide the modal
            waitingForReadyView.style.display = 'block';
            readyInstructionText.textContent = 'This machine is ready for voting.';
            waitingSpinner.style.display = 'none'; // Hide spinner
            startVotingButton.classList.remove('hidden'); // Show the "Click here to Vote" button
            machineStatusText.classList.remove('bg-gray-500'); // Change badge color to success
            machineStatusText.classList.add('bg-green-500');
            break;
        case 'active':
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
        // const storedMachineData = localStorage.getItem('votingMachineSession');
        //         if (storedMachineData) {
        //             loggedInMachineData = JSON.parse(storedMachineData);
        //             currentSessionId = localStorage.getItem('currentSessionId');
        //             if (loggedInMachineData && loggedInMachineData.docId) {
        //                 listenToMachineStatus(loggedInMachineData.docId);
        //                 // Also re-verify session, which will trigger updateViewBasedOnStatus
        //                 await verifyMachineSession(loggedInMachineData.docId, currentSessionId);
        //             } else {
        //                 // If stored data is incomplete, force login
        //                 forceLogout();
        //             }
        //         }
        // Fetch posts and candidates only AFTER auth state is settled and db is confirmed
                await fetchAllPostsAndCandidates();
        // Perform initial sign-in (anonymous or custom token) to establish user context
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                currentUserIdSpan.textContent = userId;

                const storedMachineData = localStorage.getItem('votingMachineSession');
                if (storedMachineData) {
                    loggedInMachineData = JSON.parse(storedMachineData);
                    currentSessionId = localStorage.getItem('currentSessionId');
                    if (loggedInMachineData && loggedInMachineData.docId) {
                        listenToMachineStatus(loggedInMachineData.docId);
                        // Also re-verify session, which will trigger updateViewBasedOnStatus
                        await verifyMachineSession(loggedInMachineData.docId, currentSessionId);
                    } else {
                        // If stored data is incomplete, force login
                        forceLogout();
                    }
                } else {
                    updateViewBasedOnStatus(); // Show login if no session
                }

                // Fetch posts and candidates only AFTER auth state is settled and db is confirmed
                await fetchAllPostsAndCandidates();

            } else {
                userId = 'Not Authenticated';
                currentUserIdSpan.textContent = userId;
                localStorage.removeItem('votingMachineSession');
                localStorage.removeItem('currentSessionId');
                loggedInMachineData = null;
                currentSessionId = null;
                updateViewBasedOnStatus();
            }
            showLoading(false);
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

    // Clear previous errors
    machineIdInput.classList.remove('border-red-500');
    machineIdError.textContent = '';
    machinePasswordInput.classList.remove('border-red-500');
    machinePasswordError.textContent = '';

    if (!machineId) {
        machineIdInput.classList.add('border-red-500');
        machineIdError.textContent = 'Machine ID is required.';
        return;
    }

    if (!password) {
        machinePasswordInput.classList.add('border-red-500');
        machinePasswordError.textContent = 'Password is required.';
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
            const newSessionId = "jchfvhbjnklm"// crypto.randomUUID()||"jchfvhbjnklm";
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
            localStorage.setItem('votingMachineSession', JSON.stringify(loggedInMachineData));
            localStorage.setItem('currentSessionId', currentSessionId);

            showAlert(`Logged in to Voting Machine: ${machineId}`, 'success');
            listenToMachineStatus(machineDoc.id); // Start listening to its status
            updateViewBasedOnStatus(); // Show waiting for ready view
        } else {
            showAlert('Invalid machine ID or password.', 'danger');
            machineIdInput.classList.add('border-red-500');
            machinePasswordInput.classList.add('border-red-500');
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
            if (vmData.currentSessionId !== expectedSessionId) {
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
 * Forcefully logs out the machine.
 */
function forceLogout() {
    localStorage.removeItem('votingMachineSession');
    localStorage.removeItem('currentSessionId');
    loggedInMachineData = null;
    currentSessionId = null;
    currentPostIndex = 0; // Reset post index on logout
    votedPosts.clear(); // Clear voted posts on logout
    updateViewBasedOnStatus();
    showAlert('You have been logged out.', 'info');
}

/**
 * Listens for real-time updates to the logged-in voting machine's status.
 * @param {string} vmDocId - The document ID of the voting machine.
 */
function listenToMachineStatus(vmDocId) {
    onSnapshot(doc(db, `artifacts/${appId}/public/data/votingMachines`, vmDocId), (docSnapshot) => {
        if (docSnapshot.exists()) {
            loggedInMachineData = { docId: docSnapshot.id, ...docSnapshot.data() };
            localStorage.setItem('votingMachineSession', JSON.stringify(loggedInMachineData)); // Keep local storage updated
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
        console.log(candidates);
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
        notaButton.classList.add('hidden'); // Hide NOTA if no posts
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
    notaButton.classList.remove('selected'); // Deselect NOTA if it was selected

    // Filter candidates for the current post
    const filteredCandidates = candidates.filter(c => c.postId === currentPost.id);

    if (filteredCandidates.length === 0) {
        candidatesContainer.innerHTML = '<div class="col-span-full text-center text-gray-500 p-1">No candidates for this post yet.</div>';
    } else {
        filteredCandidates.forEach(candidate => {
            const candidateCard = document.createElement('div');
            candidateCard.className = 'col-span-1'; // Tailwind for single column on small, adjust for larger
            candidateCard.innerHTML = `
  <div class="candidate-card bg-white p-2 rounded-xl shadow-md flex flex-row sm:flex-col items-center gap-2">
    <img src="${candidate.photoUrl || 'https://placehold.co/120x120/cccccc/333333?text=No+Photo'}"
         alt="${candidate.name}"
         class="candidate-photo w-24 h-24 object-cover rounded-full" style="z-index:700;"
         onerror="this.onerror=null;this.src='https://placehold.co/120x120/cccccc/333333?text=No+Photo';">

    <div class="flex-1 text-center sm:text-left">
      <h5 class="text-lg font-semibold text-gray-800 mb-2">${candidate.name}</h5>
      <button type="button" data-candidate-id="${candidate.id}"
              class="vote-button bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg w-full sm:w-auto transition duration-300">
          <i class="fas fa-check-circle mr-2"></i> Vote
      </button>
    </div>
  </div>
`;

            candidatesContainer.appendChild(candidateCard);
        });
    }

    // Attach event listeners to the new vote buttons
    document.querySelectorAll('.vote-button').forEach(button => {
        button.addEventListener('click', (e) => {
            playBeep();
            const candidateId = e.currentTarget.dataset.candidateId;
            handleVoteSubmission(currentPost.id, candidateId);
        });
    });

    // Show NOTA button
    notaButton.classList.remove('hidden'); // Ensure NOTA is visible
    notaButton.removeEventListener('click', handleNotaClick); // Remove old listener to prevent duplicates
    notaButton.addEventListener('click', handleNotaClick); // Add new listener

    updateProgressBar(); // Update progress bar for the current post
}

/**
 * Handles NOTA button click.
 */
function handleNotaClick() {
    handleVoteSubmission(posts[currentPostIndex].id, 'NOTA');
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
        // The status listener will handle showing the completion view
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
    invigilatorPasswordInput.classList.remove('border-red-500'); // Tailwind class for error
    passwordModal.classList.remove('hidden'); // Show the modal
});

submitPasswordBtn.addEventListener('click', async () => {
    const enteredPassword = invigilatorPasswordInput.value;

    if (!enteredPassword) {
        invigilatorPasswordInput.classList.add('border-red-500');
        passwordError.textContent = 'Password cannot be empty.';
        return;
    }

    showLoading(true, 'Authenticating Invigilator...');
    try {
        const boothDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/booths`, loggedInMachineData.boothDocId));

        if (boothDoc.exists()) {
            const boothData = boothDoc.data();
            if (enteredPassword === boothData.password) {
                // Invigilator authenticated. Reset machine to 'ready'
                await updateDoc(doc(db, `artifacts/${appId}/public/data/votingMachines`, loggedInMachineData.docId), {
                    status: 'ready'
                });
                showAlert('Invigilator authenticated. Machine reset to Ready.', 'success');
                passwordModal.classList.add('hidden'); // Hide the modal
                // Reset voting session state for the next voter
                currentPostIndex = 0;
                votedPosts.clear();
                // The onSnapshot listener will pick up the status change and update the view.
            } else {
                invigilatorPasswordInput.classList.add('border-red-500');
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
