// Theme colors from our eco-themed design system
const themeColors = {
    primary: '#2e7d32',
    secondary: '#7b1fa2',
    error: '#d32f2f',
    success: '#2e7d32',
    warning: '#f57c00',
    info: '#1976d2'
};

// Profile page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Handle profile form submission
    const profileForm = document.querySelector('#editProfileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(profileForm);
            
            try {
                const response = await fetch('/profile', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(Object.fromEntries(formData))
                });

                if (response.ok) {
                    window.location.reload();
                } else {
                    const data = await response.json();
                    showAlert(data.message || 'Error updating profile', 'danger');
                }
            } catch (err) {
                console.error('Error:', err);
                showAlert('Error updating profile', 'danger');
            }
        });
    }

    // Handle tab switching
    const profileTabs = document.querySelectorAll('#profileTabs .nav-link');
    if (profileTabs.length > 0) {
        profileTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(tab.getAttribute('href'));
                
                // Remove active class from all tabs and content
                document.querySelectorAll('#profileTabs .nav-link').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('show', 'active'));
                
                // Add active class to clicked tab and its content
                tab.classList.add('active');
                target.classList.add('show', 'active');
            });
        });
    }
});

// Utility function to show alerts
function showAlert(message, type = 'success') {
    const alertContainer = document.createElement('div');
    alertContainer.className = `alert alert-${type} alert-dismissible fade show fixed-top m-3`;
    alertContainer.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertContainer);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertContainer.remove();
    }, 5000);
}

// Handle file uploads for profile picture
const profilePictureInput = document.querySelector('#profilePictureInput');
if (profilePictureInput) {
    profilePictureInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profilePicture', file);

        try {
            const response = await fetch('/profile/upload-picture', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                window.location.reload();
            } else {
                const data = await response.json();
                showAlert(data.message || 'Error uploading picture', 'danger');
            }
        } catch (err) {
            console.error('Error:', err);
            showAlert('Error uploading picture', 'danger');
        }
    });
}

// Handle eco-interests selection
const interestsInput = document.querySelector('#interests');
if (interestsInput) {
    // Convert comma-separated string to array
    const interests = interestsInput.value.split(',').map(i => i.trim());
    
    // Create badges for each interest
    const interestsBadgesContainer = document.querySelector('#interestsBadges');
    if (interestsBadgesContainer) {
        interests.forEach(interest => {
            if (interest) {
                const badge = document.createElement('span');
                badge.className = 'badge bg-success me-2 mb-2';
                badge.textContent = interest;
                interestsBadgesContainer.appendChild(badge);
            }
        });
    }
}
