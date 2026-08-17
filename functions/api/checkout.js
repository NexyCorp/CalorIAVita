import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Plan definitions — all config is inline, no preapproval_plan_id needed
// prices: standard pro 30.00 BRL, professional basic 100.00 BRL, professional gold 197.00 BRL
const PLANS = {
  pro: {
    reason: 'NutrIA Standard Pro – Assinatura Mensal',
    amount: 30.00,
    role: 'standard',
    plan: 'pro'
  },
  professional_basic: {
    reason: 'NutrIA Professional Basic – Assinatura Mensal',
    amount: 100.00,
    role: 'professional',
    plan: 'pro'
  },
  professional_gold: {
    reason: 'NutrIA Professional Gold – Assinatura Mensal',
    amount: 197.00,
    role: 'professional',
    plan: 'gold'
  }
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
    }

    // Verify user identity via Supabase JWT
    const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response('Unauthorized User', { status: 401, headers: CORS_HEADERS });
    }

    const { tier } = await request.json();
    const planConfig = PLANS[tier];
    if (!planConfig) {
      return new Response(
        JSON.stringify({ error: `Plano inválido: "${tier}". Opções: pro, professional_basic, professional_gold` }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const appUrl = env.APP_URL || 'https://caloriav3.pages.dev';

    // Build the preapproval payload directly — no preapproval_plan_id required
    const mpPayload = {
      reason: planConfig.reason,
      external_reference: user.id,        // Used by webhook to identify the user
      payer_email: user.email, 
      back_url: `${appUrl}/#subscription`,
      status: 'pending',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: planConfig.amount,
        currency_id: 'BRL'
      },
      // Enable all available payment methods
      payment_methods_allowed: {
        payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'ticket' },        // Boleto bancário
          { id: 'bank_transfer' }  // Pix / transferência
        ]
      }
    };

    // Create the subscription preapproval in Mercado Pago
    const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${user.id}-${tier}-${Date.now()}`
      },
      body: JSON.stringify(mpPayload)
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error('[checkout] Mercado Pago error:', JSON.stringify(mpData));
      return new Response(
        JSON.stringify({ error: mpData.message || 'Erro ao criar assinatura no Mercado Pago' }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // Return the checkout URL for the browser to redirect to
    return new Response(
      JSON.stringify({
        checkoutUrl: mpData.init_point,   // production URL
        sandboxUrl: mpData.sandbox_init_point  // sandbox URL (for testing)
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );

  } catch (err) {
    console.error('[checkout] Unexpected error:', err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
