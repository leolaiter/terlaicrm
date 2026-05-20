import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    if (error) setError('Não foi possível enviar. Verifique o e-mail e tente novamente.')
    else setSent(true)
    setLoading(false)
  }

  if (sent) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <Logo />
        <div className="glass-raised" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(212,196,41,0.15)', border: '1px solid rgba(212,196,41,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 22, color: '#D4C429',
          }}>✉</div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#FFF', marginBottom: 8 }}>E-mail enviado</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>
            Enviamos um link de recuperação para
          </p>
          <p style={{ fontSize: 13, color: '#FFF', fontWeight: 600, marginBottom: 20 }}>{email}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
            Verifique sua caixa de entrada (e o spam). O link expira em 1 hora.
          </p>
          <Link to="/login" className="btn-primary" style={{ display: 'inline-block', padding: '10px 20px', fontSize: 13 }}>
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <Logo />
        <div className="glass-raised" style={{ padding: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#FFF', letterSpacing: '-0.03em', marginBottom: 4 }}>Recuperar senha</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
            Informe o e-mail da sua conta e enviaremos um link para redefinir sua senha.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>E-mail</div>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="seu@email.com" autoFocus />
            </div>
            {error && (
              <div style={{ fontSize: 12, color: '#ff6b6b', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', padding: '8px 12px', borderRadius: 8 }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4, padding: '10px 0', width: '100%' }}>
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.30)', marginTop: 20 }}>
          Lembrou da senha?{' '}
          <Link to="/login" style={{ color: 'rgba(255,255,255,0.70)', fontWeight: 500 }}>Voltar ao login</Link>
        </p>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: '#FFFFFF', color: '#0E0E11',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800,
      }}>T</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#FFF', letterSpacing: '-0.02em' }}>TERLAI</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>System</div>
      </div>
    </div>
  )
}
