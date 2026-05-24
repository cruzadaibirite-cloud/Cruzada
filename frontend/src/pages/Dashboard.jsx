import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Erro ao sair:', err)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.logo}>Cruzada Ibirite</h1>
        <button onClick={handleSignOut} style={styles.logoutBtn}>
          Sair
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.welcomeCard}>
          <div style={styles.avatarCircle}>
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <h2 style={styles.welcomeTitle}>
            Bem-vindo, <span style={styles.highlight}>{user?.email}</span>
          </h2>
          <p style={styles.welcomeText}>
            Você está autenticado com sucesso.
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f1117',
    fontFamily: "'Nunito', sans-serif",
    color: '#ffffff',
  },
  header: {
    backgroundColor: '#1a1d27',
    borderBottom: '1px solid #2a2d3a',
    padding: '1rem 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    color: '#F97310',
    fontSize: '1.4rem',
    fontWeight: '800',
    margin: 0,
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1.5px solid #F97310',
    color: '#F97310',
    borderRadius: '8px',
    padding: '0.5rem 1.25rem',
    fontSize: '0.9rem',
    fontWeight: '700',
    fontFamily: "'Nunito', sans-serif",
    cursor: 'pointer',
    transition: 'background-color 0.2s, color 0.2s',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 65px)',
    padding: '2rem',
  },
  welcomeCard: {
    backgroundColor: '#1a1d27',
    borderRadius: '16px',
    padding: '3rem 2.5rem',
    textAlign: 'center',
    border: '1px solid #2a2d3a',
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  avatarCircle: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: '#F97310',
    color: '#ffffff',
    fontSize: '2rem',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
  },
  welcomeTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    margin: '0 0 0.75rem',
    color: '#ffffff',
    wordBreak: 'break-all',
  },
  highlight: {
    color: '#F97310',
  },
  welcomeText: {
    color: '#8b8fa8',
    fontSize: '0.95rem',
    margin: 0,
  },
}
