import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { evidence, pkg, root } from './quality/common.mjs';

const excluded = new Set([
  'node_modules',
  '.git',
  '.toolchain',
  'upstream',
  '.runtime',
  '.test',
  'dist',
  'coverage',
  'test-results',
  'playwright-report',
]);
const filesBelow = (directory, extension) => {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name) || entry.isSymbolicLink()) continue;
    const file = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...filesBelow(file, extension));
    else if (extension.test(entry.name)) found.push(file);
  }
  return found;
};
const withoutCode = (text) => text.replace(/```[^\n]*\n[\s\S]*?```|~~~[^\n]*\n[\s\S]*?~~~/g, '');
const headings = (text) =>
  [...withoutCode(text).matchAll(/^(#{1,6})\s+(.+?)\s*#*\s*$/gm)].map((match) => ({
    level: match[1].length,
    title: match[2],
  }));
const slug = (text) =>
  text
    .replace(/!?(?:\[([^\]]+)\])\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\s-]/gu, '')
    .replace(/\s/g, '-');

export function localLinks(text) {
  const found = [];
  const clean = withoutCode(text).replace(/`+[^`\n]*`+/g, '');
  for (const match of clean.matchAll(
    /!?\[[^\]\n]*\]\(\s*(?:<([^>]+)>|((?:[^\s()]|\([^()]*\))+))(?:\s+["'][^\n]*["'])?\s*\)/g,
  ))
    found.push(match[1] ?? match[2]);
  for (const match of clean.matchAll(/^\s*\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/gm))
    found.push(match[1] ?? match[2]);
  for (const match of clean.matchAll(
    /<(?![A-Za-z][A-Za-z\d+.-]*:)([^<>\s]+\.(?:md|json|ya?ml|png|svg|txt)(?:#[^>\s]*)?)>/g,
  ))
    found.push(match[1]);
  return [...new Set(found)];
}

function checkMarkdown(errors) {
  const files = filesBelow(root, /\.md$/i);
  let links = 0;
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const link of localLinks(text)) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(link)) continue;
      const [pathPart, fragment] = link.split('#', 2);
      let path;
      try {
        path = resolve(
          pathPart.startsWith('/') ? root : dirname(file),
          decodeURIComponent(pathPart.replace(/^\//, '')) || '.',
        );
      } catch {
        errors.push(`${relative(root, file)}: malformed link ${link}`);
        continue;
      }
      if (!pathPart) path = file;
      const repoPath = relative(root, path);
      if (repoPath.startsWith('..') || !existsSync(path)) {
        errors.push(`${relative(root, file)}: missing local link ${link}`);
        continue;
      }
      if (lstatSync(path).isSymbolicLink()) {
        errors.push(`${relative(root, file)}: symlink link needs explicit review ${link}`);
        continue;
      }
      links++;
      if (fragment && /\.md$/i.test(path) && !/^L\d+(?:-L\d+)?$/.test(fragment)) {
        const seen = new Map();
        const anchors = headings(readFileSync(path, 'utf8')).map(({ title }) => {
          const base = slug(title);
          const count = seen.get(base) ?? 0;
          seen.set(base, count + 1);
          return count ? `${base}-${count}` : base;
        });
        const htmlIds = [
          ...readFileSync(path, 'utf8').matchAll(/\b(?:id|name)=["']([^"']+)["']/g),
        ].map((match) => match[1]);
        if (![...anchors, ...htmlIds].includes(decodeURIComponent(fragment)))
          errors.push(`${relative(root, file)}: missing local anchor ${link}`);
      }
    }
  }
  return { files: files.length, links };
}

function checkReadmes(errors) {
  const names = ['README.md', 'README.zh-CN.md'];
  const structure = [];
  const topics = [
    /install|安装|快速开始/i,
    /us(e|age)|使用|操作/i,
    /compatib|兼容/i,
    /privacy|隐私/i,
    /limit|限制|局限/i,
    /develop|开发|贡献|contribut/i,
    /licen[cs]e|许可|许可证/i,
  ];
  for (const name of names) {
    const file = join(root, name);
    if (!existsSync(file)) {
      errors.push(`Missing bilingual README ${name}`);
      continue;
    }
    const text = readFileSync(file, 'utf8');
    const list = headings(text);
    if (list.filter((heading) => heading.level === 1).length !== 1)
      errors.push(`${name}: expected exactly one H1`);
    const titles = list.filter((heading) => heading.level === 2).map((heading) => heading.title);
    for (const topic of topics)
      if (!titles.some((title) => topic.test(title)))
        errors.push(`${name}: missing H2 topic ${topic}`);
    if (!text.includes(names.find((other) => other !== name)))
      errors.push(`${name}: link to translated README missing`);
    structure.push({ name, levels: list.map((heading) => heading.level), titles });
  }
  if (
    structure.length === 2 &&
    JSON.stringify(structure[0].levels) !== JSON.stringify(structure[1].levels)
  )
    errors.push('English/Chinese README heading structure differs');
  return structure;
}

function checkConfig(errors) {
  const source = readFileSync(join(root, 'src/plugin.ts'), 'utf8');
  const block = source.match(/export const Config[^=]*= Schema\.object\(\{([\s\S]*?)^\}\);/m)?.[1];
  if (!block) {
    errors.push('Real plugin Config Schema.object was not found');
    return {};
  }
  const fields = new Map(
    [...block.matchAll(/^\s*(\w+):\s*Schema\.([^\n]+),?$/gm)].map((match) => [match[1], match[2]]),
  );
  const patch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8');
  if (!patch.includes(`name: ${pkg().name}`) || !/^\s*- insert:/m.test(patch))
    errors.push('Cordis bundle patch must insert the named actual plugin');
  const config = {};
  const match = patch.match(/^([ ]*)config:\s*\n([\s\S]*)$/m);
  if (!match) {
    errors.push('Cordis patch config is missing');
    return {};
  }
  const indentation = match[1].length;
  for (const line of match[2].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const entry = line.match(/^( +)([A-Za-z]\w*):\s*([^#]*?)\s*$/);
    if (!entry || entry[1].length <= indentation) {
      errors.push(
        'Cordis config checker accepts scalar plugin config only; nested/unknown syntax needs checker update',
      );
      break;
    }
    const [, , key, raw] = entry;
    const expression = fields.get(key);
    if (!expression) {
      errors.push(`cordis.patch.yml: unknown Config key ${key}`);
      continue;
    }
    if (Object.hasOwn(config, key)) errors.push(`cordis.patch.yml: duplicate Config key ${key}`);
    const value = /^-?\d+$/.test(raw) ? Number(raw) : raw.replace(/^['"]|['"]$/g, '');
    config[key] = value;
    if (expression.startsWith('string()')) {
      if (
        typeof value !== 'string' ||
        !value.length ||
        (key === 'ownerId' && !/^[\p{L}\p{N}_.:@-]{1,160}$/u.test(value))
      )
        errors.push(`cordis.patch.yml: ${key} fails actual owner/string schema`);
    } else if (expression.startsWith('natural()')) {
      const min = Number(expression.match(/\.min\((\d+)\)/)?.[1] ?? 0);
      const max = Number(expression.match(/\.max\((\d+)\)/)?.[1] ?? Number.MAX_SAFE_INTEGER);
      if (!Number.isSafeInteger(value) || value < min || value > max)
        errors.push(`cordis.patch.yml: ${key} outside actual natural schema [${min}, ${max}]`);
    } else errors.push(`Unrecognized actual Config schema for ${key}; checker must be updated`);
  }
  for (const [key, expression] of fields)
    if (!Object.hasOwn(config, key) && !expression.includes('.default('))
      errors.push(`cordis.patch.yml: required Config key ${key} missing`);
  return {
    fields: [...fields.keys()],
    config,
    limitation:
      'Static actual scalar Config-schema comparison; activation is verified separately by runtime tests',
  };
}

function checkWorkflows(errors) {
  const names = [
    'ci',
    'docs',
    'dsh-compatibility',
    'e2e',
    'security',
    'test-matrix',
    'governance',
    'release',
  ];
  const workflows = filesBelow(join(root, '.github/workflows'), /\.ya?ml$/);
  if (workflows.length !== 8) errors.push(`Expected all 8 workflows, found ${workflows.length}`);
  let actions = 0;
  let scripts = 0;
  for (const name of names) {
    const file = join(root, `.github/workflows/${name}.yml`);
    if (!existsSync(file)) {
      errors.push(`Missing workflow ${name}`);
      continue;
    }
    const text = readFileSync(file, 'utf8');
    if (/\t/.test(text)) errors.push(`${name}: YAML tabs are not supported`);
    if (!/^permissions:\s*\n  contents: read\s*$/m.test(text))
      errors.push(`${name}: default permissions must be explicit contents: read only`);
    if (
      /pull_request_target|workflow_run|auto-merge|enablePullRequestAutoMerge|createReview[\s\S]{0,250}APPROVE/.test(
        text,
      )
    )
      errors.push(`${name}: privileged PR trigger or automated approval/merge`);
    if (!text.includes('timeout-minutes:')) errors.push(`${name}: jobs need cost timeouts`);
    for (const match of text.matchAll(/uses:\s*([^\s#]+)(?:\s*#.*)?/g)) {
      actions++;
      if (!/^[A-Za-z\d_.-]+\/[A-Za-z\d_./-]+@[a-f\d]{40}$/.test(match[1]))
        errors.push(`${name}: Action must use a full reviewed commit SHA: ${match[1]}`);
    }
    for (const match of text.matchAll(/\b(?:node\s+)?(scripts\/[A-Za-z\d_./-]+\.mjs)\b/g)) {
      scripts++;
      if (!existsSync(join(root, match[1]))) errors.push(`${name}: missing script ${match[1]}`);
    }
    for (const match of text.matchAll(/\bpnpm\s+([A-Za-z][\w:-]*)/g)) {
      if (
        !['install', 'exec', 'audit', 'pack', 'run', 'store', 'list', 'publish'].includes(
          match[1],
        ) &&
        !Object.hasOwn(pkg().scripts ?? {}, match[1])
      )
        errors.push(`${name}: pnpm script ${match[1]} is not in actual package manifest`);
    }
    const checkouts = [
      ...text.matchAll(/uses: actions\/checkout@[a-f\d]{40}([\s\S]*?)(?=\n\s*- |$)/g),
    ];
    for (const checkout of checkouts)
      if (!checkout[1].includes('persist-credentials: false'))
        errors.push(`${name}: checkout must discard stored credentials`);
    if (
      name !== 'governance' &&
      name !== 'release' &&
      text.includes('pull_request:') &&
      !text.includes('paths:') &&
      name !== 'ci'
    )
      errors.push(`${name}: expensive PR workflow needs path filtering`);
  }
  const pinned = readFileSync(join(root, '.github/workflows/dsh-compatibility.yml'), 'utf8');
  if (!pinned.includes('pnpm test:pinned'))
    errors.push('Pinned job must execute pnpm test:pinned (not npm-version runtime only)');
  const release = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8').replace(
    /^\s*#.*$/gm,
    '',
  );
  if (
    !release.includes('workflow_dispatch:') ||
    !release.includes('tags:') ||
    !release.includes('environment: release') ||
    !release.includes('release-preflight.mjs') ||
    !release.includes('release-prepare.mjs')
  )
    errors.push(
      'Release exact-tag dispatch/protected-environment/preflight/prepare contract missing',
    );
  if (
    /contents: write|id-token: write|NPM_TOKEN|NODE_AUTH_TOKEN|publish(?![^\n]*--dry-run)/.test(
      release,
    )
  )
    errors.push(
      'Release preparation must not carry publishing credentials or public-write permissions',
    );
  for (const match of pkg().files ?? [])
    if (!['dist', 'README.md', 'README.zh-CN.md'].includes(match) && !existsSync(join(root, match)))
      errors.push(`Package files references missing source asset ${match}`);
  return {
    count: workflows.length,
    actions,
    scriptReferences: scripts,
    limitation:
      'Contract and reference checks for owned workflows, not a general YAML parser; actionlint remains recommended',
  };
}

export function checkDocs() {
  const errors = [];
  const markdown = checkMarkdown(errors);
  const readmes = checkReadmes(errors);
  const config = checkConfig(errors);
  const workflows = checkWorkflows(errors);
  const report = {
    checkedAt: new Date().toISOString(),
    markdown,
    readmes,
    config,
    workflows,
    errors,
    result: errors.length ? 'failed' : 'passed',
    scope:
      'local links/anchors, bilingual README structure, actual scalar plugin config, workflow/package script references; no external-link liveness claim',
  };
  evidence('docs.json', report);
  console.log(
    `Docs check: ${markdown.files} Markdown files, ${markdown.links} local links, ${workflows.count} workflows; ${errors.length} errors`,
  );
  if (errors.length) throw new Error(errors.join('\n'));
  return report;
}

if (process.argv[1]?.endsWith('check-docs.mjs')) {
  try {
    checkDocs();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
