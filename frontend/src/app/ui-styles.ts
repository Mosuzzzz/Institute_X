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
    '[--workspace-accent:#2463a8] [--workspace-accent-soft:#e8f0fa] [--workspace-rail:#101a2a]',
  approver:
    '[--workspace-accent:#14747a] [--workspace-accent-soft:#e3f2f1] [--workspace-rail:#10272c]',
  owner:
    '[--workspace-accent:#a96f1d] [--workspace-accent-soft:#f8eddc] [--workspace-rail:#1b2028]',
};

export const workspaceUi = {
  shell: (role: WorkspaceRole) =>
    `grid min-h-svh grid-cols-[286px_minmax(0,1fr)] bg-[#f3f5f7] text-[#20243a] max-[1100px]:grid-cols-[244px_minmax(0,1fr)] max-[820px]:block ${roleTheme[role]}`,
  sidebar: (open: boolean) =>
    `sticky top-0 z-50 grid h-svh grid-rows-[auto_1fr_auto] overflow-hidden bg-[var(--workspace-rail)] px-[22px] pt-[30px] pb-6 text-white shadow-[12px_0_40px_rgb(12_20_32_/_9%)] max-[820px]:fixed max-[820px]:left-0 max-[820px]:w-[min(88vw,320px)] max-[820px]:transition-transform max-[820px]:duration-200 ${open ? 'max-[820px]:translate-x-0' : 'max-[820px]:-translate-x-[105%]'}`,
  brandHeader:
    'flex items-center justify-between [&>button]:hidden [&>button]:cursor-pointer [&>button]:border-0 [&>button]:bg-transparent [&>button]:text-3xl [&>button]:text-white max-[820px]:[&>button]:block',
  brandLink:
    'flex min-w-0 items-center gap-[15px] text-white no-underline [&>img]:size-[42px] [&>img]:shrink-0 [&>img]:bg-white [&>img]:p-[7px] [&>img]:shadow-[0_8px_22px_rgb(0_0_0_/_18%)] [&>span]:grid [&>span]:min-w-0 [&>span]:gap-0.5 [&_small]:text-[.6rem] [&_small]:font-medium [&_small]:tracking-[.16em] [&_small]:text-[#8490a3] [&_small]:uppercase [&_strong]:overflow-hidden [&_strong]:text-[.9rem] [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_strong]:text-[#f8fafc]',
  navigation:
    'mt-[62px] grid content-start gap-[7px] [&_svg]:size-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.7]',
  navLabel:
    'mx-[13px] mt-0 mb-[13px] text-[.6rem] font-semibold tracking-[.16em] text-[#6f7b8e] uppercase',
  navLink:
    'relative grid min-h-[54px] grid-cols-[21px_minmax(0,1fr)_16px] items-center gap-[13px] border border-transparent px-3.5 py-[13px] text-[#aeb8c7] no-underline transition duration-150 hover:translate-x-0.5 hover:bg-white/5 hover:text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus [&>b]:justify-self-end [&>b]:text-[.85rem] [&>b]:opacity-0 hover:[&>b]:opacity-100',
  navLinkActive:
    'bg-[#f8fafc] text-[#101a2a] shadow-[0_12px_30px_rgb(0_0_0_/_16%)] before:absolute before:inset-y-[9px] before:left-0 before:w-[3px] before:bg-[var(--workspace-accent)] [&>b]:opacity-100',
  accountFooter:
    'grid min-w-0 grid-cols-[39px_minmax(0,1fr)] items-center gap-3 border-t border-white/10 pt-[18px] [&>div]:min-w-0 [&_p]:text-[.58rem] [&_p]:tracking-[.08em] [&_p]:text-[#758196] [&_p]:uppercase [&_strong]:mt-1 [&_strong]:block [&_strong]:overflow-hidden [&_strong]:text-[.8rem] [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_strong]:text-[#f3f6fa] [&_div>span]:mt-0.5 [&_div>span]:block [&_div>span]:overflow-hidden [&_div>span]:text-[.65rem] [&_div>span]:text-ellipsis [&_div>span]:whitespace-nowrap [&_div>span]:text-[#8f9bad]',
  avatar:
    'grid size-[39px] place-items-center bg-[var(--workspace-accent)] text-[.7rem] font-bold tracking-[.06em] text-white',
  workspace: 'min-w-0',
  topbar:
    'sticky top-0 z-35 flex min-h-[82px] items-center gap-[18px] border-b border-[#dfe3e8] bg-white/90 px-[clamp(22px,3.5vw,54px)] py-3 shadow-[0_6px_24px_rgb(18_30_47_/_4%)] backdrop-blur-[18px] max-[600px]:min-h-[72px] [&>div]:grid [&>div]:gap-[3px] [&>div>p]:text-[.62rem] [&>div>p]:font-bold [&>div>p]:tracking-[.13em] [&>div>p]:text-[var(--workspace-accent)] [&>div>p]:uppercase [&>div>strong]:text-base [&>div>strong]:font-semibold [&>div>strong]:text-[#182333] [&>nav]:ml-auto [&>nav]:flex [&>nav]:items-center [&>nav]:gap-3.5 max-[560px]:[&>div]:hidden',
  menuButton:
    'hidden size-[42px] cursor-pointer place-items-center border border-line bg-transparent p-[9px] max-[820px]:grid [&>span]:mx-auto [&>span]:my-1 [&>span]:block [&>span]:h-px [&>span]:w-5 [&>span]:bg-[#20243a]',
  rolePill:
    'inline-flex min-h-[31px] items-center border border-[color-mix(in_srgb,var(--workspace-accent)_24%,transparent)] bg-[var(--workspace-accent-soft)] px-[11px] py-1.5 text-[.64rem] font-bold tracking-[.08em] text-[var(--workspace-accent)] uppercase max-[600px]:hidden',
  scrim:
    'fixed inset-0 z-40 hidden cursor-pointer border-0 bg-[#071124]/45 max-[820px]:block',
} as const;

