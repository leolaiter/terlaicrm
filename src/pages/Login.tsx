import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await signIn(email, password)
    if (error) { setError('E-mail ou senha incorretos.'); setLoading(false) }
    else navigate('/')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: '#FFFFFF',
            color: '#0E0E11', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800,
          }}>T</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#FFF', letterSpacing: '-0.02em' }}>TERLAI</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>System</div>
          </div>
        </div>

        <div className="glass-raised" style={{ padding: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#FFF', letterSpacing: '-0.03em', marginBottom: 4 }}>Entrar</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>Acesse sua conta para continuar</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>E-mail</div>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="seu@email.com" />
            </div>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Senha</div>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••" />
            </div>
            {error && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: 8 }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4, padding: '10px 0', width: '100%' }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.30)', marginTop: 20 }}>
          Não tem conta?{' '}
          <Link to="/register" style={{ color: 'rgba(255,255,255,0.70)', fontWeight: 500 }}>Criar conta</Link>
        </p>
      </div>
    </div>
  )
}
