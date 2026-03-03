console.log("controller script initialized");

const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');

const servers = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

let peerConnection;
let dataChannel;

const setupWebRTC = async () => {
    peerConnection = new RTCPeerConnection(servers);

    peerConnection.onicecandidate = (e) => {
        if (e.candidate) {
            socket.emit('peerIce', roomId, e.candidate);
        }
    };

    peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel;

        dataChannel.onopen = () => {
            console.log("data channel connected 2 phone");
            document.getElementById('msg').innerText = "STARS CONNECTED! Drag your finger!";
        };

        dataChannel.onmessage = (e) => {
            console.log("Message from laptop:", e.data);
        };
    };
};

// socket events
socket.on('peerOffer', async (offer) => {
    console.log("phone received offer!");
    await setupWebRTC();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    console.log("answering the laptop back", roomId);
    socket.emit('peerAnswer', roomId, answer);
});

socket.on('connect', () => {
    console.log("phone is connected");
    if (roomId) {
        document.getElementById('msg').innerText = "we in da room: " + roomId;
        socket.emit('controller-joined', roomId);
    }
});

// touch input
const sendTouchData = (e) => {
    if (dataChannel && dataChannel.readyState === 'open') {
        const touch = e.touches[0];
        const data = {
            x: touch.clientX / window.innerWidth,
            y: touch.clientY / window.innerHeight
        };
        dataChannel.send(JSON.stringify(data));
        console.log("Sent:", data);
    }
};

window.addEventListener('touchmove', (e) => {
    sendTouchData(e);
    e.preventDefault();
}, { passive: false });
