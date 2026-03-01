const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

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
        socket.to(roomId).emit('user-connected');
    });

    socket.on('peerOffer', (roomId, offer) => {
        console.log(`Server: Received offer for room ${roomId}. Relaying to peers...`);
        socket.to(roomId).emit('peerOffer', offer);
    }); // laptop sends their offer to the phone (through server if im not wrong)

    socket.on('peerAnswer', (roomId, answer) => {
        socket.to(roomId).emit('peerAnswer', answer);
    }); // now our phone should send an answer 

    socket.on('peerIce', (roomId, candidate) => {
        socket.to(roomId).emit('peerIce', candidate);
    }); // exchange time


});