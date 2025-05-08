
// Function to show the success message
function showSuccessMessage(message) {
  document.getElementById("successAlert").innerHTML = 
    `<span class="closebtn" onclick="this.parentElement.style.display='none';">&times;</span> 
    <strong>Success!</strong> ${message}`; 
  document.getElementById("successAlert").style.display = "block";
  setTimeout(function(){ 
    document.getElementById("successAlert").style.display = "none"; 
  }, 15000); // 15 seconds timeout
}

// Function to show the error message
function showErrorMessage(message) {
  document.getElementById("errorAlert").innerHTML = 
    `<span class="closebtn" onclick="this.parentElement.style.display='none';">&times;</span> 
    <strong>Error!</strong> ${message}`;
  document.getElementById("errorAlert").style.display = "block";
  setTimeout(function(){ 
    document.getElementById("errorAlert").style.display = "none"; 
  }, 15000); // 15 seconds timeout
}

// Function to show the confirmation message
// Function to show the confirmation message
function showConfirmationMessage(message) {
  return new Promise(resolve => {
    const confirmationMessageEl = document.getElementById("confirmationMessage");
    const confirmationAlertEl = document.getElementById("confirmationAlert");

    // Set the message and make the alert visible
    confirmationMessageEl.textContent = message;
    confirmationAlertEl.style.display = "block";

    // Add event listeners for buttons
    const okButton = document.querySelector('.confirmation-button-ok');
    const cancelButton = document.querySelector('.confirmation-button-cancel');

    // OK button click handler
    const onOkClick = () => {
      confirmationAlertEl.style.display = "none"; // Hide the alert
      cleanup(); // Cleanup event listeners
      resolve(true); // Resolve promise with true
    };

    // Cancel button click handler
    const onCancelClick = () => {
      confirmationAlertEl.style.display = "none"; // Hide the alert
      cleanup(); // Cleanup event listeners
      resolve(false); // Resolve promise with false
    };

    // Cleanup function to remove event listeners
    const cleanup = () => {
      okButton.removeEventListener("click", onOkClick);
      cancelButton.removeEventListener("click", onCancelClick);
    };

    okButton.addEventListener("click", onOkClick);
    cancelButton.addEventListener("click", onCancelClick);
  });
}
    function updateLastUsedTime() {
    localStorage.setItem("lastUsedTime", new Date().getTime());
}

// Example usage
// document.addEventListener("DOMContentLoaded", () => {
//   document.getElementById("testButton").addEventListener("click", async () => {
//     const result = await showConfirmationMessage("Are you sure you want to proceed?");
//     if (result) {
//       showSuccessMessage("Confirmed!");
//     } else {
//       showErrorMessage("Cancelled!");
//     }
//   });
// });

// }showConfirmationMessage("Are you sure you want to proceed?")
//   .then(result => {
//     if (result) {
//       // User clicked "OK"
//       showSuccessMessage("User confirmed."); 
//       // Perform the action
//     } else {
//       // User clicked "Cancel"
//       showErrorMessage("User canceled.");
//     }
//   });


//<script>
      //  showLoader();
        let photoFile2 =[];
        function showLoader() {
            const loader = document.getElementById('loading');
            loader.style.display = 'flex';
            loader.style.animation = 'fadeIn 0.3s forwards'; // Smooth fade-in
        }
    
        function hideLoader() {
            const loader = document.getElementById('loading');
            loader.style.animation = 'fadeOut 0.3s forwards'; // Smooth fade-out
            setTimeout(() => { loader.style.display = 'none'; }, 300); // Hide after fade-out
        }
       // document.getElementById("pageHead").textContent = ""; 
   // </script>

 //  <script type="text/javascript">
      //  Reset form and clear image preview
  
 function resetForm() {
    // // Clear selected radio buttons
    // document.querySelectorAll('input[type="radio"]').forEach(radio => {
    //     radio.checked = false;
    // });
    
    // Enable all radio buttons
    document.getElementsByName("sector").forEach(radio => radio.disabled = false );
    document.getElementsByName("vehicleNeed").forEach(radio => radio.disabled = false);
    document.getElementsByName("hasSibling").forEach(radio => radio.disabled = false);

    
}
        function datetoText(value){
           var text=  convertDateToText(value);
           var age =calculateAge(value);
            document.getElementById("ageResult").textContent = text;
            document.getElementById("referenceDate").textContent = age
        }
    //</script>
    let storageSize = "";
function onload(){
    showSuccessMessage(`LocalStorage Used: ${storageSize.megabytes} MB)`)
console.log(`LocalStorage Used: ${storageSize.bytes} Bytes (${storageSize.kilobytes} KB, ${storageSize.megabytes} MB)`);

     storageSize = getLocalStorageSize();
    window.onload = function() {
    
        // Update last used time on user activity
        document.addEventListener("mousemove", updateLastUsedTime);
        document.addEventListener("keydown", updateLastUsedTime);
        document.addEventListener("click", updateLastUsedTime);
        document.getElementById('addStudentForm').addEventListener('reset', function() {
            document.getElementById('cropImage').src = '';
            document.getElementById('cropImage').style.display = 'none';
            document.getElementById('student-photo').src = '';
            document.getElementById('student-photo-container').style.display = 'none';
           // document.getElementById('crop-btn').style.display = 'none';
            document.getElementById('error-message').textContent = '';
            resetForm();
         });
        
          generateTable();
        };
                setInterval(checkForUpdates, 60000); // Check every 5 seconds
        

  window.onload = function() {
    document.querySelectorAll("input[type='text']").forEach((input) => {
        input.addEventListener("input", formatInput);
    });
    // Update guardian fields if Father’s or Mother’s name/mobile is edited
    document.getElementById("fatherName").addEventListener("input", () => {
        if (document.querySelector('input[name="guardianOption"]:checked')?.value === "father") {
            setGuardian();
        }
    });

    document.getElementById("fatherMobile").addEventListener("input", () => {
        if (document.querySelector('input[name="guardianOption"]:checked')?.value === "father") {
            setGuardian();
        }
    });

    document.getElementById("motherName").addEventListener("input", () => {
        if (document.querySelector('input[name="guardianOption"]:checked')?.value === "mother") {
            setGuardian();
        }
    });

    document.getElementById("motherMobile").addEventListener("input", () => {
        if (document.querySelector('input[name="guardianOption"]:checked')?.value === "mother") {
            setGuardian();
        }
    });
//</script>
    const adharCheckbox = document.getElementById('adharCheckbox');
    const adharNumber = document.getElementById('adharNumber');
    
    adharCheckbox.addEventListener('change', () => {
      adharNumber.disabled = !adharCheckbox.checked;
      adharNumber.required = !adharCheckbox.checked;
      adharNumber.value = ''; // Clear the field when disabled
    });
    
    // Code to hide the loader after the page has fully loaded
    var loader = document.querySelector('.loader');
    loader.style.display = 'none';
    let loggedStatus = localStorage.getItem("logged")||"empty";
    let loginTime = localStorage.getItem("lastUsedTime");
console.log(loggedStatus);
    // Check if logged in
    if (loggedStatus !== "success" || !loginTime|| !loggedStatus) {
        window.location.href = "index.html";
        return;
    }

    let currentTime = new Date().getTime();
    let timeDiff = (currentTime - parseInt(loginTime)) / (1000 * 60); // Convert to minutes

    if (timeDiff > 30) {
        localStorage.removeItem("logged"); // Clear login status
        localStorage.removeItem("loginTime"); // Clear login time
        window.location.href = "index.html"; // Redirect to login
    }
  }
}
  function waitingOn(){
    var loader = document.querySelector('.loader');
    loader.style.display = 'block';
  }

  function waitingOff(){
    var loader = document.querySelector('.loader');
    loader.style.display = 'none';
  }
  function logout() {
    localStorage.removeItem("logged"); // Clear login status
    localStorage.removeItem("lastUsedTime"); // Clear last activity time
    window.location.href = "index.html"; // Redirect to login page
}

//<script>
  
//</script>

//<script>
function setDefaultSelections(admitted) {
    const [admittedClass, division] = admitted.split(' ');
    console.log(admittedClass+"---"+division);
        //alert(division);
    // Set the class dropdown to the admitted class
    const classSelect = document.getElementById("classSelect");
    for (let option of classSelect.options) {
        if (option.value === admittedClass) {
            option.selected = true;
            break;
        }
    }

    // Set the division dropdown to the admitted division
    const divisionSelect = document.getElementById("divisionSelect");
    for (let option of divisionSelect.options) {
        if (option.value === division) {
            option.selected = true;
            break;
        }
    }
}

