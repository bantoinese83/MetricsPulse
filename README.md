# MetricsPulse 🚀

**AI-Powered Niche Analytics Dashboard for SaaS Founders**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/bantoinese83/MetricsPulse)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> MetricsPulse answers: **"What are my 3 numbers TODAY that tell me if my SaaS is healthy?"**

## 📊 Overview

MetricsPulse is a lightweight, specialized analytics dashboard that aggregates and visualizes critical SaaS metrics from Stripe, Google Analytics, and email platforms in a single, clean interface. Built for indie SaaS founders and small B2B teams who need clarity without complexity.

### ✨ Key Features

- **📈 One-Screen Dashboard**: Critical metrics at a glance (MRR, Churn Rate, CAC, LTV, Conversion Rate)
- **🔄 Real-Time Data**: Yesterday vs. Today comparisons with trend indicators
- **🎨 Visual Health Status**: Color-coded metrics (🟢 Green / 🟡 Yellow / 🔴 Red) with configurable thresholds
- **🔗 Multi-Source Integration**: Stripe, Google Analytics 4, and manual inputs
- **⚡ Fast MVP**: Production-ready in 10-14 days
- **💰 Subscription Revenue**: Predictable MRR with tiered pricing

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- Stripe account
- Google Analytics 4 property

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bantoinese83/MetricsPulse.git
   cd metricspulse
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```

   Fill in your environment variables:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_KEY=eyJ...

   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...

   # Google OAuth
   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxx
   ```

4. **Database Setup**
   ```bash
   # Run Prisma migrations
   npx prisma migrate dev --name init
   ```

5. **Development Server**
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` to see your dashboard!

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: shadcn/ui + TailwindCSS
- **Charts**: Recharts
- **State**: TanStack Query + React Hooks
- **Deployment**: Vercel

### Backend
- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage

### External Services
- **Payments**: Stripe API
- **Analytics**: Google Analytics Data API v1
- **Email**: SendGrid API
- **Notifications**: Slack API

## 📊 Dashboard Metrics

### Core Metrics
- **MRR** (Monthly Recurring Revenue)
- **Churn Rate** (customers lost / active customers)
- **CAC** (Customer Acquisition Cost)
- **LTV** (Lifetime Value = MRR / Churn Rate)
- **Trial-to-Paid Conversion Rate**
- **Net Revenue Retention**

### Data Sources
1. **Stripe** - Revenue, churn, customer count
2. **Google Analytics 4** - Traffic, conversion funnel
3. **Manual Input** - CAC, ad spend, email subscribers

## 🗄️ Database Schema

```sql
-- Core tables: users, workspaces, connections, metrics, alerts, subscriptions
-- See micro_saas_spec.md for complete schema
```

## 🛣️ Roadmap

### MVP (Days 1-7)
- [ ] Dashboard homepage with core metrics
- [ ] Stripe integration
- [ ] Authentication & user management
- [ ] Settings page

### Post-Launch (Weeks 2-3)
- [ ] Real-time alerts (Slack integration)
- [ ] Historical data & cohort analysis
- [ ] Team access (2 additional members)

## 💰 Pricing

- **Free**: 14-day trial, 1 data source, daily emails
- **Pro**: $39/month, 3 data sources, Slack alerts, 2 team members
- **Enterprise**: $99/month, unlimited sources, 5 team members, API access

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
npm run start
```

### Manual Deployment
1. Set up production environment variables
2. Deploy to Vercel/Netlify
3. Configure webhooks in Stripe Dashboard
4. Set up monitoring (Sentry)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Development Guidelines

### Code Quality
- Clean, readable code with descriptive naming
- Modular design with clear separation of concerns
- SOLID principles and design patterns
- ESLint + Prettier for consistent formatting

### Testing
- Unit tests with Jest (>80% coverage)
- Integration tests for API endpoints
- E2E tests with Playwright

### Security
- Never hardcode secrets
- Environment variables for all credentials
- Input validation and sanitization
- HTTPS for all external communication

## 📊 Success Metrics

- **Week 1**: 100 signups, 10% trial-to-paid conversion
- **Month 1**: 500 signups, $1K MRR
- **Month 3**: 1,500 signups, $5K MRR, <5% churn
- **Month 6**: $10K MRR, 50+ Pro customers

## 🎯 Competitive Advantages

1. **Laser Focus**: 5 metrics that matter vs. 50 features
2. **Speed**: Metric calculation in <500ms
3. **Design**: Founder-friendly, no enterprise bloat
4. **Price**: $39/mo vs. competitors' $99/mo
5. **Community**: Built with founders, for founders

## 📚 Documentation

- [Micro-SaaS Specification](micro_saas_spec.md) - Complete product spec
- [API Documentation](docs/api.md) - API endpoints reference
- [Deployment Guide](docs/deployment.md) - Production deployment
- [Contributing Guide](CONTRIBUTING.md) - Development setup

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/bantoinese83/MetricsPulse/issues)
- **Discussions**: [GitHub Discussions](https://github.com/bantoinese83/MetricsPulse/discussions)
- **Email**: support@metricspulse.app

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Baremetrics** - Inspiration for the SaaS metrics dashboard concept
- **Cursor AI** - Accelerated development with AI-powered coding assistance
- **Indie Hackers Community** - Validation and feedback on the product concept

---

**Built with ❤️ for SaaS founders, by SaaS founders**

*Ready to launch in 10-14 days with Cursor AI acceleration!* 🚀
