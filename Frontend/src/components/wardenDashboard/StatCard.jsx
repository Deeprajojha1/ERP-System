function StatCard({ title, value, delta, icon }) {
  const IconComponent = icon;

  return (
    <article className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-[#f8fbff] to-[#f3f7ff] p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <span className="rounded-xl bg-blue-100 p-2 text-blue-700">
          <IconComponent className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="text-3xl font-semibold text-gray-900">{value}</p>
      <p className="mt-2 text-xs font-medium text-blue-700">{delta}</p>
    </article>
  );
}

export default StatCard;
