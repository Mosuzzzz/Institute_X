// Reviewable migration tool: emits an apply_patch patch; never writes files.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const translations = ts.createSourceFile('copy.ts', fs.readFileSync(path.join(root, 'src/lib/ui-translations.ts'), 'utf8'), 99, true);
const keys = new Set();
function readRows(n) {
  if (ts.isArrayLiteralExpression(n) && n.elements.length === 4 && n.elements.every(ts.isStringLiteral)) {
    keys.add(n.elements[0].text.trim()); keys.add(n.elements[1].text.trim());
  }
  ts.forEachChild(n, readRows);
}
readRows(translations);
const decode = s => s.replace(/&amp;/g, '&').replace(/&apos;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<');
const unmatched = new Set();
const patches = [];
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { scan(file); continue; }
    if (!file.endsWith('.tsx')) continue;
    const target = process.argv.find(arg => arg.startsWith('--target='));
    if (target && !file.endsWith(target.slice('--target='.length))) continue;
    const old = fs.readFileSync(file, 'utf8');
    // Error/metadata/server wrappers are already localized elsewhere.
    if (!old.includes('use client') && !file.endsWith('status-badge.tsx')) continue;
    const source = ts.createSourceFile(file, old, 99, true, ts.ScriptKind.TSX);
    const edits = []; const components = new Set();
    function owner(n) {
      for (let p = n.parent; p; p = p.parent) {
        if (ts.isFunctionDeclaration(p) && p.name && /^[A-Z]/.test(p.name.text) && p.body) return p;
      }
    }
    function edit(n, text) { const component = owner(n); if (!component || n.getStart(source) < component.body.getStart(source)) return; components.add(component); edits.push({ start: n.getStart(source), end: n.end, text }); }
    function walk(n) {
      if (ts.isJsxText(n)) {
        const normalized = decode(n.text.replace(/\s+/g, ' '));
        const key = normalized.trim();
        if (keys.has(key)) {
          const component = owner(n);
          if (component) { components.add(component); edits.push({ start: n.pos, end: n.end, text: `{t(${JSON.stringify(n.text.includes('\n') ? key : normalized)})}` }); }
        } else if (key && /[a-zA-Z\u0e00-\u0e7f]/.test(key)) unmatched.add(key);
        return;
      }
      if (ts.isJsxAttribute(n)) {
        if (['placeholder', 'aria-label', 'title', 'alt', 'data-label', 'roleLabel', 'fallbackName', 'label'].includes(n.name.text) && n.initializer && ts.isStringLiteral(n.initializer)) {
          const key = decode(n.initializer.text);
          if (keys.has(key.trim())) edit(n.initializer, `{t(${JSON.stringify(key)})}`);
        }
        return;
      }
      if (ts.isStringLiteral(n) && keys.has(n.text.trim()) && !/^[A-Z_]+$/.test(n.text) && !ts.isImportDeclaration(n.parent)) {
        // Keep request effects independent of language. Their stored errors are
        // translated at render time rather than causing fresh HTTP requests.
        for (let p = n.parent; p; p = p.parent) {
          if (ts.isCallExpression(p) && ['useEffect', 'useCallback'].includes(p.expression.getText(source))) return;
        }
        if (ts.isPropertyAssignment(n.parent) && n.parent.name === n) return;
        if (ts.isBinaryExpression(n.parent) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(n.parent.operatorToken.kind)) return;
        if (ts.isCallExpression(n.parent) && ts.isIdentifier(n.parent.expression) && n.parent.expression.text === 't') return;
        edit(n, `t(${JSON.stringify(n.text)})`); return;
      }
      // Display-only variables, not user-authored course titles/descriptions.
      if (ts.isJsxExpression(n) && n.expression && ts.isIdentifier(n.expression) && ['label', 'hint', 'role', 'roleLabel', 'fallbackName', 'error', 'message', 'actionError', 'contentError', 'completionError', 'logoutLabel', 'logoutHint'].includes(n.expression.text)) {
        edit(n.expression, `t(${n.expression.text})`); return;
      }
      if (ts.isJsxExpression(n) && n.expression && ts.isPropertyAccessExpression(n.expression) && ['accountStatus', 'status', 'availability', 'eligibilityMode', 'contentType', 'quizType'].includes(n.expression.name.text)) {
        edit(n.expression, `t(${n.expression.getText(source)})`); return;
      }
      ts.forEachChild(n, walk);
    }
    walk(source);
    if (!edits.length) continue;
    for (const component of components) {
      if (!component.body.getText(source).includes('const t = useUiTranslation()')) edits.push({ start: component.body.getStart(source) + 1, end: component.body.getStart(source) + 1, text: '\n  const t = useUiTranslation();' });
    }
    let relative = path.relative(path.dirname(file), path.join(root, 'src/lib/ui-translations')).split(path.sep).join('/');
    if (!relative.startsWith('.')) relative = './' + relative;
    const imports = source.statements.filter(ts.isImportDeclaration);
    const position = imports.length ? imports.at(-1).end : 0;
    if (!old.includes('import { useUiTranslation }')) edits.push({ start: position, end: position, text: `\nimport { useUiTranslation } from ${JSON.stringify(relative)};\n` });
    if (!old.includes('use client')) edits.push({ start: 0, end: 0, text: "'use client';\n\n" });
    edits.sort((a, b) => b.start - a.start);
    let next = old;
    for (const edit of edits) next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
    patches.push(`*** Update File: ${file}\n@@\n${old.trimEnd().split('\n').map(l => '-' + l).join('\n')}\n${next.trimEnd().split('\n').map(l => '+' + l).join('\n')}\n`);
  }
}
scan(path.join(root, 'src/app'));
if (process.argv.includes('--audit')) console.log([...unmatched].sort().join('\n'));
else console.log('*** Begin Patch\n' + patches.join('') + '*** End Patch');
