// Payments Management Module
let paymentsModal;
let paymentSearchInput;
let paymentsList;
let allPayments = [];

// Initialize payments functionality
document.addEventListener('DOMContentLoaded', () => {
    paymentsModal = document.getElementById('paymentsModal');
    paymentSearchInput = document.getElementById('paymentSearch');
    paymentsList = document.getElementById('paymentsList');
    
    setupPaymentsEventListeners();
});

// Setup event listeners
function setupPaymentsEventListeners() {
    const viewPaymentsBtn = document.getElementById('viewPaymentsBtn');
    const closePaymentsBtn = document.getElementById('closePaymentsBtn');
    
    if (viewPaymentsBtn) {
        viewPaymentsBtn.addEventListener('click', openPaymentsModal);
    }
    
    if (closePaymentsBtn) {
        closePaymentsBtn.addEventListener('click', closePaymentsModal);
    }
    
    // Close modal when clicking outside
    if (paymentsModal) {
        paymentsModal.addEventListener('click', (e) => {
            if (e.target === paymentsModal) {
                closePaymentsModal();
            }
        });
    }
    
    // Search functionality
    if (paymentSearchInput) {
        paymentSearchInput.addEventListener('input', (e) => {
            filterPayments(e.target.value);
        });
    }
}

// Open payments modal
function openPaymentsModal() {
    if (!paymentsModal) return;
    
    paymentsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    loadPayments();
}

// Close payments modal
function closePaymentsModal() {
    if (!paymentsModal) return;
    
    paymentsModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Clear search
    if (paymentSearchInput) {
        paymentSearchInput.value = '';
    }
}

// Load payments from expenses
function loadPayments() {
    const currentUser = getCurrentUser();
    if (!currentUser || !paymentsList) return;
    
    paymentsList.innerHTML = '<div class="loading">Loading payment details...</div>';
    
    // Get all expenses for current user
    db.collection('expenses')
        .where('userId', '==', currentUser.uid)
        .get()
        .then(snapshot => {
            // Create a map to track payments by person
            const paymentsMap = new Map();
            let totalUnpaid = 0;
            
            snapshot.forEach(doc => {
                const expense = doc.data();
                const paidBy = expense.paidBy && expense.paidBy.trim() !== '' && expense.paidBy !== 'Not Paid' 
                    ? expense.paidBy.trim() 
                    : null;
                
                if (paidBy) {
                    const key = paidBy.toLowerCase();
                    
                    if (!paymentsMap.has(key)) {
                        paymentsMap.set(key, {
                            name: paidBy,
                            totalPaid: expense.amountPaid || 0,
                            expenseCount: 1,
                            vendors: new Set([expense.vendorName]),
                            transactions: [{
                                vendor: expense.vendorName,
                                amount: expense.amountPaid || 0,
                                totalExpense: expense.amount,
                                date: expense.createdAt
                            }]
                        });
                    } else {
                        const payment = paymentsMap.get(key);
                        payment.totalPaid += (expense.amountPaid || 0);
                        payment.expenseCount += 1;
                        payment.vendors.add(expense.vendorName);
                        payment.transactions.push({
                            vendor: expense.vendorName,
                            amount: expense.amountPaid || 0,
                            totalExpense: expense.amount,
                            date: expense.createdAt
                        });
                    }
                } else if (expense.amount > (expense.amountPaid || 0)) {
                    totalUnpaid += (expense.amount - (expense.amountPaid || 0));
                }
            });
            
            // Convert map to array
            allPayments = Array.from(paymentsMap.values()).map(payment => ({
                ...payment,
                vendors: Array.from(payment.vendors),
                vendorCount: payment.vendors.size
            }));
            
            // Sort by total paid (highest first)
            allPayments.sort((a, b) => b.totalPaid - a.totalPaid);
            
            displayPayments(allPayments, totalUnpaid);
        })
        .catch(error => {
            console.error('Error loading payments:', error);
            paymentsList.innerHTML = '<div class="error">Failed to load payment details</div>';
        });
}

