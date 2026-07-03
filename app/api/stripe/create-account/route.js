import { getStripe } from '@/lib/stripe'

export async function POST(request) {
  try {
    const { shopId, returnUrl } = await request.json()
    const stripe = await getStripe()
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data: shop } = await supabase
      .from('shops')
      .select('stripe_account_id, business_name')
      .eq('id', shopId)
      .single()

    let accountId = shop?.stripe_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        business_type: 'individual',
        business_profile: { name: shop?.business_name || 'Detailing Shop' },
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      })
      accountId = account.id
      await supabase.from('shops').update({ stripe_account_id: accountId }).eq('id', shopId)
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${returnUrl}?stripe=refresh`,
      return_url: `${returnUrl}?stripe=success`,
      type: 'account_onboarding',
    })

    return Response.json({ url: accountLink.url })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
