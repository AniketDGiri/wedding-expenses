// Firebase Configuration
// Replace these with your own Firebase project credentials
const firebaseConfig = {
    apiKey: "AIzaSyCgXPZrqozPlNbQ-ViqCYt1GkvI3Ro_Ixw",
    authDomain: "wedding-expenses-f62b6.firebaseapp.com",
    projectId: "wedding-expenses-f62b6",
    storageBucket: "wedding-expenses-f62b6.firebasestorage.app",
    messagingSenderId: "565176416758",
    appId: "1:565176416758:web:724219358d4f1c521f6fd7",
    measurementId: "G-FHE7DM81JR"
};

// Initialize Firebase
let db;
let useFirebase = false;

try {
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "AIzaSyDEMOKEY-REPLACE-WITH-YOUR-KEY") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        useFirebase = true;
        console.log("Firebase connected successfully!");
    } else {
        console.log("Using localStorage (Firebase not configured)");
    }
} catch (error) {
    console.log("Firebase initialization failed, using localStorage:", error);
}

// Store expenses
let expenses = [];

// DOM Elements
const expenseForm = document.getElementById('expenseForm');
const expenseTableBody = document.getElementById('expenseTableBody');
const totalExpensesEl = document.getElementById('totalExpenses');
const totalPaidEl = document.getElementById('totalPaid');
const totalPendingEl = document.getElementById('totalPending');
const filterBtns = document.querySelectorAll('.filter-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadExpenses();
});

// Load expenses
async function loadExpenses() {
    if (useFirebase) {
        try {
            const snapshot = await db.collection('expenses').orderBy('createdAt', 'desc').get();
            expenses = snapshot.docs.map(doc => ({
                firestoreId: doc.id,
                ...doc.data()
            }));
            console.log(`Loaded ${expenses.length} expenses from Firebase`);
        } catch (error) {
            console.error("Error loading from Firebase:", error);
            expenses = JSON.parse(localStorage.getItem('weddingExpenses')) || [];
        }
    } else {
        expenses = JSON.parse(localStorage.getItem('weddingExpenses')) || [];
    }
    renderExpenses();
    updateSummary();
}

// Add expense
expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const expense = {
        id: Date.now(),
        vendorName: document.getElementById('vendorName').value,
        amount: parseFloat(document.getElementById('amount').value),
        paidBy: document.getElementById('paidBy').value || 'Not Paid',
        amountPaid: parseFloat(document.getElementById('amountPaid').value) || 0,
        notes: document.getElementById('notes').value,
        createdAt: new Date().toISOString()
    };
    
    if (useFirebase) {
        try {
            const docRef = await db.collection('expenses').add(expense);
            expense.firestoreId = docRef.id;
            expenses.unshift(expense);
            console.log("Expense saved to Firebase");
        } catch (error) {
            console.error("Error saving to Firebase:", error);
            alert("Failed to save to cloud. Saved locally instead.");
            expenses.push(expense);
            saveToLocalStorage();
        }
    } else {
        expenses.push(expense);
        saveToLocalStorage();
    }
    
    renderExpenses();
    updateSummary();
    expenseForm.reset();
    
    // Show success message
    alert('Expense added successfully!');
});

// Render expenses
function renderExpenses(filter = 'all') {
    expenseTableBody.innerHTML = '';
    
    let filteredExpenses = expenses;
    
    if (filter === 'paid') {
        filteredExpenses = expenses.filter(e => e.amountPaid >= e.amount);
    } else if (filter === 'pending') {
        filteredExpenses = expenses.filter(e => e.amountPaid < e.amount);
    }
    
    filteredExpenses.forEach(expense => {
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
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${expense.vendorName}</td>
            <td>₹${formatNumber(expense.amount)}</td>
            <td>₹${formatNumber(expense.amountPaid)}</td>
            <td class="amount pending">₹${formatNumber(pending)}</td>
            <td>${expense.paidBy}</td>
            <td><span class="status-badge status-${status}">${statusText}</span></td>
            <td>${expense.notes || '-'}</td>
            <td>
                <button class="btn-delete" onclick="deleteExpense(${expense.id})">Delete</button>
            </td>
        `;
        
        expenseTableBody.appendChild(row);
    });
    
    if (filteredExpenses.length === 0) {
        expenseTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: #999;">No expenses found</td></tr>';
    }
}

// Delete expense
async function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        const expense = expenses.find(e => e.id === id);
        
        if (useFirebase && expense.firestoreId) {
            try {
                await db.collection('expenses').doc(expense.firestoreId).delete();
                console.log("Expense deleted from Firebase");
            } catch (error) {
                console.error("Error deleting from Firebase:", error);
            }
        }
        
        expenses = expenses.filter(e => e.id !== id);
        saveToLocalStorage();
        renderExpenses();
        updateSummary();
    }
}

// Update summary
function updateSummary() {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const paid = expenses.reduce((sum, e) => sum + e.amountPaid, 0);
    const pending = total - paid;
    
    totalExpensesEl.textContent = `₹${formatNumber(total)}`;
    totalPaidEl.textContent = `₹${formatNumber(paid)}`;
    totalPendingEl.textContent = `₹${formatNumber(pending)}`;
}

// Filter buttons
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderExpenses(btn.dataset.filter);
    });
});

// Save to localStorage (backup)
function saveToLocalStorage() {
    localStorage.setItem('weddingExpenses', JSON.stringify(expenses));
}

// Format number with commas
function formatNumber(num) {
    return num.toLocaleString('en-IN');
}
