import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSavedFilterPresets, hasActiveFilters } from './useSavedFilterPresets'

describe('useSavedFilterPresets', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with empty presets', () => {
    const { result } = renderHook(() =>
      useSavedFilterPresets('test', {}, '', vi.fn())
    )
    expect(result.current.presets).toEqual([])
  })

  it('saves a preset', () => {
    const { result } = renderHook(() =>
      useSavedFilterPresets('test', { status: 'active' }, 'search', vi.fn())
    )

    act(() => {
      result.current.savePreset('My Preset')
    })

    expect(result.current.presets).toHaveLength(1)
    expect(result.current.presets[0].name).toBe('My Preset')
    expect(result.current.presets[0].filters).toEqual({ status: 'active' })
  })

  it('throws on empty preset name', () => {
    const { result } = renderHook(() =>
      useSavedFilterPresets('test', {}, '', vi.fn())
    )

    expect(() => {
      act(() => { result.current.savePreset('') })
    }).toThrow('Preset name is required')
  })

  it('deletes a preset', () => {
    const { result } = renderHook(() =>
      useSavedFilterPresets('test', {}, '', vi.fn())
    )

    let presetId
    act(() => {
      const p = result.current.savePreset('Delete Me')
      presetId = p.id
    })

    expect(result.current.presets).toHaveLength(1)

    act(() => {
      result.current.deletePreset(presetId)
    })

    expect(result.current.presets).toHaveLength(0)
  })

  it('loads a preset and calls onLoadPreset', () => {
    const onLoad = vi.fn()
    const { result } = renderHook(() =>
      useSavedFilterPresets('test', { status: 'new' }, 'query', onLoad)
    )

    let presetId
    act(() => {
      const p = result.current.savePreset('Load Me')
      presetId = p.id
    })

    act(() => {
      result.current.loadPreset(presetId)
    })

    expect(onLoad).toHaveBeenCalledWith({
      filters: { status: 'new' },
      searchQuery: 'query',
    })
  })

  it('renames a preset', () => {
    const { result } = renderHook(() =>
      useSavedFilterPresets('test', {}, '', vi.fn())
    )

    let presetId
    act(() => {
      const p = result.current.savePreset('Old Name')
      presetId = p.id
    })

    act(() => {
      result.current.renamePreset(presetId, 'New Name')
    })

    expect(result.current.presets[0].name).toBe('New Name')
  })

  it('persists presets in localStorage', () => {
    const { result } = renderHook(() =>
      useSavedFilterPresets('persist-test', { a: 1 }, '', vi.fn())
    )

    act(() => {
      result.current.savePreset('Persisted')
    })

    const stored = JSON.parse(localStorage.getItem('filter-presets:persist-test'))
    expect(stored).toHaveLength(1)
    expect(stored[0].name).toBe('Persisted')
  })
})

describe('hasActiveFilters', () => {
  it('returns false for empty filters', () => {
    expect(hasActiveFilters({})).toBe(false)
  })

  it('returns false for filters with empty values', () => {
    expect(hasActiveFilters({
      status: { value: '' },
      type: { value: null },
    })).toBe(false)
  })

  it('returns true for active string filter', () => {
    expect(hasActiveFilters({
      status: { value: 'active' },
    })).toBe(true)
  })

  it('returns true for active array filter', () => {
    expect(hasActiveFilters({
      tags: { value: ['important'] },
    })).toBe(true)
  })

  it('returns false for empty array filter', () => {
    expect(hasActiveFilters({
      tags: { value: [] },
    })).toBe(false)
  })
})
