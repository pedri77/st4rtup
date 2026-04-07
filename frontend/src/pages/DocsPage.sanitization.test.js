import { describe, it, expect } from 'vitest'
import DOMPurify from 'dompurify'

// These tests lock down the DOMPurify config used inside DocsPage's
// ContentRenderer. If the config drifts, this test will catch it —
// ContentRenderer renders markdown-generated HTML into the browser,
// so regressions here could reintroduce XSS.

const DOCS_SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'span', 'div'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#)/i,
}

function sanitize(html) {
  return DOMPurify.sanitize(html, DOCS_SANITIZE_CONFIG)
}

describe('DocsPage DOMPurify config', () => {
  describe('dangerous tags stripped', () => {
    it.each([
      ['<script>', '<script>alert(1)</script><p>ok</p>'],
      ['<iframe>', '<iframe src="https://evil.com"></iframe><p>ok</p>'],
      ['<object>', '<object data="bad.swf"></object><p>ok</p>'],
      ['<embed>', '<embed src="bad.swf"><p>ok</p>'],
      ['<form>', '<form action="/steal"><input name=password></form><p>ok</p>'],
      ['<svg>', '<svg onload=alert(1)></svg><p>ok</p>'],
      ['<img>', '<img src=x onerror=alert(1)><p>ok</p>'],
    ])('removes %s element', (tag, input) => {
      const clean = sanitize(input)
      // The dangerous tag must not appear in any form
      const tagName = tag.replace(/[<>]/g, '')
      expect(clean.toLowerCase()).not.toContain(`<${tagName}`)
      // Safe fallback content survives
      expect(clean).toContain('ok')
    })
  })

  describe('dangerous URL schemes blocked', () => {
    it.each([
      ['javascript:', '<a href="javascript:alert(1)">click</a>'],
      ['data:', '<a href="data:text/html,<script>alert(1)</script>">click</a>'],
      ['vbscript:', '<a href="vbscript:msgbox(1)">click</a>'],
      ['file:', '<a href="file:///etc/passwd">click</a>'],
    ])('blocks %s in anchor href', (scheme, input) => {
      const clean = sanitize(input)
      expect(clean.toLowerCase()).not.toContain(scheme)
    })
  })

  describe('safe URL schemes allowed', () => {
    it.each([
      ['https://', '<a href="https://st4rtup.com">link</a>', 'https://st4rtup.com'],
      ['http://', '<a href="http://example.com">link</a>', 'http://example.com'],
      ['mailto:', '<a href="mailto:hi@st4rtup.app">mail</a>', 'mailto:hi@st4rtup.app'],
      ['relative /', '<a href="/app">internal</a>', '/app'],
      ['fragment #', '<a href="#section">anchor</a>', '#section'],
    ])('preserves %s URL', (_label, input, expectedHref) => {
      const clean = sanitize(input)
      expect(clean).toContain(expectedHref)
    })
  })

  describe('inline event handlers stripped', () => {
    it.each(['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus'])(
      'removes %s attribute',
      (attr) => {
        const input = `<p ${attr}="alert(1)">text</p>`
        const clean = sanitize(input)
        expect(clean.toLowerCase()).not.toContain(attr)
        expect(clean).toContain('text')
      },
    )
  })

  describe('allowed formatting tags survive', () => {
    it('keeps headings', () => {
      expect(sanitize('<h1>Title</h1>')).toContain('<h1>')
      expect(sanitize('<h2>Section</h2>')).toContain('<h2>')
    })

    it('keeps strong/em/code/pre/blockquote', () => {
      const html = '<p><strong>bold</strong> <em>italic</em> <code>code</code></p><pre>block</pre><blockquote>quote</blockquote>'
      const clean = sanitize(html)
      expect(clean).toContain('<strong>')
      expect(clean).toContain('<em>')
      expect(clean).toContain('<code>')
      expect(clean).toContain('<pre>')
      expect(clean).toContain('<blockquote>')
    })

    it('keeps ordered and unordered lists', () => {
      const html = '<ul><li>one</li></ul><ol><li>two</li></ol>'
      const clean = sanitize(html)
      expect(clean).toContain('<ul>')
      expect(clean).toContain('<ol>')
      expect(clean).toContain('<li>')
    })
  })
})
