# Build the frontend in a separate stage
FROM node:18-alpine as builder

WORKDIR /app

# Install frontend deps and build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Build runtime image for backend
FROM node:18-alpine

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./
RUN npm install --production

# Copy backend source
COPY backend/ ./

# Copy built frontend into the backend so it can be served as static files
COPY --from=builder /app/frontend/build ./frontend/build

EXPOSE 5000
CMD ["node", "server.js"]
