# Interface refinement

Date: 14 September 2026

This pass refines the existing Institute X interface across authentication, student learning and assessments, teacher authoring and analytics, approval queues and previews, Registrar role management, and Executive analytics. It preserves the product rules in `PRODUCT.md` and the existing Kanit typography, logo, and role accents.

## Changes

- Desktop workspace navigation displays labels continuously. Mobile drawers are explicitly hidden when closed and support focus containment, Escape, focus restoration, and background scroll locking.
- Student navigation retains access to My learning on small screens. Search, language selection, and account controls adapt to available space.
- Shared headings, forms, focus indicators, placeholder contrast, corners, and browser behavior are consistent across routes.
- Student and teacher summaries become compact on mobile. Teacher course titles wrap, artwork fits the rail, and filters adapt to one column.
- Registrar user rows become vertically arranged records on mobile, retaining every role action. Loading, error, search-empty, and audit-empty states are explicit.
- Course-review queue rows become vertically arranged records with metadata labels and a visible review action on mobile.
- Teacher editor icons use Bootstrap Icons. Editor headers and forms match the surrounding system, and new-course navigation uses less mobile space.
- Lesson viewers adapt their height to smaller screens. Assessment question numbers stay on one line, and submit actions fill the available mobile width.
- Status pages retain their existing content and recovery actions, with corrected mobile button sizing.

## Verification

The browser checks use temporary mocked API fixtures with long Thai titles and option text. No test sends mutations to the real backend. The application Browser runtime could not initialize in this environment, so checks use a separate headless Chromium session.

Twenty-one distinct screens were checked at widths 320, 390, 540, 768, 820, 821, 1024, 1440, and 1920 pixels. No document-level horizontal overflow or JavaScript page errors were observed in the completed checks. Desktop and mobile screenshots were inspected in one initial batch, defects were corrected together, and a confirmation batch was inspected. The final TrafficRow grouping correction was identified in that confirmation and checked in source; the teacher screenshot predates that small correction.

Interaction checks cover the three staff workspace drawers, keyboard focus containment and restoration, profile-menu keyboard navigation, workspace navigation in all four supported languages, teacher and Registrar search-empty states, teacher editor tabs, and Approver preview tabs. Additional checks cover loading and simulated service errors for all five roles at phone and landscape sizes, email and OTP validation and recovery, and Post-Test start, answer selection, submission, and the recorded-result state.

`npm run typecheck`, `npm run lint`, and `npm run build` were run. Lint retains the existing `@next/next/no-img-element` warning in `course-cover-image.tsx`; it has no lint errors. The build uses the installed WASM fallback because the native SWC package is absent.

These checks establish representative Chromium coverage. They do not certify every physical device, browser, resolution, translation, or the live backend's behavior. Data-heavy analytics tables retain local horizontal scrolling so all columns remain available.

Machine-readable results are in [verification.json](verification.json). Representative captures:

- [Registrar](registrar-responsive.png)
- [Executive](executive-responsive.png)
- [Teacher](teacher-responsive.png)
- [Course review queue](course-reviews-responsive.png)
- [Assessment](assessment-responsive.png)
- [Not found](not-found-responsive.png)

## Composition reference

The project's confirmed `comp-first` workflow was followed using the built-in ImageGen tool. The composition reference is saved as [impeccable-ui-comp.png](impeccable-ui-comp.png). Generated sample content, statistics, navigation items, and decorative elements are not product evidence and were not added as capabilities. The existing application remains the authority for behavior and content.

Final generation prompt:

> Use case: ui-mockup. Create a high fidelity responsive UI composition reference board for an existing vocational school learning management web app Institute X. This is a refinement of an established interface: preserve restrained navy blue #063777, white surfaces, pale cool gray canvas #f5f7fb, Kanit Thai typography, simple Bootstrap outline icons. Show a large desktop teacher workspace and a mobile variant side by side, plus small student catalog and OTP sign-in samples. Desktop uses a clearly labeled 240px white sidebar, navy inset active indicator, compact top bar with language and profile, page title, create course primary action, three quiet metrics, and course rows with status badges. Mobile uses accessible hamburger menu, wrapped toolbar, single column cards, all actions available. Refined hierarchy, readable dark muted text, crisp hairline borders, 12px corners, generous but efficient spacing, no decorative gradients or invented learning statistics. Use Thai interface headings for course overview and English Institute X brand. Focus on credible operational UI, not marketing. Image is an internal composition guide, not a shipped screen.
