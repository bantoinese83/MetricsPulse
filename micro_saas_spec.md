# Micro-SaaS App Spec: "MetricsPulse"
**AI-Powered Niche Analytics Dashboard for SaaS Founders**

---

## Executive Summary

**MetricsPulse** is a lightweight, specialized analytics dashboard that aggregates and visualizes critical SaaS metrics from Stripe, Google Analytics, and email platforms in a single dashboard.

**Why This Idea Works:**
- ✅ **Validated demand:** Baremetrics built $1M+ ARR solving this exact problem
- ✅ **3-5 key metrics vs. 100-feature dashboards** = higher value perception
- ✅ **Simple data models** = fast MVP (10-14 days)
- ✅ **Subscription revenue** = predictable MRR
- ✅ **Low CAC:** Target communities (Indie Hackers, Twitter SaaS founders, HN)
- ✅ **Recurring value:** Users check daily → high retention
- ✅ **Integration-driven:** APIs already exist (Stripe, GA, SendGrid)

**Target Audience:** Indie SaaS founders and small B2B teams ($0–$100K MRR) who need clarity without complexity

**Launch Timeline:** 10-14 days (MVP)

**Revenue Target:** $5K MRR within 3 months

---

## Product Specification

### Core Value Proposition

MetricsPulse answers: **"What are my 3 numbers TODAY that tell me if my SaaS is healthy?"**

### MVP Features (Tier 1: Days 1–7)

#### Dashboard Homepage
- **One-screen snapshot** of critical metrics:
  - **MRR** (Monthly Recurring Revenue from Stripe)
  - **Churn Rate** (customers lost / active customers)
  - **CAC** (Customer Acquisition Cost from spend trackers)
  - **LTV** (Lifetime Value = MRR / Churn Rate)
  - **Trial-to-Paid Conversion Rate** (if applicable)
  - **Net Revenue Retention** (expansion revenue ÷ base revenue)

- **Yesterday vs. Today comparison** with +/- indicators
- **30-day mini-chart** for each metric showing trend
- **Color-coded health status:** 🟢 Green / 🟡 Yellow / 🔴 Red (user-configurable thresholds)

#### Data Connectors (Tier 1)
1. **Stripe** - Revenue, churn, customer count (OAuth integration)
2. **Google Analytics 4** - Traffic, conversion funnel (OAuth integration)
3. **Manual Input** - CAC, ad spend, email subscribers (form-based)

#### Authentication & User Management
- Email/password signup (Supabase Auth handles complexity)
- Free trial: 14 days, unlimited access
- Workspace creation: single workspace per account (expandable later)

#### Settings Page
- API key management (Stripe read-only)
- Metric thresholds (user sets "healthy" ranges)
- Data refresh frequency (manual or auto every 6 hours)
- Export data as CSV

---

### Tier 2 Features (Post-Launch: Weeks 2-3)

#### Real-Time Alerts
- Slack integration: daily digest + critical alerts (churn spike, MRR drop)
- Email notifications for threshold breaches

#### Historical Data & Cohort Analysis
- 12-month historical chart with trend lines
- Cohort retention table (group customers by signup month)
- Export reports as PDF

#### Team Access
- Invite 2 additional team members per account
- Role-based access (view-only vs. edit)

---

## Tech Stack & Architecture

### Frontend
- **Framework:** Next.js 14 (App Router)
  - SSR for SEO-friendly dashboard
  - Server components for auth-gated routes
  - API routes for serverless webhooks

- **UI Library:** shadcn/ui + TailwindCSS
  - Pre-built chart components (Recharts for charts)
  - Button, input, modal, table components ready to use

- **State Management:** React hooks + TanStack Query
  - Real-time data fetching & caching

- **Charts:** Recharts (lightweight, React-native)
  - Line charts, bar charts, status cards

- **Deployment:** Vercel (zero-config, push-to-deploy)