// Function to populate class options based on the selected sector
function populateClassOptions(sector) {
    //showLoader();
//const sector ="KG";// document.querySelector('input[name="sector"]:checked').value;
const classSelect = document.getElementById('classSelect');
classSelect.innerHTML = ''; // Clear previous options

// Add a default first option with an empty value
const defaultOption = document.createElement('option');
defaultOption.value = ''; // Empty value
defaultOption.textContent = 'Select Class';
defaultOption.disabled = true; // Make it unselectable
defaultOption.selected = true; // Set as default selected
classSelect.appendChild(defaultOption);

if (sector === 'School') {
// School options from 1 to 10
for (let i = 1; i <= 10; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    classSelect.appendChild(option);
}
} else if (sector === 'KG') {
// KG options LKG and UKG
const kgOptions = ['LKG', 'UKG'];
kgOptions.forEach(kgClass => {
    const option = document.createElement('option');
    option.value = kgClass;
    option.textContent = kgClass;
    classSelect.appendChild(option);
});
}

// Populate divisions after class options are updated
populateDivisionOptions(sector);
//updateAdmittedClass();
// hideLoader();
}

// Function to populate division options A to E
function populateDivisionOptions(sector) {
    const divisionSelect = document.getElementById('divisionSelect');
    divisionSelect.innerHTML = ''; // Clear previous options

        // Add a default first option with an empty value
const defaultOption = document.createElement('option');
defaultOption.value = ''; // Empty value
defaultOption.textContent = 'Select division';
//defaultOption.disabled = true; // Make it unselectable
defaultOption.selected = true; // Set as default selected
divisionSelect.appendChild(defaultOption);

    ['A', 'B', 'C', 'D', 'E'].forEach(division => {
        const option = document.createElement('option');
        option.value = division;
        option.textContent = division;
        divisionSelect.appendChild(option);
    });
    updateAdmittedClass();
}


//</script>


//<script>
      function updateAdmittedClass() {
        const classValue = document.getElementById('classSelect').value;
        const divisionValue = document.getElementById('divisionSelect').value;
        const admittedClassField = document.getElementById('admittedClass');
        const curruntClassField = document.getElementById('currentClass');
        getClassDivisionGenderCount(classValue);
        // Display the combined value of class and division in admittedClass
        admittedClassField.value = (classValue && divisionValue) ? `${classValue} ${divisionValue}` : '';
        curruntClassField.value = (classValue && divisionValue) ? `${classValue} ${divisionValue}` : '';
    }
    async function getClassDivisionGenderCount(classValue) {
        document.getElementById('currentStrength').textContent = 'loading..... class strength';
       // document.getElementById('currentStrength').textContent = '';
       
    // Retrieve selected class, division, and current year
    const selectedClass = document.getElementById('classSelect').value;
    const selectedDivision = document.getElementById('divisionSelect').value;
    const curruntyear = new Date().getFullYear(); // Replace with actual value if dynamic

    // Ensure both class and division are selected
    if (!selectedClass) {
        document.getElementById('currentStrength').textContent = 'Please select both class';
        return;
    }

    try {
        // Fetch data from Google Apps Script API with class, division, and year as parameters
        const response = await fetch(`https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?action=getclassStrenth&newClass=${selectedClass}&division=${selectedDivision}&year=${curruntyear}`);
        
        // Check if response is ok (status code 200)
        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        // Parse the JSON response
        const data = await response.json();
        console.log(data);

        // Process and display the data
        if (data && data.result) {
            displayClassDivisionGenderCount(data.result);
        } else {
            document.getElementById('currentStrength').textContent = 'No data available for the selected class and division.';
        }
    } catch (error) {
        document.getElementById('currentStrength').textContent = `Failed to fetch data: ${error.message}`;
    }
}

async function checkAdNumber() {
    const adNumberInput = document.getElementById('adNumber').value.trim();
    const sector = document.querySelector('input[name="sector"]:checked').value;
    console.log(adNumberInput); 
    // Assumes there's an input or select element with id="sector"
    const adNumberResultDiv = document.getElementById('adNumberResult');

    if (!adNumberInput) {
        adNumberResultDiv.textContent = 'Please enter an Admission Number.';
        return;
    }

    try {
        // Fetch from Google Apps Script API
        const response = await fetch(`https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?action=AdmissionCheck&adNumber=${adNumberInput}&sector=${sector}`);
        
        const data = await response.json();
        console.log(data);

        if (data.exists === "Yes") {
            adNumberResultDiv.textContent = `Admission Number not exists`;
            adNumberResultDiv.style.color = 'green';
        } else {
            adNumberResultDiv.textContent = `Admission Number is available. Suggested: ${data.nextAdNumber}`;
            adNumberResultDiv.style.color = 'red';
        }
    } catch (error) {
        adNumberResultDiv.textContent = `Error checking Admission Number: ${error.message}`;
        adNumberResultDiv.style.color = 'red';
    }
}


function displayClassDivisionGenderCount(data) {
    const currentStrengthDiv = document.getElementById('currentStrength');
    currentStrengthDiv.innerHTML = ''; // Clear previous content

    // Check if data is empty or null
    if (!data || !data.length) {
        currentStrengthDiv.textContent = 'No data found for the selected class and division.';
        return;
    }

    // Iterate over the data and create HTML content
    data.forEach(dataItem => {
        const html = `
            <p><strong>Division ${dataItem.division}: Male ${dataItem.Male}, Female ${dataItem.Female}</strong></p>
        `;

        // Append each HTML block to the currentStrengthDiv
        currentStrengthDiv.innerHTML += html;
    });
}

    // Initialize the options on page load
    //window.onload = populateClassOptions('KG');
//</script>

//<script>
        async function toggleVehicleInfo(value) {
  const vehiclePointInput = document.getElementById("vehiclePoint");
  const vehicleStageInput = document.getElementById("vehicleStage");

  if (value === "YES") {
    // Enable inputs when the value is "YES"
    vehiclePointInput.disabled = false;
    vehicleStageInput.disabled = false;
  } else {
    // Show a confirmation dialog before clearing the vehicle information
    const confirmed = await showConfirmationMessage("Are you sure you want to clear the vehicle information?");
    if (confirmed) {
      // Clear inputs and disable them if the user confirms
      vehiclePointInput.value = "";
      vehicleStageInput.value = "";
      vehiclePointInput.disabled = true;
      vehicleStageInput.disabled = true;
    }
  }
}

 //   </script>

 //<script>
        async function toggleSiblingInfo(hasSiblings) {
  const siblingDetailsInput = document.getElementById("siblingDetails");

  if (hasSiblings === "Yes") {
    // Enable sibling details input field
    siblingDetailsInput.disabled = false;
    //requiredFields.push("siblingDetails");
    siblingDetailsInput.value="";
    document.getElementById("admissionFee").value=14600;

  } else {
    // If no siblings, show confirmation and clear the input field if confirmed
    if (siblingDetailsInput.value) {
      const confirmed = await showConfirmationMessage("Are you sure you want to clear the sibling information?");
      if (confirmed) {
        siblingDetailsInput.value = ""; 
        document.getElementById("admissionFee").value=15600;
        showSuccessMessage("Sibling information fields have been cleared.");
      }
    }

    // Remove "siblingDetails" from requiredFields array and disable input
    // const index = requiredFields.indexOf("siblingDetails");
    // if (index !== -1) {
    //   requiredFields.splice(index, 1);
    // }
    siblingDetailsInput.disabled = true;
  }
}

