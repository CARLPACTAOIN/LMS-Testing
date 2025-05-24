document.addEventListener('DOMContentLoaded', async () => {
    // Logout functionality
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

    const tbody = document.getElementById('payment-tbody');
    const modal = document.getElementById('paymentModal');
    const modalContent1 = document.getElementById('modalContent1');
    const modalContent2 = document.getElementById('modalContent2');
    const closeModal = document.querySelector('.close-modal');
    const filterField = document.getElementById('filter-field');
    const searchInput = document.getElementById('search-input');
    let timeoutId;
    let allPayments = [];

    // Fetch payments
    async function fetchPayments() {
        try {
            const response = await fetch(`/api/payment-history/${userId}`);
            allPayments = await response.json();
            if (!Array.isArray(allPayments)) throw new Error('Invalid data format');
            renderPayments(allPayments);
        } catch (err) {
            console.error('Error loading payments:', err);
            tbody.innerHTML = `<tr><td colspan="8">Failed to load payment data.</td></tr>`;
        }
    }

    // Format date as 'MMM dd, yyyy'
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
        });
    }

    // Render payment table
    function renderPayments(payments) {
        tbody.innerHTML = '';
        payments.forEach(payment => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(payment.paymentDate)}</td>
                <td><span style="font-weight: 500;">${payment.borrower}</span></td>
                <td>${payment.loanId}</td>
                <td>${Number(payment.principal).toFixed(2)}</td>
                <td>${Number(payment.interest).toFixed(2)}</td>
                <td>${Number(payment.fee).toFixed(2)}</td>
                <td>${Number(payment.total).toFixed(2)}</td>
                <td id="act-btn">
                    <button class="action-btn" data-id="${payment.paymentId}">View</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        // Add click handlers
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const paymentId = btn.getAttribute('data-id');
                const payment = allPayments.find(p => p.paymentId == paymentId);
                showPaymentModal(payment);
            });
        });
    }

    // Show payment details modal
    function showPaymentModal(payment) {
        modalContent1.innerHTML = `
            <tr><td>Payer</td><td>: ${payment.borrower}</td></tr>
            <tr><td>Loan</td><td>: ${payment.loanId}</td></tr>
            <tr><td>Payment Date</td><td>: ${formatDate(payment.paymentDate)}</td></tr>
            <tr><td>Payment Method</td><td>: ${payment.paymentMethod || ''}</td></tr>
            <tr><td>Principal Paid</td><td>: ${Number(payment.principal).toFixed(2)}</td></tr>
            <tr><td>Interest Paid</td><td>: ${Number(payment.interest).toFixed(2)}</td></tr>
        `;
        modalContent2.innerHTML = `
            <tr><td>Delay</td><td>: ${payment.delay || 0} days</td></tr>
            <tr><td>Late Payment Fee</td><td>: ${Number(payment.fee).toFixed(2)}</td></tr>
            <tr><td>Total Payment</td><td>: ${Number(payment.total).toFixed(2)}</td></tr>
            <tr><td>Receipt</td><td>: ${payment.receipt && payment.receipt !== 'None' ?
                `<button class="viewAgreementButton" data-photo="/uploads/${payment.receipt}">View File</button>` :
                'No file uploaded'}</td></tr>
            <tr><td>Notes</td><td>:<br>${payment.notes ? payment.notes : ''}</td></tr>
        `;
        // Add click handler for receipt photo
        if (payment.receipt && payment.receipt !== 'None') {
            const viewBtn = modalContent2.querySelector('.viewAgreementButton');
            viewBtn.addEventListener('click', () => {
                document.getElementById('receiptPhotoDisplay').src = viewBtn.dataset.photo;
                document.getElementById('receiptPhotoModal').style.display = 'block';
            });
        }
        modal.style.display = 'block';
    }

    // Close photo modal
    document.querySelector('.close-photo')?.addEventListener('click', () => {
        document.getElementById('receiptPhotoModal').style.display = 'none';
    });
    window.addEventListener('click', (event) => {
        const photoModal = document.getElementById('receiptPhotoModal');
        if (event.target === photoModal) {
            photoModal.style.display = 'none';
        }
    });
    // Close modal when clicking X
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        const modalBg = document.querySelector('.modal-bg');
        const modalFlex = document.querySelector('.modal-flex');
        if (event.target === modalBg || event.target === modalFlex) {
            modal.style.display = 'none';
        }
    });

    // Filtering
    function filterPayments() {
        const searchTerm = searchInput.value.toLowerCase();
        const filterBy = filterField.value;
        if (!searchTerm) {
            renderPayments(allPayments);
            return;
        }
        const filtered = allPayments.filter(payment => {
            switch(filterBy) {
                case 'borrower':
                    return payment.borrower.toLowerCase().includes(searchTerm);
                case 'loanId':
                    return payment.loanId.toLowerCase().includes(searchTerm);
                case 'paymentDate':
                    return formatDate(payment.paymentDate).toLowerCase().includes(searchTerm);
                case 'paymentMethod':
                    return (payment.paymentMethod || '').toLowerCase().includes(searchTerm);
                default:
                    return true;
            }
        });
        renderPayments(filtered);
    }
    function debounce(func, delay) {
        return function() {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, arguments), delay);
        };
    }
    searchInput.addEventListener('input', debounce(filterPayments, 300));
    filterField.addEventListener('change', filterPayments);
    await fetchPayments();
});
