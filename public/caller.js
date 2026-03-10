const socket = io();
const roomId = Math.random().toString(36).substr(2, 9);
// const myIP = '172.30.103.155';
const myIP = '192.168.129.61';
const controllerUrl = `https://${myIP}:3001/receiver.html?room=${roomId}`;
let currentGravityX = 0;
let currentGravityY = 0;
let blackHole = { x: 0, y: 0, active: false, size: 50 };
let starsCreated = 0;
let starsLost = 0;

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

        // 1. Handle Tilt/Gravity
        if (data.type === 'gravity') {
            currentGravityX = data.tiltX / 10;
            currentGravityY = data.tiltY / 10;
        }
        // 2. Handle Supernova Explosion
        else if (data.type === 'supernova') {
            stars.forEach(star => {
                // Calculate direction from center of screen to the star
                const dx = star.x - canvas.width / 2;
                const dy = star.y - canvas.height / 2;

                // Add a sudden burst of velocity outward
                star.vx += dx * 0.1;
                star.vy += dy * 0.1;
            });
            console.log("SUPERNOVA ACTIVATED");
        }
        // 3. Default: Draw a new Star
        else {
            const screenX = data.x * canvas.width;
            const screenY = data.y * canvas.height;
            const newStar = new Star(screenX, screenY, data.color, data.shape, data.mass);
            stars.push(newStar);
            starsCreated++;
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
    constructor(x, y, color, shape, mass) {
        this.x = x;
        this.y = y;
        this.color = color || 'white';
        this.shape = shape || 'circle';
        this.mass = mass || 1;
        this.size = this.mass * 2 + 2;
        this.vx = 0;
        this.vy = 0;
    }

    update(gravityX, gravityY, blackHole) {
        this.vx += (gravityX * 0.03) / this.mass;
        this.vy += (gravityY * 0.03) / this.mass;

        if (blackHole.active) {
            const dx = blackHole.x - this.x;
            const dy = blackHole.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 400) {
                const force = (400 - distance) / (10000 * this.mass);
                this.vx += dx * force;
                this.vy += dy * force;
            }
        }
        const friction = this.mass === 0.5 ? 0.999 : 0.95;
        this.vx *= friction;
        this.vy *= friction;

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }

    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = this.mass * 5;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        if (this.shape === 'circle') {
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        } else {
            ctx.rect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
        }
        ctx.fill();
        ctx.restore();
    }
}

setInterval(() => {
    blackHole.active = true;
    blackHole.x = Math.random() * canvas.width;
    blackHole.y = Math.random() * canvas.height;
    setTimeout(() => { blackHole.active = false; }, 5000);
}, 10000);

function drawBlackHole() {
    if (!blackHole.active) return;
    const pulse = Math.sin(Date.now() / 200) * 10;

    ctx.beginPath();
    ctx.arc(blackHole.x, blackHole.y, blackHole.size, 0, Math.PI * 2);
    ctx.fillStyle = 'black';
    ctx.shadowBlur = 50;
    ctx.shadowColor = 'purple';
    ctx.fill();
}

function animate() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (blackHole.active) {
        drawBlackHole();
    }

    stars = stars.filter(star => {
        if (blackHole.active) {
            const dist = Math.hypot(blackHole.x - star.x, blackHole.y - star.y);

            // If star hits the event horizon, start shrinking it
            if (dist < blackHole.size) {
                star.isDead = true;
            }
        }

        // Remove star only when it's too small to see
        if (star.isDead) {
            star.size *= 0.85; // Rapidly shrink
            if (star.size < 0.5) {
                starsLost++;
                return false;
            }
        }
        return true;
    });

    let isNearBlackHole = false;

    stars.forEach(star => {
        if (blackHole.active) {
            const dist = Math.hypot(blackHole.x - star.x, blackHole.y - star.y);
            if (dist < 400) isNearBlackHole = true;
        }
        star.update(currentGravityX, currentGravityY, blackHole);
        star.draw();
    });

    if (isNearBlackHole && peer && peer.connected) {
        peer.send(JSON.stringify({ type: 'vibrate', intensity: 50 }));
    }

    const score = starsCreated - starsLost;

    ctx.fillStyle = "white";
    ctx.font = "bold 20px Arial";
    ctx.fillText(`Constellation Score: ${score}`, 20, 40);
    // Update UI elements
    document.getElementById('starCount').innerText = stars.length;
    document.getElementById('currentScore').innerText = score;

    const statusEl = document.getElementById('systemStatus');
    if (blackHole.active) {
        statusEl.innerText = "WARNING: SINGULARITY DETECTED";
        statusEl.style.color = "red";
    } else {
        statusEl.innerText = "SYSTEM STABLE";
        statusEl.style.color = "lime";
    }

    requestAnimationFrame(animate);
}
animate();



