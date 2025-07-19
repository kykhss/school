import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot, collection, query, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
            const decoded = base64Decode(dataParam);
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

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.querySelector('#loadingOverlay .loading-text');
const alertContainer = document.getElementById('alertContainer');

const resultsNotPublishedView = document.getElementById('resultsNotPublished');
const electionResultsContent = document.getElementById('electionResultsContent');
const totalVotesCountSpan = document.getElementById('totalVotesCount');
const lastUpdatedTimeSpan = document.getElementById('lastUpdatedTime');
const postsResultsContainer = document.getElementById('postsResultsContainer');
const boothProgressContent = document.getElementById('boothProgressContent'); // *** NEW ***

// *** NEW: Header DOM Elements ***
const emblemImage = document.getElementById('emblemImage');
const electionNameHeader = document.getElementById('electionNameHeader');
const institutionNameHeader = document.getElementById('institutionNameHeader');

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

// *** NEW: Fetch and display election details ***
async function displayElectionDetails() {
    try {
        const settingsDocRef = doc(db, `artifacts/${appId}/public/data/settings`, 'electionDetails');
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            const settings = docSnap.data();
            if (settings.institutionName) {
                institutionNameHeader.textContent = settings.institutionName;
            }
            if (settings.electionName) {
                electionNameHeader.textContent = settings.electionName;
            }
            if (settings.emblemUrl) {
                emblemImage.src = settings.emblemUrl;
            }
        }
    } catch (error) {
        console.error("Could not fetch election details:", error);
    }
}


// --- Firebase Initialization and Authentication ---

window.onload = async function() {
    showLoading(true, 'Initializing Firebase...');
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        await displayElectionDetails(); // *** NEW: Load details on page start ***

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
            } else {
                userId = 'Not Authenticated';
            }
            // Start listening to the publish status immediately
            listenToPublishStatus();
            listenForVotingProgress(); // MODIFIED: Renamed from listenForLiveResults
            showLoading(false);
        });

        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

    } catch (error) {
        console.error("Error initializing Firebase:", error);
        showAlert("Failed to initialize Firebase. Check console for details.", "danger");
        showLoading(false);
    }
};

/**
 * Listens to the election publish status and updates the view accordingly.
 */
function listenToPublishStatus() {
    const settingsDocRef = doc(db, `artifacts/${appId}/public/data/settings`, 'electionStatus');
    onSnapshot(settingsDocRef, (docSnapshot) => {
        let isPublished = false;
        if (docSnapshot.exists()) {
            isPublished = docSnapshot.data().published || false;
        }

        if (isPublished) {
            resultsNotPublishedView.style.display = 'none';
            electionResultsContent.style.display = 'block';
            fetchAndRenderResults(); // Fetch and display results when published
        } else {
            resultsNotPublishedView.style.display = 'block';
            electionResultsContent.style.display = 'none';
            postsResultsContainer.innerHTML = ''; // Clear previous results
            totalVotesCountSpan.textContent = '0';
            lastUpdatedTimeSpan.textContent = 'N/A';
        }
    }, (error) => {
        console.error("Error listening to publish status:", error);
        showAlert("Error loading publish status.", "danger");
        resultsNotPublishedView.style.display = 'block';
        electionResultsContent.style.display = 'none';
    });
}

/**
 * Fetches all necessary data (posts, candidates, votes) for displaying results.
 * @returns {object} An object containing maps of posts, candidates, and all votes.
 */
async function fetchAllElectionDataForResults() {
    showLoading(true, 'Fetching election results data...');
    try {
        const [postsSnapshot, candidatesSnapshot, votesSnapshot] = await Promise.all([
            getDocs(query(collection(db, `artifacts/${appId}/public/data/posts`), orderBy('order', 'asc'))),
            getDocs(collection(db, `artifacts/${appId}/public/data/candidates`)),
            getDocs(collection(db, `artifacts/${appId}/public/data/voteBallots`))
        ]);

        const postsMap = new Map(postsSnapshot.docs.map(doc => [doc.id, doc.data()]));
        const candidatesMap = new Map(candidatesSnapshot.docs.map(doc => [doc.id, doc.data()]));
        const votes = votesSnapshot.docs.map(doc => doc.data());

        showLoading(false);
        return { postsMap, candidatesMap, votes };
    } catch (error) {
        console.error("Error fetching election data for results:", error);
        showAlert(`Failed to fetch election data: ${error.message}`, "danger");
        showLoading(false);
        return null;
    }
}

