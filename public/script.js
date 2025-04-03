// public/script.js
"use strict"; // Bật strict mode để bắt lỗi tốt hơn

// --- DOM Elements ---
const roomManagementArea = document.getElementById('room-management');
const roomList = document.getElementById('roomList');
const refreshRoomsBtn = document.getElementById('refreshRoomsBtn');
const joinControls = document.getElementById('join-controls');
const nicknameInput = document.getElementById('nickname');
const roomIdInput = document.getElementById('roomId');
const joinBtn = document.getElementById('joinBtn');
const joinError = document.getElementById('joinError'); // Hiển thị lỗi tham gia
const callArea = document.getElementById('call-area');
const currentRoomIdSpan = document.getElementById('currentRoomId');
const localUserIdShortSpan = document.getElementById('localUserIdShort');
const remoteUserIdShortSpan = document.getElementById('remoteUserIdShort');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const localNicknameSpan = document.getElementById('localNickname');
const remoteNicknameSpan = document.getElementById('remoteNickname');
const remoteStatus = document.getElementById('remoteStatus');
const leaveBtn = document.getElementById('leaveBtn');

// --- Global Variables ---
let socket;
let localStream;
let remoteStream;
let peerConnection;
let currentRoom = null;
let localNickname = '';
let remoteUserInfo = null; // Store { id, nickname } of the remote peer
let isSocketConnected = false; // Theo dõi trạng thái kết nối socket

// WebRTC Configuration (STUN servers)
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Consider adding TURN servers for more robust connections
        // { urls: 'turn:YOUR_TURN_SERVER_ADDRESS', username: 'YOUR_USERNAME', credential: 'YOUR_PASSWORD' }
    ]
};

// --- Initialization ---
function initialize() {
    console.log("Initializing application...");
    connectSocket(); // Kết nối Socket.IO

    // Event Listeners
    refreshRoomsBtn.onclick = requestRoomList;
    joinBtn.onclick = joinRoom;
    leaveBtn.onclick = leaveRoom;

    // Initial UI State
    roomList.innerHTML = '<li class="loading-rooms">Đang kết nối đến server...</li>';
    localNicknameSpan.textContent = '';
    remoteNicknameSpan.textContent = '';
    localUserIdShortSpan.textContent = '...'; // Placeholder ID
    remoteUserIdShortSpan.textContent = '...';
}

// --- Socket.IO Handling ---
function connectSocket() {
    // Ngắt kết nối cũ nếu tồn tại để tránh kết nối nhiều lần
    if (socket) {
        socket.disconnect();
    }
    console.log("Attempting to connect socket...");
    socket = io(); // Kết nối tới server đang host trang web
    setupSocketListeners();
}

