// State Management
let state = {
    session: null // Will hold the session object from MongoDB
};

// Pending Sale for Confirmation
let pendingSale = null;

// DOM Elements
const configScreen = document.getElementById('config-screen');
const counterScreen = document.getElementById('counter-screen');
const historyScreen = document.getElementById('history-screen');
const daysScreen = document.getElementById('days-screen');
const exportModal = document.getElementById('export-modal');
const confirmOverlay = document.getElementById('confirm-overlay');

const sellerNameInput = document.getElementById('seller-name');
const startRangeInput = document.getElementById('start-range');
const endRangeInput = document.getElementById('end-range');
const priceInput = document.getElementById('ticket-price');
const configError = document.getElementById('config-error');

const currentNumDisplay = document.getElementById('current-number');
const displayPrice = document.getElementById('display-price');
const cashTotalDisplay = document.getElementById('cash-total');
const transferTotalDisplay = document.getElementById('transfer-total');
const progressText = document.getElementById('progress-text');
const mainProgressBar = document.getElementById('main-progress');
const sellerDisplay = document.getElementById('seller-display');
const historyBody = document.getElementById('history-body');
const sessionsList = document.getElementById('sessions-list');

// API Base URL (Assuming same host)
const API_URL = '/api';

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    await syncWithServer();
    initEventListeners();
});

async function syncWithServer() {
    try {
        const res = await fetch(`${API_URL}/sessions/current`);
        const session = await res.json();
        
        if (session && !session.error) {
            state.session = session;
            showScreen(counterScreen);
            updateUI();
        } else {
            state.session = null;
            showScreen(configScreen);
        }
    } catch (err) {
        console.error('Error sincronizando con el servidor:', err);
    }
}

function initEventListeners() {
    // Start Sale
    document.getElementById('start-btn').addEventListener('click', startSelling);

    // Sales Buttons (Trigger Confirmation)
    document.getElementById('btn-cash').addEventListener('click', () => prepareSale('Efectivo'));
    document.getElementById('btn-transfer').addEventListener('click', () => prepareSale('Transferencia'));

    // Confirmation Actions
    document.getElementById('confirm-yes').addEventListener('click', confirmSale);
    document.getElementById('confirm-no').addEventListener('click', () => confirmOverlay.classList.add('hidden'));

    // Undo
    document.getElementById('btn-undo').addEventListener('click', handleUndo);

    // Navigation
    document.getElementById('settings-btn').addEventListener('click', () => {
        populateConfigInputs();
        showScreen(configScreen);
    });
    document.getElementById('view-history-btn').addEventListener('click', () => {
        renderHistory();
        showScreen(historyScreen);
    });
    document.getElementById('close-history').addEventListener('click', () => showScreen(counterScreen));
    
    document.getElementById('view-days-btn').addEventListener('click', viewPastSessions);
    document.getElementById('close-days').addEventListener('click', () => showScreen(counterScreen));

    // Export
    document.getElementById('export-btn').addEventListener('click', () => exportModal.classList.remove('hidden'));
    document.getElementById('cancel-export').addEventListener('click', () => exportModal.classList.add('hidden'));
    document.getElementById('export-excel').addEventListener('click', exportToExcel);
    document.getElementById('export-pdf').addEventListener('click', exportToPDF);

    // Finish Day
    document.getElementById('finish-day-btn').addEventListener('click', handleFinishDay);
}

function populateConfigInputs() {
    if (state.session) {
        sellerNameInput.value = state.session.sellerName;
        startRangeInput.value = state.session.startNum;
        endRangeInput.value = state.session.endNum;
        priceInput.value = state.session.price;
    }
}

