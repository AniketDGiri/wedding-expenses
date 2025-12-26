// Vendors Management Module
let vendorsModal;
let vendorSearchInput;
let vendorsList;
let allVendors = [];

// Initialize vendors functionality
document.addEventListener('DOMContentLoaded', () => {
    vendorsModal = document.getElementById('vendorsModal');
    vendorSearchInput = document.getElementById('vendorSearch');
    vendorsList = document.getElementById('vendorsList');
    
    setupVendorsEventListeners();
});

// Setup event listeners
function setupVendorsEventListeners() {
    const viewVendorsBtn = document.getElementById('viewVendorsBtn');
    const closeVendorsBtn = document.getElementById('closeVendorsBtn');
    
    if (viewVendorsBtn) {
        viewVendorsBtn.addEventListener('click', openVendorsModal);
    }
    
    if (closeVendorsBtn) {
        closeVendorsBtn.addEventListener('click', closeVendorsModal);
    }
    
    // Close modal when clicking outside
    if (vendorsModal) {
        vendorsModal.addEventListener('click', (e) => {
            if (e.target === vendorsModal) {
                closeVendorsModal();
            }
        });
    }
    
    // Search functionality
    if (vendorSearchInput) {
        vendorSearchInput.addEventListener('input', (e) => {
            filterVendors(e.target.value);
        });
    }
}

// Open vendors modal
function openVendorsModal() {
    if (!vendorsModal) return;
    
    vendorsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    loadVendors();
}

// Close vendors modal
function closeVendorsModal() {
    if (!vendorsModal) return;
    
    vendorsModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Clear search
    if (vendorSearchInput) {
        vendorSearchInput.value = '';
    }
}

// Load vendors from expenses
function loadVendors() {
    const currentUser = getCurrentUser();
    if (!currentUser || !vendorsList) return;
    
    const weddingId = getWeddingId();
    if (!weddingId) {
        vendorsList.innerHTML = '<div class="error">Wedding ID not found</div>';
        return;
    }
    
    vendorsList.innerHTML = '<div class="loading">Loading vendors...</div>';
    
    // Get all expenses for current wedding
    db.collection('expenses')
        .where('weddingId', '==', weddingId)
        .get()
        .then(snapshot => {
            // Create a map to track unique vendors
            const vendorsMap = new Map();
            
            snapshot.forEach(doc => {
                const expense = doc.data();
                const vendorKey = expense.vendorName.toLowerCase().trim();
                
                if (!vendorsMap.has(vendorKey)) {
                    vendorsMap.set(vendorKey, {
                        name: expense.vendorName,
                        contact: expense.vendorContact || 'No contact',
                        totalAmount: expense.amount,
                        paidAmount: expense.amountPaid,
                        transactions: 1,
                        lastUpdated: expense.createdAt
                    });
                } else {
                    // Update existing vendor
                    const vendor = vendorsMap.get(vendorKey);
                    vendor.totalAmount += expense.amount;
                    vendor.paidAmount += expense.amountPaid;
                    vendor.transactions += 1;
                    
                    // Update contact if new one is provided
                    if (expense.vendorContact && expense.vendorContact !== 'No contact') {
                        vendor.contact = expense.vendorContact;
                    }
                    
                    // Update last updated time
                    if (expense.createdAt && (!vendor.lastUpdated || expense.createdAt > vendor.lastUpdated)) {
                        vendor.lastUpdated = expense.createdAt;
                    }
                }
            });
            
            // Convert map to array
            allVendors = Array.from(vendorsMap.values());
            
            // Sort by total amount (highest first)
            allVendors.sort((a, b) => b.totalAmount - a.totalAmount);
            
            displayVendors(allVendors);
        })
        .catch(error => {
            console.error('Error loading vendors:', error);
            vendorsList.innerHTML = '<div class="error">Failed to load vendors</div>';
        });
}

// Display vendors
function displayVendors(vendors) {
    if (!vendorsList) return;
    
    if (vendors.length === 0) {
        vendorsList.innerHTML = `
            <div class="no-vendors">
                <p>📝 No vendors found</p>
                <p class="hint">Add expenses to see vendor details here</p>
            </div>
        `;
        return;
    }
    
    vendorsList.innerHTML = vendors.map(vendor => createVendorCard(vendor)).join('');
}

// Create vendor card HTML
function createVendorCard(vendor) {
    const pending = vendor.totalAmount - vendor.paidAmount;
    const paymentStatus = pending === 0 ? 'paid' : pending < vendor.totalAmount ? 'partial' : 'pending';
    
    return `
        <div class="vendor-card">
            <div class="vendor-header">
                <h3>${vendor.name}</h3>
                <span class="vendor-status status-${paymentStatus}">
                    ${paymentStatus === 'paid' ? '✓ Paid' : paymentStatus === 'partial' ? '⏳ Partial' : '⏰ Pending'}
                </span>
            </div>
            <div class="vendor-details">
                <div class="vendor-contact">
                    <span class="label">📞 Contact:</span>
                    <span class="value">${vendor.contact}</span>
                    ${vendor.contact !== 'No contact' ? `<button class="btn-call" onclick="callVendor('${vendor.contact}')">📞 Call</button>` : ''}
                </div>
                <div class="vendor-info-grid">
                    <div class="info-item">
                        <span class="label">Total Amount</span>
                        <span class="value amount">₹${formatNumber(vendor.totalAmount)}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Paid</span>
                        <span class="value paid">₹${formatNumber(vendor.paidAmount)}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Pending</span>
                        <span class="value pending">₹${formatNumber(pending)}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Transactions</span>
                        <span class="value">${vendor.transactions}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Filter vendors by search term
function filterVendors(searchTerm) {
    if (!searchTerm.trim()) {
        displayVendors(allVendors);
        return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = allVendors.filter(vendor => 
        vendor.name.toLowerCase().includes(term) ||
        vendor.contact.toLowerCase().includes(term)
    );
    
    displayVendors(filtered);
}

// Call vendor
function callVendor(phoneNumber) {
    window.location.href = `tel:${phoneNumber}`;
}

// Export function to refresh vendors when expenses change
window.refreshVendors = function() {
    if (vendorsModal && vendorsModal.style.display === 'flex') {
        loadVendors();
    }
};
