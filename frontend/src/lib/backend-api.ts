import { SSO_TOKEN_KEY } from "./sso-session";

export class BackendApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BackendApiError";
  }
}

export async function backendApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = sessionStorage.getItem(SSO_TOKEN_KEY);
  if (!token) throw new BackendApiError("Your SSO session has expired.", 401);

  const response = await fetch(`/api/backend/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
      authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Backend request failed (${response.status})`;
    try {
      const payload = (await response.json()) as {
        message?: string | string[];
      };
      if (Array.isArray(payload.message)) message = payload.message.join(", ");
      else if (payload.message) message = payload.message;
    } catch {
      // Keep the status-based fallback when the backend does not return JSON.
    }
    throw new BackendApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;

  const body = await response.text();
  if (!body.trim()) return null as T;

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new BackendApiError(
      "Backend returned an invalid JSON response.",
      response.status,
    );
  }
}

export type CategoryDto = { id: string; slug: string; name: string };
export type CourseLanguageCode = "th" | "en" | "zh-CN" | "ja";

export type EligibleCourseDto = {
  courseId: string;
  eligibilityMode: "OPEN" | "LIMITED";
  versionId: string;
  title: string;
  description: string | null;
  languageCode: CourseLanguageCode;
  publishedAt: string | null;
  coverAssetId: string | null;
  enrollments: number;
  enrolled: boolean;
  progress: number;
  categories: CategoryDto[];
};

export type ApproverCourseDto = {
  courseId: string;
  eligibilityMode: "OPEN" | "LIMITED";
  versionId: string;
  title: string;
  description: string | null;
  languageCode: CourseLanguageCode;
  publishedAt: string | null;
  coverAssetId: string | null;
  enrollments: number;
  categories: CategoryDto[];
  teacher: {
    id: string;
    fullName: string;
    universityEmail: string;
  };
};

export type CourseEntryDto = {
  versionId: string;
  preTestId: string | null;
  postTestId: string | null;
  contentUnlocked: boolean;
};

export type PublishedCourseContentDto = {
  versionId: string;
  title: string;
  description: string | null;
  languageCode: CourseLanguageCode;
  contentItems: Array<{
    id: string;
    contentType: string;
    title: string | null;
    textBody: string | null;
    position: number;
    section: { id: string; title: string; position: number } | null;
    media: {
      assetId: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    } | null;
  }>;
};

export type TeacherPermissionDto = {
  id: string;
  teacherId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
  requestMessage: string | null;
  reviewComment: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  teacher?: { id: string; fullName: string; universityEmail: string };
};

export type TeacherCourseDto = {
  id: string;
  eligibilityMode: "OPEN" | "LIMITED";
  createdAt: string;
  categories: Array<{ category: CategoryDto }>;
  versions: Array<{
    id: string;
    versionNumber: number;
    title: string;
    description: string | null;
    languageCode: CourseLanguageCode;
    status: "DRAFT" | "SUBMITTED" | "APPROVED" | "PUBLISHED" | "UNPUBLISHED" | "REJECTED" | "SUPERSEDED";
    updatedAt: string;
    reviews: Array<{ reviewComment: string | null }>;
  }>;
};

export type MajorDto = { id: string; code: string; name: string };

export type TeacherCourseDetailDto = TeacherCourseDto & {
  readiness: number;
  checks: Record<
    | "details"
    | "categories"
    | "eligibility"
    | "content"
    | "media"
    | "preTest"
    | "assessments",
    boolean
  >;
  allowedMajors: Array<{ major: MajorDto }>;
  versions: Array<
    TeacherCourseDto["versions"][number] & {
      sections: Array<{
        id: string;
        title: string;
        position: number;
      }>;
      coverAsset: {
        id: string;
        fileName: string;
        mimeType: string;
        status: "PENDING" | "READY" | "FAILED" | "DELETED";
      } | null;
      contentItems: Array<{
        id: string;
        title: string | null;
        textBody: string | null;
        contentType: string;
        position: number;
        sectionId: string | null;
        mediaAsset: {
          id: string;
          fileName: string;
          mimeType: string;
          status: string;
        } | null;
      }>;
      quizzes: Array<{
        id: string;
        quizType: "PRE_TEST" | "POST_TEST";
        title: string;
        durationSeconds: number | null;
        questions: Array<{
          id: string;
          questionText: string;
          points: string | number;
          position: number;
          imageAsset: {
            id: string;
            fileName: string;
            mimeType: string;
            status: "PENDING" | "READY" | "FAILED" | "DELETED";
          } | null;
          options: Array<{
            id: string;
            optionText: string;
            isCorrect: boolean;
            position: number;
          }>;
        }>;
      }>;
    }
  >;
};

