import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import type { Profile, Receipt } from '../types'
import { Drawer } from '../components/ui/Drawer'
import { FileViewer } from '../components/ui/FileViewer'

function currency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export default function Admin() {
  const [users, setUsers]       = useState<Profile[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'users' | 'receipts'>('users')
  const [selected, setSelected] = useState<Receipt | null>(null)

  async function loadData() {
    const [{ data: u }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('receipts').select('*, profiles(id, full_name, email, role, active, created_at)').order('created_at', { ascending: false }),
    ])
    setUsers((u as Profile[]) ?? [])
    setReceipts((r as Receipt[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function updateRole(id: string, role: 'admin' | 'vendedor') {
    await supabase.from('profiles').update({ role }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
  }

  async function toggleActive(u: Profile) {
    await supabase.from('profiles').update({ active: !u.active }).eq('id', u.id)
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, active: !u.active } : x))
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    await supabase.from('receipts').update({ status }).eq('id', id)
    setReceipts(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null)
  }

  const initials = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="p-8 max-w-[1200px]">
      <div className="page-header">
        <h1 className="page-title">Administração</h1>
        <p className="page-subtitle">Gerencie usuários e comprovantes</p>
      </div>

      {/* Tabs */}
      <div className="pill-group mb-5">
        {(['users', 'receipts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`pill ${tab === t ? 'pill-active' : ''}`}>
            {t === 'users' ? `Usuários (${users.length})` : `Comprovantes (${receipts.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-60">
          <div className="w-5 h-5 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin opacity-30" />
        </div>
      ) : tab === 'users' ? (
        <div className="glass overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Role</th>
                <th>Status</th>
                <th>Desde</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#F0F0F0] flex items-center justify-center text-[11px] font-semibold text-[#888] shrink-0">
                        {initials(u.full_name || u.email)}
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-[#1A1A1A]">{u.full_name || '—'}</div>
                        <div className="text-[11px] text-[#AAAAAA]">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      value={u.role}
                      onChange={e => updateRole(u.id, e.target.value as 'admin' | 'vendedor')}
                      className="text-[12px] px-2 py-1 rounded-md border border-[rgba(0,0,0,0.08)] bg-white text-[#1A1A1A] outline-none hover:border-[#1A1A1A] transition-colors"
                    >
                      <option value="vendedor">Vendedor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={u.active ? 'status-approved' : 'status-rejected'}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="text-[#AAAAAA] text-[12px]">{format(new Date(u.created_at), 'dd/MM/yyyy')}</td>
                  <td>
                    <button onClick={() => toggleActive(u)} className="text-[12px] text-[#CCCCCC] hover:text-[#1A1A1A] transition-colors font-medium">
                      {u.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Valor</th>
                <th>Data</th>
                <th>Banco</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-[#CCCCCC] text-[13px]">Nenhum comprovante</td></tr>
              ) : receipts.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#F0F0F0] flex items-center justify-center text-[10px] font-semibold text-[#888] shrink-0">
                        {(r.profiles?.full_name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <span>{r.profiles?.full_name ?? '—'}</span>
                    </div>
                  </td>
                  <td><span className="font-semibold text-[#111]">{currency(Number(r.amount))}</span></td>
                  <td className="text-[#888]">{format(new Date(r.deposit_date + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                  <td className="text-[#888]">{r.bank}</td>
                  <td>
                    {r.status === 'approved' && <span className="status-approved">Aprovado</span>}
                    {r.status === 'rejected' && <span className="status-rejected">Rejeitado</span>}
                    {r.status === 'pending'  && <span className="status-pending">Pendente</span>}
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelected(r)} className="text-[12px] text-[#CCCCCC] hover:text-[#1A1A1A] transition-colors font-medium">Ver</button>
                      {r.status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(r.id, 'approved')} className="text-[12px] font-medium text-[#1A1A1A] hover:underline">Aprovar</button>
                          <button onClick={() => updateStatus(r.id, 'rejected')} className="text-[12px] font-medium text-[#CCCCCC] hover:underline">Rejeitar</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Comprovante">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div><div className="label mb-1">Vendedor</div><div className="text-[14px] font-semibold text-[#1A1A1A]">{selected.profiles?.full_name}</div></div>
              <div><div className="label mb-1">Valor</div><div className="value-lg">{currency(Number(selected.amount))}</div></div>
              <div><div className="label mb-1">Data</div><div className="text-[13px] text-[#555]">{format(new Date(selected.deposit_date + 'T00:00:00'), 'dd/MM/yyyy')}</div></div>
              <div><div className="label mb-1">Banco</div><div className="text-[13px] text-[#555]">{selected.bank}</div></div>
            </div>
            {selected.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => updateStatus(selected.id, 'approved')} className="btn-primary flex-1">Aprovar</button>
                <button onClick={() => updateStatus(selected.id, 'rejected')} className="btn-secondary flex-1">Rejeitar</button>
              </div>
            )}
            <div className="divider" />
            <div>
              <div className="label mb-3">Arquivo</div>
              <FileViewer url={selected.file_url} fileType={selected.file_type} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
