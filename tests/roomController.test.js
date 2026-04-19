const { test, expect } = require('@playwright/test');
const roomController = require('../src/controllers/roomController');

test.describe('RoomController', () => {
  test.beforeEach(() => {
    // Clear rooms before each test if necessary
    // Since it's a singleton, we might need a way to reset it
    roomController.rooms.clear();
  });

  test('create and join room', async () => {
    const { room } = roomController.createOrJoinRoom('abc', 'id1', 'A');
    expect(room.host.id).toBe('id1');
    expect(room.users).toHaveLength(1);
    roomController.createOrJoinRoom('abc', 'id2', 'B');
    expect(room.users).toHaveLength(2);
    expect(room.users[1].nickname).toBe('B');
  });

  test('room full', async () => {
    roomController.createOrJoinRoom('abc', 'id1', 'A');
    roomController.createOrJoinRoom('abc', 'id2', 'B');
    const { error } = roomController.createOrJoinRoom('abc', 'id3', 'C');
    expect(error).toBe('Phòng đã đầy');
  });

  test('host handover', async () => {
    roomController.createOrJoinRoom('abc', 'id1', 'A');
    roomController.createOrJoinRoom('abc', 'id2', 'B');
    const { newHost } = roomController.leaveRoom('abc', 'id1');
    expect(newHost.id).toBe('id2');
  });

  test('room deletion', async () => {
    roomController.createOrJoinRoom('abc', 'id1', 'A');
    roomController.leaveRoom('abc', 'id1');
    expect(roomController.getRoomList().length).toBe(0);
  });
});
