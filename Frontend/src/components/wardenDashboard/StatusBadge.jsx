const STATUS_STYLES = {
  Pending:
    "bg-yellow-100 text-yellow-800 ring-yellow-600/20",
  Approved:
    "bg-green-100 text-green-800 ring-green-600/20",
  Rejected:
    "bg-red-100 text-red-800 ring-red-600/20",
  Exited:
    "bg-blue-100 text-blue-800 ring-blue-600/20",
  Returned:
    "bg-gray-100 text-gray-800 ring-gray-600/20",
};

function StatusBadge({ status }) {
  const style =
    STATUS_STYLES[status] ||
    "bg-gray-100 text-gray-700 ring-gray-600/20";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
