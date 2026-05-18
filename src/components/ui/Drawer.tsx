import { useEffect } from 'react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: string
}

export function Drawer({ open, onClose, title, children, width = 'w-[480px]' }: DrawerProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className={`${width} h-full bg-white shadow-2xl flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
          <span className="font-semibold text-[#1A1A1A]">{title}</span>
          <button onClick={onClose} className="text-[#999] hover:text-[#1A1A1A] transition-colors text-xl leading-none">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}