function setupSocketListeners() {
    if (!socket) return;

    socket.on('connect', () => {
        isSocketConnected = true;
        console.log('Socket connected successfully! ID:', socket.id);
        localUserIdShortSpan.textContent = socket.id.substring(0, 4); // Hiển thị ID ngắn
        requestRoomList(); // Lấy danh sách phòng khi kết nối thành công
        hideJoinError(); // Ẩn lỗi nếu trước đó có lỗi kết nối
    });

    socket.on('disconnect', (reason) => {
        isSocketConnected = false;
        console.warn('Socket disconnected. Reason:', reason);
        // Nếu đang không trong cuộc gọi, hiển thị trạng thái lỗi trên danh sách phòng
        if (callArea.classList.contains('hidden')) {
            roomList.innerHTML = '<li class="no-rooms">Mất kết nối với server. Đang thử kết nối lại...</li>';
            // Có thể thêm logic tự động kết nối lại ở đây hoặc hướng dẫn người dùng refresh
        }
        // Nếu đang trong cuộc gọi, 'leaveRoom' sẽ được gọi hoặc đã gọi
        if (!callArea.classList.contains('hidden')) {
            remoteStatus.textContent = "Mất kết nối với server.";
            // Có thể cần gọi hangUp() để dọn dẹp
            hangUp();
        }
    });

    socket.on('connect_error', (error) => {
        isSocketConnected = false;
        console.error('Socket connection error:', error);
        if (callArea.classList.contains('hidden')) {
            roomList.innerHTML = '<li class="no-rooms">Không thể kết nối đến server. Vui lòng thử lại.</li>';
        }
        showJoinError("Không thể kết nối đến server."); // Hiển thị lỗi
    });

    // Room list updates
    socket.on('room list', (rooms) => {
        console.log('Received room list:', rooms);
        updateRoomListUI(rooms);
    });

    socket.on('room list updated', (rooms) => {
        console.log('Received room list update:', rooms);
        // Chỉ cập nhật UI nếu người dùng không ở trong phòng gọi
        if (callArea.classList.contains('hidden')) {
            updateRoomListUI(rooms);
        }
    });

    // Room joining results
    socket.on('room full', (roomId) => {
        console.warn(`Room ${roomId} is full.`);
        alert(`Phòng "${roomId}" đã đầy. Vui lòng chọn phòng khác hoặc tạo phòng mới.`);
        joinBtn.disabled = false; // Cho phép thử lại
    });
    socket.on('join error', (errorMessage) => { // Bắt lỗi từ server (nếu có)
        console.error('Join room error:', errorMessage);
        showJoinError(errorMessage);
        joinBtn.disabled = false;
    });


    // Peer connection events
    socket.on('existing user info', (userInfo) => {
        console.log('Existing user info received:', userInfo);
        if (!remoteUserInfo) { // Chỉ xử lý nếu chưa có thông tin người khác
            remoteUserInfo = userInfo;
            remoteUserIdShortSpan.textContent = remoteUserInfo.id.substring(0, 4);
            updateRemoteStatus();
            console.log("I am the joiner, initiating call (creating offer)...");
            startCall(true); // Người mới tham gia -> tạo offer
        }
    });

    socket.on('other user joined', (userInfo) => {
        console.log('Other user joined:', userInfo);
        if (!remoteUserInfo) { // Chỉ xử lý nếu chưa có thông tin người khác
            remoteUserInfo = userInfo;
            remoteUserIdShortSpan.textContent = remoteUserInfo.id.substring(0, 4);
            updateRemoteStatus();
            console.log("I was here first, waiting for offer...");
            // Không cần gọi startCall(false) ở đây vì người kia sẽ gửi offer
            // startCall(false) chỉ cần nếu muốn thiết lập PeerConnection trước
            createPeerConnection(); // Tạo PeerConnection sẵn sàng nhận offer
            addLocalTracks(); // Thêm track sẵn sàng
        } else {
            console.log("Another user joined, but already connected to someone. Ignoring.");
            // Logic cho phòng nhiều người sẽ phức tạp hơn
        }
    });

    socket.on('user left', (userId) => {
        console.log(`User left: ${userId}`);
        if (remoteUserInfo && userId === remoteUserInfo.id) {
            console.log(`Partner ${remoteUserInfo.nickname} left.`);
            remoteStatus.textContent = `Đối tác (${remoteUserInfo.nickname || 'User'}) đã rời đi.`;
            remoteNicknameSpan.textContent = '';
            remoteUserIdShortSpan.textContent = '...';
            hangUp(); // Dọn dẹp kết nối WebRTC
            remoteUserInfo = null; // Xóa thông tin người cũ
            updateRemoteStatus(); // Cập nhật lại trạng thái chờ
        }
    });

    // WebRTC signaling messages
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
}

// --- UI Update Functions ---
function updateRoomListUI(rooms) {
    roomList.innerHTML = ''; // Clear existing list

    if (!isSocketConnected) {
        roomList.innerHTML = '<li class="no-rooms">Mất kết nối. Đang thử lại...</li>';
        return;
    }

    if (!rooms || rooms.length === 0) {
        roomList.innerHTML = '<li class="no-rooms">Không có phòng nào đang hoạt động.</li>';
        return;
    }

    rooms.forEach(room => {
        const li = document.createElement('li');
        li.dataset.roomId = room.id;

        const roomIdSpan = document.createElement('span');
        roomIdSpan.textContent = room.id;
        roomIdSpan.classList.add('room-id');

        const roomInfoSpan = document.createElement('span');
        const occupantsDisplay = room.occupants.slice(0, 2).join(', ') + (room.occupants.length > 2 ? '...' : '');
        roomInfoSpan.textContent = `(${room.count}) ${occupantsDisplay}`;
        roomInfoSpan.classList.add('room-info');

        li.appendChild(roomIdSpan);
        li.appendChild(roomInfoSpan);

        li.onclick = () => {
            roomIdInput.value = room.id;
            console.log(`Selected room: ${room.id}`);
            roomIdInput.focus(); // Focus vào input để người dùng dễ thấy
        };

        roomList.appendChild(li);
    });
}

