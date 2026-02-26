export default function Toast({ toast }) {
  const toneClass =
    toast.type === "error"
      ? "bg-rose-600"
      : toast.type === "success"
        ? "bg-emerald-600"
        : "bg-slate-900";

  return (
    <div
      className={`fixed inset-x-3 top-4 z-[9999] rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-200 sm:left-auto sm:right-4 sm:inset-x-auto ${toneClass} ${
        toast.show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
      }`}
    >
      {toast.text}
    </div>
  );
}