//hideLoader();
   // </script>

  // <script>
    function closeCropModal() {
  const cropModal = document.getElementById("cropModal");
  cropModal.style.display = "none"; // Hides the modal
}

    function showForm() {
        const form = document.getElementById("formcontainer");
            const button = document.getElementById("addStudentButton");

            // Toggle the display between 'none' and 'block'
            if (form.style.display === "none" || form.style.display === "") {
                form.style.display = "block";
                
               // document.getElementById("childphoto").style.display = "block";
                button.textContent = "Close Form -";
            } else {
                form.style.display = "none";
              //  document.getElementById("childphoto").style.display = "none";
                button.textContent = "Add Student +";
            }
        }


        function setGuardian() {
  const guardianOption = document.querySelector('input[name="guardianOption"]:checked').value;
  const guardianNameField = document.getElementById("guardian");
  const guardianRelation = document.getElementById("relation");

  switch (guardianOption) {
    case "father":
      guardianNameField.value = document.getElementById("fatherName").value;
      guardianRelation.value = "FATHER";
      guardianNameField.readOnly = true; // Set read-only after all cases
      guardianRelation.readOnly = true; // Set read-only after all cases
      break;
    case "mother":
      guardianNameField.value = document.getElementById("motherName").value;
      guardianRelation.value = "MOTHER";
      guardianNameField.readOnly = true; // Set read-only after all cases
      guardianRelation.readOnly = true; // Set read-only after all cases
      break;
      case "other":
      guardianNameField.value = ""//document.getElementById("motherName").value;
      guardianRelation.value = "";
      guardianNameField.readOnly = false; // Set read-only after all cases
      guardianRelation.readOnly = false; // Set read-only after all cases

    default:
      // Handle unexpected guardianOption values (optional)
      console.warn("Invalid guardianOption:", guardianOption);
      break;
  }

  
}
    function setGender() {
        const guardianOption = document.querySelector('input[name="guardianOption"]:checked').value;
        const guardianNameField = document.getElementById("guardian");
       // const guardianNumberField = document.getElementById("guardianNumber");

        if (guardianOption === "father") {
            guardianNameField.value = document.getElementById("fatherName").value;
            guardianNumberField.value = document.getElementById("fatherMobile").value;
        } else if (guardianOption === "mother") {
            guardianNameField.value = document.getElementById("motherName").value;
            guardianNumberField.value = document.getElementById("motherMobile").value;
        }
    }


//<script>
    // Function to transform input to uppercase, remove extra spaces, and trim leading/trailing spaces
    function formatInput(event) {
        const input = event.target;
        input.value = input.value
            .toUpperCase()                   // Convert to uppercase
            .replace(/\s+/g, ' ')             // Replace multiple spaces with a single space
            .trimStart();                          // Remove leading and trailing spaces
    }

    // Apply the formatting to each text input field
    
//</script>


  //  <script>

let cropper;
function showCropper(event, index) {
    const file = event.target.files[0];
    currentIndex = index;

    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        document.getElementById('cropImage').src = e.target.result;
        document.getElementById('cropModal').style.display = 'block';
        if (cropper) {
                    cropper.destroy(); // Destroy any existing cropper instance
                }
        // Initialize Cropper.js
        cropper = new Cropper(document.getElementById('cropImage'), {
          aspectRatio: 3 / 4,
    ViewTransition:1,
    viewMode:1
        });
      };
      reader.readAsDataURL(file);
    }
  }


  async function editImage() {
  // Get the original image element
  const img = document.getElementById('student-photo');

  // Check if the image source is empty or invalid
  if (!img.src || img.src === '') {
    alert("Please select an image first.");
    return; 
  }

  // Show confirmation message
  const confirmed = await showConfirmationMessage("Are you sure you want to edit the image?");
  
  if (confirmed) {
    document.getElementById('cropModal').style.display = 'block';

    const cropImage = document.getElementById('cropImage');

    // Assign the source of the existing image to the cropImage element
    cropImage.src = img.src;

    if (cropper) {
      cropper.destroy(); // Destroy any existing cropper instance
    }

    // Initialize Cropper.js on the cropImage element
    cropper = new Cropper(cropImage, {
      aspectRatio: 3 / 4,
      viewMode: 1,
      // Other Cropper.js options as needed
    });
  }
}

async function deleteImage() {
    const confirmed = await showConfirmationMessage("Are you sure you want to delete the image?");
    if (confirmed) {
        const imageElement = document.getElementById('student-photo');
        imageElement.src = '';

        document.getElementById('imagepicker').style.display = 'block';
        document.getElementById('studentPhoto').value = '';
        document.getElementById('student-photo-container').style.display = 'none';
       // document.getElementById('crop-btn').style.display = 'none';
        document.getElementById('upload-btn').style.display = 'none';
        document.getElementById('edit-btn').style.display = 'none';
        document.getElementById('delete-btn').style.display = 'none';

        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    }
}


