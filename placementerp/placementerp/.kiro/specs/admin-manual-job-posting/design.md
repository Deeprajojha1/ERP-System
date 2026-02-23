# Admin Manual Job Posting - Design Document

## Overview

This feature enables administrators to manually create job postings for campus recruitment opportunities (e.g., companies visiting campus) that appear alongside external jobs from LinkedIn, Indeed, and other API sources. Manual jobs have expiration dates and are automatically hidden from students after expiration while remaining visible to admins for management purposes.

The design integrates seamlessly with the existing external jobs infrastructure, reusing the job display components and application tracking system while adding new backend models, API endpoints, and admin UI components for job creation and management.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
├──────────────────────────┬──────────────────────────────────┤
│   Admin UI               │   Student UI                     │
│   - Add Job Modal        │   - Job Grid (unified view)      │
│   - Job Management       │   - Application Tracking         │
│   - Edit/Delete Actions  │   - "Campus" Badge Display       │
└──────────────────────────┴──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Express)                     │
├─────────────────────────────────────────────────────────────┤
│  Manual Job Routes:                                          │
│  - POST   /api/placement/manual-jobs                        │
│  - GET    /api/placement/manual-jobs                        │
│  - GET    /api/placement/manual-jobs/:id                    │
│  - PUT    /api/placement/manual-jobs/:id                    │
│  - DELETE /api/placement/manual-jobs/:id                    │
│                                                              │
│  Modified Route:                                             │
│  - GET    /api/external-jobs (includes manual jobs)         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer (MongoDB)                     │
├─────────────────────────────────────────────────────────────┤
│  Collections:                                                │
│  - manualjobs (new)                                         │
│  - externaljobapplications (existing, reused)               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Admin Creates Job:**
```
Admin UI → POST /api/placement/manual-jobs → ManualJob.create() → MongoDB
```

**Student Views Jobs:**
```
Student UI → GET /api/external-jobs → 
  [External API Jobs + Active Manual Jobs] → Unified Display
```

**Expiration Check:**
```
GET /api/external-jobs → Filter manual jobs by expiresAt > now() → 
  Return only active jobs to students
```

**Application Tracking:**
```
Student clicks "Apply" → POST /api/placement/external-applications/track →
  ExternalJobApplication.create(source: "Campus") → Track application
```

## Components and Interfaces

### Backend Components

#### 1. ManualJob Model

**File:** `Backend/models/ManualJob.js`

**Schema:**
```javascript
{
  // Basic job information
  title: String (required),
  company: String (required),
  companyLogo: String (optional, URL),
  description: String (required),
  location: String (required),
  
  // Job classification
  jobType: String (required, enum: ["Full-time", "Part-time", "Internship", "Contract"]),
  workMode: String (optional, enum: ["Remote", "Onsite", "Hybrid"]),
  
  // Application details
  applicationUrl: String (required, URL),
  applicationInstructions: String (optional),
  
  // Compensation (optional)
  salary: {
    min: Number,
    max: Number,
    currency: String (default: "INR")
  },
  
  // Skills and requirements
  skills: [String],
  
  // Contact information (optional)
  contactPerson: {
    name: String,
    email: String,
    phone: String
  },
  
  // Expiration
  expiresAt: Date (required, indexed),
  
  // Metadata
  source: String (default: "Campus", immutable),
  postedBy: ObjectId (ref: "User", required),
  postedDate: Date (default: Date.now),
  isActive: Boolean (default: true),
  notes: String (admin-only notes),
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `expiresAt: 1` (for expiration queries)
- `isActive: 1, expiresAt: -1` (for active job queries)
- `postedBy: 1` (for admin queries)

**Virtual Fields:**
- `isExpired`: Computed field returning `Date.now() > expiresAt`
- `status`: Returns "Active" if not expired and isActive=true, otherwise "Expired"

**Methods:**
- `checkExpiration()`: Returns boolean indicating if job is expired
- `toExternalJobFormat()`: Converts ManualJob to format matching external API jobs

#### 2. API Controllers

**File:** `Backend/Controllers/placementController.js`

**New Controller Functions:**

```javascript
// Create manual job (Admin only)
createManualJob(req, res)
  Input: Job details from request body
  Validation:
    - All required fields present
    - expiresAt is in the future
    - applicationUrl is valid URL
    - User is admin
  Output: Created job object
  Status: 201 Created