async function startSelling() {
    const sellerName = sellerNameInput.value.trim();
    const startNum = parseInt(startRangeInput.value);
    const endNum = parseInt(endRangeInput.value);
    const price = parseFloat(priceInput.value);

    if (!sellerName || isNaN(startNum) || isNaN(endNum) || isNaN(price) || startNum > endNum) {
        configError.classList.remove('hidden');
        return;
    }

    const payload = { sellerName, startNum, endNum, price, currentNum: startNum, sales: [] };

    try {
        const res = await fetch(`${API_URL}/sessions/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        state.session = data;
        configError.classList.add('hidden');
        updateUI();
        showScreen(counterScreen);
    } catch (err) {
        alert('Error al iniciar sesión: ' + err.message);
    }
}

function prepareSale(method) {
    if (!state.session) return;
    if (state.session.currentNum > state.session.endNum) {
        alert("¡Rango finalizado!");
        return;
    }

    pendingSale = {
        number: state.session.currentNum,
        method: method,
        amount: state.session.price,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Update Confirmation UI
    const iconBox = document.getElementById('confirm-icon-box');
    const icon = document.getElementById('confirm-icon');
    const text = document.getElementById('confirm-text');

    iconBox.className = `confirm-icon ${method === 'Efectivo' ? 'cash' : 'transfer'}`;
    icon.name = method === 'Efectivo' ? 'cash-outline' : 'swap-horizontal-outline';
    text.textContent = `Venta en ${method} por $${state.session.price}`;

    confirmOverlay.classList.remove('hidden');
}

async function confirmSale() {
    if (!pendingSale || !state.session) return;

    try {
        const res = await fetch(`${API_URL}/sessions/sale`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: state.session._id, sale: pendingSale })
        });
        state.session = await res.json();
        
        confirmOverlay.classList.add('hidden');
        pendingSale = null;
        updateUI();
    } catch (err) {
        alert('Error al registrar venta: ' + err.message);
    }
}

async function handleUndo() {
    if (!state.session || state.session.sales.length === 0) return;
    
    if (confirm("¿Deshacer la última venta registrada?")) {
        try {
            const res = await fetch(`${API_URL}/sessions/undo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: state.session._id })
            });
            state.session = await res.json();
            updateUI();
        } catch (err) {
            alert('Error al deshacer: ' + err.message);
        }
    }
}

function updateUI() {
    if (!state.session) return;

    const sales = state.session.sales || [];
    currentNumDisplay.textContent = state.session.currentNum > state.session.endNum ? "FIN" : state.session.currentNum;
    displayPrice.textContent = `$${state.session.price}`;
    
    // Stats Breakdown
    const cashTotal = sales.filter(s => s && s.method === 'Efectivo').reduce((sum, s) => sum + s.amount, 0);
    const transferTotal = sales.filter(s => s && s.method === 'Transferencia').reduce((sum, s) => sum + s.amount, 0);
    
    cashTotalDisplay.textContent = `$${cashTotal.toLocaleString()}`;
    transferTotalDisplay.textContent = `$${transferTotal.toLocaleString()}`;
    
    // Progress
    const count = sales.length;
    const totalPossible = (state.session.endNum - state.session.startNum) + 1;
    progressText.textContent = `${count} / ${totalPossible}`;
    
    const progressPercent = (count / totalPossible) * 100;
    mainProgressBar.style.width = `${Math.min(progressPercent, 100)}%`;

    // Seller Display
    sellerDisplay.textContent = `Vendedor: ${state.session.sellerName}`;
}

function showScreen(screen) {
    [configScreen, counterScreen, historyScreen, daysScreen].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
}