async function uploadCroppedImage2(event) {
  event.preventDefault();

  const croppedImage = document.getElementById('student-photo').getAttribute('data-cropped');

  if (croppedImage) {
    // Await the confirmation dialog
    const confirmed = await showConfirmationMessage("Are you sure you want to upload the image?");
    
    if (confirmed) {
      // Implement your upload logic here (e.g., send it to your server or Google Apps Script)
      console.log("Cropped image ready for upload:", croppedImage);
      showSuccessMessage("Image uploaded successfully!"); // Confirmation message for upload
    }
  } else {
    console.error("No cropped image to upload.");
    document.getElementById('error-message').textContent = 'No cropped image to upload.';
  }
}


    function cropImageto() {
  try {
    const canvas = cropper.getCroppedCanvas({
      width: 150,
      height: 200,
    });

    document.getElementById('student-photo-container').style.display = 'block';

    // Convert canvas to base64 and set the data-cropped attribute
    const base64Data = canvas.toDataURL();
    document.getElementById('student-photo').src = base64Data;
    document.getElementById('student-photo').setAttribute('data-cropped', base64Data);

    document.getElementById('cropModal').style.display = 'none';
    cropper.destroy();
    document.getElementById('upload-btn').style.display = 'block';
    
  } catch (error) {
    // ... (error handling as before)
  }
}

       // document.getElementById('addStudentForm').addEventListener('submit', function (event) {
      // function saveStudent() {
          //  document.getElementById("addStudentForm").addEventListener("submit", function(event) {
    // Prevents default form submission
   // event.preventDefault();
   function saveStudent() {
    showLoader();

    const spinner = document.getElementById('spinner');
    spinner.style.display = 'block';

    const studentData = {
        action: 'addOrUpdateStudent',
        studentId: document.getElementById('studentId')?.value,
        adNumber: document.getElementById('adNumber')?.value,
        studentName: document.getElementById('studentName')?.value,
        gender: document.querySelector('input[name="genderOptions"]:checked')?.value,
        dob: document.getElementById('dob')?.value,
        adharNumber: document.getElementById('adharNumber')?.value || "",
        sector: document.querySelector('input[name="sector"]:checked')?.value,
        houseName: document.getElementById('houseName')?.value,
        place: document.getElementById('place')?.value,
        pin: document.getElementById('pin')?.value,
        postOffice: document.getElementById('postOffice')?.value,
        fatherName: document.getElementById('fatherName')?.value,
        fatherMobile: document.getElementById('fatherMobile')?.value,
        motherName: document.getElementById('motherName')?.value,
        motherMobile: document.getElementById('motherMobile')?.value,
        whatsappNo: document.getElementById('whatsappNo')?.value,
        guardian: document.getElementById('guardian')?.value,
        relation: document.getElementById('relation')?.value,
        admissionDate: document.getElementById('admissionDate')?.value,
        admittedClass: document.getElementById('admittedClass')?.value,
        currentClass: document.getElementById('currentClass')?.value,
        status: document.getElementById('status')?.value,
        studentMobile: document.getElementById('studentMobile')?.value,
        admissionFee: document.getElementById('admissionFee')?.value,
        vehiclePoint: document.getElementById('vehiclePoint')?.value || "",
        vehicleStage: document.getElementById('vehicleStage')?.value || "",
        siblingDetails: document.getElementById('siblingDetails')?.value || document.getElementById('siblingDetails')?.textContent||"",
    };

    // Define required fields
    const requiredFields = [
        'studentId', 'adNumber', 'studentName', 'gender', 'dob', 'sector',
        'houseName', 'place', 'pin', 'postOffice', 'fatherName', 'fatherMobile', 
        'motherName', 'motherMobile', 'whatsappNo', 'guardian', 'relation', 
        'admissionDate', 'admittedClass', 'currentClass', 'status','siblingDetails','admissionFee'
    ];

    const isAdharChecked = document.getElementById('adharCheckbox').checked;
    if (isAdharChecked) requiredFields.push("adharNumber");

    const siblingYesCheckbox = document.getElementById("siblingYes").checked;
    
    if (!siblingYesCheckbox){
        const index = requiredFields.indexOf("siblingDetails");
     if (index !== -1) {
       requiredFields.splice(index, 1);
     }
    }
    const vehicleNeededCheckbox = document.getElementById("vehicleNeed").checked;
    if (vehicleNeededCheckbox) requiredFields.push("vehiclePoint", "vehicleStage");

    // Check for missing fields
    const missingFields = requiredFields.filter(field => !studentData[field]);
    if (missingFields.length > 0) {
        showErrorMessage(`Please fill out all required fields: ${missingFields.join(', ')}`);
        spinner.style.display = 'none';
        hideLoader();
        return; // Stop further execution
    }

    const params = new URLSearchParams(studentData).toString();
    console.log(params);

    fetch(`https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?${params}`)
        .then(response => response.json())
        .then(data => {
            console.log(data); // Log full response for debugging
            if (data.success) {
                //loadStudentTable(studentData.studentId,"");
                //loadstudents();
                showSuccessMessage("Student saved successfully");
                 document.getElementById('addStudentForm').reset(); // Clear the form only on success
            } else {
                showErrorMessage('Error adding or updating student');
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            showErrorMessage('Network or server error. Please try again.');
        })
        .finally(() => {
            hideLoader();
            spinner.style.display = 'none';
        });
}

        let studentsData = []; // Variable to hold student data
        

        // syncWithServer('https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?action=getStudents&curruntyear="2025"');
       // clearDatabase("students");
       async function loadstudents(type) {
    // Load students from server
    let timestamp = "";
    if (type === "new") {
        timestamp = "";
    } else {
        timestamp = await getStoreById("adStudents");
    }
    generateTable();

    // console.log(timestamp);
    // fetch(`https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?action=getAllStudents&lastTime=${timestamp.time || ""}`)
    //     .then(async response => response.json())
    //     .then(async data => {
    //         if (data.students && data.students.length > 0) {
    //             const studentsData = data.students;
    //             const heads = data.heads;
    //             console.log(data);
    //             console.log("updatedvies");
    //             localStorage.setItem('stuHeads', JSON.stringify(heads));
    //             console.log("fetched data" + timestamp.time);
    //             console.log(studentsData);

    //             try {
    //                 console.log("updatedvies");
    //                 await Promise.all(studentsData.map(async student => {
    //                     await saveStudentdb(student);
    //                 }));
    //                 showSuccessMessage("Students saved successfully");
    //                 generateTable(); // Generate table only after successful storage
    //             } catch (error) {
    //                 console.log("Error storing students:", error);
    //             }
    //         } else {
    //             showSuccessMessage("no new data");
    //             //document.getElementById('studentTableContainer').innerHTML = '<p>No students found</p>';
    //         }
    //     })
    //     .catch(error => console.error('Error fetching student data:', error))
    //     .finally(() => {
    //         hideLoader();
    //         spinner.style.display = 'none';
    //     });
}

//generateTable(); // Generate table only after successful storage

// Assuming you have a function saveStudentdb(student) defined elsewhere
// and a function showSuccessMessage(message)

function updateStudentList(newStudent) {
  try {
    let storedData = localStorage.getItem("students");
    let studentsList = storedData ? JSON.parse(storedData).students : [];
    let updatedAt = storedData ? JSON.parse(storedData).updatedAt : null; // Retrieve existing updatedAt

    // Remove existing entry if found
    studentsList = studentsList.filter(student => student.stu_id !== newStudent.stu_id);

    // Add newStudent at the beginning
    studentsList.unshift(newStudent);

    // Get current timestamp
    const now = Date.now();

    // Store updated list and timestamp in localStorage
    const dataToStore = {
      students: studentsList,
      updatedAt: now
    };
    try {
    localStorage.setItem("students", JSON.stringify(dataToStore));
    console.log("Data saved to localStorage.");
} catch (e) {
    showErrorMessage(e);

    if(localStorage.megabytes>=5){
    clearLocalStorage();
}
    console.error("Storage error:", e);
}

  } catch (error) {

    console.error("Error updating student list:", error);
  }
}



async function loadStudentPhoto(studentId, imgId) {
    const loading =document. getElementById(imgId);
    loading.src="https://i.gifer.com/4V0b.gif";
    
    console.log(`Fetching photo for student ID: ${studentId}`);
    try {
        // Fetch the photo from the server
        const response = await fetch(`https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?action=getStudentPhoto&studentId=${studentId}`);
        
        if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Server response:', data);

        // Handle the case where a photo is returned
        if (data.photo) {
            const photoUrl = `data:image/jpeg;base64,${data.photo}`;

            // Check if an existing photo is stored in localStorage
            const existingPhoto = localStorage.getItem(`studentPhotos_${studentId}`);
            if (existingPhoto) {
                // Remove the old photo to avoid unnecessary storage usage
                localStorage.removeItem(`studentPhotos_${studentId}`);
                console.log(`Old photo for student ID ${studentId} removed from localStorage.`);
            }

            // Save the new photo in localStorage
            //localStorage.setItem(`studentPhotos_${studentId}`, photoUrl);
            //console.log(`Photo for student ID ${studentId} saved to localStorage.`);

            // Set the `src` attribute of the image element to the Base64 encoded photo
            const imgElement = document.getElementById(imgId);
            if (imgElement) {
                imgElement.src = photoUrl;
                console.log(`Photo set for image element with ID: ${imgId}`);
            } else {
                console.warn(`Image element with ID ${imgId} not found.`);
            }

            // Clear any previous error messages
            const errorMessageElement = document.getElementById('error-message');
            if (errorMessageElement) {
                errorMessageElement.textContent = '';
            }

        } else if (data.error) {
            // Display the error message if provided in the server response
            const errorMessageElement = document.getElementById('error-message');
            if (errorMessageElement) {
                errorMessageElement.textContent = data.error;
            }
            console.warn(`Error from server: ${data.error}`);
        }
    } catch (error) {
        // Handle fetch or other errors
        console.error('Error fetching photo:', error);
        const errorMessageElement = document.getElementById('error-message');
        if (errorMessageElement) {
            errorMessageElement.textContent = 'Failed to fetch photo.';
        }
    }
}
var userMail = localStorage.getItem("loggedInUser");
async function generateTable() {
    // const timestamp = await getStoreById("students");
    // document.getElementById('updatedTime').textContent=timestamp.time;
    var curYear = document.getElementById("curruntyear").value;
    try {
        const now = Date.now();
        let settings = {
            //"currentClass": className,
            "userMail":userMail,
            "type": "new",
            "storeName": "adStudents",
            "indexName": "",
            "query": "",
            "timestamp":now,
            "curYear":curYear
          };
          //showWaiting("myStudents");
        let studentsList = await get(settings); // Assumes getAllRecords returns a promise
                          
        //const studentsList = await getAllStudents();

        const reportData = studentsList.filter(student => student.year === curYear);
        reportData.sort((a, b) => {
  return a.currentClass.localeCompare(b.currentClass);
});
        console.log("reportdata");
        console.log(reportData);
        generateReport(studentsList,curYear);

        renderStudentTable(reportData, 'studentTableContainer');
    } catch (error) {
        console.error("Error in generateTable:", error);
        // Optionally display an error message to the user
    }
}
// Function to render the student table
function renderStudentTable(students,divid) {
    document.getElementById(divid).innerHTML = '<p>loading.....</p>';
    console.log("iam running now...")
    photoFile2=[];
    //const students = JSON.parse(localStorage.getItem("studentsList") || "[]"); // Parse the JSON string

    if (students.length === 0) {
        document.getElementById(divid).innerHTML = '<p>No students found</p>';
        return;
    }
//console.log(students);
    let table = `<table border=1>
        <tr>
            <th>SL</th>
            <th>Photo</th>
            <th>stu_Id</th>
            <th>AD Number</th>
            <th>Name</th>
            <th>Gender</th>
            <th>DOB</th>
            <th>Class</th>
            <th>Father Name</th>
            <th>Father Mobile</th>
            <th>House</th>
            <th>WhatsApp No</th>
            <th>Actions</th>
        </tr>`;
    
    students.forEach((student, index) => {
        const imgId = `pic${index + 1}`; // Create a unique imgId for each student
        //var divId= "photo" + studentData.adNumber
        const imageGet = {
    adNumber: student.stu_id,
    divId: imgId
  };
  photoFile2.push(imageGet);
        table += `<tr>
            <td>${index + 1}</td>
            <td> 
  <div class="image-container">
  <img id="${imgId}" src="https://drive.google.com/thumbnail?id=${student.image}&sz=800" alt="${student.stu_id}"><button type="button" class="refreshButton" id="refreshButton${imgId}" 
       // onclick="loadStudentPhoto('${student.stu_id}', '${imgId}');">
    &#x21bb;
</button>

</div>

</td>

            <td>${student.stu_id}</td>
            <td>${student.adNumber}</td>
            <td style="color:red;">${student.name}</td>
            <td>${student.gender}</td>
            <td>${formatDate(student.dob)}</td>
            <td>${student.currentClass}</td>
            <td>${student.fatherName}</td>
            <td>${student.fatherMobile}</td>
            <td style="color:red;">${student.houseName}</td>
            <td>${student.whatsappNo}</td>
            <td class="action-buttons">
                <button type="button" class="edit-btn" onclick="editStudent('${student.stu_id}')">Edit</button>
                <button type="button" class="delete-btn" onclick="deleteStudent('${student.stu_id}')">Delete</button>
                <button type="button" class="print-btn" onclick="printform('${student.stu_id}')">Print</button>
                <button type="button" class="print-btn" onclick="generatePoster('${student.name}','${student.name}','', '${imgId}')">poster</button>
                 <button type="button" class="print-btn" onclick="sendWhatsAppMessageToStudent('${student.stu_id}')">Whtsapp</button>
               
                </td>
        </tr>`;

        // Call loadStudentPhoto after setting up the row
        //loadStudentPhotos(student.stu_id, "pic_"+index + 1);
    });

    table += '</table>';
    document.getElementById(divid).innerHTML = table;
   //  generatestudentPhotos();
    
}


function now() {
  console.log(new Date());
  return new Date(); // Returns the current date and time
  
}
async function generatestudentPhotos() {

  for (const imageGet of photoFile2) {
    const studentId = imageGet.adNumber;
    const imgId = imageGet.divId;

    try {
     // await loadStudentPhotos(studentId, imgId);
    } catch (error) {
      console.error(`Error loading photo for student ${studentId}:`, error);
    }
  }
}


function printform(studentId) {
    //localStorage.setItem('stu_idform', "");
    localStorage.setItem('stu_idform', studentId);
    window.location.href = `adform.html?stu_id=${encodeURIComponent(studentId)}`; // Pass the student ID as a query parameter
}



// Function to filter the table based on search input
async function filterTable() {
    var curYear = document.getElementById("curruntyear").value;
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    //let storedData = localStorage.getItem("students");
    //let students = storedData ? JSON.parse(storedData).students : [];
    let settings = {
        //"currentClass": className,
        "userMail":userMail,
        "type": "new",
        "storeName": "adStudents",
        "indexName": "",
        "query": "",
        "curYear":curYear
      };
      //showWaiting("myStudents");
    let students = await get(settings); // Assumes getAllRecords returns a promise
                      
    //let students = await getAllStudents();
    //const students = JSON.parse(localStorage.getItem("studentsList") || "[]"); // Parse the JSON string

    const filteredStudents = students.filter(student => {
        return (
            (student.adNumber && student.adNumber.toString().toLowerCase().includes(searchInput)) ||
            (typeof student.name === 'string' && student.name.toLowerCase().includes(searchInput)) || // Check for name type
            (student.currentClass && student.currentClass.toLowerCase().includes(searchInput)) // Check for current class
        );
    });

    renderStudentTable(filteredStudents,'studentTableContainer'); // Re-render table with filtered results
}




// Call loadStudentTable when the script loads
// window.onload = loadStudentTable;

// Function to upload the student photo separately

    // Function to upload a new student photo, delete the old one from localStorage (and server if needed), and update the displayed image
async function uploadCroppedImage() {
    showLoader();
    const studentId = document.getElementById('studentId').value;
    const croppedImage = document.getElementById('student-photo').getAttribute('data-cropped'); // Assume base64 format

    if (!studentId) {
        showErrorMessage('Please generate the student ID first');
        hideLoader();
        return;
    }

    if (!croppedImage) {
        showErrorMessage('Please crop the student photo');
        hideLoader();
        return;
    }

    

    // Prepare the new photo for upload (Base64)
    const formData = new FormData();
    formData.append('studentId', studentId);
    formData.append('studentPhoto', croppedImage); // Send the new photo (Base64) to the server

    try {
        // Upload the new photo to the server
        const response = await fetch(`https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?action=uploadStudentPhoto`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // Photo uploaded successfully, save it in localStorage and update the image display
            // Check if there's an existing photo for this student in localStorage
            const existingPhoto = localStorage.getItem(`studentPhotos_${studentId}`);
            if (existingPhoto) {
             // Remove the old photo from localStorage if it exists
              localStorage.removeItem(`studentPhotos_${studentId}`);
                console.log("Old photo for student ID "+studentId+"removed from localStorage");
            }
           // const newPhotoUrl = `data:image/jpeg;base64,${data.photo}`;
           // localStorage.setItem(`studentPhotos_${studentId}`, newPhotoUrl); // Save the new photo in localStorage
            //document.getElementById('student-photo-container').style.display = 'block';
            loadStudentTable(studentId,"new");
            //document.getElementById('student-photo').src = newPhotoUrl; // Update the displayed image
            showSuccessMessage('Photo uploaded and updated successfully!');
            hideLoader();
        } else {
            showErrorMessage('Error uploading photo: ' + data.message);
            hideLoader();
        }
    } catch (error) {
        console.error('Error:', error);
        showErrorMessage('Failed to upload new photo.');
        hideLoader();
    }
}


       // Function to load student photo from localStorage or Google Drive
async function loadStudentPhotos(studentId, divid) {
    const loading = document.getElementById(divid);
    loading.src="https://i.gifer.com/4V0b.gif";
    try {
        // Check if the photo exists in localStorage
        const savedPhoto = localStorage.getItem(`studentPhotos_${studentId}`);
        
        if (savedPhoto) {
            // If photo exists in localStorage, use it directly
            document.getElementById(divid).style.display = 'block';
            document.getElementById(divid).src = savedPhoto; // Set the photo from localStorage
            console.log('Photo loaded from localStorage');
        } else {
            // If no photo in localStorage, fetch it from the server
            const response = await fetch(`https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?action=getStudentPhoto&studentId=${studentId}`);
            const data = await response.json();

            if (data.photo) {
                loading.src="";
                // If the photo is found on the server, save it to localStorage
                const photoUrl = `data:image/jpeg;base64,${data.photo}`;
                //localStorage.setItem(`studentPhotos_${studentId}`, photoUrl); // Save to localStorage
                document.getElementById('student-photo-container').style.display = 'block';
                document.getElementById(divid).src = photoUrl; // Set the photo from server
                console.log('Photo loaded from server and saved to localStorage');
            } else if(data.photo===""){
                const demophoto = localStorage.getItem(`studentPhotos_KYHSS`);
                loading.src="";
                document.getElementById(divid).src = demophoto; // Set the photo from localStorage
           
            }else if (data.error) {
                document.getElementById('error-message').textContent = data.error; // Show error message
            }
        }
    } catch (error) {
        console.error('Error fetching photo:', error);
        document.getElementById('error-message').textContent = 'Failed to fetch photo.';
    }
}
async function loadStudentPhotosEdit(studentId, divid) {
    document.getElementById('student-photo-container').style.display = 'block';
    const loading = document.getElementById(divid);
    loading.src="https://i.gifer.com/4V0b.gif";
    try {
        // Check if the photo exists in localStorage
        //const savedPhoto = localStorage.getItem(`studentPhotos_${studentId}`);

            // If no photo in localStorage, fetch it from the server
            const response = await fetch(`https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?action=getStudentPhoto&studentId=${studentId}`);
            const data = await response.json();

            if (data.photo) {
                loading.src="";
                // If the photo is found on the server, save it to localStorage
                const photoUrl = `data:image/jpeg;base64,${data.photo}`;
                //localStorage.setItem(`studentPhotos_${studentId}`, photoUrl); // Save to localStorage
                document.getElementById('student-photo-container').style.display = 'block';
                document.getElementById(divid).src = photoUrl; // Set the photo from server
                console.log('Photo loaded from server and saved to localStorage');
            } else if(data.photo===""){
                const demophoto = localStorage.getItem(`studentPhotos_KYHSS`);
                loading.src="";
                document.getElementById(divid).src = demophoto; // Set the photo from localStorage
           
            }else if (data.error) {
                document.getElementById('error-message').textContent = data.error; // Show error message
            }
        
    } catch (error) {
        console.error('Error fetching photo:', error);
        document.getElementById('error-message').textContent = 'Failed to fetch photo.';
    }
}
           
        // Edit student
        async function editStudent(Id) {
            showLoader();
            document.getElementById("formcontainer").style.display='block';
            const targetElement = document.getElementById("formcontainer"); // Replace with the element you want to scroll into view

targetElement.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
            fetch(`https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?action=getStudentById&mobile=${Id}`)
                .then(response => response.json())
                .then(data => {
                    if (data.student) {
                        const student = data.student;
                        console.log(student);

                        document.getElementById('studentId').value = student.stu_Id;
                        document.getElementById('adNumber').value = student.adNumber;
                        document.getElementById('studentName').value = student.name;
                       
                        if (student.gender === "Male") {
                            document.getElementById("genderMale").checked = true;
                            } else {
                             document.getElementById("genderFemale").checked = true;
                            }

                            if (student.stu_Id.startsWith("KG")) {
                            document.getElementById("KG").checked = true;
                            populateClassOptions('KG');
                                const sectorRadios = document.getElementsByName("sector");
                            sectorRadios.forEach(radio => {
                                radio.disabled = true; 
                            });
                            } else {
                             document.getElementById("School").checked = true;
                             populateClassOptions('School');
                                const sectorRadios = document.getElementsByName("sector");
                            sectorRadios.forEach(radio => {
                                radio.disabled = true; 
                            });
                            }
                            
                            
                        document.getElementById('dob').value = formatDateForInput(student.dob);
                        datetoText(student.dob);

                        if (student.adharNumber !== "") {
                            document.getElementById("adharCheckbox").checked = true;
                            document.getElementById('adharNumber').value = student.adharNumber;
                            } else {
                             document.getElementById("adharCheckbox").checked = false;
                            
                            }
                        document.getElementById('houseName').value = student.houseName;
                        document.getElementById('place').value = student.place;
                        document.getElementById('pin').value = student.pin;
                        document.getElementById('postOffice').value = student.postOffice;
                        document.getElementById('fatherName').value = student.fatherName;
                        document.getElementById('fatherMobile').value = student.fatherMobile;
                        document.getElementById('motherName').value = student.motherName;
                        document.getElementById('motherMobile').value = student.motherMobile;
                        document.getElementById('whatsappNo').value = student.whatsappNo;
                        document.getElementById('guardian').value = student.guardian;
                        
                        if (student.guardian === student.fatherName) {
                            document.getElementById("guardianFather").checked = true;
                            } else if(student.guardian === student.motherName) {
                             document.getElementById("guardianMother").checked = true;
                            }else{
                                document.getElementById("guardianOther").checked = true;
                            }
                        
                        
                        
                        document.getElementById('relation').value = student.relation;
                        document.getElementById('admissionDate').value = formatDateForInput(student.admissionDate);
                        document.getElementById('admittedClass').value = student.admittedClass;
                        
                        document.getElementById('currentClass').value = student.currentClass;
                        document.getElementById('status').value = student.status;
                        const vehicleInfoContainer = document.getElementById("vehicleInfo");
                        const vehiclePointInput = document.getElementById("vehiclePoint");
                        const vehicleStageInput = document.getElementById("vehicleStage");
                        const noVehicleCheckbox = document.getElementById("noVehicle");
                        const vehicleNeededCheckbox = document.getElementById("vehicleNeed");

                        if (student.vehiclePoint === "") {
                        noVehicleCheckbox.checked = true;
                       // vehicleInfoContainer.style.display = "block";
                        vehiclePointInput.disabled = true;
                        vehicleStageInput.disabled = true;
                        
                        } else {
                        vehicleNeededCheckbox.checked = true;
                       // vehicleInfoContainer.style.display = "none";
                        vehiclePointInput.disabled = false;
                        vehicleStageInput.disabled = false;
                        vehiclePointInput.value = student.vehiclePoint;
                        vehicleStageInput.value = student.vehicleStage;
                        }
                        if (student.siblingDetails === "") {
    // No sibling information provided
    const siblingNoCheckbox = document.getElementById("siblingNo");
    const siblingInfoContainer = document.getElementById("siblingInfo");

    // Check the "No Siblings" option
    siblingNoCheckbox.checked = true;

    // Display sibling info block (if hidden)
    siblingInfoContainer.style.display = "block";

    // Ensure sibling details are cleared and disabled
    const siblingDetailsInput = document.getElementById("siblingDetails");
    siblingDetailsInput.value = "";
    siblingDetailsInput.disabled = true;
                            
                            
} else {
    // Sibling information is provided
    const siblingYesCheckbox = document.getElementById("siblingYes");
    const siblingDetailsInput = document.getElementById("siblingDetails");

    // Enable the sibling details input
    siblingDetailsInput.disabled = false;
    // Check the "Yes Siblings" option
    siblingYesCheckbox.checked = true;

    // Populate the sibling details input
    siblingDetailsInput.value = student.siblingDetails;


    // Ensure sibling info block is displayed
    document.getElementById("siblingInfo").style.display = "block";
}

                            setDefaultSelections(student.admittedClass);
                        document.getElementById('studentMobile').value = student.mobile;
                        document.getElementById('admissionFee').value = student.admissionFee;
            
                        loadStudentPhotosEdit(student.stu_Id,"student-photo");
                        hideLoader();
                    } else {
                        showErrorMessage(data.error);
                        hideLoader();
                    }
                })
                .catch(error =>{ 
                    document.getElementById("formcontainer").style.display='none';
                    hideLoader(); console.error('Error:', error)});
        }
        async function sendWhatsAppMessageToStudent(studentId) {
        showLoader();
  try {
    const response = await fetch(`https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?action=getStudentById&mobile=${studentId}`); 
    const studentData = await response.json();

    if ( studentData.student) {
      const student = studentData.student;

      const message = `Dear ${student.fatherName || student.motherName},\n\nThis message is to inform you about your ward, ${student.name}. \n\n**Student's Details:**\n* Name: ${student.name}\n* Date of Birth: ${formatDate(student.dob)}\n* Class: ${student.currentClass}\n* Admission Number: ${student.adNumber}\n* Address: ${student.houseName}, ${student.place}, ${student.postOffice}, ${student.pin}\n* Father's Name: ${student.fatherName}\n* ContactNo 1: ${student.fatherMobile}\n* Mother's Name: ${student.motherName}\n* ContactNo 2: ${student.motherMobile}\n* Whatsapp : ${student.whatsappNo}\n\n**School Details:**\n* School Name: KYHSS ATHAVANAD\n\nWe are delighted to welcome ${student.name} to our school family. Thank you for choosing KYHSS ATHAVANAD for your child's education. We look forward to a fruitful and enriching learning experience together.\n\nSincerely,\nThe Management, KYHSS ATHAVANAD`;

      const whatsappUrl = `https://wa.me/+91 ${student.whatsappNo}?text=${encodeURIComponent(message)}`; 
      window.open(whatsappUrl, '_blank');

      showSuccessMessage('WhatsApp message sent successfully!'); 
      hideLoader();
    } else {
      showErrorMessage('Error fetching student data or student not found.'); 
      hideLoader();
    }

  } catch (error) {
    console.error('Error sending message:', error);
    hideLoader();
        showErrorMessage('An error occurred while sending the message. Please try again later.');
  }
}

async function sendWhatsAppMessageToStudent3(Id) {
  try {
    const response = await fetch(`https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?action=getStudentById&mobile=${Id}`)
                const studentData = await response.json();

    if(studentData.student) {
      const student = studentData.student;

      const message = `Dear ${student.fatherName || student.motherName},\n\nThis message is to inform you about your ward, ${student.name}. \n\n[Student Details]\n* Name: ${student.name}\n* Class: ${student.currentClass}\n* Admission Number: ${student.adNumber}\n* ... (Add other relevant details as needed) ...\n\n[Optional: Add a personal message or school information here]\n\nThank you.`;

      const whatsappUrl = `https://wa.me/${student.fatherMobile || student.motherMobile}?text=${encodeURIComponent(message)}`; 
      window.open(whatsappUrl, '_blank');

      showSuccessMessage('WhatsApp message sent successfully!'); 
    } else {
      showErrorMessage('Error fetching student data or student not found.'); 
    }

  } catch (error) {
    console.error('Error sending message:', error);
    showErrorMessage('An error occurred while sending the message. Please try again later.');
  }
}


        // Delete student
        function deleteStudent(mobile) {

            if (conshowConfirmationMessage('Are you sure you want to delete this student?')) {
                fetch(`https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?action=deleteStudent&mobile=${mobile}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            loadStudentTable('new');
                        } else {
                            showErrorMessage('Error deleting student');
                        }
                    })
                    .catch(error => console.error('Error:', error));
            }
        }
        // Function to auto-generate student ID in the format: currentYear_001
        function generateStudentId() {
            showLoader();
            document.getElementById('studentId').value = "";
            document.getElementById('adNumber').value = "";
    // Get the selected sector
    const sector = document.querySelector('input[name="sector"]:checked').value;

    // Fetch the next student ID based on the selected sector
    fetch(`https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?action=getNextStudentId&sector=${sector}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('studentId').value = data.studentId;
                document.getElementById('adNumber').value = data.newAdNumber;
                hideLoader();
            } else {
                showErrorMessage('Error generating Student ID');
                hideLoader();
            }
        })
        .catch(error => console.error('Error:', error));
}