function updateRemoteStatus() {
    if (remoteUserInfo) {
        remoteStatus.textContent = `Đang kết nối với: ${remoteUserInfo.nickname}`;
        remoteNicknameSpan.textContent = remoteUserInfo.nickname;
        remoteNicknameSpan.style.display = 'block';
    } else if (currentRoom) {
        remoteStatus.textContent = 'Đang chờ đối tác...';
        remoteNicknameSpan.textContent = '';
        remoteNicknameSpan.style.display = 'none';
        remoteUserIdShortSpan.textContent = '...';
    } else {
        remoteStatus.textContent = '';
        remoteNicknameSpan.textContent = '';
        remoteNicknameSpan.style.display = 'none';
        remoteUserIdShortSpan.textContent = '...';
    }
}

function showJoinError(message) {
    joinError.textContent = message;
    joinError.classList.remove('hidden');
}

function hideJoinError() {
    joinError.classList.add('hidden');
}

// --- Room Management ---
function requestRoomList() {
    if (socket && socket.connected) {
        console.log("Requesting room list...");
        roomList.innerHTML = '<li class="loading-rooms">Đang tải danh sách...</li>';
        socket.emit('get rooms');
    } else {
        console.warn("Socket not connected. Cannot request room list.");
        roomList.innerHTML = '<li class="no-rooms">Chưa kết nối đến server.</li>';
    }
}

async function joinRoom() {
    localNickname = nicknameInput.value.trim();
    const roomId = roomIdInput.value.trim();

    if (!localNickname || !roomId) {
        showJoinError('Vui lòng nhập cả Biệt danh và ID Phòng.');
        return;
    }
    if (!isSocketConnected) {
        showJoinError('Chưa kết nối đến server. Vui lòng chờ hoặc thử lại.');
        return;
    }

    hideJoinError();
    joinBtn.disabled = true;
    console.log(`Attempting to join room "${roomId}" as "${localNickname}"`);

    try {
        // 1. Get User Media
        console.log("Requesting user media (camera, microphone)...");
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        localNicknameSpan.textContent = localNickname; // Display local nickname immediately
        localNicknameSpan.style.display = 'block';
        console.log('Local stream obtained successfully.');

        // 2. Emit Join Room event
        currentRoom = roomId;
        socket.emit('join room', { roomId, nickname: localNickname });
        console.log(`Emitted 'join room' event.`);

        // 3. Update UI
        roomManagementArea.classList.add('hidden');
        joinControls.classList.add('hidden');
        callArea.classList.remove('hidden');
        currentRoomIdSpan.textContent = roomId;
        updateRemoteStatus(); // Show 'Waiting...'

    } catch (error) {
        console.error('Error during join room process:', error);
        if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
            alert("Không tìm thấy camera hoặc microphone.");
        } else if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
            alert("Bạn cần cấp quyền truy cập camera và microphone để tham gia.");
        } else {
            alert("Đã xảy ra lỗi khi truy cập media hoặc tham gia phòng.");
        }
        // Clean up if stream was partially obtained
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
            localVideo.srcObject = null;
        }
        localNicknameSpan.style.display = 'none';
        joinBtn.disabled = false; // Allow retry
        currentRoom = null; // Reset current room
    }
}

