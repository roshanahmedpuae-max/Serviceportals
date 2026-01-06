"use client";

import { useEffect, useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import toast from "react-hot-toast";

type TokenInfo = {
  employeeId: string;
  workOrderId: string;
  businessUnit: string;
  job?: {
    customerName?: string;
    description?: string;
    locationAddress?: string;
    orderDateTime?: string;
  } | null;
};

export default function RatingPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const searchToken = searchParams.get("token");
  const urlToken = pathname?.split("/").filter(Boolean).pop();
  const token = searchToken || urlToken || "";

  useEffect(() => {
    if (!token) {
      setError("Invalid rating link.");
      setLoading(false);
      return;
    }

    const fetchTokenInfo = async () => {
      try {
        const res = await fetch(`/api/ratings/token?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Invalid or expired link.");
        }
        const data = (await res.json()) as TokenInfo;
        setTokenInfo(data);
      } catch (e: any) {
        setError(e.message || "Failed to load rating link.");
      } finally {
        setLoading(false);
      }
    };

    fetchTokenInfo();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (score < 1 || score > 5) {
      toast.error("Please select a rating between 1 and 5 stars.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ratings/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, score, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit rating.");
      }
      setSubmitted(true);
      toast.success("Thank you for your feedback!");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit rating.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center text-slate-600 text-sm">Loading rating form...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md mx-auto bg-white shadow-md rounded-2xl p-6 text-center">
          <h1 className="text-lg font-semibold text-red-600 mb-2">Link not available</h1>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!tokenInfo) {
    return null;
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md mx-auto bg-white shadow-md rounded-2xl p-6 text-center">
          <h1 className="text-xl font-semibold text-emerald-600 mb-3">
            Thank you for your rating!
          </h1>
          <p className="text-sm text-slate-600">
            Your feedback helps us improve our service.
          </p>
        </div>
      </div>
    );
  }

  const job = tokenInfo.job;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Rate Our Service</h1>
          <p className="text-sm text-slate-600">
            Please share your experience so we can continue to improve.
          </p>
        </div>

        {job && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1 text-sm text-slate-700">
            {job.customerName && (
              <p>
                <span className="font-semibold">Customer:</span> {job.customerName}
              </p>
            )}
            {job.description && (
              <p>
                <span className="font-semibold">Job:</span> {job.description}
              </p>
            )}
            {job.locationAddress && (
              <p>
                <span className="font-semibold">Location:</span> {job.locationAddress}
              </p>
            )}
            {job.orderDateTime && (
              <p>
                <span className="font-semibold">Date:</span>{" "}
                {new Date(job.orderDateTime).toLocaleString()}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-800">
              Your rating
            </label>
            <div className="flex items-center gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScore(value)}
                  className={[
                    "w-10 h-10 rounded-full flex items-center justify-center border text-lg transition-colors",
                    score >= value
                      ? "bg-amber-400 border-amber-400 text-white"
                      : "bg-white border-slate-200 text-slate-500",
                  ].join(" ")}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-800">
              Comments (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Tell us what went well or what we can improve..."
            />
            <div className="flex justify-end text-xs text-slate-400">
              {comment.length}/1000
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit rating"}
          </button>
        </form>
      </div>
    </div>
  );
}


