# Military Asset Management System

A comprehensive system for managing military assets, including tracking, transfers, and assignments across multiple bases.

## Features

- Asset Tracking (Opening/Closing Balances, Net Movements)
- Purchase Management
- Transfer Management
- Assignment & Expenditure Tracking
- Role-Based Access Control (RBAC)
- Interactive Dashboard
- Secure API Endpoints

## Tech Stack

- Frontend: React.js
- Backend: Node.js with Express.js
- Database: MongoDB
- Authentication: JWT

## Project Structure

```
military-asset-management/
├── client/                 # React frontend
├── server/                 # Node.js backend
├── .gitignore
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd server
   npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd client
   npm install
   ```

### Running the Application

1. Start the backend server:
   ```bash
   cd server
   npm run dev
   ```

2. Start the frontend development server:
   ```bash
   cd client
   npm start
   ```

## Environment Variables

Create a `.env` file in the server directory with the following variables:

```
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
```

## API Documentation

API documentation will be available at `/api-docs` when running the server.

## License

MIT 