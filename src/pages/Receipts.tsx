import { useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProject } from '../hooks/useProject'
import type { Receipt } from '../types'
import { Drawer } from '../components/ui/Drawer'
import { FileViewer } from '../components/ui/FileViewer'

function currency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export default function Receipts() {
  const { profile } = useAuth()
  const { activeProject } = useProject()
  const [receipts, setReceipts]   = useState<Receipt[]>([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected]   = useState<Receipt | null>(null)
  const [formError, setFormError] = useState('')

  const [amount, setAmount] = useState('')
  const [date, setDate]     = useState('')
  const [notes, setNotes]   = useState('')
  const [file, setFile]     = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    if (!activeProject) { setReceipts([]); setLoading(false); return }
    let q = supabase
      .from('receipts')
      .select('*, profiles(id, full_name, email, role, active, created_at)')
      .eq('project_id', activeProject.id)
      .order('created_at', { ascending: false })
    if (profile?.role !== 'admin') q = q.eq('user_id', profile?.id ?? '')
    const { data } = await q
    setReceipts((data as Receipt[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { if (profile) load() }, [profile, activeProject?.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setFormError('Selecione um arquivo.'); return }
    setFormError('')
    setUploading(true)

    const ext  = file.name.split('.').pop()
    const path = `${profile?.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('receipts').upload(path, file)
    if (uploadError) { setFormError('Erro no upload do arquivo.'); setUploading(false); return }

    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
    await supabase.from('receipts').insert({
      user_id: profile?.id,
      project_id: activeProject?.id ?? profile?.project_id,
      file_url: urlData.publicUrl, file_type: file.type,
      amount: parseFloat(amount.replace(',', '.')), deposit_date: date, notes, status: 'pending',
    })

    setAmount(''); setDate(''); setNotes(''); setFile(null)
    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
    load()
  }

  const statusEl = (s: string) => {
    if (s === 'approved') return <span className="status-approved">Aprovado</span>
    if (s === 'rejected') return <span className="status-rejected">Rejeitado</span>
    return <span className="status-pending">Pendente</span>
  }

  const colSpan = profile?.role === 'admin' ? 5 : 4

  return (
    <div style={{ padding: 28, maxWidth: 1200 }}>
      <div className="page-header">
        <h1 className="page-title">Comprovantes</h1>
        <p className="page-subtitle">Envie e gerencie comprovantes de depósito</p>
      </div>

      {/* Upload form */}
      <div className="glass" style={{ padding: 24, marginBottom: 14 }}>
        <div className="label" style={{ marginBottom: 16 }}>Novo Comprovante</div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Valor (R$)</div>
              <input className="input" type="text" value={amount} onChange={e => setAmount(e.target.value)}
                required placeholder="0,00" />
            </div>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Data do depósito</div>
              <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="label" style={{ marginBottom: 6 }}>Arquivo (PDF ou imagem)</div>
              <input
                ref={fileRef} type="file" accept="image/*,.pdf"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                style={{ width: '100%', fontSize: 12, color: 'rgba(255,255,255,0.50)', cursor: 'pointer' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="label" style={{ marginBottom: 6 }}>Observação</div>
              <input className="input" type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          {formError && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.05)',
              padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>
              {formError}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={uploading} className="btn-primary">
              {uploading ? 'Enviando...' : 'Enviar comprovante'}
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              {profile?.role === 'admin' && <th>Vendedor</th>}
              <th>Valor</th>
              <th>Data</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={colSpan} style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Carregando...</td></tr>
            ) : receipts.length === 0 ? (
              <tr><td colSpan={colSpan} style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Nenhum comprovante ainda</td></tr>
            ) : receipts.map(r => (
              <tr key={r.id}>
                {profile?.role === 'admin' && (
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.60)',
                      }}>
                        {(r.profiles?.full_name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <span>{r.profiles?.full_name ?? '—'}</span>
                    </div>
                  </td>
                )}
                <td><span style={{ fontWeight: 600, color: '#FFF' }}>{currency(Number(r.amount))}</span></td>
                <td style={{ color: 'rgba(255,255,255,0.50)' }}>{format(new Date(r.deposit_date + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                <td>{statusEl(r.status)}</td>
                <td>
                  <button onClick={() => setSelected(r)}
                    style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', cursor: 'pointer',
                      background: 'none', border: 'none', fontFamily: 'Inter', fontWeight: 500 }}>
                    Ver →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Comprovante">
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div className="label" style={{ marginBottom: 4 }}>Valor</div>
                <div className="value-lg">{currency(Number(selected.amount))}</div>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 4 }}>Data</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#FFF' }}>
                  {format(new Date(selected.deposit_date + 'T00:00:00'), 'dd/MM/yyyy')}
                </div>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 4 }}>Status</div>
                {statusEl(selected.status)}
              </div>
              {selected.notes && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="label" style={{ marginBottom: 4 }}>Observação</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{selected.notes}</div>
                </div>
              )}
            </div>
            <div className="divider" />
            <div>
              <div className="label" style={{ marginBottom: 12 }}>Arquivo</div>
              <FileViewer url={selected.file_url} fileType={selected.file_type} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
