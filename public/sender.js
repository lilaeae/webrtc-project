const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const targetPeerId = urlParams.get('peer'); 

let peer;
let currentShape = 'circle';
let currentMass = 1;
let lastTiltSent = 0;
let lastDrawTime = 0;

// some helper functions for things like color, shape , mass.. of the star
const getColor = () => {
    const hue = document.getElementById('colorHue').value;
    return `hsl(${hue}, 100%, 70%)`;
};

window.setShape = (shape) => {
    currentShape = shape;
    document.getElementById('shape-circle').classList.toggle('active', shape === 'circle');
    document.getElementById('shape-square').classList.toggle('active', shape === 'square');
};

window.setMass = (mass) => {
    currentMass = mass;
    document.getElementById('mass-1').classList.toggle('active', mass === 1);
    document.getElementById('mass-3').classList.toggle('active', mass === 3);
    document.getElementById('mass-8').classList.toggle('active', mass === 8);
};

// 2. WEBRTC: Start connection to Laptop
socket.on('connect', () => {
    if (targetPeerId) {
        console.log("Found Laptop Peer ID:", targetPeerId);

        
        peer = new SimplePeer({
            initiator: true,
            trickle: true,
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });

        peer.on('signal', (data) => {
            socket.emit('signal', targetPeerId, data);
        });

        socket.on('signal', (myId, signal, senderId) => {
            peer.signal(signal);
        });

        peer.on('connect', () => {
            console.log("CONNECTED TO GALAXY!");
            document.getElementById('msg').innerText = "LINKED! Drag to create stars.";
        });

        // receive data FROM laptop (like black hole vibrations)
        peer.on('data', (raw) => {
            const data = JSON.parse(raw);
            if (data.type === 'vibrate' && navigator.vibrate) {
                navigator.vibrate(data.intensity);
            }
        });

        peer.on('error', err => console.error("Peer Error:", err));
    } else {
        document.getElementById('msg').innerText = "Error: No Laptop ID found. Scan QR again.";
    }
});

// touch handling to send data to laptop
const sendTouchData = (e) => {
    if (!peer || !peer.connected) return;

    const now = Date.now();
    if (now - lastDrawTime > 50) { 
        const touch = e.touches[0];
        const data = {
            x: touch.clientX / window.innerWidth,
            y: touch.clientY / window.innerHeight,
            color: getColor(),
            shape: currentShape,
            mass: currentMass
        };
        peer.send(JSON.stringify(data));
        lastDrawTime = now;
        if (navigator.vibrate) navigator.vibrate(10);
    }
};

window.addEventListener('touchmove', (e) => {

    if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'select') {
        return;
    }

    const touch = e.touches[0];
    trails.push({
        x: touch.clientX,
        y: touch.clientY,
        life: 1.0,
        color: getColor()
    });

    sendTouchData(e);
    e.preventDefault();
}, { passive: false });

// handling tilting 
const handleTilt = (event) => {
    const now = Date.now();
    if (now - lastTiltSent > 100 && peer && peer.connected) {
        const tiltData = {
            type: 'gravity',
            tiltX: event.gamma, //  left & right
            tiltY: event.beta   // front n back
        };
        peer.send(JSON.stringify(tiltData));
        lastTiltSent = now;
    }
};

// ai suggested to implement a button to request permissions for device orientation on iOS, which is required for the gravity feature to work..
const accelButton = document.getElementById('accelPermsButton');
accelButton.onclick = () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    accelButton.innerText = "Gravity Active";
                    window.addEventListener('deviceorientation', handleTilt);
                }
            })
            .catch(console.error);
    } else {
        accelButton.innerText = "Gravity Active";
        window.addEventListener('deviceorientation', handleTilt);
    }
};

const trailCanvas = document.getElementById('trailCanvas');
const tCtx = trailCanvas.getContext('2d');
let trails = [];

const resizeTrails = () => {
    trailCanvas.width = window.innerWidth;
    trailCanvas.height = window.innerHeight;
};
window.addEventListener('resize', resizeTrails);
resizeTrails();

const drawTrails = () => {
    tCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

    for (let i = 0; i < trails.length; i++) {
        const p = trails[i];
        tCtx.beginPath();
        tCtx.arc(p.x, p.y, p.life * 15, 0, Math.PI * 2);
        tCtx.fillStyle = p.color;
        tCtx.shadowBlur = 20;
        tCtx.shadowColor = p.color;
        tCtx.globalAlpha = p.life;
        tCtx.fill();
        tCtx.globalAlpha = 1.0;
        tCtx.shadowBlur = 0;

        p.life -= 0.04;
    }

    trails = trails.filter(p => p.life > 0);
    requestAnimationFrame(drawTrails);
};
drawTrails();