function renderHistory() {
    if (!state.session) return;
    
    historyBody.innerHTML = '';
    const emptyMsg = document.getElementById('empty-history');
    
    if (state.session.sales.length === 0) {
        emptyMsg.classList.remove('hidden');
    } else {
        emptyMsg.classList.add('hidden');
        [...state.session.sales].reverse().forEach((sale, index) => {
            const originalIndex = state.session.sales.length - 1 - index;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sale.number}</td>
                <td>$${sale.amount}</td>
                <td class="${sale.method.toLowerCase()}">${sale.method}</td>
                <td>
                    <button class="change-method-btn" onclick="toggleMethod(${originalIndex})" title="Cambiar Método">
                        <ion-icon name="sync-outline"></ion-icon>
                    </button>
                    <button class="delete-row-btn" onclick="deleteSale(${originalIndex})" title="Eliminar">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                </td>
            `;
            historyBody.appendChild(row);
        });
    }
}

// History Actions (Global scope for onclick)
window.deleteSale = async function(index) {
    if (confirm("¿Eliminar esta venta?")) {
        try {
            const res = await fetch(`${API_URL}/sessions/sale`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: state.session._id, saleIndex: index, update: { type: 'delete' } })
            });
            state.session = await res.json();
            renderHistory();
            updateUI();
        } catch (err) {
            alert('Error al eliminar: ' + err.message);
        }
    }
}

window.toggleMethod = async function(index) {
    try {
        const res = await fetch(`${API_URL}/sessions/sale`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: state.session._id, saleIndex: index, update: { type: 'toggleMethod' } })
        });
        state.session = await res.json();
        renderHistory();
        updateUI();
    } catch (err) {
        alert('Error al cambiar método: ' + err.message);
    }
}

async function handleFinishDay() {
    if (!state.session) {
        alert("No hay una sesión activa para finalizar.");
        return;
    }
    
    const count = state.session.sales.length;
    if (confirm(`¿Estás seguro de terminar el día? Se han registrado ${count} ventas. Esta acción archivará la sesión actual.`)) {
        try {
            console.log('Finalizando sesión:', state.session._id);
            const res = await fetch(`${API_URL}/sessions/finish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: state.session._id })
            });

            if (!res.ok) throw new Error('Error en el servidor al cerrar sesión');

            state.session = null;
            showScreen(configScreen);
        } catch (err) {
            console.error('Error terminando día:', err);
            alert('Error al terminar día: ' + err.message);
        }
    }
}

async function viewPastSessions() {
    showScreen(daysScreen);
    sessionsList.innerHTML = '<p class="text-center">Cargando historial...</p>';
    const emptyMsg = document.getElementById('empty-sessions');
    
    try {
        const res = await fetch(`${API_URL}/sessions/history`);
        const history = await res.json();
        
        sessionsList.innerHTML = '';
        if (history.length === 0) {
            emptyMsg.classList.remove('hidden');
        } else {
            emptyMsg.classList.add('hidden');
            history.forEach(session => {
                const dateStr = new Date(session.completedAt).toLocaleDateString();
                const total = session.sales.reduce((sum, s) => sum + s.amount, 0);
                const cash = session.sales.filter(s => s.method === 'Efectivo').reduce((sum, s) => sum + s.amount, 0);
                const trans = session.sales.filter(s => s.method === 'Transferencia').reduce((sum, s) => sum + s.amount, 0);
                
                const card = document.createElement('div');
                card.className = 'session-card';
                card.innerHTML = `
                    <div class="session-header">
                        <div>
                            <span class="session-seller">${session.sellerName}</span>
                            <span class="session-date">${dateStr}</span>
                        </div>
                        <div class="session-actions">
                            <button class="session-download-btn" onclick="exportHistoricalSession('${session._id}')" title="Descargar Reporte">
                                <ion-icon name="download-outline"></ion-icon>
                            </button>
                            <button class="session-delete-btn" onclick="deleteHistoricalSession('${session._id}')" title="Borrar Día">
                                <ion-icon name="trash-outline"></ion-icon>
                            </button>
                        </div>
                    </div>
                    <div class="session-stats">
                        <div class="session-stat">
                            <span class="label">Entradas</span>
                            <span class="value">${session.sales.length}</span>
                        </div>
                        <div class="session-stat">
                            <span class="label">Efectivo</span>
                            <span class="value">$${cash.toLocaleString()}</span>
                        </div>
                        <div class="session-stat">
                            <span class="label">Transfer</span>
                            <span class="value">$${trans.toLocaleString()}</span>
                        </div>
                        <div class="session-stat">
                            <span class="label">Total</span>
                            <span class="value" style="color: var(--primary)">$${total.toLocaleString()}</span>
                        </div>
                    </div>
                `;
                sessionsList.appendChild(card);
            });
        }
    } catch (err) {
        sessionsList.innerHTML = `<p class="text-center" style="color: var(--danger)">Error al cargar historial: ${err.message}</p>`;
    }
}

