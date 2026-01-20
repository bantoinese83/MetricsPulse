-- MetricsPulse Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Supabase Auth, reference via auth.uid())
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspaces (one per user initially)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth Connections
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT CHECK (provider IN ('stripe', 'google_analytics', 'manual')),
  access_token TEXT,
  refresh_token TEXT,
  connected_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

-- Metrics table (time-series data)
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  metric_name TEXT CHECK (metric_name IN ('mrr', 'churn_rate', 'cac', 'ltv', 'conversion_rate', 'net_revenue_retention')),
  value DECIMAL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint for workspace + metric + date
CREATE UNIQUE INDEX metrics_workspace_metric_date_idx
ON metrics (workspace_id, metric_name, DATE(recorded_at));

-- Alert thresholds
CREATE TABLE alert_thresholds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  metric_name TEXT,
  min_value DECIMAL,
  max_value DECIMAL,
  alert_channel TEXT CHECK (alert_channel IN ('email', 'slack')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription data (for billing)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  plan TEXT CHECK (plan IN ('free', 'pro', 'enterprise')),
  status TEXT CHECK (status IN ('active', 'cancelled', 'past_due')),
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own user data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own user data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Workspace policies
CREATE POLICY "Users can view own workspaces" ON workspaces
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own workspaces" ON workspaces
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own workspaces" ON workspaces
  FOR UPDATE USING (user_id = auth.uid());

-- Connection policies (through workspace ownership)
CREATE POLICY "Users can view connections for own workspaces" ON connections
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage connections for own workspaces" ON connections
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  );

-- Metric policies
CREATE POLICY "Users can view metrics for own workspaces" ON metrics
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage metrics for own workspaces" ON metrics
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  );

-- Alert threshold policies
CREATE POLICY "Users can view alert thresholds for own workspaces" ON alert_thresholds
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage alert thresholds for own workspaces" ON alert_thresholds
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE user_id = auth.uid()
    )
  );

-- Subscription policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own subscriptions" ON subscriptions
  FOR ALL USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX idx_connections_workspace_id ON connections(workspace_id);
CREATE INDEX idx_metrics_workspace_id ON metrics(workspace_id);
CREATE INDEX idx_metrics_recorded_at ON metrics(recorded_at DESC);
CREATE INDEX idx_alert_thresholds_workspace_id ON alert_thresholds(workspace_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- Insert a sample workspace trigger function
CREATE OR REPLACE FUNCTION create_workspace_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspaces (user_id, name)
  VALUES (NEW.id, 'My Workspace');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create workspace for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_workspace_for_new_user();