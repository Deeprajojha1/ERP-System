import { FiArrowRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import "./HostelOverview.css";
import { INITIAL_HOSTELS, percent } from "./hostelData";

const Hostel = () => {
  const navigate = useNavigate();

  return (
    <section className="hostel-overview-page">
      <header className="hostel-overview-hero">
        <div>
          <p>Residence Snapshot</p>
          <h1>Choose a Hostel</h1>
          <span>Tap any card to drill into beds, rooms, food plan and complaints.</span>
        </div>
        <button type="button" className="hostel-overview-link" onClick={() => navigate("/admin/hostel/kd")}>Start with KD Bhawan</button>
      </header>

      <div className="hostel-card-grid">
        {INITIAL_HOSTELS.map((hostel) => {
          const occupancy = percent(hostel.occupiedRooms, hostel.totalRooms);
          const isFemale = hostel.category === "Female";
          return (
            <button
              key={hostel.id}
              type="button"
              className="hostel-card"
              onClick={() => navigate(`/admin/hostel/${hostel.id}`)}
            >
              <div className="hostel-card-head">
                <strong>{hostel.name}</strong>
                <span className={`hostel-chip ${isFemale ? "female" : ""}`}>{hostel.category}</span>
              </div>
              <p className="hostel-card-meta">{hostel.code} | {hostel.block}</p>
              <div className="hostel-card-occupancy">
                <span>{hostel.occupiedRooms}/{hostel.totalRooms}</span>
                <strong>{occupancy}%</strong>
              </div>
              <div className="hostel-card-progress">
                <span className={isFemale ? "female" : ""} style={{ width: `${occupancy}%` }} />
              </div>
              <div className="hostel-card-footer">
                <div>
                  <h4>Go to details</h4>
                  <small>Full allocation, menu, issues</small>
                </div>
                <FiArrowRight />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default Hostel;
