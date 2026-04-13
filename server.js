const express = require('express');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const path = require('path');
const app = express();

// --- CONFIGURATION ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/societyDB';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Successfully'))
    .catch(err => console.error('❌ Database connection error:', err));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// --- DATABASE MODELS ---
const visitorSchema = new mongoose.Schema({
    residentName: String,
    flatNumber: String,
    visitorName: String,
    status: { type: String, default: 'Pending' },
    qrData: String,
    createdAt: { type: Date, default: Date.now }
});

const Visitor = mongoose.model('Visitor', visitorSchema);

// --- ROUTES ---

// 1. Home / Selection Page
app.get('/', (req, res) => {
    res.render('index');
});

// 2. RESIDENT PORTAL
app.get('/resident', (req, res) => {
    res.render('resident_app');
});

// 3. RESIDENT API: Generate Visitor Request
app.post('/api/visitor/request', async (req, res) => {
    try {
        const { visitorName, flatNumber, residentName } = req.body;
        const qrString = `TOW-VISIT-${Date.now()}-${flatNumber}`;
        
        const newVisitor = new Visitor({
            visitorName,
            flatNumber,
            residentName,
            qrData: qrString
        });

        await newVisitor.save();
        const qrImage = await QRCode.toDataURL(qrString);
        res.json({ success: true, qrImage });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 4. ADMIN DASHBOARD
app.get('/admin', async (req, res) => {
    try {
        const requests = await Visitor.find().sort({ createdAt: -1 });
        res.render('admin_dashboard', { requests });
    } catch (err) {
        res.send("Error loading Admin Dashboard");
    }
});

// 5. ADMIN API: Update Status
app.post('/api/visitor/update-status', async (req, res) => {
    try {
        const { id, status } = req.body;
        await Visitor.findByIdAndUpdate(id, { status: status });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// 6. GUARD API: Verify QR
app.get('/api/visitor/verify', async (req, res) => {
    try {
        const { qrData } = req.query;
        const visitor = await Visitor.findOne({ qrData: qrData });
        if (visitor && visitor.status === 'Approved') {
            res.json({ approved: true, name: visitor.visitorName, flat: visitor.flatNumber });
        } else {
            res.json({ approved: false, message: visitor ? "Wait for Admin Approval" : "Invalid Pass" });
        }
    } catch (err) {
        res.status(500).json({ approved: false });
    }
});

// --- SERVER START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Triumph Tower App is live on port ${PORT}`);
});
