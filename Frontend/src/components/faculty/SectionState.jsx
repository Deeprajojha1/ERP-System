import { AlertTriangle, Loader2 } from "lucide-react";

export function EmptyState({ message, minHeight = "min-h-64" }) {
  return (
    <div
      className={`flex ${minHeight} flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-6 py-10 text-center`}
    >
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-500 shadow-[0_6px_14px_rgba(15,23,42,0.08)]">
        <AlertTriangle size={30} />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-700">{message}</p>
      <p className="mt-1 text-sm text-slate-500">No records available right now.</p>
    </div>
  );
}

export function LoadingState({ message, minHeight = "min-h-64" }) {
  return (
    <div
      className={`flex ${minHeight} flex-col items-center justify-center rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]`}
    >
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-[0_6px_14px_rgba(37,99,235,0.2)]">
        <Loader2 size={24} className="animate-spin" />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-700">{message}</p>
      <div className="mt-5 h-2 w-60 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-300" />
      </div>
    </div>
  );
}
