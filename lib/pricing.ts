// lib/pricing.ts
// Single source of truth for the customer-facing service fee.
// Update SERVICE_FEE_RATE here and every screen that computes a service
// fee picks it up automatically — nothing else should hardcode this number.
//
// Note: this only drives what the app DISPLAYS to the customer today.
// The server-side confirm_and_pay() function doesn't currently know about
// the fee at all — it only computes the worker's payout. Once real payments
// land, the total charge amount (task price + fee) needs to be computed
// server-side too, using this same rate, so a client can't alter what
// they're charged. Keep that in mind when you build create-payment-intent.

export const SERVICE_FEE_RATE = 0.12;

export function calculateServiceFee(price: number): number {
  return Math.ceil(price * SERVICE_FEE_RATE);
}

export function calculateTotalDue(price: number): number {
  return price + calculateServiceFee(price);
}
