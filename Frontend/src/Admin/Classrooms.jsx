import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import axios from "../utils/axiosInstance";
import {
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiSearch,
  FiXCircle,
} from "react-icons/fi";
import { ThreeDots } from "react-loader-spinner";
import { ADMIN_LOAD_STATES, ADMIN_LOAD_STATE_OPTIONS } from "./constants/loadStates";
import "./Classrooms.css";

const defaultForm = Object.freeze({
  name: "",
  capacity: "",
  available: true,
});

const parseClassrooms = (payload) => {
  if (Array.isArray(payload?.classrooms)) return payload.classrooms;
  if (Array.isArray(payload?.data?.classrooms)) return payload.data.classrooms;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const Classrooms = () => {
  const apiBase = useSelector((state) => state.config.apiBase);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");
  const [form, setForm] = useState(defaultForm);
  const [page, setPage] = useState(1);

  const fetchClassrooms = useCallback(async () => {
    if (!apiBase) return;
    try {
      setLoading(true);
      setLoadError("");
      const response = await axios.get(`${apiBase}/admin/classrooms`, {
        withCredentials: true,
      });
      setClassrooms(parseClassrooms(response.data));
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch classrooms";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setHasFetchedOnce(true);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const capacity = Number(form.capacity);
    if (!form.name.trim() || !capacity || capacity < 1) {
      toast.error("Classroom name and valid capacity are required");
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(
        `${apiBase}/admin/classroom`,
        {
          name: form.name.trim(),
          capacity,
          available: Boolean(form.available),
        },
        { withCredentials: true }
      );
      toast.success("Classroom created successfully");
      setForm(defaultForm);
      await fetchClassrooms();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create classroom");
    } finally {
      setSubmitting(false);
    }
  };

  const loadState = useMemo(() => {
    if (!hasFetchedOnce && !loading) return ADMIN_LOAD_STATES.INITIAL;
    if (loading) return ADMIN_LOAD_STATES.PENDING;
    if (loadError) return ADMIN_LOAD_STATES.FAILURE;
    return ADMIN_LOAD_STATES.SUCCESS;
  }, [hasFetchedOnce, loading, loadError]);

  const loadStateText =
    ADMIN_LOAD_STATE_OPTIONS.find((state) => state.id === loadState)?.text || "Unknown";

  const filteredClassrooms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return classrooms.filter((room) => {
      const matchesSearch =
        !query ||
        String(room?.name || "")
          .toLowerCase()
          .includes(query);

      const matchesAvailability =
        availabilityFilter === "ALL" ||
        (availabilityFilter === "AVAILABLE" && room?.available) ||
        (availabilityFilter === "UNAVAILABLE" && !room?.available);

      return matchesSearch && matchesAvailability;
    });
  }, [classrooms, searchQuery, availabilityFilter]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredClassrooms.length / pageSize));
  const pageStartIndex = (page - 1) * pageSize;
  const paginatedClassrooms = filteredClassrooms.slice(
    pageStartIndex,
    pageStartIndex + pageSize
  );
  const rangeStart = filteredClassrooms.length === 0 ? 0 : pageStartIndex + 1;
  const rangeEnd = Math.min(pageStartIndex + pageSize, filteredClassrooms.length);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, availabilityFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const stats = useMemo(() => {
    const available = classrooms.filter((room) => room?.available).length;
    return {
      total: classrooms.length,
      available,
      unavailable: classrooms.length - available,
    };
  }, [classrooms]);

  return (
    <div className="classrooms-page">
      <header className="classrooms-head">
        <div>
          <h2>Classroom Management</h2>
          <p>Create and monitor classrooms with availability and capacity details.</p>
        </div>
        <button
          type="button"
          className="classrooms-btn classrooms-btn-primary"
          onClick={fetchClassrooms}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? "classrooms-spin" : ""} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <section className="classrooms-stats">
        <article className="classrooms-stat-card">
          <span>Total</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="classrooms-stat-card classrooms-stat-card-success">
          <span>Available</span>
          <strong>{stats.available}</strong>
        </article>
        <article className="classrooms-stat-card classrooms-stat-card-danger">
          <span>Unavailable</span>
          <strong>{stats.unavailable}</strong>
        </article>
      </section>

      <section className="classrooms-card">
        <header className="classrooms-card-head">
          <h3>Add Classroom</h3>
        </header>
        <form onSubmit={handleSubmit} className="classrooms-form">
          <label>
            Classroom Name
            <input
              type="text"
              value={form.name}
              placeholder="e.g. B-302"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </label>

          <label>
            Capacity
            <input
              type="number"
              min="1"
              value={form.capacity}
              placeholder="e.g. 60"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, capacity: event.target.value }))
              }
            />
          </label>

          <label className="classrooms-checkbox-label">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, available: event.target.checked }))
              }
            />
            <span>Available for allocation</span>
          </label>

          <button
            type="submit"
            className="classrooms-btn classrooms-btn-primary"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Add Classroom"}
          </button>
        </form>
      </section>

      <section className="classrooms-card">
        <header className="classrooms-card-head classrooms-records-head">
          <h3>Classroom Records</h3>
          <div className="classrooms-records-meta">
            <span className={`classrooms-load-chip ${loadState}`}>{loadStateText}</span>
            <span>{filteredClassrooms.length} item(s)</span>
          </div>
        </header>

        <div className="classrooms-filters">
          <label className="classrooms-search">
            <FiSearch />
            <input
              type="text"
              placeholder="Search by classroom name"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <select
            value={availabilityFilter}
            onChange={(event) => setAvailabilityFilter(event.target.value)}
          >
            <option value="ALL">All Availability</option>
            <option value="AVAILABLE">Available</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>
        </div>

        {loadState === ADMIN_LOAD_STATES.PENDING ? (
          <div className="classrooms-state">
            <ThreeDots
              visible
              height={36}
              width={60}
              color="#2563eb"
              radius={8}
              ariaLabel="classrooms-loading"
            />
            <p>Loading classrooms...</p>
          </div>
        ) : loadState === ADMIN_LOAD_STATES.FAILURE ? (
          <div className="classrooms-state">
            <p>{loadError || "Failed to load classrooms."}</p>
            <button
              type="button"
              className="classrooms-btn classrooms-btn-ghost"
              onClick={fetchClassrooms}
            >
              <FiRefreshCw />
              Retry
            </button>
          </div>
        ) : filteredClassrooms.length === 0 ? (
          <div className="classrooms-state">
            <p>No classrooms found.</p>
          </div>
        ) : (
          <div className="classrooms-table-wrap">
            <table className="classrooms-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClassrooms.map((room) => (
                  <tr key={room._id}>
                    <td>{room.name}</td>
                    <td>{room.capacity}</td>
                    <td>
                      <span
                        className={`classrooms-status ${room.available ? "available" : "unavailable"}`}
                      >
                        {room.available ? (
                          <>
                            <FiCheckCircle />
                            Available
                          </>
                        ) : (
                          <>
                            <FiXCircle />
                            Unavailable
                          </>
                        )}
                      </span>
                    </td>
                    <td>{new Date(room.updatedAt || room.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {loadState === ADMIN_LOAD_STATES.SUCCESS && filteredClassrooms.length > 0 && (
          <div className="classrooms-pagination">
            <button
              type="button"
              className="classrooms-page-btn"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              <FiChevronLeft aria-hidden="true" />
              <span>Prev</span>
            </button>
            <div className="classrooms-page-info">
              {rangeStart} to {rangeEnd} of {filteredClassrooms.length}
            </div>
            <button
              type="button"
              className="classrooms-page-btn"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
            >
              <span>Next</span>
              <FiChevronRight aria-hidden="true" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Classrooms;
