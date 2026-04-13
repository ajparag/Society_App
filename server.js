const express = require('express');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const path = require('path');
const app = express();

// --- CONFIGURATION ---
// The MONGO_URI should be set in your Render Environment Variables for security
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/societyDB';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Successfully'))
    .catch(err => console.error('❌ Database connection error:', err));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public')); // Links your public/ folder for CSS/JS

// --- DATABASE MODELS ---

// Visitor & QR Pass Schema
const visitorSchema = new mongoose.Schema({
    residentName: String,
    flatNumber: String,
    visitorName: String,
    status: { type: String, default: 'Pending' }, // Pending, Approved, Denied
    qrData: String,
    createdAt: { type: Date, default: Date.now }
});

// Sustainability Tracker Schema
const sustainabilitySchema = new mongoose.Schema({
    category: String, // e.g., 'Waste', 'Water', 'Electricity'
    currentValue: Number,
    targetValue: Number,
    lastUpdated: { type: Date, default: Date.now }
});

const Visitor = mongoose.model('Visitor', visitorSchema);
const Sustainability = mongoose.model('Sustainability', sustainabilitySchema);

// --- ROUTES ---

// 1. LANDING PAGE: Selection between Resident and Admin
app.get('/', (req, res) => {
    res.render('index');
});

// 2. RESIDENT PORTAL: Main View
app.get('/resident', async (req, res) => {
    // We could fetch sustainability data here to make it dynamic
    res.render('resident_app');
});

// 3. RESIDENT API: Generate Visitor Request
app.post('/api/visitor/request', async (req, res) => {
    try {
        const { visitorName, flatNumber, residentName } = req.body;
        
        // Create a unique identifier for the QR code
        const qrString = `TOW-VISIT-${Date.now()}-${flatNumber}`;
        
        const newVisitor = new Visitor({
            visitorName,
            flatNumber,
            residentName,
            qrData: qrString
        });

        await newVisitor.save();
        
        // Generate QR Code as a Data URL for the mobile screen
        const qrImage = await QRCode.toDataURL(qrString);
        res.json({ success: true, qrImage });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 4. ADMIN DASHBOARD: View all requests
app.get('/admin', async (req, res) => {
    try {
        // Fetch all requests, showing newest first
        const requests = await Visitor.find().sort({
