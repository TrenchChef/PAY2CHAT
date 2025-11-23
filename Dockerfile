# Dockerfile for Pay2Chat WebSocket Signaling Server
# Railway will use this Dockerfile for deployment
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (including devDependencies for build tools if needed)
RUN npm ci --production=false

# Copy server file
COPY server.js ./

# Expose port (Railway will set PORT env var automatically)
EXPOSE 8888

# Start the signaling server
# Railway will override this with startCommand from railway.json if set
CMD ["node", "server.js"]

