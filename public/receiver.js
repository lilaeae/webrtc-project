console.log("controller script initialized");

const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');

let peer;

// --- NEW ARCHITECT VARIABLES ---
let currentShape = 'circle';
// Using a getter here to ensure we always grab the current slider value
const getColor = () => {
    const hue = document.getElementById('colorHue').value;
    return `hsl(${hue}, 100%, 70%)`;
};

// This needs to be global so the HTML buttons can find it
window.setShape = (shape) => {
    currentShape = shape;
    console.log("Shape set to:", shape);
};
// ------------------------------

const startPeer = () => {
    console.log("starting SimplePeer on phone (non-initiator)");

    peer = new SimplePeer({
        initiator: false,
        trickle: true,
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });

    peer.on('signal', (signalData) => {
        socket.emit('signal', roomId, signalData);
    });

    peer.on('connect', () => {
        console.log("data channel connected 2 phone");
        document.getElementById('msg').innerText = "STARS CONNECTED! Drag your finger!";
    });

    peer.on('data', (raw) => {
        console.log("Message from laptop:", raw);
    });

    peer.on('error', (err) => console.error("peer error:", err));
};

// socket events
socket.on('signal', (signalData) => {
    if (!peer) startPeer();
    peer.signal(signalData);
});

socket.on('connect', () => {
    console.log("phone is connected");
    if (roomId) {
        document.getElementById('msg').innerText = "we in da room: " + roomId;
        socket.emit('controller-joined', roomId);
    }
});

// UPDATED touch input with Multi-Tool data
const sendTouchData = (e) => {
    if (peer && peer.connected) {
        const touch = e.touches[0];

        // Construct the full "Architect" packet
        const data = {
            x: touch.clientX / window.innerWidth,
            y: touch.clientY / window.innerHeight,
            color: getColor(),
            shape: currentShape
        };

        peer.send(JSON.stringify(data));
        // console.log("Sent Architect Data:", data);
    }
};

window.addEventListener('touchmove', (e) => {
    sendTouchData(e);
    e.preventDefault();
}, { passive: false });

// Throttle the tilt data so we don't overwhelm the data channel
let lastTiltSent = 0;

window.addEventListener('deviceorientation', (event) => {
    const now = Date.now();
    if (now - lastTiltSent > 100 && peer && peer.connected) {
        const tiltData = {
            type: 'gravity',
            tiltX: event.gamma, // Left/Right tilt (-90 to 90)
            tiltY: event.beta   // Front/Back tilt (-180 to 180)
        };

        peer.send(JSON.stringify(tiltData));
        lastTiltSent = now;
    }
});