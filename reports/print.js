 // Global variables
 let defaultHeaders = [
    { id: 'slNo', name: 'SL No', field: 'index', visible: true },
    { id: 'photo', name: 'Photo', field: 'image', visible: true },
    { id: 'adNumber', name: 'AD Number', field: 'adNumber', visible: true },
    { id: 'name', name: 'Name', field: 'name', visible: true },
    { id: 'gender', name: 'Gender', field: 'gender', visible: true },
    { id: 'currentClass', name: 'Class', field: 'currentClass', visible: true },
    { id: 'fatherName', name: 'Father Name', field: 'fatherName', visible: false },
    { id: 'fatherMobile', name: 'Father Mobile', field: 'fatherMobile', visible: false },
    { id: 'houseName', name: 'House', field: 'houseName', visible: false },
    { id: 'whatsappNo', name: 'WhatsApp No', field: 'whatsappNo', visible: false },
    { id: 'vehicleStage', name: 'Vehicle Stage', field: 'vehicleStage', visible: false },
    { id: 'vehiclePoint', name: 'Vehicle Point', field: 'vehiclePoint', visible: false }
  ];
  
  let customHeaders = [];
  let selectedHeaders = [];
  let columnSizes = {};
  let photoFile = [];

  // Load saved data from localStorage
  function loadSavedData() {
    try {
      // Load column sizes
      const savedSizes = localStorage.getItem('columnSizes');
      if (savedSizes) columnSizes = JSON.parse(savedSizes);
      
      // Load custom headers
      const savedCustomHeaders = localStorage.getItem('customHeaders');
      if (savedCustomHeaders) customHeaders = JSON.parse(savedCustomHeaders);
      
      // Load selected headers
      const savedSelectedHeaders = localStorage.getItem('selectedHeaders');
      selectedHeaders = savedSelectedHeaders ? JSON.parse(savedSelectedHeaders) : defaultHeaders.filter(h => h.visible);
      
      // Load secondary header
      const savedSecondaryHeader = localStorage.getItem('secondaryHeader');
      if (savedSecondaryHeader) {
        document.getElementById('secondaryHeader').value = savedSecondaryHeader;
        document.getElementById('displaySecondaryHeader').textContent = savedSecondaryHeader;
      }
      
      console.log("Loaded data:", { selectedHeaders, customHeaders, columnSizes });
    } catch (e) {
      console.error("Error loading saved data:", e);
      // Reset to defaults if loading fails
      selectedHeaders = defaultHeaders.filter(h => h.visible);
    }
  }

  // Save column sizes to localStorage
  function saveColumnSizes() {
    try {
      // Update column sizes from current table
      updateColumnSizesFromTable();
      localStorage.setItem('columnSizes', JSON.stringify(columnSizes));
      localStorage.setItem('selectedHeaders', JSON.stringify(selectedHeaders));
      localStorage.setItem('customHeaders', JSON.stringify(customHeaders));
      
      showAlert('success', 'All settings saved successfully!');
    } catch (e) {
      console.error("Error saving column sizes:", e);
      showAlert('danger', 'Failed to save settings');
    }
  }
  
  function updateColumnSizesFromTable() {
    const table = document.querySelector('table');
    if (!table) return;
    
    const headers = table.querySelectorAll('th');
    headers.forEach(header => {
      const headerId = header.getAttribute('data-id');
      if (headerId) {
        columnSizes[headerId] = header.offsetWidth;
      }
    });
  }

  // Initialize the header items for selection and ordering
  function initHeaderItems() {
    const container = document.getElementById('headerItems');
    if (!container) return;
    
    container.innerHTML = '';
    const allHeaders = [...defaultHeaders, ...customHeaders];
    
    // Create items based on current selectedHeaders order
    selectedHeaders.forEach(selectedHeader => {
      const header = allHeaders.find(h => h.id === selectedHeader.id);
      if (header) createHeaderItem(container, header, true);
    });
    
    // Add remaining headers that aren't selected
    allHeaders.forEach(header => {
      if (!selectedHeaders.some(h => h.id === header.id)) {
        createHeaderItem(container, header, false);
      }
    });
  }
  
  function createHeaderItem(container, header, isSelected) {
    const item = document.createElement('div');
    item.className = 'header-item';
    item.setAttribute('data-id', header.id);
    item.draggable = true;
    
    if (isSelected) item.classList.add('selected');
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `check_${header.id}`;
    checkbox.checked = isSelected;
    checkbox.addEventListener('change', function() {
      item.classList.toggle('selected');
    });
    
    const label = document.createElement('label');
    label.htmlFor = `check_${header.id}`;
    label.textContent = header.name;
    
    const dragHandle = document.createElement('i');
    dragHandle.className = 'fas fa-grip-lines drag-handle';
    
    item.appendChild(checkbox);
    item.appendChild(label);
    item.appendChild(dragHandle);
    
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
    
    container.appendChild(item);
  }

  // Drag and drop functionality
  let draggedItem = null;
  
  function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.style.opacity = '0.4';
  }
  
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
  }
  
  function handleDrop(e) {
    e.stopPropagation();
    
    if (draggedItem !== this) {
      const container = document.getElementById('headerItems');
      const items = Array.from(container.children);
      const draggedIndex = items.indexOf(draggedItem);
      const targetIndex = items.indexOf(this);
      
      if (draggedIndex < targetIndex) {
        container.insertBefore(draggedItem, this.nextSibling);
      } else {
        container.insertBefore(draggedItem, this);
      }
    }
    return false;
  }
  
  function handleDragEnd() {
    this.style.opacity = '1';
    draggedItem = null;
  }

  // Add a new column
  function addNewColumn() {
    const columnName = document.getElementById('newColumnName').value.trim();
    if (!columnName) {
      showAlert('warning', 'Please enter a column name');
      return;
    }
    
    const columnId = 'custom_' + Date.now();
    const newHeader = { 
      id: columnId, 
      name: columnName, 
      field: columnId,
      visible: true,
      custom: true
    };
    
    customHeaders.push(newHeader);
    selectedHeaders.push(newHeader);
    
    try {
      localStorage.setItem('customHeaders', JSON.stringify(customHeaders));
      localStorage.setItem('selectedHeaders', JSON.stringify(selectedHeaders));
      
      document.getElementById('newColumnName').value = '';
      initHeaderItems();
      filterStudentTable();
      
      showAlert('success', 'Column added successfully!');
    } catch (e) {
      console.error("Error saving new column:", e);
      showAlert('danger', 'Failed to add column');
    }
  }

  // Apply header selection and order
  function applyHeaderSelection() {
    showWaiting();
    const container = document.getElementById('headerItems');
    if (!container) return;
    
    const items = Array.from(container.children);
    const allHeaders = [...defaultHeaders, ...customHeaders];
    selectedHeaders = [];
    
    items.forEach(item => {
      const headerId = item.getAttribute('data-id');
      const checkbox = item.querySelector('input[type="checkbox"]');
      
      if (checkbox.checked) {
        const header = allHeaders.find(h => h.id === headerId);
        if (header) {
          selectedHeaders.push({
            id: header.id,
            name: header.name,
            field: header.field,
            visible: true
          });
        }
      }
    });
    
    try {
      localStorage.setItem('selectedHeaders', JSON.stringify(selectedHeaders));
      
      const secondaryHeader = document.getElementById('secondaryHeader').value;
      document.getElementById('displaySecondaryHeader').textContent = secondaryHeader;
      localStorage.setItem('secondaryHeader', secondaryHeader);
      
      filterStudentTable();
      hideWaiting();
      showAlert('success', 'Headers applied successfully!');
    } catch (e) {
      console.error("Error applying header selection:", e);
      hideWaiting()
      showAlert('danger', 'Failed to apply headers');
    }
  }

  // Initialize column resizing
  function initColumnResizing() {
    const table = document.querySelector('table');
    if (!table) return;
    
    const headers = table.querySelectorAll('th');
    
    headers.forEach((header, index) => {
      // Remove existing resizer if any
      const existingResizer = header.querySelector('.column-resizer');
      if (existingResizer) header.removeChild(existingResizer);
      
      // Add new resizer element
      const resizer = document.createElement('div');
      resizer.className = 'column-resizer';
      header.appendChild(resizer);
      
      // Set initial width if saved
      const headerId = header.getAttribute('data-id');
      if (headerId && columnSizes[headerId]) {
        header.style.width = columnSizes[headerId] + 'px';
      }
      
      // Add resize event listener
      let startX, startWidth;
      
      resizer.addEventListener('mousedown', function(e) {
        startX = e.pageX;
        startWidth = header.offsetWidth;
        
        document.addEventListener('mousemove', resizeColumn);
        document.addEventListener('mouseup', stopResize);
        
        e.preventDefault();
      });
      
      function resizeColumn(e) {
        const width = startWidth + (e.pageX - startX);
        if (width > 50) { // Minimum width
          header.style.width = width + 'px';
          
          // Store the size
          const headerId = header.getAttribute('data-id');
          if (headerId) {
            columnSizes[headerId] = width;
          }
        }
      }
      
      function stopResize() {
        document.removeEventListener('mousemove', resizeColumn);
        document.removeEventListener('mouseup', stopResize);
      }
    });
  }

  // Load class dropdown
  async function loadDropdown() {
    showWaiting();
    let settings = {
      //"currentClass": className,
      "userMail":"office@gmail.com",
      "type": "new",
      "storeName": "adStudents",
      "indexName": "",
      "query": "",
      "curYear":curYear
    };
    //showWaiting("myStudents");
  let students = await get(settings); // Assumes getAllRecords returns a promise
                    
    try {
      const studentsData = await get(settings);// await getAllStudents();
      hideWaiting();
      const uniqueClasses = [...new Set(studentsData.map(student => student.currentClass))];
      uniqueClasses.sort((a, b) => a.localeCompare(b));
      
      const select = document.getElementById("select");
      if (select) {
        select.innerHTML = `<option value="" disabled selected>Select Class</option>` +
          uniqueClasses
            .map(className => className ? `<option value="${className}">${className}</option>` : "")
            .join('');
      }
    } catch (e) {
      hideWaiting();
      console.error("Error loading dropdown:", e);
      showAlert('danger', 'Failed to load class list');
    }
  }

  // Filter student table
  async function filterStudentTable() {
    showWaiting();
    try {
      const searchInput = document.getElementById('searchInput').value.toLowerCase();
      const select = document.getElementById('select').value.toLowerCase();
      const students = await getAllStudents();
      
      if (!students || students.length === 0) {
        showAlert('info', 'No student data found');
        return;
      }
      
      const filteredStudents = students.filter(student => {
        const currentClassLower = (student.currentClass || '').toLowerCase();
        const nameLower = (student.name || '').toString().toLowerCase();
        const adNumberLower = (typeof student.adNumber === 'string' ? student.adNumber.toLowerCase() : '');
        
        const classMatches = select === '' || currentClassLower === select;
        const searchMatches = searchInput === '' || 
                             nameLower.includes(searchInput) || 
                             adNumberLower.includes(searchInput);
        
        return classMatches && searchMatches;
      });
      hideWaiting();
      renderStudentTable(filteredStudents, 'studentTableContainer');
    } catch (e) {
      hideWaiting();
      console.error("Error filtering table:", e);
      showAlert('danger', 'Failed to filter students');
    }
  }

  // Render student table based on selected headers
  function renderStudentTable(students, divid) {
    hideLoader();
    photoFile = []; 
    const container = document.getElementById(divid);
    if (!container) return;
    
    if (!students || students.length === 0) {
      container.innerHTML = '<div class="alert alert-info">No students found matching your criteria</div>';
      return;
    }
    
    // Create table header based on selected headers
    let tableHeaders = '';
    selectedHeaders.forEach(header => {
      tableHeaders += `<th data-id="${header.id}">${header.name}</th>`;
    });
    students.sort((a, b) => {
return a.name.localeCompare(b.name);
});
    // Create table rows
    let tableRows = '';
    students.forEach((student, index) => {
      let row = `<tr ${ 'class="text-center ' & student.gender === "Female" ? "gender" : ""}">`;
      
      selectedHeaders.forEach(header => {
        let cellContent = '';
        const field = header.field;
        
        if (field === 'index') {
          cellContent = index + 1;
        } 
        else if (field === 'image') {
          const imgId = `pic${index + 1}`;
          photoFile.push({ adNumber: student.stu_id, divId: imgId });
          cellContent = `
            <div class="image-container image-thumbnail">
              <img id="${imgId}" class="image-thumbnail img-fluid" 
                   src="https://drive.google.com/thumbnail?id=${student.image}&sz=800" 
                   alt="${student.stu_id}">
            </div>`;
        }
        else {
          cellContent = student[field] || '';
        }
        
        // Apply special styling for certain fields
        const specialStyle = field === 'name' || field === 'houseName' ? 'style="color:red;"' : '';
        row += `<td ${specialStyle}>${cellContent}</td>`;
      });
      
      row += '</tr>';
      tableRows += row;
    });
    
    const tableHTML = `
      <table class='table table-hover table-bordered'>
        <thead>
          <tr>${tableHeaders}</tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>`;
    
    container.innerHTML = tableHTML;
    
    // Initialize column resizing after table is rendered
    initColumnResizing();
    
    // Apply photo toggle state
    const toggleColumn = document.getElementById('toggleColumn');
    if (toggleColumn) {
      togglePhotoColumn(toggleColumn.checked);
    }
  }
  
  // Toggle photo column visibility
  function togglePhotoColumn(show) {
    const table = document.querySelector("table");
    if (!table) return;
    
    // Find the index of the photo column
    const photoIndex = selectedHeaders.findIndex(h => h.field === 'image');
    if (photoIndex === -1) return;
    
    // Select all cells in that column (add 1 because nth-child is 1-based)
    const cells = table.querySelectorAll(`tr td:nth-child(${photoIndex + 1}), tr th:nth-child(${photoIndex + 1})`);
    
    cells.forEach(cell => {
      if (show) {
        cell.classList.remove("hide-column");
      } else {
        cell.classList.add("hide-column");
      }
    });
  }

  // Show alert message
  function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    `;
    
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Add new alert to the top of the container
    const container = document.querySelector('.container-fluid');
    if (container) {
      container.insertBefore(alertDiv, container.firstChild);
      
      // Auto dismiss after 3 seconds
      setTimeout(() => {
        $(alertDiv).alert('close');
      }, 3000);
    }
  }
  
  // Reset to default settings
  function resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      try {
        localStorage.removeItem('selectedHeaders');
        localStorage.removeItem('customHeaders');
        localStorage.removeItem('columnSizes');
        
        selectedHeaders = defaultHeaders.filter(h => h.visible);
        customHeaders = [];
        columnSizes = {};
        
        document.getElementById('secondaryHeader').value = 'Class Wise Details';
        document.getElementById('displaySecondaryHeader').textContent = 'Class Wise Details';
        document.getElementById('toggleColumn').checked = true;
        
        initHeaderItems();
        filterStudentTable();
        
        showAlert('success', 'Settings reset to defaults');
      } catch (e) {
        console.error("Error resetting settings:", e);
        showAlert('danger', 'Failed to reset settings');
      }
    }
  }

  
  function initColumnResizing() {
    const table = document.querySelector('table');
    if (!table) return;
    
    const headers = table.querySelectorAll('th');
    
    headers.forEach(header => {
      // Remove existing resizer if any
      const existingResizer = header.querySelector('.column-resizer');
      if (existingResizer) header.removeChild(existingResizer);
      
      // Add new resizer element
      const resizer = document.createElement('div');
      resizer.className = 'column-resizer';
      header.appendChild(resizer);
      
      // Set initial width if saved
      const headerId = header.getAttribute('data-id');
      if (headerId && columnSizes[headerId]) {
        header.style.width = columnSizes[headerId] + 'px';
      } else {
        // Set reasonable default widths based on content type
        const defaultWidths = {
          'slNo': '60px',
          'photo': '80px',
          'adNumber': '100px',
          'name': '150px',
          'gender': '80px',
          'currentClass': '100px',
          'fatherName': '150px',
          'fatherMobile': '120px',
          'houseName': '120px',
          'whatsappNo': '120px',
          'vehicleStage': '120px',
          'vehiclePoint': '120px'
        };
        
        if (defaultWidths[headerId]) {
          header.style.width = defaultWidths[headerId];
        }
      }
      
      // Add resize event listener
      resizer.addEventListener('mousedown', initResize, false);
    });
    
    function initResize(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const header = e.target.parentElement;
      const startX = e.clientX;
      const startWidth = header.offsetWidth;
      const table = header.closest('table');
      const tableWidth = table.offsetWidth;
      
      e.target.classList.add('active');
      
      document.addEventListener('mousemove', doResize);
      document.addEventListener('mouseup', stopResize);
      
      function doResize(e) {
        let newWidth = startWidth + (e.clientX - startX);
        
        // Constrain to min/max widths
        newWidth = Math.max(50, newWidth);
        newWidth = Math.min(500, newWidth);
        
        header.style.width = newWidth + 'px';
        
        // Adjust table width to prevent overflow
        table.style.width = 'auto';
      }
      
      function stopResize() {
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);
        
        const resizers = document.querySelectorAll('.column-resizer');
        resizers.forEach(r => r.classList.remove('active'));
        
        // Save the new size
        const headerId = header.getAttribute('data-id');
        if (headerId) {
          columnSizes[headerId] = header.offsetWidth;
        }
      }
    }
  }
  
  // Print preview function
  function showPrintPreview() {
    const table = document.querySelector('#studentTableContainer').cloneNode(true);
    
    // Apply print-specific styles
    table.querySelectorAll('th, td').forEach(cell => {
      cell.style.whiteSpace = 'nowrap';
      cell.style.overflow = 'hidden';
      cell.style.textOverflow = 'ellipsis';
    });
    
    // Update the preview content
    const previewContent = document.getElementById('printPreviewContent');
    previewContent.innerHTML = '';
    previewContent.appendChild(table);
    
    // Show the modal
    $('#printPreviewModal').modal('show');
  }

  function printRuns (){
    // Initialize the page
  document.addEventListener('DOMContentLoaded', function() {
    loadSavedData();
    initHeaderItems();
    loadDropdown();
    filterStudentTable();
    
    // Event listeners
    document.getElementById('secondaryHeader').addEventListener('input', function() {
      document.getElementById('displaySecondaryHeader').textContent = this.value;
    });
    
    document.getElementById('toggleColumn').addEventListener('change', function() {
      togglePhotoColumn(this.checked);
    });
  });

  }