const { Server } = require('socket.io');
const { verifyJwt } = require('./utils/tokens');

let io;

function initSocket(server) {
  const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'test' ? true : origin,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));
      socket.user = verifyJwt(token);
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.sub}`);
    if (socket.user.role === 'admin') socket.join('admins');
  });

  return io;
}

function emitOrder(event, order) {
  if (!io) return;
  const plain = typeof order.toObject === 'function' ? order.toObject() : order;
  const userId = plain.user?._id || plain.user;
  io.to(`user:${userId}`).emit(event, plain);
  io.to('admins').emit(event, plain);
}

function getIO() {
  return io;
}

module.exports = { initSocket, emitOrder, getIO };
