const toggleBtn = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const toggleIcon = document.getElementById('toggleIcon');
const toggleBtn2 = document.getElementById('togglePassword2');
const passwordInput2 = document.getElementById('confirm-password');
const toggleIcon2 = document.getElementById('toggleIcon2');
const loginForm = document.querySelector('.login-form');
const loginError = document.getElementById('loginError');
const emailInput = document.getElementById('email');
const submitBtn = document.querySelector('.submit-button-container input[type="submit"]');

// Email validation function
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Clear error message when user starts typing
emailInput.addEventListener('input', () => {
    loginError.classList.remove('show');
});

passwordInput.addEventListener('input', () => {
    loginError.classList.remove('show');
});

// Form submission handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Prevent multiple submissions
    if (submitBtn.disabled) return;
    // Show loading overlay and disable button
    document.getElementById('loadingOverlay').style.display = 'flex';
    submitBtn.disabled = true;
    // Reset error state
    loginError.classList.remove('show');
    // Get form values
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    // Client-side validation
    if (!email) {
        loginError.querySelector('p').textContent = 'Please enter your email';
        loginError.classList.add('show');
        document.getElementById('loadingOverlay').style.display = 'none';
        submitBtn.disabled = false;
        return;
    }
    if (!isValidEmail(email)) {
        loginError.querySelector('p').textContent = 'Please enter a valid email address';
        loginError.classList.add('show');
        document.getElementById('loadingOverlay').style.display = 'none';
        submitBtn.disabled = false;
        return;
    }
    if (!password) {
        loginError.querySelector('p').textContent = 'Please enter your password';
        loginError.classList.add('show');
        document.getElementById('loadingOverlay').style.display = 'none';
        submitBtn.disabled = false;
        return;
    }
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        document.getElementById('loadingOverlay').style.display = 'none';
        submitBtn.disabled = false;
        if (response.ok && result.success) {
            window.location.href = '/dashboard';
        } else {
            loginError.querySelector('p').textContent = result.error || 'Invalid email or password';
            loginError.classList.add('show');
        }
    } catch (error) {
        document.getElementById('loadingOverlay').style.display = 'none';
        submitBtn.disabled = false;
        loginError.querySelector('p').textContent = 'An error occurred. Please try again.';
        loginError.classList.add('show');
    }
});

toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    
    // Change the icon
    toggleIcon.classList.toggle('fa-eye-slash');
    toggleIcon.classList.toggle('fa-eye');
});

toggleBtn2.addEventListener('click', () => {
    const isPassword = passwordInput2.type === 'password';
    passwordInput2.type = isPassword ? 'text' : 'password';
    
    // Change the icon
    toggleIcon2.classList.toggle('fa-eye-slash');
    toggleIcon2.classList.toggle('fa-eye');
});