import { Calendar } from './calendar/Calendar'

export function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <strong>{new Date().getDate()}</strong>
          </div>
          <h1>Bro Calendar</h1>
        </div>
      </header>

      <Calendar />
    </main>
  )
}
