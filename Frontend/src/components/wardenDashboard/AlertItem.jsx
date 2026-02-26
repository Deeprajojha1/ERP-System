import StatusBadge from "./StatusBadge";

function AlertItem({ item }) {
  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{item.category}</p>
          <p className="text-xs text-gray-600">
            {item.student} | Room {item.room}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-3 text-sm text-gray-700">{item.description}</p>
    </li>
  );
}

export default AlertItem;
