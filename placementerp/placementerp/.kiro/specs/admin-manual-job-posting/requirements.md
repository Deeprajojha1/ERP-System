# Admin Manual Job Posting - Requirements

## Feature Overview
Allow administrators to manually add job postings (e.g., companies visiting campus) that appear alongside external jobs from APIs. These jobs should have expiration dates and be visible to students in the Jobs section.

## User Stories

### 1. Admin Can Add Manual Jobs
**As an** administrator  
**I want to** manually add job postings for companies visiting campus  
**So that** students can see these opportunities alongside external jobs from LinkedIn/Indeed

**Acceptance Criteria:**
- Admin can access "Add Job" button in External Jobs section
- Admin can fill in job details (title, company, description, location, etc.)
- Admin can set an expiration date and time for the job posting
- Admin can set job type (Full-time, Internship, Part-time, Contract)
- Admin can add company logo URL
- Admin can add external application URL (if company has online application)
- Job is saved with source marked as "Campus" or "Internal"
- Job appears in both Admin and Student External Jobs views

### 2. Jobs Expire Automatically
**As an** administrator  
**I want** jobs to automatically expire after the set date/time  
**So that** students don't see outdated job postings

**Acceptance Criteria:**
- Jobs with expiration date/time in the past are automatically hidden from student view
- Expired jobs are marked as "Expired" in admin view
- Admin can still see expired jobs with a filter
- System checks expiration when loading jobs

### 3. Students See Manual Jobs
**As a** student  
**I want to** see campus job postings alongside external jobs  
**So that** I can apply to companies visiting the college

**Acceptance Criteria:**
- Manual jobs appear in the same grid as external jobs
- Manual jobs show "Campus" or "Internal" badge instead of "LinkedIn"/"Indeed"
- Students can click "Apply Now" on manual jobs
- Application tracking works the same way as external jobs
- Expired jobs are not visible to students

### 4. Admin Can Manage Manual Jobs
**As an** administrator  
**I want to** edit and delete manual job postings  
**So that** I can keep job information accurate and up-to-date

**Acceptance Criteria:**
- Admin can view list of all manual jobs (active and expired)
- Admin can edit job details including expiration date
- Admin can delete manual jobs
- Admin can extend expiration date for active jobs
- Admin can see job status (Active, Expired)

## Data Requirements

### Manual Job Fields
- **Required Fields:**
  - Job Title
  - Company Name
  - Description
  - Location
  - Job Type (Full-time, Internship, Part-time, Contract)
  - Expiration Date
  - Expiration Time
  - Application URL or Instructions

- **Optional Fields:**
  - Company Logo URL
  - Salary Range (Min, Max, Currency)
  - Skills Required
  - Work Mode (Remote, Onsite, Hybrid)
  - Contact Person (Name, Email, Phone)
  - Additional Notes

### Job Status
- **Active**: Current date/time is before expiration
- **Expired**: Current date/time is after expiration
- **Draft**: Job saved but not published yet (optional)

## Technical Requirements

### Backend
1. Create new model: `ManualJob` or extend `ExternalJobApplication` model
2. Add API endpoints:
   - `POST /api/placement/manual-jobs` - Create manual job
   - `GET /api/placement/manual-jobs` - Get all manual jobs (admin)
   - `GET /api/placement/manual-jobs/:id` - Get specific job
   - `PUT /api/placement/manual-jobs/:id` - Update job
   - `DELETE /api/placement/manual-jobs/:id` - Delete job
3. Modify existing endpoint:
   - `GET /api/external-jobs` - Include active manual jobs in response

### Frontend
1. **Admin Side:**
   - Add "Add Job" button in External Jobs page
   - Create modal/form for adding jobs
   - Add date/time picker for expiration
   - Show manual jobs with edit/delete actions
   - Add filter to show/hide expired jobs

2. **Student Side:**
   - Display manual jobs alongside external jobs
   - Show "Campus" badge for manual jobs
   - Handle application tracking for manual jobs

## Business Rules

1. **Expiration Logic:**
   - Jobs expire at the exact date and time specified
   - Expired jobs are hidden from students immediately
   - Admin can extend expiration by editing the job

2. **Application Tracking:**
   - Manual jobs use the same tracking system as external jobs
   - Source is marked as "Campus" or "Internal"
   - Admin can see which students applied

3. **Validation:**
   - Expiration date must be in the future when creating
   - All required fields must be filled
   - Application URL must be valid (if provided)

4. **Display Priority:**
   - Manual jobs appear at the top of the job list
   - Sorted by expiration date (soonest first)
   - External API jobs appear below manual jobs

## UI/UX Requirements

### Admin - Add Job Form
```
┌─────────────────────────────────────────┐
│  Add Campus Job Posting                 │
├─────────────────────────────────────────┤
│  Job Title: [________________]          │
│  Company Name: [________________]       │
│  Company Logo URL: [________________]   │
│  Location: [________________]           │
│  Job Type: [Dropdown ▼]                 │
│  Work Mode: [Dropdown ▼]                │
│                                         │
│  Description:                           │
│  [_________________________________]    │
│  [_________________________________]    │
│  [_________________________________]    │
│                                         │
│  Application URL: [________________]    │
│                                         │
│  Salary Range (Optional):               │
│  Min: [______] Max: [______] INR        │
│                                         │
│  Skills Required: [________________]    │
│                                         │
│  Expiration Date: [📅 DD/MM/YYYY]      │
│  Expiration Time: [🕐 HH:MM]           │
│                                         │
│  [Cancel]  [Save as Draft]  [Publish]  │
└─────────────────────────────────────────┘
```

### Student - Job Card Display
```
┌─────────────────────────────────────┐
│ [Campus] 🏢                         │
│                                     │
│ Software Engineer                   │
│ Google India                        │
│                                     │
│ Location: Bangalore                 │
│ Type: Full-Time                     │
│ Expires: 25 Feb 2026, 5:00 PM      │
│                                     │
│ Description: We are looking for...  │
│                                     │
│ [Apply Now →]                       │
└─────────────────────────────────────┘
```

## Success Metrics

1. **Admin Adoption:**
   - Number of manual jobs posted per month
   - Average time to post a job (should be < 3 minutes)

2. **Student Engagement:**
   - Click-through rate on manual jobs vs external jobs
   - Number of applications to manual jobs

3. **System Performance:**
   - Jobs expire automatically without manual intervention
   - No expired jobs visible to students

## Future Enhancements (Out of Scope)

1. Email notifications to students when new campus jobs are posted
2. Bulk upload of jobs via CSV
3. Job templates for recurring companies
4. Automatic job posting from company portal
5. Integration with college placement calendar

## Dependencies

- Existing External Jobs feature
- Existing Application Tracking system
- Date/Time picker library (e.g., react-datepicker)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Expired jobs still showing | High | Add automated tests for expiration logic |
| Admin forgets to set expiration | Medium | Make expiration date required, show warning |
| Manual jobs conflict with external jobs | Low | Use different source identifier ("Campus" vs "LinkedIn") |
| Too many expired jobs in database | Low | Add cleanup job to archive old expired jobs |

## Open Questions

1. Should we allow students to filter by "Campus Jobs Only"?
2. Should expired jobs be automatically deleted or just hidden?
3. Should we send notifications when jobs are about to expire?
4. Should we allow recurring jobs (e.g., same company every year)?

## Approval

- [ ] Product Owner Review
- [ ] Technical Lead Review
- [ ] Security Review
- [ ] Ready for Design Phase
