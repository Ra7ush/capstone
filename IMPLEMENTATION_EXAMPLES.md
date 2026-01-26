# Nexus Project - Implementation Examples & Code Snippets

This document provides ready-to-use code examples for the most critical improvements.

---

## 1️⃣ Testing Framework Setup

### Backend Testing (Jest)

**File: `backend/jest.config.js`**
```javascript
export default {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/**',
    '!src/server.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

**File: `backend/package.json` (update scripts)**
```json
{
  "scripts": {
    "start": "nodemon src/server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

**File: `backend/src/__tests__/validators.test.js`**
```javascript
import { validate, validateRequest } from '../validators/schemas.js';
import { loginSchema, updateUserSchema } from '../validators/schemas.js';

describe('Validators', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const data = {
        email: 'test@example.com',
        password: 'password123'
      };
      const result = validate(loginSchema, data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const data = {
        email: 'invalid-email',
        password: 'password123'
      };
      const result = validate(loginSchema, data);
      expect(result.success).toBe(false);
      expect(result.error.details[0].message).toContain('Invalid email');
    });

    it('should reject missing password', () => {
      const data = {
        email: 'test@example.com'
      };
      const result = validate(loginSchema, data);
      expect(result.success).toBe(false);
    });
  });

  describe('updateUserSchema', () => {
    it('should validate correct user update', () => {
      const data = {
        status: 'active',
        verification_status: 'verified'
      };
      const result = validate(updateUserSchema, data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const data = {
        status: 'invalid_status'
      };
      const result = validate(updateUserSchema, data);
      expect(result.success).toBe(false);
    });
  });
});
```

**File: `backend/src/__tests__/admin.controller.test.js`**
```javascript
import { verifyAdmin, getDashboardStats } from '../controllers/admin.controller.js';
import supabase from '../config/db.js';

jest.mock('../config/db.js');

describe('Admin Controller', () => {
  describe('verifyAdmin', () => {
    it('should verify admin successfully', async () => {
      const req = {
        user: {
          id: 'test-id',
          email: 'admin@example.com',
          role: 'admin'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await verifyAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Admin verified successfully',
        user: expect.objectContaining({
          id: 'test-id',
          email: 'admin@example.com'
        })
      });
    });
  });

  describe('getDashboardStats', () => {
    it('should fetch dashboard stats', async () => {
      const mockData = {
        total_users: 100,
        total_creators: 50,
        total_revenue: 5000
      };

      supabase.rpc.mockResolvedValue({
        data: mockData,
        error: null
      });

      const req = {
        validatedQuery: { range: '1Y' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getDashboardStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockData
      });
    });

    it('should handle errors', async () => {
      const mockError = new Error('Database error');

      supabase.rpc.mockResolvedValue({
        data: null,
        error: mockError
      });

      const req = {
        validatedQuery: { range: '1Y' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await getDashboardStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String)
      });
    });
  });
});
```

### Admin Testing (Vitest)

**File: `admin/vitest.config.js`**
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

**File: `admin/src/__tests__/setup.js`**
```javascript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.VITE_ADMIN_EMAIL = 'admin@example.com';
```

**File: `admin/package.json` (update scripts)**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### Mobile Testing (React Native)

**File: `mobile/jest.config.js`**
```javascript
export default {
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts'
  ]
};
```

**File: `mobile/jest.setup.js`**
```javascript
import '@testing-library/jest-native/extend-expect';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn()
    }
  }))
}));
```

---

## 2️⃣ CI/CD Pipeline Setup

**File: `.github/workflows/ci.yml`**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 'backend/package-lock.json'
      
      - name: Install dependencies
        run: cd backend && npm ci
      
      - name: Run linter
        run: cd backend && npm run lint
      
      - name: Run tests
        run: cd backend && npm test -- --coverage
        env:
          NODE_ENV: test
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/coverage-final.json
          flags: backend

  test-admin:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 'admin/package-lock.json'
      
      - name: Install dependencies
        run: cd admin && npm ci
      
      - name: Run linter
        run: cd admin && npm run lint
      
      - name: Run tests
        run: cd admin && npm test -- --coverage
      
      - name: Build
        run: cd admin && npm run build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./admin/coverage/coverage-final.json
          flags: admin

  test-mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 'mobile/package-lock.json'
      
      - name: Install dependencies
        run: cd mobile && npm ci
      
      - name: Run linter
        run: cd mobile && npm run lint
      
      - name: Run tests
        run: cd mobile && npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./mobile/coverage/coverage-final.json
          flags: mobile

  deploy:
    needs: [test-backend, test-admin, test-mobile]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # Add your deployment script here
```

---

## 3️⃣ Structured Logging Setup

**File: `backend/src/config/logger.js`**
```javascript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ENV } from './env.js';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports = [
  // Console transport
  new winston.transports.Console(),
  
  // Error log file
  new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error'
  }),
  
  // Combined log file
  new DailyRotateFile({
    filename: 'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d'
  })
];

