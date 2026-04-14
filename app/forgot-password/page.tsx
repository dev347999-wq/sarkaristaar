"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });

      if (error) throw error;
      
      setStatus("success");
      setMessage("Password reset link sent! Please check your email inbox to reset your password.");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "Failed to send reset link. Please try again.");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-muted/30 items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-lg p-8 animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Forgot Password</h1>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {status === "error" && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-3 border border-destructive/20">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{message}</p>
          </div>
        )}

        {status === "success" ? (
          <div className="space-y-6">
            <div className="mb-6 p-6 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm flex flex-col items-center text-center gap-3 border border-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="font-semibold text-base leading-relaxed">{message}</p>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">You can close this window now.</p>
            </div>
            <Link href="/login" className="w-full inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted">
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="email">Email Address</label>
              <input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@example.com"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required 
              />
            </div>
            <button 
              type="submit"
              disabled={status === "loading"}
              className="w-full inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 mt-6 shadow disabled:opacity-50"
            >
              {status === "loading" ? "Sending Link..." : "Send Reset Link"}
            </button>
            
            <div className="text-center mt-6 pt-4">
              <Link href="/login" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
