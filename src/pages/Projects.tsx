import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import type { Project } from '../types'

export default function Projects() {
  const { refresh: refreshProjects } = useProject()
  const [projects, setProjects] = useState<Project[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [name, setName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    const [{ data: projs }, { data: profs }] = await Promise.all([
      supabase.from('projects').select('*').order('name'),
      supabase.from('profiles').select('project_id').not('project_id', 'is', null),
    ])
    const map: Record<string, number> = {}
    ;(profs || []).forEach((p: { project_id: string }) => { if (p.project_id) map[p.project_id] = (map[p.project_id] || 0) + 1 })
    setCounts(map)
    setProjects((projs as Project[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function slugify(s: string) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('projects').insert({ name: name.trim(), slug: slugify(name) })
    setName('')
    setShowForm(false)
    await load()
    await refreshProjects()
    setSaving(false)
  }

  async function regenerateToken(id: string) {
    if (!confirm('Gerar novo link? O link antigo deixará de funcionar.')) return
    const newToken = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('')
    await supabase.from('projects').update({ invite_token: newToken }).eq('id', id)
    await load()
    await refreshProjects()
  }

  async function deleteProject(id: string, name: string) {
    const used = counts[id] || 0
    if (used > 0) { alert(`Não dá pra deletar: ${used} usuários vinculados. Mova-os no painel Admin primeiro.`); return }
    if (!confirm(`Deletar projeto "${name}"?`)) return
    await supabase.from('projects').delete().eq('id', id)
    await load()
    await refreshProjects()
  }

  const inviteUrl = (token: string) => `${window.location.origin}/convite/${token}`

  async function copy(url: string, id: string) {
    await navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-8 max-w-[900px]">
      <div className="page-header">
        <h1 className="page-title">Projetos</h1>
        <p className="page-subtitle">Gerencie seus times e gere convites</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setShowForm(!showForm)} className="pill pill-active" style={{ cursor: 'pointer' }}>
          + Novo projeto
        </button>
      </div>

      {showForm && (
        <div className="glass-raised" style={{ padding: 20, marginBottom: 18 }}>
          <div className="label" style={{ marginBottom: 10 }}>Novo projeto</div>
          <form onSubmit={createProject} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <input
              autoFocus
              placeholder="Ex: NovaDexy"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 10,
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFF', fontSize: 13, outline: 'none',
              }}
            />
            <button type="submit" disabled={saving} className="pill pill-active" style={{ cursor: 'pointer' }}>
              {saving ? '...' : 'Criar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="pill" style={{ cursor: 'pointer' }}>
              Cancelar
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin opacity-30" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projects.map(p => (
            <div key={p.id} className="glass" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#FFF', fontSize: 14, fontWeight: 700,
                }}>{p.name.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#FFF' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>/{p.slug}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                  <span>👥</span>
                  <span>{counts[p.id] || 0}</span>
                </div>
                <button onClick={() => deleteProject(p.id, p.name)} className="pill" style={{
                  cursor: 'pointer', color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)',
                }}>Deletar</button>
              </div>

              <div style={{
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: 10, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <code style={{
                  flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.65)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: 'monospace',
                }}>{inviteUrl(p.invite_token)}</code>
                <button onClick={() => copy(inviteUrl(p.invite_token), p.id)} className="pill" style={{ cursor: 'pointer', fontSize: 11 }}>
                  {copied === p.id ? '✓ Copiado' : 'Copiar'}
                </button>
                <button onClick={() => regenerateToken(p.id)} className="pill" style={{ cursor: 'pointer', fontSize: 11 }}>
                  ↻
                </button>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="glass" style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
              Nenhum projeto cadastrado. Crie o primeiro acima.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
