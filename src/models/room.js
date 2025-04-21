class Room {
  constructor(id, hostId, hostNickname) {
    this.id = id;
    this.host = { id: hostId, nickname: hostNickname };
    this.users = [{ id: hostId, nickname: hostNickname }];
  }

  addUser(userId, nickname) {
    if (!this.users.find((u) => u.id === userId)) {
      this.users.push({ id: userId, nickname });
    }
  }

  removeUser(userId) {
    this.users = this.users.filter((u) => u.id !== userId);
    if (this.host.id === userId && this.users.length > 0) {
      // Auto select new host (first user in list)
      this.host = this.users[0];
      return this.host;
    }
    return null;
  }

  isEmpty() {
    return this.users.length === 0;
  }
}

module.exports = Room;