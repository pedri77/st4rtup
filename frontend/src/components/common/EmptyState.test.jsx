import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('muestra titulo y descripcion por defecto', () => {
    render(<EmptyState />)
    expect(screen.getByText('Sin datos')).toBeInTheDocument()
    expect(screen.getByText('No hay elementos para mostrar.')).toBeInTheDocument()
  })

  it('muestra titulo y descripcion custom', () => {
    render(<EmptyState title="Sin leads" description="Crea el primero" />)
    expect(screen.getByText('Sin leads')).toBeInTheDocument()
    expect(screen.getByText('Crea el primero')).toBeInTheDocument()
  })

  it('muestra boton de accion cuando se proporcionan actionLabel y onAction', () => {
    const onAction = vi.fn()
    render(<EmptyState actionLabel="Crear" onAction={onAction} />)
    const btn = screen.getByText('Crear')
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('no muestra boton si falta actionLabel', () => {
    render(<EmptyState onAction={() => {}} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renderiza SVG illustration para tipo leads', () => {
    const { container } = render(<EmptyState type="leads" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renderiza SVG illustration para tipo pipeline', () => {
    const { container } = render(<EmptyState type="pipeline" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renderiza SVG illustration para tipo generic (default)', () => {
    const { container } = render(<EmptyState type="unknown_type" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
