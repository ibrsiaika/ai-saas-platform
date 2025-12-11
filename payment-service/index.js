const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3002',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Middleware
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  basic: {
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
    name: 'Basic Plan',
    price: 29,
    features: [
      '10,000 AI requests/month',
      'Basic chat support',
      'Standard analytics',
      'Email support'
    ],
    limits: {
      aiRequests: 10000,
      vectorStorage: 1000,
      chatRooms: 5
    }
  },
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    name: 'Pro Plan',
    price: 99,
    features: [
      '100,000 AI requests/month',
      'Priority chat support',
      'Advanced analytics',
      'API access',
      'Custom integrations'
    ],
    limits: {
      aiRequests: 100000,
      vectorStorage: 10000,
      chatRooms: 50
    }
  },
  enterprise: {
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    name: 'Enterprise Plan',
    price: 299,
    features: [
      'Unlimited AI requests',
      '24/7 dedicated support',
      'Custom analytics',
      'Full API access',
      'White-label options',
      'Custom AI models'
    ],
    limits: {
      aiRequests: -1, // unlimited
      vectorStorage: -1,
      chatRooms: -1
    }
  }
};

// Routes

// Get subscription plans
app.get('/api/plans', (req, res) => {
  res.json(SUBSCRIPTION_PLANS);
});

// Create checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { planId, userId, userEmail } = req.body;

    if (!SUBSCRIPTION_PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const plan = SUBSCRIPTION_PLANS[planId];
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?canceled=true`,
      customer_email: userEmail,
      metadata: {
        userId: userId,
        planId: planId
      },
      subscription_data: {
        metadata: {
          userId: userId,
          planId: planId
        }
      }
    });

    res.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create customer portal session
app.post('/api/create-portal-session', async (req, res) => {
  try {
    const { customerId } = req.body;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard/billing`,
    });

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Get subscription status
app.get('/api/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // In a real app, you'd fetch from your database
    // For now, we'll simulate the response
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
    });

    const userSubscription = subscriptions.data.find(sub => 
      sub.metadata.userId === userId
    );

    if (!userSubscription) {
      return res.json({ 
        status: 'inactive',
        plan: null,
        currentPeriodEnd: null
      });
    }

    const planId = userSubscription.metadata.planId;
    const plan = SUBSCRIPTION_PLANS[planId];

    res.json({
      status: userSubscription.status,
      plan: plan,
      currentPeriodEnd: new Date(userSubscription.current_period_end * 1000),
      customerId: userSubscription.customer,
      subscriptionId: userSubscription.id
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Usage tracking
app.post('/api/usage/track', async (req, res) => {
  try {
    const { userId, type, amount = 1 } = req.body;

    // In a real app, you'd update usage in your database
    // For now, we'll simulate tracking
    console.log(`Tracking usage: User ${userId}, Type: ${type}, Amount: ${amount}`);

    res.json({ success: true, message: 'Usage tracked successfully' });
  } catch (error) {
    console.error('Error tracking usage:', error);
    res.status(500).json({ error: 'Failed to track usage' });
  }
});

// Get usage statistics
app.get('/api/usage/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // In a real app, you'd fetch from your database
    // For now, we'll simulate usage data
    const currentMonth = new Date().getMonth();
    const usage = {
      aiRequests: {
        used: Math.floor(Math.random() * 5000),
        limit: 10000,
        resetDate: new Date(new Date().getFullYear(), currentMonth + 1, 1)
      },
      vectorStorage: {
        used: Math.floor(Math.random() * 500),
        limit: 1000,
        resetDate: null // Storage doesn't reset monthly
      },
      chatRooms: {
        used: Math.floor(Math.random() * 3),
        limit: 5,
        resetDate: null
      }
    };

    res.json(usage);
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

// Stripe webhook handler
app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Payment successful:', session);
      // Update user subscription status in database
      break;
    
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      console.log('Invoice paid:', invoice);
      // Handle successful recurring payment
      break;
    
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      console.log('Payment failed:', failedInvoice);
      // Handle failed payment
      break;
    
    case 'customer.subscription.deleted':
      const deletedSub = event.data.object;
      console.log('Subscription canceled:', deletedSub);
      // Handle subscription cancellation
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Payment Service', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Payment service error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  console.log(`💳 Payment service running on port ${PORT}`);
  console.log(`🔗 Stripe webhook endpoint: http://localhost:${PORT}/webhook`);
});