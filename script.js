import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBljwHRDVqAuNAG9pwxeYWB39ocj_had7w",
    authDomain: "gifttracker-82492.firebaseapp.com",
    projectId: "gifttracker-82492",
    storageBucket: "gifttracker-82492.firebasestorage.app",
    messagingSenderId: "143848687368",
    appId: "1:143848687368:web:527635cdfc2f8309b28ebd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentPoolId = "Test-Pool";
let payments = {};
let currentBudget = 6000;
let unsubscribe = null; 

// 1. Connect to a specific file
window.loadPool = function() {
    const inputId = document.getElementById('poolIdInput').value.trim();
    if (!inputId) return alert("Please enter a Pool Name (File).");
    
    currentPoolId = inputId;
    if (unsubscribe) unsubscribe();

    const poolRef = doc(db, "pools", currentPoolId);
    unsubscribe = onSnapshot(poolRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            payments = data.payments || {};
            currentBudget = data.budget || 6000;
        } else {
            payments = {};
            currentBudget = 6000;
        }
        document.getElementById('budgetInput').value = currentBudget;
        updateDashboardUI();
    });
};

// 2. Library Modal Logic
window.openPoolsModal = async function() {
    document.getElementById('poolsModal').style.display = 'flex';
    const grid = document.getElementById('poolsGrid');
    grid.innerHTML = '<p style="color: var(--text-muted);">Fetching your dashboards...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "pools"));
        if (querySnapshot.empty) {
            grid.innerHTML = '<p>No previous pools found yet!</p>';
            return;
        }
        
        let html = '<div class="pools-grid">';
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const numParticipants = data.payments ? Object.keys(data.payments).length : 0;
            html += `
                <div class="pool-card" onclick="selectPoolFromModal('${docSnap.id}')">
                    <h4><i class="fa-solid fa-folder text-primary"></i> ${docSnap.id}</h4>
                    <p><i class="fa-solid fa-users"></i> ${numParticipants} Participants</p>
                    <p><i class="fa-solid fa-indian-rupee-sign"></i> Budget: ₹${data.budget || 0}</p>
                </div>`;
        });
        grid.innerHTML = html + '</div>';
    } catch (error) { grid.innerHTML = '<p style="color:red;">Error loading pools.</p>'; }
};
window.closeModal = () => document.getElementById('poolsModal').style.display = 'none';
window.selectPoolFromModal = (poolId) => {
    document.getElementById('poolIdInput').value = poolId;
    loadPool(); closeModal();
};

// 3. Smart Importer Engine
window.openImportModal = () => {
    document.getElementById('importModal').style.display = 'flex';
    document.getElementById('importTextarea').value = '';
    document.getElementById('importReport').innerHTML = '';
};
window.closeImportModal = () => document.getElementById('importModal').style.display = 'none';

window.processImport = function() {
    const rawData = document.getElementById('importTextarea').value;
    const lines = rawData.split('\n');
    
    let report = { added: 0, merged: 0, deduplicated: 0, rejected: 0 };
    let seenRows = new Set();
    let batchPayments = {};
    let rejectLog = [];

    lines.forEach((line, index) => {
        if (!line.trim()) return; 

        const normalizedLine = line.trim().toLowerCase();
        if (seenRows.has(normalizedLine)) {
            report.deduplicated++;
            return;
        }
        seenRows.add(normalizedLine);

        const match = line.match(/^([^\d]+)([\d\s.,₹$€£]+)$/);
        
        let namePart, amountPart;
        if (match) {
            namePart = match[1];
            amountPart = match[2];
        } else {
            const parts = line.split(/[,|\t]/);
            if (parts.length < 2) {
                report.rejected++;
                rejectLog.push(`Line ${index + 1}: Couldn't separate name and amount -> "${line}"`);
                return;
            }
            namePart = parts[0];
            amountPart = parts[1];
        }

        let cleanName = namePart.replace(/[^a-zA-Z\s]/g, '').trim();
        if (!cleanName) {
            report.rejected++;
            rejectLog.push(`Line ${index + 1}: Invalid name -> "${line}"`);
            return;
        }
        cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();

        let cleanAmountStr = amountPart.replace(/[^\d.-]/g, '');
        let amount = parseFloat(cleanAmountStr);

        if (isNaN(amount)) {
            report.rejected++;
            rejectLog.push(`Line ${index + 1}: Not a valid number -> "${line}"`);
            return;
        }

        if (batchPayments[cleanName] !== undefined) {
            batchPayments[cleanName] += amount;
            report.merged++;
        } else {
            batchPayments[cleanName] = amount;
            report.added++;
        }
    });

    for (const [name, amount] of Object.entries(batchPayments)) {
        if (payments[name] !== undefined) payments[name] += amount;
        else payments[name] = amount;
    }
    
    saveToFirebase();

    document.getElementById('importReport').innerHTML = `
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid var(--border);">
            <h4 style="margin: 0 0 10px 0;">Import Summary:</h4>
            <ul style="list-style:none; padding:0; margin:0; line-height: 1.8; font-size: 0.95rem;">
                <li><i class="fa-solid fa-check text-success"></i> <strong>${report.added}</strong> new entries added.</li>
                <li><i class="fa-solid fa-code-merge text-primary"></i> <strong>${report.merged}</strong> overlapping names merged.</li>
                <li><i class="fa-solid fa-copy text-warning"></i> <strong>${report.deduplicated}</strong> exact duplicates skipped.</li>
                <li><i class="fa-solid fa-triangle-exclamation text-danger"></i> <strong>${report.rejected}</strong> invalid rows rejected.</li>
            </ul>
            ${rejectLog.length > 0 ? `<div style="margin-top:15px; font-size:0.85rem; color:var(--danger); max-height:100px; overflow-y:auto; border-top: 1px solid #e2e8f0; padding-top:10px;"><b>Rejection Log:</b><br>${rejectLog.join('<br>')}</div>` : ''}
        </div>
    `;
};