// Get all manual jobs (Admin only)
getAllManualJobs(req, res)
  Input: Query params (includeExpired: boolean)
  Filter: By expiration status if specified
  Output: Array of manual jobs
  Status: 200 OK

// Get single manual job
getManualJobById(req, res)
  Input: Job ID in params
  Output: Job object
  Status: 200 OK or 404 Not Found

// Update manual job (Admin only)
updateManualJob(req, res)
  Input: Job ID in params, updated fields in body
  Validation:
    - Job exists
    - User is admin
    - If updating expiresAt, must be in future
  Output: Updated job object
  Status: 200 OK

// Delete manual job (Admin only)
deleteManualJob(req, res)
  Input: Job ID in params
  Action: Soft delete (set isActive = false)
  Output: Success message
  Status: 200 OK
```

**Modified Controller Function:**

```javascript
// Get external jobs (existing function)
getExternalJobs(req, res)
  Current: Fetches jobs from external APIs
  Modification: 
    1. Fetch external API jobs (existing logic)
    2. Fetch active manual jobs (expiresAt > now, isActive = true)
    3. Transform manual jobs to external job format
    4. Merge arrays with manual jobs first
    5. Return combined array
  Output: Array of jobs (manual + external)
  Status: 200 OK
```

#### 3. API Routes

**File:** `Backend/Routes/placementRoutes.js`

```javascript
// Manual job routes (all require authentication)
router.post("/manual-jobs", isAuth, isAdmin, createManualJob);
router.get("/manual-jobs", isAuth, isAdmin, getAllManualJobs);
router.get("/manual-jobs/:id", isAuth, getManualJobById);
router.put("/manual-jobs/:id", isAuth, isAdmin, updateManualJob);
router.delete("/manual-jobs/:id", isAuth, isAdmin, deleteManualJob);
```

### Frontend Components

#### 1. Add Job Modal Component

**File:** `Frontend/src/Admin/components/AddJobModal.jsx`

**Props:**
- `isOpen`: Boolean
- `onClose`: Function
- `onJobAdded`: Function (callback after successful creation)

**State:**
```javascript
{
  formData: {
    title: "",
    company: "",
    companyLogo: "",
    description: "",
    location: "",
    jobType: "Full-time",
    workMode: "Onsite",
    applicationUrl: "",
    applicationInstructions: "",
    salary: { min: "", max: "", currency: "INR" },
    skills: [],
    contactPerson: { name: "", email: "", phone: "" },
    expiresAt: "", // Date
    expirationTime: "", // Time
    notes: ""
  },
  errors: {},
  isSubmitting: false
}
```

**Validation Rules:**
- Title: Required, 3-200 characters
- Company: Required, 2-100 characters
- Description: Required, 20-5000 characters
- Location: Required
- Job Type: Required, one of enum values
- Application URL: Required, valid URL format
- Expiration Date: Required, must be future date
- Expiration Time: Required, valid time format
- Company Logo: Optional, valid URL if provided
- Salary: Optional, min < max if both provided
- Skills: Optional, array of strings
- Contact Email: Optional, valid email if provided

**UI Structure:**
```
Modal
├── Header ("Add Campus Job Posting")
├── Form
│   ├── Section: Basic Information
│   │   ├── Job Title (input)
│   │   ├── Company Name (input)
│   │   └── Company Logo URL (input)
│   ├── Section: Job Details
│   │   ├── Location (input)
│   │   ├── Job Type (select)
│   │   ├── Work Mode (select)
│   │   └── Description (textarea)
│   ├── Section: Application
│   │   ├── Application URL (input)
│   │   └── Application Instructions (textarea)
│   ├── Section: Compensation (Optional)
│   │   ├── Min Salary (number)
│   │   ├── Max Salary (number)
│   │   └── Currency (select)
│   ├── Section: Additional Details
│   │   ├── Skills Required (tag input)
│   │   └── Contact Person (name, email, phone)
│   ├── Section: Expiration
│   │   ├── Expiration Date (date picker)
│   │   ├── Expiration Time (time picker)
│   │   └── Admin Notes (textarea)
│   └── Actions
│       ├── Cancel Button
│       └── Publish Button
└── Footer
```

**Methods:**
- `handleInputChange(field, value)`: Updates form data
- `handleSkillAdd(skill)`: Adds skill to array
- `handleSkillRemove(index)`: Removes skill from array
- `validateForm()`: Returns errors object
- `handleSubmit()`: Validates and submits form
- `resetForm()`: Clears all form data

#### 2. Job Management in ExternalJobs Component

**File:** `Frontend/src/Admin/ExternalJobs.jsx`

**Modifications:**

1. **State Additions:**
```javascript
const [showAddModal, setShowAddModal] = useState(false);
const [showExpired, setShowExpired] = useState(false);
const [editingJob, setEditingJob] = useState(null);
```

2. **"Add Job" Button:**
```javascript
// Replace placeholder alert with modal trigger
onClick={() => setShowAddModal(true)}
```

3. **Job Card Enhancements:**
```javascript
// For manual jobs (source === "Campus"), add action buttons:
<div className="job-actions">
  <button onClick={() => handleEdit(job)}>Edit</button>
  <button onClick={() => handleDelete(job)}>Delete</button>
  {job.isExpired && <span className="expired-badge">Expired</span>}
