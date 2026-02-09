# IDN Book - Digital Flipbook Library

A professional digital library application with PDF flipbook capabilities, authentic "blueprint" aesthetics, and a clean 3D book interface.

## Tech Stack
- **Backend**: Node.js, Express, SQLite, Prisma ORM.
- **Frontend**: React, Vite, Tailwind CSS, React PageFlip.

## Features
- **Public Grid**: 3D Book display of all released books.
- **Reader**: High-performance flipbook viewer for PDFs.
- **Dashboard**: Admin interface to upload PDFs (max 100MB) and manage library.
- **Auth**: Secure login for administrators.

## Setup & Run

### Prerequisites
- Node.js installed.

### Quick Start
Run the start script to launch both server and client:
```bash
./start_app.sh
```

### Manual Setup
1. **Server**:
   ```bash
   cd server
   npm install
   npx prisma migrate dev --name init
   npm start
   ```
   Server runs on `http://localhost:3000`.

2. **Client**:
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Client runs on `http://localhost:5173`.

## Security Updates (Important)
We have switched to Nginx for serving the frontend to improve security. If you are using Docker, you **MUST** rebuild your containers:

```bash
docker-compose up --build -d --force-recreate
```

## default Credentials
- **Register**: Go to `/login` and click "Initialize New Identity" to create your first admin account.