async function getStudentbyMobile() {
    document.getElementById("siblingloading").style.display="block";
    const fatherMobile = String(document.getElementById('fatherMobile').value || "").trim();
    const motherMobile = String(document.getElementById('whatsappNo').value || "").trim();

    let numbers = [];
    if (fatherMobile) numbers.push(fatherMobile);
    if (motherMobile) numbers.push(motherMobile);

    console.log("Numbers to check:", numbers);

    if (numbers.length === 0) {
        showErrorMessage("Please enter at least one mobile number.");
        return;
        document.getElementById("siblingloading").style.display="none";
    }

    try {
        const mobileNumbers = encodeURIComponent(numbers.join(","));
        console.log("Encoded mobile numbers:", mobileNumbers);

        // Fetch student details from Google Apps Script
        const response = await fetch(`https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?action=getStudentByMobile&numbers=${mobileNumbers}`);
        
        if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Server response:", data);

        const siblingDetailsElement = document.getElementById("siblingDetails");

        // Check if the data contains multiple students
        if (data && data.students && data.students.length > 0) {
            // Join student names in a readable format
            const siblingDetails = data.students.map(student => `${student.name} (${student.stuId} - ${student.adNumber})`).join(", ");

            // Update the input field
            toggleSiblingInfo("Yes");
            siblingDetailsElement.disabled = false; // Enable the field

            siblingDetailsElement.value = siblingDetails;
            
            showSuccessMessage(`Siblings added: ${siblingDetails}`);
            
            document.getElementById("siblingloading").style.display="none";
        } else {
            // No students found
            siblingDetailsElement.value = "";
            siblingDetailsElement.placeholder = "No student found with these mobile numbers";
            showErrorMessage("No siblings found");
            toggleSiblingInfo("No");
            document.getElementById("siblingloading").style.display="none";
        }
    } catch (error) {
        console.error("Error fetching student by mobile number:", error);
        document.getElementById("siblingloading").style.display="none";

        // Handle errors
        const siblingDetailsElement = document.getElementById("siblingDetails");
        document.getElementById("siblingloading").style.display="none";
        siblingDetailsElement.value = "Error fetching student details";
        siblingDetailsElement.disabled = true; // Disable the field
    }
}





   // </script>
   
    
