# Software Requirements Specification (SRS)

## Institute X E-Learning Management System

**Version:** 1.5  
**System Type:** Web-Based E-Learning Management System

---

## 1. Project Overview

Institute X E-Learning Management System is a free, web-based learning platform for current students. Users authenticate through Institute X Single Sign-On (SSO) using their university email account.

The system supports four mutually exclusive roles: `STUDENT`, `TEACHER`, `APPROVER`, and `OWNER`. A Teacher must be authorized before creating courses. Course access is validated by the Student's Major. Teachers submit Course Versions for approval; rejected Versions must be fixed and resubmitted, while approved Versions are automatically published.

Students must complete a Pre-Test once before accessing learning content. The Pre-Test has no passing requirement. Post-Tests may be taken an unlimited number of times, and a score of at least 80% is required to pass.

---

## 2. Scope

The system includes:

- University SSO authentication
- Role-based access control
- Teacher authorization
- Course creation and editing
- Reusable Course Categories and catalog filtering
- Course eligibility validation by Major
- Course versioning and approval
- Automatic publication after approval
- Video, audio, image, text, and document learning content
- Mandatory Pre-Test before learning
- Post-Test with unlimited attempts
- Automatic grading
- Multiple Choice questions
- Optional Teacher-configured quiz timer
- Question and option randomization
- Teacher analytics
- Owner dashboard
- Popular Course ranking by number of enrollments
- Multilingual and accessibility support
- Future scalability

The system excludes payment, paid Courses, Guest access, course passwords, attendance, assignment submission, live classroom, low-usage analysis, analytics date filters, and backup/retention policy in the current version.

---

## 3. User Roles

| Role | Responsibility |
|---|---|
| `STUDENT` | Access eligible Courses, complete Pre-Test, learn, take Post-Test, and view scores |
| `TEACHER` | Request Course-creation permission, create/edit owned Courses, add content/quizzes, submit Versions, and view own Course analytics |
| `APPROVER` | Approve/reject Teacher permission and submitted Course Versions |
| `OWNER` | View system-wide Course, enrollment, assessment, traffic, and peak-usage information |

**BR-ROLE-01:** Each User shall have exactly one Role.  
**BR-ROLE-02:** A User shall not hold multiple Roles simultaneously.

---

## 4. Authentication Requirements

| ID | Requirement |
|---|---|
| FR-AUTH-01 | The system shall authenticate users through Institute X SSO. |
| FR-AUTH-02 | Users shall authenticate using their university email account. |
| FR-AUTH-03 | The system shall deny access when the institutional account is invalid or inactive. |
| FR-AUTH-04 | The system shall not provide Guest access. |
| FR-AUTH-05 | The system shall not provide social login. |
| FR-AUTH-06 | The system shall not maintain a separate local password. |

```text
University Email
      ↓
Institute X SSO
      ↓
Valid Account?
   /       \
 No         Yes
 ↓           ↓
Deny       Login
```

---

## 5. Teacher Authorization

| ID | Requirement |
|---|---|
| FR-TA-01 | A Teacher shall be able to request permission to create Courses. |
| FR-TA-02 | An Approver shall be able to approve or reject the request. |
| FR-TA-03 | Only an approved Teacher shall be able to create Courses. |
| FR-TA-04 | A Teacher without approved permission shall be denied Course creation. |

```text
Teacher → Request Permission → Approver
                              /       \
                           Reject    Approve
                                      ↓
                                Create Course
```

---

## 6. Course Management