// Display payments
function displayPayments(payments, totalUnpaid = 0) {
    if (!paymentsList) return;
    
    if (payments.length === 0 && totalUnpaid === 0) {
        paymentsList.innerHTML = `
            <div class="no-vendors">
                <p>💰 No payment records found</p>
                <p class="hint">Add expenses with "Paid By" information to see payment summary here</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // Add summary card at the top
    if (payments.length > 0) {
        const totalPaid = payments.reduce((sum, p) => sum + p.totalPaid, 0);
        const totalPeople = payments.length;
        
        html += `
            <div class="payment-summary-card">
                <div class="summary-header">
                    <h3>📊 Overall Summary</h3>
                </div>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="label">Total Paid</span>
                        <span class="value highlight">₹${formatNumber(totalPaid)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Contributors</span>
                        <span class="value">${totalPeople} ${totalPeople === 1 ? 'person' : 'people'}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Unpaid Balance</span>
                        <span class="value pending">₹${formatNumber(totalUnpaid)}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Add individual payment cards
    html += payments.map(payment => createPaymentCard(payment)).join('');
    
    paymentsList.innerHTML = html;
}

// Create payment card HTML
function createPaymentCard(payment) {
    const avgPerExpense = payment.totalPaid / payment.expenseCount;
    
    return `
        <div class="payment-card">
            <div class="payment-header">
                <div class="payer-info">
                    <h3>👤 ${payment.name}</h3>
                    <span class="payment-badge">Total Paid: ₹${formatNumber(payment.totalPaid)}</span>
                </div>
            </div>
            <div class="payment-stats">
                <div class="stat-item">
                    <span class="stat-icon">📦</span>
                    <div class="stat-content">
                        <span class="stat-label">Expenses Paid</span>
                        <span class="stat-value">${payment.expenseCount}</span>
                    </div>
                </div>
                <div class="stat-item">
                    <span class="stat-icon">🏪</span>
                    <div class="stat-content">
                        <span class="stat-label">Vendors</span>
                        <span class="stat-value">${payment.vendorCount}</span>
                    </div>
                </div>
                <div class="stat-item">
                    <span class="stat-icon">💵</span>
                    <div class="stat-content">
                        <span class="stat-label">Avg per Expense</span>
                        <span class="stat-value">₹${formatNumber(avgPerExpense)}</span>
                    </div>
                </div>
            </div>
            <div class="payment-details">
                <button class="btn-expand" onclick="togglePaymentDetails('${payment.name}')">
                    View Details ▼
                </button>
                <div class="payment-transactions" id="details-${payment.name.replace(/\s/g, '-')}" style="display: none;">
                    <h4>Transaction History</h4>
                    ${payment.transactions.map((txn, index) => `
                        <div class="transaction-item">
                            <div class="txn-info">
                                <span class="txn-vendor">🏪 ${txn.vendor}</span>
                                <span class="txn-date">${txn.date ? formatDate(txn.date) : 'N/A'}</span>
                            </div>
                            <div class="txn-amounts">
                                <span class="txn-paid">Paid: ₹${formatNumber(txn.amount)}</span>
                                <span class="txn-total">of ₹${formatNumber(txn.totalExpense)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="vendor-list">
                <strong>Vendors Paid:</strong> ${payment.vendors.join(', ')}
            </div>
        </div>
    `;
}

// Toggle payment details
window.togglePaymentDetails = function(name) {
    const detailsId = 'details-' + name.replace(/\s/g, '-');
    const detailsDiv = document.getElementById(detailsId);
    const btn = event.target;
    
    if (detailsDiv) {
        if (detailsDiv.style.display === 'none') {
            detailsDiv.style.display = 'block';
            btn.textContent = 'Hide Details ▲';
        } else {
            detailsDiv.style.display = 'none';
            btn.textContent = 'View Details ▼';
        }
    }
};

// Filter payments by search term
function filterPayments(searchTerm) {
    if (!searchTerm.trim()) {
        displayPayments(allPayments);
        return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = allPayments.filter(payment => 
        payment.name.toLowerCase().includes(term) ||
        payment.vendors.some(vendor => vendor.toLowerCase().includes(term))
    );
    
    displayPayments(filtered);
}

// Format date
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
}

// Export function to refresh payments when expenses change
window.refreshPayments = function() {
    if (paymentsModal && paymentsModal.style.display === 'flex') {
        loadPayments();
    }
};
