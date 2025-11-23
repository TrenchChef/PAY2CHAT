# Dockerfile for Pay2Chat WebSocket Signaling Server
FROM node:20-alpine

WORKDIR /app

# Copy package files first (for better caching)
COPY package.json package-lock.json* ./

# Install dependencies
# Using npm install instead of npm ci for more flexibility
RUN npm install --production || npm install

# Copy server file
COPY server.js ./

# Expose port (Railway sets PORT env var automatically)
EXPOSE 8888

# Start the signaling server
CMD ["node", "server.js"]

