const express = require('express');

const app = express();
const https = require('https');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssl-'));
const keyPath = path.join(tmpDir, 'key.pem');
const certPath = path.join(tmpDir, 'cert.pem');
 execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=192.168.129.61" -addext "subjectAltName=IP:192.168.129.61,DNS:localhost"`, { stdio: 'ignore' });
// execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=172.30.103.175" -addext "subjectAltName=IP:172.30.103.175,DNS:localhost"`, { stdio: 'ignore' });

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

app.use(express.static('public', { index: 'caller.html' }));


const PORT = 3001;
server.listen(PORT, async () => {
    console.log(`space server!!! (HTTP on port ${PORT})`);
    try {
        const listener = await ngrok.forward({ addr: PORT, authtoken_from_env: true });
        ngrokUrl = listener.url();
        console.log(`ngrok tunnel live at: ${ngrokUrl}`);
    } catch (err) {
        console.error('ngrok failed to start:', err.message);
        console.error('Make sure NGROK_AUTHTOKEN is set in your environment.');
    }
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