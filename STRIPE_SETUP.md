# Stripe Connect Setup Guide for MetricsPulse

## Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete account verification and add banking details
3. Enable test mode for development

## Step 2: Set Up Stripe Connect

1. In your Stripe dashboard, go to **Connect** → **Settings**
2. Click **"Create application"**
3. Fill in application details:
   - **Application name**: `MetricsPulse`
   - **Website**: `http://localhost:3000` (for development)
   - **Redirect URIs**: `http://localhost:3000/api/connections/stripe/callback`

4. Under **Integration**:
   - Select **OAuth** as the integration type
   - Choose **Express** account type
   - Enable these capabilities:
     - ✅ Payments
     - ✅ Subscriptions
     - ✅ Customers

## Step 3: Get Your API Keys

### From Stripe Dashboard:

1. **Publishable key**: Dashboard → Developers → API keys
   - Copy the **Publishable key** (starts with `pk_test_`)

2. **Secret key**: Same location
   - Copy the **Secret key** (starts with `sk_test_`)

3. **Client ID**: Dashboard → Connect → Settings
   - Copy the **Client ID** (starts with `ca_test_`)

### Webhook Secret:

1. Dashboard → Developers → Webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL**: `http://localhost:3000/api/webhooks/stripe`
4. **Events to listen for**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Copy the **Signing secret** (starts with `whsec_`)

## Step 4: Update Environment Variables

Update your `.env.local` file:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_CLIENT_ID=ca_test_your_client_id_here
```

## Step 5: Test the Integration

1. Start your development server: `npm run dev`
2. Sign up for an account
3. Go to dashboard and click "Connect Stripe"
4. Complete OAuth flow
5. Click "Calculate Metrics" to fetch your Stripe data

## Important Notes

### For Production:
- Replace all `*_test_*` keys with live keys
- Update redirect URIs to your production domain
- Add your production webhook endpoint
- Enable live mode in Stripe dashboard

### Security:
- Never commit API keys to version control
- Use environment variables for all secrets
- Regularly rotate API keys
- Monitor webhook logs in Stripe dashboard

### Troubleshooting:

**"Invalid client_id" error:**
- Make sure you're using the correct client ID from Connect settings
- Ensure the redirect URI matches exactly

**Webhook not firing:**
- Check that the webhook endpoint is publicly accessible (ngrok for local dev)
- Verify the webhook secret matches
- Check Stripe webhook logs

**OAuth redirect issues:**
- Ensure the redirect URI in Stripe matches your callback route
- Check that your domain is allowed in Stripe settings

## Next Steps

After Stripe is connected:
1. ✅ Real-time revenue tracking
2. ✅ Automatic MRR calculation
3. ✅ Churn rate monitoring
4. ✅ Customer lifetime value computation
5. Ready for Google Analytics integration!

Need help? Check the [Stripe Connect Docs](https://stripe.com/docs/connect) or ask for specific guidance.