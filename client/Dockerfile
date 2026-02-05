FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build for production
RUN npm run build

EXPOSE 5173

# Serve using Vite Preview (or serve -s dist)
CMD ["npm", "run", "preview", "--", "--host"]
