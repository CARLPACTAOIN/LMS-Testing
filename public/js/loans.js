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
        const modalFlex = document.getElementById('modal-flex');
        if (event.target === logoutModal || event.target === modalFlex) {
            logoutModal.style.display = 'none';
        }
    });

    // Get DOM elements
    const tbody = document.getElementById('loan-tbody');
    const modal = document.getElementById('loanModal');
    const modalContent = document.getElementById('modalContent1');
    const modalContent2 = document.getElementById('modalContent2');
    const closeModal = document.querySelector('.close-modal');
    const filterField = document.getElementById('filter-field');
    const searchInput = document.getElementById('search-input');
    const viewWrapper = document.querySelector('.viewWrapper');
    let timeoutId;

    // Add event listeners for closing modal
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        const modalFlex = document.getElementById('modal-flex');
        if (event.target === modal || event.target === modalFlex) {
            modal.style.display = 'none';
        }
    });

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
                        showLoanModal(loan.loanId);
                    }, 100);
                }
            }
        } catch (err) {
            console.error('Error loading loans:', err);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="8">Failed to load loan data.</td></tr>`;
            }
        }
    }

    // Function to render filtered loans
    function renderLoans(loans) {
        if (!tbody) {
            console.error('Table body element not found');
            return;
        }

        tbody.innerHTML = '';
       
        loans.forEach(loan => {

            const isPayDisabled = loan.status === 'Paid' || loan.status === 'Cancelled';
            const tr = document.createElement('tr');
            const remainingPrincipal = parseFloat(loan.remaining_principal || 0);
            const remainingInterest = parseFloat(loan.remaining_interest || 0);
            const lateFee = loan.status === 'Overdue' ? 
                (remainingPrincipal * (loan.interest/100) / 
                    (loan.paymentFrequency === 'Weekly' ? 7 : 
                    loan.paymentFrequency === 'Fortnightly' ? 14 :
                    loan.paymentFrequency === 'Monthly' ? 30 :
                    loan.paymentFrequency === 'Quarterly' ? 90 :
                    loan.paymentFrequency === 'Semi-annually' ? 180 : 365) * Math.max(0, Math.floor((new Date() - new Date(loan.nextDueDate)) / (1000 * 60 * 60 * 24)))) : 0;
            const displayBalance = remainingPrincipal + remainingInterest + lateFee;
            const dateBorrowed = loan.dateBorrowed ? new Date(loan.dateBorrowed).toLocaleDateString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric'
            }) : 'N/A';
            
            tr.innerHTML = `
                <td>${loan.loanId}</td>
                <td>${loan.borrower}</td>
                <td>${loan.amount.toFixed(2)}</td>
                <td>${dateBorrowed}</td>
                <td>${loan.interest}%</td>
                <td class="${loan.status.toLowerCase()}">${loan.status}</td>
                <td>${displayBalance.toFixed(2)}</td>
                <td id="act-btn">
                    <button class="action-btn" onclick="showLoanModal('${loan.loanId}')">
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
    }

    // Make showLoanModal available globally
    window.showLoanModal = function(loanId) {
        const loan = allLoans.find(l => l.loanId === loanId);
        if (!loan) return;

        const modalContent1 = document.getElementById('modalContent1');
        const modalContent2 = document.getElementById('modalContent2');
        if (!modalContent1 || !modalContent2) {
            console.error('Modal content elements not found');
            return;
        }
        console.log(loan.remaining_interest);

        // Update modal header with loan ID
        document.getElementById('modalLoanId').textContent = `Loan ID: ${loan.loanId}`;

       
        
        const remainingPrincipal = parseFloat(loan.remaining_principal || 0);
            const remainingInterest = parseFloat(loan.remaining_interest || 0);
            const lateFee = loan.status === 'Overdue' ? 
                (remainingPrincipal * (loan.interest/100) / 
                    (loan.paymentFrequency === 'Weekly' ? 7 : 
                    loan.paymentFrequency === 'Fortnightly' ? 14 :
                    loan.paymentFrequency === 'Monthly' ? 30 :
                    loan.paymentFrequency === 'Quarterly' ? 90 :
                    loan.paymentFrequency === 'Semi-annually' ? 180 : 365) * Math.max(0, Math.floor((new Date() - new Date(loan.nextDueDate)) / (1000 * 60 * 60 * 24)))) : 0;
        const displayBalance = parseFloat(loan.remaining_principal || 0) + parseFloat((loan.remaining_interest + lateFee) || 0);
        
        modalContent1.innerHTML = `
            <tr><td>Name</td><td>: ${loan.borrower}</td></tr>
            <tr><td>Amount</td><td>: ${loan.amount.toFixed(2)}</td></tr>
            <tr><td>Date Borrowed</td><td>: ${loan.dateBorrowed}</td></tr>
            <tr><td>Term</td><td>: ${loan.term} months</td></tr>
            <tr><td>Interest Rate</td><td>: ${loan.interest}%</td></tr>
            <tr><td>Payment Frequency</td><td>: ${loan.paymentFrequency}</td></tr>
           
        `;

        modalContent2.innerHTML = `
            <tr><td>Next Due Date</td><td>: ${loan.nextDueDate}</td></tr>
            <tr><td>Status</td><td>: ${loan.status}</td></tr>
            <tr><td>Remaining Principal</td><td>: ${parseFloat(loan.remaining_principal || 0).toFixed(2)}</td></tr>
            <tr><td>Current Interest</td><td>: ${parseFloat((loan.remaining_interest + lateFee) || 0).toFixed(2)}</td></tr>
            <tr><td>Total Balance</td><td>: ${displayBalance.toFixed(2)}</td></tr>
            ${loan.agreementPhoto ? `
                <tr><td>Agreement Document</td><td>: 
                    <button class="viewAgreementButton" data-photo="/uploads/${loan.agreementPhoto}">View Agreement</button>
                </td></tr>
            ` : ''}
        `;

        // Add click handler for agreement photo if it exists
        if (loan.agreementPhoto) {
            const viewBtn = modalContent2.querySelector('.viewAgreementButton');
            const agreementModal = document.getElementById('agreementPhotoModal');
            const closePhotoBtn = agreementModal.querySelector('.close-photo');
            
            viewBtn.addEventListener('click', () => {
                document.getElementById('agreementPhotoDisplay').src = viewBtn.dataset.photo;
                agreementModal.style.display = 'block';
            });

        // Create new modal actions container
        const newModalActions = document.createElement('div');
        newModalActions.className = 'modal-actions';

            // Always reset the cancel form handler and password field when opening the modal
        const confirmForm = document.querySelector('.cancel-form');
        confirmForm.onsubmit = null;
        confirmForm.onsubmit = async (e) => {
            e.preventDefault();
            console.log('Cancelling loanId:', loan.loanId); // Debug log
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
        const isCancelDisabled = loan.status === 'Paid' || loan.status === 'Cancelled';
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
    
        
        // Remove existing modal actions if any
        if (modalActions) {
            modalActions.remove();
        }
        
      

            // Close when clicking X
            closePhotoBtn.addEventListener('click', () => {
                agreementModal.style.display = 'none';
            });

            // Close when clicking outside
            window.addEventListener('click', (event) => {
                if (event.target === agreementModal) {
                    agreementModal.style.display = 'none';
                }
            });
        }

        document.getElementById('loanModal').style.display = 'block';
    };

    // Make showPaymentModal available globally
    window.showPaymentModal = function(loanId) {
        const loan = allLoans.find(l => l.loanId === loanId);
        if (!loan) return;
        
        window.location.href = `/record-payment?loanId=${loanId}&borrowerId=${loan.borrowerId}&from=loans`;
    };

    // Add showCancelModal function
    window.showCancelModal = function(loanId) {
        document.querySelector('.cancel-bg').style.display = 'block';
        document.getElementById('removePass').value = '';
        document.getElementById('cancelError').classList.remove('show');
        
        // Store the loan ID for the cancel form submission
        document.querySelector('.cancel-form').dataset.loanId = loanId;
    };

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
                    return loan.interest.toString().includes(searchTerm);
                case 'dateBorrowed':
                    return loan.dateBorrowed?.toLowerCase().includes(searchTerm);
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
    if (searchInput) searchInput.addEventListener('input', debounce(filterLoans, 300));
    if (filterField) filterField.addEventListener('change', filterLoans);

    // Initial fetch
    await fetchLoans();

    document.getElementById('removePass').addEventListener('input', function() {
        document.getElementById('cancelError').classList.remove('show');
    });
});


