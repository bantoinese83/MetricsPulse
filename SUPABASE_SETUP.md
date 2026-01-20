# Supabase Setup Guide for MetricsPulse

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project" in your dashboard
3. Fill in project details:
   - **Name**: `metricspulse` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
4. Click "Create new project"
5. Wait 2-3 minutes for the project to be fully provisioned

## Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJ...` (starts with `eyJ`)
   - **service_role key**: `eyJ...` (keep this secret!)

## Step 3: Set Up Environment Variables

Create a `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Database URL (for Prisma - get this from Settings → Database)
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
```

## Step 4: Enable Row Level Security (RLS)

In your Supabase dashboard:

1. Go to **Authentication** → **Policies**
2. Enable RLS for all tables (we'll create policies programmatically)

## Step 5: Run Database Migrations

Once you have your `.env.local` file set up:

```bash
# Install dependencies (if not done)
npm install

# Generate Prisma client
npx prisma generate

# Run initial migration
npx prisma migrate dev --name init

# Push schema to Supabase
npx prisma db push
```

## Step 6: Set Up Authentication

In Supabase dashboard:

1. Go to **Authentication** → **Settings**
2. Configure:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback`
3. Enable email confirmations if desired

## Step 7: Test the Setup

```bash
# Start development server
npm run dev

# Visit http://localhost:3000
# Try signing up for an account
# Check that data is saved in Supabase dashboard → Table Editor
```

## Troubleshooting

### Migration Issues
```bash
# Reset database (CAUTION: destroys all data)
npx prisma migrate reset --force

# Or push schema directly
npx prisma db push --force-reset
```

### Environment Variables
- Make sure `.env.local` is in `.gitignore`
- Never commit API keys to version control
- Use different projects for staging/production

### Connection Issues
- Check your database password is correct
- Verify the project URL matches your Supabase project
- Ensure you're using the correct port (5432 for Supabase)

## Next Steps

After Supabase is set up:
1. ✅ Authentication will work
2. ✅ Users can sign up/login
3. ✅ Data will be stored in your database
4. Ready for Stripe integration!

Need help? Check the [Supabase Docs](https://supabase.com/docs) or ask for specific guidance.