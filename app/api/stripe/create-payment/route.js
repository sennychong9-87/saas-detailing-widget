import { getStripe } from '@/lib/stripe'

export async function POST(request) {
  try {
    const { amount, shopId, bookingId } = await request.json()
    const stripe = await getStripe()
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data: shop } = await supabase
      .from('shops')
      .select('stripe_account_id')
      .eq('id', shopId)
      .single()

    if (!shop?.stripe_account_id) {
      return Response.json({ error: 'Shop has no Stripe account connected' }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: { booking_id: bookingId, shop_id: shopId },
      transfer_data: { destination: shop.stripe_account_id },
      application_fee_amount: 0,
    })

    await supabase
      .from('quotes')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('booking_id', bookingId)

    return Response.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