function leaveRoom() {
    console.log("Leaving room...");
    hangUp(); // Close WebRTC connection and streams

    if (socket && currentRoom) {
        // No need to emit 'leave', server handles 'disconnect'
        console.log("Disconnecting socket...");
        socket.disconnect(); // Trigger disconnect on server
        isSocketConnected = false; // Cập nhật trạng thái
    }

    // Reset UI
    callArea.classList.add('hidden');
    roomManagementArea.classList.remove('hidden');
    joinControls.classList.remove('hidden');
    joinBtn.disabled = false;
    // nicknameInput.value = localNickname; // Optionally keep nickname
    roomIdInput.value = '';
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    currentRoomIdSpan.textContent = '';
    localNicknameSpan.textContent = '';
    localNicknameSpan.style.display = 'none';
    remoteNicknameSpan.textContent = '';
    remoteNicknameSpan.style.display = 'none';
    localUserIdShortSpan.textContent = '...'; // Reset short IDs
    remoteUserIdShortSpan.textContent = '...';

    // Reset state
    remoteUserInfo = null;
    currentRoom = null;
    // localNickname = ''; // Keep nickname maybe?

    console.log('Left room and cleaned up.');

    // Reconnect socket after leaving to see room list again
    setTimeout(connectSocket, 500); // Delay before reconnecting
}


// --- WebRTC Core Logic ---

function createPeerConnection() {
    console.log("Creating new RTCPeerConnection...");
    if (peerConnection) {
        console.warn("Closing existing peer connection before creating new one.");
        peerConnection.close();
    }

    peerConnection = new RTCPeerConnection(configuration);

    // Event Handlers for Peer Connection
    peerConnection.onicecandidate = handleIceCandidateEvent;
    peerConnection.ontrack = handleTrackEvent;
    peerConnection.oniceconnectionstatechange = handleIceConnectionStateChangeEvent;
    peerConnection.onconnectionstatechange = handleConnectionStateChangeEvent;
    peerConnection.onsignalingstatechange = handleSignalingStateChangeEvent; // For debugging

    console.log("RTCPeerConnection created.");
}

function addLocalTracks() {
    if (!peerConnection) {
        console.error("Cannot add tracks: PeerConnection is null.");
        return;
    }
    if (!localStream) {
        console.error("Cannot add tracks: Local stream is not available.");
        return;
    }
    console.log("Adding local tracks to PeerConnection...");
    localStream.getTracks().forEach(track => {
        try {
            peerConnection.addTrack(track, localStream);
            console.log(`Added local ${track.kind} track.`);
        } catch (error) {
            console.error(`Error adding local ${track.kind} track:`, error);
        }
    });
}


async function startCall(isCaller) {
    if (!localStream) return console.error("Cannot start call: Local stream not ready.");
    if (!remoteUserInfo || !remoteUserInfo.id) return console.error("Cannot start call: Remote user info not available.");

    console.log(`Starting call with ${remoteUserInfo.nickname} (${remoteUserInfo.id}). Is caller: ${isCaller}`);
    createPeerConnection(); // Ensure PC exists
    addLocalTracks(); // Add local media tracks

    if (isCaller) {
        console.log("Creating offer...");
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            console.log('Offer created and set as local description.');
            if (socket && socket.connected && remoteUserInfo && remoteUserInfo.id) {
                socket.emit('offer', {
                    target: remoteUserInfo.id,
                    sdp: peerConnection.localDescription
                });
                console.log(`Sent offer to ${remoteUserInfo.nickname}`);
            } else {
                console.error("Cannot send offer: Socket not connected or remote user info missing.");
                // Handle error - maybe alert user or try to reconnect?
            }
        } catch (error) {
            console.error('Error creating or sending offer:', error);
            handleSignalingError('create/send offer', error);
        }
    } else {
        console.log("Waiting for offer from remote peer.");
    }
}

// --- WebRTC Event Handlers ---

function handleIceCandidateEvent(event) {
    if (event.candidate && remoteUserInfo && remoteUserInfo.id && socket && socket.connected) {
        // console.log("Generated ICE candidate:", event.candidate.type, event.candidate.sdpMLineIndex); // Verbose log
        socket.emit('ice-candidate', {
            target: remoteUserInfo.id,
            candidate: event.candidate
        });
    }
}

function handleTrackEvent(event) {
    console.log(`Remote track received: ${event.track.kind}`);
    // Ensure remoteStream exists
    if (!remoteStream) {
        remoteStream = new MediaStream();
        remoteVideo.srcObject = remoteStream; // Assign stream to video element only once
    }
    remoteStream.addTrack(event.track);
    console.log("Added remote track to remote stream.");
    remoteVideo.play().catch(e => console.error("Error playing remote video:", e));
}

