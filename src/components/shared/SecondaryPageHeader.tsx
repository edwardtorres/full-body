import { ArrowLeft } from 'lucide-react'

export function SecondaryPageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="secondary-page-header">
    <button type="button" className="workout-text-button" onClick={onBack}><ArrowLeft size={18} /> DASHBOARD</button>
    <strong>FULL<span>/</span>BODY</strong>
    <span>{title.toUpperCase()}</span>
  </header>
}