| ID | Requirement |
|---|---|
| FR-CM-01 | An authorized Teacher shall be able to create a Course. |
| FR-CM-02 | A Teacher shall be able to edit a Course owned by that Teacher. |
| FR-CM-03 | A Teacher shall be able to add learning content. |
| FR-CM-04 | A Teacher shall create a Pre-Test for the Course. |
| FR-CM-05 | A Teacher shall be able to create a Post-Test. |
| FR-CM-06 | A Teacher shall submit a Course Version for approval. |
| FR-CM-07 | Published content shall not be edited directly. |
| FR-CM-08 | Changes to published content shall create a new Course Version. |
| FR-CM-09 | A new Version shall require approval before publication. |
| FR-CM-10 | The currently published Version may remain available while a newer Version is under review. |
| FR-CM-11 | An authorized Teacher shall assign at least one Category when creating a Course. |
| FR-CM-12 | The owning authorized Teacher shall be able to replace a Course's Category assignments. |

---

## 7. Course Cost and Eligibility

All Courses are free.

| ID | Requirement |
|---|---|
| FR-COST-01 | All Courses shall be free for eligible Students. |
| FR-COST-02 | The system shall not require payment, purchase, or subscription. |
| FR-CA-01 | A Teacher shall choose `OPEN` or `LIMITED` Student eligibility when creating a Course. |
| FR-CA-02 | An `OPEN` Course shall not require the Teacher to select Majors and shall allow every active Student. |
| FR-CA-03 | A `LIMITED` Course shall require one or more eligible Majors. |
| FR-CA-04 | A Student whose Major is eligible for a `LIMITED` Course shall be allowed to continue. |
| FR-CA-05 | A Student whose Major is not eligible for a `LIMITED` Course shall be denied access. |
| FR-CA-06 | The system shall not use Course passwords. |
| FR-CA-07 | The system shall not use paid Course locks. |
| FR-CA-08 | When an eligible Student first enters a published Course, the system shall create one Enrollment for that Student and Course. |
| FR-CA-09 | Repeat Course visits shall not create duplicate Enrollments. |

```text
Student → Select Course → Check eligibility mode
                              /            \
                           OPEN          LIMITED
                             ↓              ↓
                         Continue       Check Major
                                         /      \
                                      Invalid   Valid
                                         ↓        ↓
                                        Deny   Continue
```

### 7.1 Course Categories and Catalog Filtering

Categories are reusable, Owner-managed taxonomy labels. A Course may belong to one or more Categories. The catalog may filter Courses by Category while preserving publication, account-status, and `OPEN`/`LIMITED` eligibility rules.

| ID | Requirement |
|---|---|
| FR-CAT-01 | An Owner shall create and update unique Category slugs and names. |
| FR-CAT-02 | Authenticated users shall be able to list Categories. |
| FR-CAT-03 | Course creation shall reject missing, unknown, or duplicate Category IDs. |
| FR-CAT-04 | A Student shall be able to filter the eligible Course catalog by Category. |
| FR-CAT-05 | Category filtering shall not bypass Course eligibility mode, publication, or archive rules. |

---

## 8. Course Approval Workflow

| ID | Requirement |
|---|---|
| FR-AP-01 | A Teacher shall submit a Course Version to an Approver before publication. |
| FR-AP-02 | An Approver shall review the submitted Version. |
| FR-AP-03 | An Approver shall be able to approve or reject the Version. |
| FR-AP-04 | A rejected Version shall not be public. |
| FR-AP-05 | After rejection, the Teacher shall revise the Course before resubmission. |
| FR-AP-06 | A corrected Version may be resubmitted. |
| FR-AP-07 | An approved Version shall be automatically published by the system. |
| FR-AP-08 | No additional Publish action shall be required from the Teacher. |
| FR-AP-09 | Changes to published content shall require a new approval process. |

```text
Teacher → Submit Version → Approver
                           /      \
                       Reject    Approve
                         ↓          ↓
                    Teacher Fix  Auto Publish
                         ↓
                    Submit Again
```

---

## 9. Pre-Test Requirements

The Pre-Test must be completed before learning, may be taken only once, and has no passing requirement.

