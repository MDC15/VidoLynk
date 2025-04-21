const RoomController = require('../src/controllers/roomController');

describe('RoomController', () => {
  let ctrl;
  beforeEach(() => {
    ctrl = new (require('../src/controllers/roomController').constructor)();
  });

  test('create and join room', () => {
    const { room } = ctrl.createOrJoinRoom('abc', 'id1', 'A');
    expect(room.host.id).toBe('id1');
    expect(room.users).toHaveLength(1);
    ctrl.createOrJoinRoom('abc', 'id2', 'B');
    expect(room.users).toHaveLength(2);
    expect(room.users[1].nickname).toBe('B');
  });

  test('room full', () => {
    ctrl.createOrJoinRoom('abc', 'id1', 'A');
    ctrl.createOrJoinRoom('abc', 'id2', 'B');
    const { error } = ctrl.createOrJoinRoom('abc', 'id3', 'C');
    expect(error).toBe('Phòng đã đầy');
  });

  test('host handover', () => {
    ctrl.createOrJoinRoom('abc', 'id1', 'A');
    ctrl.createOrJoinRoom('abc', 'id2', 'B');
    const { newHost } = ctrl.leaveRoom('abc', 'id1');
    expect(newHost.id).toBe('id2');
  });

  test('room deletion', () => {
    ctrl.createOrJoinRoom('abc', 'id1', 'A');
    ctrl.leaveRoom('abc', 'id1');
    expect(ctrl.getRoomList().length).toBe(0);
  });
});