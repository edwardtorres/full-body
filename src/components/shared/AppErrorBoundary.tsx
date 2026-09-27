import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { failed: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State { return { failed: true } }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // React reports the error to development tooling. Do not expose details in the UI.
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <main className="app-error" aria-labelledby="app-error-title">
      <span className="app-error-brand">FULL BODY</span>
      <h1 id="app-error-title">Something went wrong.</h1>
      <p>Your data is stored in this browser. Reloading the app may restore this screen.</p>
      <button type="button" onClick={() => window.location.reload()}>RELOAD APP</button>
    </main>
  }
}
