# Changelog - FC Andar Ticket Counter

## 1.0.0 (2026-04-17) - Initial Release
### ✨ Features
- **Range Configuration:** Setup start/end numbers and price.
- **Smart Counter:** Large display with automatic incrementing on sale.
- **Payment Selection:** Quick-access "Efectivo" and "Transferencia" buttons.
- **Persistence:** LocalStorage sync to prevent data loss on page refresh.
- **Reporting:** Export sales history to Excel (.xlsx) and PDF (.pdf).
- **Responsive UI:** Premium Dark Mode design optimized for mobile use.

### 🎨 Design
- Sports-themed palette (Deep Blue, Red accents).
- Glassmorphism effects and modern typography (Outfit).
## 1.1.0 (2026-04-17) - Enhanced Mobile Experience
### ? Advanced Features
- **Seller Profile:** Records who is selling at the start of the session.
- **Confirmation Overlay:** Prevents accidental sales with a fast-confirm interface.
- **Revenue Breakdown:** Real-time stats for Cash vs Transfer.
- **Undo Sales:** One-tap to revert the last transaction.
- **History Editing:** Ability to toggle payment methods or delete entries from the list.
- **Progress Bar:** Visual feedback of the sale range completion.
- **Expanded Exports:** Header with seller name and summary totals (Efectivo/Transfer/Total).

### ?? UI Improvements
- Optimized touch targets for mobile.
- Refined glassmorphism and animations.
## 2.0.0 (2026-04-18) - MongoDB Atlas Integration (Full-Stack)
### ? Core Features
- **Persistent Cloud Storage:** Integration with MongoDB Atlas for session and sales data.
- **Session Management:** "Finish Day" button to archive the current session and start a new one.
- **Historical Days View:** Browse previous sessions with totals (Cash/Transfer/Grand Total).
- **History Management:** Delete historical sessions or edit specific sales within the active session.
- **Real-time Sync:** Data is saved to the cloud on every action, ensuring no data loss across devices.

### ?? Tech Stack Update
- **Backend:** Node.js/Express server.
- **Database:** MongoDB Atlas (Mongoose).
- **Security:** Environment variables (.env) for database credentials.
- **Convenience:** added 'iniciar.bat' for local startup.