export const logger = winston.createLogger({
  level: ENV.LOG_LEVEL || 'info',
  levels,
  format,
  transports
});

// Request logging middleware
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(
      `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
  });
  
  next();
}
```

**File: `backend/src/server.js` (update)**
```javascript
import { logger, requestLogger } from './config/logger.js';

// Add request logging
app.use(requestLogger);

// Replace console.log with logger
app.listen(ENV.PORT, '0.0.0.0', () => {
  logger.info(`Server running at http://0.0.0.0:${ENV.PORT}`);
  logger.info(`Environment: ${ENV.NODE_ENV || 'development'}`);
});
```

---

## 4️⃣ Global Error Handler

**File: `backend/src/middlewares/errorHandler.js`**
```javascript
import { logger } from '../config/logger.js';
import { ENV } from '../config/env.js';

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log error
  logger.error({
    statusCode: err.statusCode,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Send response
  res.status(err.statusCode).json({
    success: false,
    error: err.message,
    ...(ENV.NODE_ENV === 'development' && { stack: err.stack })
  });
}

// Async error wrapper
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

**File: `backend/src/server.js` (update)**
```javascript
import { errorHandler, asyncHandler } from './middlewares/errorHandler.js';

// ... existing routes ...

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);
```

**File: `backend/src/controllers/admin.controller.js` (update example)**
```javascript
export const getDashboardStats = asyncHandler(async (req, res) => {
  const query = req.validatedQuery || req.query;
  const { range } = query;

  const { data, error } = await supabase.rpc('get_dashboard_stats', {
    time_range: range || '1Y'
  });

  if (error) throw error;

  res.status(200).json({
    success: true,
    data: data
  });
});
```

---

## 5️⃣ API Documentation (Swagger)

**File: `backend/src/config/swagger.js`**
```javascript
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nexus Creator Platform API',
      version: '1.0.0',
      description: 'API documentation for Nexus platform',
      contact: {
        name: 'API Support',
        email: 'support@nexus.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.nexus.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

export const specs = swaggerJsdoc(options);

export function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
}
```

**File: `backend/src/routes/admin.route.js` (update with JSDoc)**
```javascript
/**
 * @swagger
 * /api/admin/verify:
 *   get:
 *     summary: Verify admin access
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/verify', adminAuth, verifyAdmin);

/**
 * @swagger
 * /api/admin/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [1W, 1M, 3M, 6M, 1Y, ALL]
 *         description: Time range for statistics
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.get(
  '/dashboard/stats',
  adminAuth,
  validateRequest({ query: dashboardQuerySchema }),
  getDashboardStats
);
```

**File: `backend/src/server.js` (update)**
```javascript
import { setupSwagger } from './config/swagger.js';

// Setup Swagger
setupSwagger(app);

// Swagger will be available at http://localhost:3000/api-docs
```

---

## 6️⃣ Error Boundaries (Mobile)

**File: `mobile/components/ErrorBoundary.tsx`**
```typescript
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { logger } from '@/lib/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Error caught by boundary:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-base-100 justify-center items-center p-4">
          <ScrollView className="w-full">
            <Text className="text-2xl font-bold text-error mb-4">
              Oops! Something went wrong
            </Text>
            <Text className="text-base-content mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </Text>
            <View className="bg-base-200 p-4 rounded-lg mb-4">
              <Text className="text-xs font-mono text-base-content">
                {this.state.error?.stack}
              </Text>
            </View>
            <TouchableOpacity
              onPress={this.resetError}
              className="bg-primary p-3 rounded-lg"
            >
              <Text className="text-primary-content text-center font-bold">
                Try Again
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}
```

**File: `mobile/app/_layout.tsx` (update)**
```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{...}}
      >
        {/* ... rest of layout ... */}
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}
```

---

## 7️⃣ Error Boundaries (Admin)

**File: `admin/src/components/ErrorBoundary.jsx`**
```jsx
import React from 'react';
import { AlertCircle } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
    // Send to error tracking service
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
          <div className="bg-base-200 rounded-lg p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-error" />
              <h1 className="text-2xl font-bold text-error">Error</h1>
            </div>
            <p className="text-base-content mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <pre className="bg-base-300 p-3 rounded text-xs overflow-auto mb-4">
              {this.state.error?.stack}
            </pre>
            <button
              onClick={this.resetError}
              className="btn btn-primary w-full"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**File: `admin/src/App.jsx` (update)**
```jsx
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* ... routes ... */}
      </Routes>
    </ErrorBoundary>
  );
}
```

---

## 8️⃣ Pre-commit Hooks Setup

**File: `package.json` (root)**
```json
{
  "scripts": {
    "prepare": "husky install"
  }
}
```

**File: `.husky/pre-commit`**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

**File: `.lintstagedrc.json`**
```json
{
  "backend/**/*.js": [
    "eslint --fix",
    "prettier --write"
  ],
  "admin/**/*.{jsx,js}": [
    "eslint --fix",
    "prettier --write"
  ],
  "mobile/**/*.{tsx,ts}": [
    "eslint --fix",
    "prettier --write"
  ]
}
```

**File: `.prettierrc`**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

---

## 9️⃣ Monitoring with Sentry

**File: `backend/src/config/sentry.js`**
```javascript
import * as Sentry from "@sentry/node";
import { ENV } from "./env.js";

