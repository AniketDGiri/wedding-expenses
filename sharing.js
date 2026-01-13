// Sharing Module - Google Docs style sharing functionality
let currentExpenseTracker = null;
let sharedUsers = [];

// Initialize sharing functionality
function initSharing() {
    setupSharingEventListeners();
}

// Setup event listeners for sharing
function setupSharingEventListeners() {
    const shareBtn = document.getElementById('shareBtn');
    const closeSharingBtn = document.getElementById('closeSharingBtn');
    const addShareBtn = document.getElementById('addShareBtn');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    
    if (shareBtn) {
        shareBtn.addEventListener('click', openSharingModal);
    }
    
    if (closeSharingBtn) {
        closeSharingBtn.addEventListener('click', closeSharingModal);
    }
    
    if (addShareBtn) {
        addShareBtn.addEventListener('click', addUserToShare);
    }
    
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', copyShareLink);
    }
}

// Open sharing modal
async function openSharingModal() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Please login to share');
        return;
    }
    
    const modal = document.getElementById('sharingModal');
    if (modal) {
        modal.style.display = 'flex';
        await loadSharedUsers();
        generateShareLink();
    }
}

// Close sharing modal
function closeSharingModal() {
    const modal = document.getElementById('sharingModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('shareEmail').value = '';
    }
}

// Add user to share list
async function addUserToShare() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Please login first');
        return;
    }
    
    // Check if db is available
    if (typeof db === 'undefined') {
        alert('Database not initialized. Please refresh the page.');
        return;
    }
    
    const email = document.getElementById('shareEmail').value.trim().toLowerCase();
    const permission = document.getElementById('sharePermission').value;
    
    if (!email) {
        alert('Please enter an email address');
        return;
    }
    
    if (!validateEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    if (email === currentUser.email.toLowerCase()) {
        alert('You cannot share with yourself');
        return;
    }
    
    // Show loading state
    const addBtn = document.getElementById('addShareBtn');
    const originalText = addBtn.textContent;
    addBtn.textContent = 'Adding...';
    addBtn.disabled = true;
    
    try {
        console.log('Starting share process for:', email);
        
        // Create or update sharing document
        const sharingRef = db.collection('sharing').doc(currentUser.uid);
        
        // First, get existing document to check for duplicates
        let existingSharedWith = [];
        try {
            const existingDoc = await sharingRef.get();
            if (existingDoc.exists) {
                existingSharedWith = existingDoc.data().sharedWith || [];
                // Check if user already has access
                if (existingSharedWith.some(u => u.email.toLowerCase() === email)) {
                    alert('This user already has access. Remove them first to change permissions.');
                    return;
                }
            }
        } catch (readError) {
            console.log('No existing sharing doc, creating new one');
        }
        
        // Add new user to the array
        const newSharedUser = {
            email: email,
            permission: permission,
            addedAt: new Date().toISOString()
        };
        
        console.log('Saving to sharing collection...');
        await sharingRef.set({
            owner: currentUser.uid,
            ownerEmail: currentUser.email,
            sharedWith: [...existingSharedWith, newSharedUser],
            updatedAt: new Date().toISOString()
        });
        console.log('Saved to sharing collection');
        
        // Also create a reverse lookup for the shared user
        console.log('Saving to sharedWithMe collection...');
        const sharedWithMeRef = db.collection('sharedWithMe').doc(email);
        let existingTrackers = [];
        
        try {
            const sharedWithMeDoc = await sharedWithMeRef.get();
            if (sharedWithMeDoc.exists) {
                existingTrackers = sharedWithMeDoc.data().sharedTrackers || [];
                // Remove existing entry for this owner if any
                existingTrackers = existingTrackers.filter(t => t.ownerId !== currentUser.uid);
            }
        } catch (readError) {
            console.log('No existing sharedWithMe doc, creating new one');
        }
        
        const newTracker = {
            ownerId: currentUser.uid,
            ownerEmail: currentUser.email,
            permission: permission,
            sharedAt: new Date().toISOString()
        };
        
        await sharedWithMeRef.set({
            sharedTrackers: [...existingTrackers, newTracker]
        });
        console.log('Saved to sharedWithMe collection');
        
        showNotification(`Successfully shared with ${email}`, 'success');
        document.getElementById('shareEmail').value = '';
        await loadSharedUsers();
        
    } catch (error) {
        console.error('Error sharing:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 'permission-denied') {
            alert('Permission denied. Please check Firebase security rules.');
        } else {
            showNotification('Failed to share. Please try again.', 'error');
        }
    } finally {
        // Reset button state
        addBtn.textContent = originalText;
        addBtn.disabled = false;
    }
}

