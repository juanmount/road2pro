FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci

COPY backend/ ./backend/
RUN cd backend && npm run build

WORKDIR /app/backend
EXPOSE 8080
CMD ["npm", "start"]