### Backend
- **API Routes:** Next.js API routes (deployed on Vercel)
  - Stripe webhook handler (`/api/webhooks/stripe`)
  - Metric calculation endpoints
  - Third-party integrations (Google Analytics, Stripe)

- **Database:** Supabase (PostgreSQL)
  - Schema: users, workspaces, connections, metrics, alerts
  - Row-level security (RLS) for multi-tenant safety

- **ORM:** Prisma
  - Type-safe database queries
  - Migration management

- **Authentication:** Supabase Auth
  - Handles JWT tokens, OAuth (Google, GitHub)
  - Zero custom auth code

- **File Storage:** Supabase Storage (for CSV/PDF exports)

### External Services
- **Stripe API** - Revenue data via `@stripe/stripe-js`
- **Google Analytics Data API v1** - Traffic & conversion data
- **SendGrid API** (optional) - Email subscriber count
- **Slack API** - Notifications
- **OpenAI API** (optional Tier 2) - AI-generated insights

### Database Schema (Supabase)

```sql
-- Users table (managed by Supabase Auth, reference via auth.uid())
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workspaces (one per user initially)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- OAuth Connections
CREATE TABLE connections (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  provider TEXT ('stripe' | 'google_analytics' | 'manual'),
  access_token TEXT ENCRYPTED,
  refresh_token TEXT ENCRYPTED,
  connected_at TIMESTAMP,
  expires_at TIMESTAMP,
  metadata JSONB -- store provider-specific data (account ID, etc.)
);

-- Metrics table (time-series data)
CREATE TABLE metrics (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  metric_name TEXT ('mrr' | 'churn_rate' | 'cac' | 'ltv' | ...),
  value DECIMAL,
  recorded_at TIMESTAMP,
  UNIQUE(workspace_id, metric_name, DATE(recorded_at))
);

-- Alert thresholds
CREATE TABLE alert_thresholds (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  metric_name TEXT,
  min_value DECIMAL,
  max_value DECIMAL,
  alert_channel TEXT ('email' | 'slack'),
  created_at TIMESTAMP
);

-- Subscription data (for billing)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  stripe_subscription_id TEXT,
  plan TEXT ('free' | 'pro' | 'enterprise'),
  status TEXT ('active' | 'cancelled' | 'past_due'),
  current_period_end TIMESTAMP,
  created_at TIMESTAMP
);
```

---

## Feature Implementation Roadmap

### Days 1–2: Project Setup & Auth
- [ ] Initialize Next.js 14 project with Vercel deployment
- [ ] Set up Supabase project + database schema
- [ ] Integrate Supabase Auth for authentication
- [ ] Create `AuthGuard` middleware for protected routes
- [ ] Build login/signup pages

**Deliverable:** Users can sign up, log in, create workspace

---

### Days 3–4: Database & Data Models
- [ ] Create Prisma schema for connections, metrics, workspaces
- [ ] Set up Supabase RLS policies (users can only see their own data)
- [ ] Build settings API routes:
  - `POST /api/workspace` - create workspace
  - `POST /api/connections/stripe` - save Stripe OAuth token
  - `GET /api/metrics` - fetch user metrics

**Deliverable:** Authentication fully functional, DB relationships working

---

### Days 5–6: Stripe Integration
- [ ] Implement Stripe OAuth flow (`/api/auth/stripe/callback`)
- [ ] Create background job to fetch Stripe data:
  - MRR calculation (sum of active subscriptions)
  - Customer count
  - Churn rate (customers lost in last 30 days)
- [ ] Store metrics in `metrics` table (daily snapshot)
- [ ] Build webhook handler for real-time events:
  - `invoice.paid` → update MRR
  - `customer.subscription.deleted` → update churn

**Deliverable:** Stripe data flowing into DB, metrics calculating daily

---

### Days 7–9: Dashboard UI & Charts
- [ ] Build dashboard layout:
  - Hero section: 5 key metric cards (MRR, Churn, CAC, LTV, Conv. Rate)
  - Mini 30-day sparkline chart for each metric
  - Color-coded status badges
