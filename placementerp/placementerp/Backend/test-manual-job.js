import mongoose from "mongoose";
import dotenv from "dotenv";
import ManualJob from "./models/ManualJob.js";

dotenv.config();

const testManualJob = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");

    console.log("\nTesting ManualJob creation...");
    
    const testJob = {
      title: "Test Software Engineer",
      company: "Test Company",
      description: "This is a test job description for testing purposes only.",
      location: "Test Location, India",
      jobType: "full-time",
      workMode: "onsite",
      applicationUrl: "https://example.com/apply",
      expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      postedBy: new mongoose.Types.ObjectId(), // Create a test ObjectId
      source: "Campus",
    };

    console.log("Creating job with data:", testJob);

    const job = await ManualJob.create(testJob);
    
    console.log("\n✅ Job created successfully!");
    console.log("Job ID:", job._id);
    console.log("Job Title:", job.title);
    console.log("Company:", job.company);
    console.log("Expiration:", job.expirationDate);
    
    console.log("\nTesting toExternalJobFormat method...");
    const formatted = job.toExternalJobFormat();
    console.log("Formatted job:", JSON.stringify(formatted, null, 2));

    console.log("\nCleaning up test job...");
    await ManualJob.deleteOne({ _id: job._id });
    console.log("✅ Test job deleted");

    console.log("\n✅ All tests passed!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
};

testManualJob();
