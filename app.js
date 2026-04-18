// State Management
let state = {
    config: {
        start: 0,
        end: 0,
        price: 0,
        seller: ''
    },
    currentNum: 0,
    sales: [], 
    isActive: false
};

// Pending Sale for Confirmation
let pendingSale = null;

// DOM Elements
const configScreen = document.getElementById('config-screen');
const counterScreen = document.getElementById('counter-screen');
const historyScreen = document.getElementById('history-screen');
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

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initEventListeners();
    updateUI();
});

function loadState() {
    const savedState = localStorage.getItem('fc_andar_state_v2');
    if (savedState) {
        state = JSON.parse(savedState);
    }
}

function saveState() {
    localStorage.setItem('fc_andar_state_v2', JSON.stringify(state));
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

    // Export
    document.getElementById('export-btn').addEventListener('click', () => exportModal.classList.remove('hidden'));
    document.getElementById('cancel-export').addEventListener('click', () => exportModal.classList.add('hidden'));
    document.getElementById('export-excel').addEventListener('click', exportToExcel);
    document.getElementById('export-pdf').addEventListener('click', exportToPDF);

    // Reset
    document.getElementById('reset-btn').addEventListener('click', handleReset);
}

function populateConfigInputs() {
    sellerNameInput.value = state.config.seller || '';
    startRangeInput.value = state.config.start || '';
    endRangeInput.value = state.config.end || '';
    priceInput.value = state.config.price || '';
}

function startSelling() {
    const seller = sellerNameInput.value.trim();
    const start = parseInt(startRangeInput.value);
    const end = parseInt(endRangeInput.value);
    const price = parseFloat(priceInput.value);

    if (!seller || isNaN(start) || isNaN(end) || isNaN(price) || start > end) {
        configError.classList.remove('hidden');
        return;
    }

    // Only reset if it's a new session or range changed significantly
    if (!state.isActive || state.config.start !== start || state.config.end !== end) {
        state.sales = [];
        state.currentNum = start;
    }

    state.config = { seller, start, end, price };
    state.isActive = true;
    
    configError.classList.add('hidden');
    saveState();
    updateUI();
    showScreen(counterScreen);
}

