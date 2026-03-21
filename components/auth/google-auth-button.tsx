"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import {
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  getRedirectResult,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export function GoogleAuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Handle the result when user is returned from the Google redirect page
  useEffect(() => {
    setIsLoading(true);
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          router.push("/dashboard");
        }
      })
      .catch((err: any) => {
        console.error("Google redirect error:", err);
        setError(getFriendlyError(err.code));
      })
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      // Try popup first (better UX on desktop)
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Google popup error:", err);

      // If popup was blocked or closed — fall back to redirect (works on mobile / strict browsers)
      if (
        err.code === "auth/popup-blocked" ||
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request"
      ) {
        try {
          await signInWithRedirect(auth, provider);
          // Page will redirect; no further action needed here
          return;
        } catch (redirectErr: any) {
          console.error("Google redirect error:", redirectErr);
          setError(getFriendlyError(redirectErr.code));
        }
      } else {
        setError(getFriendlyError(err.code));
      }

      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2 border border-destructive/20">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
          <path d="M1 1h22v22H1z" fill="none" />
        </svg>
        {isLoading ? "Signing in..." : "Continue with Google"}
      </button>
    </div>
  );
}

// Converts Firebase error codes to human-readable messages
function getFriendlyError(code: string): string {
  switch (code) {
    case "auth/unauthorized-domain":
      return "This domain is not authorised for Google Sign-In. Add it in Firebase Console → Authentication → Settings → Authorised domains.";
    case "auth/operation-not-allowed":
      return "Google Sign-In is not enabled. Enable it in Firebase Console → Authentication → Sign-in methods.";
    case "auth/internal-error":
      return "An internal error occurred. Please try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    default:
      return `Sign-in failed (${code || "unknown error"}). Please try again.`;
  }
}
