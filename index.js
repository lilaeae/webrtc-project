const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const PORT = 3000;
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
        socket.to(roomId).emit('user-connected');
    });
});