</div>
```

4. **Filter Toggle:**
```javascript
<label>
  <input 
    type="checkbox" 
    checked={showExpired}
    onChange={(e) => setShowExpired(e.target.checked)}
  />
  Show Expired Jobs
</label>
```

5. **Methods:**
```javascript
handleJobAdded(newJob) {
  // Refresh job list
  fetchJobs();
  toast.success("Job posted successfully!");
}

handleEdit(job) {
  setEditingJob(job);
  setShowAddModal(true);
}

handleDelete(job) {
  // Confirm dialog
  if (confirm("Delete this job?")) {
    axios.delete(`${apiBase}/placement/manual-jobs/${job._id}`)
      .then(() => {
        fetchJobs();
        toast.success("Job deleted");
      });
  }
}
```

#### 3. Student View Modifications

**File:** `Frontend/src/components/student/StudentExternalJobs.jsx`

**Modifications:**

1. **Badge Display:**
```javascript
// In job card, show "Campus" badge for manual jobs
<div className="external-job-source-badge campus-badge">
  {job.source === "Campus" ? "Campus" : job.source}
</div>
```

2. **CSS for Campus Badge:**
```css
.campus-badge {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  font-weight: 600;
}
```

3. **Application Tracking:**
```javascript
// No changes needed - existing handleApply() works
// It already tracks applications with source field
```

## Data Models

### ManualJob Document Example

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Software Engineer Intern",
  "company": "Google India",
  "companyLogo": "https://logo.clearbit.com/google.com",
  "description": "We are looking for talented software engineering interns...",
  "location": "Bangalore, India",
  "jobType": "Internship",
  "workMode": "Hybrid",
  "applicationUrl": "https://careers.google.com/apply/12345",
  "applicationInstructions": "Please bring your resume and portfolio",
  "salary": {
    "min": 50000,
    "max": 80000,
    "currency": "INR"
  },
  "skills": ["JavaScript", "React", "Node.js"],
  "contactPerson": {
    "name": "Priya Sharma",
    "email": "priya@college.edu",
    "phone": "+91-9876543210"
  },
  "expiresAt": "2026-03-15T17:00:00.000Z",
  "source": "Campus",
  "postedBy": "507f1f77bcf86cd799439012",
  "postedDate": "2026-02-01T10:00:00.000Z",
  "isActive": true,
  "notes": "Company visiting campus on March 10",
  "createdAt": "2026-02-01T10:00:00.000Z",
  "updatedAt": "2026-02-01T10:00:00.000Z"
}
```