// Load shared users
async function loadSharedUsers() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    try {
        const sharingDoc = await db.collection('sharing').doc(currentUser.uid).get();
        const sharedUsersList = document.getElementById('sharedUsersList');
        
        if (!sharedUsersList) return;
        
        sharedUsersList.innerHTML = '';
        
        // Add owner first
        const ownerItem = createSharedUserItem(
            currentUser.email,
            'owner',
            currentUser.displayName || 'You',
            true
        );
        sharedUsersList.appendChild(ownerItem);
        
        if (sharingDoc.exists) {
            const data = sharingDoc.data();
            sharedUsers = data.sharedWith || [];
            
            if (sharedUsers.length === 0) {
                const emptyMsg = document.createElement('p');
                emptyMsg.style.cssText = 'color: #999; text-align: center; padding: 20px;';
                emptyMsg.textContent = 'No one else has access yet';
                sharedUsersList.appendChild(emptyMsg);
            } else {
                sharedUsers.forEach(user => {
                    const userItem = createSharedUserItem(user.email, user.permission, null, false);
                    sharedUsersList.appendChild(userItem);
                });
            }
        } else {
            const emptyMsg = document.createElement('p');
            emptyMsg.style.cssText = 'color: #999; text-align: center; padding: 20px;';
            emptyMsg.textContent = 'No one else has access yet';
            sharedUsersList.appendChild(emptyMsg);
        }
        
    } catch (error) {
        console.error('Error loading shared users:', error);
    }
}

// Create shared user item element
function createSharedUserItem(email, permission, displayName, isOwner) {
    const item = document.createElement('div');
    item.className = 'shared-user-item';
    
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info-share';
    
    const emailDiv = document.createElement('div');
    emailDiv.className = 'user-email';
    emailDiv.textContent = displayName || email;
    
    const roleDiv = document.createElement('div');
    roleDiv.className = 'user-role';
    roleDiv.textContent = displayName ? email : '';
    
    userInfo.appendChild(emailDiv);
    if (roleDiv.textContent) {
        userInfo.appendChild(roleDiv);
    }
    
    const permissionBadge = document.createElement('span');
    permissionBadge.className = `permission-badge ${permission}`;
    permissionBadge.textContent = permission === 'owner' ? 'Owner' : 
                                   permission === 'edit' ? 'Can Edit' : 'Can View';
    
    item.appendChild(userInfo);
    item.appendChild(permissionBadge);
    
    if (!isOwner) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-remove-share';
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = () => removeUserFromShare(email);
        item.appendChild(removeBtn);
    }
    
    return item;
}

