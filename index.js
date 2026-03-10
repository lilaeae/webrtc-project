const express = require('express');
const http = require('http');
const ngrok = require('@ngrok/ngrok');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

let ngrokUrl = null;

app.use(express.static('public', { index: 'caller.html' }));

app.get('/ngrok-url', (req, res) => {
    if (ngrokUrl) {
        res.json({ url: ngrokUrl });
    } else {
        res.status(503).json({ error: 'ngrok tunnel not ready yet' });
    }
});

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