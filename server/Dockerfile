FROM node:18-slim

WORKDIR /app

# Install OpenSSL for Prisma and Ghostscript for PDF compression
RUN apt-get update -y && apt-get install -y openssl ghostscript

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 3055

CMD ["npm", "start"]
