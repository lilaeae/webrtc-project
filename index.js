const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public', { index: 'caller.html' }));

const PORT = 3001;
http.listen(PORT, () => {
    console.log(`space server!!!`);
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

    // simple-peer: just relay signal data between peers
    socket.on('signal', (roomId, signalData) => {
        socket.to(roomId).emit('signal', signalData);
    });
});