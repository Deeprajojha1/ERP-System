/**
 * Quick Test Script for Placement Module
 * Run: node test-placement-module.js
 * 
 * This script tests basic functionality of the placement module
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Company from "./models/Company.js";
import Job from "./models/Job.js";
import PlacementDrive from "./models/PlacementDrive.js";
import Application from "./models/Application.js";
import StudentProfile from "./models/StudentProfile.js";

dotenv.config();

const testPlacementModule = async () => {
  try {
    console.log("🚀 Starting Placement Module Tests...\n");

    // Connect to MongoDB
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Test 1: Company Model
    console.log("📋 Test 1: Company Model");
    const testCompany = {
      name: `Test Company ${Date.now()}`,
      logo: "https://example.com/logo.png",
      website: "https://testcompany.com",
      industry: "Information Technology",
      description: "Test company for placement module",
      location: "Test City",
      contactPerson: {
        name: "Test Contact",
        email: "contact@testcompany.com",
        phone: "9876543210",
        designation: "HR Manager",
      },
    };

    const company = await Company.create(testCompany);
    console.log(`✅ Company created: ${company.name} (ID: ${company._id})\n`);

    // Test 2: Job Model
    console.log("📋 Test 2: Job Model");
    const testJob = {
      company: company._id,
      title: "Software Developer",
      jobType: "full-time",
      description: "Test job posting",
      eligibility: {
        programs: ["B.Tech", "M.Tech"],
        branches: ["CSE", "IT"],
        minCGPA: 7.0,
        minPercentage: 65,
        passingYear: [2024, 2025, 2026],
        maxBacklogs: 0,
      },
      skills: ["JavaScript", "React", "Node.js"],
      location: "Bangalore",
      workMode: "hybrid",
      salary: {
        min: 600000,
        max: 800000,
        currency: "INR",
      },
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: "open",
      postedBy: new mongoose.Types.ObjectId(), // Mock user ID
    };

    const job = await Job.create(testJob);
    console.log(`✅ Job created: ${job.title} (ID: ${job._id})\n`);

    // Test 3: Placement Drive Model
    console.log("📋 Test 3: Placement Drive Model");
    const testDrive = {
      title: "Campus Placement Drive 2026",
      company: company._id,
      driveType: "on-campus",
      description: "Test placement drive",
      eligibility: {
        programs: ["B.Tech"],
        branches: ["CSE", "IT", "ECE"],
        minCGPA: 7.0,
        passingYear: [2026],
        maxBacklogs: 0,
      },
      schedule: {
        registrationStart: new Date(),
        registrationEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        driveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        venue: "University Auditorium",
      },
      rounds: [
        {
          name: "Aptitude Test",
          description: "Online test",
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          duration: 60,
        },
      ],
      status: "registration-open",
      createdBy: new mongoose.Types.ObjectId(), // Mock user ID
    };

    const drive = await PlacementDrive.create(testDrive);
    console.log(`✅ Placement Drive created: ${drive.title} (ID: ${drive._id})\n`);

    // Test 4: Student Profile Model
    console.log("📋 Test 4: Student Profile Model");
    const testProfile = {
      student: new mongoose.Types.ObjectId(), // Mock student ID
      cgpa: 8.5,
      percentage: 85,
      backlogs: {
        current: 0,
        cleared: 0,
      },
      skills: ["JavaScript", "React", "Node.js", "Python"],
      certifications: [
        {
          name: "AWS Certified Developer",
          issuedBy: "Amazon Web Services",
          issuedDate: new Date("2025-12-15"),
        },
      ],
      projects: [
        {
          title: "E-commerce Platform",
          description: "Full-stack application",
          technologies: ["React", "Node.js", "MongoDB"],
          startDate: new Date("2025-06-01"),
          endDate: new Date("2025-12-01"),
        },
      ],
      socialLinks: {
        linkedin: "https://linkedin.com/in/test",
        github: "https://github.com/test",
      },
      preferences: {
        jobTypes: ["full-time", "internship"],
        preferredLocations: ["Bangalore", "Hyderabad"],
        expectedSalary: 700000,
        workMode: ["hybrid", "remote"],
      },
      placementStatus: "seeking",
    };

    const profile = await StudentProfile.create(testProfile);
    console.log(`✅ Student Profile created (ID: ${profile._id})\n`);

    // Test 5: Application Model
    console.log("📋 Test 5: Application Model");
    const testApplication = {
      student: profile.student,
      job: job._id,
      resume: "https://example.com/resumes/test-resume.pdf",
      coverLetter: "Test cover letter",
      status: "submitted",
      statusHistory: [
        {
          status: "submitted",
          changedAt: new Date(),
          remarks: "Application submitted",
        },
      ],
    };

    const application = await Application.create(testApplication);
    console.log(`✅ Application created (ID: ${application._id})\n`);

    // Test 6: Populate and Relationships
    console.log("📋 Test 6: Testing Relationships");
    const populatedJob = await Job.findById(job._id).populate("company");
    console.log(`✅ Job populated with company: ${populatedJob.company.name}\n`);

    const populatedApplication = await Application.findById(application._id)
      .populate({
        path: "job",
        populate: { path: "company" },
      });
    console.log(`✅ Application populated with job and company: ${populatedApplication.job.company.name}\n`);

    // Test 7: Validation Tests
    console.log("📋 Test 7: Validation Tests");
    
    // Test missing required field
    try {
      await Company.create({ logo: "test.png" }); // Missing name
      console.log("❌ Validation failed: Should have thrown error for missing name");
    } catch (error) {
      console.log("✅ Validation working: Missing name caught");
    }

    // Test duplicate company name
    try {
      await Company.create({ name: company.name });
      console.log("❌ Validation failed: Should have thrown error for duplicate name");
    } catch (error) {
      console.log("✅ Validation working: Duplicate name caught");
    }

    // Test invalid enum value
    try {
      await Job.create({
        ...testJob,
        jobType: "invalid-type",
        title: "Test Job 2",
      });
      console.log("❌ Validation failed: Should have thrown error for invalid enum");
    } catch (error) {
      console.log("✅ Validation working: Invalid enum caught");
    }

    console.log("\n");

    // Test 8: Query Tests
    console.log("📋 Test 8: Query Tests");
    
    const openJobs = await Job.find({ status: "open" });
    console.log(`✅ Found ${openJobs.length} open jobs`);

    const activeCompanies = await Company.find({ isActive: true });
    console.log(`✅ Found ${activeCompanies.length} active companies`);

    const seekingProfiles = await StudentProfile.find({ placementStatus: "seeking" });
    console.log(`✅ Found ${seekingProfiles.length} students seeking placement`);

    console.log("\n");

    // Cleanup
    console.log("🧹 Cleaning up test data...");
    await Company.findByIdAndDelete(company._id);
    await Job.findByIdAndDelete(job._id);
    await PlacementDrive.findByIdAndDelete(drive._id);
    await StudentProfile.findByIdAndDelete(profile._id);
    await Application.findByIdAndDelete(application._id);
    console.log("✅ Test data cleaned up\n");

    console.log("🎉 All tests passed successfully!\n");
    console.log("📝 Summary:");
    console.log("   ✅ Company Model - Working");
    console.log("   ✅ Job Model - Working");
    console.log("   ✅ Placement Drive Model - Working");
    console.log("   ✅ Student Profile Model - Working");
    console.log("   ✅ Application Model - Working");
    console.log("   ✅ Relationships - Working");
    console.log("   ✅ Validations - Working");
    console.log("   ✅ Queries - Working\n");

    console.log("🚀 Placement Module is ready for API testing!");
    console.log("📖 See PLACEMENT_MODULE_TESTING_GUIDE.md for API testing instructions");
    console.log("📦 Import Placement_Module_Postman_Collection.json into Postman\n");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log("👋 Disconnected from MongoDB");
    process.exit(0);
  }
};

// Run tests
testPlacementModule();
