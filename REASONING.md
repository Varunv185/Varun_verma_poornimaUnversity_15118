# REASONING.md — Architectural & Algorithmic Design

## 1. Architectural Choice: Transitioning to Serverless (Firebase)
Initially structured around a local Node.js and SQLite backend, the application was migrated to a **fully serverless frontend architecture using Firebase Firestore**. 
- **Rationale**: For a lightweight, collaborative tool like a gift pool tracker, managing a custom server introduces unnecessary deployment overhead. Firebase Firestore provides built-in real-time data synchronization (`onSnapshot`), native cloud persistence, and direct frontend communication, ensuring instant multi-user updates without custom socket or REST endpoint code.

## 2. Algorithmic Design

### A. Fair Share & Balance Calculation
- **Proportional Split**: The target budget is divided evenly among the total number of registered unique participants:
  $$\text{Fair Share} = \frac{\text{Target Budget}}{\text{Total Participants}}$$
- **Individual Balance**: Calculated as $\text{Amount Paid} - \text{Fair Share}$. Positive values indicate overpayment (creditors), while negative values indicate money owed (debtors).

### B. Debt Simplification Algorithm
- To avoid complex multi-party routing, the app separates participants into two pools: **Debtors** (those who owe money) and **Creditors** (those who overpaid).
- Using a **greedy matching approach**, the algorithm iteratively settles the largest debts against the largest credits until all net balances approach zero, minimizing the total number of transaction steps required.

### C. Smart Data Importer
- Real-world data collection from team chat apps or messy spreadsheets is inherently chaotic. The import engine utilizes regular expressions and tokenization to:
  1. **Deduplicate**: Filter out exact duplicate rows using a hash set.
  2. **Tokenize & Split**: Intelligently separate names from messy numeric strings regardless of commas, tabs, or hyphens.
  3. **Clean & Normalize**: Strip currency symbols (`₹`, `$`), commas, and alphabetical clutter from amounts, while sanitizing names (removing special characters and enforcing Title Case).
  4. **Merge & Log**: Aggregate contributions from the same normalized name and generate a transparent audit report summarizing added, merged, duplicated, and rejected rows.

## 3. UI/UX Design Decisions
- **Split Layout**: A dark-themed sidebar (`#0f172a`) houses persistent status indicators, progress bars, and participant lists, establishing a clear visual hierarchy separate from the light-themed workspace.
- **Modal Overflows**: Complex interactions like the **Pool Library** (switching/viewing past dashboard files) and the **Smart Importer** are encapsulated in backdrop-filtered modal overlays to keep the primary dashboard clean and focused.