- [ ] Implement metric cards with:
  - Current value
  - Yesterday vs. today change (+5%, -2%)
  - Threshold status (🟢/🟡/🔴)
- [ ] Add Recharts integration for 30-day trend line
- [ ] Build settings panel for threshold configuration

**Deliverable:** Working dashboard displaying Stripe metrics in real-time

---

### Days 10–11: Google Analytics Integration + Manual Metrics
- [ ] Implement Google Analytics OAuth flow
- [ ] Fetch GA4 data (traffic, conversion rate, sessions)
- [ ] Store GA metrics in `metrics` table
- [ ] Build manual metric form for CAC, ad spend, subscriber count
- [ ] Add CSV export for metrics

**Deliverable:** Multi-source dashboard (Stripe + GA + manual inputs)

---

### Days 12–13: Stripe Payment & Subscription Tiers
- [ ] Set up Stripe Billing Portal
- [ ] Create pricing page:
  - **Free:** 14-day trial, 1 data source (Stripe), daily emails
  - **Pro:** $39/month, 3 data sources, Slack alerts, team access (2 users)
  - **Enterprise:** $99/month, unlimited sources, 5 team members, API access
- [ ] Implement subscription logic:
  - `POST /api/checkout` - create Stripe Checkout session
  - Webhook handler for `customer.subscription.updated`
  - Gating features behind plan tier
- [ ] Add payment status page showing subscription info

**Deliverable:** Paid plans functional, Stripe Checkout working

---

### Day 14: Deployment & Testing
- [ ] Deploy to Vercel (auto-deploys from `main` branch)
- [ ] Test entire flow:
  - Signup → Stripe OAuth → Dashboard → Paid plan conversion
- [ ] Set up monitoring (Sentry for error tracking)
- [ ] Create landing page with call-to-action
- [ ] Deploy to production ✅

**Deliverable:** Live product at `metricspulse.app`

---

## Deployment Instructions (Cursor AI Optimized)