### Unified Job Format (for frontend display)

Both manual jobs and external API jobs are transformed to this format:

```javascript
{
  // Identification
  externalId: String, // For manual: _id, For external: API job ID
  source: String, // "Campus", "LinkedIn", "Indeed", etc.
  
  // Job details
  title: String,
  company: String | { name: String, logo: String },
  companyLogo: String,
  description: String,
  location: String,
  jobType: String,
  workMode: String,
  
  // Application
  externalUrl: String, // applicationUrl for manual jobs
  url: String, // Alias for compatibility
  
  // Optional fields
  salary: { min: Number, max: Number, currency: String },
  skills: [String],
  isRemote: Boolean,
  postedDate: Date,
  
  // Manual job specific
  expiresAt: Date, // Only for manual jobs
  isExpired: Boolean, // Only for manual jobs
  _id: String // MongoDB ID for manual jobs (for edit/delete)
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Manual Job Source Immutability
*For any* manual job created through the admin interface, the source field must always be set to "Campus" and remain immutable throughout the job's lifecycle.

**Validates: Requirements 1.7**

### Property 2: Expiration Filtering for Students
*For any* job with an expiration date in the past (expiresAt < current time), the job must not appear in the student job listing endpoint response.

**Validates: Requirements 2.1, 3.5**

### Property 3: Status Computation Correctness
*For any* manual job, the computed status field must return "Active" if the current time is before expiresAt and isActive is true, and "Expired" if the current time is after expiresAt, regardless of isActive value.

**Validates: Requirements 2.2, 4.5**

### Property 4: Unified Job View Integration
*For any* request to the external jobs endpoint, the response must include both active manual jobs (source="Campus", not expired) and external API jobs in a single unified array, with manual jobs appearing first.

**Validates: Requirements 1.8, 3.1**

### Property 5: Application Tracking Consistency
*For any* job (manual or external), when a student clicks "Apply Now", the system must create an ExternalJobApplication record with the correct source field ("Campus" for manual jobs, API name for external jobs).

**Validates: Requirements 3.4**

### Property 6: Update Operation Data Integrity
*For any* manual job update operation, if the update includes a new expiresAt value, that value must be in the future, and all other required fields must remain valid after the update.

**Validates: Requirements 4.2**

### Property 7: Badge Display Consistency
*For any* job displayed in the student or admin UI, if the job source is "Campus", the badge must display "Campus" with the campus-specific styling (green gradient).

**Validates: Requirements 3.2**

### Property 8: Admin Visibility of All Jobs
*For any* request to the admin manual jobs endpoint with includeExpired=true, the response must include all manual jobs regardless of expiration status, sorted by expiration date.

**Validates: Requirements 4.1**

## Error Handling

### Backend Error Scenarios

#### 1. Validation Errors (400 Bad Request)

**Scenario:** Missing required fields
```javascript
{
  error: "Validation Error",
  message: "Missing required fields",
  details: {
    title: "Title is required",
    expiresAt: "Expiration date is required"
  }
}
```

**Scenario:** Invalid expiration date
```javascript
{
  error: "Validation Error",
  message: "Expiration date must be in the future",
  field: "expiresAt"
}
```

**Scenario:** Invalid URL format
```javascript
{
  error: "Validation Error",
  message: "Invalid URL format",
  field: "applicationUrl"
}
```

#### 2. Authorization Errors (401/403)

**Scenario:** Non-admin tries to create job
```javascript
{
  error: "Forbidden",
  message: "Only administrators can create manual jobs"
}
```

**Scenario:** Unauthenticated request
```javascript
{
  error: "Unauthorized",
  message: "Authentication required"
}
```

#### 3. Not Found Errors (404)

**Scenario:** Job ID doesn't exist
```javascript
{
  error: "Not Found",
  message: "Manual job not found",
  jobId: "507f1f77bcf86cd799439011"
}
```

#### 4. Server Errors (500)

**Scenario:** Database connection failure
```javascript
{
  error: "Internal Server Error",
  message: "Failed to save job. Please try again."
}
```

### Frontend Error Handling

#### Form Validation

```javascript
const validateForm = (formData) => {
  const errors = {};
  
  // Required field validation
  if (!formData.title?.trim()) {
    errors.title = "Job title is required";
  } else if (formData.title.length < 3) {
    errors.title = "Title must be at least 3 characters";
  }
  
  if (!formData.company?.trim()) {
    errors.company = "Company name is required";
  }
  
  if (!formData.description?.trim()) {
    errors.description = "Description is required";
  } else if (formData.description.length < 20) {
    errors.description = "Description must be at least 20 characters";
  }
  
  // URL validation
  if (formData.applicationUrl && !isValidUrl(formData.applicationUrl)) {
    errors.applicationUrl = "Please enter a valid URL";
  }
  
  if (formData.companyLogo && !isValidUrl(formData.companyLogo)) {
    errors.companyLogo = "Please enter a valid URL";
  }
  
  // Date validation
  if (!formData.expiresAt) {
    errors.expiresAt = "Expiration date is required";
  } else if (new Date(formData.expiresAt) <= new Date()) {
    errors.expiresAt = "Expiration date must be in the future";
  }
  
  // Salary validation
  if (formData.salary.min && formData.salary.max) {
    if (Number(formData.salary.min) >= Number(formData.salary.max)) {
      errors.salary = "Minimum salary must be less than maximum";
    }
  }
  
  // Email validation
  if (formData.contactPerson.email && !isValidEmail(formData.contactPerson.email)) {
    errors.contactEmail = "Please enter a valid email";
  }
  
  return errors;
};
```

#### API Error Handling

```javascript
const handleSubmit = async () => {
  try {
    setIsSubmitting(true);
    
    // Validate form
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    // Submit to API
    const response = await axios.post(
      `${apiBase}/placement/manual-jobs`,
      formData,
      { withCredentials: true }
    );
    
    toast.success("Job posted successfully!");
    onJobAdded(response.data.job);
    onClose();
    resetForm();
    
  } catch (error) {
    console.error("Failed to create job:", error);
    
    if (error.response?.status === 400) {
      // Validation error from backend
      const backendErrors = error.response.data.details || {};
      setErrors(backendErrors);
      toast.error(error.response.data.message || "Validation failed");
    } else if (error.response?.status === 403) {
      toast.error("You don't have permission to create jobs");
    } else if (error.response?.status === 401) {
      toast.error("Please login to continue");
    } else {
      toast.error("Failed to create job. Please try again.");
    }
  } finally {
    setIsSubmitting(false);
  }
};
```

#### Network Error Handling

```javascript
// In ExternalJobs.jsx
const fetchJobs = async () => {
  try {
    setLoadState(ADMIN_LOAD_STATES.PENDING);
    const response = await axios.get(`${apiBase}/external-jobs`, {
      params: filters,
      withCredentials: true,
      timeout: 10000 // 10 second timeout
    });
    setJobs(response.data?.jobs || []);
    setLoadState(ADMIN_LOAD_STATES.SUCCESS);
  } catch (error) {
    console.error("Fetch jobs failed:", error);
    
    if (error.code === 'ECONNABORTED') {
      toast.error("Request timed out. Please check your connection.");
    } else if (!error.response) {
      toast.error("Network error. Please check your connection.");
    } else {
      toast.error(error.response?.data?.message || "Failed to load jobs");
    }
    
    setLoadState(ADMIN_LOAD_STATES.FAILURE);
  }
};
```

### Error Recovery Strategies

1. **Form Validation Errors:**
   - Display inline error messages below each field
   - Highlight invalid fields with red border
   - Prevent form submission until all errors resolved
   - Preserve user input during validation

2. **API Errors:**
   - Show toast notification with error message
   - Log detailed error to console for debugging
   - Provide retry button for transient failures
   - Maintain form state so user doesn't lose data

3. **Network Errors:**
   - Show user-friendly message about connectivity
   - Implement automatic retry with exponential backoff
   - Cache data locally when possible
   - Provide manual refresh button

4. **Authorization Errors:**
   - Redirect to login page if session expired
   - Show clear message about permission requirements
   - Disable admin-only features for non-admin users

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests** verify specific examples, edge cases, and error conditions
- **Property tests** verify universal properties across all inputs
- Both are complementary and necessary for complete validation

### Unit Testing

Unit tests focus on specific scenarios and edge cases:

**Backend Unit Tests:**
- Test ManualJob model validation with specific invalid inputs
- Test API endpoints with specific request payloads
- Test error responses for specific failure scenarios
- Test date/time parsing edge cases (timezone handling, DST)
- Test URL validation with specific malformed URLs
- Test authentication/authorization with specific user roles

**Frontend Unit Tests:**
- Test form validation with specific invalid inputs
- Test modal open/close behavior
- Test button click handlers
- Test error message display
- Test date picker with specific dates
- Test skill tag add/remove functionality

**Integration Tests:**
- Test complete job creation flow from form to database
- Test job display in both admin and student views
- Test application tracking for manual jobs
- Test job update and delete operations

### Property-Based Testing

Property tests verify universal correctness properties across randomized inputs. Each property test should run a minimum of 100 iterations.

**Property-Based Testing Library:** Use `fast-check` for JavaScript/TypeScript property-based testing.

**Test Configuration:**
```javascript
import fc from 'fast-check';

