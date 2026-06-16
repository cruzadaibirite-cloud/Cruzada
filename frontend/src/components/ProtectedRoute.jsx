import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const [ativo, setAtivo] = useState(null)
  const [checkando, setCheckando] = useState(true)

  useEffect(() => {
    if (!user) { setCheckando(false); return }
    supabase.from('usuarios').select('ativo').eq('id', user.id).single().then(({ data }) => {
      setAtivo(data?.ativo ?? null)
      setCheckando(false)
    })
  }, [user])

  if (loading || checkando) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif", color: '#F97310', fontSize: '1.1rem', fontWeight: '600' }}>
        Carregando...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (ativo === false) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ background: '#fff', borderRadius: '20px', maxWidth: '440px', width: '100%', padding: '40px', textAlign: 'center', boxShadow: '0 16px 64px rgba(0,0,0,0.3)' }}>
          <div style={{ width: '64px', height: '64px', background: '#fff4ec', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F97310" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f1117', margin: '0 0 10px' }}>Solicitação enviada!</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.7, margin: '0 0 24px' }}>
            Sua conta foi criada com sucesso. Aguarde a aprovação do administrador para acessar a plataforma.
          </p>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }} style={{ background: '#F97310', color: '#fff', border: 'none', borderRadius: '50px', padding: '12px 32px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito', sans-serif", letterSpacing: '1px', textTransform: 'uppercase' }}>
            Voltar ao login
          </button>
        </div>
      </div>
    )
  }

  return children
}
