export type PermissionRequest = {
  id: string;
  teacher: string;
  email: string;
  requested: string;
  waiting: string;
  message: string;
};

export type CourseReview = {
  id: string;
  title: string;
  teacher: string;
  version: number;
  submitted: string;
  waiting: string;
  readiness: number;
  category: string;
};

export const permissionRequests: PermissionRequest[] = [
  { id: 'permission-01', teacher: 'Dr. Narin S.', email: 'narin.s@university.ac.th', requested: '24 Aug 2026', waiting: '2 days', message: 'I would like to publish foundational networking Courses for CS and IT Students.' },
  { id: 'permission-02', teacher: 'Asst. Prof. Mali K.', email: 'mali.k@university.ac.th', requested: '25 Aug 2026', waiting: '1 day', message: 'Requesting Course authoring access for the Digital Design programme.' },
  { id: 'permission-03', teacher: 'Dr. Thee P.', email: 'thee.p@university.ac.th', requested: '26 Aug 2026', waiting: '4 hours', message: 'I plan to create database and software-testing learning modules.' },
];

export const courseReviews: CourseReview[] = [
  { id: 'review-network-v2', title: 'Network Fundamentals', teacher: 'Dr. Narin S.', version: 2, submitted: '23 Aug 2026', waiting: '3 days', readiness: 100, category: 'IT & Software' },
  { id: 'review-database-v1', title: 'Database Design and PostgreSQL', teacher: 'Dr. Thee P.', version: 1, submitted: '24 Aug 2026', waiting: '2 days', readiness: 100, category: 'IT & Software' },
  { id: 'review-accessibility-v3', title: 'Accessible Web Interfaces', teacher: 'Asst. Prof. Mali K.', version: 3, submitted: '26 Aug 2026', waiting: '5 hours', readiness: 100, category: 'Design' },
];

export const reviewChecklist = [
  { label: 'Course metadata', detail: 'Title, description, Category and eligible Majors are complete.' },
  { label: 'Learning content', detail: 'Published content order and supported media are present.' },
  { label: 'Pre-Test', detail: 'Required questions and options are configured.' },
  { label: 'Post-Test', detail: 'Assessment is complete with the required 80% pass rule.' },
  { label: 'Student safety', detail: 'No private storage keys or correct-answer flags are exposed.' },
] as const;
