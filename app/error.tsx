"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-20">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 border border-red-100">
        <AlertTriangle size={28} className="text-red-400" />
      </div>
      <h1 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h1>
      <p className="text-slate-500 text-sm max-w-xs mb-8 leading-relaxed">
        An error occurred loading this page. This is likely a temporary issue.
      </p>
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <button onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-ghost border border-slate-200 text-sm">Go home</Link>
      </div>
      {error.digest && (
        <p className="text-xs text-slate-300 mt-6 font-mono">ID: {error.digest}</p>
      )}
    </div>
  );
}
