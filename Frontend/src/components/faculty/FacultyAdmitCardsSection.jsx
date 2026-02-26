import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Search,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  IdCard,
  CalendarDays,
  BadgeCheck,
} from "lucide-react";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import { ADMIN_LOAD_STATES } from "../../Admin/constants/loadStates";
import { facultyUi } from "./uiTokens";
import { EmptyState, LoadingState } from "./SectionState";
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
    <section className={facultyUi.page}>
      <div className={facultyUi.pageHeader}>
        <div>
          <h2 className={facultyUi.title}>Invigilation Admit Cards</h2>
          <p className={facultyUi.subtitle}>
            Verify student entry for your assigned examinations
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
        >
          {refreshing ? <ClipLoader size={16} color="#0284c7" /> : <RefreshCw size={18} />}
          <span>Refresh</span>
        </button>
      </div>

      <div className={facultyUi.panel}>
        <div className="relative mb-4">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by admit no, candidate, roll no"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />
        </div>

        {isLoading ? (
          <LoadingState message="Loading admit cards..." minHeight="min-h-64" />
        ) : filteredCards.length === 0 ? (
          <EmptyState message="No admit cards found" minHeight="min-h-64" />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                <div key={card._id} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h4 className="m-0 text-base font-semibold text-slate-900">{candidateName}</h4>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isVerified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {isVerified ? <CheckCircle2 size={14} /> : <ShieldCheck size={14} />}
                      {isVerified ? "Verified" : "Pending"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Admit No</p>
                      <p className="m-0 mt-1 inline-flex items-center gap-1.5 font-medium text-slate-800"><IdCard size={13} />{card?.admitCardNo || "N/A"}</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Enrollment</p>
                      <p className="m-0 mt-1 font-medium text-slate-800">{enrollment}</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Roll No</p>
                      <p className="m-0 mt-1 font-medium text-slate-800">{rollNo}</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Session</p>
                      <p className="m-0 mt-1 font-medium text-slate-800">{card?.exam?.session || "N/A"}</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 sm:col-span-2">
                      <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Exam</p>
                      <p className="m-0 mt-1 inline-flex items-center gap-1.5 font-medium text-slate-800"><BadgeCheck size={13} />{card?.exam?.examName || "N/A"}</p>
                      <p className="m-0 mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={12} />{formatDateTime(card?.exam?.startTime)}</p>
                    </div>
                  </div>

                  {!isVerified ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
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
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-cyan-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
