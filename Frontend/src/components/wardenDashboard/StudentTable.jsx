import React from "react";
import { Eye, Search } from "lucide-react";

function StudentTable({ students, onViewDetails }) {
  const getOutpassBadge = (status) => {
    const styles = {
      "No Outpass": "bg-gray-100 text-gray-800",
      Approved: "bg-green-100 text-green-800",
      Exited: "bg-blue-100 text-blue-800",
      Overdue: "bg-red-100 text-red-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  const getFeeBadge = (status) => {
    return status === "Paid" 
      ? "bg-green-100 text-green-800" 
      : "bg-red-100 text-red-800";
  };

  const getComplaintBadge = (count) => {
    if (count === 0) return "bg-gray-100 text-gray-800";
    if (count <= 2) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <section aria-label="Students List" className="rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-4 text-left font-semibold text-gray-900">Name</th>
              <th className="px-6 py-4 text-left font-semibold text-gray-900">Student ID</th>
              <th className="px-6 py-4 text-left font-semibold text-gray-900">Room</th>
              <th className="px-6 py-4 text-left font-semibold text-gray-900">Floor</th>
              <th className="px-6 py-4 text-center font-semibold text-gray-900">Outpass</th>
              <th className="px-6 py-4 text-center font-semibold text-gray-900">Complaints</th>
              <th className="px-6 py-4 text-center font-semibold text-gray-900">Fee Status</th>
              <th className="px-6 py-4 text-center font-semibold text-gray-900">Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr 
                key={student.id}
                className="border-b border-gray-100 transition-colors hover:bg-gray-50"
              >
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{student.name}</p>
                    {student.disciplinaryFlag && (
                      <span className="inline-block mt-1 rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        Disciplinary
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{student.id}</td>
                <td className="px-6 py-4 text-gray-600">{student.room}</td>
                <td className="px-6 py-4 text-center text-gray-600">{student.floor}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getOutpassBadge(student.outpassStatus)}`}>
                    {student.outpassStatus}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getComplaintBadge(student.complaintCount)}`}>
                    {student.complaintCount}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getFeeBadge(student.feeStatus)}`}>
                    {student.feeStatus}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => onViewDetails(student)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label={`View details for ${student.name}`}
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">View</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Placeholder */}
      <div className="border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">1</span> to{" "}
            <span className="font-semibold">{students.length}</span> of{" "}
            <span className="font-semibold">{students.length}</span> students
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              disabled
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              disabled
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default StudentTable;