export const staffUi = {
  page:
    'mx-auto w-[min(calc(100%-72px),1420px)] pt-[clamp(52px,5.5vw,82px)] pb-[72px] max-[820px]:w-[min(calc(100%-36px),760px)] [&_h1]:text-[#182333] [&_h2]:text-[#182333] [&_h3]:text-[#182333]',
  narrowPage:
    'mx-auto w-[min(calc(100%-64px),1050px)] pt-[clamp(52px,5.5vw,82px)] pb-[72px] max-[820px]:w-[min(calc(100%-36px),760px)]',
  heading:
    'relative mb-[46px] flex items-end justify-between gap-8 border-b border-[#d8dde4] pb-[30px] after:absolute after:bottom-[-1px] after:left-0 after:h-[3px] after:w-[74px] after:bg-[var(--workspace-accent,#2463a8)] max-[560px]:flex-col max-[560px]:items-start max-[560px]:pb-6 [&_h1]:text-[clamp(2.6rem,4.5vw,4.8rem)] [&_h1]:leading-none [&_h1]:font-medium [&_h1]:tracking-[-.055em] [&_h1]:text-[#182333] [&>div>p:last-child]:mt-[15px] [&>div>p:last-child]:max-w-[650px] [&>div>p:last-child]:leading-[1.6] [&>div>p:last-child]:text-[#747b8d]',
  eyebrow:
    'mb-2 text-xs font-bold tracking-[.13em] text-[var(--workspace-accent,#2463a8)] uppercase',
  primaryAction:
    'inline-grid min-h-12 cursor-pointer place-items-center border border-[var(--workspace-accent,#2463a8)] bg-[var(--workspace-accent,#2463a8)] px-[22px] py-3 font-bold whitespace-nowrap text-white no-underline shadow-[0_10px_24px_rgb(18_60_110_/_18%)] hover:brightness-90 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-65 max-[560px]:w-full',
  sectionHeading:
    'mb-[22px] flex items-end justify-between gap-6 [&_h2]:text-[clamp(1.6rem,2.5vw,2.2rem)] [&_a]:text-sm [&_a]:font-bold [&_a]:text-[var(--workspace-accent,#2463a8)] [&_a]:no-underline [&>span]:border [&>span]:border-line [&>span]:px-2 [&>span]:py-1 [&>span]:text-[.67rem] [&>span]:tracking-[.08em] [&>span]:text-[#747b8d] [&>span]:uppercase',
  empty: commonUi.empty,
  help: 'mt-3.5 text-xs leading-6 text-[#8b631e]',
  count:
    'inline-flex items-center gap-2 border border-line bg-white px-3 py-[9px] text-xs font-bold tracking-[.04em] text-[#52616c]',
  backLink:
    'mb-[34px] inline-block text-[.82rem] font-bold text-[var(--workspace-accent,#2463a8)] no-underline',
  permissionStrip:
    'grid min-h-[88px] grid-cols-[minmax(250px,.7fr)_1fr_auto] items-center gap-7 border-y border-[#b8d9ca] bg-[#edf6f2] px-6 py-[18px] max-[820px]:grid-cols-[1fr_auto] max-[820px]:[&>p]:col-span-full max-[560px]:grid-cols-1 [&>div]:flex [&>div]:items-center [&>div]:gap-3.5 [&_p]:text-sm [&_p]:text-[#52635c] [&_strong]:mt-0.5 [&_strong]:block [&_strong]:text-[#18553f] [&_a]:font-bold [&_a]:text-[#18553f] [&_a]:no-underline',
  permissionMark:
    'grid size-[38px] shrink-0 place-items-center rounded-full bg-[#237858] font-extrabold text-white',
  lifecycleBoard: 'mt-[66px]',
  lifecycleGrid:
    'grid grid-cols-3 gap-px border border-[#dce1e7] bg-[#dce1e7] shadow-[0_18px_50px_rgb(16_27_44_/_8%)] max-[820px]:grid-cols-1 [&_article]:grid [&_article]:min-h-[190px] [&_article]:content-between [&_article]:bg-white [&_article]:p-6 [&_article]:transition [&_article:hover]:-translate-y-0.5 [&_article:hover]:bg-[#f5f8fc] [&_article>p]:text-xs [&_article>p]:font-bold [&_article>p]:tracking-[.08em] [&_article>p]:text-[#747b8d] [&_article>p]:uppercase [&_article>strong]:text-6xl [&_article>strong]:leading-none [&_article>span]:text-sm [&_article>span]:text-[#747b8d]',
  courseSection: 'mt-[66px]',
  courseList: 'border-t border-line',
  courseRow:
    'grid min-h-[88px] grid-cols-[56px_minmax(0,1fr)_120px_28px] items-center gap-5 border-b border-line px-1 py-3.5 text-inherit no-underline hover:bg-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus max-[560px]:grid-cols-[48px_minmax(0,1fr)_24px] max-[560px]:gap-3 [&_h3]:text-base [&_p]:mt-1 [&_p]:text-xs [&_p]:text-[#747b8d]',
  courseIndex:
    'grid size-[45px] place-items-center bg-[#e8eef5] text-xs font-extrabold text-[#073d78]',
  courseArrow: 'text-xl text-[#073d78]',
  status:
    'inline-grid w-max min-w-[88px] place-items-center border px-2.5 py-1.5 text-[.66rem] font-extrabold tracking-[.06em]',
  statusDraft: 'border-[#e4ca72] bg-[#fff6d8] text-[#6e5510]',
  statusSubmitted: 'border-[#89bdd7] bg-[#e5f3fa] text-[#185578]',
  statusPublished: 'border-[#86c5a9] bg-[#e8f5ef] text-[#176044]',
  statusRejected: 'border-[#d99da2] bg-[#fae9eb] text-[#8b343b]',
  courseTable:
    'overflow-x-auto border border-[#dce1e7] bg-white shadow-[0_14px_38px_rgb(18_30_47_/_5%)] [&>header]:grid [&>header]:min-w-[880px] [&>header]:grid-cols-[minmax(260px,1.5fr)_100px_112px_minmax(150px,.7fr)_105px_28px] [&>header]:items-center [&>header]:gap-[18px] [&>header]:border-b [&>header]:border-line [&>header]:bg-[#e9edf1] [&>header]:px-5 [&>header]:py-[17px] [&>header]:text-[.68rem] [&>header]:font-bold [&>header]:tracking-[.07em] [&>header]:text-[#747b8d] [&>header]:uppercase [&>a]:grid [&>a]:min-h-[84px] [&>a]:min-w-[880px] [&>a]:grid-cols-[minmax(260px,1.5fr)_100px_112px_minmax(150px,.7fr)_105px_28px] [&>a]:items-center [&>a]:gap-[18px] [&>a]:border-b [&>a]:border-line [&>a]:px-5 [&>a]:py-[17px] [&>a]:text-inherit [&>a]:no-underline [&>a:hover]:bg-[#f4f7fb] [&>a>div:first-child]:grid [&>a>div:first-child]:gap-1 [&>a>span]:text-xs [&>a>span]:text-[#747b8d] [&_b]:text-xl [&_b]:text-[#073d78]',
  progress:
    'flex items-center gap-2.5 [&>span]:h-1.5 [&>span]:w-full [&>span]:overflow-hidden [&>span]:bg-[#e0e3e9] [&_i]:block [&_i]:h-full [&_i]:bg-[#073d78] [&_small]:w-[34px] [&_small]:text-[#747b8d]',
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
