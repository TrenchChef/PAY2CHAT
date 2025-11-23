// Minimal ephemeral WebSocket signaling server for Pay2Chat
// Usage: set env `METERED_API_KEY` in `.env` or environment then `node server.js`
// Protocol: JSON messages { type: 'join'|'offer'|'answer'|'candidate', room, ... }

// Optionally read .env when `dotenv` is installed locally (not required)
try { require('dotenv').config(); } catch (e) { /* dotenv not installed; ok */ }

const WebSocket = require('ws');
const PORT = process.env.PORT || 8888;
// METERED_API_KEY is optional and not currently used
// Reserved for future URL shortener integration if needed
const METERED_API_KEY = process.env.METERED_API_KEY || null;

const wss = new WebSocket.Server({ port: PORT });

// rooms: map roomId -> Set of ws
const rooms = new Map();

function send(ws, obj) {
  try { ws.send(JSON.stringify(obj)); } catch (e) { /* ignore */ }
}

wss.on('connection', (ws) => {
  ws._rooms = new Set();

  ws.on('message', (msg) => {
    let data;
    try { data = JSON.parse(msg); } catch (e) { return; }
    const { type, room } = data || {};
    if (!type) return;
    if (type === 'join' && room) {
      if (!rooms.has(room)) rooms.set(room, new Set());
      rooms.get(room).add(ws);
      ws._rooms.add(room);
      // inform existing peers
      for (const peer of rooms.get(room)) {
        if (peer !== ws) send(peer, { type: 'peer-joined', room });
      }
      return;
    }
    // broadcast to other peers in the room
    if (room && rooms.has(room)) {
      for (const peer of rooms.get(room)) {
        if (peer !== ws) {
          send(peer, data);
        }
      }
    }
  });

  ws.on('close', () => {
    for (const r of ws._rooms) {
      const s = rooms.get(r);
      if (s) {
        s.delete(ws);
        if (s.size === 0) rooms.delete(r);
      }
    }
  });
});

console.log('Pay2Chat signaling server running on port', PORT);
