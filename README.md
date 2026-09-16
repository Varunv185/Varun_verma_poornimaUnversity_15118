# Varun_verma_poornimaUnversity_15118
# Farewell Gift Pool Tracker

A modern, serverless web application designed for teams to track shared gift expenses, calculate individual fair shares, and generate an optimized peer-to-peer settlement plan—eliminating the need for centralized money handling.

---

## Features

- **Real-Time Cloud Database**: Powered by Firebase Firestore, allowing team members to sync updates in real-time across devices.
- **Multiple Pool Management (File System)**: Create, switch between, and manage independent gift pools (e.g., *Alice-Farewell*, *Office-Party*) using a dynamic top file bar and a visual **Pool Library** dashboard modal.
- **Smart Data Importer**: Effortlessly paste messy lists, chat logs, or spreadsheets. The smart engine automatically strips currency symbols, normalizes and title-cases names, deduplicates identical rows, merges overlapping contributions, and logs rejected invalid entries.
- **Automated Settlement Algorithm**: Computes individual balances based on proportional "Fair Share" and runs a greedy debt-simplification algorithm to minimize the number of required peer-to-peer transactions.

---

## Project Setup

1. **Clone or Open the Repository**: Open the project folder in your code editor (such as GitHub Codespaces or VS Code).
2. **Configure Firebase**:
   - Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
   - Enable **Firestore Database** in **Test Mode**.
   - Copy your unique `firebaseConfig` object from your Firebase Project Settings.
3. **Link Firebase**: Open `script.js` and paste your configuration credentials into the `firebaseConfig` block at the top of the file.

---

## Running the Application

Because this app uses a modern serverless frontend architecture communicating directly with Firebase, you do not need a backend Node.js server.

1. Install the **Live Server** extension by Ritwick Dey in your editor.
2. Open the **`index.html`** file.
3. Right-click anywhere in the editor window and select **"Open with Live Server"**.
4. Your default web browser will automatically launch the application.

---

## Debugging & Troubleshooting

- **Styles Not Loading?** Ensure your browser cache is cleared or perform a **Hard Refresh** (`Ctrl + F5` on Windows/Linux or `Cmd + Shift + R` on Mac) to force the browser to fetch the updated `style.css`.
- **Button Not Responding?** Ensure that all three core files (`index.html`, `style.css`, and `script.js`) are saved in the exact same root folder and that your browser console (`F12`) is checked for any script syntax errors.
- **Firebase Connection Errors**: Verify that your Firestore database is active in the Firebase Console and that your `firebaseConfig` keys in `script.js` match your project settings accurately.