//<script>
    function generatePoster(name, position, totalMarks, imgId) {
        showLoader();
  const canvas = document.getElementById("posterCanvas");
  const ctx = canvas.getContext("2d");

  // Set Canvas Dimensions
  canvas.width = 700;
  canvas.height = 700;

  // Load Background Image
  const background = new Image();
  background.src = "welcome.png"; //document.getElementById(imgId).src;
  background.onload = function () {
    window.onload = loadStudentPhotos("KYHSS","logo");

    ctx.drawImage(background, 0, 0, canvas.width, canvas.height); // Draw background image

    // Add Semi-Transparent Overlay
    //ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Black overlay with transparency
   // ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Rounded Rectangle for Photo Background
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); 
    //ctx.roundRect(canvas.width / 2 - 110, 95, 220, 220, 20);
    ctx.fill();


    // Load Student Photo
    const photo = new Image();
    photo.src =document.getElementById(imgId).src;
    photo.onload = function () {
     // const imgX = canvas.width / 2 - 80;
      //const imgY = 110;
    //const processedCanvas = removeGreenBackground(photo);
      const imgX = canvas.width / 2 - 125; 
  const imgY = 114;
  //const processedCanvas =  removeBackgroundUsingTensorFlow(photo);
  
  //ctx.drawImage(processedCanvas, imgX, imgY, 160, 180);

  //ctx.drawImage(processedCanvas, imgX, imgY, 150, 170);
    ctx.drawImage(photo, imgX, imgY,250, 250 );

      // Add Text Blocks 
      drawTextBlock(ctx, `${position}`, canvas.width / 2, 792, 670, 0, "#4f2111", "bold 24px Arial", "#4f2111");
      
      if(!name){}else{ drawTextBlock(ctx, name, canvas.width / 2, 377, 4, 0, "#fff", "bold 16px Arial", "#4f2111");
    }
    if(!totalMarks){}else{
      drawTextBlock(ctx, `${totalMarks}`, canvas.width / 2, 158,116, 24, "#ffff", "bold 16px Arial", "#4f2111");
    }
}
    const ndphoto = new Image();
// ndphoto.src = document.getElementById("termframe"+position).src;//"2nd.png"; // Replace with the path to your photo
// ndphoto.onload = function () {
//         const imgX = canvas.width / 2 - 99; // Center horizontally
//         const imgY = 290; // Adjust vertical position
//         ctx.drawImage(ndphoto, imgX, imgY, 140, 140);
//       };
      // Add Text Blocks
      //drawTextBlock(ctx, `${position==="1"?"First Rank":position==="2"?"Second Rank":"Third Rank"}`, canvas.width / 2, 397, 270, 0, "#4f2111", " 20px Arial", "#4f2111");
     // drawTextBlock(textCanvas, name, canvasWidth / 2, 448, 300, 0, "#4f2111", "bold 20px Arial", "#ffffff");
      //drawTextBlock(textCanvas, totalMarks, canvasWidth / 2+120, 387, 0, 30, "#ffffff", "bold 18px Arial", "#ffffff");
     
      // Load School Logo
      const schoolLogo = new Image();
      schoolLogo.src =document.getElementById(imgId ).src;
      schoolLogo.onload = function () {
        const logoX = 250;
        const logoY = 50;

        // Draw School Logo
        ctx.globalCompositeOperation = "source-over"; // Ensure normal drawing mode
       // ctx.drawImage(schoolLogo, logoX, logoY, 100, 100);

        // Add Separator Line
        // ctx.strokeStyle = "#ffffff";
        // ctx.lineWidth = 2;
        // ctx.beginPath();
        // ctx.moveTo(10, 540);
        // ctx.lineTo(canvas.width - 10, 540);
        // ctx.stroke();

        // // Add Exam Title
        // ctx.font = "bold 30px Arial";
        // ctx.fillStyle = "#f39c12";
        // ctx.textAlign = "center";
        // ctx.fillText("examSelect" + " ASSESSMENT", canvas.width / 2, 40);
        // ctx.fillText("TOPPERS", canvas.width / 2, 75);

        // // Add School Name and Address
        // ctx.font = "italic 12px Arial";
        // ctx.fillStyle = "#ffffff";
        // ctx.fillText("KATTILANGADI YATHEEMKHANA HIGHER SECONDARY SCHOOL", canvas.width / 2, 563);
        // ctx.fillText("ATHAVANAD - 19094", canvas.width / 2, 579);

        // Show Preview
        document.getElementById("posterPreview").style.display = "block";
          hideLoader();
      };

      // Handle School Logo Load Error
      schoolLogo.onerror = function () {
        showErrorMessage("Error loading the school logo.");
          hideLoader();
      };
    

    // Handle Broken Student Photo
    photo.onerror = function () {
      showErrorMessage("Error loading the student photo. Unable to create the poster.");
        hideLoader();
    };
    
  };

  // Handle Background Image Load Error
  background.onerror = function () {
    showErrorMessage("Error loading the background image.");
      hideLoader();
  };
}

