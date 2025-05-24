let inactivityTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(logoutUser, 30 * 60 * 1000); // 30 minutes
}

function logoutUser() {
    fetch('/logout', { method: 'GET' })
        .then(() => window.location.href = '/'); // Redirect to login
}

// Reset timer on user activity
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);
document.addEventListener('click', resetInactivityTimer);

// Initialize timer on page load
resetInactivityTimer();

// Logout functionality
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const logoutOption = document.getElementById('logoutOption');
    const contactUs = document.getElementById('contactUs');
    const logoutModal = document.getElementById('logoutModal');
    const logoutCancel = document.getElementById('logoutCancel');

    // Toggle dropdown menu
    hamburgerMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!hamburgerMenu.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    // Show logout modal when clicking logout option
    logoutOption.addEventListener('click', (e) => {
        e.preventDefault();
        dropdownMenu.classList.remove('show');
        logoutModal.style.display = 'block';
    });

    // Hide modal when clicking cancel
    logoutCancel.addEventListener('click', () => {
        logoutModal.style.display = 'none';
    });

    // Handle logout confirmation
    document.querySelector('#logoutModal .remove-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/logout', {
                method: 'GET'
            });
            
            if (response.ok) {
                window.location.href = '/';
            } else {
                console.error('Logout failed');
            }
        } catch (error) {
            console.error('Error during logout:', error);
        }
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === logoutModal) {
            logoutModal.style.display = 'none';
        }
    });
});

// Dynamics
document.addEventListener('DOMContentLoaded', async () => {
    const tbody = document.getElementById('payment-tbody');

    if (!userId) {
        console.error("No user ID found.");
        return;
    }

    try {
        const response = await fetch(`/api/payments/${userId}`);
        const payments = await response.json();

        if (!Array.isArray(payments)) throw new Error("Invalid data format");

        payments.forEach(payment => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>${payment.borrower}</td>
                <td>${payment.dueDate}</td>
                <td>₱${payment.amountDue}</td>
                <td class="${payment.status === 'Overdue' ? 'Overdue' : 'Ongoing'}">${payment.status}</td>
                <td id="act-btn">
                    <button class="action-btn" data-loan-id="${payment.loanId}">View Details</button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        // Add click handlers for view details buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const loanId = btn.getAttribute('data-loan-id');
                window.location.href = `/loans?view=${loanId}`;
            });
        });

    } catch (err) {
        console.error('Error loading payments:', err);
        tbody.innerHTML = `<tr><td colspan="5">Failed to load payment data ${userId}.</td></tr>`;
    }

});


// summary boxes
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch(`/api/summary/${userId}`);
        const summary = await res.json();

        document.querySelector('#borrower h2').innerText = summary.borrowers;
        document.querySelector('#loaned h2').innerText = `₱${summary.loaned.toLocaleString()}`;
        document.querySelector('#payments h2').innerText = `₱${summary.payments.toLocaleString()}`;
        document.querySelector('#overdue h2').innerText = summary.overdue;

    } catch (err) {
        console.error("Failed to load summary:", err);
    }
});