| ID | Requirement |
|---|---|
| FR-PRE-01 | A Student shall complete the Pre-Test before accessing learning content. |
| FR-PRE-02 | A Student shall be allowed to take the Pre-Test only once. |
| FR-PRE-03 | The Pre-Test shall use Multiple Choice questions. |
| FR-PRE-04 | The system shall automatically grade the Pre-Test. |
| FR-PRE-05 | The Pre-Test shall have no minimum passing score. |
| FR-PRE-06 | The system shall store the Pre-Test attempt and score. |
| FR-PRE-07 | The Student shall be able to view the Pre-Test score. |
| FR-PRE-08 | Correct answers shall not be displayed after submission. |
| FR-PRE-09 | Questions and answer options shall be randomized. |
| FR-PRE-10 | The Teacher shall be able to configure the Pre-Test as timed or untimed. |
| FR-PRE-11 | If timed, the system shall enforce the configured duration. |
| FR-PRE-12 | Any completed Pre-Test shall unlock learning content regardless of score. |

---

## 10. Learning Content Requirements

Supported learning content:

- Video
- Audio
- Image
- Text
- Document

| ID | Requirement |
|---|---|
| FR-LC-01 | A Teacher shall be able to add supported learning content. |
| FR-LC-02 | Students shall be able to view or stream authorized content through the web application. |
| FR-LC-03 | Learning content shall only be available from an approved and published Version. |
| FR-LC-04 | A Student shall complete the Pre-Test before accessing learning content. |
| FR-LC-05 | Total Course assets shall not exceed 1 GB. |
| FR-LC-06 | An individual media file shall not exceed 1 GB. |
| FR-LC-07 | The system shall not provide an intended offline-download feature. |
| FR-LC-08 | The 1 GB Course asset limit shall include all non-deleted media assets across all Versions of that Course. |
| FR-LC-09 | Learning content items shall have a Teacher-defined display order. |

---

## 11. Post-Test Requirements

A Student must achieve at least 80% to pass the Post-Test. Post-Test attempts are unlimited.

| ID | Requirement |
|---|---|
| FR-POST-01 | A Student shall be able to take the Post-Test after learning. |
| FR-POST-02 | The Post-Test shall use Multiple Choice questions. |
| FR-POST-03 | The system shall automatically grade each attempt. |
| FR-POST-04 | A score of 80% or higher shall be considered PASS. |
| FR-POST-05 | A score below 80% shall be considered NOT PASS. |
| FR-POST-06 | The Student shall be able to view the score. |
| FR-POST-07 | Correct answers shall not be displayed after submission. |
| FR-POST-08 | A Student shall be allowed to retake the Post-Test without an attempt limit. |
| FR-POST-09 | Every Post-Test attempt shall be stored independently. |
| FR-POST-10 | Questions and answer options shall be randomized. |
| FR-POST-11 | The Teacher shall be able to configure the Post-Test as timed or untimed. |
| FR-POST-12 | If timed, the system shall enforce the configured duration. |

```text
Post-Test → Auto Grade → Score >= 80%?
                         /          \
                       Yes          No
                        ↓            ↓
                       PASS       NOT PASS
                                      ↓
                                  Retake
                                      ↓
                                  Unlimited
```

---

## 12. Assessment Rules

| Feature | Pre-Test | Post-Test |
|---|---|---|
| Required | Before learning | After learning |
| Question Type | Multiple Choice | Multiple Choice |
| Attempts | 1 | Unlimited |
| Auto Grade | Yes | Yes |
| Passing Requirement | None | ≥ 80% |
| Score below 80% | Still unlocks learning | NOT PASS |
| Show Score | Yes | Yes |
| Show Correct Answers | No | No |
| Random Questions | Yes | Yes |
| Random Options | Yes | Yes |
| Timer | Teacher configurable | Teacher configurable |

---

## 13. Analytics Requirements

### 13.1 Teacher Analytics

