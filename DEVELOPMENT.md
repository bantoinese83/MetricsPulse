# MetricsPulse Development Guide

Welcome to the MetricsPulse development environment! This guide will help you get started and maintain high code quality.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (for database)
- Stripe account (for payments)

### Installation

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd metricspulse
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Set up database**
   ```bash
   npm run setup-db
   ```

4. **Start development**
   ```bash
   npm run dev
   ```

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **Styling**: TailwindCSS, shadcn/ui components
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL) + Prisma ORM
- **State**: TanStack Query + React hooks
- **Charts**: Recharts
- **Auth**: Supabase Auth

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── dashboard/         # Dashboard pages
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   └── dashboard/        # Dashboard-specific components
├── lib/                  # Core utilities and configurations
│   ├── types.ts          # TypeScript type definitions
│   ├── errors.ts         # Error handling utilities
│   ├── api.ts            # API client utilities
│   ├── hooks.ts          # Custom React hooks
│   ├── auth.tsx          # Authentication context
│   └── config.ts         # Environment configuration
└── prisma/               # Database schema and migrations
```

## 🛠️ Development Workflow

### Code Quality

#### Linting & Formatting
```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Type checking
npm run type-check
```

#### Pre-commit Hooks
We recommend using Husky for pre-commit hooks:
```bash
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run type-check"
```

### Database Management

#### Local Development
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Create migration
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

#### Production Deployment
```bash
# Create migration for production
npx prisma migrate dev --create-only

# Apply migrations
npx prisma migrate deploy
```

### Environment Management

#### Required Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Database
DATABASE_URL=your_database_url

# Stripe (for payment features)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CLIENT_ID=ca_test_...

# Optional
GOOGLE_CLIENT_ID=your_google_client_id
OPENAI_API_KEY=your_openai_key
```

#### Environment Validation
The app validates configuration on startup:
```typescript
import { validateConfig } from '@/lib/config'

const { valid, errors } = validateConfig()
if (!valid) {
  console.error('Configuration errors:', errors)
}
```

## 🎯 Best Practices

### TypeScript
- Use strict type checking
- Define interfaces for all data structures
- Use utility types for common patterns
- Avoid `any` types

### React
- Use functional components with hooks
- Implement proper error boundaries
- Use React Query for server state
- Memoize expensive calculations

### API Design
- Use consistent response formats
- Implement proper error handling
- Validate inputs on both client and server
- Use meaningful HTTP status codes

### Database
- Use Prisma for type-safe queries
- Implement proper indexing
- Use transactions for complex operations
- Enable Row Level Security (RLS)

### Performance
- Implement proper loading states
- Use React.memo for expensive components
- Optimize images and assets
- Implement caching strategies

## 🧪 Testing

### Unit Tests (Future)
```bash
# Install testing framework
npm install -D jest @testing-library/react @testing-library/jest-dom

# Run tests
npm test
```

### E2E Tests (Future)
```bash
# Install Playwright
npm install -D @playwright/test

# Run E2E tests
npx playwright test
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment
```bash
# Build for production
npm run build

# Start production server
npm run start
```

## 🔧 Troubleshooting

### Common Issues

#### Build Errors
```bash
# Clear cache and rebuild
npm run clean
npm install
npm run build
```

#### Database Connection Issues
```bash
# Check environment variables
echo $DATABASE_URL

# Test connection
npx prisma db push --preview-feature
```

#### Type Errors
```bash
# Check types
npm run type-check

# Regenerate Prisma client
npm run db:generate
```

### Performance Monitoring
- Use React DevTools for component performance
- Monitor bundle size with `npm run analyze`
- Check Lighthouse scores
- Use browser DevTools for network analysis

## 📚 Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Stripe Docs](https://stripe.com/docs)

### Tools
- [React Query DevTools](https://tanstack.com/query/v4/docs/devtools)
- [Prisma Studio](https://www.prisma.io/studio)
- [Supabase Dashboard](https://supabase.com/dashboard)

### Community
- [Next.js Discord](https://nextjs.org/discord)
- [Supabase Discord](https://supabase.com/docs/guides/getting-started)
- [Prisma Slack](https://slack.prisma.io/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

### Commit Convention
```
feat: add new feature
fix: bug fix
docs: documentation
style: formatting
refactor: code restructuring
test: add tests
chore: maintenance
```

## 📈 Performance Goals

- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Bundle Size**: < 200KB (gzipped)
- **Lighthouse Score**: > 90

## 🔒 Security

- Environment variables never in code
- Row Level Security enabled
- Input validation on all endpoints
- HTTPS only in production
- Regular dependency updates

---

Happy coding! 🎉