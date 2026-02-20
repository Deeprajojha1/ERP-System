import { useMemo, useState } from "react";
import {
  FiHome,
  FiPlus,
  FiSearch,
  FiArrowRight,
  FiUsers,
  FiMapPin,
} from "react-icons/fi";
import toast from "react-hot-toast";
import "./Hostel.css";

const INITIAL_HOSTELS = [
  {
    id: "hst-1",
    name: "KD Bhawan",
    code: "BH-A01",
    category: "Male",
    block: "Block A",
    warden: "Mr. Sharma",
    totalRooms: 120,
    occupiedRooms: 102,
  },
  {
    id: "hst-2",
    name: "ML Bhawan",
    code: "BH-B02",
    category: "Male",
    block: "Block B",
    warden: "Mr. Verma",
    totalRooms: 150,
    occupiedRooms: 90,
  },
  {
    id: "hst-3",
    name: "PL Bhawan",
    code: "GH-M01",
    category: "Female",
    block: "Main Block",
    warden: "Ms. Kaur",
    totalRooms: 200,
    occupiedRooms: 184,
  },
];

const Hostel = () => {
  const [hostels, setHostels] = useState(INITIAL_HOSTELS);
  const [searchValue, setSearchValue] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    code: "",
    category: "Male",
    block: "",
    warden: "",
    totalRooms: "",
    occupiedRooms: "",
  });

  const filteredHostels = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return hostels;
    return hostels.filter((hostel) => {
      return (
        hostel.name.toLowerCase().includes(query) ||
        hostel.code.toLowerCase().includes(query) ||
        hostel.block.toLowerCase().includes(query) ||
        hostel.warden.toLowerCase().includes(query)
      );
    });
  }, [hostels, searchValue]);

  const openCreateModal = () => {
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm({
      name: "",
      code: "",
      category: "Male",
      block: "",
      warden: "",
      totalRooms: "",
      occupiedRooms: "",
    });
  };

  const handleCreateHostel = (event) => {
    event.preventDefault();

    const totalRooms = Number(createForm.totalRooms);
    const occupiedRooms = Number(createForm.occupiedRooms || 0);

    if (!createForm.name.trim() || !createForm.code.trim()) {
      toast.error("Hostel name and code are required.");
      return;
    }

    if (!Number.isFinite(totalRooms) || totalRooms <= 0) {
      toast.error("Total rooms must be greater than 0.");
      return;
    }

    if (!Number.isFinite(occupiedRooms) || occupiedRooms < 0) {
      toast.error("Occupied rooms cannot be negative.");
      return;
    }

    if (occupiedRooms > totalRooms) {
      toast.error("Occupied rooms cannot exceed total rooms.");
      return;
    }

    const nextHostel = {
      id: `hst-${Date.now()}`,
      name: createForm.name.trim(),
      code: createForm.code.trim().toUpperCase(),
      category: createForm.category,
      block: createForm.block.trim() || "N/A",
      warden: createForm.warden.trim() || "N/A",
      totalRooms,
      occupiedRooms,
    };

    setHostels((prev) => [nextHostel, ...prev]);
    toast.success("Hostel created successfully.");
    closeCreateModal();
  };

  return (
    <section className="hostel-admin-page">
      <header className="hostel-admin-header">
        <div className="hostel-admin-title-wrap">
          <h1>Hostel Management</h1>
          <p>Create and manage hostels, room occupancy, and wardens.</p>
        </div>

        <div className="hostel-admin-actions">
          <label className="hostel-search">
            <FiSearch />
            <input
              type="text"
              placeholder="Search hostels..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="hostel-btn hostel-btn-outline"
            onClick={openCreateModal}
          >
            <FiPlus />
            Create Block
          </button>
          <button
            type="button"
            className="hostel-btn hostel-btn-primary"
            onClick={openCreateModal}
          >
            <FiPlus />
            Create Hostel
          </button>
        </div>
      </header>

      <div className="hostel-admin-grid">
        {filteredHostels.length === 0 ? (
          <div className="hostel-empty-state">
            <p>No hostels found for this search.</p>
            <button
              type="button"
              className="hostel-btn hostel-btn-primary"
              onClick={openCreateModal}
            >
              <FiPlus />
              Create Hostel
            </button>
          </div>
        ) : (
          filteredHostels.map((hostel) => {
            const occupancyPct = Math.min(
              100,
              Math.round((hostel.occupiedRooms / hostel.totalRooms) * 100)
            );
            const isFemale = hostel.category === "Female";

            return (
              <article key={hostel.id} className="hostel-card">
                <div
                  className={`hostel-card-media ${
                    isFemale ? "female" : "male"
                  }`}
                >
                  <span className="hostel-card-tag">{hostel.category}</span>
                  <FiHome />
                </div>

                <div className="hostel-card-body">
                  <div className="hostel-card-head">
                    <h3>{hostel.name}</h3>
                    <span>{hostel.code}</span>
                  </div>

                  <div className="hostel-card-info">
                    <p>
                      <FiMapPin />
                      {hostel.block}
                    </p>
                    <p>
                      <FiUsers />
                      Warden: {hostel.warden}
                    </p>
                  </div>

                  <p className="hostel-card-summary">
                    Total Rooms: {hostel.totalRooms} | Occupancy: {occupancyPct}%
                  </p>

                  <div className="hostel-occupancy">
                    <div className="hostel-occupancy-head">
                      <span>Current Occupancy</span>
                      <strong>
                        {hostel.occupiedRooms} / {hostel.totalRooms}
                      </strong>
                    </div>
                    <div className="hostel-occupancy-track">
                      <span
                        style={{ width: `${occupancyPct}%` }}
                        className={isFemale ? "female" : "male"}
                      />
                    </div>
                  </div>

                  <div className="hostel-card-actions">
                    <button type="button" className="hostel-btn hostel-btn-primary">
                      View Details <FiArrowRight />
                    </button>
                    <button type="button" className="hostel-btn hostel-btn-muted">
                      Add Room
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {showCreateModal && (
        <div className="hostel-modal-overlay" onClick={closeCreateModal}>
          <div className="hostel-modal" onClick={(event) => event.stopPropagation()}>
            <header className="hostel-modal-header">
              <h2>Create Hostel</h2>
              <button type="button" onClick={closeCreateModal}>
                Close
              </button>
            </header>

            <form className="hostel-modal-form" onSubmit={handleCreateHostel}>
              <label>
                Hostel Name
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="e.g. Boys Hostel C"
                />
              </label>

              <label>
                Hostel Code
                <input
                  type="text"
                  value={createForm.code}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, code: event.target.value }))
                  }
                  placeholder="e.g. BH-C03"
                />
              </label>

              <label>
                Category
                <select
                  value={createForm.category}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, category: event.target.value }))
                  }
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>

              <label>
                Block
                <input
                  type="text"
                  value={createForm.block}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, block: event.target.value }))
                  }
                  placeholder="e.g. Block C"
                />
              </label>

              <label>
                Warden Name
                <input
                  type="text"
                  value={createForm.warden}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, warden: event.target.value }))
                  }
                  placeholder="e.g. Mr. Sharma"
                />
              </label>

              <label>
                Total Rooms
                <input
                  type="number"
                  min="1"
                  value={createForm.totalRooms}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      totalRooms: event.target.value,
                    }))
                  }
                  placeholder="e.g. 120"
                />
              </label>

              <label>
                Occupied Rooms
                <input
                  type="number"
                  min="0"
                  value={createForm.occupiedRooms}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      occupiedRooms: event.target.value,
                    }))
                  }
                  placeholder="e.g. 90"
                />
              </label>

              <div className="hostel-modal-actions">
                <button
                  type="button"
                  className="hostel-btn hostel-btn-muted"
                  onClick={closeCreateModal}
                >
                  Cancel
                </button>
                <button type="submit" className="hostel-btn hostel-btn-primary">
                  <FiPlus />
                  Create Hostel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Hostel;
