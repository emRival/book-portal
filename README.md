# IDN Book - Digital Flipbook Library

A professional digital library application with PDF flipbook capabilities, authentic "blueprint" aesthetics, and a clean 3D book interface. Built for IDN Boarding School Pamijahan.

## 🚀 Features

### Core Capabilities
-   **Public Grid**: 3D Book display of all released magazines and textbooks.
-   **High-Performance Reader**: Smooth page-turning experience using `react-pageflip` and `react-pdf`.
-   **PDF Compression**: Automatically compresses large PDFs (>20MB) using Ghostscript to optimize storage and loading times.
-   **Background Processing**: Handles large file uploads asynchronously to prevent timeouts.

### Administration & Security
-   **Dashboard**: Admin interface to upload PDFs (max 100MB), manage library, and view analytics.
-   **User Identification**: Secure login system with role-based access control (RBAC).
-   **Turnstile CAPTCHA**: Cloudflare Turnstile integration on Login/Register pages to prevent bot attacks.
-   **Nginx Security**: Serving frontend via Nginx with custom security headers and strict file access policies.

## 🛠️ Technology Stack
-   **Backend**: Node.js, Express, SQLite (Prisma ORM), Ghostscript.
-   **Frontend**: React, Vite, Tailwind CSS.
-   **Infrastructure**: Docker, Docker Compose, Nginx.

---

## ⚙️ Installation & Setup

### Prerequisites
-   [Docker](https://www.docker.com/) and Docker Compose installed.
-   [Node.js](https://nodejs.org/) (only if running manually without Docker).
-   **Cloudflare Turnstile Keys**: Obtain a Site Key and Secret Key from [Cloudflare Dashboard](https://dash.cloudflare.com/).

### 1. Environment Configuration

#### Server (`server/.env`)
Create a `.env` file in the `server` directory:
```bash
# Database
DATABASE_URL="file:./dev.db" 

# Authentication
SECRET_KEY="your-super-secret-key-change-this"

# Cloudflare Turnstile (Required for Login/Register)
CLOUDFLARE_SECRET_KEY="your-turnstile-secret-key"
```

#### Client (`client/.env`)
Create a `.env` file in the `client` directory:
```bash
# API Base URL
# Leave EMPTY when using Docker (Nginx proxies /api internally)
# Only set this if running 'npm run dev' manually outside Docker
VITE_API_BASE_URL=""

# Cloudflare Turnstile
VITE_CLOUDFLARE_SITE_KEY="your-turnstile-site-key"
```

---

## 🐳 Running with Docker (Recommended)

This is the preferred method for production and consistent development environments.

1.  **Build and Start Containers**:
    ```bash
    docker-compose up --build -d
    ```

2.  **Access the Application**:
    -   **Frontend**: `http://localhost:5173` (or your domain)
    -   **Backend**: `http://localhost:3055` (internal only, proxied via Nginx)

3.  **Create Admin Account**:
    -   Go to `/login`.
    -   Click **"Initialize New Identity"**.
    -   Register your first account (automatically becomes ADMIN).
    -   *Note: Registration can be disabled later in the Admin Dashboard.*

---

## 🔧 Manual Development Setup

If you need to run the app without Docker:

### Server
```bash
cd server
npm install
npx prisma db push  # Initialize SQLite DB
npm run dev
```
*Server runs on port 3055.*

### Client
1.  Update `client/.env` to point to the local server:
    ```bash
    VITE_API_BASE_URL="http://localhost:3055"
    ```
2.  Install and Run:
    ```bash
    cd client
    npm install
    npm run dev
    ```
*Client runs on port 5173.*

---

## ⚠️ Troubleshooting

**1. Uploads failing with "Network Error" or Timeout?**
-   The Nginx configuration allows up to **100MB** uploads.
-   Large files (>20MB) enter a **Processing** state. They will appear in the dashboard but won't be readable until compression finishes.

**2. Turnstile CAPTCHA Error?**
-   Ensure you have set `CLOUDFLARE_SECRET_KEY` in `server/.env` and `VITE_CLOUDFLARE_SITE_KEY` in `client/.env`.
-   Restart containers after changing `.env` files: `docker-compose up -d --force-recreate`.

**3. "File system permission" errors?**
-   Ensure the `server/uploads` directory exists and is writable. Docker handles this automatically via volumes.
