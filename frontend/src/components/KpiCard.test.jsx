import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import KpiCard from './KpiCard'
import { Users } from 'lucide-react'

describe('KpiCard', () => {
  const defaultProps = {
    label: 'Total Leads',
    value: 42,
    icon: Users,
    color: 'bg-blue-100 text-blue-600',
  }

  it('muestra el label y el valor', () => {
    render(<KpiCard {...defaultProps} />)

    expect(screen.getByText('Total Leads')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('muestra tendencia positiva con signo +', () => {
    render(<KpiCard {...defaultProps} trend={15} />)

    expect(screen.getByText('+15%')).toBeInTheDocument()
  })

  it('muestra tendencia negativa sin signo +', () => {
    render(<KpiCard {...defaultProps} trend={-8} />)

    expect(screen.getByText('-8%')).toBeInTheDocument()
  })

  it('muestra tendencia cero como 0%', () => {
    render(<KpiCard {...defaultProps} trend={0} />)

    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('no muestra indicador de tendencia si trend es undefined', () => {
    const { container } = render(<KpiCard {...defaultProps} />)

    // No percentage text should appear
    expect(container.textContent).not.toMatch(/%/)
  })

  it('muestra subtext cuando se proporciona', () => {
    render(<KpiCard {...defaultProps} subtext="vs mes anterior" />)

    expect(screen.getByText('vs mes anterior')).toBeInTheDocument()
  })

  it('no muestra subtext cuando no se proporciona', () => {
    render(<KpiCard {...defaultProps} />)

    expect(screen.queryByText('vs mes anterior')).not.toBeInTheDocument()
  })
})
