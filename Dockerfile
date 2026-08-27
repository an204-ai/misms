FROM node:20-alpine

# Set working directory in container
WORKDIR /app

# Copy package manifests first for efficient Docker layer caching
COPY backend/package*.json ./backend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm install --production

# Return to root app directory
WORKDIR /app

# Copy the rest of the project source code
COPY backend ./backend
COPY frontend ./frontend

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose backend port
EXPOSE 3000

# Set default execution directory to backend
WORKDIR /app/backend

# Start the Express server
CMD ["npm", "start"]
