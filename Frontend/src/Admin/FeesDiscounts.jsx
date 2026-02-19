import React, { useMemo, useState } from "react";
import {
  FiPlus,
  FiUsers,
  FiDollarSign,
  FiEdit2,
  FiTrash2,
  FiTag,
} from "react-icons/fi";
import { MdOutlineToggleOn, MdOutlineToggleOff } from "react-icons/md";
import "./FeesDiscounts.css";

const FILTERS = [
  { key: "all", label: "All Rules", count: 7 },
  { key: "scholarship", label: "Scholarships", count: 5 },
  { key: "concession", label: "Concessions", count: 2 },
  { key: "special", label: "Special", count: 0 },
];

const PRIORITY_OPTIONS = ["Priority 1", "Priority 2", "Priority 3"];
const RULE_TYPES = ["Rank Based", "Merit Based", "Attendance Based", "Income Based", "Performance"];
const CATEGORY_OPTIONS = ["Scholarship", "Concession", "Special"];
const DISCOUNT_TYPES = ["Percentage", "Amount"];
const ACADEMIC_YEARS = ["2024-2025", "2023-2024", "2022-2023"];

const DEFAULT_RULES = [
  {
    id: "r1",
    name: "Merit Scholarship - Top 10",
    category: "Scholarship",
    ruleType: "Rank Based",
    priority: "Priority 1",
    academicYear: "2024-2025",
    tags: ["Scholarship", "Rank-Based", "Priority 1"],
    discountType: "Percentage",
    value: 100,
    eligible: 1,
    totalDiscount: "₹1.22L",
    status: "active",
    conditions: [
      { label: "Rank From", value: "1" },
      { label: "Rank To", value: "10" },
      { label: "Entrance Exam", value: "JEE Main" },
    ],
    components: ["All"],
  },
  {
    id: "r2",
    name: "Need-Based Concession",
    category: "Concession",
    ruleType: "Income Based",
    priority: "Priority 2",
    academicYear: "2024-2025",
    tags: ["Concession", "Income", "Priority 2"],
    discountType: "Amount",
    value: 25000,
    eligible: 42,
    totalDiscount: "₹10.5L",
    status: "active",
    conditions: [
      { label: "Family Income", value: "< ₹3L" },
      { label: "Attendance", value: ">= 85%" },
    ],
    components: ["Tuition", "Lab"],
  },
  {
    id: "r3",
    name: "Sports Excellence",
    category: "Special",
    ruleType: "Performance",
    priority: "Priority 3",
    academicYear: "2024-2025",
    tags: ["Special", "Sports", "Priority 3"],
    discountType: "Percentage",
    value: 50,
    eligible: 17,
    totalDiscount: "₹3.4L",
    status: "inactive",
    conditions: [
      { label: "National Level", value: "Medalist" },
      { label: "Attendance", value: ">= 80%" },
    ],
    components: ["Tuition"],
  },
];

const DEFAULT_FORM = {
  name: "",
  ruleType: RULE_TYPES[0],
  category: CATEGORY_OPTIONS[0],
  discountType: DISCOUNT_TYPES[0],
  value: 0,
  priority: PRIORITY_OPTIONS[0],
  academicYear: ACADEMIC_YEARS[0],
  conditionDetails: "",
};

const StatsCard = ({ icon: Icon, label, value, subtitle }) => (
  <article className="fee-discount-stat">
    <div className="fee-discount-stat-icon">
      <Icon />
    </div>
    <div>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{subtitle}</span>
    </div>
  </article>
);

