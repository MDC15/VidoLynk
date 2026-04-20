// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const roomController = require('./src/controllers/roomController');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Gửi cập nhật danh sách phòng tới tất cả client
function broadcastRoomListUpdate() {
  const roomList = roomController.getRoomList();
  io.emit('room list updated', roomList);
  console.log('Broadcasted room list update:', roomList.map(r => `${r.id} (${r.count})`));
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  let currentRoomId = null;

  socket.on('get rooms', () => {
    console.log(`User ${socket.id} requested room list.`);
    const roomList = roomController.getRoomList();
    socket.emit('room list', roomList);
  });

  socket.on('join room', (data) => {
    const { roomId, nickname } = data;
    if (!roomId || !nickname) return;

    const trimmedRoomId = roomId.trim();
    const trimmedNickname = nickname.trim();
    if (!trimmedRoomId || !trimmedNickname) return;

    console.log(`User ${socket.id} (${trimmedNickname}) attempting to join room ${trimmedRoomId}`);

    const result = roomController.createOrJoinRoom(trimmedRoomId, socket.id, trimmedNickname);
    
    if (result.error) {
      socket.emit('room full', trimmedRoomId);
      console.log(`Room ${trimmedRoomId} is full. User ${trimmedNickname} cannot join.`);
      return;
    }

    const room = result.room;
    currentRoomId = trimmedRoomId;
    socket.join(trimmedRoomId);
    console.log(`User ${trimmedNickname} (${socket.id}) joined room ${trimmedRoomId}.`);

    const otherUser = roomController.getOtherUser(trimmedRoomId, socket.id);
    if (otherUser) {
      io.to(otherUser.id).emit('other user joined', { id: socket.id, nickname: trimmedNickname });
      socket.emit('existing user info', otherUser);
      console.log(`Notified existing users. Sent ${otherUser.nickname}'s info to ${trimmedNickname}.`);
    }

    broadcastRoomListUpdate();
  });

  socket.on('offer', (payload) => {
    io.to(payload.target).emit('offer', { sdp: payload.sdp, senderId: socket.id });
  });

  socket.on('answer', (payload) => {
    io.to(payload.target).emit('answer', { sdp: payload.sdp, senderId: socket.id });
  });

  socket.on('ice-candidate', (payload) => {
    io.to(payload.target).emit('ice-candidate', { candidate: payload.candidate, senderId: socket.id });
  });

  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${socket.id}. Reason: ${reason}`);
    if (currentRoomId) {
      const { newHost, room } = roomController.leaveRoom(currentRoomId, socket.id);
      if (room && !room.isEmpty()) {
        socket.to(currentRoomId).emit('user left', socket.id);
      }
      broadcastRoomListUpdate();
    }
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Frontend accessible at http://localhost:${PORT}`);
});