function handleIceConnectionStateChangeEvent() {
    if (!peerConnection) return; // Guard against calls after close
    console.log(`ICE connection state changed to: ${peerConnection.iceConnectionState}`);
    switch (peerConnection.iceConnectionState) {
        case 'connected':
            console.log("ICE Connected: Peers have connectivity.");
            updateRemoteStatus(); // Ensure status shows connected
            break;
        case 'completed':
            console.log("ICE Completed: All candidates gathered and checks done.");
            break;
        case 'disconnected':
            console.warn("ICE Disconnected: Connectivity lost temporarily. May reconnect.");
            remoteStatus.textContent = 'Mất kết nối tạm thời...';
            // Consider adding ICE restart logic here after a timeout
            break;
        case 'failed':
            console.error("ICE Failed: Connection failed. Cannot recover.");
            remoteStatus.textContent = 'Kết nối thất bại.';
            // Optionally trigger hangUp or specific error handling
            handleSignalingError('ICE connection failed');
            hangUp(); // Often best to hang up on failure
            break;
        case 'closed':
            console.log("ICE Closed: Connection has been closed.");
            break;
    }
}
function handleConnectionStateChangeEvent() {
    if (!peerConnection) return;
    console.log(`Connection state changed to: ${peerConnection.connectionState}`);
    switch (peerConnection.connectionState) {
        case 'connected':
            console.log("Peers connected successfully.");
            updateRemoteStatus();
            break;
        case 'disconnected':
            console.warn("Peers disconnected.");
            // May recover, often linked to ICE disconnected
            break;
        case 'failed':
            console.error("Peer connection failed.");
            remoteStatus.textContent = 'Kết nối thất bại.';
            handleSignalingError('Peer connection failed');
            hangUp();
            break;
        case 'closed':
            console.log("Peer connection closed.");
            // Usually happens after hangUp() is called
            break;
    }
}

function handleSignalingStateChangeEvent() {
    if (!peerConnection) return;
    console.log(`Signaling state changed to: ${peerConnection.signalingState}`);
    // Useful for debugging offer/answer flow
}


// --- Handling Received Signaling Messages ---

async function handleOffer(payload) {
    const { sdp, senderId } = payload;
    let senderNickname = `User ${senderId.substring(0, 4)}`; // Default name

    // Ensure remoteUserInfo is set correctly
    if (!remoteUserInfo || remoteUserInfo.id !== senderId) {
        console.warn(`Received offer from unexpected sender ${senderId}. Expected ${remoteUserInfo?.id}. Attempting to handle.`);
        // This might happen if 'other user joined' arrives late. Update remote info.
        // Ideally, we'd request the nickname from the server here.
        remoteUserInfo = { id: senderId, nickname: senderNickname }; // Use default nickname
        remoteUserIdShortSpan.textContent = senderId.substring(0, 4);
        updateRemoteStatus();
    } else {
        senderNickname = remoteUserInfo.nickname; // Use known nickname
    }
    console.log(`Received offer from ${senderNickname} (${senderId})`);


    if (!localStream) {
        console.error("Cannot handle offer: Local stream not ready.");
        handleSignalingError('handle offer', new Error("Local stream not available"));
        return;
    }

    // Create PeerConnection if it doesn't exist or is closed
    if (!peerConnection || peerConnection.signalingState === 'closed') {
        console.log("PeerConnection not ready for offer, creating/recreating...");
        createPeerConnection();
        addLocalTracks(); // Add tracks before setting remote description
    }

    // Defend against race conditions/unexpected states
    if (peerConnection.signalingState !== 'stable' && peerConnection.signalingState !== 'have-remote-offer') {
        console.warn(`Received offer in unexpected signaling state: ${peerConnection.signalingState}. Resetting and trying again.`);
        // Simple strategy: close current PC and create a new one
        await handleSignalingConflict(); // Function to reset the connection
        createPeerConnection();
        addLocalTracks();
    }


    try {
        console.log("Setting remote description (offer)...");
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log("Remote description (offer) set.");

        console.log("Creating answer...");
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        console.log('Answer created and set as local description.');

        if (socket && socket.connected && remoteUserInfo && remoteUserInfo.id) {
            socket.emit('answer', {
                target: senderId, // Send back to the sender
                sdp: peerConnection.localDescription
            });
            console.log(`Sent answer to ${senderNickname}`);
        } else {
            console.error("Cannot send answer: Socket not connected or sender info missing.");
        }

    } catch (error) {
        console.error('Error handling offer or creating/sending answer:', error);
        handleSignalingError('handle offer/create answer', error);
    }
}

