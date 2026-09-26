/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * URL sanitizer for Markdown links to prevent Cross-Site Scripting (XSS).
 * Strictly disallows dangerous protocols (javascript:, vbscript:, data:, file:, blob:, etc.)
 * while safely allowing standard web protocols (http:, https:, mailto:, tel:) and internal paths.
 */

export interface SanitizedUrlResult {
  safeHref: string;
  isBlocked: boolean;
  isExternal: boolean;
  title?: string;
}

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

export function sanitizeUrl(rawUrl: string, rawTitle?: string): SanitizedUrlResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { safeHref: '#', isBlocked: true, isExternal: false };
  }

  let url = rawUrl.trim();
  let title = rawTitle?.trim();

  // Handle markdown links with inline titles, e.g. [label](https://example.com "My Title")
  const titleMatch = url.match(/^<?([^\s">]+)>?(?:\s+["'](.*)["'])?$/);
  if (titleMatch) {
    url = titleMatch[1];
    if (!title && titleMatch[2]) {
      title = titleMatch[2];
    }
  }

  // Strip ASCII control characters (0x00 - 0x1F, 0x7F) and all whitespace.
  // Attackers frequently use embedded \0, \r, \n or tabs inside "java\0script:" to bypass naive regexes.
  const sanitizedProtocolCheck = url.replace(/[\u0000-\u001F\u007F\s]+/g, '');

  if (!sanitizedProtocolCheck) {
    return { safeHref: '#', isBlocked: true, isExternal: false, title };
  }

  // Safe internal anchor links: #heading-1
  if (url.startsWith('#')) {
    return { safeHref: url, isBlocked: false, isExternal: false, title };
  }

  // Safe relative paths: /items/123, ./note.md, ../folder
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return { safeHref: url, isBlocked: false, isExternal: false, title };
  }

  // Protocol-relative URLs: //example.com
  if (sanitizedProtocolCheck.startsWith('//')) {
    return { safeHref: url, isBlocked: false, isExternal: true, title };
  }

  // Check scheme/protocol
  const schemeMatch = sanitizedProtocolCheck.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase() + ':';
    if (ALLOWED_PROTOCOLS.has(scheme)) {
      const isExternal = scheme === 'http:' || scheme === 'https:';
      return { safeHref: url, isBlocked: false, isExternal, title };
    }
    // Blocked protocol (javascript:, data:, vbscript:, file:, etc.)
    return { safeHref: '#', isBlocked: true, isExternal: false, title };
  }

  // Domain-like links without explicit scheme: e.g. "example.com" or "www.google.com"
  if (sanitizedProtocolCheck.includes('.') && !sanitizedProtocolCheck.includes(':')) {
    return { safeHref: `https://${url}`, isBlocked: false, isExternal: true, title };
  }

  // Default fallback: internal/relative identifier
  return { safeHref: url, isBlocked: false, isExternal: false, title };
}
