import { useEffect, useState } from 'react'
import { format, subDays, startOfToday, getDay } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase } from '../lib/supabase'
import type { Receipt, DynamicsCard } from '../types'
import { Drawer } from '../components/ui/Drawer'
import { FileViewer } from '../components/ui/FileViewer'
import { Badge } from '../components/ui/Badge'

const DAYS = ['DOM','SEG','TER','QUA','QUI','SEX','SAB']

function currency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-sm px-3 py-2">
      <div className="label mb-0.5">{label}</div>
      <div className="text-[13px] font-semibold text-[#111]">{currency(payload[0].value)}</div>
    </div>
  )
}

export default function Reports() {
  const [receipts, setReceipts]         = useState<Receipt[]>([])
  const [dynamics, setDynamics]         = useState<DynamicsCard[]>([])
  const [loading, setLoading]           = useState(true)
  const [selectedDynamic, setSelected]  = useState<DynamicsCard | null>(null)

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

  const dayStats = DAYS.map((day, i) => {
    const dr = receipts.filter(r => getDay(new Date(r.deposit_date + 'T00:00:00')) === i)
    return { day, total: dr.reduce((s, r) => s + Number(r.amount), 0), count: dr.length }
  })

  const totalWeekly = receipts.reduce((s, r) => s + Number(r.amount), 0)
  const bestDay = dayStats.reduce((b, d) => d.total > b.total ? d : b, dayStats[0])
  const peak    = Math.max(...dayStats.map(d => d.total), 0)
  const ranking = [...dayStats].sort((a, b) => b.total - a.total).filter(d => d.total > 0)

  const dynForDay = (dayLabel: string) =>
    dynamics.filter(d => d.board === 'board2' && d.column_id === dayLabel)

  return (
    <div className="p-8 max-w-[1200px]">
      <div className="page-header">
        <h1 className="page-title">Relatórios</h1>
        <p className="page-subtitle">Análise de desempenho — últimos 30 dias</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-60">
          <div className="w-5 h-5 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin opacity-30" />
        </div>
      ) : (
        <div className="space-y-4">

          {/* KPI */}
          <div className="grid grid-cols-3 gap-3">
            <div className="metric-card">
              <div className="icon-circle">◈</div>
              <div><div className="label mb-1">Volume Total</div><div className="value-xl">{currency(totalWeekly)}</div></div>
            </div>
            <div className="metric-card">
              <div className="icon-circle">◉</div>
              <div>
                <div className="label mb-1">Melhor Dia</div>
                <div className="value-xl">{bestDay.day}</div>
                <div className="text-[11px] text-[#AAAAAA] mt-1">{currency(bestDay.total)}</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="icon-circle">⊡</div>
              <div><div className="label mb-1">Pico</div><div className="value-xl">{currency(peak)}</div></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Bar chart */}
            <div className="glass p-6">
              <div className="label mb-5">Depósitos por dia da semana</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dayStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#CCCCCC', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#CCCCCC', fontFamily: 'Inter' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="total" radius={[5, 5, 0, 0]}>
                    {dayStats.map((d, i) => (
                      <Cell key={i} fill={d.day === bestDay.day ? '#1A1A1A' : '#E8E8E8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Ranking */}
            <div className="glass p-6">
              <div className="label mb-5">Ranking — Melhores dias</div>
              {ranking.length === 0 ? (
                <div className="text-[13px] text-[#CCCCCC]">Sem dados</div>
              ) : (
                <div className="space-y-5">
                  {ranking.map((d, i) => {
                    const dynCards = dynForDay(d.day)
                    return (
                      <div key={d.day} className="flex items-start gap-3">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5"
                          style={{ background: i === 0 ? '#1A1A1A' : '#F0F0F0', color: i === 0 ? '#FFF' : '#888' }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[13px] font-semibold text-[#1A1A1A]">{d.day}</span>
                            <span className="text-[12px] font-semibold text-[#111]">{currency(d.total)}</span>
                          </div>
                          {dynCards.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {dynCards.slice(0, 3).map(dc => (
                                <Badge key={dc.id} label={dc.title} onClick={() => setSelected(dc)} />
                              ))}
                              {dynCards.length > 3 && (
                                <span className="text-[10px] text-[#CCCCCC] self-center">+{dynCards.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Drawer open={!!selectedDynamic} onClose={() => setSelected(null)} title={selectedDynamic?.title ?? 'Dinâmica'}>
        {selectedDynamic && (
          <div className="space-y-5">
            <div><div className="label mb-1">Nome</div><div className="text-[15px] font-semibold text-[#1A1A1A]">{selectedDynamic.title}</div></div>
            {selectedDynamic.description && <div><div className="label mb-1">Descrição</div><div className="text-[13px] text-[#666]">{selectedDynamic.description}</div></div>}
            {selectedDynamic.category && <div><div className="label mb-1">Categoria</div><div className="text-[13px] text-[#666]">{selectedDynamic.category}</div></div>}
            {selectedDynamic.attachment_url && (
              <div><div className="label mb-3">Arquivo</div>
                <FileViewer url={selectedDynamic.attachment_url} fileType={selectedDynamic.attachment_type ?? ''} name={selectedDynamic.attachment_name ?? undefined} />
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
