interface BadgeProps {
  label: string
  onClick?: () => void
}

export function Badge({ label, onClick }: BadgeProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F2F2F0] text-[#1A1A1A] border border-[#E5E5E5] ${
        onClick ? 'hover:bg-[#E5E5E5] cursor-pointer' : 'cursor-default'
      } transition-colors`}
    >
      {label}
    </button>
  )
}
