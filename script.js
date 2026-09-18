import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

let currentPoolId = "Team-Gift-Pool";
let payments = {};
let currentBudget = 5000;
let unsubscribe = null; 
let currentUserName = "Organizer";

// 1. Auth State & First-Time User Startup Check
onAuthStateChanged(auth, (user) => {
    const authBtn = document.getElementById('openAuthModalBtn');
    const profilePill = document.getElementById('userProfilePill');
    
    if (user) {
        authBtn.style.display = 'none';
        profilePill.style.display = 'flex';
        
        const derivedName = user.displayName || user.email.split('@')[0];
        currentUserName = derivedName;
        localStorage.setItem('giftpool_username', currentUserName);

        document.getElementById('userNameDisplay').innerText = currentUserName;
        document.getElementById('userEmailDisplay').innerText = user.email;
        document.getElementById('heroWelcomeText').innerText = `Hi ${currentUserName}! 👋`;
        
        if (user.photoURL) {
            document.getElementById('userAvatarImg').src = user.photoURL;
        } else {
            document.getElementById('userAvatarImg').src = "https://www.gstatic.com/images/branding/product/1x/avatar_circle_grey_48dp.png";
        }
        document.getElementById('welcomeModal').style.display = 'none';
    } else {
        authBtn.style.display = 'flex';
        profilePill.style.display = 'none';

        // Fallback to local storage name check if not signed into Firebase Auth
        const savedName = localStorage.getItem('giftpool_username');
        if (savedName) {
            currentUserName = savedName;
            document.getElementById('userNameDisplay').innerText = currentUserName;
            document.getElementById('heroWelcomeText').innerText = `Hi ${currentUserName}! 👋`;
            document.getElementById('welcomeModal').style.display = 'none';
        } else {
            document.getElementById('welcomeModal').style.display = 'flex';
        }
    }
});

window.openAuthModal = () => document.getElementById('authModal').style.display = 'flex';
window.closeAuthModal = () => document.getElementById('authModal').style.display = 'none';

window.signInWithGoogle = async function() {
    try {
        await signInWithPopup(auth, googleProvider);
        closeAuthModal();
    } catch (error) {
        alert("Google Sign-In error: " + error.message);
    }
};

window.handleEmailSignIn = async function() {
    const email = document.getElementById('authEmailInput').value.trim();
    const pass = document.getElementById('authPasswordInput').value;
    if (!email || !pass) return alert("Please enter email and password.");
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        closeAuthModal();
    } catch (error) { alert("Sign-in failed: " + error.message); }
};

window.handleEmailSignUp = async function() {
    const email = document.getElementById('authEmailInput').value.trim();
    const pass = document.getElementById('authPasswordInput').value;
    if (!email || !pass) return alert("Please enter email and password.");
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const username = email.split('@')[0];
        await updateProfile(userCredential.user, { displayName: username });
        closeAuthModal();
        alert("Account created successfully!");
    } catch (error) { alert("Registration failed: " + error.message); }
};

window.signOutUser = async function() { await signOut(auth); };

window.saveWelcomeName = function() {
    const nameInput = document.getElementById('welcomeNameInput').value.trim();
    if (!nameInput) return alert("Please enter your name to continue.");
    
    currentUserName = nameInput;
    localStorage.setItem('giftpool_username', currentUserName);
    
    document.getElementById('userNameDisplay').innerText = currentUserName;
    document.getElementById('heroWelcomeText').innerText = `Hi ${currentUserName}! 👋`;
    document.getElementById('welcomeModal').style.display = 'none';
    loadPool();
};

window.changeUserName = function() {
    const newName = prompt("Enter your new display name:", currentUserName);
    if (newName && newName.trim()) {
        currentUserName = newName.trim();
        localStorage.setItem('giftpool_username', currentUserName);
        document.getElementById('userNameDisplay').innerText = currentUserName;
        document.getElementById('heroWelcomeText').innerText = `Hi ${currentUserName}! 👋`;
    }
};

