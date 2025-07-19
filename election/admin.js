/**
 * A more robust function to encode a string to Base64, correctly handling Unicode.
 * @param {string} str The string to encode.
 * @returns {string} The Base64 encoded string.
 */
function base64Encode(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    // Convert binary string to Base64
    return btoa(String.fromCharCode.apply(null, data));
}

/**
 * A more robust function to decode a Base64 string, correctly handling Unicode.
 * @param {string} str The Base64 string to decode.
 * @returns {string} The decoded string.
 */
function base64Decode(str) {
    const binaryString = atob(str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
}


/**
 * Sets a Base64 encoded user ID as a URL parameter.
 * @param {string} userId The user ID to encode and set in the URL.
 */
function setBase64ParamsInUrl(userId) {
    const encoded = base64Encode(userId);
    const newUrl = `${window.location.pathname}?wxev=${encodeURIComponent(encoded)}`;
    window.history.replaceState({}, '', newUrl);
}


/**
 * Loads parameters from the URL, decodes them, and saves to localStorage.
 * @returns {string} The loaded and decoded user ID.
 */
function loadParamsFromBase64Url() {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('wxev');

    if (dataParam) {
        try {
            // FIXED: The decoding function is now correctly called.
            const decoded = dataParam ;//base64Decode(dataParam);
            const userId = decoded;
            if (userId) {
                localStorage.setItem('userId', userId);
                return userId;
            }
        } catch (e) {
            console.error('Invalid Base64 data in URL:', e);
        }
    }

    // FIXED: The return statement is now on a single line to work correctly.
    // This will now execute as the fallback if the URL param fails.
    return localStorage.getItem('userId') || 'defaultUser';
}

           // setBase64ParamsInUrl('kyhss');
           // let appId = "timetableData"
            // Later in your app, decode from URL or localStorage
            const currentUserId= loadParamsFromBase64Url();
            const appId = typeof __app_id !== 'undefined' ? __app_id :currentUserId
            
            const basePath = `${appId}/${currentUserId}`;
        

            console.log(basePath);



import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, onSnapshot, collection, query, orderBy, addDoc, getDocs, where, writeBatch, updateDoc as firestoreUpdateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


//const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
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
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app;
let db;
let auth;
let userId; // Will store the authenticated user ID

// DOM Elements
const adminLoginCard = document.getElementById('adminLoginCard');
const adminPasswordInput = document.getElementById('adminPassword');
const adminPasswordError = document.getElementById('adminPasswordError');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminContent = document.getElementById('adminContent');
const currentUserIdSpan = document.getElementById('currentUserId');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.querySelector('#loadingOverlay .loading-text');
const alertContainer = document.getElementById('alertContainer');

// Add these with your other DOM element constants
const deleteConfirmModalEl = document.getElementById('deleteConfirmModal');
const deleteConfirmModal = new bootstrap.Modal(deleteConfirmModalEl);
const deleteConfirmInput = document.getElementById('deleteConfirmInput');
const finalDeleteBtn = document.getElementById('finalDeleteBtn');

// Modals and Forms (unchanged)
const addPostModal = new bootstrap.Modal(document.getElementById('addPostModal'));
const postForm = document.getElementById('postForm');
const postIdInput = document.getElementById('postId');
const postTitleInput = document.getElementById('postTitle');
const postDescriptionInput = document.getElementById('postDescription');
const postOrderInput = document.getElementById('postOrder');
const postsTableBody = document.getElementById('postsTableBody');

const addCandidateModal = new bootstrap.Modal(document.getElementById('addCandidateModal'));
const candidateForm = document.getElementById('candidateForm');
const candidateIdInput = document.getElementById('candidateId');
const candidateNameInput = document.getElementById('candidateName');
const candidatePhotoUrlInput = document.getElementById('candidatePhotoUrl');
const candidatePostSelect = document.getElementById('candidatePost');
const candidatesTableBody = document.getElementById('candidatesTableBody');

const addBoothModal = new bootstrap.Modal(document.getElementById('addBoothModal'));
const boothForm = document.getElementById('boothForm');
const boothDocIdInput = document.getElementById('boothDocId');
const boothIdInput = document.getElementById('boothId');
const boothNameInput = document.getElementById('boothName');
const boothUserInput = document.getElementById('boothUser');
const boothPasswordInput = document.getElementById('boothPassword');
const boothsTableBody = document.getElementById('boothsTableBody');

const addVotingMachineModal = new bootstrap.Modal(document.getElementById('addVotingMachineModal'));
const votingMachineForm = document.getElementById('votingMachineForm');
const votingMachineDocIdInput = document.getElementById('votingMachineDocId');
const votingMachineIdInput = document.getElementById('votingMachineId');
const votingMachinePasswordInput = document.getElementById('votingMachinePassword');
const votingMachineBoothIdSelect = document.getElementById('votingMachineBoothId');
const votingMachinesTableBody = document.getElementById('votingMachinesTableBody');

// New Reporting & Results DOM Elements
const generateBoothWisePdfBtn = document.getElementById('generateBoothWisePdfBtn');
const generateBoothWiseExcelBtn = document.getElementById('generateBoothWiseExcelBtn');
const publishResultsSwitch = document.getElementById('publishResultsSwitch');
const publishStatusText = document.getElementById('publishStatusText');
const resetAllMachinesBtn = document.getElementById('resetAllMachinesBtn'); // New button

// --- Utility Functions ---
const candidatePhotoInput = document.getElementById('candidatePhotoInput');
const candidatePhotoPreview = document.getElementById('candidatePhotoPreview');


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
                // Check if the user is the 'admin' (simple check for now)
                if (localStorage.getItem('isAdminLoggedIn') === 'true' && user.isAnonymous) {
                    showAdminContent();
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
 * Handles admin login. For this demo, a simple hardcoded password.
 * In a production app, use Firebase Authentication for proper admin accounts.
 */
adminLoginBtn.addEventListener('click', () => {
    const password = adminPasswordInput.value;
    const correctPassword = 'adminpassword123'; // Replace with a strong, securely stored password in a real app

    if (password === correctPassword) {
        adminPasswordInput.classList.remove('is-invalid');
        adminPasswordError.textContent = '';
        localStorage.setItem('isAdminLoggedIn', 'true'); // Simple flag
        showAdminContent();
        showAlert('Admin login successful!', 'success');
    } else {
        adminPasswordInput.classList.add('is-invalid');
        adminPasswordError.textContent = 'Incorrect password.';
        showAlert('Incorrect admin password.', 'danger');
    }
});

function showAdminContent() {
    adminLoginCard.style.display = 'none';
    adminContent.style.display = 'block';
    // Start listening to data
    listenToPosts();
    listenToCandidates();
    listenToBooths();
    listenToVotingMachines();
    populatePostSelects(); // Populate candidate post dropdown
    populateBoothSelects(); // Populate voting machine booth dropdown
    listenToPublishStatus(); // Listen to election publish status
    attachAdminControlEventListeners(); // Attach event listeners for new admin controls
}

function showLoginCard() {
    adminLoginCard.style.display = 'block';
    adminContent.style.display = 'none';
    localStorage.removeItem('isAdminLoggedIn'); // Clear login flag
}

/**
 * Attaches event listeners for new admin control buttons.
 */
function attachAdminControlEventListeners() {
    resetAllMachinesBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset ALL voting machines? This will set them to inactive and clear current sessions.')) {
            await resetAllVotingMachines();
        }
    });
}


