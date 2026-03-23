import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InlineEdit from './InlineEdit'

describe('InlineEdit', () => {
  it('muestra valor en modo display', () => {
    render(<InlineEdit value="Test value" onSave={() => {}} />)
    expect(screen.getByText('Test value')).toBeInTheDocument()
  })

  it('muestra placeholder cuando value esta vacio', () => {
    render(<InlineEdit value="" placeholder="Click para editar" onSave={() => {}} />)
    expect(screen.getByText('Click para editar')).toBeInTheDocument()
  })

  it('entra en modo edicion al hacer click', () => {
    render(<InlineEdit value="Hello" onSave={() => {}} />)
    fireEvent.click(screen.getByText('Hello'))
    expect(screen.getByDisplayValue('Hello')).toBeInTheDocument()
  })

  it('llama onSave al presionar Enter', () => {
    const onSave = vi.fn()
    render(<InlineEdit value="Old" onSave={onSave} />)
    fireEvent.click(screen.getByText('Old'))

    const input = screen.getByDisplayValue('Old')
    fireEvent.change(input, { target: { value: 'New' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSave).toHaveBeenCalledWith('New')
  })

  it('cancela edicion al presionar Escape', () => {
    const onSave = vi.fn()
    render(<InlineEdit value="Original" onSave={onSave} />)
    fireEvent.click(screen.getByText('Original'))

    const input = screen.getByDisplayValue('Original')
    fireEvent.change(input, { target: { value: 'Changed' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('Original')).toBeInTheDocument()
  })

  it('no llama onSave si el valor no cambio', () => {
    const onSave = vi.fn()
    render(<InlineEdit value="Same" onSave={onSave} />)
    fireEvent.click(screen.getByText('Same'))

    const input = screen.getByDisplayValue('Same')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('renderiza select en modo select', () => {
    const options = [{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }]
    render(<InlineEdit value="a" type="select" options={options} onSave={() => {}} />)
    fireEvent.click(screen.getByText('a'))
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
