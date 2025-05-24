window.addEventListener('pageshow', function(event) {
    if (event.persisted || (window.performance && performance.getEntriesByType("navigation")[0].type === "back_forward")) {
        window.location.reload();
    }
});

const toggleBtn = document.getElementById('togglePassword');
const passwordInput = document.getElementById('removePass');
const toggleIcon = document.getElementById('toggleIcon');
toggleBtn.addEventListener('click', () => {
const isPassword = passwordInput.type === 'password';
passwordInput.type = isPassword ? 'text' : 'password';

// Change the icon
toggleIcon.classList.toggle('fa-eye-slash');
toggleIcon.classList.toggle('fa-eye');
});

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

    const tbody = document.getElementById('loan-tbody');
    const modal = document.getElementById('loanModal');
    const modalContent = document.getElementById('modalContent1');
    const modalContent2 = document.getElementById('modalContent2');
    const closeModal = document.querySelector('.close-modal');
    const filterField = document.getElementById('filter-field');
    const searchInput = document.getElementById('search-input');
    const viewWrapper = document.querySelector('.viewWrapper');
    let timeoutId;

    if (!userId) {
        console.error("No user ID found.");
        return;
    }

    let allLoans = [];

    // Function to fetch loans
    async function fetchLoans() {
        try {
            const response = await fetch(`/api/loans/${userId}`);
            allLoans = await response.json();
            
            if (!Array.isArray(allLoans)) throw new Error("Invalid data format");
            renderLoans(allLoans);

            // Open modal if ?view=LOAN_ID is present, with a delay to ensure DOM is ready
            const urlParams = new URLSearchParams(window.location.search);
            const viewLoanId = urlParams.get('view');
            if (viewLoanId) {
                const loan = allLoans.find(l => l.loanId === viewLoanId);
                if (loan) {
                    setTimeout(() => {
                        showLoanModal(loan);
                    }, 100);
                }
            }
        } catch (err) {
            console.error('Error loading loans:', err);
            tbody.innerHTML = `<tr><td colspan="8">Failed to load loan data.</td></tr>`;
        }
    }

    // Function to render filtered loans
    function renderLoans(loans) {
        tbody.innerHTML = '';
        
        loans.forEach(loan => {
            const tr = document.createElement('tr');
            const isPayDisabled = loan.status === 'Paid' || loan.status === 'Cancelled';
            // Ensure balance is not negative
            const displayBalance = Math.max(0, parseFloat(loan.balance));
            tr.innerHTML = `
                <td>${loan.loanId}</td>
                <td><span style="font-weight: 500;">${loan.borrower}</span></td>
                <td>${loan.amount}</td>
                <td>${loan.dateBorrowed}</td>
                <td>${loan.interest}</td>
                <td class="${
                    loan.status === 'Ongoing' ? 'ongoing' :
                    loan.status === 'Paid' ? 'paid' :
                    loan.status === 'Overdue' ? 'overdue' :
                    loan.status === 'Cancelled' ? 'cancelled' : ''
                }">${loan.status}</td>
                <td>${displayBalance.toFixed(2)}</td>
                <td id="act-btn">
                    <button class="action-btn" id="detailsBtn" data-id="${loan.loanId}">
                        View
                    </button>
                    <button class="pay-btn-table" id="payBtn" data-id="${loan.loanId}" data-status="${loan.status}">
                        Pay
                    </button>
                </td>
            `;
            tbody.appendChild(tr);

            // Add click handler for pay button after the element is created
            const payBtn = tr.querySelector('.pay-btn-table');
            if (payBtn) {
                payBtn.disabled = isPayDisabled;
                if (!isPayDisabled) {
                    payBtn.addEventListener('click', () => {
                        window.location.href = `/record-payment?borrowerId=${loan.borrowerId}&loanId=${loan.loanId}&from=loans`;
                    });
                }
            }
        });

        // Add click handlers to all action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const loanId = btn.getAttribute('data-id');
                const loan = allLoans.find(l => l.loanId === loanId);
                showLoanModal(loan);
            });
        });
    }

    let ignoreNextModalClick = false;

    function showLoanModal(loan) {
        document.getElementById("modalLoanId").innerText = `Loan ID: ${loan.loanId}`;

        ignoreNextModalClick = true;
        console.log('Loan object:', loan); // Debug log
        console.log('BorrowerId:', loan.borrowerId); // Debug log
        
        // Ensure balance is not negative
        const displayBalance = Math.max(0, parseFloat(loan.balance));
        
        modalContent.innerHTML = `
            <tr><td>Borrower</td><td>: <span id="borrowerView">${loan.borrower}</span></td></tr>
            <tr><td>Amount</td><td>: <span id="amountView">${loan.amount}</span></td></tr>
            <tr><td>Date Borrowed</td><td>: <span id="dateBorrowedView">${loan.dateBorrowed}</span></td></tr>
            <tr><td>Term</td><td>: <span id="termView">${loan.term} months</span></td></tr>
            <tr><td>Interest Rate</td><td>: <span id="interestView">${loan.interest}</span></td></tr>
        `;
        
        modalContent2.innerHTML = `
            <tr><td>Balance</td><td>: <span id="balanceView">${displayBalance.toFixed(2)}</span></td></tr>
            <tr><td>Payment Frequency</td><td>: <span id="paymentFrequencyView">${loan.paymentFrequency}</span></td></tr>
            <tr><td>Next Due Date</td><td>: <span id="nextDueDateView">${loan.nextDueDate}</span></td></tr>
            <tr><td>Agreement Document</td><td>: 
            ${loan.agreementPhoto ? 
                `<button class="viewAgreementButton" data-photo="/uploads/${loan.agreementPhoto}">View Document</button>`
                : 
                'No Agreement uploaded'
            }
            </td></tr>
        `;

        // Add click handler for agreement photo if exists
        if (loan.agreementPhoto) {
            const viewBtn = modalContent2.querySelector('.viewAgreementButton');
            viewBtn.addEventListener('click', () => {
                document.getElementById('agreementPhotoDisplay').src = viewBtn.dataset.photo;
                document.getElementById('agreementPhotoModal').style.display = 'block';
            });
        }

        // Always reset the cancel form handler and password field when opening the modal
        const confirmForm = document.querySelector('.cancel-form');
        confirmForm.onsubmit = null;
        confirmForm.onsubmit = async (e) => {
            e.preventDefault();
            const password = document.getElementById('removePass').value;
            try {
                const response = await fetch('/cancel-loan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ loanId: loan.loanId, password })
                });
                const result = await response.json();
                if (result.success) {
                    document.querySelector('.cancel-bg').style.display = 'none';
                    const modal = document.createElement('div');
                    modal.className = 'success-modal';
                    modal.innerHTML = `
                        <div class="modal-content">
                          <div class="modal-blue"></div>
                            <i class="fa-regular fa-circle-check"></i>
                            <p>Loan cancelled successfully!</p>
                        </div>
                    `;
                    document.body.appendChild(modal);
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    const errorDiv = document.getElementById('cancelError');
                    errorDiv.querySelector('p').textContent = result.message || 'Invalid password';
                    errorDiv.classList.add('show');
                }
            } catch (err) {
                const errorDiv = document.getElementById('cancelError');
                errorDiv.querySelector('p').textContent = 'An error occurred. Please try again.';
                errorDiv.classList.add('show');
            }
        };
        document.getElementById('removePass').value = '';
        document.getElementById('cancelError').classList.remove('show');

        // Clean up and recreate modal actions
        const modalHeader = document.querySelector('.modal-header');
        const modalActions = document.querySelector('.modal-actions');
        
        // Remove existing modal actions if any
        if (modalActions) {
            modalActions.remove();
        }
        
        // Create new modal actions container
        const newModalActions = document.createElement('div');
        newModalActions.className = 'modal-actions';
        
        // Create Pay Button
        const payBtn = document.createElement('button');
        payBtn.className = 'pay-btn';
        payBtn.textContent = 'Pay';
        const isPayDisabled = loan.status === 'Paid' || loan.status === 'Cancelled';
        payBtn.disabled = isPayDisabled;
        if (!isPayDisabled) {
            payBtn.addEventListener('click', () => {
                window.location.href = `/record-payment?borrowerId=${loan.borrowerId}&loanId=${loan.loanId}&from=loans`;
            });
        }
        
        // Create Cancel Button
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel-btn';
        cancelBtn.textContent = 'Cancel';
        const isCancelDisabled = loan.status === 'Cancelled';
        cancelBtn.disabled = isCancelDisabled;
        if (!isCancelDisabled) {
            cancelBtn.addEventListener('click', () => {
                document.querySelector('.cancel-bg').style.display = 'block';
                document.getElementById('cancelCancel').onclick = (e) => {
                    e.preventDefault();
                    document.querySelector('.cancel-bg').style.display = 'none';
                };
            });
        }
        
        // Add buttons to modal actions
        newModalActions.appendChild(payBtn);
        newModalActions.appendChild(cancelBtn);
        
        // Add modal actions to header
        modalHeader.appendChild(newModalActions);

        modal.style.display = 'block';
    }

    // Close photo modal
    document.querySelector('.close-photo')?.addEventListener('click', () => {
        document.getElementById('agreementPhotoModal').style.display = 'none';
    });

    // Close when clicking outside image
    window.addEventListener('click', (event) => {
        const photoModal = document.getElementById('agreementPhotoModal');
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
        if (ignoreNextModalClick) {
            ignoreNextModalClick = false;
            return;
        }
        if (event.target === modalBg || event.target === modalFlex) {
            modal.style.display = 'none';
        }
    });

    // Function to filter loans
    function filterLoans() {
        const searchTerm = searchInput.value.toLowerCase();
        const filterBy = filterField.value;
        
        if (!searchTerm) {
            renderLoans(allLoans);
            return;
        }
        
        const filtered = allLoans.filter(loan => {
            switch(filterBy) {
                case 'borrower':
                    return loan.borrower.toLowerCase().includes(searchTerm);
                case 'interestRate':
                    return loan.interest.toLowerCase().includes(searchTerm);
                case 'dateBorrowed':
                    return loan.dateBorrowed.toLowerCase().includes(searchTerm);
                case 'balance>':
                    return parseFloat(loan.balance) > parseFloat(searchTerm);
                case 'balance<':
                    return parseFloat(loan.balance) < parseFloat(searchTerm);
                case 'amount>':
                    return parseFloat(loan.amount) > parseFloat(searchTerm);
                case 'amount<':
                    return parseFloat(loan.amount) < parseFloat(searchTerm);
                case 'status':
                    return loan.status.toLowerCase().includes(searchTerm);
                default:
                    return true;
            }
        });

        // Sort by closest to search value for numeric filters
        if (['balance>', 'balance<', 'amount>', 'amount<'].includes(filterBy)) {
            const searchValue = parseFloat(searchTerm);
            filtered.sort((a, b) => {
                const aValue = filterBy.startsWith('balance') ? parseFloat(a.balance) : parseFloat(a.amount);
                const bValue = filterBy.startsWith('balance') ? parseFloat(b.balance) : parseFloat(b.amount);
                return Math.abs(aValue - searchValue) - Math.abs(bValue - searchValue);
            });
        }
        
        renderLoans(filtered);
    }

    // Debounce function
    function debounce(func, delay) {
        return function() {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, arguments), delay);
        };
    }

    // Event listeners
    searchInput.addEventListener('input', debounce(filterLoans, 300));
    filterField.addEventListener('change', filterLoans);

    // Initial fetch
    await fetchLoans();

    document.getElementById('removePass').addEventListener('input', function() {
        document.getElementById('cancelError').classList.remove('show');
    });
});



