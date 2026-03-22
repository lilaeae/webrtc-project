const socket = io();
let peer;
const myIP = '192.168.129.61'; 

let currentGravityX = 0;
let currentGravityY = 0;
let blackHole = { x: 0, y: 0, active: false, size: 50 };
let starsCreated = 0;
let starsLost = 0;
const stars = [];

let gameStarted = false;

const canvas = document.getElementById('spaceCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


socket.on('connect', () => {
    console.log("My Peer ID:", socket.id);
    const url = `https://${myIP}:3001/sender.html?peer=${socket.id}`;

    const qrContainer = document.getElementById("qrcode");
    qrContainer.innerHTML = ""; 
    new QRCode(qrContainer, {
        text: url,
        width: 120,
        height: 120
    });
});

// web rtc
socket.on('signal', (myId, signal, peerId) => {
    if (!peer) {
        
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
            document.getElementById('qrcode').style.display = 'none'; 

          
            document.getElementById('instructions-modal').style.display = 'block';
        });

        peer.on('data', (raw) => {
            if (!gameStarted) return; 

            const data = JSON.parse(raw);
            if (data.type === 'gravity') {
                currentGravityX = data.tiltX / 10;
                currentGravityY = data.tiltY / 10;
            } else {
               
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

// logic for the starrss

class Star {
    constructor(x, y, color, shape, mass) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.color = color || 'white';
        this.shape = shape || 'circle';
        this.mass = mass || 1;
        this.size = this.mass * 2 + 2;
        this.isDead = false;
    }

    update(gx, gy, bh) {
        // usng square root of mass so heavy stars aren't weighed down as much
        const apparentMass = Math.sqrt(this.mass);
        this.vx += (gx * 0.04) / apparentMass;
        this.vy += (gy * 0.04) / apparentMass;

        if (bh.active) {
            const dx = bh.x - this.x;
            const dy = bh.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 400) {
                const force = (400 - dist) / (10000 * apparentMass);
                this.vx += dx * force;
                this.vy += dy * force;
            }
        }

        const friction = this.mass <= 1 ? 0.99 : 0.97;
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
        if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
        }
        ctx.restore();
    }
}

function startGame() {
    document.getElementById('instructions-modal').style.display = 'none';
    gameStarted = true;

// a black hole logicc 
    setInterval(() => {
        blackHole.active = true;
        blackHole.x = Math.random() * canvas.width;
        blackHole.y = Math.random() * canvas.height;
        setTimeout(() => { blackHole.active = false; }, 5000);
    }, 10000);
}

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

    const activeStars = stars.filter(star => {
        if (blackHole.active) {
            const dist = Math.hypot(blackHole.x - star.x, blackHole.y - star.y);
            if (dist < blackHole.size) {
                star.isDead = true;
            }
        }

        if (star.isDead) {
            star.size *= 0.85;
            if (star.size < 0.5) {
                starsLost++;
                return false;
            }
        }
        return true;
    });

    stars.length = 0;
    stars.push(...activeStars);

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

    document.getElementById('starCount').innerText = stars.length;
    document.getElementById('currentScore').innerText = score;

    const statusEl = document.getElementById('systemStatus');
    if (statusEl) {
        if (blackHole.active) {
            statusEl.innerText = "WARNING: SINGULARITY DETECTED";
            statusEl.style.color = "red";
        } else {
            statusEl.innerText = "SYSTEM STABLE";
            statusEl.style.color = "lime";
        }
    }

    requestAnimationFrame(animate);
}

animate();