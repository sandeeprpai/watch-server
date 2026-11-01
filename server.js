const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: PORT });

console.log(`WebSocket server running on port ${PORT}`);

wss.on('connection', (ws) => {
    ws.room = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // Handle joining a room
            if (data.type === 'JOIN') {
                ws.room = data.room;
                console.log(`Client joined room: ${ws.room}`);
                return;
            }

            // Broadcast PLAY, PAUSE, SEEK to everyone else in the SAME room
            if (ws.room) {
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN && client.room === ws.room) {
                        client.send(message);
                        console.log(`Relayed ${data.type} in room ${ws.room}`);
                    }
                });
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});