window.deleteHistoricalSession = async function(id) {
    if (confirm("¿Estás seguro de eliminar este día del historial permanentemente?")) {
        try {
            await fetch(`${API_URL}/sessions/${id}`, { method: 'DELETE' });
            viewPastSessions(); // Refresh list
        } catch (err) {
            alert('Error al eliminar sesión: ' + err.message);
        }
    }
}

// Historical Export
window.exportHistoricalSession = async function(id) {
    try {
        const res = await fetch(`${API_URL}/sessions/history`);
        const history = await res.json();
        const session = history.find(s => s._id === id);
        if (session) {
            // Use same export logic as active session but with provided data
            runExport(session, 'PDF');
        }
    } catch (err) {
        alert('Error al exportar: ' + err.message);
    }
}

// Original Export Functions (Adapted)
function exportToExcel() {
    if (!state.session || state.session.sales.length === 0) {
        alert("No hay ventas para exportar.");
        return;
    }
    runExport(state.session, 'Excel');
    exportModal.classList.add('hidden');
}

function exportToPDF() {
    if (!state.session || state.session.sales.length === 0) {
        alert("No hay ventas para exportar.");
        return;
    }
    runExport(state.session, 'PDF');
    exportModal.classList.add('hidden');
}

function runExport(sessionData, type) {
    const cashTotal = sessionData.sales.filter(s => s.method === 'Efectivo').reduce((sum, s) => sum + s.amount, 0);
    const transferTotal = sessionData.sales.filter(s => s.method === 'Transferencia').reduce((sum, s) => sum + s.amount, 0);
    const grandTotal = cashTotal + transferTotal;

    if (type === 'Excel') {
        const data = sessionData.sales.map(s => ({
            "Número": s.number,
            "Monto": s.amount,
            "Método": s.method,
            "Hora": s.timestamp
        }));

        data.push({});
        data.push({ "Número": "RESUMEN" });
        data.push({ "Número": "Vendedor", "Monto": sessionData.sellerName });
        data.push({ "Número": "Total Efectivo", "Monto": cashTotal });
        data.push({ "Número": "Total Transferencia", "Monto": transferTotal });
        data.push({ "Número": "TOTAL GENERAL", "Monto": grandTotal });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
        XLSX.writeFile(workbook, `Ventas_${sessionData.sellerName}_${new Date().toLocaleDateString()}.xlsx`);
    } else {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.text("FC ANDAR - Reporte de Entradas", 14, 20);
        
        doc.setFontSize(11);
        doc.text(`Vendedor: ${sessionData.sellerName}`, 14, 30);
        doc.text(`Fecha: ${new Date(sessionData.createdAt).toLocaleDateString()}`, 14, 35);
        doc.text(`Rango: ${sessionData.startNum} - ${sessionData.endNum}`, 14, 40);

        const rows = sessionData.sales.map(s => [s.number, `$${s.amount}`, s.method, s.timestamp]);
        
        doc.autoTable({
            head: [['N°', 'Monto', 'Método', 'Hora']],
            body: rows,
            startY: 50,
            headStyles: { fillColor: [15, 23, 42] }
        });

        const finalY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text("Resumen de Totales", 14, finalY);
        doc.setFontSize(11);
        doc.text(`Total Efectivo: $${cashTotal.toLocaleString()}`, 14, finalY + 10);
        doc.text(`Total Transferencia: $${transferTotal.toLocaleString()}`, 14, finalY + 17);
        
        doc.setFontSize(14);
        doc.setTextColor(239, 68, 68);
        doc.text(`TOTAL FINAL: $${grandTotal.toLocaleString()}`, 14, finalY + 27);

        doc.save(`Ventas_${sessionData.sellerName}.pdf`);
    }
}
