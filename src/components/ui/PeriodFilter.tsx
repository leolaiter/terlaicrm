import { PeriodFilter } from '../../types'

const options: { label: string; value: PeriodFilter }[] = [
  { label: 'HOJE', value: 'today' },
  { label: '7D', value: '7d' },
  { label: '15D', value: '15d' },
  { label: '30D', value: '30d' },
]

interface PeriodFilterProps {
  value: PeriodFilter
  onChange: (v: PeriodFilter) => void
}

export function PeriodFilterBar({ value, onChange }: PeriodFilterProps) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-[#F2F2F0] border border-[#E5E5E5] w-fit">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
            value === o.value
              ? 'bg-[#1A1A1A] text-white'
              : 'text-[#AAAAAA] hover:text-[#1A1A1A]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
