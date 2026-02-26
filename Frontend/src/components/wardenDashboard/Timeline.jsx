import { Check, Clock, X, LogOut, LogIn, FileText } from "lucide-react";

const ACTION_ICONS = {
  Applied: FileText,
  Approved: Check,
  Rejected: X,
  Exited: LogOut,
  Returned: LogIn,
};

const ACTION_COLORS = {
  Applied: "bg-blue-100 text-blue-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Exited: "bg-purple-100 text-purple-700",
  Returned: "bg-gray-100 text-gray-700",
};

const LINE_COLORS = {
  Applied: "bg-blue-300",
  Approved: "bg-green-300",
  Rejected: "bg-red-300",
  Exited: "bg-purple-300",
  Returned: "bg-gray-300",
};

function Timeline({ logs }) {
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative">
      <div className="space-y-6">
        {logs.map((log, index) => {
          const Icon = ACTION_ICONS[log.action] || Clock;
          const colorClass = ACTION_COLORS[log.action] || "bg-gray-100 text-gray-700";
          const lineColor = LINE_COLORS[log.action] || "bg-gray-300";
          const isLast = index === logs.length - 1;

          return (
            <div key={index} className="relative flex gap-4">
              {/* Timeline Line */}
              {!isLast && (
                <div className="absolute left-5 top-10 h-full w-0.5 -translate-x-1/2">
                  <div className={`h-full w-full ${lineColor}`} />
                </div>
              )}

              {/* Icon */}
              <div className="relative z-10 flex-shrink-0">
                <div className={`rounded-full p-2.5 ${colorClass}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">{log.action}</h4>
                      <p className="text-xs text-gray-600">{formatDateTime(log.timestamp)}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
                    >
                      {log.action}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">By:</span> {log.by}
                  </p>
                  {log.remarks && (
                    <p className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Remarks:</span> {log.remarks}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Timeline;
