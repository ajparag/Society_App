// This tells the app to look for the secret key on Render first
const MONGO_URI = process.env.MONGO_URI || 'your_local_test_string_here';

mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB!'))
    .catch(err => console.error('Database connection error:', err));

const express = require('express');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const path = require('path');
const app = express();

// --- CONFIGURATION ---
// Replace the string below with your actual MongoDB connection string later
const MONGO_URI = process.env.MONGO_URI || 'your_mongodb_connection_string_here';

mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Database connection error:', err));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public')); // This links your public/ folder

// --- DATABASE MODELS ---
const visitorSchema = new mongoose.Schema({
    residentName: String,
    flatNumber: String,
    visitorName: String,
    status: { type: String, default: 'Pending' }, // Pending, Approved, Denied
    qrData: String,
    createdAt: { type: Date, default: Date.now }
});

const Visitor = mongoose.model('Visitor', visitorSchema);

// --- ROUTES ---

// 1. Home / Landing (Redirects to Resident for now)
app.get('/', (req, res) => {
    res.redirect('/resident');
});

// 2. RESIDENT: View App
app.get('/resident', async (req, res) => {
    res.render('resident_app');
});

// 3. RESIDENT: Submit Visitor Request
app.post('/api/visitor/request', async (req, res) => {
    try {
        const { visitorName, flatNumber, residentName } = req.body;
        
        // Create a unique string for the QR code
        const qrString = `VISIT-${Date.now()}-${flatNumber}`;
        
        const newVisitor = new Visitor({
            visitorName,
            flatNumber,
            residentName,
            qrData: qrString
        });

        await newVisitor.save();
        
        // Generate QR Code as a Data URL to show on mobile
        const qrImage = await QRCode.toDataURL(qrString);
        res.json({ success: true, qrImage });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate pass' });
    }
});

// 4. ADMIN: Dashboard
app.get('/admin', async (req, res) => {
    const requests = await Visitor.find().sort({ createdAt: -1 });
    res.render('admin_dashboard', { requests });
});

// 5. ADMIN: Approve/Deny Request
app.post('/api/visitor/update-status', async (req, res) => {
    const { id, status } = req.body;
    await Visitor.findByIdAndUpdate(id, { status });
    res.json({ success: true });
});

// 1. Staff Schema (Maids, Drivers, etc.)
const staffSchema = new mongoose.Schema({
    name: String,
    role: String, // e.g., 'Maid', 'Driver'
    assignedToFlat: String,
    entryCode: String,
    isInside: { type: Boolean, default: false }
});

// 2. Amenities Schema (Clubhouse, Gym)
const bookingSchema = new mongoose.Schema({
    amenityName: String,
    residentName: String,
    flatNumber: String,
    date: Date,
    slot: String // e.g., '6PM-7PM'
});

const Staff = mongoose.model('Staff', staffSchema);
const Booking = mongoose.model('Booking', bookingSchema);

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Society App running on http://localhost:${PORT}`);
});
