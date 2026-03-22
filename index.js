const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const app = express();
const https = require('https');

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}
const myIP = getLocalIP();
console.log(`📡 Discovered Local IP: ${myIP}`);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssl-'));
const keyPath = path.join(tmpDir, 'key.pem');
const certPath = path.join(tmpDir, 'cert.pem');

execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=${myIP}" -addext "subjectAltName=IP:${myIP},DNS:localhost"`, { stdio: 'ignore' });

const server = https.createServer({
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
}, app);

const io = require('socket.io')(server);

fs.unlinkSync(keyPath);
fs.unlinkSync(certPath);
fs.rmdirSync(tmpDir);

// our receiver html is like our index html cause it's the main page ppl will load on 
app.use(express.static('public', { index: 'receiver.html' }));

const clients = {};

io.on('connection', (socket) => {
    clients[socket.id] = { id: socket.id };
    console.log('User connected to signaling server:', socket.id);

    socket.on('signal', (peerId, signal) => {

        io.to(peerId).emit('signal', peerId, signal, socket.id);
    });

    socket.on('disconnect', () => {
        delete clients[socket.id];
        io.emit('clients', clients);
        console.log('User disconnected:', socket.id);
    });

    io.emit('clients', clients);
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`
    galaxy sever is liveee 
    ---------------------------------
    laptop (receiver): https://${myIP}:${PORT}/receiver.html
    phone (sender): scan QR code on laptop screen
    ---------------------------------
    `);
});