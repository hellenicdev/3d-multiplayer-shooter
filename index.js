const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const players = {};

io.on('connection', socket => {
    console.log(`Player connected: ${socket.id}`);
    players[socket.id] = { x: 0, y: 0, z: 0, health: 100 };

    socket.broadcast.emit('playerJoined', { id: socket.id, state: players[socket.id] });

    socket.on('update', data => {
        if (players[socket.id]) {
            players[socket.id] = data;
            socket.broadcast.emit('playerUpdate', { id: socket.id, state: data });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('playerLeft', socket.id);
    });
});

app.use(express.static(__dirname + '/../client'));

server.listen(3000, () => console.log('Server listening on http://localhost:3000'));

socket.on('shoot', (data) => {
    socket.broadcast.emit('bulletFired', { id: socket.id, ...data });
});
