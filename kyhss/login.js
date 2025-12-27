
 document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // --- ✅ FIX: Define roleSelect before using it ---
    const roleSelect = document.getElementById('role-select');

    const submitButton = e.target.querySelector('button[type="submit"]');
    if (!submitButton) return;

    const originalButtonHtml = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing In...`;

    try {
        // Now this line will work correctly
        const activeRole = roleSelect.value.replace('-login-view', '');

        if (activeRole === 'teacher') {
            const email = document.getElementById('teacher-useremail').value.toLowerCase();
            const password = document.getElementById('teacher-password').value;
            
            if (!email || !password) {
               window.showAlert('Please enter email and password.', 'danger');
                return;
            }

            const localTeacher = await window.appDb.teachers.where('email').equalsIgnoreCase(email).first();
            
            if (localTeacher && password === (localTeacher.mobile || '').slice(-5)) {
                window.showAlert('Logged in from local cache.', 'success');
                onLoginSuccess('teacher', localTeacher);
                return;
            }

            if (!navigator.onLine) {
                window.showAlert('Offline login failed.', 'danger');
                return;
            }

            const q = query(window.getCollectionRef('teachers'), where('email', '==', email));
            const qs = await getDocs(q);

            if (qs.empty) {
                window.showAlert('Teacher email not found.', 'danger');
            } else {
                const docSnap = qs.docs[0];
                const t = { id: docSnap.id, ...docSnap.data() };
                
                if (password === (t.mobile || '').slice(-5)) {
                    await window.appDb.teachers.put(t);
                    window.showAlert('Logged in from server.', 'success');
                    
                    // Session saving
                    const session = { role: 'teacher', userId: t.id, timestamp: Date.now() };
                    localStorage.setItem('schoolAppUserSession', JSON.stringify(session));
                    
                    onLoginSuccess('teacher', t);
                } else {
                    window.showAlert('Incorrect password.', 'danger');
                }
            }
        } 
        
        else if (activeRole === 'student') {
            const admn = document.getElementById('student-admn').value.toUpperCase();
            const dob = document.getElementById('student-dob').value;
            
            if (!admn || !dob) {
                window.showAlert('Please enter Admission No. and Year.', 'danger');
                return;
            }

            const local = await window.appDb.students.where('admissionNumber').endsWithIgnoreCase(admn).first();
            
            if (local && dob === (local.dob || '').split('-')[0]) {
                window.showAlert('Logged in from local cache.', 'success');
                onLoginSuccess('student', local);
                return;
            }

            if (!navigator.onLine) {
               window. showAlert('Offline login failed.', 'danger');
                return;
            }

            const all = await getDocs(window.getCollectionRef('students'));
            let found = null;
            
            // Note: This loop might be slow for large databases. 
            // Consider storing a dedicated 'searchableAdmission' field in Firestore.
            all.forEach(doc => {
                const s = doc.data();
                if (s.admissionNumber && s.admissionNumber.toUpperCase().endsWith(admn))
                    found = { id: doc.id, ...s };
            });

            if (found) {
                if (dob === (found.dob || '').split('-')[0]) {
                    await window.appDb.students.put(found);
                    window.showAlert('Logged in from server.', 'success');
                    onLoginSuccess('student', found);
                } else {
                    window.showAlert('Incorrect year of birth.', 'danger');
                }
            } else {
                window.showAlert('Student not found.', 'danger');
            }
        } 
        
        else if (activeRole === 'admin') {
            const email = document.getElementById('admin-user').value.toLowerCase();
            const pass = document.getElementById('admin-pass').value;
            
            if (!email || !pass) {
                showAlert('Please enter admin email and password.', 'danger');
                return;
            }
            
            const localAdmin = await window.appDb.teachers.where('email').equalsIgnoreCase(email).first();
            
            if (localAdmin && localAdmin.role === 'admin' && pass === (localAdmin.mobile || '').slice(-5)) {
                window.showAlert('Logged in as Admin (cache).', 'success');
                onLoginSuccess('admin', localAdmin);
                return;
            }

            if (!navigator.onLine) {
                window.showAlert('Offline admin login failed.', 'danger');
                return;
            }

            window.showAlert('Checking server...', 'info');
            const q = query(window.getCollectionRef('teachers'), where('email', '==', email));
            const qs = await getDocs(q);

            if (qs.empty) {
                window.showAlert('Admin not found.', 'danger');
            } else {
                const d = qs.docs[0];
                const a = { id: d.id, ...d.data() };
                
                if (a.role === 'admin') {
                    if (pass === (a.mobile || '').slice(-5)) {
                        onLoginSuccess('admin', a);
                    } else {
                            window.showAlert('Incorrect admin password.', 'danger');
                    }
                } else {
                    window.showAlert('No admin privilege.', 'danger');
                }
            }
        }
    } catch (e) {
        console.error("Login Error:", e);
        window.showAlert('An error occurred during login.', 'danger');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonHtml;
        
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    // 1. Unsubscribe from all active Firestore listeners
    unsubscribeAllListeners();

    // 2. Destroy any active charts
    if(window.attendanceChart) { 
        window.attendanceChart.destroy(); 
        window.attendanceChart = null; 
    }

    try {
        // 3. Close the active connection to the database.
        console.log('Closing IndexedDB connection...');
        window.appDb.close();

        // 4. Delete the entire 'SchoolAppDB' database.
        console.log('Deleting IndexedDB database...');
        await Dexie.delete('SchoolAppDB'); 
        console.log('IndexedDB database has been deleted successfully.');

        // --- THIS IS THE NEW PART ---
        // 5. Clear the saved session data from localStorage
        localStorage.removeItem('schoolAppUserSession');
        localStorage.removeItem('schoolAppLastState');
        // --- END NEW PART ---

        // 6. After deletion is successful, update the UI and reload
        document.getElementById('main-app').classList.remove('active');
        document.getElementById('login-screen').classList.add('active');
        window.location.reload();

    } catch (error) {
        console.error('Failed to delete IndexedDB or clear session:', error);
            window.showAlert('Error during logout. You may need to clear your browser cache manually.', 'danger');
        
        // As a fallback, still try to log the user out visually
        document.getElementById('main-app').classList.remove('active');
        document.getElementById('login-screen').classList.add('active');
    }
});

async function onLoginSuccess(role, user) { 
            document.getElementById('login-screen').classList.remove('active');
        document.getElementById('login-screen').classList.add('d-none');
    window.currentUserRole = role;
    window.selectedUser = user;
   // unsubscribeAllListeners();

    window.showMainApp(); // Render the main app layout
    window.getData ('customNotifications');
}
