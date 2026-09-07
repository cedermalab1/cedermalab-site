// netlify/functions/create-checkout-session.js
//
// Creates a Stripe Checkout Session that charges $1 today, starts a 7-day
// trial, then automatically bills the customer's chosen plan ($14/mo or
// $120/yr) once the trial ends.
//
// Call this from your pricing page instead of using a static Payment Link:
//   fetch('/.netlify/functions/create-checkout-session', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ plan: 'monthly' }) // or 'yearly'
//   })
//     .then(res => res.json())
//     .then(({ url }) => { window.location.href = url; });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Recurring subscription prices (created under "CEdermalab Pro Subscription")
const PLAN_PRICE_IDS = {
  monthly: 'price_1UD4uYPqFSGJZlJCQ7a7Qj08', // $14/month
  yearly: 'price_1UD4uYPqFSGJZlJCb8M0sEr2',  // $120/year
};

// One-time $1 price charged today for the trial.
// NOTE: create a fresh ONE-TIME (not recurring) $1 price in Stripe and
// paste its ID here — the old "Trial" price was archived.
const TRIAL_ONE_TIME_PRICE_ID = 'price_1UD4WXPqFSGJZlJCmGIXl6LT';

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
      success_url: `${process.env.URL}/trial-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/pricing`,
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
