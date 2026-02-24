export const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const makeRoom = (
  roomNo,
  roomType,
  seatCapacity,
  capacityClass,
  fee,
  occupants,
  status,
  maintenanceNote = ""
) => ({
  id: `room-${roomNo}`,
  roomNo,
  roomType,
  seatCapacity,
  capacityClass,
  fee,
  occupants,
  status,
  maintenanceNote,
});

export const defaultMenu = DAY_ORDER.reduce((acc, day) => {
  acc[day] = {
    breakfast: "Milk, Bread Butter, Fruits",
    lunch: "Rice, Dal, Seasonal Sabji, Salad",
    snacks: "Tea and Snacks",
    dinner: "Roti, Dal, Veg Curry",
    time: {
      breakfast: "07:30 AM",
      lunch: "01:00 PM",
      snacks: "05:00 PM",
      dinner: "08:00 PM",
    },
  };
  return acc;
}, {});

export const INITIAL_HOSTELS = [
  {
    id: "kd",
    name: "KD Bhawan",
    code: "KD-B01",
    category: "Male",
    block: "North Block",
    warden: "Mr. G. Sharma",
    totalRooms: 120,
    occupiedRooms: 102,
    floors: [
      {
        id: "kd-g",
        name: "Ground Floor",
        totalBeds: 48,
        occupiedBeds: 34,
        maintenanceRooms: 1,
        rooms: [
          makeRoom("101", "Double", 2, "Normal", 52000, ["Alex Thompson"], "Vacant"),
          makeRoom("102", "Double", 2, "AC", 62000, ["Jordan Reed", "Michael Chen"], "Full"),
          makeRoom(
            "103",
            "Triple",
            3,
            "Semi Deluxe",
            58000,
            [],
            "Maintenance",
            "Pending AC repair since yesterday."
          ),
        ],
      },
      {
        id: "kd-1",
        name: "1st Floor",
        totalBeds: 52,
        occupiedBeds: 45,
        maintenanceRooms: 0,
        rooms: [makeRoom("201", "Triple", 3, "Normal", 56000, ["Harsh", "Rohit"], "Vacant")],
      },
    ],
    foodMenu: defaultMenu,
    complaints: [
      {
        id: "kd-c1",
        studentName: "Sahil Rana",
        roomNo: "103",
        issueType: "Electricity",
        description: "AC not cooling and unusual noise from unit.",
        status: "in-progress",
        resolutionOption: "immediate-fix",
      },
      {
        id: "kd-c2",
        studentName: "Aditya Kumar",
        roomNo: "104",
        issueType: "Water Supply",
        description: "Low pressure in washroom after 10 PM.",
        status: "pending",
        resolutionOption: "temporary-workaround",
      },
    ],
  },
  {
    id: "ml",
    name: "ML Bhawan",
    code: "ML-B02",
    category: "Male",
    block: "Academic Extension",
    warden: "Mr. N. Verma",
    totalRooms: 150,
    occupiedRooms: 90,
    floors: [
      {
        id: "ml-g",
        name: "Ground Floor",
        totalBeds: 44,
        occupiedBeds: 26,
        maintenanceRooms: 0,
        rooms: [
          makeRoom("101", "Double", 2, "Normal", 50000, ["Nitin"], "Vacant"),
          makeRoom("102", "Triple", 3, "Normal", 54000, ["Vansh", "Ayush"], "Vacant"),
        ],
      },
      {
        id: "ml-1",
        name: "1st Floor",
        totalBeds: 56,
        occupiedBeds: 40,
        maintenanceRooms: 1,
        rooms: [
          makeRoom("201", "Four Seater", 4, "Semi Deluxe", 49000, ["Mohit", "Prashant", "Raju", "Sujeet"], "Full"),
          makeRoom("202", "Double", 2, "AC", 65000, [], "Maintenance", "Paint and plumbing work in progress."),
        ],
      },
    ],
    foodMenu: defaultMenu,
    complaints: [
      {
        id: "ml-c1",
        studentName: "Kunal Joshi",
        roomNo: "202",
        issueType: "Maintenance",
        description: "Wash basin leakage reported.",
        status: "resolved",
        resolutionOption: "root-cause-permanent-fix",
      },
    ],
  },
  {
    id: "pl",
    name: "Prem Lata Bhawan",
    code: "PL-G01",
    category: "Female",
    block: "Main Girls Campus",
    warden: "Ms. R. Kaur",
    totalRooms: 200,
    occupiedRooms: 184,
    floors: [
      {
        id: "pl-g",
        name: "Ground Floor",
        totalBeds: 58,
        occupiedBeds: 54,
        maintenanceRooms: 1,
        rooms: [
          makeRoom("101", "Double", 2, "AC", 64000, ["Aanya Kapoor", "Ira Mehta"], "Full"),
          makeRoom("102", "Triple", 3, "Semi Deluxe", 60000, ["Riya", "Tanya", "Kavya"], "Full"),
        ],
      },
      {
        id: "pl-1",
        name: "1st Floor",
        totalBeds: 64,
        occupiedBeds: 58,
        maintenanceRooms: 0,
        rooms: [
          makeRoom("201", "Triple", 3, "Normal", 56000, ["Sana", "Diya"], "Vacant"),
          makeRoom("202", "Four Seater", 4, "Normal", 52000, ["Khushi", "Neha", "Mitali", "Shruti"], "Full"),
        ],
      },
    ],
    foodMenu: defaultMenu,
    complaints: [
      {
        id: "pl-c1",
        studentName: "Ritika Arora",
        roomNo: "201",
        issueType: "Wi-Fi",
        description: "Frequent disconnect in room after 11 PM.",
        status: "pending",
        resolutionOption: "escalation",
      },
    ],
  },
];

export const EMPTY_FORM = {
  name: "",
  code: "",
  category: "Male",
  block: "",
  warden: "",
  totalRooms: "",
  occupiedRooms: "",
};

export const RESOLUTION_OPTIONS = [
  {
    value: "immediate-fix",
    label: "Immediate Fix",
    description: "Resolve quickly with direct maintenance action.",
  },
  {
    value: "temporary-workaround",
    label: "Temporary Workaround",
    description: "Provide short-term relief while full repair is planned.",
  },
  {
    value: "rollback",
    label: "Rollback",
    description: "Revert the last change that may have caused the issue.",
  },
  {
    value: "root-cause-permanent-fix",
    label: "Root Cause + Permanent Fix",
    description: "Investigate source and implement a long-term correction.",
  },
  {
    value: "escalation",
    label: "Escalation",
    description: "Forward to specialist/vendor when local team is blocked.",
  },
  {
    value: "compensation-adjustment",
    label: "Compensation / Adjustment",
    description: "Offer fee adjustment or support for severe student impact.",
  },
  {
    value: "policy-process-update",
    label: "Policy / Process Update",
    description: "Improve SOP and checks to prevent repeat complaints.",
  },
  {
    value: "training-communication",
    label: "Training / Communication",
    description: "Inform residents/staff and reinforce expected process.",
  },
];

export const getInitials = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export const percent = (value, total) => (total ? Math.min(100, Math.round((value / total) * 100)) : 0);
