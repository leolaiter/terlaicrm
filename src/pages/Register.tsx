import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signUp(email, password, fullName)
    if (error) { setError('Erro ao criar conta. Tente novamente.'); setLoading(false) }
    else navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F2F2F0' }}>
      <div className="glass-card p-8 w-full max-w-sm">
        <div className="mb-8">
          <div className="label-text mb-1">SISTEMA</div>
          <h1 className="text-2xl font-semibold text-[#1A1A1A] tracking-tight">TERLAI</h1>
          <p className="text-sm text-[#999] mt-1">Crie sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-text block mb-1.5">NOME COMPLETO</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] bg-white text-sm text-[#1A1A1A] outline-none focus:border-[#1A1A1A] transition-colors"
              placeholder="João Silva"
            />
          </div>
          <div>
            <label className="label-text block mb-1.5">E-MAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] bg-white text-sm text-[#1A1A1A] outline-none focus:border-[#1A1A1A] transition-colors"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="label-text block mb-1.5">SENHA</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] bg-white text-sm text-[#1A1A1A] outline-none focus:border-[#1A1A1A] transition-colors"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {error && <p className="text-xs text-[#999]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-[#999] mt-6">
          Já tem conta?{' '}
          <Link to="/login" className="text-[#1A1A1A] font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
