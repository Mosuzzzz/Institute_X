export type TeacherCourseStatus = 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'REJECTED';

export type TeacherCourse = {
  id: string;
  title: string;
  version: number;
  status: TeacherCourseStatus;
  updated: string;
  category: string;
  completion: number;
  note: string;
};

export const teacherCourses: TeacherCourse[] = [
  {
    id: 'network-fundamentals',
    title: 'Network Fundamentals',
    version: 2,
    status: 'DRAFT',
    updated: '26 Aug 2026',
    category: 'IT & Software',
    completion: 64,
    note: 'Add Post-Test questions before submission.',
  },
  {
    id: 'database-design',
    title: 'Database Design and PostgreSQL',
    version: 1,
    status: 'SUBMITTED',
    updated: '24 Aug 2026',
    category: 'IT & Software',
    completion: 100,
    note: 'Waiting for Approver review.',
  },
  {
    id: 'web-accessibility',
    title: 'Accessible Web Interfaces',
    version: 3,
    status: 'PUBLISHED',
    updated: '18 Aug 2026',
    category: 'Design',
    completion: 100,
    note: 'Published and available to eligible Students.',
  },
  {
    id: 'software-testing',
    title: 'Practical Software Testing',
    version: 1,
    status: 'REJECTED',
    updated: '12 Aug 2026',
    category: 'IT & Software',
    completion: 82,
    note: 'Revision requested: clarify the final assessment.',
  },
];

export const authoringSteps = [
  { key: 'details', label: 'Course details', description: 'Title, description, categories and eligible Majors' },
  { key: 'content', label: 'Learning content', description: 'Ordered text, video, audio, images and documents' },
  { key: 'pre-test', label: 'Pre-Test', description: 'Required before Students unlock course content' },
  { key: 'post-test', label: 'Post-Test', description: 'Unlimited attempts with an 80% pass threshold' },
  { key: 'review', label: 'Review & submit', description: 'Validate the Draft and send it to an Approver' },
] as const;
