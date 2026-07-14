import { createClient } from '@supabase/supabase-js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    
    // Check webhook action type from Mercado Pago
    if (body.type === 'subscription_preapproval' || body.action === 'created' || body.action === 'updated') {
      const preapprovalId = body.data?.id || body.id;
      if (!preapprovalId) return new Response('No ID found', { status: 200 });

      // Fetch latest subscription status from Mercado Pago
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
        headers: { 'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}` }
      });
      const subscription = await mpRes.json();

      if (subscription.status === 'authorized' || subscription.status === 'active') {
        const userId = subscription.external_reference;
        const reason = subscription.reason || '';

        // Determine plan and role mappings
        let plan = 'free';
        let role = 'standard';

        if (reason.includes('pro')) {
          plan = 'pro';
          role = 'standard';
        } else if (reason.includes('professional_basic')) {
          plan = 'pro';
          role = 'professional';
        } else if (reason.includes('professional_gold')) {
          plan = 'gold';
          role = 'professional';
        }

        // Initialize Supabase with service role key to bypass RLS policies safely
        const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        
        // Update user profile
        const { error } = await supabase
          .from('profiles')
          .update({
            plan,
            role,
            subscription_id: preapprovalId,
            subscription_status: 'active',
            subscription_next_charge: subscription.next_payment_date
          })
          .eq('id', userId);

        if (error) throw error;
      } else if (subscription.status === 'cancelled' || subscription.status === 'paused') {
        const userId = subscription.external_reference;
        const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        
        await supabase
          .from('profiles')
          .update({
            plan: 'free',
            role: 'standard',
            subscription_status: subscription.status
          })
          .eq('id', userId);
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook processing error:', err.message);
    return new Response('Webhook Error', { status: 500 });
  }
}
