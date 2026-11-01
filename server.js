const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

const rooms = new Map();

wss.on('connection', (ws) => {
    let currentRoom = null;

    wss.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'JOIN') {
                currentRoom = data.room;
                if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Set());
                rooms.get(currentRoom).add(ws);
            } else if (currentRoom && rooms.has(currentRoom)) {
                for (let client of rooms.get(currentRoom)) {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                }
            }
        } catch (e) { console.error(e); }
    });

    ws.on('close', () => {
        if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).delete(ws);
        }
    });
});