// Each property test runs 100+ iterations
fc.assert(
  fc.property(/* generators */, (/* inputs */) => {
    // Property assertion
  }),
  { numRuns: 100 }
);
```

**Property Test Tags:**
Each property test must include a comment tag referencing the design document property:
```javascript
// Feature: admin-manual-job-posting, Property 1: Manual Job Source Immutability
test('manual job source is always Campus', () => {
  fc.assert(
    fc.property(manualJobGenerator(), (jobData) => {
      const job = new ManualJob(jobData);
      expect(job.source).toBe('Campus');
    }),
    { numRuns: 100 }
  );
});
```

**Property Tests to Implement:**

1. **Property 1: Source Immutability**
   - Generate random manual job data
   - Create job and verify source is "Campus"
   - Attempt to update source and verify it remains "Campus"
   - Tag: `Feature: admin-manual-job-posting, Property 1: Manual Job Source Immutability`

2. **Property 2: Expiration Filtering**
   - Generate random jobs with various expiration dates
   - Query student endpoint
   - Verify no expired jobs in response
   - Tag: `Feature: admin-manual-job-posting, Property 2: Expiration Filtering for Students`

3. **Property 3: Status Computation**
   - Generate random jobs with various expiration dates and isActive values
   - Compute status for each
   - Verify status matches expected value based on expiration
   - Tag: `Feature: admin-manual-job-posting, Property 3: Status Computation Correctness`

4. **Property 4: Unified View**
   - Generate random manual and external jobs
   - Query external jobs endpoint
   - Verify response includes both types with manual jobs first
   - Tag: `Feature: admin-manual-job-posting, Property 4: Unified Job View Integration`

5. **Property 5: Application Tracking**
   - Generate random jobs (manual and external)
   - Simulate student application
   - Verify ExternalJobApplication created with correct source
   - Tag: `Feature: admin-manual-job-posting, Property 5: Application Tracking Consistency`

6. **Property 6: Update Integrity**
   - Generate random job updates
   - Apply updates to jobs
   - Verify all required fields remain valid
   - Verify future expiresAt constraint
   - Tag: `Feature: admin-manual-job-posting, Property 6: Update Operation Data Integrity`

7. **Property 7: Badge Display**
   - Generate random jobs with various sources
   - Render job cards
   - Verify badge text matches source
   - Verify "Campus" badge has correct styling
   - Tag: `Feature: admin-manual-job-posting, Property 7: Badge Display Consistency`

8. **Property 8: Admin Visibility**
   - Generate random jobs (active and expired)
   - Query admin endpoint with includeExpired=true
   - Verify all jobs returned regardless of expiration
   - Tag: `Feature: admin-manual-job-posting, Property 8: Admin Visibility of All Jobs`

### Test Data Generators

**For Property-Based Tests:**

```javascript
// Generator for valid manual job data
const manualJobGenerator = () => fc.record({
  title: fc.string({ minLength: 3, maxLength: 200 }),
  company: fc.string({ minLength: 2, maxLength: 100 }),
  description: fc.string({ minLength: 20, maxLength: 5000 }),
  location: fc.string({ minLength: 2, maxLength: 100 }),
  jobType: fc.constantFrom('Full-time', 'Part-time', 'Internship', 'Contract'),
  applicationUrl: fc.webUrl(),
  expiresAt: fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
  postedBy: fc.hexaString({ minLength: 24, maxLength: 24 })
});

