console.log("controller script initialized");

const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');

let peer;
let currentShape = 'circle';
let lastTiltSent = 0; 

const getColor = () => {
    const hue = document.getElementById('colorHue').value;
    return `hsl(${hue}, 100%, 70%)`;
};

window.setShape = (shape) => {
    currentShape = shape;
    console.log("Shape set to:", shape);
};

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

// Touch Logic
const sendTouchData = (e) => {
    if (peer && peer.connected) {
        const touch = e.touches[0];
        const data = {
            x: touch.clientX / window.innerWidth,
            y: touch.clientY / window.innerHeight,
            color: getColor(),
            shape: currentShape
        };
        peer.send(JSON.stringify(data));
    }
};

window.addEventListener('touchmove', (e) => {
    sendTouchData(e);
    e.preventDefault();
}, { passive: false });

const handleTilt = (event) => {
    const now = Date.now();
    if (now - lastTiltSent > 100 && peer && peer.connected) {
        const tiltData = {
            type: 'gravity',
            tiltX: event.gamma,
            tiltY: event.beta
        };
        peer.send(JSON.stringify(tiltData));
        lastTiltSent = now;
    }
};

const accelButton = document.getElementById('accelPermsButton');

accelButton.onclick = () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    accelButton.style.background = '#2ecc71';
                    accelButton.innerText = "GRAVITY ONLINE";
                    window.addEventListener('deviceorientation', handleTilt);
                }
            })
            .catch(console.error);
    } else {
        accelButton.style.background = '#2ecc71';
        accelButton.innerText = "GRAVITY ONLINE";
        window.addEventListener('deviceorientation', handleTilt);
    }
};