/**
 * Aggregates votes by post, then by candidate.
 * @param {Array} votes - Array of raw vote documents.
 * @param {Map} postsMap - Map of post IDs to post data.
 * @param {Map} candidatesMap - Map of candidate IDs to candidate data.
 * @returns {Map<string, Map<string, number>>} Aggregated vote counts.
 * Structure: Map<postId, Map<candidateId, count>>
 */
function aggregateOverallVotes(ballots, postsMap, candidatesMap) {
    const aggregatedData = new Map();

    // 1. Initialize the data structure for all posts and candidates with 0 votes
    postsMap.forEach((postData, postId) => {
        const postVoteMap = new Map();
        candidatesMap.forEach((candidateData, candidateId) => {
            if (candidateData.postId === postId) {
                postVoteMap.set(candidateId, 0);
            }
        });
        postVoteMap.set('NOTA', 0); // Add NOTA for each post
        aggregatedData.set(postId, postVoteMap);
    });

    // 2. Process each ballot document
    ballots.forEach(ballot => {
        // **CORRECTION START**
        // Get the nested 'votes' object from the ballot document
        const sessionVotes = ballot.votes;

        // Check if the nested object exists
        if (sessionVotes) {
            // Loop through the key-value pairs inside the nested object
            // The key is the postId, and the value is the candidateId
            for (const postId in sessionVotes) {
                const candidateId = sessionVotes[postId];

                // Now, with the correct postId and candidateId, update the count
                if (aggregatedData.has(postId)) {
                    const postVotes = aggregatedData.get(postId);
                    postVotes.set(candidateId, (postVotes.get(candidateId) || 0) + 1);
                }
            }
        }
        // **CORRECTION END**
    });

    return aggregatedData;
}

/**
 * Fetches and renders the election results.
 */
async function fetchAndRenderResults() {
    const electionData = await fetchAllElectionDataForResults();
    if (!electionData) {
        postsResultsContainer.innerHTML = '<div class="text-center text-muted mt-5">Failed to load election results.</div>';
        return;
    }

    const { postsMap, candidatesMap, votes } = electionData;
    const aggregatedResults = aggregateOverallVotes(votes, postsMap, candidatesMap);

    let totalVotes = 0;
    votes.forEach(() =>  totalVotes++);
    totalVotesCountSpan.textContent = totalVotes;
    lastUpdatedTimeSpan.textContent = new Date().toLocaleString();

    postsResultsContainer.innerHTML = ''; // Clear previous results

    postsMap.forEach((postData, postId) => {
        const postAggregatedVotes = aggregatedResults.get(postId);
        if (!postAggregatedVotes) return;

        const postCard = document.createElement('div');
        postCard.className = 'card post-results-card';
        postCard.innerHTML = `
            <div class="card-header">
                ${postData.title}
            </div>
            <div class="card-body">
                </div>
        `;
        const cardBody = postCard.querySelector('.card-body');

        // Convert map to array for sorting
        const candidateResults = Array.from(postAggregatedVotes.entries()).map(([candidateId, count]) => {
            const candidateName = candidateId === 'NOTA' ? 'NOTA' : (candidatesMap.get(candidateId)?.name || 'Unknown Candidate');
            const photoUrl = candidateId === 'NOTA' ? '' : (candidatesMap.get(candidateId)?.photoUrl || 'https://placehold.co/60x60/cccccc/333333?text=N/A');
            return { id: candidateId, name: candidateName, photoUrl: photoUrl, votes: count };
        });

        // Sort candidates by votes in descending order
        candidateResults.sort((a, b) => b.votes - a.votes);

        let maxVotes = -1;
        if (candidateResults.length > 0) {
            maxVotes = candidateResults[0].votes;
        }

        candidateResults.forEach(result => {
            const isWinner = result.votes === maxVotes && result.votes > 0 && result.id !== 'NOTA'; // NOTA cannot be a winner
            const candidateRow = document.createElement('div');
            candidateRow.className = 'candidate-row';
            candidateRow.innerHTML = `
                ${result.id !== 'NOTA' ? `<img src="${result.photoUrl}" alt="${result.name}" class="candidate-photo" onerror="this.onerror=null;this.src='https://placehold.co/60x60/cccccc/333333?text=N/A';">` : `<i class="fas fa-ban fa-2x text-muted me-3" style="width: 60px; text-align: center;"></i>`}
                <span class="candidate-name">${result.name}</span>
                <span class="vote-count">${result.votes} Votes</span>
                ${isWinner ? '<span class="winner-badge"><i class="fas fa-trophy"></i> Winner</span>' : ''}
            `;
            cardBody.appendChild(candidateRow);
        });

        if (candidateResults.length === 0) {
            cardBody.innerHTML = '<p class="text-center text-muted">No votes recorded for this post yet.</p>';
        }

        postsResultsContainer.appendChild(postCard);
    });
}