// Generator for expired jobs
const expiredJobGenerator = () => fc.record({
  ...manualJobGenerator(),
  expiresAt: fc.date({ min: new Date(0), max: new Date(Date.now() - 1000) })
});

// Generator for job updates
const jobUpdateGenerator = () => fc.record({
  title: fc.option(fc.string({ minLength: 3, maxLength: 200 })),
  description: fc.option(fc.string({ minLength: 20, maxLength: 5000 })),
  expiresAt: fc.option(fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) })),
  salary: fc.option(fc.record({
    min: fc.nat(1000000),
    max: fc.nat(1000000)
  }))
});
```

### Test Coverage Goals

- **Backend:** 90%+ code coverage
  - Models: 100% (critical business logic)
  - Controllers: 90%+
  - Routes: 100%
  
- **Frontend:** 80%+ code coverage
  - Components: 80%+
  - Form validation: 100%
  - API integration: 90%+

### Testing Checklist

**Before Deployment:**
- [ ] All unit tests pass
- [ ] All property tests pass (100+ iterations each)
- [ ] Integration tests pass
- [ ] Manual testing of complete user flows
- [ ] Error scenarios tested
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsive testing
- [ ] Accessibility testing (keyboard navigation, screen readers)
- [ ] Performance testing (job list with 100+ jobs)

## Implementation Notes

### Technology Stack

**Backend:**
- Node.js with Express.js
- MongoDB with Mongoose ODM
- Existing authentication middleware (isAuth, isAdmin)

**Frontend:**
- React 18+
- Axios for HTTP requests
- React Hot Toast for notifications
- React Icons for UI icons
- Date picker library: `react-datepicker` (to be installed)

### Dependencies to Install

**Backend:**
```bash
# No new dependencies needed - using existing stack
```

**Frontend:**
```bash
npm install react-datepicker
npm install --save-dev @types/react-datepicker  # If using TypeScript
```

### Database Indexes

Critical indexes for performance:

```javascript
// ManualJob collection
db.manualjobs.createIndex({ expiresAt: 1 });
db.manualjobs.createIndex({ isActive: 1, expiresAt: -1 });
db.manualjobs.createIndex({ postedBy: 1 });
db.manualjobs.createIndex({ source: 1 }); // For filtering by source
```

### Performance Considerations

1. **Query Optimization:**
   - Use indexes for expiration queries
   - Limit fields returned in list queries
   - Paginate results if job count exceeds 100

2. **Caching Strategy:**
   - Cache external API jobs for 1 hour
   - Don't cache manual jobs (need real-time expiration)
   - Cache job count for dashboard

3. **Frontend Optimization:**
   - Lazy load job images
   - Virtualize job list if count > 50
   - Debounce search input (300ms)
   - Memoize filtered job list

### Security Considerations

1. **Input Validation:**
   - Sanitize all user inputs to prevent XSS
   - Validate URLs to prevent SSRF attacks
   - Limit description length to prevent DoS

2. **Authorization:**
   - Verify admin role on all write operations
   - Check job ownership for edit/delete (if needed)
   - Rate limit job creation (max 10 per hour per admin)

3. **Data Protection:**
   - Don't expose admin notes to students
   - Don't expose postedBy user details
   - Sanitize HTML in descriptions

### Accessibility Requirements

1. **Keyboard Navigation:**
   - All form fields accessible via Tab
   - Modal closable with Escape key
   - Buttons have visible focus states

2. **Screen Reader Support:**
   - Form labels properly associated with inputs
   - Error messages announced to screen readers
   - Loading states announced
   - Button purposes clearly labeled

3. **Visual Accessibility:**
   - Color contrast ratio ≥ 4.5:1
   - Don't rely solely on color for status
   - Text size minimum 14px
   - Touch targets minimum 44x44px

### Migration Strategy

Since this is a new feature, no data migration is needed. However:

1. **Initial Setup:**
   - Create ManualJob collection with indexes
   - Add admin role check to existing user roles
   - Deploy backend before frontend

2. **Rollout Plan:**
   - Phase 1: Deploy backend API (no UI changes)
   - Phase 2: Deploy admin UI (Add Job button)
   - Phase 3: Monitor for issues
   - Phase 4: Announce feature to admins

3. **Rollback Plan:**
   - If issues found, hide "Add Job" button via feature flag
   - Manual jobs already created remain in database
   - Can be re-enabled after fixes

### Monitoring and Logging

**Metrics to Track:**
- Number of manual jobs created per day
- Average time to create a job
- Number of expired jobs
- Student application rate for manual vs external jobs
- API error rates
- Form validation error frequency

**Logging:**
```javascript
// Log job creation
logger.info('Manual job created', {
  jobId: job._id,
  adminId: req.user._id,
  company: job.company,
  expiresAt: job.expiresAt
});

