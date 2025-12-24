// Main Application Logic with User Authentication
let db;
let expenses = [];
let currentFilter = 'all';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase
    if (typeof firebase !== 'undefined' && firebaseConfig) {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        
        // Initialize authentication
        if (typeof initAuth === 'function') {
            initAuth();
        }
        
        // Setup expense form and filters
        setupExpenseForm();
        setupFilterButtons();
    } else {
        console.error('Firebase not configured properly');
    }
});

// Setup expense form submission
function setupExpenseForm() {
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseSubmit);
    }
}

// Handle expense form submission
async function handleExpenseSubmit(e) {
    e.preventDefault();
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Please login to add expenses');
        return;
    }
    
    const expense = {
        userId: currentUser.uid,
        vendorName: document.getElementById('vendorName').value,
        amount: parseFloat(document.getElementById('amount').value),
        paidBy: document.getElementById('paidBy').value || 'Not Paid',
        amountPaid: parseFloat(document.getElementById('amountPaid').value) || 0,
        notes: document.getElementById('notes').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('expenses').add(expense);
        
        // Reset form
        e.target.reset();
        
        // Show success message
        showNotification('Expense added successfully!', 'success');
    } catch (error) {
        console.error('Error adding expense:', error);
        showNotification('Failed to add expense. Please try again.', 'error');
    }
}

// Load user's expenses
function loadUserExpenses() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    // Real-time listener for user's expenses
    db.collection('expenses')
        .where('userId', '==', currentUser.uid)
        .onSnapshot(snapshot => {
            expenses = [];
            snapshot.forEach(doc => {
                const expenseData = doc.data();
                expenses.push({
                    id: doc.id,
                    ...expenseData,
                    // Ensure createdAt exists for sorting
                    createdAt: expenseData.createdAt || new Date()
                });
            });
            
            // Sort expenses by createdAt in JavaScript (newest first)
            expenses.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return dateB - dateA;
            });
            
            renderExpenses();
            updateSummary();
        }, error => {
            console.error('Error loading expenses:', error);
            
            // Don't show error for new users with no data
            if (error.code !== 'permission-denied' && expenses.length === 0) {
                // Just render empty state
                renderExpenses();
                updateSummary();
            } else {
                showNotification('Failed to load expenses', 'error');
            }
        });
}

// Render expenses table
function renderExpenses() {
    const tbody = document.getElementById('expenseTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    let filteredExpenses = expenses;
    
    if (currentFilter === 'paid') {
        filteredExpenses = expenses.filter(e => e.amountPaid >= e.amount);
    } else if (currentFilter === 'pending') {
        filteredExpenses = expenses.filter(e => e.amountPaid < e.amount);
    }
    
    if (filteredExpenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: #999;">No expenses found</td></tr>';
        return;
    }
    
    filteredExpenses.forEach(expense => {
        const row = createExpenseRow(expense);
        tbody.appendChild(row);
    });
}

// Create expense table row
function createExpenseRow(expense) {
    const row = document.createElement('tr');
    const pending = expense.amount - expense.amountPaid;
    
    let status = 'pending';
    let statusText = 'Pending';
    
    if (expense.amountPaid >= expense.amount) {
        status = 'paid';
        statusText = 'Paid';
    } else if (expense.amountPaid > 0) {
        status = 'partial';
        statusText = 'Partial';
    }
    
    row.innerHTML = `
        <td>${expense.vendorName}</td>
        <td>₹${formatNumber(expense.amount)}</td>
        <td>₹${formatNumber(expense.amountPaid)}</td>
        <td class="amount pending">₹${formatNumber(pending)}</td>
        <td>${expense.paidBy}</td>
        <td><span class="status-badge status-${status}">${statusText}</span></td>
        <td>${expense.notes || '-'}</td>
        <td>
            <button class="btn-delete" onclick="deleteExpense('${expense.id}')">Delete</button>
        </td>
    `;
    
    return row;
}

// Delete expense
async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }
    
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    try {
        await db.collection('expenses').doc(id).delete();
        showNotification('Expense deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting expense:', error);
        showNotification('Failed to delete expense', 'error');
    }
}

// Update summary cards
function updateSummary() {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const paid = expenses.reduce((sum, e) => sum + e.amountPaid, 0);
    const pending = total - paid;
    
    const totalExpensesEl = document.getElementById('totalExpenses');
    const totalPaidEl = document.getElementById('totalPaid');
    const totalPendingEl = document.getElementById('totalPending');
    
    if (totalExpensesEl) totalExpensesEl.textContent = `₹${formatNumber(total)}`;
    if (totalPaidEl) totalPaidEl.textContent = `₹${formatNumber(paid)}`;
    if (totalPendingEl) totalPendingEl.textContent = `₹${formatNumber(pending)}`;
}

// Setup filter buttons
function setupFilterButtons() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderExpenses();
        });
    });
}

// Clear expense data (on logout)
function clearExpenseData() {
    expenses = [];
    renderExpenses();
    updateSummary();
}

// Format number with Indian locale
function formatNumber(num) {
    return num.toLocaleString('en-IN');
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
