const socket = io();
let peer;
const myIP = '192.168.129.61'; // <--- UPDATE THIS IP

let currentGravityX = 0;
let currentGravityY = 0;
let blackHole = { x: 0, y: 0, active: false, size: 50 };
let starsCreated = 0;
let starsLost = 0;
const stars = [];

const canvas = document.getElementById('spaceCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 1. SIGNALING: Show QR code so Phone can find this Laptop's ID
socket.on('connect', () => {
    console.log("My Peer ID:", socket.id);
    const url = `https://${myIP}:3001/sender.html?peer=${socket.id}`;

    const qrContainer = document.getElementById("qrcode");
    qrContainer.innerHTML = ""; // Clear old QR
    new QRCode(qrContainer, {
        text: url,
        width: 256,
        height: 256
    });
});

// 2. WEBRTC: Handle incoming signal from the Phone
socket.on('signal', (myId, signal, peerId) => {
    if (!peer) {
        // Laptop is the RESPONDER (initiator: false)
        peer = new SimplePeer({
            initiator: false,
            trickle: true,
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });

        peer.on('signal', (data) => {
            socket.emit('signal', peerId, data);
        });

        peer.on('connect', () => {
            console.log("PHONE CONNECTED!");
            document.getElementById('status').innerText = "CONTROLLER LINKED";
            document.getElementById('qrcode').style.display = 'none'; // Hide QR when connected
        });

        peer.on('data', (raw) => {
            const data = JSON.parse(raw);
            if (data.type === 'gravity') {
                currentGravityX = data.tiltX / 10;
                currentGravityY = data.tiltY / 10;
            } else {
                // Create star from touch data
                const newStar = new Star(
                    data.x * canvas.width,
                    data.y * canvas.height,
                    data.color,
                    data.shape,
                    data.mass
                );
                stars.push(newStar);
                starsCreated++;
            }
        });
    }
    peer.signal(signal);
});

// --- STAR PHYSICS LOGIC ---

class Star {
    constructor(x, y, color, shape, mass) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.size = mass * 2;
        this.color = color;
        this.shape = shape;
        this.mass = mass;
        this.isDead = false;
    }

    update(gx, gy, bh) {
        this.vx += gx * (this.mass * 0.1);
        this.vy += gy * (this.mass * 0.1);

        if (bh.active) {
            const dx = bh.x - this.x;
            const dy = bh.y - this.y;
            const dist = Math.hypot(dx, dy);
            const force = (bh.size * 5) / (dist + 100);
            this.vx += (dx / dist) * force;
            this.vy += (dy / dist) * force;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < 0 || this.x > canvas.width) this.vx *= -0.8;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -0.8;
    }

    draw() {
        ctx.fillStyle = this.color;
        if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
        }
    }
}

function animate() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Filter out dead stars
    const activeStars = stars.filter(star => {
        if (star.isDead) {
            star.size *= 0.9;
            return star.size > 0.5;
        }
        return true;
    });

    stars.length = 0;
    stars.push(...activeStars);

    let isNearBlackHole = false;
    stars.forEach(star => {
        star.update(currentGravityX, currentGravityY, blackHole);
        star.draw();

        // Check if star hit black hole
        if (blackHole.active) {
            const dist = Math.hypot(blackHole.x - star.x, blackHole.y - star.y);
            if (dist < blackHole.size) star.isDead = true;
            if (dist < 300) isNearBlackHole = true;
        }
    });

    // Vibrate phone if near black hole
    if (isNearBlackHole && peer && peer.connected) {
        peer.send(JSON.stringify({ type: 'vibrate', intensity: 30 }));
    }

    document.getElementById('starCount').innerText = stars.length;
    document.getElementById('currentScore').innerText = starsCreated - starsLost;

    requestAnimationFrame(animate);
}

animate();