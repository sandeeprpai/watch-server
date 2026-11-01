const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

// Track rooms: roomName -> Set of WebSocket clients
const rooms = new Map();

wss.on('connection', (ws) => {
    let currentRoom = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // Handle joining a room
            if (data.type === 'JOIN') {
                currentRoom = data.room;
                if (!rooms.has(currentRoom)) {
                    rooms.set(currentRoom, new Set());
                }
                rooms.get(currentRoom).add(ws);
                console.log(`Client joined room: ${currentRoom}`);
                return;
            }

            // Relay PLAY, PAUSE, SEEK commands to everyone else in the same room
            if (currentRoom && rooms.has(currentRoom)) {
                console.log(`Relayed ${data.type} in room ${currentRoom}`);
                for (const client of rooms.get(currentRoom)) {
                    // Send to other clients in the room (skip the sender to avoid loops)
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message.toString());
                    }
                }
            }
        } catch (e) {
            console.error('Invalid JSON received:', e);
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).delete(ws);
            if (rooms.get(currentRoom).size === 0) {
                rooms.delete(currentRoom);
            }
        }
    });
});

// Render heartbeat to prevent spin-down
setInterval(() => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.ping();
        }
    }, 30000);
});

console.log('WebSocket Watch Together Server Running...');