// Helper Function to Draw Text Blocks with Rounded Rectangles
function drawTextBlock(ctx, text, x, y, width, height, textColor, font, bgColor) {
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - height / 2, width, height, 10);
  ctx.fill();

  ctx.fillStyle = textColor;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

// Add Rounded Rectangle Function to Canvas API
CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  this.beginPath();
  this.moveTo(x + r, y);
  this.arcTo(x + w, y, x + w, y + h, r);
  this.arcTo(x + w, y + h, x, y + h, r);
  this.arcTo(x, y + h, x, y, r);
  this.arcTo(x, y, x + w, y, r);
  this.closePath();
  return this;
};

//generatePoster('aslaha', '', '', 'studentImage');

function closePreview() {
  document.getElementById("posterPreview").style.display = "none";
}

function downloadPoster() {
  const canvas = document.getElementById("posterCanvas");
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "poster.png";
  link.click();
}

function generateReport(studentsList,curYear) {
    const reporttype = document.getElementById("reposrSelect").value;
    let studentsData = ""
    if(reporttype==="All"){
        studentsData=studentsList
    }
    else{
       var reportdata = studentsList.filter(student => student.year === curYear);
       reportdata.sort((a, b) => {
  return a.currentClass.localeCompare(b.currentClass);
});
studentsData=reportdata;
    }
    const reportContainer = document.getElementById('reportContainer');
    const reportContainerkg = document.getElementById('reportContainerkg');

    reportContainer.innerHTML = ''; // Clear previous content
    reportContainerkg.innerHTML = ''; // Clear previous content

    const table = document.createElement('table');
    table.classList.add('report-table');

    const tablekg = document.createElement('table');
    tablekg.classList.add('report-table');

    // Table Header
    const createTableHeader = (table) => {
        const headerRow = table.insertRow();
        headerRow.innerHTML = `
            <th>Class</th>
            <th>Division</th>
            <th>Male</th>
            <th>Female</th>
            <th>Total</th>
        `;
    };

    createTableHeader(table);
    createTableHeader(tablekg);

    // Extract unique classes
    const uniqueClasses = [...new Set(studentsData.map(student => student.currentClass.split(" ")[0]))];

    let totalMale = 0;
    let totalFemale = 0;
    let totalMalekg = 0;
    let totalFemalekg = 0;

    uniqueClasses.forEach(className => {
        // Extract unique divisions for this class
        const divisions = [...new Set(
            studentsData
                .filter(student => student.currentClass.startsWith(className + " "))
                .map(student => student.currentClass.split(" ")[1])
        )];

        let classTotalMale = 0;
        let classTotalFemale = 0;

        divisions.forEach(division => {
            const maleCount = studentsData.filter(student =>
                student.currentClass === `${className} ${division}` && student.gender === "Male"
            ).length;

            const femaleCount = studentsData.filter(student =>
                student.currentClass === `${className} ${division}` && student.gender === "Female"
            ).length;

            let row;
            if (className === 'LKG' || className === 'UKG') {
                row = tablekg.insertRow();
            } else {
                row = table.insertRow();
            }

            row.innerHTML = `
                <td>${className}</td>
                <td>${division}</td>
                <td>${maleCount}</td>
                <td>${femaleCount}</td>
                <td>${maleCount + femaleCount}</td>
            `;
                if(className==='LKG'||className === 'UKG'){
                    totalMalekg += maleCount;
            totalFemalekg += femaleCount;
                }else{
                    totalMale += maleCount;
                    totalFemale += femaleCount;
                }
            classTotalMale += maleCount;
            classTotalFemale += femaleCount;
            
        });

        // Add row for class total
        if (className === 'LKG' || className === 'UKG' || className === "8") {
            const totalRow = (className === 'LKG' || className === 'UKG') ? tablekg.insertRow() : table.insertRow();
            totalRow.innerHTML = `
                <td><b>${className} (Total)</b></td>
                <td>-</td>
                <td><b>${classTotalMale}</b></td>
                <td><b>${classTotalFemale}</b></td>
                <td><b>${classTotalMale + classTotalFemale}</b></td>
            `;
            totalRow.style.background = "#f0f0f0"; // Light gray background for total rows
        }
    });

    // Overall Total Row
    const overallTotalRow = table.insertRow();
    overallTotalRow.innerHTML = `
        <td><b>OVERALL (Total)</b></td>
        <td>-</td>
        <td><b>${totalMale}</b></td>
        <td><b>${totalFemale}</b></td>
        <td><b>${totalMale + totalFemale}</b></td>
    `;
    overallTotalRow.style.background = "green"; // Slightly darker gray for total row

// Overall Total Row
const overallTotalRowkg = tablekg.insertRow();
    overallTotalRowkg.innerHTML = `
        <td><b>OVERALL (Total)</b></td>
        <td>-</td>
        <td><b>${totalMalekg}</b></td>
        <td><b>${totalFemalekg}</b></td>
        <td><b>${totalMalekg + totalFemalekg}</b></td>
    `;
    overallTotalRowkg.style.background = "green"; // Slightly darker gray for total row


    // Append tables to containers
    reportContainer.appendChild(table);
    reportContainerkg.appendChild(tablekg);
}




