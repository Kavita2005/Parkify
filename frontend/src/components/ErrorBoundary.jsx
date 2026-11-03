import { Component } from 'react'
/** If a screen crashes, show a friendly message instead of a blank page. */
export default class ErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.error(err) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="grid min-h-dvh place-items-center bg-base p-6 text-center text-ink">
        <div className="max-w-sm"><h1 className="text-2xl font-extrabold">Something went wrong</h1>
          <p className="mt-2 text-mute">This page hit an unexpected problem. Reloading usually fixes it.</p>
          <button className="btn btn-primary mt-5" onClick={() => window.location.reload()}>Reload</button></div>
      </div>)
  }
}
