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

    const tbody = document.getElementById('borrower-tbody');
    const modal = document.getElementById('borrowerModal');
    const modalContent = document.getElementById('modalContent1');
    const modalContent2 = document.getElementById('modalContent2');

    const editContent1 = document.getElementById('editContent1');
    const editContent2 = document.getElementById('editContent2');

    const closeModal = document.querySelector('.close-modal');

    const filterField = document.getElementById('filter-field');
    const searchInput = document.getElementById('search-input');

    const viewWrapper = document.querySelector('.viewWrapper');
    const editWrapper = document.querySelector('.editWrapper');

        // Add these variables at the top
    const removeBg = document.querySelector('.remove-bg');
    const removeCancel = document.getElementById('removeCancel');
    let currentBorrowerToDelete = null;
    

    if (!userId) {
        console.error("No user ID found.");
        return;
    }

    let allBorrowers = [];
    let timeoutId;

    // Function to fetch borrowers
    async function fetchBorrowers() {
        try {
            const response = await fetch(`/api/borrowers/${userId}`);
            allBorrowers = await response.json();
            
            if (!Array.isArray(allBorrowers)) throw new Error("Invalid data format");
            renderBorrowers(allBorrowers);

            // Original modal-opening logic
            const urlParams = new URLSearchParams(window.location.search);
            const viewBorrowerId = urlParams.get('view');
            if (viewBorrowerId) {
                const borrower = allBorrowers.find(b => b.borrowerId === viewBorrowerId);
                if (borrower) {
                    showBorrowerModal(borrower);
                }
            }
        } catch (err) {
            console.error('Error loading borrowers:', err);
            tbody.innerHTML = `<tr><td colspan="5">Failed to load borrower data.</td></tr>`;
        }
    }

    // Function to render filtered borrowers
    function renderBorrowers(borrowers) {
        tbody.innerHTML = '';
        
        borrowers.forEach(borrow => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span style="font-weight: 500;">${borrow.borrower}</span></td>
                <td>${borrow.contact}</td>
                <td>${borrow.email}</td>
                <td class="${borrow.status === 'Active' ? 'active' : 'inactive'}">${borrow.status}</td>
                <td id="act-btn">
                    <button class="edit-btn" id="editDetailsBtn" data-id="${borrow.borrowerId}">
                        Edit
                    </button>
                    <button class="action-btn" id="detailsBtn" data-id="${borrow.borrowerId}">
                        View Details
                    </button>
                    <button class="delete-btn" id="deleteBtn" data-id="${borrow.borrowerId}">
                        Remove
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        let borrowerIdTest;
        
         // Add click handlers to all action buttons
         document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                borrowerIdTest = btn.getAttribute('data-id');
                const borrower = allBorrowers.find(b => b.borrowerId === borrowerIdTest);
                showBorrowerModal(borrower);
            });
        });


        // Add click handlers to all action buttons
         document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const borrowerId = btn.getAttribute('data-id');
                const borrower = allBorrowers.find(b => b.borrowerId === borrowerId);
                showBorrowerModal(borrower);
                showBorrowerEdit(borrower);
            });
        });

        
        // Add modal edit button handler
        document.getElementById('editBtn').addEventListener('click', () => {
            const borrower = allBorrowers.find(b => b.borrowerId === borrowerIdTest);
            showBorrowerEdit(borrower);

            
        });
        
    }
    


