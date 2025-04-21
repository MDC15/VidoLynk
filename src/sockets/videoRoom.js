function videoRoomSocketHandler(io, socket, roomController) {
  let currentRoomId = null;

  socket.on('get rooms', () => {
    socket.emit('room list', roomController.getRoomList());
  });

  socket.on('join room', ({ roomId, nickname }) => {
    if (!roomId || !nickname) {
      socket.emit('join error', 'Thiếu thông tin phòng hoặc biệt danh');
      return;
    }
    const { room, error } = roomController.createOrJoinRoom(roomId, socket.id, nickname);
    if (error) {
      socket.emit('room full', roomId);
      return;
    }
    currentRoomId = roomId;
    socket.join(roomId);

    // Gửi info của người đang ở trong phòng cho người mới vào
    if (room.users.length > 1) {
      const other = room.users.find((u) => u.id !== socket.id);
      socket.emit('existing user info', other);
      // Gửi info về người mới vào cho người cũ
      io.to(other.id).emit('other user joined', { id: socket.id, nickname });
    }

    io.emit('room list updated', roomController.getRoomList());
  });

  socket.on('offer', (data) => {
    io.to(data.target).emit('offer', { sdp: data.sdp, senderId: socket.id });
  });

  socket.on('answer', (data) => {
    io.to(data.target).emit('answer', { sdp: data.sdp, senderId: socket.id });
  });

  socket.on('ice-candidate', (data) => {
    io.to(data.target).emit('ice-candidate', { candidate: data.candidate, senderId: socket.id });
  });

  socket.on('disconnect', () => {
    if (currentRoomId) {
      const { newHost, room } = roomController.leaveRoom(currentRoomId, socket.id);
      // Thông báo cho user còn lại về việc thay đổi host nếu có
      if (newHost && room) {
        io.to(room.id).emit('host changed', { newHostId: newHost.id, newHostNickname: newHost.nickname });
      }
      // Thông báo cho user còn lại về việc có người rời phòng
      socket.to(currentRoomId).emit('user left', socket.id);
      io.emit('room list updated', roomController.getRoomList());
    }
  });
}

module.exports = { videoRoomSocketHandler };