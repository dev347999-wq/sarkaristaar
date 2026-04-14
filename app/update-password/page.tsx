"use client";

import { useState } from "react";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setStatus("error");
      setMessage("Password must be at least 6 characters long.");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setStatus("success");
      setMessage("Your password has been successfully updated!");
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
      
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "Failed to update password. Please try again or request a new link.");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-muted/30 items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-lg p-8 animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set New Password</h1>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            You have successfully securely verified your identity. Please enter your new password below.
          </p>
        </div>

        {status === "error" && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-3 border border-destructive/20">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{message}</p>
          </div>
        )}

        {status === "success" ? (
          <div className="mb-6 p-6 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm flex flex-col items-center text-center gap-3 border border-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <p className="font-semibold text-base leading-relaxed">{message}</p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">Taking you to dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="password">New Password</label>
              <input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required 
                minLength={6}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="confirmPassword">Confirm New Password</label>
              <input 
                id="confirmPassword" 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required 
                minLength={6}
              />
            </div>
            
            <button 
              type="submit"
              disabled={status === "loading"}
              className="w-full inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 mt-6 shadow hover:shadow-md disabled:opacity-50"
            >
              {status === "loading" ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
