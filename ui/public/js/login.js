document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('forgot-password-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        showModal('forgotPasswordModal');
    });
    document.getElementById('register-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        showModal('registerModal');
    });
    document.getElementById('close-register-modal')?.addEventListener('click', () => closeModal('registerModal'));
    document.getElementById('close-forgot-password-modal')?.addEventListener('click', () => closeModal('forgotPasswordModal'));
    document.getElementById('cancel-register')?.addEventListener('click', () => closeModal('registerModal'));
    document.getElementById('cancel-forgot')?.addEventListener('click', () => closeModal('forgotPasswordModal'));
    document.getElementById('create-client-button')?.addEventListener('click', createClient);
    document.getElementById('send-reset-button')?.addEventListener('click', sendPasswordReset);
});

function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }
    
    // Show loading indicator
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';
    }
    
    // Make API call to backend for authentication
    fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include' // Include cookies in the request
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Login successful, redirecting to dashboard...');
            // Store token in localStorage for future API calls
            localStorage.setItem('auth_token', data.token);

            // Force redirect to dashboard on successful login
            window.location.replace('/analytics-dashboard');
        } else {
            // Display error message
            alert(data.message || 'Login failed. Please check your credentials.');

            // Reset button
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Sign in';
            }
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        alert('An error occurred during login. Please try again.');

        // Reset button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Sign in';
        }
    });
}


function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function createClient() {
    const clientName = document.getElementById('client-name').value;
    const clientId = document.getElementById('client-id').value;
    const clientUrl = document.getElementById('client-url').value;
    const clientEmail = document.getElementById('client-email').value;
    const clientPassword = document.getElementById('client-password').value;

    if (!clientName || !clientId || !clientUrl || !clientEmail || !clientPassword) {
        alert('Please fill in all fields');
        return;
    }
    
    // Disable button to prevent multiple submissions
    const createButton = document.getElementById('create-client-button');
    if (createButton) {
        createButton.disabled = true;
        createButton.textContent = 'Creating...';
    }
    
    // Make API call to register the client
    fetch('/api/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: clientEmail,
            password: clientPassword,
            firstName: clientName,
            lastName: clientId,
            clientUrl: clientUrl
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal('registerModal');
            alert('Client created successfully! Please check your email to verify your account before logging in.');
        } else {
            alert(data.message || 'Failed to create client. Please try again.');
            
            // Reset button
            if (createButton) {
                createButton.disabled = false;
                createButton.textContent = 'Create Client';
            }
        }
    })
    .catch(error => {
        console.error('Registration error:', error);
        alert('An error occurred during client creation. Please try again.');
        
        // Reset button
        if (createButton) {
            createButton.disabled = false;
            createButton.textContent = 'Create Client';
        }
    });
}

function sendPasswordReset() {
    const resetEmail = document.getElementById('reset-email').value;
    if (!resetEmail) {
        alert('Please enter your email address');
        return;
    }
    console.log('Sending password reset to:', resetEmail);
    closeModal('forgotPasswordModal');
    alert('Password reset link has been sent to your email address.');
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