### Environment Variables (`.env.local`)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ... # Only in .env.local, never public

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Vercel (auto-detected)
```

### Steps:
1. **Create accounts:**
   - Vercel.com → connect GitHub repo
   - Supabase.com → create project
   - Stripe.com → create account → setup OAuth app

2. **Deploy:**
   ```bash
   git clone <your-repo>
   cd metricspulse
   npm install
   vercel env pull # pulls production env vars
   npm run dev
   ```

3. **Database migrations:**
   ```bash
   npx prisma migrate dev --name init
   # Pushes schema to Supabase
   ```

4. **Deploy to production:**
   ```bash
   git push origin main # Vercel auto-deploys
   ```

---

## API Endpoints (Cursor AI Quick Reference)

### Auth
- `POST /api/auth/supabase/callback` - Supabase auth callback
- `GET /api/auth/user` - Get current user

### Workspace & Connections
- `POST /api/workspace` - Create workspace
- `POST /api/connections/stripe` - Save Stripe OAuth token
- `GET /api/connections` - List connected sources

### Metrics
- `GET /api/metrics?metric=mrr&days=30` - Fetch metric data
- `POST /api/metrics/calculate` - Force recalculation (admin)

### Webhooks
- `POST /api/webhooks/stripe` - Stripe events (subscription updates, invoices)
- `POST /api/webhooks/google-analytics` - GA data sync (optional)

### Billing
- `POST /api/checkout` - Create Stripe Checkout session
- `POST /api/webhooks/billing` - Stripe billing events
- `GET /api/subscription` - Get current subscription status

### Alerts
- `POST /api/alerts/configure` - Set alert thresholds
- `POST /api/alerts/slack` - Enable Slack integration

---

## Go-to-Market Strategy

### Phase 1: Build in Public (Days 1–14)
- Share progress on Twitter daily (#buildinpublic)
- Post on Indie Hackers (launch day)
- Submit to ProductHunt (week 1)

### Phase 2: Community Targeting (Week 2–3)
- **Indie Hackers forum:** "We built the dashboard we wanted for our SaaS" + demo
- **HN Show HN:** Minimal, demo-heavy post
- **Twitter SaaS community:** Threaded walkthrough of key metrics
- **Reddit r/SaaS:** Case study of how we built it in 2 weeks with Cursor

### Phase 3: Direct Outreach (Week 4)
- Email 50 SaaS founders on Indie Hackers (offer free Pro access for feedback)
- Slack groups for founders: Indie Worldwide, SaaS Bros, etc.
- Sponsorship: ConvertKit newsletter to SaaS builders ($300–500)

### Pricing & Acquisition Targets
- **Free tier conversion:** 5–10% of signups (focus on quality over volume)
- **Pro tier target:** $39/month (100 customers = $3.9K MRR by month 3)
- **Churn target:** <5% monthly (retention focus)

---

## Competitive Advantages

1. **Laser focus:** 5 metrics that matter vs. 50 features
2. **Speed:** Metric calculation in <500ms (cached, lightweight)
3. **Design:** Founder-friendly, no enterprise bloat
4. **Integrations:** Starts with Stripe + GA, expandable
5. **Price:** $39/mo vs. Baremetrics $99/mo (undercut by 60%)
6. **Community:** Built with founders, for founders

---

## Risk Mitigation

 Risk | Mitigation
------|-----------
 **Stripe API rate limits** | Cache metrics for 6 hours, batch requests |
 **User data privacy** | Supabase RLS + encryption for OAuth tokens |
 **Payment failure** | Stripe webhook retries, fallback email alerts |
 **Cold start problem (no users)** | Launch on ProductHunt + Indie Hackers day 1 |
 **Churn (retention)** | Daily email digest keeps product top-of-mind |
 **Feature bloat** | Ruthless no: only ship if 3+ users request it |

---

## Success Metrics

- **Week 1:** 100 signups, 10% trial-to-paid conversion
- **Month 1:** 500 signups, $1K MRR
- **Month 3:** 1,500 signups, $5K MRR, <5% churn
- **Month 6:** $10K MRR, 50+ Pro customers, expansion revenue from team access

---

## Cursor AI Acceleration Tips

1. **Use `@codebase` in Cursor** to ask questions about your entire project structure
2. **Leverage Cursor's "Edit" mode** to refactor Stripe webhook logic across multiple files
3. **Use `cmd+k` to autocomplete** Prisma queries, API routes, React components
4. **Ask Cursor:** "Generate Prisma schema for SaaS metrics tracking" → copy-paste, refine
5. **Prompt for boilerplate:** "Create a Next.js API route with Stripe webhook validation"
6. **Test generation:** "Write Jest tests for the MRR calculation function"

---

## Next Steps

1. **Clone boilerplate:** https://github.com/pixegami/task-app (use as reference for Next.js + Supabase structure)
2. **Set up GitHub repo** with this spec as README
3. **Create Vercel project** linked to GitHub (auto-deploy on push)
4. **Day 1:** Initialize Next.js + Supabase Auth + Supabase, deploy empty dashboard
5. **Day 5:** Get first Stripe data flowing
6. **Day 14:** Launch 🚀

---

## References & Inspiration

- **Baremetrics** (https://baremetrics.com) - $1M+ ARR SaaS metrics dashboard
- **Taxfix** - Built and exited for €100M+ by focusing on niche problem
- **Hypefury** - Hit $4.4K MRR in 4 months via hyper-focused product
- **Reddit post:** "Shipped 8 SaaS products in 2 years" (proven 10-14 day tech stack)

---

**Status:** Ready to build with Cursor AI ✅

**Estimated build time:** 10–14 days (1 developer)

**Estimated cost:** ~$200/month (Vercel $20, Supabase $25, Stripe 2.9%+$0.30 per transaction, Clerk free tier, OpenAI optional)

**Estimated first-year revenue potential:** $60K–$150K MRR at scale

---

**Questions? → Ask Cursor AI to elaborate on any section or scaffold code for specific features.**