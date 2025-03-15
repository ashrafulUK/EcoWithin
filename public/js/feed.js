document.addEventListener('DOMContentLoaded', function() {
    // Like button functionality
    document.querySelectorAll('.like-btn').forEach(button => {
        // Add a processing flag to prevent multiple rapid clicks
        button.addEventListener('click', async () => {
            // Prevent multiple clicks while processing
            if (button.dataset.processing === 'true') return;
            
            const postId = button.dataset.postId;
            try {
                // Set processing flag
                button.dataset.processing = 'true';
                button.disabled = true;
                
                const response = await fetch(`/posts/${postId}/like`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await response.json();
                
                if (data.success) {
                    // Update the likes count directly from server response
                    const likesCount = button.querySelector('.likes-count');
                    likesCount.textContent = data.likesCount;
                    
                    // Update button active state based on server response
                    if (data.liked) {
                        button.classList.add('active');
                    } else {
                        button.classList.remove('active');
                    }
                }
            } catch (err) {
                console.error('Error:', err);
            } finally {
                // Clear processing flag
                button.dataset.processing = 'false';
                button.disabled = false;
            }
        });
    });

    // Comment button functionality
    document.querySelectorAll('.comment-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const postCard = button.closest('.post-card');
            const postId = postCard.dataset.postId;
            
            // Check if comment form already exists
            let commentForm = postCard.querySelector('.comment-form');
            
            if (commentForm) {
                // Toggle visibility if form already exists
                commentForm.classList.toggle('d-none');
            } else {
                // Create comment form
                commentForm = document.createElement('div');
                commentForm.className = 'comment-form mt-3';
                commentForm.innerHTML = `
                    <form id="comment-form-${postId}" class="comment-submit-form">
                        <div class="input-group">
                            <input type="text" name="content" class="form-control" placeholder="Write a comment..." required>
                            <button type="submit" class="btn btn-success">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                        <div class="comment-error text-danger mt-1" style="display: none;"></div>
                    </form>
                `;
                
                // Add comments display area
                const commentsArea = document.createElement('div');
                commentsArea.className = 'comments-area mt-3';
                commentsArea.id = `comments-area-${postId}`;
                commentsArea.innerHTML = '<div class="text-center"><small>Loading comments...</small></div>';
                
                // Add form and comments to the post card
                const cardBody = postCard.querySelector('.card-body');
                cardBody.appendChild(commentForm);
                cardBody.appendChild(commentsArea);
                
                // Add form submission handler
                const form = commentForm.querySelector('form');
                form.addEventListener('submit', async function(event) {
                    event.preventDefault();
                    
                    const commentContent = form.querySelector('input[name="content"]').value;
                    const errorDisplay = commentForm.querySelector('.comment-error');
                    
                    try {
                        const response = await fetch(`/posts/${postId}/comment`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({ 
                                content: commentContent
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            // Clear form
                            form.reset();
                            errorDisplay.style.display = 'none';
                            
                            // Update comments area with the new comment
                            loadComments(postId, commentsArea);
                        } else {
                            errorDisplay.textContent = data.message || 'Error adding comment';
                            errorDisplay.style.display = 'block';
                        }
                    } catch (err) {
                        console.error('Error submitting comment:', err);
                        errorDisplay.textContent = 'Error submitting comment';
                        errorDisplay.style.display = 'block';
                    }
                });
                
                // Load existing comments
                loadComments(postId, commentsArea);
            }
        });
    });
    
    // Function to load comments for a post
    function loadComments(postId, commentsArea) {
        commentsArea.innerHTML = '<div class="text-center"><small>Loading comments...</small></div>';
        
        fetch(`/posts/${postId}/comments`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    if (data.comments.length > 0) {
                        commentsArea.innerHTML = '';
                        data.comments.forEach(comment => {
                            const commentEl = document.createElement('div');
                            commentEl.className = 'comment d-flex align-items-start mb-2';
                            commentEl.innerHTML = `
                                <img src="${comment.user.profilePicture || '/images/default-avatar.png'}" 
                                     alt="Profile" 
                                     class="rounded-circle me-2" 
                                     width="30" 
                                     height="30">
                                <div class="comment-bubble p-2 bg-light rounded">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h6 class="mb-0 fw-bold">${comment.user.username}</h6>
                                        <small class="text-muted">${new Date(comment.createdAt).toLocaleString()}</small>
                                    </div>
                                    <p class="mb-0">${comment.content}</p>
                                </div>
                            `;
                            commentsArea.appendChild(commentEl);
                        });
                    } else {
                        commentsArea.innerHTML = '<div class="text-center"><small class="text-muted">No comments yet</small></div>';
                    }
                } else {
                    commentsArea.innerHTML = '<div class="text-center"><small class="text-danger">Error loading comments</small></div>';
                }
            })
            .catch(err => {
                console.error('Error fetching comments:', err);
                commentsArea.innerHTML = '<div class="text-center"><small class="text-danger">Error loading comments</small></div>';
            });
    }
});
