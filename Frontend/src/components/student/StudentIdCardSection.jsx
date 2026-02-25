import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import axios from "../../utils/axiosInstance";

const triggerPdfDownload = (blobData, fileName) => {
  const blob = new Blob([blobData], { type: "application/pdf" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
};

const StudentIdCardSection = ({ roleDetails }) => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const user = useSelector((state) => state.user.userData?.user);
  const [downloading, setDownloading] = useState(false);

  const discipline = useMemo(() => {
    const status = String(roleDetails?.disciplineStatus?.currentStatus || "clear")
      .toLowerCase()
      .trim();
    const reason = String(roleDetails?.disciplineStatus?.reason || "").trim();
    return {
      status,
      reason,
      startDate: roleDetails?.disciplineStatus?.startDate || null,
      endDate: roleDetails?.disciplineStatus?.endDate || null,
    };
  }, [roleDetails]);

  const handleDownload = async () => {
    if (!apiBase) return;
    try {
      setDownloading(true);
      const response = await axios.get(`${apiBase}/student/id-card/download`, {
        withCredentials: true,
        responseType: "blob",
      });
      const enrollment = roleDetails?.enrollmentNumber || "student";
      triggerPdfDownload(response.data, `${enrollment}_id_card.pdf`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to download ID card");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="student-fees-page">
      <h3>Student ID Card</h3>
      <p className="student-empty-state" style={{ marginBottom: "14px" }}>
        Download your latest university ID card in PDF format.
      </p>
      <div className="student-fee-summary">
        <article className="student-fee-card">
          <p>Name</p>
          <strong>{user?.name || "N/A"}</strong>
        </article>
        <article className="student-fee-card">
          <p>Enrollment</p>
          <strong>{roleDetails?.enrollmentNumber || "N/A"}</strong>
        </article>
        <article className="student-fee-card">
          <p>Discipline Status</p>
          <strong>{discipline.status.toUpperCase()}</strong>
        </article>
      </div>

      {discipline.reason ? (
        <p className="student-empty-state" style={{ marginTop: "10px" }}>
          Reason: {discipline.reason}
        </p>
      ) : null}

      <div style={{ marginTop: "16px" }}>
        <button
          type="button"
          className="student-admin-logout"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? "Preparing PDF..." : "Download ID Card"}
        </button>
      </div>
    </section>
  );
};

export default StudentIdCardSection;
