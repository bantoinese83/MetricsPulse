#!/usr/bin/env node

/**
 * MetricsPulse Database Setup Script
 * Run this after setting up your Supabase project and .env.local file
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Setting up MetricsPulse database...\n');

// Check if .env.local exists
if (!fs.existsSync('.env.local')) {
  console.error('❌ .env.local file not found!');
  console.log('Please create .env.local with your Supabase credentials:');
  console.log(`
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
  `);
  process.exit(1);
}

console.log('✅ Found .env.local file');

// Check environment variables
const envContent = fs.readFileSync('.env.local', 'utf8');
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'DATABASE_URL'
];

const missingVars = requiredVars.filter(varName => !envContent.includes(varName));
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

console.log('✅ Environment variables configured');

try {
  console.log('\n📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  console.log('\n🗃️  Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('\n🗄️  Pushing database schema to Supabase...');
  execSync('npx prisma db push', { stdio: 'inherit' });

  console.log('\n🎯 Creating initial migration...');
  execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });

  console.log('\n✅ Database setup complete!');
  console.log('\n🎉 Next steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Visit http://localhost:3000 and try signing up');
  console.log('3. Check your Supabase dashboard to see user data being created');

} catch (error) {
  console.error('\n❌ Setup failed:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Check your Supabase credentials in .env.local');
  console.log('2. Make sure your Supabase project is fully provisioned');
  console.log('3. Try running: npx prisma db push --force-reset (⚠️  destroys existing data)');
  process.exit(1);
}