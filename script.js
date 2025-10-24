let users = [];
let sessions = {};
let loginAttempts = 0;
let lockoutTime = null;
let currentUser = null;


document.addEventListener('DOMContentLoaded', () => {
    checkActiveSession();
    setupKeyboardListeners();
});



function checkActiveSession() {
    const sessionToken = Object.keys(sessions)[0];
    if (sessionToken && sessions[sessionToken].expiresAt > Date.now()) {
        currentUser = sessions[sessionToken].user;
        showDashboard();
    }
}

function generateSessionToken() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now();
}

function createSession(user) {
    const sessionToken = generateSessionToken();
    const session = {
        token: sessionToken,
        user: { id: user.id, username: user.username, email: user.email },
        createdAt: Date.now(),
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
    };
    
    sessions[sessionToken] = session;
    currentUser = session.user;
    return session;
}

function destroySession() {
    sessions = {};
    currentUser = null;
}

// ============ INPUT VALIDATION ============

function sanitizeInput(input) {
    // Remove potentially dangerous characters to prevent XSS
    return input.replace(/[<>]/g, '');
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateUsername(username) {
    // 3-20 characters, alphanumeric and underscores only
    return username.length >= 3 && 
           username.length <= 20 && 
           /^[a-zA-Z0-9_]+$/.test(username);
}

function validatePassword(password) {
    const errors = [];
    
    if (password.length < 8) {
        errors.push('at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('one number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
        errors.push('one special character (!@#$%^&*)');
    }
    
    return errors;
}

// ============ PASSWORD HASHING ============

function hashPassword(password) {
    // Simple hash for demonstration purposes
    // In production, use bcrypt or similar on the backend
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'hashed_' + Math.abs(hash).toString(16);
}

// ============ UI FUNCTIONS ============

function switchTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    clearAllErrors();
    clearAllInputs();
    hideAlert();
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    } else {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
}

function togglePassword(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
        input.type = 'password';
        icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
}

function showAlert(message, type) {
    const alert = document.getElementById('alertMessage');
    const alertText = document.getElementById('alertText');
    
    alertText.textContent = message;
    alert.classList.remove('hidden', 'success', 'error');
    alert.classList.add(type);
}

function hideAlert() {
    const alert = document.getElementById('alertMessage');
    alert.classList.add('hidden');
}

function showError(fieldId, message) {
    const errorElement = document.getElementById(fieldId + 'Error');
    const inputElement = document.getElementById(fieldId);
    
    if (errorElement) {
        errorElement.textContent = message;
    }
    if (inputElement) {
        inputElement.classList.add('error');
    }
}

function clearError(fieldId) {
    const errorElement = document.getElementById(fieldId + 'Error');
    const inputElement = document.getElementById(fieldId);
    
    if (errorElement) {
        errorElement.textContent = '';
    }
    if (inputElement) {
        inputElement.classList.remove('error');
    }
}

function clearAllErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    const inputElements = document.querySelectorAll('input');
    
    errorElements.forEach(el => el.textContent = '');
    inputElements.forEach(el => el.classList.remove('error'));
}

function clearAllInputs() {
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('signupUsername').value = '';
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';
    document.getElementById('signupConfirmPassword').value = '';
}

function showDashboard() {
    document.getElementById('authCard').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('dashUsername').textContent = currentUser.username;
    document.getElementById('dashEmail').textContent = currentUser.email;
}

function showAuthCard() {
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('authCard').classList.remove('hidden');
    clearAllInputs();
    clearAllErrors();
}

// ============ AUTHENTICATION HANDLERS ============

function handleSignup() {
    clearAllErrors();
    hideAlert();
    
    const username = sanitizeInput(document.getElementById('signupUsername').value.trim());
    const email = sanitizeInput(document.getElementById('signupEmail').value.trim());
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    let hasErrors = false;
    
    // Validate username
    if (!validateUsername(username)) {
        showError('signupUsername', 'Username must be 3-20 characters and contain only letters, numbers, and underscores');
        hasErrors = true;
    } else if (users.some(u => u.username === username)) {
        showError('signupUsername', 'Username already exists');
        hasErrors = true;
    }
    
    // Validate email
    if (!validateEmail(email)) {
        showError('signupEmail', 'Please enter a valid email address');
        hasErrors = true;
    } else if (users.some(u => u.email === email)) {
        showError('signupEmail', 'Email already registered');
        hasErrors = true;
    }
    
    // Validate password
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
        showError('signupPassword', 'Password must contain ${passwordErrors.join(', ')}');
        hasErrors = true;
    }
    
    // Validate password confirmation
    if (password !== confirmPassword) {
        showError('signupConfirmPassword', 'Passwords do not match');
        hasErrors = true;
    }
    
    if (hasErrors) return;
    
    // Create new user
    const hashedPassword = hashPassword(password);
    const newUser = {
        id: Date.now(),
        username: username,
        email: email,
        password: hashedPassword,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    
    showAlert('Account created successfully! Please log in.', 'success');
    clearAllInputs();
    
    // Switch to login after 2 seconds
    setTimeout(() => {
        switchTab('login');
        hideAlert();
    }, 2000);
}

function handleLogin() {
    clearAllErrors();
    hideAlert();
    
    // Check account lockout
    if (lockoutTime && Date.now() < lockoutTime) {
        const remainingSeconds = Math.ceil((lockoutTime - Date.now()) / 1000);
        showAlert ('Account locked due to too many failed attempts. Try again in ${remainingSeconds} seconds.', 'error');
        return;
    }
    
    const username = sanitizeInput(document.getElementById('loginUsername').value.trim());
    const password = document.getElementById('loginPassword').value;
    
    let hasErrors = false;
    
    // Basic validation
    if (!username) {
        showError('loginUsername', 'Username is required');
        hasErrors = true;
    }
    
    if (!password) {
        showError('loginPassword', 'Password is required');
        hasErrors = true;
    }
    
    if (hasErrors) return;
    
    // Attempt login
    const hashedPassword = hashPassword(password);
    const user = users.find(u => 
        u.username === username && u.password === hashedPassword
    );
    
    if (user) {
        // Successful login
        createSession(user);
        loginAttempts = 0;
        lockoutTime = null;
        
        showAlert('Login successful!', 'success');
        
        setTimeout(() => {
            showDashboard();
        }, 1000);
    } else {
        // Failed login - increment attempts
        loginAttempts++;
        
        if (loginAttempts >= 5) {
            lockoutTime = Date.now() + 30000; // 30 second lockout
            showAlert('Too many failed attempts. Account locked for 30 seconds.', 'error');
            
            // Clear lockout after timeout
            setTimeout(() => {
                lockoutTime = null;
                loginAttempts = 0;
                hideAlert();
            }, 30000);
        } else {
            showAlert('Invalid credentials. ${5 - loginAttempts} attempts remaining.', 'error');
        }
    }
}

function handleLogout() {
    destroySession();
    showAlert('Logged out successfully', 'success');
    
    setTimeout(() => {
        showAuthCard();
        hideAlert();
    }, 1500);
}

// ============ KEYBOARD LISTENERS ============

function setupKeyboardListeners() {
    // Login form - Enter key
    document.getElementById('loginUsername').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    // Signup form - Enter key
    document.getElementById('signupUsername').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSignup();
    });
    
    document.getElementById('signupEmail').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSignup();
    });
    
    document.getElementById('signupPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSignup();
    });
    
    document.getElementById('signupConfirmPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSignup();
    });
    
    // Clear errors on input
    const allInputs = document.querySelectorAll('input');
    allInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            clearError(e.target.id);
        });
    });
}