// 2. Load Pool Setup
window.loadPool = function() {
    const inputId = document.getElementById('poolIdInput').value.trim();
    if (!inputId) return;
    
    currentPoolId = inputId;
    if (unsubscribe) unsubscribe();

    document.getElementById('heroPoolTitle').innerText = currentPoolId;

    const poolRef = doc(db, "pools", currentPoolId);
    unsubscribe = onSnapshot(poolRef, (docSnap) => {
        const setupCard = document.getElementById('newPoolSetupCard');
        if (docSnap.exists()) {
            const data = docSnap.data();
            payments = data.payments || {};
            currentBudget = data.budget || 5000;
            setupCard.style.display = 'none';
        } else {
            payments = {};
            currentBudget = 5000;
            document.getElementById('setupPoolTitleDisplay').innerText = currentPoolId;
            document.getElementById('setupBudgetInput').value = 5000;
            document.getElementById('setupFirstMemberInput').value = currentUserName;
            document.getElementById('setupFirstMemberAmountInput').value = 0;
            setupCard.style.display = 'block';
        }
        document.getElementById('budgetInput').value = currentBudget;
        updateDashboardUI();
    });
};

window.initializeNewPoolFromCard = function() {
    const budgetVal = parseFloat(document.getElementById('setupBudgetInput').value) || 5000;
    const memberName = document.getElementById('setupFirstMemberInput').value.trim() || currentUserName;
    const memberAmount = parseFloat(document.getElementById('setupFirstMemberAmountInput').value) || 0;
    
    currentBudget = budgetVal;
    payments = {};
    if (memberName) {
        payments[memberName] = memberAmount;
    }
    
    saveToFirebase();
    document.getElementById('newPoolSetupCard').style.display = 'none';
    updateDashboardUI();
};

window.promptChangeBudget = function() {
    const newB = prompt("Enter new target budget limit for this pool (₹):", currentBudget);
    if (newB !== null && !isNaN(newB)) {
        currentBudget = parseFloat(newB);
        document.getElementById('budgetInput').value = currentBudget;
        saveToFirebase();
    }
};

window.toggleDarkMode = function() {
    const html = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    if (html.getAttribute('data-theme') === 'dark') {
        html.setAttribute('data-theme', 'light');
        themeIcon.className = "fa-solid fa-moon";
    } else {
        html.setAttribute('data-theme', 'dark');
        themeIcon.className = "fa-solid fa-sun";
    }
};

// 3. Pool Library & Modals
window.openPoolsModal = async function() {
    document.getElementById('poolsModal').style.display = 'flex';
    const grid = document.getElementById('poolsGrid');
    grid.innerHTML = '<p style="color:var(--text-muted);">Fetching Firebase dashboards...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "pools"));
        if (querySnapshot.empty) {
            grid.innerHTML = '<p>No previous pools found.</p>';
            return;
        }
        let html = '';
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const count = data.payments ? Object.keys(data.payments).length : 0;
            html += `
                <div class="pool-card-item" onclick="selectPool('${docSnap.id}')">
                    <h4><i class="fa-solid fa-folder text-primary"></i> ${docSnap.id}</h4>
                    <p><i class="fa-solid fa-users"></i> ${count} Members | Target: ₹${data.budget || 0}</p>
                </div>`;
        });
        grid.innerHTML = html;
    } catch (e) { grid.innerHTML = '<p style="color:red;">Error loading pools.</p>'; }
};
window.closeModal = () => document.getElementById('poolsModal').style.display = 'none';
window.selectPool = (id) => {
    document.getElementById('poolIdInput').value = id;
    loadPool();
    closeModal();
};

window.createNewPool = function() {
    const name = document.getElementById('newPoolNameInput').value.trim();
    const customBudget = parseFloat(document.getElementById('newPoolBudgetInput').value) || 5000;
    if (!name) return alert("Enter pool name.");
    
    currentPoolId = name;
    currentBudget = customBudget;
    payments = {};
    payments[currentUserName] = 0;
    document.getElementById('poolIdInput').value = name;
    saveToFirebase();
    closeModal();
    updateDashboardUI();
};

window.openImportModal = () => document.getElementById('importModal').style.display = 'flex';
window.closeImportModal = () => document.getElementById('importModal').style.display = 'none';

