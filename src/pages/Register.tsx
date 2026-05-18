import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Register() {
  const { signUp } = useAuth()
  const navigate   = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const result = await signUp(email, password, fullName)
    if (result.error) {
      setError(result.error.message ?? 'Erro ao criar conta.')
      setLoading(false)
    } else if (result.needsConfirmation) {
      setError('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F2F2F0' }}>
      <div className="w-full max-w-[360px]">

        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ background: '#1A1A1A' }}>T</div>
          <div>
            <div className="text-[14px] font-semibold text-[#1A1A1A] tracking-tight leading-none">TERLAI</div>
            <div className="text-[10px] text-[#CCCCCC] tracking-widest uppercase mt-0.5">System</div>
          </div>
        </div>

        <div className="glass p-7">
          <h1 className="text-[18px] font-semibold text-[#1A1A1A] tracking-tight mb-1">Criar conta</h1>
          <p className="text-[13px] text-[#AAAAAA] mb-6">Preencha os dados para se cadastrar</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label block mb-1.5">Nome completo</label>
              <input className="input" type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                required placeholder="João Silva" />
            </div>
            <div>
              <label className="label block mb-1.5">E-mail</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="seu@email.com" />
            </div>
            <div>
              <label className="label block mb-1.5">Senha</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                required minLength={6} placeholder="Mínimo 6 caracteres" />
            </div>

            {error && (
              <div className="text-[12px] text-[#999] bg-[rgba(0,0,0,0.03)] px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-1">
              {loading ? 'Criando...' : 'Criar conta'}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-[#AAAAAA] mt-5">
          Já tem conta?{' '}
          <Link to="/login" className="text-[#1A1A1A] font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
