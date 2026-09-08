export const authUi = {
  shell:
    'grid min-h-svh place-items-center p-[clamp(24px,5vw,72px)]',
  panel:
    'grid min-h-[430px] w-[min(100%,810px)] min-w-0 content-center gap-9 rounded-panel border border-line bg-surface px-[clamp(28px,7vw,96px)] py-[clamp(40px,6vw,76px)] shadow-[0_1px_2px_rgb(25_35_45_/_5%)]',
  brand:
    'flex min-w-0 items-center justify-center gap-[18px] [&_h1]:min-w-0 [&_h1]:text-[clamp(1.65rem,3vw,2.25rem)] [&_h1]:leading-[1.15] [&_h1]:tracking-[-0.025em]',
  logo: 'size-[58px] shrink-0',
  rule: 'h-px bg-line',
  access:
    'grid gap-3.5 [&_h2]:text-[clamp(1.2rem,2vw,1.5rem)] [&_h2]:leading-[1.35]',
  ssoButton:
    'grid min-h-[62px] w-full min-w-0 cursor-pointer grid-cols-[1fr_auto] items-center gap-4 rounded-control border border-line-strong bg-surface px-5 py-3.5 text-center text-[1.075rem] leading-[1.35] font-bold text-ink transition duration-150 hover:-translate-y-px hover:border-action hover:bg-[#f8fbff] hover:text-action focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus active:translate-y-0 active:border-action-active active:bg-[#eef5fb] max-[560px]:min-h-[58px] max-[560px]:px-4 max-[560px]:text-base',
} as const;

export const commonUi = {
  callbackShell: 'grid min-h-svh place-items-center bg-canvas p-6',
  callbackPanel:
    'grid w-[min(100%,480px)] justify-items-center gap-[18px] rounded-panel border border-line bg-surface px-8 py-12 text-center [&_h1]:text-[1.55rem] [&_p]:leading-[1.6] [&_p]:text-muted [&_a]:font-bold [&_a]:text-action [&_a]:underline-offset-4',
  spinner:
    'size-8 animate-spin rounded-full border-[3px] border-line border-t-action motion-reduce:animate-none motion-reduce:border-action',
  empty:
    'my-5 border border-dashed border-[#c9cfd8] bg-white p-7 leading-[1.55] text-[#667182]',
  error: 'mt-3 text-sm leading-6 text-[#8f1d14]',
} as const;

export type WorkspaceRole = 'teacher' | 'approver' | 'owner';

const roleTheme: Record<WorkspaceRole, string> = {
  teacher:
    '[--workspace-accent:#063777] [--workspace-accent-soft:#eff6ff] [--workspace-rail:#ffffff] [--workspace-card-border:#e2e8f0]',
  approver:
    '[--workspace-accent:#0d9488] [--workspace-accent-soft:#f0fdfa] [--workspace-rail:#ffffff] [--workspace-card-border:#e2e8f0]',
  owner:
    '[--workspace-accent:#d97706] [--workspace-accent-soft:#fffbeb] [--workspace-rail:#ffffff] [--workspace-card-border:#e2e8f0]',
};

