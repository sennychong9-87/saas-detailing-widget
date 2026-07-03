import { getStripe } from '@/lib/stripe'

export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event
  try {
    const stripe = await getStripe()
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  if (event.type === 'account.updated') {
    const account = event.data.object
    await supabase
      .from('shops')
      .update({ stripe_onboarding_complete: account.charges_enabled })
      .eq('stripe_account_id', account.id)
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object
    await supabase
      .from('quotes')
      .update({ payment_status: 'paid', status: 'confirmed' })
      .eq('booking_id', pi.metadata.booking_id)
  }

  return Response.json({ received: true })
}
