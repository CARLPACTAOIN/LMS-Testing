const registrationForm = document.querySelector('.registration-form');
const firstNameInput = document.getElementById('first-name');
const lastNameInput = document.getElementById('last-name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const toggleBtn = document.getElementById('togglePassword');
const toggleBtn2 = document.getElementById('togglePassword2');
const toggleIcon = document.getElementById('toggleIcon');
const toggleIcon2 = document.getElementById('toggleIcon2');
const submitBtn = document.querySelector('.submit-button-container input[type="submit"]');

// Email validation function
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Name validation function (letters, spaces, and symbols allowed, but no numbers)
function isValidName(name) {
    const nameRegex = /^[^0-9]+$/;
    return nameRegex.test(name);
}

// Clear all errors
function clearErrors() {
    document.querySelectorAll('.error').forEach(error => {
        error.classList.remove('show');
    });
}

// Show error for a specific field
function showError(fieldId, message) {
    const errorElement = document.getElementById(`${fieldId}Error`);
    if (errorElement) {
        errorElement.querySelector('p').textContent = message;
        errorElement.classList.add('show');
    }
}

// Clear error when user starts typing
[firstNameInput, lastNameInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
    input.addEventListener('input', () => {
        const errorId = input.id + 'Error';
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.classList.remove('show');
        }
    });
});

// Form submission handler
registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Prevent multiple submissions
    if (submitBtn.disabled) return;
    // Show loading overlay and disable button
    document.getElementById('loadingOverlay').style.display = 'flex';
    submitBtn.disabled = true;
    clearErrors();
    let hasError = false;
    
    // Validate first name
    if (!isValidName(firstNameInput.value.trim())) {
        showError('firstName', 'First name can only contain letters, spaces, and symbols');
        hasError = true;
    }
    
    // Validate last name
    if (!isValidName(lastNameInput.value.trim())) {
        showError('lastName', 'Last name can only contain letters, spaces, and symbols');
        hasError = true;
    }
    
    // Validate email
    if (!isValidEmail(emailInput.value.trim())) {
        showError('email', 'Please enter a valid email address');
        hasError = true;
    }
    
    // Validate password
    if (passwordInput.value.length < 8) {
        showError('password', 'Password must be at least 8 characters');
        hasError = true;
    }
    
    // Validate password confirmation
    if (passwordInput.value !== confirmPasswordInput.value) {
        showError('confirmPassword', 'Passwords do not match');
        hasError = true;
    }
    
    if (hasError) {
        document.getElementById('loadingOverlay').style.display = 'none';
        submitBtn.disabled = false;
        return;
    }
    
    try {
        const formData = new FormData(registrationForm);
        const data = {
            firstname: formData.get('firstname'),
            lastname: formData.get('lastname'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        };

        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        document.getElementById('loadingOverlay').style.display = 'none';
        submitBtn.disabled = false;
        
        if (response.ok && result.success) {
            window.location.href = '/dashboard';
        } else {
            // Handle different error cases
            if (result.error.includes('Email is already registered')) {
                showError('email', 'Email is already registered');
            } else if (result.error.includes('Passwords do not match')) {
                showError('confirmPassword', 'Passwords do not match');
            } else if (result.error.includes('Password must be at least 8 characters')) {
                showError('password', 'Password must be at least 8 characters');
            } else {
                showError('email', result.error || 'Registration failed');
            }
        }
    } catch (error) {
        document.getElementById('loadingOverlay').style.display = 'none';
        submitBtn.disabled = false;
        showError('email', 'An error occurred. Please try again.');
    }
});

// Password toggle functionality
toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    toggleIcon.classList.toggle('fa-eye-slash');
    toggleIcon.classList.toggle('fa-eye');
});

toggleBtn2.addEventListener('click', () => {
    const isPassword = confirmPasswordInput.type === 'password';
    confirmPasswordInput.type = isPassword ? 'text' : 'password';
    toggleIcon2.classList.toggle('fa-eye-slash');
    toggleIcon2.classList.toggle('fa-eye');
}); 