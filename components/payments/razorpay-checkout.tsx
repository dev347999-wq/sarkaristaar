"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const loadScript = (src: string) => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

interface RazorpayCheckoutButtonProps {
  amount?: number;
  itemName?: string;
  buttonText?: string;
  className?: string;
}

export function RazorpayCheckoutButton({ 
  amount = 499, 
  itemName = "Premium Access",
  buttonText,
  className = "inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 shadow hover:shadow-md disabled:opacity-50"
}: RazorpayCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePayment = async () => {
    if (!user) {
      alert("Please log in to make a payment.");
      return;
    }

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      alert("Razorpay is not configured yet. Missing NEXT_PUBLIC_RAZORPAY_KEY_ID.");
      return;
    }

    setIsLoading(true);

    const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!res) {
      alert("Razorpay SDK failed to load. Are you online?");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Create order on our backend
      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          receipt: `receipt_${Math.random().toString(36).substring(7)}`,
        }),
      });

      const order = await response.json();

      if (order.error) {
        throw new Error(order.error);
      }

      // 2. Initialize Razorpay popup
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use the public key from env
        amount: order.amount,
        currency: order.currency,
        name: "SarkariStaar",
        description: `Payment for ${itemName}`,
        order_id: order.id,
        handler: async function (response: any) {
          console.log("Payment Successful:", response);
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.uid,
                packageId: itemName, // E.g., "SSC CGL Pro (Pre + Mains)" or similar. We should pass the package key.
                amount: order.amount
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              alert(`Payment Successful! Your package has been unlocked.`);
              router.refresh(); // Refresh page to reflect new unlocked status
              // Optionally trigger an event if passed via props, e.g., onPaymentSuccess
            } else {
              alert(`Payment verification failed: ${verifyData.error}`);
            }
          } catch (err) {
            console.error(err);
            alert("Error verifying payment");
          } finally {
            setIsLoading(false);
          }
        },
        prefill: {
          name: user.displayName || "Student",
          email: user.email || "",
          contact: "",
        },
        theme: {
          color: "#0f172a", // Match app primary standard color
        },
      };

      const rzp = new (window as any).Razorpay(options);
      
      rzp.on("payment.failed", function (response: any) {
        console.error("Payment Failed:", response.error);
        alert(`Payment Failed: ${response.error.description}`);
        setIsLoading(false);
      });

      rzp.open();
    } catch (error: any) {
      console.error("Payment integration error:", error);
      alert(`Could not process payment: ${error.message}`);
      setIsLoading(false);
    }
    // Cannot setIsLoading(false) finally here because 'handler' is asynchronous and user might close modal or take time.
    // If the modal opens successfully, we leave it 'Processing...' or active, and wait for handler or failure event to reset it.
  };

  if (!mounted) {
    // Return a dummy button during SSR to match the client markup initially and prevent hydration mismatch
    return (
      <button disabled className={className}>
        {buttonText || `Upgrade for ₹${amount}`}
      </button>
    );
  }

  return (
    <button
        onClick={handlePayment}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? "Processing..." : (buttonText || `Upgrade for ₹${amount}`)}
      </button>
  );
}
