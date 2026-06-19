import { create } from 'zustand'
import { ConfiguratorState } from '@/types/database'

interface ConfiguratorStore extends ConfiguratorState {
  setModel: (modelId: string) => void
  setLayout: (layoutId: string) => void
  setOption: (groupId: string, optionId: string, selectionType: 'single' | 'multiple') => void
  removeOption: (groupId: string, optionId: string) => void
  reset: () => void
}

const initialState: ConfiguratorState = {
  model_id: null,
  layout_id: null,
  selected_options: {},
  total_price: 0,
}

export const useConfiguratorStore = create<ConfiguratorStore>((set) => ({
  ...initialState,
  setModel: (modelId) => set({ model_id: modelId }),
  setLayout: (layoutId) => set({ layout_id: layoutId }),
  setOption: (groupId, optionId, selectionType) =>
    set((state) => {
      const currentOptions = state.selected_options[groupId] || []
      let newOptions: string[]

      if (selectionType === 'single') {
        // Single selection: replace all options in group with this one
        newOptions = [optionId]
      } else {
        // Multiple selection: toggle this option
        if (currentOptions.includes(optionId)) {
          newOptions = currentOptions.filter((id) => id !== optionId)
        } else {
          newOptions = [...currentOptions, optionId]
        }
      }

      return {
        selected_options: {
          ...state.selected_options,
          [groupId]: newOptions,
        },
      }
    }),
  removeOption: (groupId, optionId) =>
    set((state) => ({
      selected_options: {
        ...state.selected_options,
        [groupId]: (state.selected_options[groupId] || []).filter(
          (id) => id !== optionId
        ),
      },
    })),
  reset: () => set(initialState),
}))
