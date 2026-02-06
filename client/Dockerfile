FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build for production
RUN npm run build

EXPOSE 5173

# Serve using Vite Preview on port 5173
CMD ["npm", "run", "preview", "--", "--host", "--port", "5173"]