| ID | Requirement |
|---|---|
| FR-AN-01 | A Teacher shall be able to view analytics only for owned Courses. |
| FR-AN-02 | The system shall provide Course learner/access information. |
| FR-AN-03 | The system shall provide Pre-Test and Post-Test statistics. |
| FR-AN-04 | The system shall provide score and Post-Test pass/not-pass statistics. |
| FR-AN-05 | Analytics date filtering shall not be included in the current version. |

### 13.2 Popular Courses

Popular Courses are ranked by number of enrollments.

| ID | Requirement |
|---|---|
| FR-POP-01 | The system shall determine the number of enrollments for each Course. |
| FR-POP-02 | The system shall rank Courses by enrollment count. |
| FR-POP-03 | The Owner shall be able to view Popular Courses based on enrollment ranking. |
| FR-POP-04 | An Enrollment shall represent a Student's first eligible entry into a published Course and shall be unique per Student and Course. |

Low-usage analysis is outside the current scope.

### 13.3 Owner Dashboard

The Owner dashboard shall include:

- User overview
- Course overview
- Enrollment statistics
- Popular Courses
- Assessment statistics
- Post-Test pass/not-pass statistics
- Traffic
- Peak usage

| ID | Requirement |
|---|---|
| FR-OW-01 | The Owner shall be able to view system-wide User statistics. |
| FR-OW-02 | The Owner shall be able to view system-wide Course statistics. |
| FR-OW-03 | The Owner shall be able to view enrollment statistics. |
| FR-OW-04 | The Owner shall be able to view Popular Courses. |
| FR-OW-05 | The Owner shall be able to view overall assessment statistics. |
| FR-OW-06 | The Owner shall be able to view traffic information. |
| FR-OW-07 | The Owner shall be able to view peak usage information. |

### 13.4 Course Access Events

| ID | Requirement |
|---|---|
| FR-CAE-01 | The system shall record Student Course access events. |
| FR-CAE-02 | An access event shall identify Student, Course, and access time. |
| FR-CAE-03 | Access events shall be available for analytics calculations. |
| FR-CAE-04 | Access events shall not be interpreted as attendance. |

---

## 14. Business Rules

| ID | Business Rule |
|---|---|
| BR-01 | Users authenticate through University SSO using university email. |
| BR-02 | Roles are `STUDENT`, `TEACHER`, `APPROVER`, and `OWNER`. |
| BR-03 | Each User has exactly one Role. |
| BR-04 | Teacher approval is required before Course creation. |
| BR-05 | All Courses are free. |
| BR-06 | Courses do not use passwords, paid locks, purchases, or subscriptions. |
| BR-07 | `OPEN` Courses allow every active Student; `LIMITED` Courses validate the Student Major. |
| BR-08 | Course Versions require Approver review before publication. |
| BR-09 | Rejected Versions must be corrected and resubmitted. |
| BR-10 | Approved Versions are automatically published. |
| BR-11 | Published content is changed through a new Version. |
| BR-12 | Pre-Test completion is mandatory before learning. |
| BR-13 | Pre-Test may be attempted only once. |
| BR-14 | Pre-Test has no passing requirement. |
| BR-15 | Any completed Pre-Test unlocks learning content. |
| BR-16 | Post-Test requires a score of at least 80% to PASS. |
| BR-17 | Post-Test attempts are unlimited. |
| BR-18 | Assessments use Multiple Choice questions. |
| BR-19 | Correct answers are not shown after submission. |
| BR-20 | Questions and options are randomized. |
| BR-21 | Quiz timing is configurable by the Teacher. |
| BR-22 | Popular Courses are ranked by enrollments. |
| BR-23 | Low-usage analysis is out of scope. |
| BR-24 | Analytics date filtering is out of scope. |
| BR-25 | Individual media files shall not exceed 1 GB. |
| BR-26 | Total Course assets shall not exceed 1 GB. |
| BR-27 | Course access events are not attendance. |
| BR-28 | One Student may have at most one Enrollment in a Course. |
| BR-29 | Repeat Course visits create access events but do not create duplicate Enrollments. |
| BR-30 | Quiz attempt answers and randomized question/option order shall be retained for grading integrity and auditability. |
| BR-31 | Published Course Versions and their content shall be immutable. |

