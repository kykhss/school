
function updateLastUsedTime() {
    localStorage.setItem("lastUsedTime", new Date().getTime());
}

function getAcademicYear() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // January is 0, December is 11

    let academicYear;
    if (currentMonth < 4) { // Before May (April is 3, so 4 means May)
        academicYear = (currentYear - 1) + '-' + String(currentYear).slice(-2);
    } else { // May or later
        academicYear = currentYear + '-' + String(currentYear + 1).slice(-2);
    }

    return academicYear;
}
function showSuccess(message, duration = 3000) {
    const alertBox = document.getElementById("successAlert");
    const successMessage = document.getElementById("successMessage");
  
    successMessage.textContent = message;
    alertBox.style.display = "block";
  
    alertBox.classList.add("show");
    alertBox.classList.add("fade");
  
    // Hide the alert after `duration` milliseconds
    setTimeout(() => {
      alertBox.classList.remove("show");
      setTimeout(() => {
        alertBox.style.display = "none";
      }, 150); // wait for fade out
    }, duration);
  }
  
  function showWaiting() {
    // --- Existing element creation ---
    const loaderContainer = document.createElement('div');
    const loader = document.createElement('div');
    const loadingElement = document.createElement('div'); // Renamed variable
    const timerElement = document.createElement("p");
  
    // Add a unique ID for easier selection
    loaderContainer.id = "unique-loader-container";
    loaderContainer.className = "container"; // Keep class if needed for styling
    loader.className = "loader-container";   // Correct class name
    loadingElement.className = "loader";     // Correct class name
    timerElement.className = "timer";
  
    // Check if a loader already exists and remove it first
    const existingLoader = document.getElementById("unique-loader-container");
    if (existingLoader) {
        // Get timer/timeout IDs from existing loader if they were stored
        const existingTimerId = existingLoader.dataset.timer;
        const existingTimeoutId = existingLoader.dataset.timeout;
        if (existingTimerId) {
            clearInterval(parseInt(existingTimerId));
        }
        if (existingTimeoutId) {
            clearTimeout(parseInt(existingTimeoutId));
        }
        existingLoader.remove(); // Remove the old one completely
    }
  
    // --- Append new elements ---
    var divs = document.getElementById("loaderDiv");
    divs.style.display="block";
    divs.appendChild(loaderContainer);
    loaderContainer.appendChild(loader);
    loader.appendChild(loadingElement);
    loader.appendChild(timerElement);
    loaderContainer.style.display = "block"; // Make visible after adding to DOM
  
    // --- Timer logic ---
    let seconds = 0;
    timerElement.textContent = `Elapsed Time: ${seconds}s`;
  
    const timerId = setInterval(() => {
        seconds++;
        // Check if timerElement still exists before updating
        if (document.contains(timerElement)) {
             timerElement.textContent = `Elapsed Time: ${seconds}s`;
        } else {
            // If element is gone, stop the timer
            clearInterval(timerId);
        }
    }, 1000);
  
    // Store timer ID
    loaderContainer.dataset.timer = timerId.toString();
  
    // --- Auto-hide logic ---
    const timeoutId = setTimeout(() => {
        // Check if the container still exists before trying to remove
        const currentLoader = document.getElementById("unique-loader-container");
        if (currentLoader) {
            clearInterval(timerId); // Clear interval explicitly
            currentLoader.style.transition = 'opacity 0.5s ease-out';
            currentLoader.style.opacity = '0';
            // Use another timeout to remove after transition
            setTimeout(() => currentLoader.remove(), 500);
        }
    }, 30000); // 30 seconds
  
    // Store timeout ID
    loaderContainer.dataset.timeout = timeoutId.toString();
  }
  
//showWaiting();
function hideWaitingyy() {
   // alert("success","loaderDone");
    var divs = document.getElementById("loaderDiv");
    divs.style.display="none";
  // Find the loader by its unique ID
  const loaderContainer = document.getElementById("unique-loader-container");

  if (!loaderContainer) {
     // Optionally call showAlert("Loader not found", "warning");
     console.log("Loader not found to hide.");
     return;
  }

  // Remove the element from the DOM
  loaderContainer.remove();
  console.log("Loader removed by hideWaiting.");
  // Optionally call showAlert("Loading hidden.", "info");
}

function hideWaiting() {
    var divs = document.getElementById("loaderDiv");
    
  // Find the loader by its unique ID
  const loaderContainer = document.getElementById("unique-loader-container");

  if (!loaderContainer) {
     // Optionally call showAlert("Loader not found", "warning");
     console.log("Loader not found to hide.");
     return;
  }

  // Get timer and timeout IDs from dataset
  const timerId = loaderContainer.dataset.timer;
  const timeoutId = loaderContainer.dataset.timeout;

  // Clear the interval timer
  if (timerId) {
      clearInterval(parseInt(timerId));
      console.log("Cleared interval:", timerId);
  }

  // Clear the auto-hide timeout
  if (timeoutId) {
      clearTimeout(parseInt(timeoutId));
      console.log("Cleared timeout:", timeoutId);
  }

  // Remove the element from the DOM
  loaderContainer.remove();
  divs.style.display="none";
  console.log("Loader removed by hideWaiting.");
  // Optionally call showAlert("Loading hidden.", "info");
}

// Example usage:
// showWaiting();
// setTimeout(hideWaiting, 5000); // Example: hide manually after 5 seconds

  function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`; // Use CSS classes for styling
    alertDiv.textContent = message;
    alertDiv.setAttribute('role', 'alert'); // Accessibility

    document.body.appendChild(alertDiv);

    // Automatically remove the alert after a delay
    setTimeout(() => {
         // Add a fade-out effect (optional)
         alertDiv.style.transition = 'opacity 0.5s ease-out';
         alertDiv.style.opacity = '0';
         setTimeout(() => alertDiv.remove(), 500); // Remove after fade out
    }, 4000); // Increased duration
}
