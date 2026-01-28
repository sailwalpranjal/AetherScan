// Keyboard Shortcuts Hook
'use client'

import { useEffect } from 'react'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach(shortcut => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = shortcut.ctrlKey === undefined || shortcut.ctrlKey === event.ctrlKey
        const shiftMatch = shortcut.shiftKey === undefined || shortcut.shiftKey === event.shiftKey
        const altMatch = shortcut.altKey === undefined || shortcut.altKey === event.altKey

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault()
          shortcut.action()
        }
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}

// Pre-defined keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  TOGGLE_SEARCH: { key: 's', ctrlKey: true, description: 'Toggle search panel' },
  TOGGLE_LAYERS: { key: 'l', ctrlKey: true, description: 'Toggle layer manager' },
  TOGGLE_LEGEND: { key: 'e', ctrlKey: true, description: 'Toggle legend' },
  OPEN_BOOKMARKS: { key: 'b', ctrlKey: true, description: 'Open bookmarks' },
  OPEN_COMPARISON: { key: 'k', ctrlKey: true, description: 'Open comparison' },
  TOGGLE_TIME_SLIDER: { key: 't', ctrlKey: true, description: 'Toggle time slider' },
  HELP: { key: '?', shiftKey: true, description: 'Show keyboard shortcuts' },
  ESCAPE: { key: 'Escape', description: 'Close panels/modals' },
}
