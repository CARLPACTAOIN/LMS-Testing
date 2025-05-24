document.addEventListener('DOMContentLoaded', async () => {
    const form = document.querySelector('form');
    const borrowerInput = document.getElementById('borrower');
    const loanAmountInput = document.getElementById('loanAmount');
    const loanTermInput = document.getElementById('loanTerm');
    const interestRateInput = document.getElementById('interestRate');
    const startDateInput = document.getElementById('startDate');
    const paymentFrequencySelect = document.getElementById('paymentFrequency');
    
    // Set current date as default for start date
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    startDateInput.value = formattedDate;
    
    // Set default loan term to "Flex" if empty
    loanTermInput.addEventListener('change', function() {
        if (!this.value) {
            this.value = 'Flex';
        }
    });
    
    // Agreement photo preview setup
    const agreementPreview = document.createElement('img');
    agreementPreview.style.maxWidth = '200px';
    agreementPreview.style.display = 'none';
    document.querySelector('#loanAgreement').parentNode.appendChild(agreementPreview);

    // Check if borrowerId was passed in URL
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedBorrowerId = urlParams.get('borrowerId');

    // Borrower autocomplete setup
    let borrowers = [];
    let selectedBorrowerId = preselectedBorrowerId;

    // Fetch borrowers for autocomplete
    async function fetchBorrowers() {
        try {
            const response = await fetch(`/api/borrowers/${userId}`);
            borrowers = await response.json();
            
            if (preselectedBorrowerId) {
                const selectedBorrower = borrowers.find(b => b.borrowerId === preselectedBorrowerId);
                if (selectedBorrower) {
                    borrowerInput.value = selectedBorrower.borrower;
                    selectedBorrowerId = selectedBorrower.borrowerId;
                }
            }
        } catch (err) {
            console.error('Error loading borrowers:', err);
        }
    }

    // Initialize borrowers data
    await fetchBorrowers();

    // Setup borrower autocomplete
    borrowerInput.addEventListener('input', function() {
        const searchText = this.value.toLowerCase();
        const matchingBorrowers = borrowers.filter(b => 
            b.borrower.toLowerCase().includes(searchText)
        );

        // Clear previous dropdown
        const existingDropdown = document.querySelector('.autocomplete-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        if (searchText && matchingBorrowers.length > 0) {
            const dropdown = document.createElement('div');
            dropdown.className = 'autocomplete-dropdown';
            
            matchingBorrowers.forEach(borrower => {
                const option = document.createElement('div');
                option.className = 'autocomplete-option';
                option.textContent = borrower.borrower;
                option.addEventListener('click', () => {
                    borrowerInput.value = borrower.borrower;
                    selectedBorrowerId = borrower.borrowerId;
                    dropdown.remove();
                });
                dropdown.appendChild(option);
            });

            borrowerInput.parentNode.appendChild(dropdown);
        }
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.matches('#borrower')) {
            const dropdown = document.querySelector('.autocomplete-dropdown');
            if (dropdown) dropdown.remove();
        }
    });

    // Image preview handler
    document.getElementById('loanAgreement').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Please upload an image file');
                this.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                agreementPreview.src = e.target.result;
                agreementPreview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

    // Form validation and submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate borrower selection
        if (!selectedBorrowerId) {
            alert('Please select a valid borrower');
            return;
        }

        // Validate numeric fields
        const amount = parseFloat(loanAmountInput.value);
        const interestRate = parseFloat(interestRateInput.value);
        const term = loanTermInput.value || 'Flex';

        if (amount <= 0) {
            alert('Loan amount must be greater than 0');
            return;
        }

        if (interestRate <= 0 || interestRate > 100) {
            alert('Interest rate must be between 0 and 100');
            return;
        }

        if (term !== 'Flex' && parseInt(term) < 0) {
            alert('Loan term cannot be negative');
            return;
        }

        const formData = new FormData(form);
        formData.append('borrowerId', selectedBorrowerId);
        formData.set('loanTerm', term);
        
        try {
            const response = await fetch('/addLoan', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                // Show success modal
                const modal = document.createElement('div');
                modal.className = 'success-modal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-blue"></div>
                        <i class="fa-regular fa-circle-check"></i>
                        <p>Loan added successfully!</p>
                    </div>
                `;
                document.body.appendChild(modal);
                
                // Redirect after delay
                setTimeout(() => {
                    window.location.href = '/loans';
                }, 1500);
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to add loan');
            }
        } catch (err) {
            console.error('Submission error:', err);
            alert('Error adding loan');
        }
    });
});

// Add styles for autocomplete
const style = document.createElement('style');
style.textContent = `
    .autocomplete-dropdown {
        position: absolute;
        width: 368.8px;
        max-height: 200px;
        overflow-y: auto;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        z-index: 1000;
        left: 27px;
    }
    .autocomplete-option {
        padding: 8px 15px;
        cursor: pointer;
        text-align: left;
        font-size: 19.2px;
        color: var(--text-color2);
    }
    .autocomplete-option:hover {
        background: #f0f0f0;
    }
`;
document.head.appendChild(style);
