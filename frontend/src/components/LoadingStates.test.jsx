import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  Skeleton,
  KpiCardSkeleton,
  TableSkeleton,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  InlineLoader,
} from './LoadingStates'

describe('Skeleton', () => {
  it('renders with default variant', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveClass('animate-pulse')
    expect(container.firstChild).toHaveAttribute('aria-label', 'Cargando...')
  })

  it('renders with custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-20" />)
    expect(container.firstChild).toHaveClass('h-4')
    expect(container.firstChild).toHaveClass('w-20')
  })

  it('renders with light variant', () => {
    const { container } = render(<Skeleton variant="light" />)
    expect(container.firstChild).toHaveClass('bg-white')
  })
})

describe('KpiCardSkeleton', () => {
  it('renders without errors', () => {
    const { container } = render(<KpiCardSkeleton />)
    expect(container.firstChild).toBeTruthy()
  })
})

describe('TableSkeleton', () => {
  it('renders correct number of rows and columns', () => {
    const { container } = render(<TableSkeleton rows={3} columns={5} />)
    const rows = container.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(3)
    const cells = rows[0].querySelectorAll('td')
    expect(cells).toHaveLength(5)
  })

  it('uses default rows and columns', () => {
    const { container } = render(<TableSkeleton />)
    const rows = container.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(10)
  })
})

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="Sin datos"
        description="No hay elementos para mostrar"
      />
    )
    expect(screen.getByText('Sin datos')).toBeInTheDocument()
    expect(screen.getByText('No hay elementos para mostrar')).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    render(
      <EmptyState
        title="Empty"
        description="Nothing here"
        action={<button>Create New</button>}
      />
    )
    expect(screen.getByText('Create New')).toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('renders default error text', () => {
    render(<ErrorState />)
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
  })

  it('renders custom error text', () => {
    render(<ErrorState title="Error de red" description="No se pudo conectar" />)
    expect(screen.getByText('Error de red')).toBeInTheDocument()
    expect(screen.getByText('No se pudo conectar')).toBeInTheDocument()
  })

  it('calls onRetry when button clicked', () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)
    fireEvent.click(screen.getByText('Reintentar'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('does not show retry button without handler', () => {
    render(<ErrorState />)
    expect(screen.queryByText('Reintentar')).not.toBeInTheDocument()
  })
})

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    const { container } = render(<LoadingSpinner />)
    expect(container.firstChild).toHaveClass('animate-spin')
    expect(container.firstChild).toHaveClass('w-8')
  })

  it('renders with small size', () => {
    const { container } = render(<LoadingSpinner size="sm" />)
    expect(container.firstChild).toHaveClass('w-4')
  })

  it('renders with large size', () => {
    const { container } = render(<LoadingSpinner size="lg" />)
    expect(container.firstChild).toHaveClass('w-12')
  })
})

describe('InlineLoader', () => {
  it('renders default text', () => {
    render(<InlineLoader />)
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })

  it('renders custom text', () => {
    render(<InlineLoader text="Procesando datos..." />)
    expect(screen.getByText('Procesando datos...')).toBeInTheDocument()
  })
})
