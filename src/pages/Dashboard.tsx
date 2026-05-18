import { useEffect, useState } from 'react'
import { subDays, startOfToday, format, eachDayOfInterval } from 'date-fns'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Area, AreaChart, PieChart, Pie, Cell,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { PeriodFilterBar } from '../components/ui/PeriodFilter'
import type { PeriodFilter, Receipt, Profile } from '../types'

const YELLOW = '#D4C429'
const YELLOW_DIM = 'rgba(212,196,41,0.15)'

function currency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function getFrom(period: PeriodFilter): Date {
  const t = startOfToday()
  if (period === 'today') return t
  if (period === '7d')    return subDays(t, 7)
  if (period === '15d')   return subDays(t, 15)
  return subDays(t, 30)
}

interface SellerStat { id: string; full_name: string; total: number; count: number }

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-sm" style={{ padding: '8px 12px' }}>
      <div className="label" style={{ marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: YELLOW }}>{currency(payload[0].value)}</div>
    </div>
  )
}

function KpiCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="metric-card" style={{ minHeight: 120 }}>
      <div className="icon-circle">{icon}</div>
      <div>
        <div className="label" style={{ marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#FFF', letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [period, setPeriod] = useState<PeriodFilter>('7d')
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [sellers, setSellers]   = useState<Profile[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!profile) return
    setLoading(true)
    async function load() {
      const fromStr = format(getFrom(period), 'yyyy-MM-dd')
      let q = supabase
        .from('receipts')
        .select('*, profiles(id, full_name, email, role, active, created_at)')
        .gte('deposit_date', fromStr).neq('status', 'rejected')
      if (profile!.role !== 'admin') q = q.eq('user_id', profile!.id)

      const [{ data: r }, { data: s }] = await Promise.all([
        q,
        profile!.role === 'admin'
          ? supabase.from('profiles').select('*').eq('role', 'vendedor').eq('active', true)
          : Promise.resolve({ data: [] }),
      ])
      setReceipts((r as Receipt[]) ?? [])
      setSellers((s as Profile[]) ?? [])
      setLoading(false)
    }
    load()
  }, [period, profile])

  const totalAmount   = receipts.reduce((s, r) => s + Number(r.amount), 0)
  const uniqueSellers = new Set(receipts.map(r => r.user_id)).size
  const avgPerSeller  = uniqueSellers > 0 ? totalAmount / uniqueSellers : 0

  const sellerStats: SellerStat[] = sellers
    .map(s => {
      const sr = receipts.filter(r => r.user_id === s.id)
      return { id: s.id, full_name: s.full_name, total: sr.reduce((a, r) => a + Number(r.amount), 0), count: sr.length }
    })
    .sort((a, b) => b.total - a.total)

  const topPerformer = sellerStats[0]

  const today = startOfToday()
  const lineData = eachDayOfInterval({ start: getFrom(period), end: today }).map(day => {
    const key   = format(day, 'yyyy-MM-dd')
    const total = receipts.filter(r => r.deposit_date === key).reduce((s, r) => s + Number(r.amount), 0)
    return { date: format(day, 'dd/MM'), total }
  })

  const activeInPeriod = sellerStats.filter(s => s.count > 0).length
  const totalSellers   = sellers.length
  const efficiency     = totalSellers > 0 ? Math.round((activeInPeriod / totalSellers) * 100) : 0
  const donutData = [
    { value: activeInPeriod },
    { value: Math.max(totalSellers - activeInPeriod, 0) },
  ]

  return (
    <div style={{ padding: 28, maxWidth: 1440 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#FFF', letterSpacing: '-0.04em', lineHeight: 1 }}>Dashboard</h1>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Visão geral de desempenho</p>
        </div>
        <PeriodFilterBar value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: YELLOW }}
            className="animate-spin" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <KpiCard icon="◈" label="Total Depósitos"   value={currency(totalAmount)} />
            <KpiCard icon="◉" label="Vendedores Ativos" value={String(uniqueSellers)} />
            <KpiCard icon="◧" label="Comprovantes"      value={String(receipts.length)} />
            <KpiCard icon="⊡" label="Média / Vendedor"  value={currency(avgPerSeller)} />
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>

            {/* Area chart */}
            <div className="glass" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Depósitos diários</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#FFF', letterSpacing: '-0.04em' }}>
                    {currency(totalAmount)}
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={lineData} margin={{ top: 4, right: 0, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="yGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={YELLOW} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={YELLOW} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)', fontFamily: 'Inter' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="total" stroke={YELLOW} strokeWidth={2}
                    fill="url(#yGrad)" dot={false}
                    activeDot={{ r: 4, fill: YELLOW, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Donut — eficiência */}
            <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div className="label" style={{ marginBottom: 4 }}>Índice da Equipe</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>Eficiência no período</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                  <PieChart width={140} height={140}>
                    <Pie data={donutData} cx={65} cy={65} innerRadius={44} outerRadius={60}
                      dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                      <Cell fill={YELLOW} />
                      <Cell fill="rgba(255,255,255,0.07)" />
                    </Pie>
                  </PieChart>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFF', letterSpacing: '-0.04em', lineHeight: 1 }}>{efficiency}%</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>ativos</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: YELLOW }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{activeInPeriod} ativos</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{totalSellers - activeInPeriod} inat.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>

            {/* Top performer */}
            <div className="glass" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
              {/* Accent glow */}
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%',
                background: `radial-gradient(circle, ${YELLOW_DIM} 0%, transparent 70%)`, pointerEvents: 'none' }} />
              <div className="label" style={{ marginBottom: 16 }}>Top Performer</div>
              {topPerformer ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(255,255,255,0.08)', border: `1px solid ${YELLOW}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 600, color: YELLOW,
                  }}>
                    {topPerformer.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {topPerformer.full_name}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: YELLOW, letterSpacing: '-0.03em', marginTop: 2 }}>
                      {currency(topPerformer.total)}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                      {topPerformer.count} depósitos
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>Sem dados no período</div>
              )}
            </div>

            {/* Leaderboard */}
            <div className="glass" style={{ padding: 24 }}>
              <div className="label" style={{ marginBottom: 20 }}>Ranking de Vendedores</div>
              {sellerStats.length === 0 ? (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>Sem dados no período</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {sellerStats.slice(0, 5).map((s, i) => {
                    const pct = topPerformer?.total ? (s.total / topPerformer.total) * 100 : 0
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 500, width: 16, textAlign: 'center', flexShrink: 0,
                          color: i === 0 ? YELLOW : 'rgba(255,255,255,0.25)' }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', width: 130, flexShrink: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.full_name}
                        </span>
                        <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`,
                            background: i === 0 ? YELLOW : 'rgba(255,255,255,0.18)',
                            transition: 'width 0.7s ease' }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: i === 0 ? YELLOW : 'rgba(255,255,255,0.60)',
                          width: 110, textAlign: 'right', flexShrink: 0 }}>
                          {currency(s.total)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
