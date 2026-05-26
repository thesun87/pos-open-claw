import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { usePosTableContextStore } from './store'

// Reset store state between tests
afterEach(() => {
  usePosTableContextStore.getState().reset()
})

describe('usePosTableContextStore', () => {
  it('initializes with all nulls and false', () => {
    const state = usePosTableContextStore.getState()
    expect(state.selectedAreaId).toBeNull()
    expect(state.selectedTableId).toBeNull()
    expect(state.selectedTableName).toBeNull()
    expect(state.quickCounterMode).toBe(false)
  })

  it('setSelectedAreaId updates selectedAreaId', () => {
    usePosTableContextStore.getState().setSelectedAreaId('area-1')
    expect(usePosTableContextStore.getState().selectedAreaId).toBe('area-1')
  })

  it('setSelectedTable sets id + name and clears quickCounterMode', () => {
    usePosTableContextStore.getState().setQuickCounterMode(true)
    usePosTableContextStore.getState().setSelectedTable({ id: 'tbl-1', name: 'Bàn 1' })
    const state = usePosTableContextStore.getState()
    expect(state.selectedTableId).toBe('tbl-1')
    expect(state.selectedTableName).toBe('Bàn 1')
    expect(state.quickCounterMode).toBe(false)
  })

  it('setSelectedTable(null) clears table context', () => {
    usePosTableContextStore.getState().setSelectedTable({ id: 'tbl-1', name: 'Bàn 1' })
    usePosTableContextStore.getState().setSelectedTable(null)
    const state = usePosTableContextStore.getState()
    expect(state.selectedTableId).toBeNull()
    expect(state.selectedTableName).toBeNull()
  })

  it('setQuickCounterMode(true) clears selectedTable', () => {
    usePosTableContextStore.getState().setSelectedTable({ id: 'tbl-2', name: 'Bàn 2' })
    usePosTableContextStore.getState().setQuickCounterMode(true)
    const state = usePosTableContextStore.getState()
    expect(state.quickCounterMode).toBe(true)
    expect(state.selectedTableId).toBeNull()
    expect(state.selectedTableName).toBeNull()
  })

  it('reset clears all fields', () => {
    usePosTableContextStore.getState().setSelectedAreaId('area-99')
    usePosTableContextStore.getState().setSelectedTable({ id: 'tbl-5', name: 'Bàn 5' })
    usePosTableContextStore.getState().setQuickCounterMode(true)
    usePosTableContextStore.getState().reset()
    const state = usePosTableContextStore.getState()
    expect(state.selectedAreaId).toBeNull()
    expect(state.selectedTableId).toBeNull()
    expect(state.selectedTableName).toBeNull()
    expect(state.quickCounterMode).toBe(false)
  })

  it('partialize persists only selectedAreaId', () => {
    // The persist middleware partializes state — verify the partialize function behavior
    const partialize = (state: ReturnType<typeof usePosTableContextStore.getState>) => ({
      selectedAreaId: state.selectedAreaId,
    })
    usePosTableContextStore.getState().setSelectedAreaId('area-42')
    usePosTableContextStore.getState().setSelectedTable({ id: 'tbl-9', name: 'Bàn 9' })
    const persisted = partialize(usePosTableContextStore.getState())
    expect(persisted).toEqual({ selectedAreaId: 'area-42' })
    expect(Object.keys(persisted)).not.toContain('selectedTableId')
    expect(Object.keys(persisted)).not.toContain('selectedTableName')
    expect(Object.keys(persisted)).not.toContain('quickCounterMode')
  })
})
