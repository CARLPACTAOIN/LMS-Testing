// JS for Record Payment Page
// Implements borrower/loan autocomplete, prefill, delay/fee calculation, receipt preview, summary modal, and AJAX submission

document.addEventListener('DOMContentLoaded', async () => {
    // Get userId from the global window object (set by EJS)
    const userId = window.userId;
    if (!userId) {
        console.error('No userId found');
        return;
    }

    // --- Prefill from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedBorrowerId = urlParams.get('borrowerId');
    const preselectedLoanId = urlParams.get('loanId');

    // --- DOM Elements ---
    const borrowerInput = document.getElementById('borrower');
    const loanInput = document.getElementById('loan');
    const paymentDateInput = document.getElementById('paymentDate');
    const paymentMethodInput = document.getElementById('paymentMethod');
    const principalPaidInput = document.getElementById('principalPaid');
    const interestPaidInput = document.getElementById('interestPaid');
    const delayInput = document.getElementById('delay');
    const lateFeeInput = document.getElementById('lateFee');
    const notesInput = document.getElementById('notes');
    const receiptInput = document.getElementById('receipt');
    const doneBtn = document.getElementById('doneBtn');
    const form = document.getElementById('recordPaymentForm');
    const summaryModal = document.getElementById('paymentSummaryModal');
    const closeSummaryModal = document.getElementById('closeSummaryModal');
    const savePaymentBtn = document.getElementById('savePaymentBtn');
    const summaryContent1 = document.getElementById('summaryContent1');
    const summaryContent2 = document.getElementById('summaryContent2');
    const successModal = document.getElementById('successModal');
    const receiptPhotoModal = document.getElementById('receiptPhotoModal');
    const receiptPhotoDisplay = document.getElementById('receiptPhotoDisplay');
    const closePhoto = document.querySelector('.close-photo');

    // --- State ---
    let borrowers = [];
    let loans = [];
    let selectedBorrowerId = preselectedBorrowerId || null;
    let selectedLoanId = preselectedLoanId || null;
    let selectedLoanObj = null;
    let selectedBorrowerObj = null;
    let receiptFile = null;

    // --- Helper: Format date ---
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
        });
    }

    // --- Fetch Borrowers ---
    async function fetchBorrowers() {
        try {
            const response = await fetch(`/api/borrowers-for-payment/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch borrowers');
            borrowers = await response.json();
            console.log('Fetched borrowers:', borrowers);
        } catch (err) {
            console.error('Error fetching borrowers:', err);
        }
    }

    // --- Fetch Loans for Borrower ---
    async function fetchLoans(borrowerId) {
        try {
            const response = await fetch(`/api/loans-for-payment/${userId}/${borrowerId}`);
            if (!response.ok) throw new Error('Failed to fetch loans');
            loans = await response.json();
            console.log('Fetched loans:', loans);
        } catch (err) {
            console.error('Error fetching loans:', err);
        }
    }

    // --- Autocomplete Dropdown Helper (from addLoan.js) ---
    function showAutocompleteDropdown(input, items, getLabel, onSelect) {
        removeDropdown();
        if (items.length === 0) {
            console.log('No matches for dropdown');
            return;
        }
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        items.forEach(item => {
            const option = document.createElement('div');
            option.className = 'autocomplete-option';
            option.textContent = getLabel(item);
            option.addEventListener('click', () => {
                onSelect(item);
                removeDropdown();
            });
            dropdown.appendChild(option);
        });
        input.parentNode.appendChild(dropdown);
        console.log('Dropdown shown with', items.length, 'items');
    }
    function removeDropdown() {
        const dropdown = document.querySelector('.autocomplete-dropdown');
        if (dropdown) dropdown.remove();
    }
    // Use the same click-outside logic as addLoan.js
    document.addEventListener('click', (e) => {
        if (!e.target.matches('#borrower') && !e.target.matches('#loan')) {
            const dropdown = document.querySelector('.autocomplete-dropdown');
            if (dropdown) dropdown.remove();
        }
    });

    // --- Borrower Autocomplete ---
    function setupBorrowerAutocomplete() {
        borrowerInput.addEventListener('input', async function() {
            const value = this.value.toLowerCase();
            if (value.length < 1) {
                removeDropdown();
                return;
            }
            const matches = borrowers.filter(b => b.full_name.toLowerCase().includes(value));
            showAutocompleteDropdown(
                borrowerInput,
                matches,
                b => b.full_name,
                async (borrower) => {
                    borrowerInput.value = borrower.full_name;
                    selectedBorrowerId = borrower.borrower_id;
                    selectedBorrowerObj = borrower;
                    loanInput.value = '';
                    selectedLoanId = null;
                    selectedLoanObj = null;
                    await fetchLoans(borrower.borrower_id);
                }
            );
        });
    }

    // --- Loan Autocomplete ---
    function setupLoanAutocomplete() {
        loanInput.addEventListener('input', function() {
            if (!selectedBorrowerId) {
                loanInput.value = '';
                removeDropdown();
                return;
            }
            const value = this.value.toLowerCase();
            if (value.length < 1) {
                removeDropdown();
                return;
            }
            // Filter out cancelled and paid loans
            const activeLoans = loans.filter(l => l.status !== 'Paid' && l.status !== 'Cancelled');
            const matches = activeLoans.filter(l => l.loan_id.toLowerCase().includes(value));
            showAutocompleteDropdown(
                loanInput,
                matches,
                l => `${l.loan_id} - ${formatDate(l.next_due_date)}`,
                (loan) => {
                    loanInput.value = `${loan.loan_id} - ${formatDate(l.next_due_date)}`;
                    selectedLoanId = loan.loan_id;
                    selectedLoanObj = loan;
                    // Prefill interest with remaining amount for current period
                    interestPaidInput.value = loan.remaining_interest.toFixed(2);
                    // Ensure payment date is set before calculating delay and fee
                    if (!paymentDateInput.value) {
                        const today = new Date();
                        paymentDateInput.value = today.toISOString().split('T')[0];
                    }
                    updateDelayAndFee(loan);
                }
            );
        });
    }

    // --- Update Delay and Late Fee ---
    function updateDelayAndFee(loan) {
        if (!loan) return;
        const paymentDate = new Date(paymentDateInput.value); // Use selected payment date
        const dueDate = new Date(loan.next_due_date);
        const delay = Math.max(0, Math.floor((paymentDate - dueDate) / (1000 * 60 * 60 * 24)));
        delayInput.value = delay;

        // Get period days based on payment frequency
        let periodDays;
        switch(loan.payment_frequency) {
            case 'Weekly': periodDays = 7; break;
            case 'Fortnightly': periodDays = 14; break;
            case 'Monthly': periodDays = 30; break;
            case 'Quarterly': periodDays = 90; break;
            case 'Semi-annually': periodDays = 180; break;
            case 'Annually': periodDays = 365; break;
            default: periodDays = 30;
        }

        // Calculate late fee using the new formula with remaining principal
        const lateFee = delay > 0 ? 
            (loan.remaining_principal * (loan.interest_rate/100) / periodDays * delay) : 0;
        lateFeeInput.value = lateFee.toFixed(2);
    }

    // --- Payment Date Prefill ---
    function prefillPaymentDate() {
        const today = new Date();
        paymentDateInput.value = today.toISOString().split('T')[0];
    }

    // --- Receipt Preview ---
    const receiptPreview = document.createElement('img');
    receiptPreview.style.maxWidth = '200px';
    receiptPreview.style.display = 'none';
    receiptInput.parentNode.appendChild(receiptPreview);
    receiptInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        receiptFile = file;
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                receiptPreview.src = e.target.result;
                receiptPreview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        } else {
            receiptPreview.style.display = 'none';
        }
    });

    // --- Modal Logic ---
    doneBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Validate required fields
        if (!selectedBorrowerId || !selectedLoanId || !principalPaidInput.value || !interestPaidInput.value || !paymentDateInput.value || !paymentMethodInput.value) {
            alert('Please fill in all required fields.');
            return;
        }
        // Fill summary modal
        summaryContent1.innerHTML = `
            <tr><td>Payer</td><td>: ${borrowerInput.value}</td></tr>
            <tr><td>Loan</td><td>: ${loanInput.value}</td></tr>
            <tr><td>Payment Date</td><td>: ${formatDate(paymentDateInput.value)}</td></tr>
            <tr><td>Payment Method</td><td>: ${paymentMethodInput.value}</td></tr>
            <tr><td>Principal Paid</td><td>: ${Number(principalPaidInput.value).toFixed(2)}</td></tr>
            <tr><td>Interest Paid</td><td>: ${Number(interestPaidInput.value).toFixed(2)}</td></tr>
        `;
        summaryContent2.innerHTML = `
            <tr><td>Delay</td><td>: ${delayInput.value} days</td></tr>
            <tr><td>Late Payment Fee</td><td>: ${lateFeeInput.value}</td></tr>
            <tr><td>Total Payment</td><td>: ${(Number(principalPaidInput.value) + Number(interestPaidInput.value) + Number(lateFeeInput.value)).toFixed(2)}</td></tr>
            <tr><td>Receipt</td><td>: ${receiptFile ? 'Uploaded' : 'No file uploaded'} ${receiptFile ? `<button class='viewAgreementButton' id='viewReceiptBtn'>View File</button>` : ''}</td></tr>
            <tr><td>Notes</td><td>:<br>${notesInput.value || ''}</td></tr>
        `;
        summaryModal.style.display = 'block';
        // View receipt in modal
        setTimeout(() => {
            const viewBtn = document.getElementById('viewReceiptBtn');
            if (viewBtn) {
                viewBtn.addEventListener('click', () => {
                    receiptPhotoDisplay.src = receiptPreview.src;
                    receiptPhotoModal.style.display = 'block';
                });
            }
        }, 100);
    });
    closeSummaryModal.addEventListener('click', () => {
        summaryModal.style.display = 'none';
    });
    closePhoto?.addEventListener('click', () => {
        receiptPhotoModal.style.display = 'none';
    });
    window.addEventListener('click', (event) => {
        if (event.target === summaryModal) summaryModal.style.display = 'none';
        if (event.target === receiptPhotoModal) receiptPhotoModal.style.display = 'none';
    });

    // --- Save Payment (AJAX) ---
    savePaymentBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        // Prevent multiple submissions
        if (savePaymentBtn.disabled) return;
        // Show loading overlay and disable button
        document.getElementById('loadingOverlay').style.display = 'flex';
        savePaymentBtn.disabled = true;
        // Prepare form data
        const formData = new FormData();
        formData.append('borrowerId', selectedBorrowerId);
        formData.append('loanId', selectedLoanId);
        formData.append('paymentDate', paymentDateInput.value);
        formData.append('paymentMethod', paymentMethodInput.value);
        formData.append('principalPaid', principalPaidInput.value);
        formData.append('interestPaid', interestPaidInput.value);
        formData.append('delay', delayInput.value);
        formData.append('lateFee', lateFeeInput.value);
        formData.append('notes', notesInput.value);
        if (receiptFile) formData.append('receipt', receiptFile);
        // Calculate total payment
        const totalPayment = (Number(principalPaidInput.value) + Number(interestPaidInput.value) + Number(lateFeeInput.value)).toFixed(2);
        formData.append('totalPayment', totalPayment);
        // AJAX POST
        try {
            const response = await fetch('/addPayment', {
                method: 'POST',
                body: formData
            });
            document.getElementById('loadingOverlay').style.display = 'none';
            savePaymentBtn.disabled = false;
            if (response.ok) {
                summaryModal.style.display = 'none';
                successModal.style.display = 'flex';
                setTimeout(() => {
                    window.location.href = '/payments';
                }, 1500);
            } else {
                alert('Failed to record payment.');
            }
        } catch (err) {
            document.getElementById('loadingOverlay').style.display = 'none';
            savePaymentBtn.disabled = false;
            alert('Error recording payment.');
        }
    });

    // --- Payment Date Change triggers delay/fee update ---
    paymentDateInput.addEventListener('change', () => {
        if (selectedLoanObj) updateDelayAndFee(selectedLoanObj);
    });
    // --- Loan change triggers delay/fee update ---
    loanInput.addEventListener('input', () => {
        if (selectedLoanObj) updateDelayAndFee(selectedLoanObj);
    });

    // --- Prefill logic ---
    await fetchBorrowers();
    setupBorrowerAutocomplete();
    setupLoanAutocomplete();
    prefillPaymentDate();
    // Prefill borrower and loan after data is loaded
    if (preselectedBorrowerId) {
        const b = borrowers.find(b => b.borrower_id === preselectedBorrowerId);
        if (b) {
            borrowerInput.value = b.full_name;
            selectedBorrowerId = b.borrower_id;
            selectedBorrowerObj = b;
            await fetchLoans(selectedBorrowerId);
            // Prefill loan after loans are loaded
            if (preselectedLoanId) {
                const l = loans.find(l => l.loan_id === preselectedLoanId);
                if (l) {
                    loanInput.value = `${l.loan_id} - ${formatDate(l.next_due_date)}`;
                    selectedLoanId = l.loan_id;
                    selectedLoanObj = l;
                    // Prefill interest with remaining amount for current period
                    interestPaidInput.value = l.remaining_interest.toFixed(2);
                    updateDelayAndFee(l);
                }
            }
        }
    }
});
// Add styles for autocomplete (from addLoan.js)
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

document.getElementById("backButton").addEventListener("click", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const loanId = urlParams.get('loanId');
    const from = urlParams.get('from');
    if (from === 'loans' && loanId) {
        window.location.href = `/loans?view=${loanId}`;
    } else {
        window.location.href = '/loans';
    }
});