/**
 * Sets up a real-time listener on the vote ballots to update progress.
 */
function listenForVotingProgress() {
    const voteBallotsCollectionRef = collection(db, `artifacts/${appId}/public/data/voteBallots`);

    onSnapshot(voteBallotsCollectionRef, async (snapshot) => {
        showLoading(true, 'Updating voter turnout...');
        const votes = snapshot.docs.map(doc => doc.data());
        await renderBoothProgress(votes);
        showLoading(false);
    }, (error) => {
        console.error("Error listening to vote ballots:", error);
        showAlert("Could not load live voting progress.", "danger");
        showLoading(false);
    });
}

/**
 * Fetches booth data (name and max voters) from Firestore.
 * @returns {Promise<Object|null>} An object containing data for all booths.
 */
async function fetchBoothData() {
    try {
        const boothsCollectionRef = collection(db, `artifacts/${appId}/public/data/booths`);
        const querySnapshot = await getDocs(boothsCollectionRef);

        if (querySnapshot.empty) {
            console.warn("The 'booths' collection is empty or does not exist!");
            showAlert("Booth configuration is missing.", "warning");
            return null;
        }

        const boothsData = {};
        querySnapshot.forEach(doc => {
            boothsData[doc.id] = doc.data();
        });
        
        return boothsData;

    } catch (error) {
        console.error("Error fetching booth data:", error);
        showAlert("Failed to fetch booth configuration.", "danger");
        return null;
    }
}
/**
 * Renders the progress of voting for each booth based on maxVoters.
 * @param {Array} votes - An array of all vote ballot documents.
 */
async function renderBoothProgress(votes) {
    const boothData = await fetchBoothData();

    if (!boothData || !boothProgressContent) {
        if (boothProgressContent) {
            boothProgressContent.innerHTML = '<p class="text-center text-muted">Booth information is not available.</p>';
        }
        return;
    }
    
    const boothVoteCounts = {};
    for (const boothDocId in boothData) {
        boothVoteCounts[boothDocId] = 0;
    }

    votes.forEach(vote => {
        const voteBoothId = vote.boothDocId;
        if (voteBoothId && boothVoteCounts.hasOwnProperty(voteBoothId)) {
            boothVoteCounts[voteBoothId]++;
        }
    });
    
    boothProgressContent.innerHTML = '';

    for (const boothDocId in boothData) {
        const booth = boothData[boothDocId];
        const currentVotes = boothVoteCounts[boothDocId] || 0;
        const maxVoters = booth.maxVoters || 0;
        const progressPercentage = maxVoters > 0 ? ((currentVotes / maxVoters) * 100).toFixed(1) : 0;

        const progressElement = document.createElement('div');
        progressElement.className = 'booth-progress-item mb-4';
        progressElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="booth-name fw-bold fs-5">${booth.name || boothDocId}</span>
                <span class="booth-stats text-muted fw-bold">${currentVotes} / ${maxVoters} Voted</span>
            </div>
            <div class="progress" style="height: 25px; font-size: 1rem;">
                <div class="progress-bar bg-success progress-bar-striped progress-bar-animated" role="progressbar" style="width: ${progressPercentage}%;" aria-valuenow="${progressPercentage}" aria-valuemin="0" aria-valuemax="100">
                    ${progressPercentage}%
                </div>
            </div>
        `;
        boothProgressContent.appendChild(progressElement);
    }
}
