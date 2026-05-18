import { useEffect, useState } from 'react'
import { format, subDays, startOfToday, getDay } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { Receipt, DynamicsCard } from '../types'
import { Drawer } from '../components/ui/Drawer'
import { FileViewer } from '../components/ui/FileViewer'
import { Badge } from '../components/ui/Badge'

const DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

interface DayStats {
  day: string
  total: number
  count: number
}

export default function Reports() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [dynamics, setDynamics] = useState<DynamicsCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDynamic, setSelectedDynamic] = useState<DynamicsCard | null>(null)

  useEffect(() => {
    async function load() {
      const from = format(subDays(startOfToday(), 30), 'yyyy-MM-dd')
      const [{ data: r }, { data: d }] = await Promise.all([
        supabase.from('receipts').select('*').gte('deposit_date', from).eq('status', 'approved'),
        supabase.from('dynamics_cards').select('*'),
      ])
      setReceipts((r as Receipt[]) ?? [])
      setDynamics((d as DynamicsCard[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const dayStats: DayStats[] = DAYS.map((day, i) => {
    const dayReceipts = receipts.filter(r => {
      const d = new Date(r.deposit_date + 'T00:00:00')
      return getDay(d) === i
    })
    return { day, total: dayReceipts.reduce((s, r) => s + Number(r.amount), 0), count: dayReceipts.length }
  })

  const totalWeekly = receipts.reduce((s, r) => s + Number(r.amount), 0)
  const bestDay = dayStats.reduce((best, d) => d.total > best.total ? d : best, dayStats[0])
  const peak = Math.max(...dayStats.map(d => d.total))

  // Ranking: dias ordenados por total, com dinâmicas do dia
  const ranking = [...dayStats].sort((a, b) => b.total - a.total).filter(d => d.total > 0)

  function getDynamicsForDay(dayLabel: string) {
    return dynamics.filter(d => {
      return d.board === 'board2' && d.column_id === dayLabel
    })
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[#1A1A1A]">Relatórios</h1>
        <p className="text-sm text-[#999] mt-0.5">Análise de desempenho — últimos 30 dias</p>
      </div>

      {loading ? (
        <div className="text-sm text-[#999]">Carregando...</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="glass-card p-5">
              <div className="label-text mb-2">VOLUME SEMANAL</div>
              <div className="value-large">{fmt(totalWeekly)}</div>
            </div>
            <div className="glass-card p-5">
              <div className="label-text mb-2">MELHOR DIA</div>
              <div className="value-large">{bestDay.day}</div>
              <div className="text-xs text-[#999] mt-1">{fmt(bestDay.total)}</div>
            </div>
            <div className="glass-card p-5">
              <div className="label-text mb-2">PICO</div>
              <div className="value-large">{fmt(peak)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Bar chart */}
            <div className="glass-card p-5">
              <div className="label-text mb-4">DEPÓSITOS POR DIA DA SEMANA</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dayStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#AAAAAA' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#AAAAAA' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1px solid #E5E5E5', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [fmt(v), 'Total']}
                  />
                  <Bar dataKey="total" fill="#1A1A1A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Ranking */}
            <div className="glass-card p-5">
              <div className="label-text mb-4">RANKING — MELHORES DIAS</div>
              <div className="space-y-4">
                {ranking.length === 0 ? (
                  <div className="text-sm text-[#999]">Sem dados</div>
                ) : ranking.map((d, i) => {
                  const dynCards = getDynamicsForDay(d.day)
                  return (
                    <div key={d.day} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-[#1A1A1A]">{d.day}</span>
                          <span className="text-xs font-medium text-[#111]">{fmt(d.total)}</span>
                        </div>
                        {dynCards.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {dynCards.slice(0, 3).map(dc => (
                              <Badge key={dc.id} label={dc.title} onClick={() => setSelectedDynamic(dc)} />
                            ))}
                            {dynCards.length > 3 && (
                              <span className="text-[10px] text-[#AAAAAA]">+{dynCards.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Dynamic detail drawer */}
      <Drawer open={!!selectedDynamic} onClose={() => setSelectedDynamic(null)} title={selectedDynamic?.title ?? 'Dinâmica'}>
        {selectedDynamic && (
          <div className="space-y-4">
            <div>
              <div className="label-text mb-1">NOME</div>
              <div className="text-base font-semibold text-[#1A1A1A]">{selectedDynamic.title}</div>
            </div>
            {selectedDynamic.description && (
              <div>
                <div className="label-text mb-1">DESCRIÇÃO</div>
                <div className="text-sm text-[#999]">{selectedDynamic.description}</div>
              </div>
            )}
            {selectedDynamic.category && (
              <div>
                <div className="label-text mb-1">CATEGORIA</div>
                <div className="text-sm text-[#1A1A1A]">{selectedDynamic.category}</div>
              </div>
            )}
            {selectedDynamic.attachment_url && (
              <div>
                <div className="label-text mb-3">ARQUIVO ANEXADO</div>
                <FileViewer url={selectedDynamic.attachment_url} fileType={selectedDynamic.attachment_type ?? ''} name={selectedDynamic.attachment_name ?? undefined} />
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
