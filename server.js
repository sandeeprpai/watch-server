const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

// Track rooms and member names
const rooms = new Map(); // roomName -> Set of WebSocket clients
const memberNames = new Map(); // ws -> display name

function broadcastToRoom(room, payload, except) {
    for (const client of rooms.get(room)) {
        if (client !== except && client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    }
}

wss.on('connection', (ws) => {
    let currentRoom = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'JOIN') {
                currentRoom = data.room;
                memberNames.set(ws, data.name || 'Guest');
                if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Set());
                rooms.get(currentRoom).add(ws);

                // Tell existing members who joined, and send the joiner the full roster.
                broadcastToRoom(currentRoom, JSON.stringify({ type: 'JOIN', name: memberNames.get(ws) }), ws);
                const members = [...rooms.get(currentRoom)].map((c) => memberNames.get(c)).filter(Boolean);
                ws.send(JSON.stringify({ type: 'ROOM_MEMBERS', members }));
                console.log(`Client joined room: ${currentRoom}`);
                return;
            }

            if (currentRoom && rooms.has(currentRoom)) {
                broadcastToRoom(currentRoom, message.toString(), ws);
            }
        } catch (e) {
            console.error('Invalid JSON received:', e);
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).delete(ws);
            const leftName = memberNames.get(ws);
            memberNames.delete(ws);
            if (leftName) {
                broadcastToRoom(currentRoom, JSON.stringify({ type: 'LEAVE', name: leftName }), ws);
            }
            if (rooms.get(currentRoom).size === 0) rooms.delete(currentRoom);
        }
    });
});

setInterval(() => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) client.ping();
    });
}, 30000);

console.log('WebSocket Watch Together Server Running...');
