import { useEffect } from "react";
import { X, Download, QrCode, Calendar, MapPin, User } from "lucide-react";

function QRModal({ outpass, isOpen, onClose }) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleDownload = () => {
    // Integration: Generate and download QR code as image
    console.log("Downloading QR code for:", outpass?.id);
    alert("QR Code download would start here (Mock action)");
  };

  if (!isOpen || !outpass) return null;

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
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform transition-all duration-300 ${
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
      >
        <div className="relative mx-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-blue-100 p-2 text-blue-700">
                  <QrCode className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="qr-modal-title" className="text-lg font-bold text-gray-900">
                    Outpass QR Code
                  </h2>
                  <p className="text-xs text-gray-600">Show this at gate during exit</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* QR Code Placeholder */}
            <div className="mb-6 flex justify-center">
              <div className="rounded-2xl border-4 border-gray-200 bg-white p-6 shadow-inner">
                <div className="grid h-48 w-48 place-content-center rounded-lg bg-gradient-to-br from-gray-50 to-gray-100">
                  <div className="text-center">
                    <QrCode className="mx-auto mb-2 h-16 w-16 text-gray-400" aria-hidden="true" />
                    <p className="text-xs font-medium text-gray-500">QR Code</p>
                    <p className="text-xs text-gray-400">{outpass.qrCode}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Outpass Details */}
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-gray-600" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Outpass ID</p>
                  <p className="text-sm font-semibold text-gray-900">{outpass.id}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-gray-600" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Validity Period</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDateTime(outpass.fromDate)}
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    to {formatDateTime(outpass.toDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-gray-600" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Destination</p>
                  <p className="text-sm font-semibold text-gray-900">{outpass.destination}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-600">Status</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    outpass.status === "Approved"
                      ? "bg-green-100 text-green-800"
                      : outpass.status === "Exited"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {outpass.status}
                </span>
              </div>
            </div>

            {/* Important Notice */}
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-medium text-blue-800">Important:</p>
              <ul className="mt-1 space-y-1 text-xs text-blue-700">
                <li>• Present this QR code at the security gate</li>
                <li>• Keep your student ID card with you</li>
                <li>• Return before the expiry time</li>
              </ul>
            </div>

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download QR Code
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default QRModal;
