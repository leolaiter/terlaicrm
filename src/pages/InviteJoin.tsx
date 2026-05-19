import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Project } from '../types'

export default function InviteJoin() {
  const { token } = useParams<{ token: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loadingProject, setLoadingProject] = useState(true)
  const [invalidToken, setInvalidToken] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProject() {
      if (!token) { setInvalidToken(true); setLoadingProject(false); return }
      const { data } = await supabase.from('projects').select('*').eq('invite_token', token).maybeSingle()
      if (data) setProject(data as Project)
      else setInvalidToken(true)
      setLoadingProject(false)
    }
    loadProject()
  }, [token])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!project) return
    setLoading(true); setError('')

    const { data, error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, project_id: project.id } },
    })
    if (err) { setError(err.message); setLoading(false); return }

    // Garantir profile completo (trigger pode não capturar project_id em todos os casos)
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        email,
        project_id: project.id,
        active: false, // Aguarda aprovação admin
      }, { onConflict: 'id' })
    }

    setDone(true)
    setLoading(false)
  }

  if (loadingProject) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin opacity-50" />
    </div>
  )

  if (invalidToken) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-raised" style={{ padding: 40, maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 32, color: '#ff6b6b', marginBottom: 12 }}>✗</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFF', marginBottom: 8 }}>Link inválido</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
          Este link de convite expirou ou foi revogado. Peça um novo ao administrador.
        </p>
        <Link to="/login" className="pill" style={{ display: 'inline-block', cursor: 'pointer' }}>Ir para login</Link>
      </div>
    </div>
  )

  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-raised" style={{ padding: 48, maxWidth: 380, textAlign: 'center' }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'rgba(212,196,41,0.15)', border: '1px solid rgba(212,196,41,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 22, color: '#D4C429',
        }}>✓</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFF', marginBottom: 10 }}>Cadastro enviado!</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Vinculado ao projeto:</p>
        <p style={{ fontSize: 14, color: '#D4C429', fontWeight: 600, marginBottom: 20 }}>{project?.name}</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>Aguarde a aprovação do admin para acessar.</p>
        <Link to="/login" className="pill" style={{ display: 'inline-block', cursor: 'pointer' }}>Voltar ao login</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 11, background: '#FFF', color: '#0E0E11',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, marginBottom: 12,
          }}>T</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#FFF' }}>TERLAI</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Convite</div>
        </div>

        <div className="glass-raised" style={{ padding: 32 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', background: 'rgba(212,196,41,0.08)',
            border: '1px solid rgba(212,196,41,0.25)', borderRadius: 11, marginBottom: 22,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Você foi convidado para</div>
              <div style={{ fontSize: 15, color: '#D4C429', fontWeight: 600, marginTop: 2 }}>{project?.name}</div>
            </div>
          </div>

          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#FFF', marginBottom: 4 }}>Crie sua conta</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 22 }}>Seu acesso será aprovado pelo admin</p>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Nome completo" type="text" value={fullName} onChange={setFullName} required />
            <Field label="E-mail" type="email" value={email} onChange={setEmail} required />
            <Field label="Senha (mínimo 6)" type="password" value={password} onChange={setPassword} minLength={6} required />

            {error && (
              <div style={{
                background: 'rgba(255,107,107,0.1)', color: '#ff6b6b',
                border: '1px solid rgba(255,107,107,0.25)', borderRadius: 8,
                padding: '8px 12px', fontSize: 12, textAlign: 'center',
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              padding: '11px', borderRadius: 10, border: 'none',
              background: '#D4C429', color: '#0E0E11',
              fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
              marginTop: 6, opacity: loading ? 0.5 : 1,
              transition: 'all 0.15s',
            }}>{loading ? 'Enviando...' : 'Solicitar acesso →'}</button>
          </form>

          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Já tem conta? </span>
            <Link to="/login" style={{ fontSize: 12, color: '#D4C429', textDecoration: 'none', fontWeight: 600 }}>Entrar</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, ...rest }: {
  label: string; type: string; value: string; onChange: (v: string) => void
  required?: boolean; minLength?: number
}) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 600,
        color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase',
        letterSpacing: '0.06em', marginBottom: 6,
      }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        {...rest}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 10,
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#FFF', fontSize: 13, outline: 'none',
        }}
      />
    </div>
  )
}
