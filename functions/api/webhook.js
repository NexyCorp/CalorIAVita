import { createClient } from '@supabase/supabase-js';

// Maps the subscription amount to plan + role in Supabase
// Must match the amounts defined in checkout.js PLANS config
function resolvePlanFromAmount(amount) {
  if (amount >= 197) return { plan: 'gold', role: 'professional' };
  if (amount >= 100) return { plan: 'pro', role: 'professional' };
  if (amount >= 30)  return { plan: 'pro', role: 'standard' };
  return { plan: 'free', role: 'standard' };
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    // Mercado Pago sends both 'subscription_preapproval' and payment events
    const isSubscriptionEvent =
      body.type === 'subscription_preapproval' ||
      (body.action && ['created', 'updated'].includes(body.action) && body.data?.id);

    if (!isSubscriptionEvent) {
      return new Response('Ignored non-subscription event', { status: 200 });
    }

    const preapprovalId = body.data?.id || body.id;
    if (!preapprovalId) {
      return new Response('No preapproval ID in payload', { status: 200 });
    }

    // Fetch latest subscription state from Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` }
    });

    if (!mpRes.ok) {
      const errText = await mpRes.text();
      console.error('[webhook] Failed to fetch preapproval:', errText);
      return new Response('MP fetch failed', { status: 200 }); // 200 so MP doesn't retry
    }

    const subscription = await mpRes.json();
    const userId = subscription.external_reference;

    if (!userId) {
      console.error('[webhook] Missing external_reference in subscription', subscription.id);
      return new Response('Missing user reference', { status: 200 });
    }

    const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const status = subscription.status; // 'authorized' | 'active' | 'paused' | 'cancelled' | 'pending'

    if (status === 'authorized' || status === 'active') {
      // Resolve which plan to grant based on the subscription amount
      const amount = subscription.auto_recurring?.transaction_amount || 0;
      const { plan, role } = resolvePlanFromAmount(amount);

      const { error } = await supabase
        .from('profiles')
        .update({
          plan,
          role,
          subscription_id: preapprovalId,
          subscription_status: 'active',
          subscription_next_charge: subscription.next_payment_date || null
        })
        .eq('id', userId);

      if (error) {
        console.error('[webhook] Supabase update error (activate):', error.message);
      } else {
        console.log(`[webhook] Activated plan=${plan} role=${role} for user ${userId}`);
      }

    } else if (status === 'cancelled' || status === 'paused') {
      const { error } = await supabase
        .from('profiles')
        .update({
          plan: 'free',
          role: 'standard',
          subscription_status: status,
          subscription_next_charge: null
        })
        .eq('id', userId);

      if (error) {
        console.error('[webhook] Supabase update error (deactivate):', error.message);
      } else {
        console.log(`[webhook] Deactivated subscription for user ${userId} — status: ${status}`);
      }
    } else {
      // 'pending' or other transient state: log but don't change anything
      console.log(`[webhook] Subscription ${preapprovalId} in transient state: ${status}`);
    }

    return new Response('OK', { status: 200 });

  } catch (err) {
    // Always return 200 to prevent Mercado Pago from retrying indefinitely
    console.error('[webhook] Uncaught error:', err.message);
    return new Response('Internal Error (logged)', { status: 200 });
  }
}