const FeesDiscounts = () => {
  const [filter, setFilter] = useState("all");
  const [rules] = useState(DEFAULT_RULES);
  const [modalMode, setModalMode] = useState(null);
  const [formValues, setFormValues] = useState(DEFAULT_FORM);
  const [editingRule, setEditingRule] = useState(null);

  const filteredRules = useMemo(() => {
    if (filter === "all") return rules;
    return rules.filter((rule) => rule.category.toLowerCase() === filter);
  }, [filter, rules]);

  const openCreateModal = () => {
    setFormValues(DEFAULT_FORM);
    setEditingRule(null);
    setModalMode("create");
  };

  const openEditModal = (rule) => {
    setFormValues({
      name: rule.name,
      ruleType: rule.ruleType,
      category: rule.category,
      discountType: rule.discountType,
      value: rule.value,
      priority: rule.priority,
      academicYear: rule.academicYear || ACADEMIC_YEARS[0],
      conditionDetails: JSON.stringify(rule.conditions, null, 2),
    });
    setEditingRule(rule);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingRule(null);
  };

  const toggleRule = (ruleId) => {
    console.log("Toggle rule", ruleId);
  };

  const handleSubmit = () => {
    if (modalMode === "edit") {
      console.log("Update rule", editingRule?.id, formValues);
    } else {
      console.log("Create rule", formValues);
    }
    closeModal();
  };

  const stats = [
    {
      icon: FiTag,
      label: "Total Discount Rules",
      value: "7",
      subtitle: "7 active",
    },
    {
      icon: FiUsers,
      label: "Students With Discounts",
      value: "175",
      subtitle: "Across all rules",
    },
    {
      icon: FiDollarSign,
      label: "Total Discount Amount",
      value: "₹0.57Cr",
      subtitle: "Current academic year",
    },
  ];

  const handleFormChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fees-page fees-discounts-page">
      <header className="fee-discounts-header">
        <div>
          <h1>Discount & Scholarship Rule Engine</h1>
          <p>Configure automatic discount rules based on merit, rank, GPA, and other criteria.</p>
        </div>
        <button type="button" className="fee-discounts-add-btn" onClick={openCreateModal}>
          <FiPlus /> Add Discount Rule
        </button>
      </header>

      <section className="fee-discounts-stats">
        {stats.map((card) => (
          <StatsCard key={card.label} {...card} />
        ))}
      </section>

      <div className="fee-discounts-filters">
        {FILTERS.map((pill) => (
          <button
            key={pill.key}
            type="button"
            className={`fee-discounts-filter ${filter === pill.key ? "is-active" : ""}`}
            onClick={() => setFilter(pill.key)}
          >
            {pill.label} ({pill.count})
          </button>
        ))}
      </div>

      <section className="fee-discounts-rules">
        {filteredRules.map((rule) => (
          <article className="fee-rule-card" key={rule.id}>
            <div className="fee-rule-head">
              <div>
                <h2>{rule.name}</h2>
                <div className="fee-rule-tags">
                  {rule.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <button type="button" className="fee-rule-toggle" onClick={() => toggleRule(rule.id)}>
                {rule.status === "active" ? (
                  <>
                    <MdOutlineToggleOn /> Active
                  </>
                ) : (
                  <>
                    <MdOutlineToggleOff /> Inactive
                  </>
                )}
              </button>
            </div>

            <div className="fee-rule-body">
              <div className="fee-rule-highlight">
                <span className="fee-rule-highlight-icon">%</span>
                <div>
                  <p>{rule.discountType}</p>
                  <strong>
                    {rule.discountType === "Percentage" ? `${rule.value}%` : `₹${rule.value.toLocaleString("en-IN")}`}
                  </strong>
                </div>
              </div>
              <div className="fee-rule-summary">
                <div>
                  <p>Eligible Students</p>
                  <strong>{rule.eligible}</strong>
                </div>
                <div>
                  <p>Total Discount</p>
                  <strong>{rule.totalDiscount}</strong>
                </div>
              </div>
            </div>

            <div className="fee-rule-conditions">
              <p>Conditions:</p>
              <ul>
                {rule.conditions.map((condition) => (
                  <li key={`${rule.id}-${condition.label}`}>
                    <span>{condition.label}:</span>
                    <span>{condition.value}</span>
                  </li>
                ))}
              </ul>
              <div className="fee-rule-components">
                <p>Applicable Components:</p>
                <span>{rule.components.join(", ")}</span>
              </div>
            </div>

            <div className="fee-rule-actions">
              <button type="button" onClick={() => openEditModal(rule)}>
                <FiEdit2 /> Edit
              </button>
              <button type="button">
                <FiTrash2 /> Delete
              </button>
            </div>
          </article>
        ))}
      </section>

      {modalMode && (
        <div className="fee-discounts-modal-overlay" onClick={closeModal}>
          <div
            className="fee-discounts-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fee-discounts-modal-head">
              <h2>{modalMode === "edit" ? "Edit Discount Rule" : "Add Discount Rule"}</h2>
              <button type="button" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="fee-discounts-modal-section">
              <p className="fee-discounts-modal-label">Basic Information</p>
              <div className="fee-discounts-modal-grid">
                <label>
                  Rule Name *
                  <input
                    placeholder="e.g., Merit Scholarship - Top 10"
                    value={formValues.name}
                    onChange={(event) => handleFormChange("name", event.target.value)}
                  />
                </label>
                <label>
                  Rule Type *
                  <select
                    value={formValues.ruleType}
                    onChange={(event) => handleFormChange("ruleType", event.target.value)}
                  >
                    {RULE_TYPES.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Category *
                  <select
                    value={formValues.category}
                    onChange={(event) => handleFormChange("category", event.target.value)}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Discount Type *
                  <select
                    value={formValues.discountType}
                    onChange={(event) => handleFormChange("discountType", event.target.value)}
                  >
                    {DISCOUNT_TYPES.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Value *
                  <input
                    type="number"
                    min="0"
                    value={formValues.value}
                    onChange={(event) => handleFormChange("value", Number(event.target.value) || 0)}
                  />
                </label>
                <label>
                  Priority *
                  <select
                    value={formValues.priority}
                    onChange={(event) => handleFormChange("priority", event.target.value)}
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Academic Year *
                  <select
                    value={formValues.academicYear}
                    onChange={(event) => handleFormChange("academicYear", event.target.value)}
                  >
                    {ACADEMIC_YEARS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="fee-discounts-modal-section">
              <p className="fee-discounts-modal-label">Conditions</p>
              <label>
                Condition Details
                <textarea
                  rows={4}
                  placeholder="Provide JSON or plain text describing the condition logic"
                  value={formValues.conditionDetails}
                  onChange={(event) => handleFormChange("conditionDetails", event.target.value)}
                />
              </label>
            </div>

            <div className="fee-discounts-modal-actions">
              <button type="button" className="fee-discounts-modal-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="fee-discounts-modal-primary" onClick={handleSubmit}>
                {modalMode === "edit" ? "Update Rule" : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesDiscounts;
