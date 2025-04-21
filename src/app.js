const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const roomController = require('./controllers/roomController');
const { videoRoomSocketHandler } = require('./sockets/videoRoom');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// API endpoint mẫu nếu cần
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Socket.IO
io.on('connection', (socket) => {
  videoRoomSocketHandler(io, socket, roomController);
});

module.exports = { app, server };