---

## 15. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | The system shall operate as a web-based application. |
| NFR-02 | The system shall provide on-demand access 24 hours per day. |
| NFR-03 | The system shall support approximately 4,551 Students. |
| NFR-04 | The system shall support at least approximately 2,276 concurrent users. |
| NFR-05 | The architecture shall support future scaling. |
| NFR-06 | The system shall support future international expansion. |
| NFR-07 | The system shall support Thai, English, Chinese, and Japanese. |
| NFR-08 | The system shall support accessibility requirements for users with disabilities. |
| NFR-09 | UI design shall consider users with color-vision deficiencies. |
| NFR-10 | The system shall enforce role-based authorization and least-privilege access. |
| NFR-11 | Students with an ineligible Major shall not access the Course. |
| NFR-12 | Total Course assets shall not exceed 1 GB. |
| NFR-13 | Individual uploaded media files shall not exceed 1 GB. |
| NFR-14 | Learning assets shall not be exposed as unrestricted public-download resources. |
| NFR-15 | The system shall collect sufficient access information for traffic and peak-usage analysis. |

---

## 16. Out of Scope

- Guest access
- Social login
- Public account registration
- Local password authentication
- Paid Courses
- Payment
- Subscription
- Course purchase
- Course password / Course lock
- Attendance / check-in
- Assignment submission
- Live classroom / live teaching
- Student offline Course download
- Low-usage Course analysis
- Analytics date filtering
- Backup / retention policy
- Chat
- Comments
- Certificates
- Formal grade management

---

## 17. System Requirements Summary

- Approximately **4,551 Students**
- At least **2,276 concurrent users**
- **24-hour** on-demand access
- Maximum **1 GB total assets per Course**
- Maximum **1 GB per individual media file**
- Thai / English / Chinese / Japanese
- Accessibility and color-vision support
- Future scalability
- Automatic grading
- All Courses are free
- No Guest access
- No attendance
- No assignment submission

---

## 18. Main Student Workflow

```text
University SSO
      ↓
Login
      ↓
Select Course
      ↓
Validate Major
      ↓
Eligible?
 /       \
No       Yes
↓         ↓
Deny   Pre-Test (once)
          ↓
      Auto Grade
          ↓
 Any Score Accepted
          ↓
  Learning Content
          ↓
      Post-Test
          ↓
      Auto Grade
          ↓
    Score >= 80%?
     /         \
   Yes         No
    ↓           ↓
   PASS      NOT PASS
                ↓
             Retake
                ↓
            Unlimited
```

---

## 19. Database and Data-Integrity Requirements

The database schema shall be maintained through version-controlled Prisma migrations and may be updated when necessary to satisfy an approved SRS requirement. Schema changes must preserve data integrity and maintain traceability to the requirement that caused the change.

The database shall persist, at minimum:

- SSO-linked users, their single Role, account status, and Student Major
- Teacher permission requests and review history
- Courses, eligible Majors, immutable Versions, submissions, and review decisions
- Categories and Course-Category assignments used for catalog taxonomy and filtering
- Ordered text/media content and private-object metadata
- Course Enrollments distinct from repeat Course access events
- Quiz timer configuration, questions, options, and grading keys
- Each attempt's randomized question and option order
- Student answers, calculated scores, results, and relevant timestamps

Domain rules that span tables—including the 1 GB per-Course asset limit, automatic publication, single completed Pre-Test attempt, and timed submission enforcement—shall be executed transactionally by the Backend. Database constraints and indexes shall be used wherever PostgreSQL can enforce the rule directly.

Student-facing APIs shall never expose correct-answer flags, private storage keys, or unrestricted media URLs.

The schema change is maintained by Prisma migration `202608260001_add_course_categories`, which seeds and backfills the `Uncategorized` fallback Category.
