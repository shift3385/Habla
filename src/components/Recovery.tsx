import { Component, useState, type ReactNode } from 'react'
import { exportBackup } from '../lib/backup'

// v5.8.2 (AUD-RES-704, AUD-E2E-601, AUD-SEG-510): antes, un dato con forma inesperada (un perfil o una consulta
// importados mal, un fallo de IndexedDB al abrir) dejaba la app en negro o en blanco, sin salida y en cada
// arranque. Ahora se ve esta pantalla, en español, con «Volver a intentar» y «Exportar mis datos» (para no
// perder el progreso aunque haya que reinstalar). Estilos fijos: puede salir antes de cargar el tema.

export function RecoveryScreen({ detail }: { detail?: string }) {
  const [status, setStatus] = useState<string | null>(null)
  const save = async () => {
    setStatus('Preparando la copia…')
    try {
      const r = await exportBackup()
      setStatus(r.savedPath ? `Copia guardada en ${r.savedPath}` : 'Copia lista ✓')
    } catch {
      setStatus('No se pudo hacer la copia. Inténtalo otra vez o pide ayuda.')
    }
  }
  const btn = { height: 52, borderRadius: 26, fontSize: 16, fontWeight: 600, width: '100%', border: 'none' } as const
  return (
    <div
      role="alert"
      style={{ minHeight: '100dvh', background: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, padding: '24px 24px' }}
    >
      <div style={{ fontSize: 44, textAlign: 'center' }}>🙈</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', margin: 0 }}>Algo no ha ido bien</h1>
      <p style={{ fontSize: 15, lineHeight: 1.45, color: '#cbd5e1', textAlign: 'center', margin: 0 }}>
        Habla no ha podido abrir esta pantalla con tus datos. Tu progreso sigue guardado en el teléfono. Vuelve a intentarlo; si se repite, exporta tus datos
        y avisa a quien te pasó la app.
      </p>
      {detail && <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', margin: 0, wordBreak: 'break-word' }}>Detalle: {detail}</p>}
      <button style={{ ...btn, background: '#fbbf24', color: '#0f172a', marginTop: 10 }} onClick={() => location.reload()}>
        Volver a intentar
      </button>
      <button style={{ ...btn, background: 'rgba(255,255,255,.12)', color: '#f8fafc' }} onClick={save}>
        Exportar mis datos
      </button>
      {status && <p style={{ fontSize: 13, color: '#cbd5e1', textAlign: 'center', margin: 0 }}>{status}</p>}
    </div>
  )
}

/** Atrapa cualquier error al pintar una pantalla y enseña RecoveryScreen en lugar de dejar la app en blanco. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error('[HABLA] error al pintar', error)
  }
  render() {
    return this.state.error ? <RecoveryScreen detail={this.state.error.name} /> : this.props.children
  }
}
