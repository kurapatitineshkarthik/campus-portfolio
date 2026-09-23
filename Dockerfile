FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (leverage Docker cache)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Ensure data directory exists
RUN mkdir -p data/backups

# Expose standard production port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Start server with strict V8 heap ceiling (384MB) to prevent container OOM
CMD ["node", "--max-old-space-size=384", "--max-semi-space-size=16", "server.js"]

