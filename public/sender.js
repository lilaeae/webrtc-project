const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const targetPeerId = urlParams.get('peer'); // Laptop ID from the QR code

let peer;
let currentShape = 'circle';
let lastTiltSent = 0;
let lastDrawTime = 0;

// 1. HELPER FUNCTIONS
const getColor = () => {
    const hue = document.getElementById('colorHue').value;
    return `hsl(${hue}, 100%, 70%)`;
};

window.setShape = (shape) => {
    currentShape = shape;
    console.log("Shape set to:", shape);
};

// 2. WEBRTC: Start connection to Laptop
socket.on('connect', () => {
    if (targetPeerId) {
        console.log("Found Laptop Peer ID:", targetPeerId);

        // Phone is the INITIATOR (starts the call)
        peer = new SimplePeer({
            initiator: true,
            trickle: true,
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });

        // Send handshake signal to the Laptop via Server
        peer.on('signal', (data) => {
            socket.emit('signal', targetPeerId, data);
        });

        peer.on('connect', () => {
            console.log("CONNECTED TO GALAXY!");
            document.getElementById('msg').innerText = "LINKED! Drag to create stars.";
        });

        // Receive data FROM laptop (like black hole vibrations)
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

// 3. INPUT HANDLING: Touch
const sendTouchData = (e) => {
    if (!peer || !peer.connected) return;

    const now = Date.now();
    if (now - lastDrawTime > 50) { // Limit to 20fps for performance
        const touch = e.touches[0];
        const data = {
            x: touch.clientX / window.innerWidth,
            y: touch.clientY / window.innerHeight,
            color: getColor(),
            shape: currentShape,
            mass: parseFloat(document.getElementById('starMass').value)
        };
        peer.send(JSON.stringify(data));
        lastDrawTime = now;
        if (navigator.vibrate) navigator.vibrate(10);
    }
};

window.addEventListener('touchmove', (e) => {
    sendTouchData(e);
    e.preventDefault(); // Stop scrolling while drawing
}, { passive: false });

// 4. INPUT HANDLING: Tilt (Gravity)
const handleTilt = (event) => {
    const now = Date.now();
    if (now - lastTiltSent > 100 && peer && peer.connected) {
        const tiltData = {
            type: 'gravity',
            tiltX: event.gamma, // Left/Right
            tiltY: event.beta   // Front/Back
        };
        peer.send(JSON.stringify(tiltData));
        lastTiltSent = now;
    }
};

// 5. PERMISSIONS (Required for iOS/Chrome)
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