async function handleAnswer(payload) {
    const { sdp, senderId } = payload;
    if (!remoteUserInfo || remoteUserInfo.id !== senderId) {
        console.warn(`Received answer from unexpected sender ${senderId}. Expected ${remoteUserInfo?.id}. Ignoring.`);
        return;
    }
    let senderNickname = remoteUserInfo.nickname;
    console.log(`Received answer from ${senderNickname} (${senderId})`);


    if (!peerConnection) {
        console.error("Received answer but no peer connection exists.");
        return;
    }

    // Should be in 'have-local-offer' state when receiving answer
    if (peerConnection.signalingState !== 'have-local-offer') {
        console.warn(`Received answer in unexpected signaling state: ${peerConnection.signalingState}. Ignoring.`);
        // Possibly handle glare/conflict more robustly if needed
        return;
    }

    try {
        console.log("Setting remote description (answer)...");
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log("Remote description (answer) set.");
    } catch (error) {
        console.error('Error setting remote description (answer):', error);
        handleSignalingError('set remote answer', error);
    }
}

async function handleIceCandidate(payload) {
    const { candidate, senderId } = payload;
    if (!remoteUserInfo || remoteUserInfo.id !== senderId) {
        // console.warn(`Received ICE candidate from unexpected sender ${senderId}. Ignoring.`);
        return; // Ignore candidates not from the expected peer
    }

    if (peerConnection && candidate) {
        try {
            // console.log("Adding received ICE candidate..."); // Verbose
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            // Benign errors can happen if candidate arrives before setRemoteDescription
            if (!error.message.includes("Could not add candidate") && !error.message.includes("invalid state")) {
                console.error('Error adding received ICE candidate:', error);
            }
        }
    } else {
        // console.warn("Received ICE candidate but PC not ready or candidate is null.");
        // Could potentially queue candidates if needed, but often not necessary
    }
}

// Function to handle signaling conflicts (e.g., offer collision)
async function handleSignalingConflict() {
    console.warn("Signaling conflict detected. Resetting PeerConnection.");
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    // Optionally, signal to the other peer to also reset, though often
    // just restarting locally is enough if the other peer also detects it.
}


// --- Cleanup and Error Handling ---

function hangUp() {
    console.log('Hang up initiated.');
    // 1. Close Peer Connection
    if (peerConnection) {
        peerConnection.close(); // This should trigger state changes to 'closed'
        peerConnection = null;
        console.log("PeerConnection closed.");
    } else {
        console.log("No active PeerConnection to close.");
    }

    // 2. Stop Media Tracks
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
        console.log("Local media tracks stopped.");
    }
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
        console.log("Remote media tracks stopped.");
    }

    // 3. Clear Video Elements
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    console.log("Video elements cleared.");

    // 4. Update UI (partially done here, more in leaveRoom)
    updateRemoteStatus(); // Update status (usually shows waiting if still in room conceptually)

    console.log('Hang up complete.');
}

function handleSignalingError(context, error = null) {
    console.error(`Signaling Error (${context}):`, error || 'Unknown error');
    // Basic user feedback
    remoteStatus.textContent = `Lỗi kết nối (${context}). Vui lòng thử lại.`;
    // Consider more specific actions depending on the context/error
    // hangUp(); // Sometimes necessary to reset fully after an error
}


// --- Start Application ---
window.onload = initialize;

// --- Graceful Shutdown ---
window.onbeforeunload = () => {
    // Only try to leave if actually connected to a room/call
    if (!callArea.classList.contains('hidden') || currentRoom) {
        console.log("Page unloading, attempting to leave room...");
        leaveRoom();
        // Note: onbeforeunload has limitations, socket disconnect might not always complete cleanly.
    }
};