// Log job expiration
logger.info('Job expired', {
  jobId: job._id,
  company: job.company,
  expiredAt: new Date()
});

// Log errors
logger.error('Failed to create job', {
  error: error.message,
  adminId: req.user._id,
  formData: sanitizedFormData
});
```

## Future Enhancements

These features are out of scope for the initial implementation but may be added later:

1. **Email Notifications:**
   - Notify students when new campus jobs are posted
   - Notify admins when jobs are about to expire
   - Send reminders to extend expiring jobs

2. **Bulk Operations:**
   - Upload multiple jobs via CSV
   - Bulk edit expiration dates
   - Bulk delete expired jobs

3. **Job Templates:**
   - Save frequently used job templates
   - Quick create from template
   - Template library for common companies

4. **Analytics Dashboard:**
   - View application statistics per job
   - Compare manual vs external job performance
   - Track student engagement metrics

5. **Advanced Filtering:**
   - Filter by skills required
   - Filter by salary range
   - Filter by work mode (remote/hybrid/onsite)
   - Save filter presets

6. **Job Approval Workflow:**
   - Draft status for jobs
   - Require approval before publishing
   - Version history for job edits

7. **Integration with Calendar:**
   - Sync with college placement calendar
   - Auto-create jobs from calendar events
   - Show campus visit dates

8. **Student Preferences:**
   - Allow students to set job preferences
   - Personalized job recommendations
   - Email digest of matching jobs

## Conclusion

This design provides a comprehensive solution for manual job posting that integrates seamlessly with the existing external jobs infrastructure. The implementation focuses on:

- **Simplicity:** Reusing existing components and patterns
- **Correctness:** Property-based testing ensures universal properties hold
- **Usability:** Intuitive admin interface with clear validation
- **Performance:** Efficient queries with proper indexing
- **Security:** Proper authorization and input validation
- **Maintainability:** Clear separation of concerns and comprehensive testing

The feature enables administrators to quickly post campus recruitment opportunities while ensuring students see only active, relevant jobs alongside external API listings.
