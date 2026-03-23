import mongoose from "mongoose";
import dotenv from "dotenv";
import Group from "../models/Group.js";
import Batch from "../models/feeBatch.js";
import Department from "../models/Department.js";
import Faculty from "../models/Faculty.js";
import Course from "../models/Course.js";

dotenv.config();

const APPLY = process.argv.includes("--apply");
const COUNT_ARG_INDEX = process.argv.indexOf("--count");
const RAW_COUNT = COUNT_ARG_INDEX > -1 ? Number(process.argv[COUNT_ARG_INDEX + 1]) : 6;
const TARGET_COUNT = Number.isFinite(RAW_COUNT)
  ? Math.min(10, Math.max(5, Math.floor(RAW_COUNT)))
  : 6;

const toId = (value) => String(value || "").trim();

const slug = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

const run = async () => {
  const mongoUri = String(process.env.MONGODB_URI || "").trim();
  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in environment");
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  const [departments, faculties, batches, courses, existingGroups] = await Promise.all([
    Department.find({ isDeleted: { $ne: true } }).select("_id name code").lean(),
    Faculty.find({ isDeleted: { $ne: true } }).select("_id department").lean(),
    Batch.find({}).select("_id departmentId batchYear batchStartYear").lean(),
    Course.find({ isDeleted: { $ne: true } }).select("_id department").lean(),
    Group.find({ name: /^DUMMY-GRP-/i }).select("_id name department batchId").lean(),
  ]);

  const facultyByDept = new Map();
  for (const faculty of faculties) {
    const deptId = toId(faculty.department);
    if (!deptId) continue;
    if (!facultyByDept.has(deptId)) facultyByDept.set(deptId, []);
    facultyByDept.get(deptId).push(faculty);
  }

  const batchByDept = new Map();
  for (const batch of batches) {
    const deptId = toId(batch.departmentId);
    if (!deptId) continue;
    if (!batchByDept.has(deptId)) batchByDept.set(deptId, []);
    batchByDept.get(deptId).push(batch);
  }
  for (const entry of batchByDept.values()) {
    entry.sort((a, b) => {
      const aStart = Number(a.batchStartYear || 0);
      const bStart = Number(b.batchStartYear || 0);
      if (aStart !== bStart) return bStart - aStart;
      return String(b.batchYear || "").localeCompare(String(a.batchYear || ""));
    });
  }

  const courseByDept = new Map();
  for (const course of courses) {
    const deptId = toId(course.department);
    if (!deptId) continue;
    if (!courseByDept.has(deptId)) courseByDept.set(deptId, []);
    courseByDept.get(deptId).push(course);
  }

  const existingNameSet = new Set(existingGroups.map((g) => String(g.name || "")));

  const candidates = [];
  for (const dept of departments) {
    const deptId = toId(dept._id);
    const deptFaculties = facultyByDept.get(deptId) || [];
    const deptBatches = batchByDept.get(deptId) || [];
    if (!deptFaculties.length || !deptBatches.length) continue;

    for (const batch of deptBatches) {
      candidates.push({
        dept,
        batch,
        faculties: deptFaculties,
        courses: courseByDept.get(deptId) || [],
      });
    }
  }

  if (!candidates.length) {
    console.log("No eligible department+batch combinations found. Ensure batches and faculty exist.");
    return;
  }

  const toCreate = [];
  let serial = 1;
  let guard = 0;
  const maxGuard = TARGET_COUNT * 20;

  while (toCreate.length < TARGET_COUNT && guard < maxGuard) {
    guard += 1;
    const candidate = candidates[(guard - 1) % candidates.length];
    const deptCode = slug(candidate.dept.code || candidate.dept.name || "DEPT");
    const batchText = slug(candidate.batch.batchYear || "BATCH");
    const name = `DUMMY-GRP-${deptCode}-${batchText}-${String(serial).padStart(2, "0")}`;
    serial += 1;

    if (existingNameSet.has(name)) continue;

    const coordinator = candidate.faculties[(serial + guard) % candidate.faculties.length];
    const courseIds = candidate.courses.slice(0, 2).map((c) => c._id);

    toCreate.push({
      name,
      studentIds: [],
      department: candidate.dept._id,
      batchId: candidate.batch._id,
      branch: "General",
      coordinator: coordinator._id,
      courseIds,
      roomNo: `D-${String(100 + serial)}`,
      scheduleSlots: {},
      courseFaculty: [],
      batchYear: candidate.batch.batchYear,
      departmentName: candidate.dept.name,
    });

    existingNameSet.add(name);
  }

  console.log("\nDummy Group Seed Summary");
  console.log("------------------------");
  console.log(`Mode          : ${APPLY ? "APPLY" : "DRY RUN"}`);
  console.log(`Target        : ${TARGET_COUNT}`);
  console.log(`Planned create: ${toCreate.length}`);

  if (!toCreate.length) {
    console.log("Nothing to create. Existing dummy groups may already satisfy the target.");
    return;
  }

  console.log("\nPreview:");
  for (const row of toCreate.slice(0, 15)) {
    console.log(`- ${row.name} | ${row.departmentName} | ${row.batchYear}`);
  }

  if (!APPLY) {
    console.log("\nNo documents were modified. Run with --apply to create groups.");
    return;
  }

  let createdCount = 0;
  for (const payload of toCreate) {
    const created = await Group.create({
      name: payload.name,
      studentIds: payload.studentIds,
      department: payload.department,
      batchId: payload.batchId,
      branch: payload.branch,
      coordinator: payload.coordinator,
      courseIds: payload.courseIds,
      roomNo: payload.roomNo,
      scheduleSlots: payload.scheduleSlots,
      courseFaculty: payload.courseFaculty,
    });

    await Batch.findByIdAndUpdate(payload.batchId, {
      $addToSet: { groupId: created._id },
    });

    createdCount += 1;
  }

  console.log(`\nCreated groups: ${createdCount}`);
};

(async () => {
  try {
    await run();
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error?.message || error);
    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }
    process.exit(1);
  }
})();
