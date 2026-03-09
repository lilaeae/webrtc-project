const socket = io();
const roomId = Math.random().toString(36).substr(2, 9);
// const myIP = '172.30.103.155';
const myIP = '192.168.129.61';
const controllerUrl = `https://${myIP}:3001/receiver.html?room=${roomId}`;
let currentGravityX = 0;
let currentGravityY = 0;

socket.emit('join-room', roomId);

let peer;

const startPeer = () => {
    if (peer) return;
    console.log("starting SimplePeer on mac (initiator)");

    peer = new SimplePeer({
        initiator: true,
        trickle: true,
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });

    peer.on('signal', (signalData) => {
        socket.emit('signal', roomId, signalData);
    });

    peer.on('connect', () => {
        console.log("DATA CHANNEL IS LIVE!");
        document.getElementById('status').innerText = "CONNECTED!";
    });

    peer.on('data', (raw) => {
        const data = JSON.parse(raw);
        if (data.type === 'gravity') {
            currentGravityX = data.tiltX / 45;
            currentGravityY = data.tiltY / 45;
        } else {

            const screenX = data.x * canvas.width;
            const screenY = data.y * canvas.height;
            const newStar = new Star(screenX, screenY, data.color, data.shape);
            stars.push(newStar);
        }
    });

    peer.on('error', (err) => console.error("peer error:", err));
};

new QRCode(document.getElementById("qrcode"), {
    text: controllerUrl,
    width: 256,
    height: 256
});


socket.on('user-connected', () => {
    console.log("phone has entered the room!");
    document.getElementById('status').innerText = "phone detected... handshaking...";
    startPeer();
});

socket.on('signal', (signalData) => {
    if (peer) peer.signal(signalData);
});

console.log("LAPTOP ROOM ID:", roomId);
document.getElementById('status').innerText = "room: " + roomId + " - waiting 4 phonee";

const canvas = document.getElementById('spaceCanvas');
const ctx = canvas.getContext('2d');
let stars = [];

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.onresize = resize;
resize();

class Star {
    constructor(x, y, color, shape) {
        this.x = x;
        this.y = y;
        this.color = color || 'white';
        this.shape = shape || 'circle';
        this.size = 5;
        this.vx = 0;
        this.vy = 0;
    }

    update(gravityX, gravityY) {

        this.vx += gravityX * 0.05;
        this.vy += gravityY * 0.05;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        if (this.shape === 'circle') {
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        } else {
            ctx.rect(this.x - 5, this.y - 5, 10, 10);
        }
        ctx.fill();
    }
}

function animate() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach(star => {

        star.update(currentGravityX, currentGravityY);
        star.draw();
    });

    requestAnimationFrame(animate);
}
animate();