function prepareSale(method) {
    if (state.currentNum > state.config.end) {
        alert("¡Rango finalizado!");
        return;
    }

    pendingSale = {
        number: state.currentNum,
        method: method,
        amount: state.config.price,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Update Confirmation UI
    const iconBox = document.getElementById('confirm-icon-box');
    const icon = document.getElementById('confirm-icon');
    const text = document.getElementById('confirm-text');

    iconBox.className = `confirm-icon ${method === 'Efectivo' ? 'cash' : 'transfer'}`;
    icon.name = method === 'Efectivo' ? 'cash-outline' : 'swap-horizontal-outline';
    text.textContent = `Venta en ${method} por $${state.config.price}`;

    confirmOverlay.classList.remove('hidden');
}

function confirmSale() {
    if (!pendingSale) return;

    state.sales.push(pendingSale);
    state.currentNum++;
    
    confirmOverlay.classList.add('hidden');
    pendingSale = null;
    
    saveState();
    updateUI();
}

function handleUndo() {
    if (state.sales.length === 0) return;
    
    if (confirm("¿Deshacer la última venta registrada?")) {
        const lastSale = state.sales.pop();
        state.currentNum = lastSale.number; // Return to the number of the undone sale
        saveState();
        updateUI();
    }
}

function updateUI() {
    if (!state.isActive) {
        showScreen(configScreen);
        return;
    }

    showScreen(counterScreen);
    currentNumDisplay.textContent = state.currentNum > state.config.end ? "FIN" : state.currentNum;
    displayPrice.textContent = `$${state.config.price}`;
    
    // Stats Breakdown
    const cashTotal = state.sales.filter(s => s.method === 'Efectivo').reduce((sum, s) => sum + s.amount, 0);
    const transferTotal = state.sales.filter(s => s.method === 'Transferencia').reduce((sum, s) => sum + s.amount, 0);
    
    cashTotalDisplay.textContent = `$${cashTotal.toLocaleString()}`;
    transferTotalDisplay.textContent = `$${transferTotal.toLocaleString()}`;
    
    // Progress
    const count = state.sales.length;
    const totalPossible = (state.config.end - state.config.start) + 1;
    progressText.textContent = `${count} / ${totalPossible}`;
    
    const progressPercent = (count / totalPossible) * 100;
    mainProgressBar.style.width = `${Math.min(progressPercent, 100)}%`;

    // Seller Display
    sellerDisplay.textContent = `Vendedor: ${state.config.seller}`;
}

function showScreen(screen) {
    [configScreen, counterScreen, historyScreen].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
}

function renderHistory() {
    historyBody.innerHTML = '';
    [...state.sales].reverse().forEach((sale, index) => {
        const originalIndex = state.sales.length - 1 - index;
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

// History Actions (Global scope for onclick)
window.deleteSale = function(index) {
    if (confirm("¿Eliminar esta venta?")) {
        state.sales.splice(index, 1);
        saveState();
        renderHistory();
        updateUI();
    }
}

window.toggleMethod = function(index) {
    const sale = state.sales[index];
    sale.method = sale.method === 'Efectivo' ? 'Transferencia' : 'Efectivo';
    saveState();
    renderHistory();
    updateUI();
}

function handleReset() {
    if (confirm("¿Estás seguro de que deseas reiniciar TODO? Se perderán todas las ventas y la configuración.")) {
        state = {
            config: { start: 0, end: 0, price: 0, seller: '' },
            currentNum: 0,
            sales: [],
            isActive: false
        };
        localStorage.removeItem('fc_andar_state_v2');
        updateUI();
    }
}

// Export Functions
function exportToExcel() {
    if (state.sales.length === 0) {
        alert("No hay ventas para exportar.");
        return;
    }

    const cashTotal = state.sales.filter(s => s.method === 'Efectivo').reduce((sum, s) => sum + s.amount, 0);
    const transferTotal = state.sales.filter(s => s.method === 'Transferencia').reduce((sum, s) => sum + s.amount, 0);
    const grandTotal = cashTotal + transferTotal;

    const data = state.sales.map(s => ({
        "Número": s.number,
        "Monto": s.amount,
        "Método": s.method,
        "Hora": s.timestamp
    }));

    // Add summary rows
    data.push({});
    data.push({ "Número": "RESUMEN" });
    data.push({ "Número": "Vendedor", "Monto": state.config.seller });
    data.push({ "Número": "Total Efectivo", "Monto": cashTotal });
    data.push({ "Número": "Total Transferencia", "Monto": transferTotal });
    data.push({ "Número": "TOTAL GENERAL", "Monto": grandTotal });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
    
    XLSX.writeFile(workbook, `Ventas_${state.config.seller}_${new Date().toLocaleDateString()}.xlsx`);
    exportModal.classList.add('hidden');
}

function exportToPDF() {
    if (state.sales.length === 0) {
        alert("No hay ventas para exportar.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const cashTotal = state.sales.filter(s => s.method === 'Efectivo').reduce((sum, s) => sum + s.amount, 0);
    const transferTotal = state.sales.filter(s => s.method === 'Transferencia').reduce((sum, s) => sum + s.amount, 0);
    const grandTotal = cashTotal + transferTotal;

    doc.setFontSize(22);
    doc.text("FC ANDAR - Reporte de Entradas", 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Vendedor: ${state.config.seller}`, 14, 30);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 35);
    doc.text(`Rango: ${state.config.start} - ${state.config.end}`, 14, 40);

    const rows = state.sales.map(s => [s.number, `$${s.amount}`, s.method, s.timestamp]);
    
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

    doc.save(`Ventas_${state.config.seller}.pdf`);
    exportModal.classList.add('hidden');
}
