import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type PosTableContextState = {
  selectedAreaId: string | null
  selectedTableId: string | null
  selectedTableName: string | null
  quickCounterMode: boolean
  setSelectedAreaId: (id: string | null) => void
  setSelectedTable: (payload: { id: string; name: string } | null) => void
  setQuickCounterMode: (enabled: boolean) => void
  reset: () => void
}

export const usePosTableContextStore = create<PosTableContextState>()(
  persist(
    (set) => ({
      selectedAreaId: null,
      selectedTableId: null,
      selectedTableName: null,
      quickCounterMode: false,
      setSelectedAreaId: (id) => set({ selectedAreaId: id }),
      setSelectedTable: (payload) =>
        set({
          selectedTableId: payload?.id ?? null,
          selectedTableName: payload?.name ?? null,
          quickCounterMode: false,
        }),
      setQuickCounterMode: (enabled) =>
        set({ quickCounterMode: enabled, selectedTableId: null, selectedTableName: null }),
      reset: () =>
        set({
          selectedAreaId: null,
          selectedTableId: null,
          selectedTableName: null,
          quickCounterMode: false,
        }),
    }),
    {
      name: 'pos.tables.context',
      // Persist ONLY selectedAreaId — selectedTableId is intentionally ephemeral
      // (reload page = return to floor-plan; per NFR18 spirit)
      partialize: (state) => ({ selectedAreaId: state.selectedAreaId }),
    },
  ),
)
