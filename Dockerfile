# Dockerfile for Pay2Chat WebSocket Signaling Server
FROM node:20-alpine

WORKDIR /app

# Install only the dependencies needed for the server
# Server only requires: ws (WebSocket library) and dotenv (optional, for .env files)
RUN npm install ws dotenv

# Copy server file
COPY server.js ./

# Expose port (Railway sets PORT env var automatically)
EXPOSE 8888

# Start the signaling server
CMD ["node", "server.js"]

