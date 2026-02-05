#!/bin/bash

echo "Starting IDN Book Application..."

# Check if node_modules exists in server, if not install
if [ ! -d "server/node_modules" ]; then
    echo "Installing server dependencies..."
    cd server && npm install && npx prisma migrate dev --name init && cd ..
fi

# Check if node_modules exists in client, if not install
if [ ! -d "client/node_modules" ]; then
    echo "Installing client dependencies..."
    cd client && npm install && cd ..
fi

# Start Server in background
echo "Starting Backend Server..."
cd server && npm start &
SERVER_PID=$!

# Start Client
echo "Starting Frontend Client..."
cd client && npm run dev

# Cleanup on exit
trap "kill $SERVER_PID" EXIT
