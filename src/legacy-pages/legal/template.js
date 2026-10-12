import { legalConfig } from './legal.config';
import { NECESSARY_STORAGE, VENDORS } from './cookieCatalog';

/** Tracking tools that have an ID set in the config. */
export function activeVendors(config = legalConfig) {
  return Object.entries(VENDORS)
    .filter(([key]) => Boolean(config.tracking?.[key]))
    .map(([key, vendor]) => ({ key, id: config.tracking[key], ...vendor }));
}

/** Which optional cookie categories are actually in use. */
export function categoriesInUse(config = legalConfig) {
  const vendors = activeVendors(config);
  return {
    analytics: vendors.some((v) => v.category === 'analytics'),
    marketing: vendors.some((v) => v.category === 'marketing'),
  };
}

const cell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

function mdTable(headers, rows) {
  const head = `| ${headers.map(cell).join(' | ')} |`;
  const rule = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map(cell).join(' | ')} |`);
  return [head, rule, ...body].join('\n');
}

function processorsTable(config) {
  const rows = config.processors.map((p) => [p.name, p.purpose, p.location]);
  if (config.features?.whatsapp) {
    rows.push(['WhatsApp (Meta Platforms, Inc.)', 'Messages you send us on WhatsApp', 'Global']);
  }
  activeVendors(config).forEach((v) => rows.push([`${v.label} (${v.company})`, v.processorPurpose, v.location]));
  return mdTable(['Provider', 'What they do for us', 'Where data is stored'], rows);
}

// Cookie names go in code spans so underscores and <ID> show literally.
const codeName = (name) => `\`${name}\``;

function cookieTables(config) {
  const vendors = activeVendors(config);
  if (!vendors.length) {
    return 'This site doesn’t set any cookies of its own at the moment. If that changes, we’ll list them here.';
  }

  const section = (heading, intro, rows) =>
    `### ${heading}\n\n${intro}\n\n${mdTable(['Name', 'Set by', 'What it does', 'How long it lasts'], rows)}`;

  const parts = [
    section(
      'Necessary',
      'These keep the site working and remember your cookie choice. They’re always on.',
      NECESSARY_STORAGE.map((c) => [
        codeName(c.name ?? config.consentStorageKey),
        config.company.brandName,
        c.purpose,
        c.duration,
      ]),
    ),
  ];

  const byCategory = (category) =>
    vendors
      .filter((v) => v.category === category)
      .flatMap((v) => v.cookies.map((c) => [codeName(c.name), v.label, c.purpose, c.duration]));

  const analytics = byCategory('analytics');
  if (analytics.length) {
    parts.push(section('Analytics', 'Off unless you allow them. They show us which pages people visit and how they found us.', analytics));
  }
  const marketing = byCategory('marketing');
  if (marketing.length) {
    parts.push(section('Marketing', 'Off unless you allow them. They measure our ads and let us show ads to people who have visited this site.', marketing));
  }
  return parts.join('\n\n');
}

const getPath = (obj, path) => path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);

/**
 * Fills a markdown template.
 *   {{company.email}}             value from the config
 *   {{#if careers}}…{{/if}}       kept only when the flag is true
 *   {{#unless analytics}}…{{/unless}}  kept only when the flag is false
 * Flags: everything in config.features, plus `analytics`, `marketing` and
 * `optionalCookies`, worked out from the tracking IDs.
 */
export function fillTemplate(markdown, config = legalConfig) {
  const inUse = categoriesInUse(config);
  const flags = {
    ...config.features,
    ...inUse,
    optionalCookies: inUse.analytics || inUse.marketing,
    // One flag per tool: {{#if ga4}}, {{#if metaPixel}} and so on.
    ...Object.fromEntries(Object.keys(VENDORS).map((key) => [key, Boolean(config.tracking?.[key])])),
  };
  const context = {
    ...config,
    processorsTable: processorsTable(config),
    cookieTables: cookieTables(config),
    optionalCookieTools: activeVendors(config).map((v) => v.label).join(', '),
  };

  // Innermost blocks first, so {{#if}} can be nested inside another block.
  const innermostIf = /\{\{#if (\w+)\}\}((?:(?!\{\{#(?:if|unless) )[\s\S])*?)\{\{\/if\}\}(\n?)/g;
  const innermostUnless = /\{\{#unless (\w+)\}\}((?:(?!\{\{#(?:if|unless) )[\s\S])*?)\{\{\/unless\}\}(\n?)/g;
  let output = markdown;
  let previous;
  do {
    previous = output;
    output = output
      .replace(innermostIf, (_, flag, body, nl) => (flags[flag] ? body + nl : ''))
      .replace(innermostUnless, (_, flag, body, nl) => (flags[flag] ? '' : body + nl));
  } while (output !== previous);

  return output.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path) => {
    const value = getPath(context, path);
    return value == null ? match : String(value);
  });
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The level-2 headings of a filled document, for the "On this page" list. */
export function extractSections(markdown) {
  return [...markdown.matchAll(/^## (.+)$/gm)].map((m, i) => ({
    number: i + 1,
    title: m[1].trim(),
    id: slugify(m[1]),
  }));
}

/** Config values still marked TODO, for the development-only reminder. */
export function findTodos(config = legalConfig, path = '') {
  if (typeof config === 'string') return /TODO/.test(config) ? [path] : [];
  if (config && typeof config === 'object') {
    return Object.entries(config).flatMap(([key, value]) =>
      findTodos(value, Array.isArray(config) ? `${path}[${key}]` : path ? `${path}.${key}` : key),
    );
  }
  return [];
}

export function formatDate(iso) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${iso}T00:00:00`),
  );
}

/** Plain text of React children, used to build heading ids. */
export function childrenToText(children) {
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(childrenToText).join('');
  return childrenToText(children.props?.children);
}
