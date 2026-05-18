import { PeriodFilter } from '../../types'

const OPTIONS: { label: string; value: PeriodFilter }[] = [
  { label: 'Hoje',  value: 'today' },
  { label: '7 dias',  value: '7d' },
  { label: '15 dias', value: '15d' },
  { label: '30 dias', value: '30d' },
]

interface Props { value: PeriodFilter; onChange: (v: PeriodFilter) => void }

export function PeriodFilterBar({ value, onChange }: Props) {
  return (
    <div className="pill-group">
      {OPTIONS.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`pill ${value === o.value ? 'pill-active' : ''}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
