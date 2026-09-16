const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let db;

// Initialize the Database
async function initDB() {
    db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    // Create tables for settings (budget) and payments (users)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS payments (name TEXT PRIMARY KEY, amount REAL);
        CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value REAL);
    `);

    // Set a default budget if it's a brand new database
    const budgetRow = await db.get(`SELECT value FROM settings WHERE key = 'budget'`);
    if (!budgetRow) {
        await db.run(`INSERT INTO settings (key, value) VALUES ('budget', 6000)`);
    }
}

// Fetch all data to send to users
async function getAppState() {
    const budgetRow = await db.get(`SELECT value FROM settings WHERE key = 'budget'`);
    const rows = await db.all(`SELECT name, amount FROM payments`);
    
    const payments = {};
    rows.forEach(row => { payments[row.name] = row.amount; });
    
    return { budget: budgetRow.value, payments };
}

io.on('connection', async (socket) => {
    console.log('User connected, sending database state...');
    
    // Send current DB state on load
    socket.emit('initialState', await getAppState());

    socket.on('updateBudget', async (newBudget) => {
        await db.run(`UPDATE settings SET value = ? WHERE key = 'budget'`, newBudget);
        io.emit('stateUpdated', await getAppState());
    });

    socket.on('addPayment', async (data) => {
        const { name, paid } = data;
        const existing = await db.get(`SELECT amount FROM payments WHERE name = ?`, name);
        
        if (existing) {
            await db.run(`UPDATE payments SET amount = amount + ? WHERE name = ?`, paid, name);
        } else {
            await db.run(`INSERT INTO payments (name, amount) VALUES (?, ?)`, name, paid);
        }
        io.emit('stateUpdated', await getAppState());
    });

    socket.on('removePayment', async (name) => {
        await db.run(`DELETE FROM payments WHERE name = ?`, name);
        io.emit('stateUpdated', await getAppState());
    });

    socket.on('resetPool', async () => {
        await db.run(`DELETE FROM payments`);
        io.emit('stateUpdated', await getAppState());
    });
});

// Start the server ONLY after the database is ready
initDB().then(() => {
    const PORT = 3000; // Change to 3001 if port is stuck
    server.listen(PORT, () => {
        console.log(`Real-time Database server running on port ${PORT}`);
    });
});