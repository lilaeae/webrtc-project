const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const app = express();
const https = require('https');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssl-'));
const keyPath = path.join(tmpDir, 'key.pem');
const certPath = path.join(tmpDir, 'cert.pem');
 execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=192.168.129.61" -addext "subjectAltName=IP:192.168.129.61,DNS:localhost"`, { stdio: 'ignore' });
// execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=172.30.103.175" -addext "subjectAltName=IP:172.30.103.175,DNS:localhost"`, { stdio: 'ignore' });

const server = https.createServer({
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
}, app);
const io = require('socket.io')(server);

fs.unlinkSync(keyPath);
fs.unlinkSync(certPath);
fs.rmdirSync(tmpDir);

app.use(express.static('public', { index: 'caller.html' }));

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`space server!!! (HTTPS on port ${PORT})`);
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);
    });

    socket.on('controller-joined', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected');
    });

    socket.on('signal', (roomId, signalData) => {
        socket.to(roomId).emit('signal', signalData);
    });
});