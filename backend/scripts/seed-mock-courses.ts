import {
  ContentType,
  CourseEligibilityMode,
  CourseVersionStatus,
  ReviewDecision,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../src/database/prisma.service';
import { assertMockSeedingAllowed } from '../src/dev/mock-users.seed';

const courses = [
  [
    'Everyday Mathematics',
    'mathematics',
    'Calculate percentages, discounts, and a simple weekly budget.',
  ],
  [
    'Japanese for Beginners',
    'japanese',
    'Practice greetings: ohayou gozaimasu, konnichiwa, and arigatou.',
  ],
  [
    'Introduction to Web Development',
    'technology',
    'Create a page with a heading, paragraph, and link using HTML.',
  ],
  [
    'Science in Daily Life',
    'science',
    'Compare evaporation and condensation using examples from daily life.',
  ],
  [
    'English for the Workplace',
    'english',
    'Write a short professional email with a greeting, request, and closing.',
  ],
  [
    'Chinese for Beginners',
    'chinese',
    'Practice greetings: ni hao and xie xie, then introduce yourself.',
  ],
  [
    'Small Business Accounting',
    'business-accounting',
    'Record revenue and expenses, then calculate the remaining balance.',
  ],
  [
    'Design Fundamentals',
    'design-arts',
    'Use contrast, alignment, and spacing to create a readable poster.',
  ],
  [
    'Workplace Safety Basics',
    'industry-engineering',
    'Identify hazards and select suitable protective equipment before a task.',
  ],
  [
    'Time Management for Students',
    'personal-development',
    'Break an assignment into tasks and plan a realistic weekly schedule.',
  ],
] as const;

const prisma = new PrismaService();

async function main(): Promise<void> {
  assertMockSeedingAllowed(process.env.NODE_ENV);
  const created = await prisma.$transaction(
    async (tx) => {
      const teacher = await tx.user.findUnique({
        where: { universityEmail: 'teacher@x.ac.th' },
        include: { roles: true },
      });
      const approver = await tx.user.findUnique({
        where: { universityEmail: 'approver@x.ac.th' },
        include: { roles: true },
      });
      if (
        !teacher?.roles.some((role) => role.role === UserRole.TEACHER) ||
        !approver?.roles.some((role) => role.role === UserRole.APPROVER)
      ) {
        throw new Error('Run npm run seed:mock-users first (mock Teacher and Approver required).');
      }
      const categories = await tx.category.findMany({
        where: { slug: { in: courses.map((course) => course[1]) } },
      });
      for (const [, slug] of courses) {
        if (!categories.some((category) => category.slug === slug)) {
          throw new Error(`Missing category ${slug}. Apply database migrations first.`);
        }
      }
      let count = 0;
      for (const [index, [title, slug, exercise]] of courses.entries()) {
        const id = `d9150000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
        if (await tx.course.findUnique({ where: { id }, select: { id: true } })) continue;
        const category = categories.find((item) => item.slug === slug)!;
        const versionId = `d9150001-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
        const now = new Date();
        await tx.course.create({
          data: {
            id,
            teacherId: teacher.id,
            eligibilityMode: CourseEligibilityMode.OPEN,
            categories: { create: { categoryId: category.id } },
            versions: {
              create: {
                id: versionId,
                versionNumber: 1,
                title: `[Mock] ${title}`,
                description: `Development sample course: ${title}. Practice the basics with four short lessons. Not an official institutional course.`,
                languageCode: 'en',
                status: CourseVersionStatus.DRAFT,
                submittedAt: now,
                reviews: {
                  create: {
                    submissionNumber: 1,
                    submittedAt: now,
                    reviewedAt: now,
                    reviewedById: approver.id,
                    decision: ReviewDecision.APPROVED,
                    reviewComment: 'Development sample publication; not a real approval.',
                  },
                },
                sections: {
                  create: [
                    {
                      title: 'Getting started',
                      position: 1,
                      contentItems: {
                        create: [
                          {
                            versionId,
                            contentType: ContentType.TEXT,
                            position: 1,
                            title: 'Welcome and learning goals',
                            textBody: `Welcome to ${title}. This sample introduces a practical activity you can complete on your own.\n\nGoal: ${exercise}`,
                          },
                          {
                            versionId,
                            contentType: ContentType.TEXT,
                            position: 2,
                            title: 'Explore the basics',
                            textBody: `${exercise}\n\nList what you already know about this topic. Identify unfamiliar terms and write down one example for each. Compare your examples with a reliable textbook or reference.`,
                          },
                        ],
                      },
                    },
                    {
                      title: 'Practice and reflection',
                      position: 2,
                      contentItems: {
                        create: [
                          {
                            versionId,
                            contentType: ContentType.TEXT,
                            position: 3,
                            title: 'Try it yourself',
                            textBody: `Activity: ${exercise}\n\n1. Choose a small, realistic example.\n2. Complete the activity step by step.\n3. Check your result and correct any mistakes.\n4. Explain your reasoning in your own words.`,
                          },
                          {
                            versionId,
                            contentType: ContentType.TEXT,
                            position: 4,
                            title: 'Review what you learned',
                            textBody:
                              'Summarize three things you learned. Describe one mistake and how you corrected it. Choose a new example and repeat the activity without referring to your notes.\n\nMark each lesson complete to finish this sample course. No assessments are configured.',
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        });
        // Authoring triggers require DRAFT while sections and lessons are inserted.
        // Publish only after the complete sample has been created, in the same transaction.
        await tx.courseVersion.update({
          where: { id: versionId },
          data: { status: CourseVersionStatus.PUBLISHED, publishedAt: now },
        });
        count++;
      }
      return count;
    },
    { timeout: 30000 },
  );
  process.stdout.write(`Created ${created} mock courses; existing samples were left unchanged.\n`);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
