# Hotel Ordering System - PostgreSQL Edition

## 🚀 Quick Start
A comprehensive hotel ordering system built with React, TypeScript, Express.js, and PostgreSQL.
### 1. Database Setup
```bash
npm run setup:db
```
### 2. Install Dependencies
```bash
npm install
cd server && npm install && cd ..
```
### 3. Environment Configuration
```bash
cp .env.example .env
# Update .env with your PostgreSQL credentials
```
### 4. Start Application
```bash
npm run dev:full
```
## 📊 Sample Login Credentials
- **server@hotel.com** (Server role) - Password: `password123`
- **kitchen@hotel.com** (Kitchen role) - Password: `password123`
- **admin@hotel.com** (Admin role) - Password: `password123`
## 🗄️ Database Features
- PostgreSQL with 7 core tables
- Role-based authentication
- Complete menu management
- Table session workflow
- Kitchen order management
- Payment integration
## 🛠️ Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Payment**: Stripe integration