export type InitializedUploadDto = {
  assetId: string;
  uploadUrl: string;
  expiresAt: string;
};

export type SignedViewUrlDto = { url: string; expiresAt: string };

export type OwnerUserDto = {
  id: string;
  username: string;
  universityEmail: string;
  fullName: string;
  role: "STUDENT" | "TEACHER" | "APPROVER" | "OWNER";
  accountStatus: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  major: { code: string; name: string } | null;
};

export type OwnerActivityDto = {
  id: string;
  type: "COURSE_ACCESS" | "TEACHER_PERMISSION" | "COURSE_VERSION";
  occurredAt: string;
  actor: string;
  detail: string;
};

export type StartedQuizDto = {
  attemptId: string;
  expiresAt: string | null;
  questions: Array<{
    id: string;
    questionText: string;
    imageAssetId: string | null;
    options: Array<{ id: string; optionText: string }>;
  }>;
};

export type CreatedQuestionDto = { id: string };

export type QuizSubmissionDto = {
  score: number;
  result: "COMPLETED" | "PASS" | "NOT_PASS";
  courseId?: string;
};

export type CompletedPreTestDto = QuizSubmissionDto & {
  id: string;
  courseId: string;
  startedAt: string;
  submittedAt: string;
};

export type SubmittedVersionDto = {
  id: string;
  courseId?: string;
  versionNumber: number;
  title: string;
  description: string | null;
  languageCode?: CourseLanguageCode;
  submittedAt: string | null;
  course: {
    teacher: { id: string; fullName: string; universityEmail: string };
    allowedMajors: Array<{ major: { id: string; code: string; name: string } }>;
  };
  contentItems: Array<{
    id: string;
    contentType: string;
    title: string | null;
    textBody?: string | null;
    position: number;
    mediaAsset?: {
      id: string;
      fileName: string;
      mimeType: string;
      status: string;
    } | null;
  }>;
  quizzes: Array<{
    id: string;
    quizType: "PRE_TEST" | "POST_TEST" | string;
    title: string;
    durationSeconds?: number | null;
    questions: Array<{
      id: string;
      questionText: string;
      points?: number | string;
      position: number;
      imageAsset?: {
        id: string;
        fileName: string;
        mimeType: string;
        status: string;
      } | null;
      options: Array<{
        id: string;
        optionText: string;
        isCorrect: boolean;
        position: number;
      }>;
    }>;
  }>;
};

export type OwnerDashboardDto = {
  overview: {
    users: number;
    activeUsers: number;
    courses: number;
    enrollments: number;
    accesses: number;
    assessmentAttempts: number;
    pendingTeacherPermissions: number;
  };
  usersByRole: Array<{
    role: "STUDENT" | "TEACHER" | "APPROVER" | "OWNER";
    users: number;
  }>;
  courseVersionsByStatus: Array<{
    status:
      | "DRAFT"
      | "SUBMITTED"
      | "REJECTED"
      | "APPROVED"
      | "PUBLISHED"
      | "UNPUBLISHED"
      | "SUPERSEDED";
    versions: number;
  }>;
  popularCourses: Array<{
    courseId: string;
    title: string;
    enrollments: number;
  }>;
  postTestResults: { pass: number; notPass: number };
  peakUsage: Array<{ hour: number; accesses: number }>;
};