function loadData(){
    let updatedAt=null;
    const storedData = localStorage.getItem("students");
    let studentsData; // Declare studentsData outside the if block.
    if (storedData) {
        try {
            const parsedData = JSON.parse(storedData);
            studentsData = parsedData.students;
            updatedAt = parsedData.updatedAt;
            console.log(studentsData);
           // generateReport(studentsData);
            generateTable();
            console.log("Students:", studentsData);
            console.log("Last Updated:", new Date(updatedAt));
        } catch (error) {
            console.error("Error parsing stored student data:", error);
        }

    }

    loadStudentTable('new',updatedAt);
    // you can now use studentsData here, but it may be undefined.
}

function getLocalStorageSize() {
    let total = 0;

    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += localStorage.getItem(key).length;
        }
    }

    // Convert bytes to KB and MB
    let sizeKB = (total / 1024).toFixed(2);
    let sizeMB = (total / (1024 * 1024)).toFixed(2);

    return { bytes: total, kilobytes: sizeKB, megabytes: sizeMB };
}

// Example Usage



function clearLocalStorage() {
    if (showConfirmationMessage("Are you sure you want to clear all local storage data?")) {
        localStorage.clear();
        console.log("LocalStorage has been cleared.");
    } else {
        console.log("LocalStorage clear canceled.");
    }
}

// Example Usage
if(storageSize.megabytes>=5){
    clearLocalStorage();
}
let lastUpdated = null;

        async function fetchLastUpdatedTime() {
            const response = await fetch("https://script.google.com/macros/s/AKfycbyFVRUjvnf3dj5uh0m6BCAiPCWHdmyxV9HvTjEfTB29LWAy7kC5vk96qPDFqwz1JlOK/exec?action=getLastUpdatedTime");
            const data = await response.json();
            return data;
        }

        // async function fetchStudents() {
        //     const response = await fetch("https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getAllStudents");
        //     const students = await response.json();

        //     const container = document.getElementById("studentsContainer");
        //     container.innerHTML = "<ul>" + students.map(s => `<li>${s.NAME} - ${s.CLASS}</li>`).join('') + "</ul>";
        // }

        async function checkForUpdates() {
    try {
        //const lastUpdated2 = await fetchLastUpdatedTime();
        const response = await fetchLastUpdatedTime();
        console.log(response);
        if (!response || !response.success ) {
            console.error("Error fetching or invalid format for update times.");
            return;
        }
        const newTimestamps = response.times;
        const lastUpdatedRecord = await getStoreById('students');
        const dbLastUpdated = lastUpdatedRecord?.time ? new Date(lastUpdatedRecord.time) : null;

        const studentUpdate = newTimestamps.find(time => time.sheetName === "Students");

        if (studentUpdate && studentUpdate.lastUpdated) {
            const serverLastUpdated = new Date(studentUpdate.lastUpdated);
            console.log("Server last updated:", serverLastUpdated.toLocaleString());
            console.log("DB last updated:", dbLastUpdated ? dbLastUpdated.toLocaleString() : null);

            if (!dbLastUpdated || serverLastUpdated > dbLastUpdated) {
                console.log("Student data updated on server. Loading new data...");
                loadstudents();
            } else {
                console.log("Local student data is up to date.");
            }
        } else {
            console.log("No 'Students' update information found on the server.");
        }

        console.log("Checked for student updates.");
        console.log('iam very ok');

    } catch (error) {
        console.error("Error checking for updates:", error);
    }
}



//</script>
