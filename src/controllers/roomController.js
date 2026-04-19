const Room = require('../models/room');

class RoomController {
  constructor() {
    this.rooms = new Map(); // roomId => Room instance
  }

  createOrJoinRoom(roomId, userId, nickname) {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Room(roomId, userId, nickname);
      this.rooms.set(roomId, room);
    } else {
      if (room.users.length >= 2)
        return { error: 'Phòng đã đầy' };
      room.addUser(userId, nickname);
    }
    return { room };
  }

  leaveRoom(roomId, userId) {
    const room = this.rooms.get(roomId);
    let newHost = null;
    if (room) {
      newHost = room.removeUser(userId);
      if (room.isEmpty()) {
        this.rooms.delete(roomId);
      }
    }
    return { newHost, room };
  }

  getRoomList() {
    return Array.from(this.rooms.values()).map((r) => ({
      id: r.id,
      occupants: r.users.map((u) => u.nickname),
      count: r.users.length,
      host: r.host,
    }));
  }

  getUserInfo(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return room.users.find((u) => u.id === userId) || null;
  }

  getOtherUser(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return room.users.find((u) => u.id !== userId) || null;
  }
}

module.exports = new RoomController();