import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [done, setDone]               = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [linkInvalid, setLinkInvalid] = useState(false)

  useEffect(() => {
    // Supabase coloca a sessão de recuperação via fragmento (#) na URL.
    // O detectSessionInUrl do client trata isso automaticamente, mas escutamos o evento.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionReady(true)
      }
    })

    // Verifica se já temos a sessão de recuperação
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
      else {
        // sem hash de recovery e sem sessão → link inválido
        setTimeout(() => {
          if (!sessionReady) setLinkInvalid(!window.location.hash.includes('access_token'))
        }, 1000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) { setError('A senha precisa ter no mínimo 6 caracteres.'); return }
    if (password !== confirm) { setError('As senhas não conferem.'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError('Não foi possível redefinir. Tente novamente ou solicite um novo link.') }
    else {
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    }
    setLoading(false)
  }

  if (linkInvalid) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <Logo />
        <div className="glass-raised" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 32, color: '#ff6b6b', marginBottom: 12 }}>✗</div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#FFF', marginBottom: 8 }}>Link inválido ou expirado</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
            Solicite um novo link de recuperação para continuar.
          </p>
          <Link to="/esqueci-senha" className="btn-primary" style={{ display: 'inline-block', padding: '10px 20px', fontSize: 13 }}>
            Pedir novo link
          </Link>
        </div>
      </div>
    </div>
  )

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <Logo />
        <div className="glass-raised" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(212,196,41,0.15)', border: '1px solid rgba(212,196,41,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 22, color: '#D4C429',
          }}>✓</div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#FFF', marginBottom: 8 }}>Senha redefinida!</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
            Você será redirecionado para o login...
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <Logo />
        <div className="glass-raised" style={{ padding: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#FFF', letterSpacing: '-0.03em', marginBottom: 4 }}>Nova senha</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
            Defina uma nova senha para sua conta.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Nova senha</div>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                required minLength={6} placeholder="Mínimo 6 caracteres" autoFocus />
            </div>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Confirmar senha</div>
              <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                required minLength={6} placeholder="Repita a senha" />
            </div>
            {error && (
              <div style={{ fontSize: 12, color: '#ff6b6b', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', padding: '8px 12px', borderRadius: 8 }}>
                {error}
              </div>
            )}
            {!sessionReady && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '4px 0' }}>
                Validando link...
              </div>
            )}
            <button type="submit" disabled={loading || !sessionReady} className="btn-primary" style={{ marginTop: 4, padding: '10px 0', width: '100%' }}>
              {loading ? 'Salvando...' : 'Redefinir senha'}
            </button>
          </form>
        </div>
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
