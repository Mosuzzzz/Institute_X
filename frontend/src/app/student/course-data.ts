export type StudentCourse = {
  id: string;
  title: string;
  instructor: string;
  category: string;
  availability: 'OPEN' | 'LIMITED';
  accent: string;
  mark: string;
  progress?: number;
};

export const categories = [
  'All',
  'Business',
  'Finance & Accounting',
  'IT & Software',
  'Office Productivity',
  'Personal Development',
  'Design',
  'Marketing',
  'Health & Fitness',
  'Music',
] as const;

export const courses: StudentCourse[] = [
  {
    id: 'full-stack-foundations',
    title: 'Full-Stack Web Development Foundations',
    instructor: 'Institute X Computing Faculty',
    category: 'IT & Software',
    availability: 'LIMITED',
    accent: '#f2c94c',
    mark: 'WEB',
  },
  {
    id: 'python-bootcamp',
    title: 'Python Programming: From Zero to Practice',
    instructor: 'Institute X Computing Faculty',
    category: 'IT & Software',
    availability: 'OPEN',
    accent: '#58b9c9',
    mark: 'PY',
    progress: 1,
  },
  {
    id: 'javascript-complete',
    title: 'Modern JavaScript: From Zero to Expert',
    instructor: 'Institute X Computing Faculty',
    category: 'IT & Software',
    availability: 'LIMITED',
    accent: '#f4d03f',
    mark: 'JS',
  },
  {
    id: 'frontend-projects',
    title: '50 Frontend Projects with HTML, CSS & JavaScript',
    instructor: 'Institute X Digital Learning Team',
    category: 'Design',
    availability: 'OPEN',
    accent: '#ef744b',
    mark: '50',
  },
  {
    id: 'ai-literacy',
    title: 'Succeed in the Age of AI',
    instructor: 'Institute X Innovation Centre',
    category: 'Personal Development',
    availability: 'LIMITED',
    accent: '#c96dd8',
    mark: 'AI',
  },
  {
    id: 'rust-mastery',
    title: 'Rust Mastery Saga: Unlocking Backend Power',
    instructor: 'Institute X Computing Faculty',
    category: 'IT & Software',
    availability: 'LIMITED',
    accent: '#e87f45',
    mark: 'RS',
    progress: 55,
  },
];

export const learningCourses = courses.filter((course) => course.progress !== undefined);

export const courseSections = [
  { title: 'Welcome and course orientation', lessons: 4, completed: 3, duration: '35 min' },
  { title: 'Backend foundations and core concepts', lessons: 5, completed: 4, duration: '29 min' },
  { title: 'Rust 101: language foundations', lessons: 8, completed: 3, duration: '51 min' },
  { title: 'Object-oriented design concepts', lessons: 4, completed: 0, duration: '33 min' },
  { title: 'PostgreSQL and persistent data', lessons: 6, completed: 2, duration: '42 min' },
  { title: 'Git and version-control fundamentals', lessons: 2, completed: 2, duration: '26 min' },
  { title: 'Final project and next steps', lessons: 1, completed: 1, duration: '18 min' },
];
