import Link from "next/link";
import type { CSSProperties } from "react";
import type { StudentCourse } from "./course-data";
import CourseCoverImage from "../course-cover-image";
import styles from "./course-card.module.css";

type CourseCardProps = {
  course: StudentCourse;
  variant?: "catalog" | "continue" | "learning";
};

export default function CourseCard({
  course,
  variant = "catalog",
}: CourseCardProps) {
  const isContinue = variant === "continue";
  const isLearning = variant === "learning";

  return (
    <article
      className={`${styles.card} ${isContinue ? styles.continueCard : ""}`}
    >
      <Link
        className={`${styles.cover} ${isLearning ? styles.learningCover : ""}`}
        href={`/student/courses/${course.id}`}
        style={{ "--course-accent": course.accent } as CSSProperties}
      >
        <CourseCoverImage
          assetId={course.coverAssetId}
          alt={`${course.title} cover`}
          className="absolute inset-0 z-3 h-full w-full object-cover"
        />
      </Link>
      <div
        className={styles.details}
      >
        <h3 className="text-[1.05rem] leading-relaxed font-medium text-[#20243a]">
          <Link
            className="text-inherit no-underline hover:text-[#073d78] hover:underline hover:underline-offset-3"
            href={`/student/courses/${course.id}`}
          >
            {course.title}
          </Link>
        </h3>
        <p
          className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#58677c]"
        >
          {course.instructor}
        </p>
        {!isContinue ? (
          <p className="mt-1.5 text-[0.78rem] text-[#59647a]">{course.language}</p>
        ) : null}
      </div>
      {course.progress === undefined ? (
        <div className={styles.footer} aria-label="Course access">
          <span className="rounded-full bg-[#eaf1fb] px-3 py-1 text-xs font-medium text-[#073d78]">
            {course.availability}
          </span>
          <span className="rounded-full bg-[#edf6f4] px-3 py-1 text-xs font-medium text-[#07566a]">
            {course.category}
          </span>
        </div>
      ) : (
        <div
          className={styles.progress}
          aria-label={`${course.progress}% complete`}
        >
          <div className="h-1.5 overflow-hidden rounded-full bg-[#e7edf5]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={course.progress} aria-label={course.title}>
            <span
              className="block h-full rounded-full bg-[#073d78]"
              style={{ width: `${course.progress}%` }}
            />
          </div>
          <p className="mt-[7px] text-[0.82rem] text-[#454b61]">
            {course.progress}% complete
          </p>
        </div>
      )}
    </article>
  );
}