export const workspaceUi = {
  shell: (role: WorkspaceRole) =>
    `grid min-h-svh grid-cols-[280px_minmax(0,1fr)] bg-[#f8fafc] text-slate-800 max-[1100px]:grid-cols-[240px_minmax(0,1fr)] max-[820px]:block ${roleTheme[role]}`,
  sidebar: (open: boolean) =>
    `sticky top-0 z-50 grid h-svh grid-rows-[auto_1fr] overflow-hidden bg-[var(--workspace-rail)] px-5 pt-7 pb-6 text-slate-900 shadow-xl max-[820px]:fixed max-[820px]:left-0 max-[820px]:w-[min(88vw,320px)] max-[820px]:transition-transform max-[820px]:duration-200 ${open ? 'max-[820px]:translate-x-0' : 'max-[820px]:-translate-x-[105%]'}`,
  brandHeader:
    'flex items-center justify-between [&>button]:hidden [&>button]:cursor-pointer [&>button]:border-0 [&>button]:bg-transparent [&>button]:text-3xl [&>button]:text-slate-900 max-[820px]:[&>button]:block',
  brandLink:
    'flex min-w-0 items-center gap-3 text-slate-900 no-underline [&>img]:size-10 [&>img]:shrink-0 [&>img]:rounded-lg [&>img]:bg-white [&>img]:p-1.5 [&>img]:shadow-md [&>span]:grid [&>span]:min-w-0 [&>span]:gap-0.5 [&_small]:text-[.62rem] [&_small]:font-semibold [&_small]:tracking-[.14em] [&_small]:text-slate-500 [&_small]:uppercase [&_strong]:overflow-hidden [&_strong]:text-[.92rem] [&_strong]:font-semibold [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_strong]:text-slate-900',
  navigation:
    'mt-10 grid content-start gap-1.5 [&_svg]:size-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.7] [&_i]:inline-grid [&_i]:w-5 [&_i]:place-items-center [&_i]:text-lg',
  navLabel:
    'mx-3 mt-4 mb-2 text-[.64rem] font-bold tracking-[.14em] text-slate-400/80 uppercase',
  navLink:
    'relative grid min-h-[48px] grid-cols-[20px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-sm font-medium text-slate-900 no-underline transition duration-150 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
  navLinkActive:
    'bg-slate-100 font-semibold text-slate-900 shadow-xs before:absolute before:inset-y-2 before:left-0 before:w-[3.5px] before:rounded-r-full before:bg-[var(--workspace-accent)]',
  workspace: 'min-w-0',
  topbar:
    'sticky top-0 z-35 flex min-h-[74px] items-center gap-4 border-b border-slate-200/80 bg-white/80 px-[clamp(20px,3.5vw,48px)] py-2.5 shadow-xs backdrop-blur-md max-[600px]:min-h-[66px] [&>div]:grid [&>div]:gap-0.5 [&>div>p]:text-[.64rem] [&>div>p]:font-bold [&>div>p]:tracking-[.12em] [&>div>p]:text-[var(--workspace-accent)] [&>div>p]:uppercase [&>div>strong]:text-[.95rem] [&>div>strong]:font-bold [&>div>strong]:text-slate-900 [&>nav]:ml-auto [&>nav]:flex [&>nav]:items-center [&>nav]:gap-3 max-[560px]:[&>div]:hidden',
  menuButton:
    'hidden size-10 cursor-pointer place-items-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-xs max-[820px]:grid [&>span]:mx-auto [&>span]:my-0.5 [&>span]:block [&>span]:h-0.5 [&>span]:w-5 [&>span]:bg-slate-700',
  rolePill:
    'inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--workspace-accent)_24%,transparent)] bg-[var(--workspace-accent-soft)] px-3 py-1 text-[.66rem] font-bold tracking-[.06em] text-[var(--workspace-accent)] uppercase max-[600px]:hidden',
  scrim:
    'fixed inset-0 z-40 hidden cursor-pointer border-0 bg-slate-900/50 backdrop-blur-xs max-[820px]:block',
} as const;

