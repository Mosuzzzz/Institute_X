import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { StudentCourse } from './course-data';

type CourseCardProps = {
  course: StudentCourse;
  variant?: 'catalog' | 'continue' | 'learning';
};

export default function CourseCard({ course, variant = 'catalog' }: CourseCardProps) {
  const isContinue = variant === 'continue';
  const isLearning = variant === 'learning';

  return (
    <article className={`min-w-0 ${isContinue ? 'grid min-h-[190px] grid-cols-[160px_minmax(0,1fr)] border border-[#d9dce7] max-[540px]:min-h-40 max-[540px]:grid-cols-[112px_minmax(0,1fr)]' : ''}`}>
      <Link
        className={`relative grid place-items-center overflow-hidden border no-underline [background:color-mix(in_srgb,var(--course-accent)_42%,#edf1f6)] [border-color:color-mix(in_srgb,var(--course-accent)_65%,#cbd0da)] before:absolute before:h-[190px] before:w-[190px] before:rounded-full before:border-[26px] before:[border-color:color-mix(in_srgb,var(--course-accent)_72%,white)] before:content-[''] before:-top-[115px] before:-right-[55px] after:absolute after:h-[190px] after:w-[190px] after:rounded-full after:border-[26px] after:[border-color:color-mix(in_srgb,var(--course-accent)_72%,white)] after:content-[''] after:-bottom-[145px] after:-left-[65px] ${isContinue ? 'row-span-2 h-full min-h-[190px] max-[540px]:min-h-40' : isLearning ? 'min-h-[230px] max-[540px]:min-h-[210px]' : 'min-h-[178px] max-[540px]:min-h-[210px]'}`}
        href={`/student/courses/${course.id}`}
        style={{ '--course-accent': course.accent } as CSSProperties}
      >
        <span className="relative z-2 min-w-[86px] bg-(--course-accent) px-3 py-4 text-center text-[2.2rem] leading-none font-extrabold text-[#172036] shadow-[12px_12px_0_rgb(255_255_255_/_52%)]">{course.mark}</span>
        <i className="absolute inset-[18px] border border-[rgb(32_36_58_/_18%)]" aria-hidden="true" />
      </Link>
      <div className={isContinue ? 'px-6 pt-6 pb-2 max-[540px]:px-4 max-[540px]:pt-[18px] max-[540px]:pb-1.5' : 'pt-3.5'}>
        <h3 className="min-h-[2.7em] text-[1.05rem] leading-[1.28] tracking-[-0.035em] text-[#20243a]"><Link className="text-inherit no-underline hover:text-[#073d78] hover:underline hover:underline-offset-3" href={`/student/courses/${course.id}`}>{course.title}</Link></h3>
        <p className={`overflow-hidden text-ellipsis text-[#747b92] ${isContinue ? 'mt-[45px] max-[540px]:mt-4 max-[540px]:whitespace-normal' : 'mt-[7px] whitespace-nowrap'} text-[0.85rem] leading-[1.4]`}>{course.instructor}</p>
      </div>
      {course.progress === undefined ? (
        <div className="mt-[18px] flex gap-3" aria-label="Course access">
          <span className="grid min-h-[30px] min-w-[110px] place-items-center rounded-[3px] bg-[#073d78] px-[18px] py-[5px] text-[0.72rem] font-extrabold text-white">{course.availability}</span>
          <span className="grid min-h-[30px] min-w-[82px] place-items-center rounded-[3px] bg-[#c8eff2] px-[18px] py-[5px] text-[0.72rem] font-extrabold text-[#07566a]">{course.category}</span>
        </div>
      ) : (
        <div className={isContinue ? 'self-end px-6 pb-[22px] max-[540px]:px-4 max-[540px]:pb-4' : 'mt-[18px]'} aria-label={`${course.progress}% complete`}>
          <div className="h-[9px] overflow-hidden bg-[#d9dce6]"><span className="block h-full bg-[#073d78]" style={{ width: `${course.progress}%` }} /></div>
          <p className="mt-[7px] text-[0.82rem] text-[#454b61]">{course.progress}% complete</p>
        </div>
      )}
    </article>
  );
}
