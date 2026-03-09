import HostelOutpass from "../models/hostelOutpassModel.js";
import HostelAllocation from "../models/hostelAllocationModel.js";
import Student from "../models/Student.js";
import {
  signOutpassQrToken,
  isOutpassQrPayload,
  getOutpassQrUsability,
} from "../utils/outpassQr.js";

const CATEGORY_OPTIONS = new Set([
  "Holiday",
  "Weekend",
  "Festival",
  "Medical",
  "Emergency",
  "Other",
]);

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const parseClockTime = (value) => {
  const raw = String(value || "").trim();
  const match = TIME_PATTERN.exec(raw);
  if (!match) return null;
  return {
    label: raw,
    hours: Number(match[1]),
    minutes: Number(match[2]),
  };
};

const getStudentProfileByUser = async (userId) =>
  Student.findOne({ user: userId })
    .select("_id enrollmentNumber program academicYear department user")
    .populate("user", "name email")
    .populate("department", "name");

export const createMyHostelOutpass = async (req, res) => {
  try {
    const studentProfile = await getStudentProfileByUser(req.userId);
    if (!studentProfile?._id) {
      return res.status(404).json({ message: "Student profile not found." });
    }

    const activeAllocation = await HostelAllocation.findOne({
      student: studentProfile._id,
      status: "Active",
    })
      .select("_id hostel room")
      .populate("room", "roomNumber");

    if (!activeAllocation?._id) {
      return res.status(400).json({
        message: "No active hostel allocation found for this student.",
      });
    }

    // Prevent multiple overlapping open requests/passes for the same student.
    const now = new Date();
    const existingOpenOutpass = await HostelOutpass.findOne({
      student: studentProfile._id,
      $or: [
        { status: "Pending" },
        { status: { $in: ["Approved", "Exited"] }, dateTo: { $gt: now } },
      ],
    })
      .select("_id status dateFrom dateTo")
      .sort({ updatedAt: -1 });

    if (existingOpenOutpass?._id) {
      return res.status(400).json({
        message:
          "You already have an open outpass request/pass. Please complete or wait for it to expire before creating a new one.",
      });
    }

    const category = String(req.body?.category || "").trim();
    const outingClock = parseClockTime(req.body?.outingTime);
    const incomingClock = parseClockTime(req.body?.incomingTime);
    const reason = String(req.body?.reason || "").trim();
    const destination = String(req.body?.destination || "").trim();
    const emergencyContact = String(req.body?.emergencyContact || "").trim();
    const parentContact = String(req.body?.parentContact || "").trim();

    if (!CATEGORY_OPTIONS.has(category)) {
      return res.status(400).json({
        message:
          "Invalid category. Allowed: Holiday, Weekend, Festival, Medical, Emergency, Other.",
      });
    }
    if (!outingClock || !incomingClock) {
      return res.status(400).json({
        message: "Valid outingTime and incomingTime are required in HH:mm format.",
      });
    }

    const applyDate = new Date();
    const dateFrom = new Date(applyDate);
    dateFrom.setHours(outingClock.hours, outingClock.minutes, 0, 0);

    const dateTo = new Date(applyDate);
    dateTo.setHours(incomingClock.hours, incomingClock.minutes, 0, 0);
    if (dateTo.getTime() <= dateFrom.getTime()) {
      dateTo.setDate(dateTo.getDate() + 1);
    }

    const maxDurationMs = 24 * 60 * 60 * 1000;
    const durationMs = dateTo.getTime() - dateFrom.getTime();
    if (durationMs <= 0 || durationMs > maxDurationMs) {
      return res.status(400).json({
        message: "Outpass duration must be greater than 0 and maximum 24 hours.",
      });
    }
    if (!destination || destination.length < 3) {
      return res.status(400).json({
        message: "Destination is required (min 3 characters).",
      });
    }

    const outpass = await HostelOutpass.create({
      student: studentProfile._id,
      hostel: activeAllocation.hostel,
      room: activeAllocation.room,
      formDate: applyDate,
      studentName: studentProfile?.user?.name || "",
      branchName: studentProfile?.department?.name || "",
      programName: String(studentProfile?.program || ""),
      roomNumber: activeAllocation?.room?.roomNumber || "",
      category,
      destination,
      emergencyContact,
      parentContact,
      dateFrom,
      dateTo,
      outingTime: outingClock.label,
      incomingTime: incomingClock.label,
      reason,
      status: "Pending",
      logs: [
        {
          action: "Pending",
          by: studentProfile?.enrollmentNumber || "Student",
          remarks: "Request submitted",
        },
      ],
    });

    return res.status(201).json({
      message: "Holiday request submitted successfully.",
      outpass,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Failed to submit holiday request." });
  }
};

export const getMyHostelOutpasses = async (req, res) => {
  try {
    const studentProfile = await getStudentProfileByUser(req.userId);
    if (!studentProfile?._id) {
      return res.status(404).json({ message: "Student profile not found." });
    }

    const outpasses = await HostelOutpass.find({ student: studentProfile._id })
      .sort({ createdAt: -1 })
      .populate("hostel", "name type")
      .populate("room", "roomNumber floorNumber");

    return res.status(200).json({ outpasses });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Failed to fetch holiday requests." });
  }
};

export const getMyActiveOutpassQr = async (req, res) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });

    const studentProfile = await getStudentProfileByUser(req.userId);
    if (!studentProfile?._id) {
      return res.status(404).json({ message: "Student profile not found." });
    }

    const now = new Date();
    const activeCandidates = await HostelOutpass.find({
      student: studentProfile._id,
      "qr.active": true,
    })
      .select("status updatedAt qr.issuedAt qr.expiresAt qr.scanCount qr.maxScans qr.active qr.lastScannedAt qr.destroyedAt +qr.key")
      .sort({ updatedAt: -1 });

    const invalidForTermination = [];
    const validCandidate = activeCandidates.find((item) => {
      const check = getOutpassQrUsability(item, now);
      if (!check.usable && ["next_day", "max_scans", "expired", "invalid_status"].includes(check.reason)) {
        invalidForTermination.push(item._id);
      }
      return check.usable;
    });

    if (invalidForTermination.length) {
      await HostelOutpass.updateMany(
        { _id: { $in: invalidForTermination } },
        {
          $set: {
            "qr.active": false,
            "qr.destroyedAt": now,
            "qr.key": "",
          },
        }
      );
    }

    let outpass = validCandidate?._id
      ? await HostelOutpass.findById(validCandidate._id)
          .select("+qr.key")
          .populate("hostel", "name type")
          .populate("room", "roomNumber floorNumber")
      : null;

    // QR must be created only during explicit warden approval.
    // Do not auto-generate a new QR from this read endpoint.

    if (!outpass?._id) {
      return res.status(404).json({ message: "No active outpass QR found." });
    }

    const qrCheck = getOutpassQrUsability(outpass, now);
    if (!qrCheck.usable) {
      if (["next_day", "max_scans", "expired", "invalid_status"].includes(qrCheck.reason)) {
        outpass.qr.active = false;
        outpass.qr.destroyedAt = now;
        outpass.qr.key = "";
        await outpass.save();
      }
      return res.status(404).json({ message: "No active outpass QR found." });
    }
    const scanCount = qrCheck.scanCount;
    const maxScans = qrCheck.maxScans;

    const payload = {
      outpassId: outpass._id,
      qrKey: outpass?.qr?.key,
      expiresAt: outpass?.qr?.expiresAt,
    };

    if (!isOutpassQrPayload({ type: "HOSTEL_OUTPASS_QR", ...payload })) {
      return res.status(400).json({ message: "Invalid QR metadata on outpass." });
    }

    const qrToken = signOutpassQrToken(payload);

    return res.status(200).json({
      qrToken,
      expiresAt: outpass?.qr?.expiresAt || null,
      outpass: {
        id: outpass._id,
        category: outpass.category,
        destination: outpass.destination,
        reason: outpass.reason,
        status: outpass.status,
        dateFrom: outpass.dateFrom,
        dateTo: outpass.dateTo,
        outingTime: outpass.outingTime || "",
        incomingTime: outpass.incomingTime || "",
        scanCount,
        maxScans,
        hostel: outpass?.hostel
          ? { id: outpass.hostel?._id, name: outpass.hostel?.name || "", type: outpass.hostel?.type || "" }
          : null,
        room: outpass?.room
          ? { id: outpass.room?._id, roomNumber: outpass.room?.roomNumber || "", floorNumber: outpass.room?.floorNumber || null }
          : null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch active outpass QR." });
  }
};
