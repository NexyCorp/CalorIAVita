import { createClient } from '@supabase/supabase-js';

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

    const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response('Unauthorized User', { status: 401, headers: CORS_HEADERS });

    const { subscriptionId } = await request.json();
    if (!subscriptionId) return new Response('Missing Subscription ID', { status: 400, headers: CORS_HEADERS });

    // Cancel Mercado Pago preapproval subscription
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'cancelled' })
    });

    if (!mpRes.ok) {
      const errData = await mpRes.json();
      return new Response(JSON.stringify({ error: errData.message }), { status: 500, headers: CORS_HEADERS });
    }

    // Downgrade locally in Supabase
    const dbSupabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    await dbSupabase
      .from('profiles')
      .update({
        plan: 'free',
        role: 'standard',
        subscription_status: 'cancelled',
        subscription_next_charge: null
      })
      .eq('id', user.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS_HEADERS });
  }
}
