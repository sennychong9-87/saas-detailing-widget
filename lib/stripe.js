export async function getStripe() {
  const { default: Stripe } = await import('stripe')
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}
