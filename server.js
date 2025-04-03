// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
// Cấu hình CORS cho Socket.IO nếu cần (ví dụ khi frontend và backend khác domain/port)
// const io = new Server(server, {
//   cors: {
//     origin: "*", // Cho phép tất cả các origin (thay đổi thành domain cụ thể nếu cần)
//     methods: ["GET", "POST"]
//   }
// });
const io = new Server(server); // Sử dụng cấu hình mặc định nếu frontend được serve từ cùng server

// Render sẽ cung cấp PORT qua biến môi trường. Dùng 3000 cho local dev.
const PORT = process.env.PORT || 3000;

// Serve các file tĩnh từ thư mục 'public'
app.use(express.static(path.join(__dirname, 'public')));

// --- Data Structures ---
let users = {}; // Lưu trữ thông tin user: socket.id -> { id, nickname, room }
let roomOccupants = {}; // Lưu trữ thông tin phòng: roomId -> [{id, nickname}, ...]

// --- Helper Functions ---
function getRoomListDetails() {
  return Object.entries(roomOccupants)
    .map(([roomId, occupants]) => ({
      id: roomId,
      count: occupants.length,
      occupants: occupants.map(u => u.nickname) // Lấy nickname để hiển thị
    }))
    .filter(room => room.count > 0); // Chỉ lấy phòng đang có người
}

// Gửi cập nhật danh sách phòng tới tất cả client
function broadcastRoomListUpdate() {
  const roomList = getRoomListDetails();
  io.emit('room list updated', roomList); // Gửi tới tất cả mọi người
  console.log('Broadcasted room list update:', roomList.map(r => `${r.id} (${r.count})`));
}

// --- Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  users[socket.id] = { id: socket.id }; // Khởi tạo user cơ bản

  // --- Room Management ---
  socket.on('get rooms', () => {
    console.log(`User ${socket.id} requested room list.`);
    const roomList = getRoomListDetails();
    socket.emit('room list', roomList); // Gửi danh sách về cho client yêu cầu
  });

  socket.on('join room', (data) => {
    const { roomId, nickname } = data;

    if (!roomId || !nickname) {
      console.log(`Join failed for ${socket.id}: Missing roomId or nickname.`);
      // Có thể emit lỗi về client
      // socket.emit('join error', 'Nickname and Room ID are required.');
      return;
    }

    const trimmedRoomId = roomId.trim();
    const trimmedNickname = nickname.trim();

    if (!trimmedRoomId || !trimmedNickname) {
      console.log(`Join failed for ${socket.id}: Empty roomId or nickname after trim.`);
      return;
    }

    console.log(`User ${socket.id} (${trimmedNickname}) attempting to join room ${trimmedRoomId}`);

    let occupants = roomOccupants[trimmedRoomId] || [];
    const MAX_USERS_PER_ROOM = 2; // Đặt giới hạn số người trong phòng

    if (occupants.length >= MAX_USERS_PER_ROOM) {
      socket.emit('room full', trimmedRoomId);
      console.log(`Room ${trimmedRoomId} is full. User ${trimmedNickname} cannot join.`);
      return;
    }

    const wasRoomEmpty = occupants.length === 0;

    // Cập nhật thông tin user và phòng
    users[socket.id].nickname = trimmedNickname;
    users[socket.id].room = trimmedRoomId;
    const newUserInfo = { id: socket.id, nickname: trimmedNickname };
    occupants.push(newUserInfo);
    roomOccupants[trimmedRoomId] = occupants;

    socket.join(trimmedRoomId); // Tham gia phòng Socket.IO
    console.log(`User ${trimmedNickname} (${socket.id}) joined room ${trimmedRoomId}. Current occupants: ${occupants.map(u => u.nickname).join(', ')}`);

    // Thông báo cho những người khác trong phòng (nếu có)
    const otherUsers = occupants.filter(user => user.id !== socket.id);
    if (otherUsers.length > 0) {
      // Gửi thông tin người mới cho người cũ
      otherUsers.forEach(otherUser => {
        io.to(otherUser.id).emit('other user joined', newUserInfo); // Gửi tới từng người cũ
      });
      // Gửi thông tin người cũ cho người mới (chỉ cần gửi người đầu tiên cho phòng 2 người)
      socket.emit('existing user info', otherUsers[0]);
      console.log(`Notified existing users. Sent ${otherUsers[0].nickname}'s info to ${trimmedNickname}.`);
    }

    // Nếu phòng mới được tạo, cập nhật danh sách phòng cho mọi người
    if (wasRoomEmpty) {
      broadcastRoomListUpdate();
    }
  });

  // --- WebRTC Signaling ---
  socket.on('offer', (payload) => {
    const targetUser = users[payload.target];
    if (targetUser) {
      console.log(`Relaying offer from ${users[socket.id]?.nickname} to ${targetUser.nickname}`);
      io.to(payload.target).emit('offer', { sdp: payload.sdp, senderId: socket.id });
    } else {
      console.warn(`Offer target ${payload.target} not found.`);
    }
  });

  socket.on('answer', (payload) => {
    const targetUser = users[payload.target];
    if (targetUser) {
      console.log(`Relaying answer from ${users[socket.id]?.nickname} to ${targetUser.nickname}`);
      io.to(payload.target).emit('answer', { sdp: payload.sdp, senderId: socket.id });
    } else {
      console.warn(`Answer target ${payload.target} not found.`);
    }
  });

  socket.on('ice-candidate', (payload) => {
    const targetUser = users[payload.target];
    if (targetUser) {
      // console.log(`Relaying ICE candidate from ${users[socket.id]?.nickname} to ${targetUser.nickname}`); // Can be verbose
      io.to(payload.target).emit('ice-candidate', { candidate: payload.candidate, senderId: socket.id });
    }
    // No warning if target not found, as candidates might arrive after disconnect
  });

  // --- Disconnect Logic ---
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${socket.id}. Reason: ${reason}`);
    const disconnectedUser = users[socket.id];

    if (disconnectedUser) {
      const { nickname, room: roomId } = disconnectedUser;
      console.log(`User details: ${nickname || '(no nickname)'} from room ${roomId || '(no room)'}`);

      let roomBecameEmpty = false;
      if (roomId && roomOccupants[roomId]) {
        let occupants = roomOccupants[roomId];
        const initialCount = occupants.length;
        occupants = occupants.filter(user => user.id !== socket.id);
        roomOccupants[roomId] = occupants;

        console.log(`Removed ${nickname} from room ${roomId}. Remaining: ${occupants.length}`);

        if (occupants.length > 0) {
          // Thông báo cho những người còn lại
          socket.to(roomId).emit('user left', socket.id);
          console.log(`Notified remaining users in room ${roomId} about ${nickname}'s departure.`);
        } else {
          // Phòng trống -> xóa phòng
          delete roomOccupants[roomId];
          roomBecameEmpty = true;
          console.log(`Room ${roomId} is now empty and removed.`);
        }
      }

      // Xóa user khỏi danh sách users
      delete users[socket.id];

      // Nếu phòng bị xóa, cập nhật danh sách cho mọi người
      if (roomBecameEmpty) {
        broadcastRoomListUpdate();
      }
    } else {
      console.log(`Disconnected user ${socket.id} not found in active users list.`);
    }
  });
});

// Route mặc định để serve file HTML chính
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- Start Server ---
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Frontend accessible at http://localhost:${PORT}`);
});