export const staffUi = {
  page:
    'mx-auto w-[min(calc(100%-48px),1440px)] pt-[clamp(36px,4vw,64px)] pb-16 max-[820px]:w-[min(calc(100%-28px),760px)]',
  narrowPage:
    'mx-auto w-[min(calc(100%-48px),1040px)] pt-[clamp(36px,4vw,64px)] pb-16 max-[820px]:w-[min(calc(100%-28px),760px)]',
  heading:
    'relative mb-8 flex items-end justify-between gap-6 border-b border-slate-200/80 pb-6 max-[640px]:flex-col max-[640px]:items-start max-[640px]:pb-4 [&_h1]:text-[clamp(1.8rem,3vw,2.5rem)] [&_h1]:leading-tight [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-slate-900 [&>div>p:last-child]:mt-2 [&>div>p:last-child]:max-w-2xl [&>div>p:last-child]:text-sm [&>div>p:last-child]:leading-relaxed [&>div>p:last-child]:text-slate-500',
  eyebrow:
    'mb-1.5 text-xs font-bold tracking-[.14em] text-[var(--workspace-accent,#2563eb)] uppercase',
  primaryAction:
    'inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--workspace-accent,#2563eb)] px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-white no-underline shadow-md shadow-blue-500/20 transition-all duration-150 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-65 max-[560px]:w-full',
  sectionHeading:
    'mb-5 flex items-end justify-between gap-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-slate-900 [&_a]:text-sm [&_a]:font-semibold [&_a]:text-[var(--workspace-accent,#2563eb)] [&_a]:no-underline hover:[&_a]:underline [&>span]:rounded-md [&>span]:border [&>span]:border-slate-200 [&>span]:bg-white [&>span]:px-2.5 [&>span]:py-1 [&>span]:text-[.68rem] [&>span]:font-bold [&>span]:tracking-[.06em] [&>span]:text-slate-500 [&>span]:uppercase',
  empty: commonUi.empty,
  help: 'mt-3 text-xs leading-5 text-amber-700',
  count:
    'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-xs',
  backLink:
    'mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--workspace-accent,#2563eb)] no-underline hover:underline',
  permissionStrip:
    'grid min-h-[80px] grid-cols-[minmax(240px,.7fr)_1fr_auto] items-center gap-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-5 shadow-xs max-[820px]:grid-cols-[1fr_auto] max-[820px]:[&>p]:col-span-full max-[560px]:grid-cols-1 [&>div]:flex [&>div]:items-center [&>div]:gap-3.5 [&_p]:text-sm [&_p]:text-emerald-950 [&_strong]:mt-0.5 [&_strong]:block [&_strong]:text-emerald-800 [&_a]:font-bold [&_a]:text-emerald-700 [&_a]:no-underline hover:[&_a]:underline',
  permissionMark:
    'grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-sm font-black text-white shadow-xs',
  lifecycleBoard: 'mt-10',
  lifecycleGrid:
    'grid grid-cols-3 gap-4 max-[820px]:grid-cols-1 [&_article]:flex [&_article]:flex-col [&_article]:justify-between [&_article]:rounded-2xl [&_article]:border [&_article]:border-slate-200/80 [&_article]:bg-white [&_article]:p-6 [&_article]:shadow-xs [&_article]:transition-all [&_article]:duration-150 hover:[&_article]:-translate-y-0.5 hover:[&_article]:shadow-md [&_article>p]:text-xs [&_article>p]:font-bold [&_article>p]:tracking-[.06em] [&_article>p]:text-slate-500 [&_article>p]:uppercase [&_article>strong]:my-2 [&_article>strong]:text-4xl [&_article>strong]:font-bold [&_article>strong]:text-slate-900 [&_article>span]:text-xs [&_article>span]:text-slate-500',
  courseSection: 'mt-10',
  courseList: 'grid gap-3',
  courseRow:
    'flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4.5 text-inherit no-underline shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus max-[560px]:flex-col max-[560px]:items-start [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 [&_p]:mt-0.5 [&_p]:text-xs [&_p]:text-slate-500',
  courseIndex:
    'grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700 ring-1 ring-blue-600/10',
  courseArrow: 'text-lg font-bold text-blue-600',
  status:
    'inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[.7rem] font-bold tracking-wide',
  statusDraft: 'border-amber-200 bg-amber-50 text-amber-700',
  statusSubmitted: 'border-sky-200 bg-sky-50 text-sky-700',
  statusPublished: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  statusRejected: 'border-rose-200 bg-rose-50 text-rose-700',
  courseTable:
    'overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs [&>header]:grid [&>header]:min-w-[880px] [&>header]:grid-cols-[minmax(260px,1.5fr)_100px_112px_minmax(150px,.7fr)_105px_28px] [&>header]:items-center [&>header]:gap-4 [&>header]:border-b [&>header]:border-slate-200 [&>header]:bg-slate-50/80 [&>header]:px-5 [&>header]:py-3.5 [&>header]:text-[.68rem] [&>header]:font-bold [&>header]:tracking-wider [&>header]:text-slate-500 [&>header]:uppercase [&>a]:grid [&>a]:min-h-[76px] [&>a]:min-w-[880px] [&>a]:grid-cols-[minmax(260px,1.5fr)_100px_112px_minmax(150px,.7fr)_105px_28px] [&>a]:items-center [&>a]:gap-4 [&>a]:border-b [&>a]:border-slate-100 [&>a]:px-5 [&>a]:py-3.5 [&>a]:text-inherit [&>a]:no-underline [&>a:last-child]:border-0 hover:[&>a]:bg-slate-50/80 [&>a>div:first-child]:grid [&>a>div:first-child]:gap-1 [&>a>span]:text-xs [&>a>span]:text-slate-500 [&_b]:text-lg [&_b]:text-blue-600',
  progress:
    'flex items-center gap-2.5 [&>span]:h-2 [&>span]:w-full [&>span]:overflow-hidden [&>span]:rounded-full [&>span]:bg-slate-100 [&_i]:block [&_i]:h-full [&_i]:rounded-full [&_i]:bg-blue-600 [&_small]:w-[34px] [&_small]:text-xs [&_small]:font-medium [&_small]:text-slate-500',
  timeline:
    'border border-[#dce1e7] bg-white p-[30px] shadow-[0_14px_38px_rgb(18_30_47_/_5%)] [&>header]:flex [&>header]:items-center [&>header]:gap-[18px] [&>header]:border-b [&>header]:border-line [&>header]:pb-[26px] [&_header_p]:text-xs [&_header_p]:text-[#747b8d] [&_header_span]:text-xs [&_header_span]:text-[#747b8d] [&_h2]:my-[3px] [&_h2]:text-[1.8rem] [&_h2]:text-[#176044]',
  permissionDetails:
    'grid grid-cols-2 gap-7 pt-[26px] max-[560px]:grid-cols-1 [&_span]:text-[.7rem] [&_span]:tracking-[.07em] [&_span]:text-[#747b8d] [&_span]:uppercase [&_p]:mt-2 [&_p]:leading-[1.6]',
  permissionGuidance:
    'mt-6 border-l-4 border-[#073d78] bg-[#eef3f8] px-[30px] py-7 [&_h2]:text-xl [&_ul]:mt-[18px] [&_ul]:grid [&_ul]:gap-2.5 [&_ul]:pl-5 [&_ul]:text-[#4e5668]',
  queueSummary:
    'grid grid-cols-2 gap-px border border-[#dce1e7] bg-[#dce1e7] shadow-[0_18px_50px_rgb(16_27_44_/_8%)] max-[700px]:grid-cols-1 [&>a]:grid [&>a]:min-h-[190px] [&>a]:grid-cols-[46px_minmax(0,1fr)_28px] [&>a]:items-center [&>a]:gap-[18px] [&>a]:bg-white [&>a]:p-7 [&>a]:text-inherit [&>a]:no-underline [&>a:hover]:-translate-y-0.5 [&>a:hover]:bg-[#f0f8f8] [&>a>span]:self-start [&>a>span]:text-xs [&>a>span]:font-extrabold [&>a>span]:text-[#176b73] [&>a>div]:grid [&>a>div]:gap-2 [&_p]:text-xs [&_p]:tracking-[.08em] [&_p]:text-[#687486] [&_p]:uppercase [&_strong]:text-[clamp(1.7rem,3vw,2.6rem)] [&_small]:text-[#747b8d] [&_b]:text-xl [&_b]:text-[#176b73]',
  worklist: 'mt-[62px]',
  mixedList:
    'border-t border-line [&>a]:grid [&>a]:min-h-[88px] [&>a]:grid-cols-[120px_minmax(0,1fr)_90px_80px] [&>a]:items-center [&>a]:gap-[18px] [&>a]:border-b [&>a]:border-line [&>a]:px-2 [&>a]:py-3.5 [&>a]:text-inherit [&>a]:no-underline [&>a:hover]:bg-white [&>a>div]:grid [&>a>div]:gap-1 [&_small]:text-xs [&_small]:text-[#747b8d] [&_time]:text-xs [&_time]:text-[#747b8d] [&_b]:text-xs [&_b]:text-[#176b73]',
  approvalType:
    'w-max border border-[#dec66d] bg-[#fff4cb] px-[9px] py-1.5 text-[.66rem] font-extrabold tracking-[.05em] text-[#5d4d13] uppercase',
  approvalTypeCourse: 'border-[#82c2c4] bg-[#e5f4f4] text-[#175b62]',
  requestList:
    'grid gap-[18px] [&>article]:border [&>article]:border-[#dce1e7] [&>article]:bg-white [&>article]:shadow-[0_14px_38px_rgb(18_30_47_/_5%)] [&_article>header]:grid [&_article>header]:min-h-[84px] [&_article>header]:grid-cols-[40px_minmax(0,1fr)_auto] [&_article>header]:items-center [&_article>header]:gap-4 [&_article>header]:border-b [&_article>header]:border-line [&_article>header]:px-[22px] [&_article>header]:py-[17px] [&_article>header>span]:text-xs [&_article>header>span]:font-extrabold [&_article>header>span]:text-[#176b73] [&_h2]:text-base [&_header_p]:mt-1 [&_header_p]:text-xs [&_header_p]:text-[#747b8d] [&_time]:bg-[#fff5d9] [&_time]:px-2 [&_time]:py-1.5 [&_time]:text-xs [&_time]:text-[#705615] [&_blockquote]:m-0 [&_blockquote]:px-[78px] [&_blockquote]:py-6 [&_blockquote]:leading-[1.65] [&_blockquote]:text-[#4e5668] max-[700px]:[&_blockquote]:px-[22px] [&_article>footer]:flex [&_article>footer]:min-h-[66px] [&_article>footer]:items-center [&_article>footer]:justify-between [&_article>footer]:gap-5 [&_article>footer]:border-t [&_article>footer]:border-line [&_article>footer]:bg-[#f7f8fa] [&_article>footer]:px-[22px] [&_article>footer]:py-3 [&_footer>span]:text-xs [&_footer>span]:text-[#747b8d] [&_footer>div]:flex [&_footer>div]:gap-2 [&_button]:min-h-10 [&_button]:cursor-pointer [&_button]:border [&_button]:border-[#b86b72] [&_button]:bg-white [&_button]:px-4 [&_button]:py-2 [&_button]:text-xs [&_button]:font-bold [&_button]:text-[#8d3039] [&_button:last-child]:border-[#176b73] [&_button:last-child]:bg-[#176b73] [&_button:last-child]:text-white',
  reviewTable:
    'overflow-x-auto border border-[#dce1e7] bg-white shadow-[0_14px_38px_rgb(18_30_47_/_5%)] [&>header]:grid [&>header]:min-w-[850px] [&>header]:grid-cols-[minmax(300px,1.5fr)_180px_115px_85px_85px] [&>header]:items-center [&>header]:gap-[18px] [&>header]:border-b [&>header]:border-line [&>header]:bg-[#e9edf1] [&>header]:px-5 [&>header]:py-[17px] [&>header]:text-[.68rem] [&>header]:font-bold [&>header]:tracking-[.07em] [&>header]:text-[#747b8d] [&>header]:uppercase [&>a]:grid [&>a]:min-h-[88px] [&>a]:min-w-[850px] [&>a]:grid-cols-[minmax(300px,1.5fr)_180px_115px_85px_85px] [&>a]:items-center [&>a]:gap-[18px] [&>a]:border-b [&>a]:border-line [&>a]:px-5 [&>a]:py-[17px] [&>a]:text-inherit [&>a]:no-underline [&>a:hover]:bg-[#f0f8f8] [&>a>div]:grid [&>a>div]:gap-1 [&>a_span]:text-xs [&>a_span]:text-[#747b8d] [&>a>strong]:text-xs [&>a>strong]:text-[#725918] [&>a>b]:text-xs [&>a>b]:text-[#176b73]',
  reviewHeader:
    'flex items-end justify-between gap-[30px] border-b border-line pb-7 max-[700px]:flex-col max-[700px]:items-start [&_h1]:max-w-[850px] [&_h1]:text-[clamp(2rem,4vw,3.8rem)] [&>div>p:last-child]:mt-3.5 [&>div>p:last-child]:text-[#747b8d] [&>span]:border [&>span]:border-[#e2cb83] [&>span]:bg-[#fff5d9] [&>span]:px-2.5 [&>span]:py-2 [&>span]:text-xs [&>span]:text-[#705615]',
  reviewLayout:
    'mt-[34px] grid grid-cols-[minmax(0,1fr)_380px] items-start gap-7 max-[980px]:grid-cols-1',
  reviewEvidence:
    'border border-[#dce1e7] bg-white shadow-[0_14px_38px_rgb(18_30_47_/_5%)] [&>header]:border-b [&>header]:border-line [&>header]:p-6 [&_h2]:text-[1.35rem] [&_header_p]:mt-[7px] [&_header_p]:text-sm [&_header_p]:text-[#747b8d] [&_ol]:m-0 [&_ol]:list-none [&_ol]:p-0 [&_li]:grid [&_li]:min-h-[90px] [&_li]:grid-cols-[38px_minmax(0,1fr)_auto] [&_li]:items-center [&_li]:gap-3.5 [&_li]:border-b [&_li]:border-line [&_li]:px-[22px] [&_li]:py-[15px] [&_li>span]:text-[.7rem] [&_li>span]:text-[#747b8d] [&_li>div]:grid [&_li>div]:gap-1 [&_li_p]:text-xs [&_li_p]:leading-[1.45] [&_li_p]:text-[#747b8d] [&_li>b]:bg-[#e8f5ef] [&_li>b]:px-2 [&_li>b]:py-1 [&_li>b]:text-[.65rem] [&_li>b]:text-[#176044] [&_li>b]:uppercase',
  decisionPanel:
    'sticky top-6 border-t-4 border-[#176b73] bg-white p-6 shadow-[0_12px_30px_rgb(27_42_56_/_10%)] max-[980px]:static [&_h2]:text-[1.35rem] [&>p:not(:first-child)]:mt-[7px] [&>p:not(:first-child)]:text-sm [&>p:not(:first-child)]:leading-[1.55] [&>p:not(:first-child)]:text-[#747b8d] [&_label]:mt-6 [&_label]:grid [&_label]:gap-2 [&_label]:text-xs [&_label]:font-bold [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:border [&_textarea]:border-[#bfc5d0] [&_textarea]:bg-white [&_textarea]:p-3 [&_textarea]:font-normal [&>div]:mt-4 [&>div]:grid [&>div]:grid-cols-2 [&>div]:gap-2 [&_button]:min-h-10 [&_button]:cursor-pointer [&_button]:border [&_button]:border-[#b86b72] [&_button]:bg-white [&_button]:px-2.5 [&_button]:py-2 [&_button]:text-xs [&_button]:font-bold [&_button]:text-[#8d3039] [&_button:last-child]:border-[#176b73] [&_button:last-child]:bg-[#176b73] [&_button:last-child]:text-white [&>small]:mt-3.5 [&>small]:block [&>small]:text-[.67rem] [&>small]:leading-[1.5] [&>small]:text-[#747b8d]',
} as const;

