// Authentication Module
let auth;
let currentUser = null;

// Initialize Authentication
function initAuth() {
    if (typeof firebase === 'undefined' || !firebaseConfig) {
        console.error('Firebase not initialized properly');
        return;
    }

    auth = firebase.auth();
    
    // Listen for auth state changes
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            onUserLoggedIn(user);
        } else {
            currentUser = null;
            onUserLoggedOut();
        }
    });
    
    setupAuthEventListeners();
}

// Setup event listeners for auth forms
function setupAuthEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    // Toggle between login and signup
    const showSignupBtn = document.getElementById('showSignup');
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showSignupScreen();
        });
    }
    
    const showLoginBtn = document.getElementById('showLogin');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginScreen();
        });
    }
    
    // Forgot password link
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleForgotPassword();
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Handle forgot password
async function handleForgotPassword() {
    const email = document.getElementById('loginEmail').value.trim();
    
    if (!email) {
        alert('Please enter your email address first, then click Forgot Password');
        document.getElementById('loginEmail').focus();
        return;
    }
    
    if (!confirm(`Send password reset email to ${email}?`)) {
        return;
    }
    
    try {
        await auth.sendPasswordResetEmail(email);
        alert(`Password reset email sent to ${email}. Please check your inbox (and spam folder).`);
    } catch (error) {
        console.error('Password reset error:', error);
        if (error.code === 'auth/user-not-found') {
            alert('No account found with this email address.');
        } else if (error.code === 'auth/invalid-email') {
            alert('Please enter a valid email address.');
        } else {
            alert('Failed to send reset email. Please try again.');
        }
    }
}
// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    try {
        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Logging in...<span class="loading-spinner"></span>';
        
        await auth.signInWithEmailAndPassword(email, password);
        
        // Clear error and form
        errorElement.textContent = '';
        errorElement.classList.remove('show');
        e.target.reset();
        
    } catch (error) {
        console.error('Login error:', error);
        errorElement.textContent = getAuthErrorMessage(error.code);
        errorElement.classList.add('show');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Login';
    }
}

// Handle signup
async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const errorElement = document.getElementById('signupError');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    try {
        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Creating account...<span class="loading-spinner"></span>';
        
        // Create user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update profile with name
        await userCredential.user.updateProfile({
            displayName: name
        });
        
        // Create user document in Firestore
        if (typeof db !== 'undefined') {
            await db.collection('users').doc(userCredential.user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Clear error and form
        errorElement.textContent = '';
        errorElement.classList.remove('show');
        e.target.reset();
        
        // Show success message
        const successMsg = document.createElement('p');
        successMsg.className = 'success-message show';
        successMsg.textContent = 'Account created successfully! Redirecting...';
        errorElement.parentNode.insertBefore(successMsg, errorElement);
        
        setTimeout(() => successMsg.remove(), 2000);
        
    } catch (error) {
        console.error('Signup error:', error);
        errorElement.textContent = getAuthErrorMessage(error.code);
        errorElement.classList.add('show');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign Up';
    }
}

// Handle logout
async function handleLogout() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
}

// Show login screen
function showLoginScreen() {
    const loginContainer = document.getElementById('loginContainer');
    const signupContainer = document.getElementById('signupContainer');
    
    if (loginContainer) loginContainer.style.display = 'flex';
    if (signupContainer) signupContainer.style.display = 'none';
}

// Show signup screen
function showSignupScreen() {
    const loginContainer = document.getElementById('loginContainer');
    const signupContainer = document.getElementById('signupContainer');
    
    if (loginContainer) loginContainer.style.display = 'none';
    if (signupContainer) signupContainer.style.display = 'flex';
}

// When user logs in
function onUserLoggedIn(user) {
    // Hide auth screens
    const loginContainer = document.getElementById('loginContainer');
    const signupContainer = document.getElementById('signupContainer');
    const appContainer = document.getElementById('appContainer');
    
    if (loginContainer) loginContainer.style.display = 'none';
    if (signupContainer) signupContainer.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';
    
    // Update user display name
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        const displayName = user.displayName || user.email.split('@')[0];
        userNameDisplay.textContent = `👤 ${displayName}`;
    }
    
    // Load user's expenses if the function exists
    if (typeof loadUserExpenses === 'function') {
        loadUserExpenses();
    }
}

// When user logs out
function onUserLoggedOut() {
    // Show login screen
    const loginContainer = document.getElementById('loginContainer');
    const signupContainer = document.getElementById('signupContainer');
    const appContainer = document.getElementById('appContainer');
    
    if (loginContainer) loginContainer.style.display = 'flex';
    if (signupContainer) signupContainer.style.display = 'none';
    if (appContainer) appContainer.style.display = 'none';
    
    // Clear user data
    if (typeof clearExpenseData === 'function') {
        clearExpenseData();
    }
}

// Get user-friendly error messages
function getAuthErrorMessage(errorCode) {
    const errorMessages = {
        'auth/user-not-found': 'No account found with this email address.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password': 'Password should be at least 6 characters long.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/network-request-failed': 'Network error. Please check your internet connection.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
        'auth/invalid-credential': 'Invalid email or password.'
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Check if user is logged in
function isUserLoggedIn() {
    return currentUser !== null;
}

// Export functions for use in other scripts
window.authModule = {
    initAuth,
    getCurrentUser,
    isUserLoggedIn,
    handleLogout
};