function showBorrowerEdit(borrower) {
    editContent1.innerHTML = `
        <tr><td>First Name</td><td>: <input type="text" id="firstNameEdit" name="firstName" value="${borrower.firstName}"></td></tr>
        <tr><td>Last Name</td><td>: <input type="text" id="lastNameEdit" name="lastName" value="${borrower.lastName}"></td></tr>
        <tr><td>Middle Name</td><td>: <input type="text" id="middleNameEdit" name="middleName" value="${borrower.middleName}"></td></tr>
        <tr><td>Email/Facebook</td><td>: <input type="text" id="emailEdit" name="email" value="${borrower.email}"></td></tr>
        <tr><td>Contact Number</td><td>: <input type="tel" id="contactEdit" name="contact" value="${borrower.contact}"></td></tr>
        <tr><td>Gender</td><td>: 
          <select id="genderEdit" name="gender">
            <option value="Male" ${borrower.gender === 'Male' ? 'selected' : ''}>Male</option>
            <option value="Female" ${borrower.gender === 'Female' ? 'selected' : ''}>Female</option>
          </select>
        </td></tr>
        <tr><td>Birthdate</td><td>: <input type="date" id="birthdateEdit" name="birthdate" required></td></tr>
        <tr><td>Home Address</td><td>: <textarea id="addressEdit" name="address">${borrower.address}</textarea></td></tr>
    `;

    // Convert date from "MMM dd, yyyy" to "yyyy-MM-dd" format for the date input
    const dateParts = borrower.birthDate.replace(',', '').split(' ');
    const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    const month = months[dateParts[0]];
    const day = dateParts[1].padStart(2, '0');
    const year = dateParts[2];
    const formattedDate = `${year}-${month}-${day}`;
    
    // Set the date value
    document.getElementById('birthdateEdit').value = formattedDate;

    editContent2.innerHTML = `
        <tr><td>Gcash Number</td><td>: <input type="tel" id="gcashEdit" name="gcash" value="${borrower.gcash}"></td></tr>
        <tr><td>Total Active Loans</td><td>: <input type="text" id="activeLoansEdit" value="${borrower.totalActiveLoans}" readonly></td></tr>
        <tr><td>Total Amount Borrowed</td><td>: <input type="text" id="amountBorrowedEdit" value="${borrower.totalAmountBorrowed}" readonly></td></tr>
        <tr><td>Total Paid</td><td>: <input type="text" id="totalPaidEdit" value="${borrower.totalPaid}" readonly></td></tr>
        <tr><td>Remaining Balance</td><td>: <input type="text" id="balanceEdit" value="${borrower.remainingBalance}" readonly></td></tr>
        <tr>
            <td>Photo ID</td>
            <td>: <span id="currentFileName">${borrower.photoId}</span>
                <!-- Hidden file input (for new upload) -->
                <input type="file" id="fileUpload" name="photoId" style="display: none;">
                <!-- Button to trigger file selection -->
                 <br>
                <button type="button" onclick="document.getElementById('fileUpload').click()">
                Change
                </button>
            </td>
        </tr>
    `;

    // Add current borrower ID to the save button
    document.getElementById('saveBtn').dataset.borrowerId = borrower.borrowerId;

    editWrapper.style.display = 'block';
    viewWrapper.style.display = 'none';
}

// Cancel button handler
document.getElementById('cancelBtn').addEventListener('click', () => {
    editWrapper.style.display = 'none';
    viewWrapper.style.display = 'block';
});

function showBorrowerModal(borrower) {
    modalContent.innerHTML = `
        <tr><td>First Name</td><td>: <span id="firstNameView">${borrower.firstName}</span></td></tr>
        <tr><td>Last Name</td><td>: <span id="lastNameView">${borrower.lastName}</span></td></tr>
        <tr><td>Middle Name</td><td>: <span id="middleNameView">${borrower.middleName}</span></td></tr>
        <tr><td>Email/Facebook</td><td>: <span id="emailView">${borrower.email}</span></td></tr>
        <tr><td>Contact Number</td><td>: <span id="contactView">${borrower.contact}</span></td></tr>
        <tr><td>Gender</td><td>: <span id="genderView">${borrower.gender}</span></td></tr>
        <tr><td>Birthdate</td><td>: <span id="birthdateView">${borrower.birthDate}</span></td></tr>
        <tr><td>Home Address</td><td id="addCont">: <span id="addressView">${borrower.address}</span></td></tr>
    `;

    // Ensure balance is not negative
    const displayBalance = Math.max(0, parseFloat(borrower.remainingBalance));

    modalContent2.innerHTML = `
        <tr><td>Gcash Number</td><td>: <span id="gcashView">${borrower.gcash}</span></td></tr>
        <tr><td>Total Active Loans</td><td>: <span id="activeLoansView">${borrower.totalActiveLoans}</span></td></tr>
        <tr><td>Total Amount Borrowed</td><td>: <span id="amountBorrowedView">${borrower.totalAmountBorrowed}</span></td></tr>
        <tr><td>Total Paid</td><td>: <span id="totalPaidView">${borrower.totalPaid}</span></td></tr>
        <tr><td>Remaining Balance</td><td>: <span id="balanceView">${Math.max(0, parseFloat(borrower.remainingPrincipal || 0) + parseFloat(borrower.remainingInterest || 0)).toFixed(2)}</span></td></tr>
        <tr><td>Photo ID</td><td>: 
        ${borrower.photoId ? 
            `<button class="viewIdButton" data-photo="/uploads/${borrower.photoId}">View ID</button>`
            : 
            'No ID uploaded'
        }
    </td></tr>
    `;

    // Add click handler for Add New Loan button
    document.getElementById('addLoan').addEventListener('click', () => {
        window.location.href = `/add-loan?borrowerId=${borrower.borrowerId}`;
    });

    // Add click handler to the button
    if (borrower.photoId) {
        const viewBtn = modalContent2.querySelector('.viewIdButton');
        viewBtn.addEventListener('click', () => {
            document.getElementById('idPhotoDisplay').src = viewBtn.dataset.photo;
            document.getElementById('idPhotoModal').style.display = 'block';
        });
    }
    modal.style.display = 'block';
}

