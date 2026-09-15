import type { Language } from './language';

type LearningCopy = {
  markComplete: string; completed: string; saving: string; saveError: string;
  unlockPost: string; courseCompleted: string; optionalAssessments: string;
  preGate: string; preHint: string; startPre: string; prePreparing: string;
  preResult: string; postReady: string; takePost: string; preUnlocks: string;
  checklist: Record<'details' | 'categories' | 'eligibility' | 'content' | 'media' | 'preTest' | 'postTest' | 'assessments', string>;
};

export const learningCopy = {
  th: {
    markComplete: 'เรียนบทนี้จบแล้ว', completed: 'เรียนบทนี้จบแล้ว', saving: 'กำลังบันทึก…', saveError: 'ไม่สามารถบันทึกการเรียนจบบทได้',
    unlockPost: 'เรียนให้ครบทุกบทเพื่อปลดล็อกแบบทดสอบหลังเรียน', courseCompleted: 'จบคอร์สแล้ว — เรียนครบทุกบท',
    optionalAssessments: 'ข้อสอบเป็นตัวเลือก สามารถเพิ่มแบบทดสอบก่อนเรียน หลังเรียน ทั้งคู่ หรือไม่เพิ่มก็ได้ ข้อสอบที่เพิ่มต้องมีคำถามที่ถูกต้องก่อนส่งตรวจ',
    preGate: 'ทำแบบทดสอบก่อนเรียนก่อนเปิดเนื้อหา', preHint: 'คอร์สนี้มีแบบทดสอบก่อนเรียน ต้องทำให้เสร็จก่อนเข้าถึงเนื้อหา', startPre: 'เริ่มแบบทดสอบก่อนเรียน', prePreparing: 'ผู้สอนกำลังเตรียมแบบทดสอบก่อนเรียน',
    preResult: 'ดูผลแบบทดสอบก่อนเรียน', postReady: 'พร้อมทำแบบทดสอบหลังเรียนหรือยัง?', takePost: 'ทำแบบทดสอบหลังเรียน', preUnlocks: 'ทำแบบทดสอบก่อนเรียนให้เสร็จเพื่อปลดล็อกเนื้อหาและรายการบทเรียน',
    checklist: { details: 'ชื่อและภาษาคอร์ส', categories: 'หมวดหมู่', eligibility: 'สิทธิ์ผู้เรียน', content: 'เนื้อหาการเรียน', media: 'สื่อพร้อมใช้งาน', preTest: 'แบบทดสอบก่อนเรียน (ไม่บังคับ; ต้องถูกต้องหากเพิ่ม)', postTest: 'แบบทดสอบหลังเรียน (ไม่บังคับ; ต้องถูกต้องหากเพิ่ม)', assessments: 'คำถามข้อสอบถูกต้อง' },
  },
  en: {
    markComplete: 'Mark lesson complete', completed: 'Lesson completed', saving: 'Saving…', saveError: 'Unable to save lesson completion.',
    unlockPost: 'Complete every lesson to unlock the Post-Test.', courseCompleted: 'Course completed — all lessons finished.',
    optionalAssessments: 'Assessments are optional. Add a Pre-Test, a Post-Test, both, or neither. Any test you add must contain valid questions before submission.',
    preGate: 'Complete the Pre-Test first', preHint: 'This course includes a Pre-Test. Complete it before accessing the learning content.', startPre: 'Start Pre-Test', prePreparing: 'The teacher is preparing the Pre-Test.',
    preResult: 'View Pre-Test result', postReady: 'Ready for the Post-Test?', takePost: 'Take Post-Test', preUnlocks: 'Complete the Pre-Test to unlock this course’s learning content and syllabus.',
    checklist: { details: 'Title and language', categories: 'Category', eligibility: 'Student eligibility', content: 'Learning content', media: 'Media ready', preTest: 'Pre-Test (optional; valid if added)', postTest: 'Post-Test (optional; valid if added)', assessments: 'Valid assessment questions' },
  },
  'zh-CN': {
    markComplete: '标记本课已完成', completed: '本课已完成', saving: '正在保存…', saveError: '无法保存课程完成记录。',
    unlockPost: '完成所有课时后即可解锁课后测试。', courseCompleted: '课程已完成 — 所有课时均已完成。',
    optionalAssessments: '测试为可选项。可以添加课前测试、课后测试、两者都添加或都不添加。提交审核前，已添加的测试必须包含有效题目。',
    preGate: '请先完成课前测试', preHint: '本课程设有课前测试。完成测试后才能查看学习内容。', startPre: '开始课前测试', prePreparing: '教师正在准备课前测试。',
    preResult: '查看课前测试结果', postReady: '准备好进行课后测试了吗？', takePost: '参加课后测试', preUnlocks: '完成课前测试即可解锁学习内容和课程目录。',
    checklist: { details: '课程名称与语言', categories: '分类', eligibility: '学生资格', content: '学习内容', media: '媒体已就绪', preTest: '课前测试（可选；添加后须有效）', postTest: '课后测试（可选；添加后须有效）', assessments: '测试题目有效' },
  },
  ja: {
    markComplete: 'このレッスンを完了にする', completed: 'レッスン完了', saving: '保存中…', saveError: 'レッスンの完了を保存できませんでした。',
    unlockPost: 'すべてのレッスンを完了すると事後テストを受けられます。', courseCompleted: 'コース完了 — すべてのレッスンを完了しました。',
    optionalAssessments: 'テストは任意です。事前テスト、事後テスト、両方、またはどちらも追加しないことができます。追加したテストには、審査への提出前に有効な問題が必要です。',
    preGate: '先に事前テストを完了してください', preHint: 'このコースには事前テストがあります。学習内容にアクセスする前に完了してください。', startPre: '事前テストを開始', prePreparing: '講師が事前テストを準備しています。',
    preResult: '事前テストの結果を見る', postReady: '事後テストを受ける準備はできましたか？', takePost: '事後テストを受ける', preUnlocks: '事前テストを完了すると学習内容とコースの目次が開放されます。',
    checklist: { details: 'コース名と言語', categories: 'カテゴリー', eligibility: '受講資格', content: '学習内容', media: 'メディアの準備完了', preTest: '事前テスト（任意・追加時は有効な内容が必要）', postTest: '事後テスト（任意・追加時は有効な内容が必要）', assessments: '有効なテスト問題' },
  },
} satisfies Record<Language, LearningCopy>;
