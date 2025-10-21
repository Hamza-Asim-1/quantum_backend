# 🚀 Crypto Investment Platform

A comprehensive cryptocurrency investment platform supporting TRC20 and BEP20 USDT deposits with automated blockchain transaction scanning.

## ✨ Features

### 🔗 Multi-Chain Support
- **TRC20 (TRON)**: USDT deposits on TRON network
- **BEP20 (BSC)**: USDT deposits on Binance Smart Chain
- Automated blockchain transaction scanning
- Real-time balance updates

### 👤 User Management
- User registration and authentication
- KYC (Know Your Customer) verification system
- Profile management
- Transaction history

### 💰 Investment System
- Multiple investment levels
- Automated profit calculations
- Investment tracking
- Withdrawal management

### 🛡️ Security Features
- JWT-based authentication
- Password hashing
- Input validation
- SQL injection protection
- CORS configuration

### 📊 Admin Dashboard
- User management
- Deposit monitoring
- KYC approval system
- Transaction oversight
- System analytics

## 🏗️ Architecture

### Backend (Node.js + TypeScript)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Blockchain**: TronGrid API, BSCScan API
- **Cron Jobs**: Automated transaction scanning

### Frontend (React + TypeScript)
- **Framework**: React 18
- **Build Tool**: Vite
- **UI Library**: Tailwind CSS + shadcn/ui
- **State Management**: React Context
- **Routing**: React Router

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Git

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd crypto-investment-platform
```

2. **Backend Setup**
```bash
cd b
npm install
```

3. **Frontend Setup**
```bash
cd f
npm install
```

4. **Environment Configuration**
```bash
# Backend (.env)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=production
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
PLATFORM_TRC20_ADDRESS=your_tron_address
PLATFORM_BEP20_ADDRESS=your_bsc_address
TRONGRID_API_KEY=your_trongrid_key
BSCSCAN_API_KEY=your_bscscan_key
```

5. **Database Setup**
```bash
cd b
npm run migrate
```

6. **Start Development**
```bash
# Backend
cd b
npm run dev

# Frontend (new terminal)
cd f
npm run dev
```

## 📁 Project Structure

```
├── b/                          # Backend
│   ├── src/
│   │   ├── controllers/        # API controllers
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── database/          # Database migrations
│   │   └── middleware/        # Auth middleware
│   └── package.json
├── f/                          # Frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   └── contexts/         # React contexts
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout

### Deposits
- `POST /api/v1/deposits` - Submit deposit
- `GET /api/v1/deposits` - Get user deposits
- `GET /api/v1/deposits/:id` - Get deposit details

### Investments
- `POST /api/v1/investments` - Create investment
- `GET /api/v1/investments` - Get user investments
- `GET /api/v1/investments/levels` - Get investment levels

### Admin
- `GET /api/v1/admin/deposits` - Admin deposit management
- `GET /api/v1/admin/users` - User management
- `POST /api/v1/admin/deposits/:id/confirm` - Confirm deposit

## 🛠️ Development

### Database Migrations
```bash
cd b
npm run migrate
```

### Running Tests
```bash
# Backend tests
cd b
npm test

# Frontend tests
cd f
npm test
```

### Building for Production
```bash
# Backend
cd b
npm run build

# Frontend
cd f
npm run build
```

## 🔐 Security Considerations

- All API endpoints are protected with JWT authentication
- Passwords are hashed using bcrypt
- Input validation on all user inputs
- SQL injection protection with parameterized queries
- CORS configured for specific origins

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions, please open an issue in the repository.

---

**Built with ❤️ using Node.js, React, and PostgreSQL**
