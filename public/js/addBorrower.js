document.getElementById("backButton").addEventListener("click", () => {
    window.history.back();
  });



//Basta mao nana yw
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const photoPreview = document.createElement('img');
    photoPreview.style.maxWidth = '200px';
    photoPreview.style.display = 'none';
    document.querySelector('#photoId').parentNode.appendChild(photoPreview);

    // Image preview handler
    document.getElementById('photoId').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                photoPreview.src = e.target.result;
                photoPreview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

    // Form submission handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        
        try {
            const response = await fetch('/addBorrower', {
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
                        <p>Borrower added successfully!</p>
                    </div>
                `;
                document.body.appendChild(modal);
                
                setTimeout(() => {
                    window.location.href = '/borrowers';
                }, 1500);
            }
        } catch (err) {
            console.error('Submission error:', err);
        }
    });
});