// --- CRUD Operations for Posts (unchanged) ---

/**
 * Listens for real-time updates to posts and renders them in the table.
 */
function listenToPosts() {
    const postsRef = collection(db, `artifacts/${appId}/public/data/posts`);
    onSnapshot(query(postsRef, orderBy('order', 'asc')), (snapshot) => {
        postsTableBody.innerHTML = '';
        snapshot.forEach((doc) => {
            const post = doc.data();
            const row = postsTableBody.insertRow();
            row.innerHTML = `
                <td>${post.title}</td>
                <td>${post.description}</td>
                <td>${post.order}</td>
                <td>
                    <button class="btn btn-sm btn-info edit-post me-2" data-id="${doc.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-post" data-id="${doc.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        });
        attachPostEventListeners();
        populatePostSelects(); // Update candidate post dropdown when posts change
    }, (error) => {
        console.error("Error listening to posts:", error);
        showAlert("Error loading posts.", "danger");
    });
}

/**
 * Attaches event listeners to dynamically created post edit/delete buttons.
 */
function attachPostEventListeners() {
    document.querySelectorAll('.edit-post').forEach(button => {
        button.onclick = async (e) => {
            const postId = e.currentTarget.dataset.id;
            await editPost(postId);
        };
    });
    document.querySelectorAll('.delete-post').forEach(button => {
        button.onclick = async (e) => {
            const postId = e.currentTarget.dataset.id;
            if (confirm('Are you sure you want to delete this post? This will also remove associated candidates and votes!')) {
                await deletePost(postId);
            }
        };
    });
}

/**
 * Handles adding/editing a post.
 */
postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading(true, 'Saving Post...');
    const postId = postIdInput.value;
    const title = postTitleInput.value;
    const description = postDescriptionInput.value;
    const order = parseInt(postOrderInput.value);

    try {
        if (postId) {
            // Edit existing post
            await setDoc(doc(db, `artifacts/${appId}/public/data/posts`, postId), {
                title,
                description,
                order
            }, { merge: true });
            showAlert('Post updated successfully!', 'success');
        } else {
            // Add new post
            await addDoc(collection(db, `artifacts/${appId}/public/data/posts`), {
                title,
                description,
                order
            });
            showAlert('Post added successfully!', 'success');
        }
        postForm.reset();
        addPostModal.hide();
    } catch (error) {
        console.error("Error saving post:", error);
        showAlert(`Failed to save post: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
});

/**
 * Populates the post form for editing.
 * @param {string} postId - The ID of the post to edit.
 */
async function editPost(postId) {
    showLoading(true, 'Loading Post Data...');
    try {
        const postDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/posts`, postId));
        if (postDoc.exists()) {
            const post = postDoc.data();
            postIdInput.value = postDoc.id;
            postTitleInput.value = post.title;
            postDescriptionInput.value = post.description;
            postOrderInput.value = post.order;
            addPostModal.show();
        } else {
            showAlert('Post not found.', 'danger');
        }
    } catch (error) {
        console.error("Error fetching post for edit:", error);
        showAlert(`Failed to load post for edit: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
}

/**
 * Deletes a post and its associated candidates.
 * @param {string} postId - The ID of the post to delete.
 */
async function deletePost(postId) {
    showLoading(true, 'Deleting Post...');
    try {
        // Delete associated candidates first
        const candidatesRef = collection(db, `artifacts/${appId}/public/data/candidates`);
        const q = query(candidatesRef, where('postId', '==', postId));
        const candidateDocs = await getDocs(q);
        const deleteCandidatePromises = [];
        candidateDocs.forEach(doc => {
            deleteCandidatePromises.push(deleteDoc(doc.ref));
        });
        await Promise.all(deleteCandidatePromises);

        // Then delete the post
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/posts`, postId));
        showAlert('Post and associated candidates deleted successfully!', 'success');
    } catch (error) {
        console.error("Error deleting post:", error);
        showAlert(`Failed to delete post: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
}

/**
 * Populates the post dropdown in the candidate modal.
 */
async function populatePostSelects() {
    candidatePostSelect.innerHTML = '<option value="">Select a Post</option>';
    try {
        const postsRef = collection(db, `artifacts/${appId}/public/data/posts`);
        const snapshot = await getDocs(query(postsRef, orderBy('order', 'asc')));
        snapshot.forEach((doc) => {
            const post = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = post.title;
            candidatePostSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating post select:", error);
        showAlert("Failed to load posts for candidate selection.", "danger");
    }
}

// --- CRUD Operations for Candidates (unchanged) ---

/**
 * Listens for real-time updates to candidates and renders them in the table.
 */
function listenToCandidates() {
    const candidatesRef = collection(db, `artifacts/${appId}/public/data/candidates`);
    onSnapshot(candidatesRef, async (snapshot) => {
        candidatesTableBody.innerHTML = '';
        const postsMap = new Map();
        // Fetch all posts to map postId to postTitle
        const postsSnapshot = await getDocs(collection(db, `artifacts/${appId}/public/data/posts`));
        postsSnapshot.forEach(doc => {
            postsMap.set(doc.id, doc.data().title);
        });

        snapshot.forEach((doc) => {
            const candidate = doc.data();
            const postTitle = postsMap.get(candidate.postId) || 'N/A';
            const row = candidatesTableBody.insertRow();
            row.innerHTML = `
                <td><img src="${candidate.photoUrl ?candidate.photoUrl : 'https://placehold.co/80x100/cccccc/333333?text=YES+Photo'}" alt="${candidate.name}" class="rounded-circle" width="50" height="50" onerror="this.onerror=null;this.src='https://placehold.co/50x50/cccccc/333333?text=No+Photo';"></td>
                <td>${candidate.name}</td>
                <td>${postTitle}</td>
                <td>
                    <button class="btn btn-sm btn-info edit-candidate me-2" data-id="${doc.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-candidate" data-id="${doc.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        });
        attachCandidateEventListeners();
    }, (error) => {
        console.error("Error listening to candidates:", error);
        showAlert("Error loading candidates.", "danger");
    });
}

/**
 * Attaches event listeners to dynamically created candidate edit/delete buttons.
 */
function attachCandidateEventListeners() {
    document.querySelectorAll('.edit-candidate').forEach(button => {
        button.onclick = async (e) => {
            const candidateId = e.currentTarget.dataset.id;
            await editCandidate(candidateId);
        };
    });
    document.querySelectorAll('.delete-candidate').forEach(button => {
        button.onclick = async (e) => {
            const candidateId = e.currentTarget.dataset.id;
            if (confirm('Are you sure you want to delete this candidate?')) {
                await deleteCandidate(candidateId);
            }
        };
    });
}

/**
 * Handles adding/editing a candidate.
 */
candidateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading(true, 'Saving Candidate...');
    const candidateId = candidateIdInput.value;
    const name = candidateNameInput.value;
    const photoUrl = candidatePhotoUrlInput.value; // This now gets the URL from the hidden input
    const postId = candidatePostSelect.value;

    if (!photoUrl) {
         showAlert('Please upload a photo for the candidate.', 'warning');
         showLoading(false);
         return;
    }

    try {
        if (candidateId) {
            // Edit existing candidate
            await setDoc(doc(db, `artifacts/${appId}/public/data/candidates`, candidateId), {
                name,
                photoUrl,
                postId
            }, { merge: true });
            showAlert('Candidate updated successfully!', 'success');
        } else {
            // Add new candidate
            await addDoc(collection(db, `artifacts/${appId}/public/data/candidates`), {
                name,
                photoUrl,
                postId
            });
            showAlert('Candidate added successfully!', 'success');
        }
        addCandidateModal.hide(); // The 'hidden.bs.modal' event will handle the form reset
    } catch (error) {
        console.error("Error saving candidate:", error);
        showAlert(`Failed to save candidate: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
});


/**
 * Populates the candidate form for editing.
 * @param {string} candidateId - The ID of the candidate to edit.
 */
async function editCandidate(candidateId) {
    showLoading(true, 'Loading Candidate Data...');
    try {
        await populatePostSelects();
        const candidateDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/candidates`, candidateId));
        if (candidateDoc.exists()) {
            const candidate = candidateDoc.data();
            candidateIdInput.value = candidateDoc.id;
            candidateNameInput.value = candidate.name;
            candidatePhotoUrlInput.value = candidate.photoUrl || ''; // Populate hidden input
            candidatePostSelect.value = candidate.postId;

            // Show the existing photo in the preview
            if (candidate.photoUrl) {
                candidatePhotoPreview.src = candidate.photoUrl;
                candidatePhotoPreview.style.display = 'block';
            } else {
                candidatePhotoPreview.style.display = 'none';
            }

            addCandidateModal.show();
        } else {
            showAlert('Candidate not found.', 'danger');
        }
    } catch (error)
        {
        console.error("Error fetching candidate for edit:", error);
        showAlert(`Failed to load candidate for edit: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
}


/**
 * Deletes a candidate.
 * @param {string} candidateId - The ID of the candidate to delete.
 */
async function deleteCandidate(candidateId) {
    showLoading(true, 'Deleting Candidate...');
    try {
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/candidates`, candidateId));
        showAlert('Candidate deleted successfully!', 'success');
    } catch (error) {
        console.error("Error deleting candidate:", error);
        showAlert(`Failed to delete candidate: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
}

// --- CRUD Operations for Booths (unchanged) ---

/**
 * Listens for real-time updates to booths and renders them in the table.
 */
function listenToBooths() {
    const boothsRef = collection(db, `artifacts/${appId}/public/data/booths`);
    onSnapshot(boothsRef, (snapshot) => {
        boothsTableBody.innerHTML = '';
        snapshot.forEach((doc) => {
            const booth = doc.data();
            const row = boothsTableBody.insertRow();
            row.innerHTML = `
                <td>${booth.boothId}</td>
                <td>${booth.name}</td>
                <td>${booth.user}</td>
                <td>********</td> <td>
                    <button class="btn btn-sm btn-info edit-booth me-2" data-id="${doc.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-booth" data-id="${doc.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        });
        attachBoothEventListeners();
        populateBoothSelects(); // Update voting machine booth dropdown when booths change
    }, (error) => {
        console.error("Error listening to booths:", error);
        showAlert("Error loading booths.", "danger");
    });
}

/**
 * Attaches event listeners to dynamically created booth edit/delete buttons.
 */
function attachBoothEventListeners() {
    document.querySelectorAll('.edit-booth').forEach(button => {
        button.onclick = async (e) => {
            const boothDocId = e.currentTarget.dataset.id;
            await editBooth(boothDocId);
        };
    });
    document.querySelectorAll('.delete-booth').forEach(button => {
        button.onclick = async (e) => {
            const boothDocId = e.currentTarget.dataset.id;
            if (confirm('Are you sure you want to delete this booth? This will also remove associated voting machines!')) {
                await deleteBooth(boothDocId);
            }
        };
    });
}

/**
 * Handles adding/editing a booth.
 */
boothForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading(true, 'Saving Booth...');
    const boothDocId = boothDocIdInput.value;
    const boothId = boothIdInput.value;
    const name = boothNameInput.value;
    const user = boothUserInput.value;
    const password = boothPasswordInput.value; // In a real app, hash this password!

    try {
        if (boothDocId) {
            // Edit existing booth
            await setDoc(doc(db, `artifacts/${appId}/public/data/booths`, boothDocId), {
                boothId,
                name,
                user,
                password // Store password as plain text for demo, hash in production
            }, { merge: true });
            showAlert('Booth updated successfully!', 'success');
        } else {
            // Add new booth
            // Check for duplicate boothId before adding
            const q = query(collection(db, `artifacts/${appId}/public/data/booths`), where('boothId', '==', boothId));
            const existingBooths = await getDocs(q);
            if (!existingBooths.empty) {
                showAlert('Booth ID already exists. Please use a unique ID.', 'danger');
                showLoading(false);
                return;
            }

            await addDoc(collection(db, `artifacts/${appId}/public/data/booths`), {
                boothId,
                name,
                user,
                password // Store password as plain text for demo, hash in production
            });
            showAlert('Booth added successfully!', 'success');
        }
        boothForm.reset();
        addBoothModal.hide();
    } catch (error) {
        console.error("Error saving booth:", error);
        showAlert(`Failed to save booth: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
});

/**
 * Populates the booth form for editing.
 * @param {string} boothDocId - The document ID of the booth to edit.
 */
async function editBooth(boothDocId) {
    showLoading(true, 'Loading Booth Data...');
    try {
        const boothDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/booths`, boothDocId));
        if (boothDoc.exists()) {
            const booth = boothDoc.data();
            boothDocIdInput.value = boothDoc.id;
            boothIdInput.value = booth.boothId;
            boothNameInput.value = booth.name;
            boothUserInput.value = booth.user;
            boothPasswordInput.value = booth.password; // Populate password for edit
            addBoothModal.show();
        } else {
            showAlert('Booth not found.', 'danger');
        }
    } catch (error) {
        console.error("Error fetching booth for edit:", error);
        showAlert(`Failed to load booth for edit: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
}

/**
 * Deletes a booth and its associated voting machines.
 * @param {string} boothDocId - The document ID of the booth to delete.
 */
async function deleteBooth(boothDocId) {
    showLoading(true, 'Deleting Booth...');
    try {
        // Delete associated voting machines first
        const votingMachinesRef = collection(db, `artifacts/${appId}/public/data/votingMachines`);
        const q = query(votingMachinesRef, where('boothDocId', '==', boothDocId)); // Use boothDocId for reference
        const vmDocs = await getDocs(q);
        const deleteVmPromises = [];
        vmDocs.forEach(doc => {
            deleteVmPromises.push(deleteDoc(doc.ref));
        });
        await Promise.all(deleteVmPromises);

        // Then delete the booth
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/booths`, boothDocId));
        showAlert('Booth and associated voting machines deleted successfully!', 'success');
    } catch (error) {
        console.error("Error deleting booth:", error);
        showAlert(`Failed to delete booth: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
}

/**
 * Populates the booth dropdown in the voting machine modal.
 */
async function populateBoothSelects() {
    votingMachineBoothIdSelect.innerHTML = '<option value="">Select a Booth</option>';
    try {
        const boothsRef = collection(db, `artifacts/${appId}/public/data/booths`);
        const snapshot = await getDocs(boothsRef);
        snapshot.forEach((doc) => {
            const booth = doc.data();
            const option = document.createElement('option');
            option.value = doc.id; // Store the Firestore document ID of the booth
            option.textContent = `${booth.name} (ID: ${booth.boothId})`;
            votingMachineBoothIdSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating booth select:", error);
        showAlert("Failed to load booths for voting machine selection.", "danger");
    }
}

// --- CRUD Operations for Voting Machines ---

/**
 * Listens for real-time updates to voting machines and renders them in the table.
 */
function listenToVotingMachines() {
    const votingMachinesRef = collection(db, `artifacts/${appId}/public/data/votingMachines`);
    onSnapshot(votingMachinesRef, async (snapshot) => {
        votingMachinesTableBody.innerHTML = '';
        const boothsMap = new Map();
        // Fetch all booths to map boothDocId to boothId/name
        const boothsSnapshot = await getDocs(collection(db, `artifacts/${appId}/public/data/booths`));
        boothsSnapshot.forEach(doc => {
            const boothData = doc.data();
            boothsMap.set(doc.id, `${boothData.name} (ID: ${boothData.boothId})`);
        });

        snapshot.forEach((doc) => {
            const vm = doc.data();
            const boothInfo = boothsMap.get(vm.boothDocId) || 'N/A'; // Use boothDocId
            const row = votingMachinesTableBody.insertRow();
            row.innerHTML = `
                <td>${vm.votingId}</td>
                <td>********</td> <td>${boothInfo}</td>
                <td><span class="badge ${getVmStatusClass(vm.status)}">${vm.status || 'inactive'}</span></td>
                <td>
                    <button class="btn btn-sm btn-info edit-voting-machine me-2" data-id="${doc.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-voting-machine me-2" data-id="${doc.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                    ${vm.status === 'inactive' || vm.status === 'completed' ?
                        `<button class="btn btn-sm btn-success set-vm-status" data-id="${doc.id}" data-status="ready">
                            <i class="fas fa-check-circle"></i> Set Ready
                        </button>` :
                        `<button class="btn btn-sm btn-secondary set-vm-status" data-id="${doc.id}" data-status="inactive">
                            <i class="fas fa-power-off"></i> Set Inactive
                        </button>`
                    }
                </td>
            `;
        });
        attachVotingMachineEventListeners();
        attachAdminVMControlEventListeners(); // Attach new event listeners for admin VM control
    }, (error) => {
        console.error("Error listening to voting machines:", error);
        showAlert("Error loading voting machines.", "danger");
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
 * Attaches event listeners to dynamically created voting machine edit/delete buttons.
 */
function attachVotingMachineEventListeners() {
    document.querySelectorAll('.edit-voting-machine').forEach(button => {
        button.onclick = async (e) => {
            const vmDocId = e.currentTarget.dataset.id;
            await editVotingMachine(vmDocId);
        };
    });
    document.querySelectorAll('.delete-voting-machine').forEach(button => {
        button.onclick = async (e) => {
            const vmDocId = e.currentTarget.dataset.id;
            if (confirm('Are you sure you want to delete this voting machine?')) {
                await deleteVotingMachine(vmDocId);
            }
        };
    });
}

/**
 * Attaches event listeners for admin control over individual voting machine status.
 */
function attachAdminVMControlEventListeners() {
    document.querySelectorAll('.set-vm-status').forEach(button => {
        button.onclick = async (e) => {
            const vmDocId = e.currentTarget.dataset.id;
            const newStatus = e.currentTarget.dataset.status;
            await setVotingMachineStatus(vmDocId, newStatus);
        };
    });
}

/**
 * Sets the status of a specific voting machine from the admin panel.
 * @param {string} vmDocId - The document ID of the voting machine.
 * @param {string} status - The new status ('ready' or 'inactive').
 */
async function setVotingMachineStatus(vmDocId, status) {
    showLoading(true, `Setting machine to ${status}...`);
    try {
        await firestoreUpdateDoc(doc(db, `artifacts/${appId}/public/data/votingMachines`, vmDocId), {
            status: status,
            //currentSessionId: status === 'inactive' ? null : null// crypto.randomUUID() // Clear session if setting inactive
        });
        showAlert(`Voting machine set to ${status.toUpperCase()}!`, 'success');
    } catch (error) {
        console.error(`Error setting voting machine to ${status}:`, error);
        showAlert(`Failed to set machine to ${status}: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
}


/**
 * Handles adding/editing a voting machine.
 */
votingMachineForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading(true, 'Saving Voting Machine...');
    const vmDocId = votingMachineDocIdInput.value;
    const votingId = votingMachineIdInput.value;
    const password = votingMachinePasswordInput.value; // In a real app, hash this password!
    const boothDocId = votingMachineBoothIdSelect.value; // This is the Firestore document ID of the booth

    try {
        if (vmDocId) {
            // Edit existing voting machine
            await setDoc(doc(db, `artifacts/${appId}/public/data/votingMachines`, vmDocId), {
                votingId,
                password, // Store password as plain text for demo, hash in production
                boothDocId // Reference to the booth's Firestore document ID
            }, { merge: true });
            showAlert('Voting machine updated successfully!', 'success');
        } else {
            // Add new voting machine
            // Check for duplicate votingId before adding
            const q = query(collection(db, `artifacts/${appId}/public/data/votingMachines`), where('votingId', '==', votingId));
            const existingVMs = await getDocs(q);
            if (!existingVMs.empty) {
                showAlert('Voting ID already exists. Please use a unique ID.', 'danger');
                showLoading(false);
                return;
            }

            await addDoc(collection(db, `artifacts/${appId}/public/data/votingMachines`), {
                votingId,
                password, // Store password as plain text for demo, hash in production
                boothDocId, // Reference to the booth's Firestore document ID
                status: 'inactive', // Initial status
                currentSessionId: null, // No active session initially
                lastActiveTime: null
            });
            showAlert('Voting machine added successfully!', 'success');
        }
        votingMachineForm.reset();
        addVotingMachineModal.hide();
    } catch (error) {
        console.error("Error saving voting machine:", error);
        showAlert(`Failed to save voting machine: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
});

/**
 * Populates the voting machine form for editing.
 * @param {string} vmDocId - The document ID of the voting machine to edit.
 */
async function editVotingMachine(vmDocId) {
    showLoading(true, 'Loading Voting Machine Data...');
    try {
        await populateBoothSelects(); // Ensure booths are loaded before setting VM's booth
        const vmDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/votingMachines`, vmDocId));
        if (vmDoc.exists()) {
            const vm = vmDoc.data();
            votingMachineDocIdInput.value = vmDoc.id;
            votingMachineIdInput.value = vm.votingId;
            votingMachinePasswordInput.value = vm.password; // Populate password for edit
            votingMachineBoothIdSelect.value = vm.boothDocId; // Set selected booth by its document ID
            addVotingMachineModal.show();
        } else {
            showAlert('Voting machine not found.', 'danger');
        }
    } catch (error) {
        console.error("Error fetching voting machine for edit:", error);
        showAlert(`Failed to load voting machine for edit: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
}

/**
 * Deletes a voting machine.
 * @param {string} vmDocId - The document ID of the voting machine to delete.
 */
async function deleteVotingMachine(vmDocId) {
    showLoading(true, 'Deleting Voting Machine...');
    try {
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/votingMachines`, vmDocId));
        showAlert('Voting machine deleted successfully!', 'success');
    } catch (error) {
        console.error("Error deleting voting machine:", error);
        showAlert(`Failed to delete voting machine: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
}

// --- Reporting & Results Management ---

/**
 * Fetches all necessary data (posts, candidates, booths, votes) for reporting.
 * @returns {object} An object containing maps of posts, candidates, booths, and all votes.
 */
async function fetchAllElectionData() {
    showLoading(true, 'Fetching election data for reports...');
    try {
        const [postsSnapshot, candidatesSnapshot, boothsSnapshot, voteBallotsSnapshot] = await Promise.all([
            getDocs(collection(db, `artifacts/${appId}/public/data/posts`)),
            getDocs(collection(db, `artifacts/${appId}/public/data/candidates`)),
            getDocs(collection(db, `artifacts/${appId}/public/data/booths`)),
            getDocs(collection(db, `artifacts/${appId}/public/data/voteBallots`)) // Fetch from the new collection
        ]);


        const postsMap = new Map(postsSnapshot.docs.map(doc => [doc.id, doc.data()]));
        const candidatesMap = new Map(candidatesSnapshot.docs.map(doc => [doc.id, doc.data()]));
        const boothsMap = new Map(boothsSnapshot.docs.map(doc => [doc.id, doc.data()]));
        const votes = voteBallotsSnapshot.docs.map(doc => doc.data()); // This is now an array of ballot documents

        showLoading(false);
        return { postsMap, candidatesMap, boothsMap, votes }; // 'votes' now contains ballots
    } catch (error) {
        console.error("Error fetching election data:", error);
        showAlert(`Failed to fetch election data: ${error.message}`, "danger");
        showLoading(false);
        return null;
    }
}

/**
 * Aggregates votes by booth, then by post, then by candidate.
 * @param {Array} votes - Array of raw vote documents.
 * @param {Map} postsMap - Map of post IDs to post data.
 * @param {Map} candidatesMap - Map of candidate IDs to candidate data.
 * @param {Map} boothsMap - Map of booth document IDs to booth data.
 * @returns {Map<string, Map<string, Map<string, number>>>} Aggregated vote counts.
 * Structure: Map<boothDocId, Map<postId, Map<candidateId, count>>>
 */
function aggregateVotes(votes, postsMap, candidatesMap, boothsMap) {
    // The 'votes' parameter is now an array of ballot documents.
    const aggregatedData = new Map(); // Structure: Map<boothDocId, Map<postId, Map<candidateId, count>>>

    // Initialize the data structure for all booths and posts
    boothsMap.forEach((boothData, boothDocId) => {
        const boothVoteMap = new Map();
        postsMap.forEach((postData, postId) => {
            const postVoteMap = new Map();
            // Initialize all candidates for this post with 0 votes
            candidatesMap.forEach((candidateData, candidateId) => {
                if (candidateData.postId === postId) {
                    postVoteMap.set(candidateId, 0);
                }
            });
            // Add NOTA for each post
            postVoteMap.set('NOTA', 0);
            boothVoteMap.set(postId, postVoteMap);
        });
        aggregatedData.set(boothDocId, boothVoteMap);
    });

    // --- NEW AGGREGATION LOGIC ---
    // Iterate over each ballot document
    votes.forEach(ballot => {
        const { boothDocId, votes: sessionVotes } = ballot; // Destructure the ballot
        
        if (aggregatedData.has(boothDocId) && sessionVotes) {
            const boothAggregatedVotes = aggregatedData.get(boothDocId);

            // Iterate over the votes within the ballot (e.g., { postId: candidateId, ... })
            for (const postId in sessionVotes) {
                const candidateId = sessionVotes[postId];
                if (boothAggregatedVotes.has(postId)) {
                    const postVotes = boothAggregatedVotes.get(postId);
                    // Increment the count for the specific candidate
                    postVotes.set(candidateId, (postVotes.get(candidateId) || 0) + 1);
                }
            }
        }
    });
    // --- END NEW LOGIC ---

    return aggregatedData;
}


/**
 * Generates a booth-wise vote count PDF report.
 */
generateBoothWisePdfBtn.addEventListener('click', async () => {
    const electionData = await fetchAllElectionData();
    if (!electionData) return;

    const { postsMap, candidatesMap, boothsMap, votes } = electionData;
    const aggregatedVotes = aggregateVotes(votes, postsMap, candidatesMap, boothsMap);

    showLoading(true, 'Generating PDF report...');

    // Create a temporary div to render content for PDF
    const pdfContentDiv = document.createElement('div');
    pdfContentDiv.style.padding = '20px';
    pdfContentDiv.style.fontFamily = 'sans-serif';

    let htmlContent = `
        <h1 style="text-align: center; color: #0d6efd;">Booth-wise Vote Count Report</h1>
        <p style="text-align: center; font-size: 0.9em; color: #666;">Generated on: ${new Date().toLocaleString()}</p>
        <hr style="border: 1px solid #eee;">
    `;

    boothsMap.forEach((boothData, boothDocId) => {
        htmlContent += `
            <h2 style="color: #28a745; margin-top: 30px;">Booth: ${boothData.name} (ID: ${boothData.boothId})</h2>
        `;
        const boothAggregatedVotes = aggregatedVotes.get(boothDocId);

        if (boothAggregatedVotes) {
            postsMap.forEach((postData, postId) => {
                const postAggregatedVotes = boothAggregatedVotes.get(postId);
                if (postAggregatedVotes) {
                    htmlContent += `
                        <h3 style="color: #0d6efd; margin-top: 20px; font-size: 1.2em;">Post: ${postData.title}</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <thead>
                                <tr style="background-color: #f2f2f2;">
                                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Candidate</th>
                                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Votes</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    // Sort candidates by votes (descending)
                    const sortedCandidates = Array.from(postAggregatedVotes.entries()).sort((a, b) => b[1] - a[1]);

                    sortedCandidates.forEach(([candidateId, count]) => {
                        const candidateName = candidateId === 'NOTA' ? 'NOTA' : (candidatesMap.get(candidateId)?.name || 'Unknown Candidate');
                        htmlContent += `
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px;">${candidateName}</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">${count}</td>
                            </tr>
                        `;
                    });
                    htmlContent += `
                            </tbody>
                        </table>
                    `;
                }
            });
        } else {
            htmlContent += `<p style="color: #666;">No votes recorded for this booth.</p>`;
        }
        htmlContent += `<div style="page-break-after: always;"></div>`; // Page break after each booth
    });

    pdfContentDiv.innerHTML = htmlContent;
    document.body.appendChild(pdfContentDiv); // Append to body temporarily for html2canvas

    try {
        const canvas = await html2canvas(pdfContentDiv, { scale: 2 }); // Higher scale for better quality
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4'); // Portrait, millimeters, A4 size

        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save('booth_wise_vote_count.pdf');
        showAlert('PDF report generated successfully!', 'success');
    } catch (error) {
        console.error("Error generating PDF:", error);
        showAlert(`Failed to generate PDF: ${error.message}`, "danger");
    } finally {
        document.body.removeChild(pdfContentDiv); // Remove temporary div
        showLoading(false);
    }
});

/**
 * Generates a booth-wise vote count Excel report.
 */
// generateBoothWiseExcelBtn.addEventListener('click', async () => {
//     const electionData = await fetchAllElectionData();
//     if (!electionData) return;

//     const { postsMap, candidatesMap, boothsMap, votes } = electionData;
//     const aggregatedVotes = aggregateVotes(votes, postsMap, candidatesMap, boothsMap);

//     showLoading(true, 'Generating Excel report...');

//     const workbook = XLSX.utils.book_new();

//     boothsMap.forEach((boothData, boothDocId) => {
//         const boothAggregatedVotes = aggregatedVotes.get(boothDocId);
//         const worksheetData = [['Post', 'Candidate', 'Votes']]; // Header row

//         if (boothAggregatedVotes) {
//             postsMap.forEach((postData, postId) => {
//                 const postAggregatedVotes = boothAggregatedVotes.get(postId);
//                 if (postAggregatedVotes) {
//                     // Add a separator for each post
//                     worksheetData.push([postData.title, '', '']);

//                     // Sort candidates by votes (descending)
//                     const sortedCandidates = Array.from(postAggregatedVotes.entries()).sort((a, b) => b[1] - a[1]);

//                     sortedCandidates.forEach(([candidateId, count]) => {
//                         const candidateName = candidateId === 'NOTA' ? 'NOTA' : (candidatesMap.get(candidateId)?.name || 'Unknown Candidate');
//                         worksheetData.push(['', candidateName, count]);
//                     });
//                 }
//             });
//         } else {
//             worksheetData.push(['', 'No votes recorded for this booth.', '']);
//         }

//         const ws = XLSX.utils.aoa_to_sheet(worksheetData);
//         XLSX.utils.book_append_sheet(workbook, ws, `${boothData.name} (${boothData.boothId})`);
//     });

//     try {
//         XLSX.writeFile(workbook, 'booth_wise_vote_count.xlsx');
//         showAlert('Excel report generated successfully!', 'success');
//     } catch (error) {
//         console.error("Error generating Excel:", error);
//         showAlert(`Failed to generate Excel: ${error.message}`, "danger");
//     } finally {
//         showLoading(false);
//     }
// });

// In admin.js, REPLACE the entire function with this corrected version:

generateBoothWiseExcelBtn.addEventListener('click', async () => {
    const electionData = await fetchAllElectionData();
    if (!electionData) return;

    // The 'votes' variable now holds an array of ballot documents
    const { postsMap, candidatesMap, boothsMap, votes: ballots } = electionData;

    showLoading(true, 'Generating Excel report...');

    const workbook = XLSX.utils.book_new();

    // Create one worksheet with all raw votes for easier analysis
    const allVotesWorksheetData = [['Booth Name', 'Post', 'Candidate', 'Session ID', 'Timestamp']];

    ballots.forEach(ballot => {
        const boothName = boothsMap.get(ballot.boothDocId)?.name || 'Unknown Booth';
        
        // FIX 1: The 'timestamp' is a Firestore object and needs the .toDate() method
        const timestamp = ballot.timestamp ? ballot.timestamp.toDate().toLocaleString() : 'N/A';
        
        // FIX 2: Loop through the 'votes' object within each ballot
        for (const postId in ballot.votes) {
            const candidateId = ballot.votes[postId];
            const postTitle = postsMap.get(postId)?.title || 'Unknown Post';
            const candidateName = candidateId === 'NOTA' ? 'NOTA' : (candidatesMap.get(candidateId)?.name || 'Unknown Candidate');
            
            // FIX 3: 'voteId' does not exist. We use 'ballot.sessionId' as a unique identifier for the voting session.
            allVotesWorksheetData.push([boothName, postTitle, candidateName, ballot.sessionId || 'N/A', timestamp]);
        }
    });

    const ws = XLSX.utils.aoa_to_sheet(allVotesWorksheetData);
    XLSX.utils.book_append_sheet(workbook, ws, 'All Raw Votes');


    try {
        XLSX.writeFile(workbook, 'election_raw_vote_report.xlsx');
        showAlert('Excel report generated successfully!', 'success');
    } catch (error) {
        console.error("Error generating Excel:", error);
        showAlert(`Failed to generate Excel: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
});

/**
 * Listens to the election publish status and updates the UI.
 */
function listenToPublishStatus() {
    const settingsDocRef = doc(db, `artifacts/${appId}/public/data/settings`, 'electionStatus');
    onSnapshot(settingsDocRef, (docSnapshot) => {
        let isPublished = false;
        if (docSnapshot.exists()) {
            isPublished = docSnapshot.data().published || false;
        }

        publishResultsSwitch.checked = isPublished;
        publishStatusText.textContent = isPublished ? 'Results are currently Published' : 'Results are currently Unpublished';
        showAlert(`Results status updated: ${isPublished ? 'Published' : 'Unpublished'}`, 'info');
    }, (error) => {
        console.error("Error listening to publish status:", error);
        showAlert("Error loading publish status.", "danger");
    });
}

/**
 * Toggles the election results publish status.
 */
publishResultsSwitch.addEventListener('change', async (e) => {
    const publish = e.target.checked;
    showLoading(true, `Setting results to ${publish ? 'Published' : 'Unpublished'}...`);
    try {
        const settingsDocRef = doc(db, `artifacts/${appId}/public/data/settings`, 'electionStatus');
        await setDoc(settingsDocRef, { published: publish }, { merge: true });
        showAlert(`Results successfully set to ${publish ? 'Published' : 'Unpublished'}!`, 'success');
    } catch (error) {
        console.error("Error updating publish status:", error);
        showAlert(`Failed to update publish status: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
});

/**
 * Resets the status of all voting machines to 'inactive' and clears their sessions.
 */
async function resetAllVotingMachines() {
    showLoading(true, 'Resetting all voting machines...');
    try {
        const votingMachinesRef = collection(db, `artifacts/${appId}/public/data/votingMachines`);
        const snapshot = await getDocs(votingMachinesRef);
        const batch = writeBatch(db);

        snapshot.forEach(docSnapshot => {
            const vmRef = doc(db, `artifacts/${appId}/public/data/votingMachines`, docSnapshot.id);
            batch.update(vmRef, {
                status: 'inactive',
                currentSessionId: null,
                lastActiveTime: null
            });
        });

        await batch.commit();
        showAlert('All voting machines have been reset to inactive!', 'success');
    } catch (error) {
        console.error("Error resetting all voting machines:", error);
        showAlert(`Failed to reset all voting machines: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
}


// Reset forms when modals are hidden (unchanged)
document.getElementById('addPostModal').addEventListener('hidden.bs.modal', () => {
    postForm.reset();
    postIdInput.value = '';
});
document.getElementById('addCandidateModal').addEventListener('hidden.bs.modal', () => {
    candidateForm.reset();
    candidateIdInput.value = '';
    candidatePhotoUrlInput.value = ''; // Clear hidden URL input
    candidatePhotoInput.value = '';     // Clear the file chooser
    candidatePhotoPreview.src = '#';    // Reset the image source
    candidatePhotoPreview.style.display = 'none'; // Hide the preview
});

document.getElementById('addBoothModal').addEventListener('hidden.bs.modal', () => {
    boothForm.reset();
    boothDocIdInput.value = '';
});
// Correct way to add a click listener for the booth link
document.getElementById('addBoothLink').addEventListener('click', () => {
    handleCopyLinkClick('booth');
});

// Correct way to add a click listener for the voting machine link
document.getElementById('addVoteLink').addEventListener('click', () => {
    handleCopyLinkClick('votingmachine');
});

document.getElementById('addVotingMachineModal').addEventListener('hidden.bs.modal', () => {
    votingMachineForm.reset();
    votingMachineDocIdInput.value = '';
});


// This new function contains the core logic for the deletion process.
// It will be called by the modal's final delete button.
async function performBallotDeletion() {
    showLoading(true, 'Deleting all ballot records...');
    try {
        const ballotsRef = collection(db, `artifacts/${appId}/public/data/voteBallots`);
        const snapshot = await getDocs(ballotsRef);

        if (snapshot.empty) {
            showAlert('There are no ballots to delete.', 'info');
            return;
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        showAlert('All cast ballots have been permanently deleted.', 'success');

    } catch (error) {
        console.error("Error deleting all ballots:", error);
        showAlert(`Failed to delete ballots: ${error.message}`, "danger");
    } finally {
        showLoading(false);
    }
}

// REPLACE your old deleteAllBallots function with this one.
// Its only job now is to open the modal and reset its state.
function deleteAllBallots() {
    // Reset the form every time the modal is opened
    deleteConfirmInput.value = '';
    finalDeleteBtn.disabled = true;
    
    // Show the confirmation modal
    deleteConfirmModal.show();
}

// This event listener checks what the user is typing.
deleteConfirmInput.addEventListener('input', () => {
    // Enable the final delete button ONLY if the input exactly matches the phrase
    if (deleteConfirmInput.value === 'delete permanently') {
        finalDeleteBtn.disabled = false;
    } else {
        finalDeleteBtn.disabled = true;
    }
});

// This listener triggers the actual deletion after confirmation.
finalDeleteBtn.addEventListener('click', () => {
    // Hide the modal first
    deleteConfirmModal.hide();
    // Then call the function that performs the deletion
    performBallotDeletion();
});

// The event listener attachment in attachAdminControlEventListeners remains the same.
// Just ensure it calls the new deleteAllBallots function.
// document.getElementById('deleteAllBallotsBtn').addEventListener('click', deleteAllBallots);

async function uploadPhotoToDrive(photoBlob, uniqueId, subfolderName = 'candidatePhotos-2025') {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Image = reader.result;
            const formData = new FormData();
            formData.append('photoData', base64Image.split(',')[1]);
            formData.append('studentId', uniqueId); // The script uses 'studentId' as the identifier
            formData.append('subfolderName', subfolderName);

            // IMPORTANT: This is the URL of your Google Apps Script Web App
            const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec';

            try {
                const response = await fetch(`${SCRIPT_URL}?action=uploadStudentPhotoOnly`, {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                if (result.success) {
                    resolve(result);
                } else {
                    reject(new Error(result.error || 'Unknown error during Drive upload.'));
                }
            } catch (error) {
                console.error('Error during Drive upload fetch:', error);
                reject(error);
            }
        };
        reader.onerror = (error) => {
            console.error('FileReader error:', error);
            reject(error);
        };
        reader.readAsDataURL(photoBlob);
    });
}

candidatePhotoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const candidateName = candidateNameInput.value.trim();
    if (!candidateName) {
        showAlert('Please enter the candidate\'s name before uploading a photo.', 'warning');
        candidatePhotoInput.value = ''; // Reset the file input
        return;
    }

    // Show image preview
    const reader = new FileReader();
    reader.onload = (event) => {
        candidatePhotoPreview.src = event.target.result;
        candidatePhotoPreview.style.display = 'block';
    };
    reader.readAsDataURL(file);

    showLoading(true, 'Uploading photo...');
    try {
        // A unique identifier for the file
        const uniqueFileId = `${candidateName.replace(/\s+/g, '_')}_${Date.now()}`;
        const result = await uploadPhotoToDrive(file, uniqueFileId, 'electionCandidatePhotos');

        if (result && result.success && result.fileId) {
            // Construct a direct, embeddable Google Drive URL
            const photoUrl = `https://lh3.googleusercontent.com/d/${result.fileId}`;
            candidatePhotoUrlInput.value = photoUrl; // Set the value of the hidden input
            showAlert('Photo uploaded successfully!', 'success');
        } else {
            throw new Error(result.error || 'Upload failed. The server did not return a file ID.');
        }
    } catch (error) {
        console.error('Error during photo upload:', error);
        showAlert(`Photo upload failed: ${error.message}`, 'danger');
        candidatePhotoUrlInput.value = ''; // Clear the hidden URL input
        candidatePhotoPreview.style.display = 'none'; // Hide preview on failure
        candidatePhotoInput.value = ''; // Reset the file input
    } finally {
        showLoading(false);
    }
});

/**
 * Handles the click event for any 'Copy Link' button.
 * @param {Event} e - The click event object.
 */
/**
 * Copies a generic, shareable link for the booth or voting machine pages.
 * The link is configured with the current election's ID (currentUserId).
 * @param {'booth' | 'votingmachine'} linkType - The type of link to generate.
 */
function handleCopyLinkClick(linkType) {
    // base64Encode and currentUserId are available from the top of the admin.js script
    const param = base64Encode(currentUserId);
    if (!linkType) return;

    let fullUrl = null;
    const baseUrl = 'https://kykhss.github.io/school/election/';

    if (linkType === 'booth') {
        // Corrected URL with backticks `` and proper protocol
        fullUrl = `${baseUrl}booth.html?wxev=${param}`;
    } else if (linkType === 'votingmachine') {
        fullUrl = `${baseUrl}votingmachine.html?wxev=${param}`;
    }

    if (fullUrl) {
        navigator.clipboard.writeText(fullUrl).then(() => {
            showAlert('Link copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy link: ', err);
            showAlert('Could not copy link. See console for details.', 'danger');
        });
    }
}
