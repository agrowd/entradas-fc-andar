const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Conectado a MongoDB Atlas'))
    .catch(err => console.error('❌ Error de conexión a MongoDB:', err));

// Models
const SessionSchema = new mongoose.Schema({
    sellerName: String,
    startNum: Number,
    endNum: Number,
    price: Number,
    currentNum: Number,
    sales: [{
        number: Number,
        method: String,
        amount: Number,
        timestamp: String
    }],
    isCompleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    completedAt: Date
});

const Session = mongoose.model('Session', SessionSchema);

// API Endpoints

// Get current active session
app.get('/api/sessions/current', async (req, res) => {
    try {
        const session = await Session.findOne({ isCompleted: false });
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start new session
app.post('/api/sessions/start', async (req, res) => {
    try {
        // Close any existing session first (optional, or just prevent new one)
        await Session.updateMany({ isCompleted: false }, { isCompleted: true, completedAt: new Date() });
        
        const newSession = new Session(req.body);
        await newSession.save();
        res.json(newSession);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Record a sale
app.post('/api/sessions/sale', async (req, res) => {
    try {
        const { sessionId, sale } = req.body;
        const session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });

        session.sales.push(sale);
        session.currentNum = sale.number + 1;
        await session.save();
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Undo last sale
app.post('/api/sessions/undo', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = await Session.findById(sessionId);
        if (!session || session.sales.length === 0) return res.status(404).json({ error: 'Nada que deshacer' });

        const lastSale = session.sales.pop();
        session.currentNum = lastSale.number;
        await session.save();
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update method or delete specific sale entry
app.patch('/api/sessions/sale', async (req, res) => {
    try {
        const { sessionId, saleIndex, update } = req.body;
        const session = await Session.findById(sessionId);
        if (update.type === 'delete') {
            session.sales.splice(saleIndex, 1);
        } else if (update.type === 'toggleMethod') {
            const sale = session.sales[saleIndex];
            sale.method = sale.method === 'Efectivo' ? 'Transferencia' : 'Efectivo';
        }
        await session.save();
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Finish session
app.post('/api/sessions/finish', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = await Session.findByIdAndUpdate(sessionId, { 
            isCompleted: true, 
            completedAt: new Date() 
        }, { new: true });
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get history of completed sessions
app.get('/api/sessions/history', async (req, res) => {
    try {
        const history = await Session.find({ isCompleted: true }).sort({ completedAt: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a session from history
app.delete('/api/sessions/:id', async (req, res) => {
    try {
        await Session.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