export const formUi = {
  page:
    'mx-auto w-[min(calc(100%-64px),1000px)] pt-[clamp(52px,5.5vw,82px)] pb-[72px] max-[820px]:w-[min(calc(100%-36px),760px)]',
  form:
    'grid gap-[22px] [&>section]:border [&>section]:border-[#dce1e7] [&>section]:bg-white [&>section]:p-[30px] [&>section]:shadow-[0_14px_38px_rgb(18_30_47_/_5%)] [&_section>header]:mb-7 [&_section>header]:flex [&_section>header]:items-start [&_section>header]:gap-[17px] [&_section>header>span]:grid [&_section>header>span]:size-[38px] [&_section>header>span]:place-items-center [&_section>header>span]:bg-[#e8eef5] [&_section>header>span]:text-xs [&_section>header>span]:font-extrabold [&_section>header>span]:text-[#073d78] [&_section_h2]:text-xl [&_section_header_p]:mt-1 [&_section_header_p]:text-xs [&_section_header_p]:text-[#747b8d] [&>section>label]:mt-5 [&>section>label]:grid [&>section>label]:gap-2 [&>section>label]:text-sm [&>section>label]:font-bold [&_input:not([type=checkbox]):not([type=radio])]:w-full [&_input:not([type=checkbox]):not([type=radio])]:border [&_input:not([type=checkbox]):not([type=radio])]:border-[#bfc5d0] [&_input:not([type=checkbox]):not([type=radio])]:bg-white [&_input:not([type=checkbox]):not([type=radio])]:px-3.5 [&_input:not([type=checkbox]):not([type=radio])]:py-3 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:border [&_textarea]:border-[#bfc5d0] [&_textarea]:bg-white [&_textarea]:px-3.5 [&_textarea]:py-3 [&_textarea]:leading-[1.6] [&_fieldset]:m-0 [&_fieldset]:border-0 [&_fieldset]:p-0 [&_legend]:mb-3 [&_legend]:text-sm [&_legend]:font-bold [&>footer]:flex [&>footer]:items-center [&>footer]:justify-end [&>footer]:gap-[18px] [&>footer]:pt-3 [&>footer>a]:text-[#747b8d] [&>footer>a]:no-underline [&>footer>button]:min-h-12 [&>footer>button]:border-0 [&>footer>button]:bg-[#073d78] [&>footer>button]:px-[23px] [&>footer>button]:py-3 [&>footer>button]:font-bold [&>footer>button]:text-white [&>footer>button:disabled]:cursor-not-allowed [&>footer>button:disabled]:bg-[#dfe2e7] [&>footer>button:disabled]:text-[#8d93a0]',
  choices:
    'grid grid-cols-2 border-t border-l border-line max-[560px]:grid-cols-1 [&_label]:flex [&_label]:min-h-[52px] [&_label]:cursor-pointer [&_label]:items-center [&_label]:gap-2.5 [&_label]:border-r [&_label]:border-b [&_label]:border-line [&_label]:p-3 [&_label]:text-sm [&_input]:size-[17px] [&_input]:accent-[#073d78]',
} as const;

