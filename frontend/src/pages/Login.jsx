import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Erro ao entrar. Verifique suas credenciais.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Cruzada Ibirite</h1>
        <p style={styles.subtitle}>Entre na sua conta</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              style={styles.input}
              onFocus={e => (e.target.style.borderColor = '#F97310')}
              onBlur={e => (e.target.style.borderColor = '#2a2d3a')}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={styles.input}
              onFocus={e => (e.target.style.borderColor = '#F97310')}
              onBlur={e => (e.target.style.borderColor = '#2a2d3a')}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f1117',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Nunito', sans-serif",
    padding: '1rem',
  },
  card: {
    backgroundColor: '#1a1d27',
    borderRadius: '16px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    border: '1px solid #2a2d3a',
  },
  title: {
    color: '#F97310',
    fontSize: '1.8rem',
    fontWeight: '800',
    margin: '0 0 0.25rem',
    textAlign: 'center',
  },
  subtitle: {
    color: '#8b8fa8',
    fontSize: '0.95rem',
    textAlign: 'center',
    margin: '0 0 2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    color: '#c5c7d4',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0f1117',
    border: '1.5px solid #2a2d3a',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: '#ffffff',
    fontSize: '0.95rem',
    fontFamily: "'Nunito', sans-serif",
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    color: '#ff6b6b',
    fontSize: '0.875rem',
    margin: '0',
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(255,107,107,0.2)',
  },
  button: {
    backgroundColor: '#F97310',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.85rem',
    fontSize: '1rem',
    fontWeight: '700',
    fontFamily: "'Nunito', sans-serif",
    transition: 'background-color 0.2s, transform 0.1s',
    marginTop: '0.5rem',
  },
}
