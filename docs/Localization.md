# Application localization

Updated: 14 September 2026.

The application UI supports Thai (`th`), English (`en`), Simplified Chinese
(`zh-CN`), and Japanese (`ja`). The selected language is shared by every workspace,
stored in the browser, and restored after refresh. The document's `lang` attribute
is synchronized with that selection for accessibility.

## Coverage

- Email OTP login, input guidance, and existing authentication errors.
- Student dashboard, catalog, lesson viewer, completion controls, and assessments.
- Teacher dashboard, permission requests, course creation, curriculum editor,
  assessments, submission checklist, and confirmation dialogs.
- Approver queues, evidence checklist, media preview controls, and decisions.
- Registrar account status, role assignment/removal, role history, and language selector.
- Executive dashboard, chart labels, and learning analytics.
- Shared navigation, profile menu, role switching, statuses, footer, and recovery pages.
- Dates and waiting periods in approval workflows and assessment history.

Course categories and majors use the existing reference-data translations.
Test checklist copy now reflects that Pre-Test and Post-Test are independently optional.

## Adding UI copy

The central dictionary is `frontend/src/lib/ui-translations.ts`. Each row must
contain English, Thai, Chinese, and Japanese, in that order. New copy should use
English lookup keys. Existing Thai keys remain recognized while old pages migrate.

```tsx
const t = useUiTranslation();
return <button>{t('Save Draft')}</button>;
```

Use named placeholders for variable messages, preserving the same placeholder
names in all four translations:

```tsx
t('Add {role}', { role: t(role) })
```

Translate API enums only where displayed. Do not translate request values,
authorization comparisons, URL paths, IDs, or database fields. Store request-effect
errors independently of language and translate them when displayed, so changing
language does not restart requests or assessment attempts.

`commonCopy`, `shellCopy`, `learningCopy`, and reference translations remain in use
for their respective shared features. The migration helper
`frontend/scripts/localize-ui.cjs` emits an `apply_patch` patch without writing files;
its `--audit` option lists remaining literal JSX text for manual review.

## Deliberately unchanged

Institute X, Authentication Service, file-format names, filenames, user names,
emails, course titles/descriptions, articles, questions, answers, and review
comments retain their original values. Custom reference-data names without a
configured translation and unknown technical backend messages fall back to their
source text; there is no automatic translation service.

## Verification

Frontend typecheck and lint pass (the existing cover-image `img` warning remains).
Production build passes. Dictionary rows and placeholder consistency were checked
statically. No frontend test harness was added and no application server, Docker
service, or deployment was started. Visual browser verification remains pending.