window.openAddMemberModal = () => {
    document.getElementById('modalNameInput').value = '';
    document.getElementById('modalPaidInput').value = '';
    document.getElementById('addMemberModal').style.display = 'flex';
};
window.closeAddMemberModal = () => document.getElementById('addMemberModal').style.display = 'none';

window.submitAddMemberForm = function() {
    const name = document.getElementById('modalNameInput').value.trim();
    const paid = parseFloat(document.getElementById('modalPaidInput').value) || 0;
    if (!name) return alert("Please enter a valid participant name.");

    payments[name] = (payments[name] || 0) + paid;
    saveToFirebase();
    closeAddMemberModal();
};

window.exportToExcel = function() {
    const names = Object.keys(payments);
    if (names.length === 0) return alert("No data available to export.");

    const fairShare = currentBudget / names.length;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Participant Name,Paid Amount (INR),Fair Share (INR),Balance (INR),Status\n";

    names.forEach(name => {
        const paid = payments[name];
        const balance = paid - fairShare;
        let status = balance > 1 ? "Overpaid" : (Math.abs(balance) <= 1 ? "Settled" : "Owes Money");
        csvContent += `"${name}",${paid.toFixed(2)},${fairShare.toFixed(2)},${balance.toFixed(2)},"${status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${currentPoolId}_GiftPool_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.processImport = function() {
    const rawData = document.getElementById('importTextarea').value;
    const lines = rawData.split('\n');
    let report = { added: 0, merged: 0, deduplicated: 0, rejected: 0 };
    let seen = new Set();
    let batch = {};

    lines.forEach((line) => {
        if (!line.trim()) return;
        const norm = line.trim().toLowerCase();
        if (seen.has(norm)) { report.deduplicated++; return; }
        seen.add(norm);

        const match = line.match(/^([^\d]+)([\d\s.,₹$€£]+)$/);
        let nPart, aPart;
        if (match) { nPart = match[1]; aPart = match[2]; }
        else {
            const parts = line.split(/[,|\t]/);
            if (parts.length < 2) { report.rejected++; return; }
            nPart = parts[0]; aPart = parts[1];
        }

        let cleanName = nPart.replace(/[^a-zA-Z\s]/g, '').trim();
        if (!cleanName) { report.rejected++; return; }
        cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();

        let amt = parseFloat(aPart.replace(/[^\d.-]/g, ''));
        if (isNaN(amt)) { report.rejected++; return; }

        if (batch[cleanName] !== undefined) { batch[cleanName] += amt; report.merged++; }
        else { batch[cleanName] = amt; report.added++; }
    });

    for (const [n, a] of Object.entries(batch)) {
        payments[n] = (payments[n] || 0) + a;
    }
    saveToFirebase();
    closeImportModal();
    alert(`Imported successfully! Added: ${report.added}, Merged: ${report.merged}`);
};

async function saveToFirebase() {
    const ref = doc(db, "pools", currentPoolId);
    await setDoc(ref, { budget: currentBudget, payments: payments });
}

window.updateBudget = function() {
    currentBudget = parseFloat(document.getElementById('budgetInput').value) || 5000;
    saveToFirebase();
};

window.removeParticipant = function(name) {
    if (confirm(`Remove ${name}?`)) {
        delete payments[name];
        saveToFirebase();
    }
};

function updateDashboardUI() {
    const names = Object.keys(payments);
    const totalCollected = Object.values(payments).reduce((a, b) => a + b, 0);
    const count = names.length;
    const fairShare = count > 0 ? currentBudget / count : 0;
    const progressPct = currentBudget > 0 ? (totalCollected / currentBudget) * 100 : 0;

    document.getElementById('heroBudgetDisplay').innerText = currentBudget.toLocaleString('en-IN');
    document.getElementById('heroCollectedDisplay').innerText = totalCollected.toLocaleString('en-IN');
    document.getElementById('heroPercentDisplay').innerText = `${progressPct.toFixed(1)}%`;
    document.getElementById('heroProgressBar').style.width = `${Math.min(progressPct, 100)}%`;

    document.getElementById('metricCollected').innerText = `₹${totalCollected.toLocaleString('en-IN')}`;
    const pending = Math.max(0, currentBudget - totalCollected);
    document.getElementById('metricPending').innerText = `₹${pending.toLocaleString('en-IN')}`;
    document.getElementById('metricTotalMembers').innerText = count;
    document.getElementById('metricFairShare').innerText = `₹${fairShare.toFixed(0)}`;

    document.getElementById('sidebarProgressText').innerText = `${progressPct.toFixed(1)}%`;
    document.getElementById('sidebarProgressAmount').innerText = `₹${totalCollected} / ₹${currentBudget}`;

    let fullCount = 0, partialCount = 0, extraCount = 0, noneCount = 0;
    let tableHtml = "";

    names.forEach((name, idx) => {
        const paid = payments[name];
        const balance = paid - fairShare;
        let statusBadge = "", statusClass = "";

        if (paid === 0) { noneCount++; statusBadge = "Not Paid"; statusClass = "owes"; }
        else if (balance > 1) { extraCount++; statusBadge = "Overpaid"; statusClass = "overpaid"; }
        else if (Math.abs(balance) <= 1) { fullCount++; statusBadge = "Settled"; statusClass = "settled"; }
        else { partialCount++; statusBadge = "Needs to pay"; statusClass = "owes"; }

        tableHtml += `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${name}</strong></td>
                <td>₹${paid.toFixed(2)}</td>
                <td>₹${fairShare.toFixed(2)}</td>
                <td><span style="color: ${balance >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight:600;">${balance >= 0 ? '+' : ''}₹${balance.toFixed(2)}</span></td>
                <td><span class="status-badge ${statusClass}">${statusBadge}</span></td>
                <td><button onclick="removeParticipant('${name}')" class="btn-icon-dark" title="Delete"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `;
    });

    document.getElementById('participantTableBody').innerHTML = tableHtml || `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No members yet. Use the 'Add Member' form!</td></tr>`;
    
    document.getElementById('statPaidFullCount').innerText = fullCount + extraCount;
    document.getElementById('statPartialCount').innerText = partialCount;
    document.getElementById('statExtraCount').innerText = extraCount;
    document.getElementById('statNotPaidCount').innerText = noneCount;
    document.getElementById('qsTotal').innerText = count;

    generateSettlementActions();
}

window.filterMembersTable = function() {
    const q = document.getElementById('memberSearchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#participantTableBody tr');
    rows.forEach(row => {
        const nameText = row.children[1]?.innerText.toLowerCase() || "";
        row.style.display = nameText.includes(q) ? "" : "none";
    });
};

window.generateSettlementActions = function() {
    const fairShare = Object.keys(payments).length > 0 ? currentBudget / Object.keys(payments).length : 0;
    const balances = {};
    for (const [name, paid] of Object.entries(payments)) {
        balances[name] = paid - fairShare;
    }

    const debtors = {};
    const creditors = {};
    for (const [name, bal] of Object.entries(balances)) {
        if (bal < -0.01) debtors[name] = Math.abs(bal);
        if (bal > 0.01) creditors[name] = bal;
    }

    const txs = [];
    const dNames = Object.keys(debtors);
    const cNames = Object.keys(creditors);
    let i = 0, j = 0;

    while (i < dNames.length && j < cNames.length) {
        const d = dNames[i];
        const c = cNames[j];
        const amt = Math.min(debtors[d], creditors[c]);
        txs.push(`<strong>${d}</strong> pays ₹${amt.toFixed(0)} to <strong>${c}</strong>`);
        debtors[d] -= amt;
        creditors[c] -= amt;
        if (debtors[d] < 0.01) i++;
        if (creditors[c] < 0.01) j++;
    }

    document.getElementById('settlementTxCount').innerText = `${txs.length} transactions needed`;
    document.getElementById('settlementPlan').innerHTML = txs.length === 0 
        ? `<div class="settlement-row"><span>✅ Everyone is perfectly settled up!</span></div>` 
        : txs.map(t => `<div class="settlement-row"><span>${t}</span><i class="fa-solid fa-arrow-right"></i></div>`).join('');
};