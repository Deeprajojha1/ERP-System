import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Search, RefreshCw, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import { ADMIN_LOAD_STATES } from "../../Admin/constants/loadStates";
import {
  fetchInvigilatorAdmitCards,
  verifyAdmitCard,
  resetVerifyAdmitCardState,
  selectAdmitCards,
  selectAdmitCardsLoadState,
  selectVerifyAdmitCardState,
} from "../../redux/facultyDashboardSlice";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function FacultyAdmitCardsSection() {
  const dispatch = useDispatch();
  const apiBase = useSelector((state) => state.config.apiBase);
  const admitCards = useSelector(selectAdmitCards);
  const loadState = useSelector(selectAdmitCardsLoadState);
  const verifyState = useSelector(selectVerifyAdmitCardState);

  const [search, setSearch] = useState("");
  const [remarkById, setRemarkById] = useState({});
  const [activeVerifyId, setActiveVerifyId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const isLoading = loadState === ADMIN_LOAD_STATES.PENDING;

  useEffect(() => {
    if (!apiBase || loadState !== ADMIN_LOAD_STATES.INITIAL) return;
    dispatch(fetchInvigilatorAdmitCards({ apiBase }));
  }, [apiBase, loadState, dispatch]);

  useEffect(() => {
    if (!activeVerifyId) return;

    if (verifyState === ADMIN_LOAD_STATES.SUCCESS) {
      toast.success("Admit card verified");
      setRemarkById((prev) => ({ ...prev, [activeVerifyId]: "" }));
      setActiveVerifyId(null);
      dispatch(resetVerifyAdmitCardState());
    }

    if (verifyState === ADMIN_LOAD_STATES.FAILURE) {
      toast.error("Failed to verify admit card");
      setActiveVerifyId(null);
      dispatch(resetVerifyAdmitCardState());
    }
  }, [verifyState, activeVerifyId, dispatch]);

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return admitCards;

    return admitCards.filter((card) => {
      const candidateName =
        card?.snapshot?.candidateName ||
        card?.registration?.candidateName ||
        card?.student?.user?.name ||
        "";
      const rollNo = card?.snapshot?.rollNo || card?.registration?.rollNo || "";
      const enrollment =
        card?.snapshot?.enrollmentNumber ||
        card?.registration?.enrollmentNumber ||
        card?.student?.enrollmentNumber ||
        "";
      const admitNo = card?.admitCardNo || "";

      const haystack = `${candidateName} ${rollNo} ${enrollment} ${admitNo}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [admitCards, search]);

  const handleRefresh = async () => {
    if (!apiBase || refreshing) return;
    setRefreshing(true);
    try {
      await dispatch(
        fetchInvigilatorAdmitCards({
          apiBase,
          params: search.trim() ? { search: search.trim() } : undefined,
        })
      ).unwrap();
      toast.success("Admit cards refreshed");
    } catch {
      toast.error("Failed to refresh admit cards");
    } finally {
      setRefreshing(false);
    }
  };

  const handleVerify = (admitCardId) => {
    if (!apiBase || !admitCardId) return;
    setActiveVerifyId(admitCardId);
    dispatch(
      verifyAdmitCard({
        apiBase,
        admitCardId,
        remark: remarkById[admitCardId] || "",
      })
    );
  };

  return (
    <section className="faculty-section">
      <div className="faculty-section-header">
        <div>
          <h2 className="faculty-section-title">Invigilation Admit Cards</h2>
          <p className="faculty-section-subtitle">
            Verify student entry for your assigned examinations
          </p>
        </div>
        <button
          type="button"
          className="faculty-secondary-btn"
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
        >
          {refreshing ? <ClipLoader size={16} color="#0284c7" /> : <RefreshCw size={18} />}
          <span>Refresh</span>
        </button>
      </div>

      <div className="faculty-card">
        <div className="faculty-search-row">
          <Search size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by admit no, candidate, roll no"
            className="faculty-form-input"
          />
        </div>

        {isLoading ? (
          <div className="faculty-loading-inline">
            <ClipLoader size={24} color="#0284c7" />
            <span>Loading admit cards...</span>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="faculty-empty-state">
            <AlertCircle size={48} color="#94a3b8" />
            <p>No admit cards found</p>
          </div>
        ) : (
          <div className="faculty-admit-grid">
            {filteredCards.map((card) => {
              const isVerified = card?.invigilatorVerification?.status === "VERIFIED";
              const verifyingThisCard =
                verifyState === ADMIN_LOAD_STATES.PENDING && activeVerifyId === card._id;

              const candidateName =
                card?.snapshot?.candidateName ||
                card?.registration?.candidateName ||
                card?.student?.user?.name ||
                "N/A";
              const enrollment =
                card?.snapshot?.enrollmentNumber ||
                card?.registration?.enrollmentNumber ||
                card?.student?.enrollmentNumber ||
                "N/A";
              const rollNo = card?.snapshot?.rollNo || card?.registration?.rollNo || "N/A";

              return (
                <div key={card._id} className="faculty-admit-card">
                  <div className="faculty-admit-head">
                    <h4>{candidateName}</h4>
                    <span className={`faculty-admit-status ${isVerified ? "verified" : "pending"}`}>
                      {isVerified ? <CheckCircle2 size={14} /> : <ShieldCheck size={14} />}
                      {isVerified ? "Verified" : "Pending"}
                    </span>
                  </div>

                  <div className="faculty-admit-meta">
                    <p><strong>Admit No:</strong> {card?.admitCardNo || "N/A"}</p>
                    <p><strong>Enrollment:</strong> {enrollment}</p>
                    <p><strong>Roll No:</strong> {rollNo}</p>
                    <p><strong>Exam:</strong> {card?.exam?.examName || "N/A"}</p>
                    <p><strong>Session:</strong> {card?.exam?.session || "N/A"}</p>
                    <p><strong>Exam Time:</strong> {formatDateTime(card?.exam?.startTime)}</p>
                  </div>

                  {!isVerified && (
                    <>
                      <textarea
                        className="faculty-form-textarea"
                        rows={2}
                        placeholder="Verification remark (optional)"
                        value={remarkById[card._id] || ""}
                        onChange={(e) =>
                          setRemarkById((prev) => ({
                            ...prev,
                            [card._id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="faculty-primary-btn"
                        onClick={() => handleVerify(card._id)}
                        disabled={verifyingThisCard}
                      >
                        {verifyingThisCard ? (
                          <ClipLoader size={14} color="#fff" />
                        ) : (
                          <ShieldCheck size={16} />
                        )}
                        <span>{verifyingThisCard ? "Verifying..." : "Verify Entry"}</span>
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
