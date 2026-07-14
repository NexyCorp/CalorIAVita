import { createClient } from '@supabase/supabase-js';

const PLAN_IDS = {
  pro: 'pro',
  professional_basic: 'professional_basic',
  professional_gold: 'professional_gold'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });

    // Verify User JWT Token with Supabase
    const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response('Unauthorized User', { status: 401, headers: CORS_HEADERS });

    const { tier } = await request.json();
    const planId = PLAN_IDS[tier];
    if (!planId) return new Response('Invalid plan tier', { status: 400, headers: CORS_HEADERS });

    // Mercado Pago Preapproval Subscription body
    const mpPayload = {
      preapproval_plan_id: env[`MP_PLAN_${tier.toUpperCase()}`] || planId,
      payer_email: user.email,
      back_url: `${env.APP_URL || 'https://caloria-vita.pages.dev'}/#subscription`,
      reason: `Assinatura CalorIA ${tier}`,
      external_reference: user.id,
      status: 'pending',
      payment_methods_allowed: {
        payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'ticket' }, // Boleto
          { id: 'bank_transfer' } // Pix
        ]
      }
    };

    // Call Mercado Pago to create subscription preapproval
    const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mpPayload)
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      return new Response(JSON.stringify({ error: mpData.message }), { status: 500, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ checkoutUrl: mpData.init_point }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS_HEADERS });
  }
}