// 4. User Actions
async function saveToFirebase() {
    const poolRef = doc(db, "pools", currentPoolId);
    await setDoc(poolRef, { budget: currentBudget, payments: payments });
}
window.updateBudget = function() {
    currentBudget = parseFloat(document.getElementById('budgetInput').value) || 0;
    saveToFirebase(); 
};
window.addParticipant = function() {
    const name = document.getElementById('nameInput').value.trim();
    const paidStr = document.getElementById('paidInput').value;
    const paid = parseFloat(paidStr) || 0;
    if (name === "") return alert("Please enter a name.");

    if (payments[name] !== undefined) payments[name] += paid;
    else payments[name] = paid;

    saveToFirebase();
    document.getElementById('nameInput').value = "";
    document.getElementById('paidInput').value = "";
    document.getElementById('nameInput').focus();
};
window.removeParticipant = function(name) {
    if(confirm(`Remove ${name}?`)) {
        delete payments[name];
        saveToFirebase();
    }
};
window.resetPool = function() {
    if(confirm(`Warning: This will clear the file "${currentPoolId}". Continue?`)) {
        payments = {};
        saveToFirebase();
    }
};

// 5. Update the UI Dashboard
function updateDashboardUI() {
    const budget = currentBudget;
    const names = Object.keys(payments);
    document.getElementById('participantCount').innerText = names.length;
    
    const totalCollected = Object.values(payments).reduce((sum, val) => sum + val, 0);
    const progressPercent = budget > 0 ? (totalCollected / budget) * 100 : 0;
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${Math.min(progressPercent, 100)}%`;
    
    if (progressPercent >= 100) {
        progressBar.style.backgroundColor = 'var(--success)';
        document.getElementById('progressText').innerText = 'Goal Reached! 🎉';
    } else {
        progressBar.style.backgroundColor = 'var(--primary)';
        document.getElementById('progressText').innerText = `${Math.round(progressPercent)}% Collected`;
    }
    document.getElementById('progressAmount').innerText = `₹${totalCollected.toFixed(0)} / ₹${budget.toFixed(0)}`;

    const listEl = document.getElementById('participantList');
    listEl.innerHTML = "";
    names.forEach(name => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div><strong>${name}</strong> <span class="sidebar-badge">₹${payments[name].toFixed(2)}</span></div>
            <button onclick="removeParticipant('${name}')" class="btn-icon-dark" title="Remove"><i class="fa-solid fa-xmark"></i></button>
        `;
        listEl.appendChild(li);
    });

    if (names.length === 0) {
        document.getElementById('individualBalances').innerHTML = "<span style='color: #94a3b8;'>Empty file. Add participants...</span>";
        document.getElementById('settlementPlan').innerHTML = "<span style='color: #94a3b8;'>Empty file. Add participants...</span>";
        return;
    }

    const fairShare = budget / names.length;
    const balances = {};
    let balanceText = `<div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Fair Share: ₹${fairShare.toFixed(2)} / person</strong></div>`;
    
    for (const [name, amount] of Object.entries(payments)) {
        balances[name] = amount - fairShare;
        let b = balances[name];
        if (b < -0.01) balanceText += `• <strong>${name}</strong> owes ₹${Math.abs(b).toFixed(2)}\n`;
        else if (b > 0.01) balanceText += `• <strong>${name}</strong> overpaid by ₹${b.toFixed(2)}\n`;
        else balanceText += `• <strong>${name}</strong> is settled! ✅\n`;
    }
    document.getElementById('individualBalances').innerHTML = balanceText.trim();

    const debtors = {};
    const creditors = {};
    for (const [name, balance] of Object.entries(balances)) {
        if (balance < -0.01) debtors[name] = Math.abs(balance);
        if (balance > 0.01) creditors[name] = balance;
    }

    const transactions = [];
    const dNames = Object.keys(debtors);
    const cNames = Object.keys(creditors);
    let i = 0, j = 0;

    while (i < dNames.length && j < cNames.length) {
        const debtor = dNames[i];
        const creditor = cNames[j];
        const amount = Math.min(debtors[debtor], creditors[creditor]);
        transactions.push(`💸 <strong>${debtor}</strong> pays ₹${amount.toFixed(2)} to <strong>${creditor}</strong>`);
        debtors[debtor] -= amount;
        creditors[creditor] -= amount;
        if (debtors[debtor] < 0.01) i++;
        if (creditors[creditor] < 0.01) j++;
    }

    document.getElementById('settlementPlan').innerHTML = transactions.length === 0 ? "✅ Everyone is perfectly settled up!" : transactions.join('\n');
}

window.onload = () => loadPool();