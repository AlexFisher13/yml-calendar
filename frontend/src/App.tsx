import { useEffect, useState } from 'react'

import { getSystemStatus, type SystemStatus } from './api/system'
import { Calendar } from './calendar/Calendar'

type ConnectionState =
  | { kind: 'loading' }
  | { kind: 'connected'; status: SystemStatus }
  | { kind: 'unavailable' }

export function App() {
  const [connection, setConnection] = useState<ConnectionState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    getSystemStatus(controller.signal)
      .then((status) => setConnection({ kind: 'connected', status }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setConnection({ kind: 'unavailable' })
      })

    return () => controller.abort()
  }, [])

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Личный календарь</p>
          <h1>Bro Calendar</h1>
          <p className="subtitle">
            Непрерывный обзор месяцев, праздников и важных событий.
          </p>
        </div>

        <BackendStatus connection={connection} />
      </header>

      <Calendar />
    </main>
  )
}

function BackendStatus({ connection }: { connection: ConnectionState }) {
  if (connection.kind === 'loading') {
    return <div className="backend-status">Проверяем backend…</div>
  }

  if (connection.kind === 'unavailable') {
    return (
      <div className="backend-status backend-status--offline">
        Backend недоступен
      </div>
    )
  }

  return (
    <div className="backend-status backend-status--online">
      <span aria-hidden="true" />
      Backend подключён
    </div>
  )
}