document.querySelector('.close-photo').addEventListener('click', () => {
    document.getElementById('idPhotoModal').style.display = 'none';
});

// Close when clicking outside image
window.addEventListener('click', (event) => {
    const modal = document.getElementById('idPhotoModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});




         // Close modal when clicking X
    closeModal.addEventListener('click', () => {
        viewWrapper.style.display = 'block';
        editWrapper.style.display = 'none';
        modal.style.display = 'none';
    });

    // // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        const modal2 = document.getElementById('modal-flex');
        if (event.target === modal2) {
            modal.style.display = 'none';
            viewWrapper.style.display = 'block';
            editWrapper.style.display = 'none';
        }
    });

    // Add this conversion function
function convertToMMDDYYYY(dateString) {
    const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };

    // Split "MMM dd, yyyy" into parts
    const [monthAbbr, day, year] = dateString.replace(',', '').split(' ');

    // Format day with leading zero if needed
    const formattedDay = day.padStart(2, '0');
    
    return `${months[monthAbbr]}/${formattedDay}/${year}`;
}




    // Delete button handler
    document.addEventListener('click', (e) => {
        if (e.target.closest('#deleteBtn')) {
            const btn = e.target.closest('#deleteBtn');
            currentBorrowerToDelete = {
                id: btn.getAttribute('data-id'),
                photoPath: allBorrowers.find(b => b.borrowerId === btn.getAttribute('data-id')).photoId
            };
            removeBg.style.display = 'block';
            console.log(currentBorrowerToDelete.photoPath);
            console.log(currentBorrowerToDelete.id);
        }
    });

    // Cancel removal
    removeCancel.addEventListener('click', () => {
        removeBg.style.display = 'none';
        currentBorrowerToDelete = null;
        document.getElementById('removePass').value = '';
    });

    // Handle borrower removal form submission
    document.querySelector('.remove-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('removePass').value;
        
        if (!currentBorrowerToDelete) {
            console.error('No borrower selected for deletion');
            return;
        }

        try {
            const response = await fetch('/delete-borrower', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    borrowerId: currentBorrowerToDelete.id, 
                    password: password, 
                    photoPath: currentBorrowerToDelete.photoPath 
                })
            });
            const result = await response.json();
            if (result.success) {
                document.querySelector('.remove-bg').style.display = 'none';
                const modal = document.createElement('div');
                modal.className = 'success-modal';
                modal.innerHTML = `
                    <div class="modal-content">
                      <div class="modal-blue"></div>
                        <i class="fa-regular fa-circle-check"></i>
                        <p>Borrower removed successfully!</p>
                    </div>
                `;
                document.body.appendChild(modal);
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                const errorDiv = document.getElementById('removeError');
                errorDiv.querySelector('p').textContent = result.message || 'Invalid password';
                errorDiv.classList.add('show');
            }
        } catch (err) {
            const errorDiv = document.getElementById('removeError');
            errorDiv.querySelector('p').textContent = 'An error occurred. Please try again.';
            errorDiv.classList.add('show');
        }
    });

    // Clear error when typing in password field
    document.getElementById('removePass').addEventListener('input', function() {
        document.getElementById('removeError').classList.remove('show');
    });

    // Save button handler
    document.getElementById('saveBtn').addEventListener('click', async (e) => {
        e.preventDefault();

        // Get form data
        const formData = new FormData();
        const borrowerId = e.target.dataset.borrowerId;
        
        // Required fields validation
        const firstName = document.getElementById('firstNameEdit').value.trim();
        const lastName = document.getElementById('lastNameEdit').value.trim();
        const middleName = document.getElementById('middleNameEdit').value.trim();
        const email = document.getElementById('emailEdit').value.trim();
        const contact = document.getElementById('contactEdit').value.trim();
        const gender = document.getElementById('genderEdit').value;
        const birthdate = document.getElementById('birthdateEdit').value;
        const address = document.getElementById('addressEdit').value.trim();
        const gcash = document.getElementById('gcashEdit').value.trim();
        const fileInput = document.getElementById('fileUpload');

        // Validate required fields
        if (!firstName || !lastName || !middleName || !email || !contact || !gender || !birthdate || !address) {
            alert('Please fill in all required fields');
            return;
        }

        // Validate contact and gcash number format (11 digits)
        const numberPattern = /^\d{11}$/;
        if (!numberPattern.test(contact)) {
            alert('Contact number must be 11 digits');
            return;
        }
        if (gcash && gcash !== 'None' && !numberPattern.test(gcash)) {
            alert('GCash number must be 11 digits');
            return;
        }

        // Append form data
        formData.append('borrowerId', borrowerId);
        formData.append('firstName', firstName);
        formData.append('lastName', lastName);
        formData.append('middleName', middleName);
        formData.append('email', email);
        formData.append('contact', contact);
        formData.append('gender', gender);
        formData.append('birthdate', birthdate);
        formData.append('address', address);
        formData.append('gcash', gcash);

        // Append file if selected
        if (fileInput.files[0]) {
            formData.append('photoId', fileInput.files[0]);
        }

        try {
            const response = await fetch('/update-borrower', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (response.ok) {
                // Show success modal
                const modal = document.createElement('div');
                modal.className = 'success-modal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-blue"></div>
                        <i class="fa-regular fa-circle-check"></i>
                        <p>Borrower updated!</p>
                    </div>
                `;
                document.body.appendChild(modal);

                // Hide edit modal and refresh
                document.getElementById('borrowerModal').style.display = 'none';
                setTimeout(() => {
                    modal.remove();
                    fetchBorrowers(); // Refresh the borrowers list
                }, 1000);
            } else {
                alert(result.message || 'Update failed');
            }
        } catch (err) {
            console.error('Update error:', err);
            alert('Error updating borrower');
        }
    });

    // Function to filter borrowers
    function filterBorrowers() {
        const searchTerm = searchInput.value.toLowerCase();
        const filterBy = filterField.value;
        
        if (!searchTerm) {
            renderBorrowers(allBorrowers);
            return;
        }
        
        const filtered = allBorrowers.filter(borrow => {
            // Handle different filter fields
            if (filterBy === 'gender') {
                return new RegExp(`\\b${searchTerm}`, 'i').test(borrow.gender);
            }
            switch(filterBy) {
                case 'borrower':
                    return borrow.borrower.toLowerCase().includes(searchTerm);
                case 'email':
                    return borrow.email.toLowerCase().includes(searchTerm);
                case 'contact':
                    return borrow.contact.toLowerCase().includes(searchTerm);
                case 'gender':
                    return borrow.gender.toLowerCase().includes(searchTerm);
                case 'status':
                    return borrow.status.toLowerCase().includes(searchTerm);
                default:
                    return true;
            }
        });
        
        renderBorrowers(filtered);
    }

    // Debounce function
    function debounce(func, delay) {
        return function() {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, arguments), delay);
        };
    }

    // Event listeners
    searchInput.addEventListener('input', debounce(filterBorrowers, 300));
    filterField.addEventListener('change', filterBorrowers);

    // Initial fetch
    await fetchBorrowers();

    // Add input event listener for password
    document.getElementById('removePass').addEventListener('input', function() {
        document.getElementById('removeError').classList.remove('show');
    });
});



