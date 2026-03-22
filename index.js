const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const app = express();
const https = require('https');

// --- 1. SSL SETUP (Class Requirement) ---
// IMPORTANT: Update this IP to your CURRENT laptop IP
const myIP = '192.168.129.61';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssl-'));
const keyPath = path.join(tmpDir, 'key.pem');
const certPath = path.join(tmpDir, 'cert.pem');

// Generates the temporary certificate for your specific IP
execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=${myIP}" -addext "subjectAltName=IP:${myIP},DNS:localhost"`, { stdio: 'ignore' });

const server = https.createServer({
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
}, app);

const io = require('socket.io')(server);

// Clean up the files from your drive immediately after loading them into memory
fs.unlinkSync(keyPath);
fs.unlinkSync(certPath);
fs.rmdirSync(tmpDir);

// --- 2. SERVE FILES ---
// This tells the server to look inside the 'public' folder for your site
app.use(express.static('public'));

// --- 3. SIGNALING LOGIC (Class Practice) ---
const clients = {};

io.on('connection', (socket) => {
    clients[socket.id] = { id: socket.id };
    console.log('User connected to signaling server:', socket.id);

    // This is the "Postman" logic from your class example:
    // It takes a signal and a target ID, then pushes it to that person.
    socket.on('signal', (peerId, signal) => {
        // Send to target, but also include the sender's ID (socket.id)
        io.to(peerId).emit('signal', peerId, signal, socket.id);
    });

    socket.on('disconnect', () => {
        delete clients[socket.id];
        io.emit('clients', clients);
        console.log('User disconnected:', socket.id);
    });

    // Broadcast updated list of everyone online
    io.emit('clients', clients);
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`
    🚀 GALAXY SERVER LIVE
    ---------------------------------
    Laptop (Receiver): https://${myIP}:${PORT}/receiver.html
    Phone (Sender): Scan QR code on laptop screen
    ---------------------------------
    `);
});