# 🚀 AI SaaS Platform - Complete Setup Guide

## ✅ System Requirements

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Git**: 2.30 or higher
- **RAM**: 4GB minimum
- **Disk**: 2GB free space

---

## 📦 Installation Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/ibrsaiaika/ai-saas-platform.git
cd ai-saas-platform
```

### Step 2: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your settings
# For development, you can use the defaults provided
```

### Step 4: Start Development Servers

#### Terminal 1 - Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
🚀 AI SaaS Platform Server running on port 3001
✅ Test users initialized successfully
```

#### Terminal 2 - Frontend Server

```bash
cd frontend
npm run dev
```

You should see:
```
✓ Ready in 2.4s
- Local:        http://localhost:3000
- Network:      http://192.168.1.x:3000
```

---

## 🌐 Access the Application

### URLs

| Component | URL | Purpose |
|-----------|-----|---------|
| Frontend | http://localhost:3000 | Main application UI |
| Backend | http://localhost:3001 | REST API |
| Health Check | http://localhost:3001/health | API status |

### Demo Credentials

| Account | Email | Password |
|---------|-------|----------|
| Free Plan | test@example.com | Test123!@# |
| Pro Plan | pro@example.com | Test123!@# |
| Admin | admin@example.com | Test123!@# |

---

## 🔧 Development Workflow

### Building for Production

```bash
# Frontend build
cd frontend
npm run build

# Backend build
cd backend
npm run build
```

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Code Formatting

```bash
# Format code with Prettier
npm run format

# Lint code
npm run lint
```

---

## 🐳 Docker Setup

### Using Docker Compose (Development)

```bash
docker-compose up
```

### Using Docker Compose (Production)

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔑 Environment Variables

### Required for Development

```env
# Database
DATABASE_URL=file:./dev.db

# JWT
JWT_SECRET=your_secret_key_here

# Redis
REDIS_URL=redis://localhost:6379

# Frontend URL
FRONTEND_URL=http://localhost:3000

# API Keys (Optional for testing)
OPENAI_API_KEY=your_key_here
```

### For Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full production configuration.

---

## 🛠 Troubleshooting

### Issue: Port 3000 or 3001 already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev
```

### Issue: Module not found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: CORS errors

The backend is configured to allow local development. If you get CORS errors:

1. Check that backend is running on port 3001
2. Check that frontend is running on port 3000
3. Verify `FRONTEND_URL` in `.env.local`

### Issue: Database errors

```bash
# Reset database
rm backend/dev.db
```

---

## 📚 Project Structure

```
ai-saas-platform/
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router
│   │   ├── components/       # React Components
│   │   ├── contexts/         # Context API
│   │   └── lib/              # Utilities
│   ├── public/               # Static assets
│   ├── package.json
│   └── tsconfig.json
│
├── backend/
│   ├── src/
│   │   ├── server.ts         # Express app entry
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Express middleware
│   │   └── controllers/      # Route handlers
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                    # Shared types
├── docker-compose.yml
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🎯 Features Overview

### Authentication & Authorization
- JWT-based authentication
- Demo accounts for testing
- Role-based access control
- Secure password hashing

### AI Integration
- Multiple AI provider support
- Real-time API integration
- Cost tracking
- Provider fallback mechanism

### User Dashboard
- Usage analytics
- Cost breakdown
- Real-time metrics
- Theme switching

### Admin Panel
- User management
- System monitoring
- Configuration management
- Audit logging

---

## 📖 Next Steps

1. **Explore the UI**: Browse through different sections
2. **Try features**: Test AI chat, workflows, analytics
3. **Read documentation**: Check [DEPLOYMENT.md](./DEPLOYMENT.md)
4. **Customize**: Modify components and features
5. **Deploy**: Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for production

---

## 🆘 Getting Help

- **Issues**: Check GitHub Issues and Discussions
- **Documentation**: See [DEPLOYMENT.md](./DEPLOYMENT.md) and [SECURITY.md](./SECURITY.md)
- **Contributing**: See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## ✨ Tips for Development

1. **Use VS Code**: Recommended editor with TypeScript support
2. **Enable ESLint**: For code quality
3. **Use Redux DevTools**: For state management debugging
4. **Enable Dark Mode**: Test UI in both light and dark themes
5. **Test Mobile**: Use browser dev tools to test responsive design

---

**Happy coding! 🚀**
