import { useEffect, useState } from 'react'
import { format, subDays, startOfToday, getDay } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'
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

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number; payload: { count: number } }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-sm" style={{ padding: '8px 12px' }}>
      <div className="label" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: YELLOW }}>{currency(payload[0].value)}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
        {payload[0].payload.count} {payload[0].payload.count === 1 ? 'depósito' : 'depósitos'}
      </div>
    </div>
  )
}

export default function Reports() {
  const [receipts, setReceipts]       = useState<Receipt[]>([])
  const [dynamics, setDynamics]       = useState<DynamicsCard[]>([])
  const [loading, setLoading]         = useState(true)
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

  const totalAmount = receipts.reduce((s, r) => s + Number(r.amount), 0)
  const totalCount  = receipts.length
  const bestDay     = dayStats.reduce((b, d) => d.total > b.total ? d : b, dayStats[0])
  const ranking     = [...dayStats].sort((a, b) => b.total - a.total).filter(d => d.count > 0)

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
          <div style={{ width: 22, height: 22, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.15)', borderTopColor: YELLOW }}
            className="animate-spin" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="metric-card">
              <div className="icon-circle">◈</div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Volume Total</div>
                <div className="value-xl">{currency(totalAmount)}</div>
              </div>
            </div>
            <div className="metric-card">
              <div className="icon-circle">◉</div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Melhor Dia</div>
                <div className="value-xl">{bestDay.count > 0 ? bestDay.day : '—'}</div>
                {bestDay.count > 0 && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 4 }}>
                    {currency(bestDay.total)} · {bestDay.count} dep.
                  </div>
                )}
              </div>
            </div>
            <div className="metric-card">
              <div className="icon-circle">⊡</div>
              <div>
                <div className="label" style={{ marginBottom: 6 }}>Total de Depósitos</div>
                <div className="value-xl">{totalCount}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 4 }}>
                  {ranking.length} {ranking.length === 1 ? 'dia ativo' : 'dias ativos'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 12 }}>

            {/* Bar chart */}
            <div className="glass" style={{ padding: 24 }}>
              <div className="label" style={{ marginBottom: 4 }}>Depósitos por dia da semana</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginBottom: 20 }}>
                Número acima = quantidade de depósitos no dia
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dayStats} margin={{ top: 22, right: 4, left: -20, bottom: 0 }} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day"
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Inter' }}
                    axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Inter' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="total" radius={[5, 5, 0, 0]}>
                    <LabelList
                      dataKey="count"
                      position="top"
                      style={{ fontSize: 10, fill: 'rgba(255,255,255,0.38)', fontFamily: 'Inter', fontWeight: 600 }}
                      formatter={(v: unknown) => (v as number) > 0 ? String(v) : ''}
                    />
                    {dayStats.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.day === bestDay.day && d.count > 0 ? YELLOW : 'rgba(255,255,255,0.11)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Per-day breakdown */}
            <div className="glass" style={{ padding: 24 }}>
              <div className="label" style={{ marginBottom: 20 }}>Dias com mais depósitos</div>
              {ranking.length === 0 ? (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.30)' }}>Sem dados</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {ranking.map((d, i) => {
                    const dynCards = dynForDay(d.day)
                    const pct = bestDay.total > 0 ? (d.total / bestDay.total) * 100 : 0
                    return (
                      <div key={d.day}>
                        {/* name + amount */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700,
                            background: i === 0 ? YELLOW : 'rgba(255,255,255,0.08)',
                            color: i === 0 ? '#0E0E11' : 'rgba(255,255,255,0.35)',
                          }}>
                            {i + 1}
                          </div>
                          <span style={{
                            flex: 1, fontSize: 13, fontWeight: 600, color: '#FFF',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {FULL_DAYS[d.day] ?? d.day}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, flexShrink: 0,
                            color: i === 0 ? YELLOW : 'rgba(255,255,255,0.60)' }}>
                            {currency(d.total)}
                          </span>
                        </div>

                        {/* progress + count */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: dynCards.length > 0 ? 6 : 0, paddingLeft: 28 }}>
                          <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${pct}%`, borderRadius: 99,
                              background: i === 0 ? YELLOW : 'rgba(255,255,255,0.18)',
                              transition: 'width 0.6s ease',
                            }} />
                          </div>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', flexShrink: 0, minWidth: 68 }}>
                            {d.count} {d.count === 1 ? 'depósito' : 'depósitos'}
                          </span>
                        </div>

                        {/* dynamics tags */}
                        {dynCards.length > 0 && (
                          <div style={{ paddingLeft: 28, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {dynCards.slice(0, 3).map(dc => (
                              <button
                                key={dc.id}
                                onClick={() => setSelectedDay(d.day)}
                                style={{
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.09)',
                                  borderRadius: 6, padding: '2px 8px',
                                  fontSize: 10.5, fontWeight: 500,
                                  color: 'rgba(255,255,255,0.45)',
                                  cursor: 'pointer', fontFamily: 'Inter',
                                  maxWidth: 110, overflow: 'hidden',
                                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  display: 'block',
                                }}
                              >
                                {dc.title}
                              </button>
                            ))}
                            {dynCards.length > 3 && (
                              <button
                                onClick={() => setSelectedDay(d.day)}
                                style={{
                                  background: 'transparent', border: 'none', padding: '2px 4px',
                                  fontSize: 10.5, color: 'rgba(255,255,255,0.28)',
                                  cursor: 'pointer', fontFamily: 'Inter',
                                }}
                              >
                                +{dynCards.length - 3}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamics detail drawer */}
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
