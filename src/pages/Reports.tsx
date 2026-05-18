import { useEffect, useState } from 'react'
import { format, subDays, startOfToday, getDay } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase } from '../lib/supabase'
import type { Receipt, DynamicsCard } from '../types'
import { Drawer } from '../components/ui/Drawer'
import { FileViewer } from '../components/ui/FileViewer'

const YELLOW = '#D4C429'
const DAYS = ['DOM','SEG','TER','QUA','QUI','SEX','SAB']
const FULL_DAYS: Record<string, string> = {
  DOM: 'Domingo', SEG: 'Segunda-feira', TER: 'Terça-feira',
  QUA: 'Quarta-feira', QUI: 'Quinta-feira', SEX: 'Sexta-feira', SAB: 'Sábado',
}

function currency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-sm" style={{ padding: '8px 12px' }}>
      <div className="label" style={{ marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: YELLOW }}>{currency(payload[0].value)}</div>
    </div>
  )
}

export default function Reports() {
  const [receipts, setReceipts]     = useState<Receipt[]>([])
  const [dynamics, setDynamics]     = useState<DynamicsCard[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

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
  const bestDay     = dayStats.reduce((b, d) => d.total > b.total ? d : b, dayStats[0])
  const peak        = Math.max(...dayStats.map(d => d.total), 0)
  const ranking     = [...dayStats].sort((a, b) => b.total - a.total).filter(d => d.total > 0)

  const dynForDay = (dayLabel: string) =>
    dynamics.filter(d => d.board === 'board2' && d.column_id === dayLabel)

  const drawerDynamics = selectedDay ? dynForDay(selectedDay) : []

  return (
    <div style={{ padding: 28, maxWidth: 1200 }}>
      <div className="page-header">
        <h1 className="page-title">Relatórios</h1>
        <p className="page-subtitle">Análise de desempenho — últimos 30 dias</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: YELLOW }}
            className="animate-spin" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="metric-card">
              <div className="icon-circle">◈</div>
              <div><div className="label" style={{ marginBottom: 6 }}>Volume Total</div><div className="value-xl">{currency(totalWeekly)}</div></div>
            </div>
            <div className="metric-card">
              <div className="icon-circle">◉</div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Melhor Dia</div>
                <div className="value-xl">{bestDay.day}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 4 }}>{currency(bestDay.total)}</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="icon-circle">⊡</div>
              <div><div className="label" style={{ marginBottom: 6 }}>Pico</div><div className="value-xl">{currency(peak)}</div></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

            {/* Bar chart */}
            <div className="glass" style={{ padding: 24 }}>
              <div className="label" style={{ marginBottom: 20 }}>Depósitos por dia da semana</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dayStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Inter' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="total" radius={[5, 5, 0, 0]}>
                    {dayStats.map((d, i) => (
                      <Cell key={i} fill={d.day === bestDay.day ? YELLOW : 'rgba(255,255,255,0.12)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Ranking */}
            <div className="glass" style={{ padding: 24 }}>
              <div className="label" style={{ marginBottom: 20 }}>Ranking — Melhores dias</div>
              {ranking.length === 0 ? (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)' }}>Sem dados</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {ranking.map((d, i) => {
                    const dynCards = dynForDay(d.day)
                    return (
                      <div key={d.day} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 600,
                          background: i === 0 ? YELLOW : 'rgba(255,255,255,0.08)',
                          color: i === 0 ? '#0E0E11' : 'rgba(255,255,255,0.40)',
                        }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#FFF' }}>{FULL_DAYS[d.day] ?? d.day}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: i === 0 ? YELLOW : 'rgba(255,255,255,0.60)' }}>
                              {currency(d.total)}
                            </span>
                          </div>
                          {dynCards.length > 0 && (
                            <button
                              onClick={() => setSelectedDay(d.day)}
                              style={{
                                background: 'rgba(255,255,255,0.07)',
                                border: '1px solid rgba(255,255,255,0.09)',
                                borderRadius: 8, padding: '3px 10px',
                                fontSize: 11, fontWeight: 500,
                                color: 'rgba(255,255,255,0.50)',
                                cursor: 'pointer', fontFamily: 'Inter',
                              }}
                            >
                              {dynCards.length} {dynCards.length === 1 ? 'dinâmica' : 'dinâmicas'} →
                            </button>
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

      <Drawer
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? `${FULL_DAYS[selectedDay] ?? selectedDay} — Dinâmicas` : 'Dinâmicas'}
      >
        {drawerDynamics.length === 0 ? (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)' }}>Nenhuma dinâmica neste dia</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {drawerDynamics.map((dc, idx) => (
              <div key={dc.id}>
                {idx > 0 && <div className="divider" style={{ margin: '18px 0' }} />}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div className="label" style={{ marginBottom: 4 }}>Nome</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#FFF' }}>{dc.title}</div>
                  </div>
                  {dc.description && (
                    <div>
                      <div className="label" style={{ marginBottom: 4 }}>Descrição</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{dc.description}</div>
                    </div>
                  )}
                  {dc.category && (
                    <div>
                      <div className="label" style={{ marginBottom: 4 }}>Categoria</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{dc.category}</div>
                    </div>
                  )}
                  {dc.attachment_url && (
                    <div>
                      <div className="label" style={{ marginBottom: 8 }}>Arquivo</div>
                      <FileViewer url={dc.attachment_url} fileType={dc.attachment_type ?? ''} name={dc.attachment_name ?? undefined} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  )
}
