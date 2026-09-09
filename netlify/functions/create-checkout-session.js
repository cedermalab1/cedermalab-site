// netlify/functions/create-checkout-session.js
//
// *** LIVE MODE VERSION ***
// Uses live-mode price IDs and expects STRIPE_SECRET_KEY to be set to your
// sk_live_... key in Netlify's environment variables.
//
// Call this from your pricing/onboarding page instead of using a static
// Payment Link:
//   fetch('/.netlify/functions/create-checkout-session', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ plan: 'monthly' }) // or 'yearly'
//   })
//     .then(res => res.json())
//     .then(({ url }) => { window.location.href = url; });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Recurring subscription prices (LIVE MODE — "CEdermalab Pro Subscription")
const PLAN_PRICE_IDS = {
  monthly: 'price_1UD4uYPqFSGJZlJCQ7a7Qj08', // $14/month
  yearly: 'price_1UD4uYPqFSGJZlJCb8M0sEr2',  // $120/year
};

// One-time $1 price charged today for the trial (LIVE MODE).
const TRIAL_ONE_TIME_PRICE_ID = 'price_1UDsx1PqFSGJZlJCt1atOxjh';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let plan;
  try {
    ({ plan } = JSON.parse(event.body || '{}'));
  } catch (err) {
    return { statusCode: 400, body: 'Invalid JSON body' };
  }

  const subscriptionPriceId = PLAN_PRICE_IDS[plan];
  if (!subscriptionPriceId) {
    return {
      statusCode: 400,
      body: `Invalid plan "${plan}". Expected "monthly" or "yearly".`,
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        // The one-time $1 due today
        { price: TRIAL_ONE_TIME_PRICE_ID, quantity: 1 },
        // The recurring plan that starts billing after the trial ends
        { price: subscriptionPriceId, quantity: 1 },
      ],
      subscription_data: {
        trial_period_days: 7,
        trial_settings: {
          end_behavior: { missing_payment_method: 'cancel' },
        },
      },
      // Force card capture even though the subscription line item is
      // technically "free" during the trial — without this, Stripe may
      // let customers through without a card on file, and day-8 billing
      // would fail.
      payment_method_collection: 'always',
      success_url: `${process.env.URL}/app.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/onboarding.html`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('Stripe Checkout Session creation failed:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

