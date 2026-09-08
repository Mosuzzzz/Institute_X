export const ownerOverview = [
  { label: 'Active users', value: '1,248', change: '+4.8%', detail: 'Across all application roles' },
  { label: 'Published courses', value: '36', change: '+3', detail: 'Five awaiting review' },
  { label: 'Enrollments', value: '2,864', change: '+8.2%', detail: 'This academic term' },
  { label: 'Content accesses', value: '15,320', change: '+12.6%', detail: 'Last 30 days' },
  { label: 'Assessment attempts', value: '5,106', change: '+7.1%', detail: 'Pre-Test and Post-Test' },
] as const;

export const popularCourses = [
  { id: 'IX-CS-201', title: 'Database Design and PostgreSQL', category: 'IT & Software', enrollments: 412, completion: 76 },
  { id: 'IX-CS-105', title: 'The Complete Python Bootcamp', category: 'Programming', enrollments: 368, completion: 69 },
  { id: 'IX-DES-110', title: 'Accessible Web Interfaces', category: 'Design', enrollments: 291, completion: 82 },
  { id: 'IX-CS-230', title: 'Practical Software Testing', category: 'IT & Software', enrollments: 244, completion: 73 },
  { id: 'IX-PD-101', title: 'Communication for Project Teams', category: 'Personal Development', enrollments: 207, completion: 88 },
] as const;

export const peakUsage = [
  { hour: '08', accesses: 380 },
  { hour: '09', accesses: 620 },
  { hour: '10', accesses: 880 },
  { hour: '11', accesses: 760 },
  { hour: '12', accesses: 510 },
  { hour: '13', accesses: 710 },
  { hour: '14', accesses: 960 },
  { hour: '15', accesses: 1120 },
  { hour: '16', accesses: 840 },
  { hour: '17', accesses: 590 },
  { hour: '18', accesses: 430 },
] as const;

export const roleDistribution = [
  { role: 'Students', count: 1160, share: 92.9, state: 'Active learning accounts' },
  { role: 'Teachers', count: 62, share: 5, state: '42 with publishing permission' },
  { role: 'Approvers', count: 18, share: 1.4, state: 'Academic review authority' },
  { role: 'Owners', count: 8, share: 0.7, state: 'System oversight access' },
] as const;

export const recentUsers = [
  { id: '6600000001', name: 'Test Student', role: 'Student', affiliation: 'Computer Science', state: 'Active', seen: '2 min ago' },
  { id: 'T-1042', name: 'Ruangyot Nanchiang', role: 'Teacher', affiliation: 'Faculty of Computing', state: 'Active', seen: '18 min ago' },
  { id: 'A-0018', name: 'Napat S.', role: 'Approver', affiliation: 'Academic Affairs', state: 'Active', seen: '1 hr ago' },
  { id: '6600000188', name: 'Mali K.', role: 'Student', affiliation: 'Digital Media', state: 'Active', seen: '3 hr ago' },
] as const;

export const coursePortfolio = [
  { state: 'Published', count: 36, description: 'Available to eligible students' },
  { state: 'Submitted', count: 5, description: 'Waiting for Approver review' },
  { state: 'Draft', count: 14, description: 'In active authoring' },
  { state: 'Rejected', count: 3, description: 'Returned for revision' },
] as const;

export const activityLog = [
  { time: '15:42', event: 'Course Version published', actor: 'Approver A-0018', target: 'Database Design and PostgreSQL' },
  { time: '15:08', event: 'Teacher permission approved', actor: 'Approver A-0007', target: 'Teacher T-1088' },
  { time: '14:31', event: 'Peak concurrent activity', actor: 'System', target: '284 authenticated sessions' },
  { time: '13:55', event: 'Course Version submitted', actor: 'Teacher T-1042', target: 'Network Fundamentals V2' },
] as const;

export const assessmentOutcomes = {
  pass: 3978,
  notPass: 1128,
  passRate: 77.9,
} as const;
