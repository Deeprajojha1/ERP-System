function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 py-2.5 last:border-b-0">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  )
}

export default InfoRow
