import { useRouter } from "expo-router";
import { useEffect } from "react";

// Retired: all payment features (estimates, hourly adjustments, confirm & pay,
// post-payment review) now live on Customer Home, and payment history/receipts
// live under Completed Jobs. This stub just redirects anyone who still has
// this route bookmarked or deep-linked. Safe to delete this file entirely
// once you've confirmed nothing external links here.
export default function CustomerPaymentsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/customer-home");
  }, []);

  return null;
}