export const ownerUi = {
  liveLabel:
    'inline-flex items-center gap-2 border border-line bg-white px-3 py-[9px] text-[.71rem] font-bold tracking-[.03em] whitespace-nowrap text-[#53616f] [&_i]:size-[7px] [&_i]:rounded-full [&_i]:bg-[#258161] [&_i]:shadow-[0_0_0_3px_#ddf1e8]',
  metricStrip:
    'grid grid-cols-5 gap-px border border-[#dce1e7] bg-[#dce1e7] shadow-[0_18px_50px_rgb(16_27_44_/_8%)] max-[1180px]:grid-cols-3 max-[600px]:grid-cols-1 [&_article]:flex [&_article]:min-h-[205px] [&_article]:flex-col [&_article]:bg-white [&_article]:p-5 [&_article]:transition [&_article:hover]:-translate-y-0.5 [&_article:hover]:bg-[#fcf8f0] [&_article>span]:text-[.65rem] [&_article>span]:font-extrabold [&_article>span]:text-[#0b5b73] [&_article>p]:mt-[30px] [&_article>p]:text-xs [&_article>p]:tracking-[.07em] [&_article>p]:text-[#747b8d] [&_article>p]:uppercase [&_article>strong]:mt-1 [&_article>strong]:text-[clamp(2rem,3vw,3.15rem)] [&_article>strong]:font-semibold [&_article>strong]:tracking-[-.06em] [&_article>strong]:text-[#1c2632] [&_article>div]:mt-auto [&_article>div]:grid [&_article>div]:gap-1 [&_article_small]:text-[.68rem] [&_article_small]:leading-[1.4] [&_article_small]:text-[#747b8d]',
  overviewGrid:
    'mt-[52px] grid grid-cols-[minmax(0,1.55fr)_minmax(300px,.7fr)] gap-6 max-[860px]:grid-cols-1',
  panel:
    'min-w-0 border border-[#dce1e7] bg-white p-7 shadow-[0_14px_38px_rgb(18_30_47_/_5%)] [&>header]:flex [&>header]:items-start [&>header]:justify-between [&>header]:gap-5 [&_header_h2]:text-[1.35rem] [&_header_h2]:text-[#1c2632] [&_header_a]:text-xs [&_header_a]:font-bold [&_header_a]:text-[#0b5b73] [&_header_a]:no-underline [&_header>span]:text-xs [&_header>span]:font-bold [&_header>span]:text-[#0b5b73]',
  barChart:
    'mt-[42px] grid h-[245px] grid-cols-[repeat(auto-fit,minmax(24px,1fr))] items-end gap-[clamp(7px,1vw,14px)] border-b border-[#aeb7c2] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_48px,#edf0f3_49px)] pt-7 max-[600px]:gap-1 [&>div]:grid [&>div]:h-full [&>div]:grid-rows-[1fr_28px] [&>div]:items-end [&>div]:gap-2 [&>div>span]:relative [&>div>span]:block [&>div>span]:min-h-2 [&>div>span]:bg-[#0b5b73] [&_b]:absolute [&_b]:-top-[22px] [&_b]:left-1/2 [&_b]:-translate-x-1/2 [&_b]:text-[.58rem] [&_b]:font-semibold [&_b]:text-[#576676] max-[600px]:[&_b]:hidden [&_small]:self-start [&_small]:text-center [&_small]:text-[.58rem] [&_small]:text-[#747b8d]',
  traffic:
    '[&>footer]:mt-5 [&>footer]:flex [&>footer]:items-baseline [&>footer]:gap-3 [&>footer>strong]:text-[1.35rem] [&>footer>strong]:text-[#1c2632] [&>footer>span]:text-xs [&>footer>span]:text-[#747b8d]',
  outcome:
    '[&>strong]:mt-12 [&>strong]:block [&>strong]:text-[clamp(3.4rem,6vw,5.6rem)] [&>strong]:font-medium [&>strong]:tracking-[-.08em] [&>strong]:text-[#0b5b73] [&>p]:mt-1.5 [&>p]:max-w-[270px] [&>p]:text-xs [&>p]:leading-[1.55] [&>p]:text-[#747b8d] [&_dl]:mt-[26px] [&_dl]:grid [&_dl]:grid-cols-2 [&_dl]:border-t [&_dl]:border-line [&_dl>div]:grid [&_dl>div]:gap-1 [&_dl>div]:pt-[18px] [&_dt]:text-[.68rem] [&_dt]:text-[#747b8d] [&_dt]:uppercase [&_dd]:m-0 [&_dd]:text-lg [&_dd]:font-bold [&_dd]:text-[#1c2632]',
  outcomeTrack:
    'mt-[30px] h-2.5 overflow-hidden bg-[#d6dbe2] [&>span]:block [&>span]:h-full [&>span]:bg-[#0b5b73]',
  listSection: 'mt-16',
  courseTable:
    'overflow-x-auto border border-[#dce1e7] bg-white shadow-[0_14px_38px_rgb(18_30_47_/_5%)] [&>header]:grid [&>header]:min-w-[900px] [&>header]:grid-cols-[minmax(310px,1.5fr)_190px_110px_180px] [&>header]:items-center [&>header]:gap-5 [&>header]:bg-[#e9edf1] [&>header]:py-[13px] [&>header]:pr-[22px] [&>header]:pl-[76px] [&>header]:text-[.65rem] [&>header]:font-bold [&>header]:tracking-[.07em] [&>header]:text-[#747b8d] [&>header]:uppercase [&>div]:grid [&>div]:min-h-[82px] [&>div]:min-w-[900px] [&>div]:grid-cols-[34px_minmax(250px,1.5fr)_190px_110px_180px] [&>div]:items-center [&>div]:gap-5 [&>div]:border-t [&>div]:border-line [&>div]:px-[22px] [&>div]:py-[13px] [&>div:hover]:bg-[#fcf8f0] [&_small]:text-[.7rem] [&_small]:text-[#747b8d] [&>div>b]:text-sm [&>div>b]:text-[#1c2632]',
  rank: 'text-[.65rem] font-extrabold text-[#0b5b73]',
  roleGrid:
    'grid grid-cols-4 gap-px border border-[#dce1e7] bg-[#dce1e7] shadow-[0_18px_50px_rgb(16_27_44_/_8%)] max-[1180px]:grid-cols-2 max-[600px]:grid-cols-1 [&_article]:grid [&_article]:min-h-[180px] [&_article]:grid-cols-[26px_minmax(0,1fr)_auto] [&_article]:gap-3 [&_article]:bg-white [&_article]:p-[22px] [&_article]:transition [&_article:hover]:-translate-y-0.5 [&_article:hover]:bg-[#fcf8f0] [&_article>span]:text-[.65rem] [&_article>span]:font-extrabold [&_article>span]:text-[#0b5b73] [&_article>div]:grid [&_article>div]:content-center [&_article>div]:gap-1.5 [&_article_p]:text-[.7rem] [&_article_p]:tracking-[.06em] [&_article_p]:text-[#747b8d] [&_article_p]:uppercase [&_article_strong]:text-[2.6rem] [&_article_strong]:font-semibold [&_article_strong]:tracking-[-.05em] [&_article_strong]:text-[#1c2632] [&_article_small]:text-[.68rem] [&_article_small]:text-[#747b8d] [&_article>b]:self-start [&_article>b]:text-xs [&_article>b]:text-[#247458]',
  userTable:
    'overflow-x-auto border border-[#dce1e7] bg-white shadow-[0_14px_38px_rgb(18_30_47_/_5%)] [&>header]:grid [&>header]:min-w-[900px] [&>header]:grid-cols-[minmax(240px,1.4fr)_130px_minmax(200px,1fr)_110px_100px] [&>header]:items-center [&>header]:gap-[18px] [&>header]:bg-[#e9edf1] [&>header]:px-5 [&>header]:py-3.5 [&>header]:text-[.65rem] [&>header]:font-bold [&>header]:tracking-[.07em] [&>header]:text-[#747b8d] [&>header]:uppercase [&>div]:grid [&>div]:min-h-[76px] [&>div]:min-w-[900px] [&>div]:grid-cols-[minmax(240px,1.4fr)_130px_minmax(200px,1fr)_110px_100px] [&>div]:items-center [&>div]:gap-[18px] [&>div]:border-t [&>div]:border-line [&>div]:px-5 [&>div]:py-3.5 [&>div]:text-xs [&>div]:text-[#5e6877] [&>div:hover]:bg-[#fcf8f0] [&>div>div]:grid [&>div>div]:gap-1 [&_small]:text-[.68rem] [&_small]:text-[#747b8d] [&_time]:text-[.68rem] [&_time]:text-[#747b8d] [&_b]:flex [&_b]:items-center [&_b]:gap-[7px] [&_b]:text-xs [&_b]:text-[#247458] [&_b>i]:size-[7px] [&_b>i]:rounded-full [&_b>i]:bg-[#2b8968]',
  inactive: '!text-[#8d3039] [&>i]:!bg-[#ad424b]',
  donut:
    'mx-auto mt-12 mb-[26px] grid size-[190px] place-items-center rounded-full [&>span]:grid [&>span]:size-[135px] [&>span]:place-content-center [&>span]:gap-1 [&>span]:rounded-full [&>span]:bg-white [&>span]:text-center [&_strong]:text-[2rem] [&_strong]:text-[#1c2632] [&_small]:text-[.7rem] [&_small]:text-[#747b8d] [&_small]:uppercase',
  activity:
    'border border-[#dce1e7] bg-white shadow-[0_14px_38px_rgb(18_30_47_/_5%)] [&_article]:grid [&_article]:min-h-[78px] [&_article]:grid-cols-[70px_12px_minmax(0,1fr)] [&_article]:items-center [&_article]:gap-[18px] [&_article]:border-b [&_article]:border-line [&_article]:px-6 [&_article]:py-3.5 [&_time]:text-xs [&_time]:font-extrabold [&_time]:text-[#0b5b73] [&_article>span]:size-[9px] [&_article>span]:rounded-full [&_article>span]:border-2 [&_article>span]:border-[#c89331] [&_article>div]:grid [&_article>div]:gap-1 [&_p]:text-xs [&_p]:text-[#747b8d]',
} as const;
