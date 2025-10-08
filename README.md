# Hotel Ordering System

A comprehensive hotel ordering system built with React, TypeScript, Express.js, and Azure SQL Database.

## ✨ Features

- **Role-Based Access Control**: Admin, Server, and Kitchen roles with specific permissions
- **Menu Management**: Full CRUD operations for menu items and companies
- **Table Session Management**: Track orders by table with real-time status updates
- **Part Order System**: Split orders within a session for better kitchen workflow
- **Kitchen Dashboard**: Real-time order queue management
- **Payment Integration**: Stripe integration for online payments
- **Cloud-Native**: Built for Azure with SQL Database

## 🚀 Quick Start (Development)

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Azure SQL Database (or SQL Server for local development)

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 2. Set Up Database

**For Azure SQL Database:**

1. Create an Azure SQL Database
2. Run the schema script: `database/azure-sql-schema.sql`
3. Run the data script: `database/azure-sql-data.sql`

**For Local SQL Server:**

1. Install SQL Server Express or Developer Edition
2. Create a database named `hotel_ordering_system`
3. Run the schema and data scripts

### 3. Environment Configuration

```bash
cp .env.example .env
```

Update the `.env` file with your database credentials:

```env
# Azure SQL Database Configuration
DB_SERVER=your-server.database.windows.net
DB_NAME=hotel_ordering_system
DB_USER=your_db_admin_user
DB_PASSWORD=your_db_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# API Configuration
VITE_API_URL=http://localhost:3001/api
```

### 4. Start Application

```bash
# Start both frontend and backend
npm run dev:full
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 📊 Sample Login Credentials

- **admin@hotel.com** (Admin role) - Password: `password123`
- **server@hotel.com** (Server role) - Password: `password123`
- **kitchen@hotel.com** (Kitchen role) - Password: `password123`

## 🗄️ Database Schema

The Azure SQL Database includes the following tables:

1. **users** - User accounts with roles
2. **companies** - Restaurant/food service providers
3. **menu_items** - Menu items with categories, prices, and images
4. **orders** - Customer orders
5. **order_items** - Line items for orders
6. **table_sessions** - Table occupancy tracking
7. **part_orders** - Sub-orders within a table session
8. **part_order_items** - Line items for part orders

All tables include:
- Soft delete support (where applicable)
- Automatic timestamps with triggers
- Performance indexes
- Foreign key constraints

## 🛠️ Tech Stack

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Vite
- React Router
- Lucide React (icons)
- React Hot Toast (notifications)

### Backend
- Node.js
- Express.js
- mssql (Azure SQL Driver)
- JWT authentication
- bcryptjs (password hashing)

### Database
- Azure SQL Database / SQL Server
- T-SQL stored procedures and triggers
- Connection pooling

### Payment
- Stripe integration (optional)

## 📁 Project Structure

```
hotel-ordering-system/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and API clients
│   └── main.tsx            # Application entry point
├── server/                 # Backend Express application
│   ├── config/             # Configuration files
│   ├── models/             # Data models
│   ├── routes/             # API routes
│   ├── middleware/         # Express middleware
│   └── app.js              # Server entry point
├── database/               # SQL scripts
│   ├── azure-sql-schema.sql   # Database schema
│   └── azure-sql-data.sql     # Sample data
├── public/                 # Static assets
└── dist/                   # Production build output
```

## 🚀 Azure Deployment

For detailed instructions on deploying to Azure with Windows OS, see [AZURE-DEPLOYMENT.md](./AZURE-DEPLOYMENT.md).

Quick overview:
1. Backend deploys to **Azure App Service (Windows)**
2. Frontend deploys to **Azure Static Web Apps**
3. Database hosted on **Azure SQL Database**

## 🔧 Development Scripts

```bash
# Start frontend only
npm run dev

# Start backend only
npm run dev:server

# Start both frontend and backend
npm run dev:full

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## 🔒 Security Features

- **Database-level access control**: SQL Server roles and permissions
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **CORS Configuration**: Controlled cross-origin requests
- **Helmet.js**: HTTP security headers
- **Input Validation**: Server-side validation
- **SQL Injection Protection**: Parameterized queries

## 📝 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - User login

### Menu
- `GET /api/menu` - Get all menu items
- `POST /api/menu` - Create menu item (admin)
- `PUT /api/menu/:id` - Update menu item (admin)
- `DELETE /api/menu/:id` - Delete menu item (admin)

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `PATCH /api/orders/:id/status` - Update order status
- `PATCH /api/orders/:id/payment` - Update payment status

### Table Sessions
- `GET /api/table-sessions` - Get all table sessions
- `POST /api/table-sessions` - Create table session
- `PATCH /api/table-sessions/:id/status` - Update session status
- `GET /api/table-sessions/table/:number/active` - Get active session

### Part Orders
- `GET /api/part-orders` - Get all part orders
- `POST /api/table-sessions/:id/part-orders` - Create part order
- `PATCH /api/part-orders/:id/status` - Update part order status
- `GET /api/part-orders/kitchen/queue` - Get kitchen queue

### Companies
- `GET /api/companies` - Get all companies
- `POST /api/companies` - Create company (admin)
- `PUT /api/companies/:id` - Update company (admin)
- `DELETE /api/companies/:id` - Delete company (admin)

## 🧪 Testing

The sample data includes:
- 3 users (admin, server, kitchen)
- 3 companies (Hotel Restaurant, Room Service, Pool Bar)
- 15 menu items across all categories
- All items have stock images from Pexels

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for your own purposes.

## 🆘 Support

For issues or questions:
1. Check [AZURE-DEPLOYMENT.md](./AZURE-DEPLOYMENT.md) for deployment help
2. Review Azure SQL Database documentation
3. Open an issue on GitHub

## 🎯 Roadmap

- [ ] Real-time order updates with SignalR
- [ ] Mobile app with React Native
- [ ] Advanced reporting and analytics
- [ ] Multi-language support
- [ ] QR code table ordering
- [ ] Inventory management
- [ ] Staff scheduling

## 🙏 Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- Database powered by [Azure SQL Database](https://azure.microsoft.com/services/sql-database/)
- UI components styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide](https://lucide.dev/)
- Stock photos from [Pexels](https://www.pexels.com/)