// Remove user from share list
async function removeUserFromShare(email) {
    if (!confirm(`Remove access for ${email}?`)) {
        return;
    }
    
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    try {
        const sharingRef = db.collection('sharing').doc(currentUser.uid);
        const sharingDoc = await sharingRef.get();
        
        if (sharingDoc.exists) {
            const data = sharingDoc.data();
            const updatedSharedWith = data.sharedWith.filter(user => user.email !== email);
            
            await sharingRef.update({
                sharedWith: updatedSharedWith,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Remove from reverse lookup
            const sharedWithMeRef = db.collection('sharedWithMe').doc(email);
            const sharedWithMeDoc = await sharedWithMeRef.get();
            
            if (sharedWithMeDoc.exists) {
                const sharedData = sharedWithMeDoc.data();
                const updatedTrackers = sharedData.sharedTrackers.filter(
                    tracker => tracker.ownerId !== currentUser.uid
                );
                
                if (updatedTrackers.length === 0) {
                    await sharedWithMeRef.delete();
                } else {
                    await sharedWithMeRef.update({
                        sharedTrackers: updatedTrackers
                    });
                }
            }
            
            showNotification(`Removed access for ${email}`, 'success');
            await loadSharedUsers();
        }
        
    } catch (error) {
        console.error('Error removing user:', error);
        showNotification('Failed to remove user. Please try again.', 'error');
    }
}

// Generate share link
function generateShareLink() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const shareLinkInput = document.getElementById('shareLinkInput');
    if (shareLinkInput) {
        // In a real app, this would be a proper shareable link
        // For now, we'll use the tracker ID
        const baseUrl = window.location.origin + window.location.pathname;
        const shareLink = `${baseUrl}?tracker=${currentUser.uid}`;
        shareLinkInput.value = shareLink;
    }
}

// Copy share link to clipboard
async function copyShareLink() {
    const shareLinkInput = document.getElementById('shareLinkInput');
    if (!shareLinkInput || !shareLinkInput.value) {
        alert('No share link available');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(shareLinkInput.value);
        showNotification('Link copied to clipboard!', 'success');
        
        // Visual feedback
        const copyBtn = document.getElementById('copyLinkBtn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
        
    } catch (error) {
        console.error('Failed to copy:', error);
        // Fallback for older browsers
        shareLinkInput.select();
        document.execCommand('copy');
        showNotification('Link copied to clipboard!', 'success');
    }
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Check user permission for a tracker
async function getUserPermission(ownerId) {
    const currentUser = getCurrentUser();
    if (!currentUser) return null;
    
    // If user is the owner
    if (ownerId === currentUser.uid) {
        return 'owner';
    }
    
    try {
        // Check if tracker is shared with current user
        const sharedWithMeDoc = await db.collection('sharedWithMe').doc(currentUser.email).get();
        
        if (sharedWithMeDoc.exists) {
            const data = sharedWithMeDoc.data();
            const tracker = data.sharedTrackers.find(t => t.ownerId === ownerId);
            
            if (tracker) {
                return tracker.permission;
            }
        }
        
        return null;
        
    } catch (error) {
        console.error('Error checking permission:', error);
        return null;
    }
}

// Get all trackers accessible to current user (owned + shared)
async function getAccessibleTrackers() {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];
    
    try {
        const trackers = [];
        
        // Add owned tracker
        trackers.push({
            ownerId: currentUser.uid,
            ownerEmail: currentUser.email,
            permission: 'owner'
        });
        
        // Add shared trackers
        const sharedWithMeDoc = await db.collection('sharedWithMe').doc(currentUser.email).get();
        
        if (sharedWithMeDoc.exists) {
            const data = sharedWithMeDoc.data();
            if (data.sharedTrackers) {
                trackers.push(...data.sharedTrackers);
            }
        }
        
        return trackers;
        
    } catch (error) {
        console.error('Error getting accessible trackers:', error);
        return [];
    }
}

// Apply permission-based UI restrictions
function applyPermissionRestrictions(permission) {
    const appContainer = document.getElementById('appContainer');
    if (!appContainer) return;
    
    if (permission === 'view') {
        // Add readonly class to disable editing
        appContainer.classList.add('readonly-mode');
        
        // Add banner to indicate view-only mode
        const existingBanner = document.querySelector('.readonly-banner');
        if (!existingBanner) {
            const banner = document.createElement('div');
            banner.className = 'readonly-banner';
            banner.textContent = '👁️ View Only Mode - You cannot edit this tracker';
            
            const header = document.querySelector('header');
            if (header) {
                header.insertAdjacentElement('afterend', banner);
            }
        }
    } else {
        // Remove readonly mode
        appContainer.classList.remove('readonly-mode');
        const banner = document.querySelector('.readonly-banner');
        if (banner) {
            banner.remove();
        }
    }
}

// Initialize sharing when the page loads
document.addEventListener('DOMContentLoaded', () => {
    if (typeof db !== 'undefined') {
        initSharing();
    }
});

// Export functions for use in other modules
window.sharingModule = {
    getUserPermission,
    getAccessibleTrackers,
    applyPermissionRestrictions
};