export function initSentry(app) {
  Sentry.init({
    dsn: ENV.SENTRY_DSN,
    environment: ENV.NODE_ENV,
    tracesSampleRate: ENV.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection()
    ]
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

export function setupSentryErrorHandler(app) {
  app.use(Sentry.Handlers.errorHandler());
}
```

**File: `backend/src/server.js` (update)**
```javascript
import { initSentry, setupSentryErrorHandler } from './config/sentry.js';

// Initialize Sentry early
initSentry(app);

// ... middleware and routes ...

// Setup Sentry error handler before other error handlers
setupSentryErrorHandler(app);
app.use(errorHandler);
```

---

## 🔟 Environment Variables Template

**File: `backend/.env.example`**
```env
# Server
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin
ADMIN_EMAIL=admin@example.com

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Sentry
SENTRY_DSN=https://your-sentry-dsn

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

## 📋 Implementation Checklist

```
TESTING
- [ ] Install Jest (backend)
- [ ] Install Vitest (admin)
- [ ] Install React Native Testing Library (mobile)
- [ ] Write unit tests for validators
- [ ] Write unit tests for controllers
- [ ] Write integration tests for API
- [ ] Achieve 70%+ coverage
- [ ] Add test scripts to package.json

CI/CD
- [ ] Create .github/workflows directory
- [ ] Create ci.yml workflow
- [ ] Set up GitHub secrets
- [ ] Test workflow locally
- [ ] Add branch protection rules

LOGGING
- [ ] Install Winston
- [ ] Create logger configuration
- [ ] Replace console.log with logger
- [ ] Add request logging middleware
- [ ] Create logs directory
- [ ] Add log rotation

ERROR HANDLING
- [ ] Create error handler middleware
- [ ] Create custom error classes
- [ ] Add error handler to server
- [ ] Create error boundaries (mobile/admin)
- [ ] Test error scenarios

API DOCUMENTATION
- [ ] Install Swagger dependencies
- [ ] Create Swagger configuration
- [ ] Add JSDoc comments to routes
- [ ] Document all endpoints
- [ ] Test Swagger UI

MONITORING
- [ ] Create Sentry account
- [ ] Install Sentry SDK
- [ ] Configure Sentry
- [ ] Add error tracking
- [ ] Set up alerts

PRE-COMMIT HOOKS
- [ ] Install Husky
- [ ] Create pre-commit hook
- [ ] Add Prettier configuration
- [ ] Add lint-staged configuration
- [ ] Test pre-commit hooks
```

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Ready to Implement:** Yes ✅
