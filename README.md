# GoPredict

Market predictions and trading strategies platform for traders and brokers.

## Overview

GoPredict is a self-hosted SaaS application that provides:
- Daily market predictions
- Intraday forecasts
- Trading strategies (Tradebook)
- User management for brokers/administrators

## Tech Stack

### Frontend
- React 18 with Vite
- Tailwind CSS
- AG Grid Enterprise
- Axios for API calls

### Backend
- Node.js with Express
- PostgreSQL database
- Magic Link authentication
- Winston logging

## Prerequisites

- Node.js v18 or later
- PostgreSQL v15 or later
- Ubuntu 24.10 or latest stable Linux

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/your-org/gopredict.git
cd gopredict
```

### 2. Install dependencies
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Database Setup
```bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE gopredict;

# Exit psql
\q

# Run migrations
cd server
npm run migrate
```

### 4. Environment Configuration

Copy the example environment files and update with your settings:

```bash
# Server environment
cp server/.env.example server/.env

# Client environment
cp client/.env.example client/.env
```

Update the following in `server/.env`:
- Database credentials
- SMTP settings for magic links
- CloudFront/API URLs
- Session secrets

### 5. Start Development Servers

```bash
# Terminal 1 - Start backend
cd server
npm run dev

# Terminal 2 - Start frontend
cd client
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Production Deployment

### Build Frontend
```bash
cd client
npm run build
```

### Start Production Server
```bash
cd server
npm run start
```

### Configure Nginx (recommended)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/gopredict/client/dist;
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run all tests with coverage
npm run test:coverage
```

## Project Structure

```
gopredict/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API and business logic
│   │   ├── hooks/         # Custom React hooks
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
├── server/                # Node.js backend
│   ├── routes/           # API routes
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Express middleware
│   ├── db/              # Database connection and migrations
│   ├── services/        # Business logic
│   └── utils/           # Utility functions
└── tests/               # Test suites
    ├── unit/
    ├── integration/
    └── e2e/
```

## Features

### Authentication
- Magic Link email authentication
- Single active session per user
- Session management and timeout

### Data Polling
- Automatic polling at 15-minute intervals (:01, :16, :31, :46)
- Intelligent retry logic (up to 3 attempts)
- Real-time notifications for alerts

### User Management (Admin)
- Add users individually or bulk import via CSV/Excel
- Edit, suspend, and delete users
- Role-based access control

### Data Grid
- AG Grid Enterprise with custom dark theme
- Real-time data updates
- Sortable and filterable columns

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact your system administrator.
