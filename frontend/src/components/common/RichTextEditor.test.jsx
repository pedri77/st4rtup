import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RichTextEditor from './RichTextEditor'

describe('RichTextEditor — XSS sanitization', () => {
  beforeEach(() => {
    // jsdom doesn't implement execCommand; stub it so toolbar clicks don't throw
    document.execCommand = vi.fn(() => true)
  })

  it('renders the initial value sanitized (strips script tags)', () => {
    const dangerous = '<p>Hello</p><script>alert("xss")</script>'
    const { container } = render(<RichTextEditor value={dangerous} onChange={() => {}} />)
    const editor = container.querySelector('[contenteditable]')
    expect(editor).toBeTruthy()
    // The dangerous <script> must not appear anywhere in the rendered HTML
    expect(editor.innerHTML).not.toContain('<script>')
    expect(editor.innerHTML).not.toContain('alert(')
    // But the safe content stays
    expect(editor.innerHTML).toContain('Hello')
  })

  it('calls onChange with sanitized HTML when user types', () => {
    const onChange = vi.fn()
    const { container } = render(<RichTextEditor value="" onChange={onChange} />)
    const editor = container.querySelector('[contenteditable]')

    // Simulate the browser writing raw HTML into the contenteditable div
    editor.innerHTML = '<p>Safe <script>evil()</script> content</p>'
    fireEvent.input(editor)

    expect(onChange).toHaveBeenCalled()
    const sanitized = onChange.mock.calls[0][0]
    expect(sanitized).not.toContain('<script>')
    expect(sanitized).not.toContain('evil(')
    expect(sanitized).toContain('Safe')
    expect(sanitized).toContain('content')
  })

  it('strips onerror/onclick attributes on input', () => {
    const onChange = vi.fn()
    const { container } = render(<RichTextEditor value="" onChange={onChange} />)
    const editor = container.querySelector('[contenteditable]')

    editor.innerHTML = '<img src=x onerror="alert(1)"><p onclick="alert(2)">click</p>'
    fireEvent.input(editor)

    const sanitized = onChange.mock.calls[0][0]
    expect(sanitized).not.toContain('onerror')
    expect(sanitized).not.toContain('onclick')
    expect(sanitized).not.toContain('alert(')
  })

  it('allows safe formatting tags through', () => {
    const onChange = vi.fn()
    const { container } = render(<RichTextEditor value="" onChange={onChange} />)
    const editor = container.querySelector('[contenteditable]')

    editor.innerHTML = '<p><strong>bold</strong> and <em>italic</em></p>'
    fireEvent.input(editor)

    const sanitized = onChange.mock.calls[0][0]
    expect(sanitized).toContain('<strong>')
    expect(sanitized).toContain('<em>')
    expect(sanitized).toContain('bold')
    expect(sanitized).toContain('italic')
  })
})
