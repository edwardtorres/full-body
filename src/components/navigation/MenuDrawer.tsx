import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, RotateCcw, X } from 'lucide-react'

const links = ['Benchmark', 'Progress', 'Strong Points', 'Weak Points', 'Health & Recovery', 'Settings']

type Page = 'dashboard' | 'benchmark' | 'progress' | 'strong' | 'weak' | 'health' | 'settings'
const destinations: Page[] = ['benchmark', 'progress', 'strong', 'weak', 'health', 'settings']
export function MenuDrawer({ open, onClose, onNavigate, onReset, currentPage }: { open: boolean; onClose: () => void; onNavigate: (page: Page) => void; onReset: () => boolean; currentPage: Page }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const resetTriggerRef = useRef<HTMLButtonElement>(null)
  const cancelResetRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const wasConfirmReset = useRef(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetError, setResetError] = useState(false)

  useEffect(() => {
    if (!open) { setConfirmReset(false); return }
    returnFocusRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    document.body.classList.add('menu-open')
    return () => {
      document.body.classList.remove('menu-open')
      returnFocusRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) { wasConfirmReset.current = false; return }
    if (confirmReset) { wasConfirmReset.current = true; cancelResetRef.current?.focus() }
    else if (wasConfirmReset.current) { resetTriggerRef.current?.focus(); wasConfirmReset.current = false }
  }, [open, confirmReset])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { if (confirmReset) setConfirmReset(false); else onClose() }
      if (event.key !== 'Tab') return
      const focusable = Array.from((confirmReset ? panelRef.current?.querySelector('.drawer-reset-confirm') : panelRef.current)?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [])
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, confirmReset])

  if (!open) return null
  return (
    <div className="menu-layer">
      <div className="menu-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="menu-drawer" role="dialog" aria-modal="true" aria-label="Navigation" ref={panelRef}>
        <div className="drawer-top">
          <span className="small-label">FULL BODY / NAVIGATION</span>
          <button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav aria-label="Main navigation" className="drawer-nav">
          {links.map((link, index) => (
            <button key={link} type="button" className="drawer-link active" onClick={() => { onNavigate(destinations[index]); onClose() }} aria-current={currentPage === destinations[index] ? 'page' : undefined}>
              <span className="link-number">0{index + 1}</span><span>{link}</span><ArrowUpRight size={18} />
            </button>
          ))}
        </nav>
        <div className="drawer-end"><button ref={resetTriggerRef} type="button" className="drawer-reset" onClick={() => { setResetError(false); setConfirmReset(true) }}><RotateCcw size={15} /> RESET ALL DATA</button><div className="drawer-bottom"><span>FULL BODY</span><span>ANATOMY / BENCHMARK</span></div></div>
        {confirmReset && <div className="drawer-reset-confirm" role="alertdialog" aria-modal="true" aria-label="Reset all Full Body data?"><h2>Reset everything?</h2><p>This permanently removes your setup, benchmarks, exercise variations, recovery check-in, active workout, and workout history from this browser.</p>{resetError && <p role="alert">Reset failed. Your browser did not allow storage to be cleared.</p>}<div><button ref={cancelResetRef} type="button" onClick={() => setConfirmReset(false)}>CANCEL</button><button type="button" className="danger" onClick={() => { if (!onReset()) setResetError(true) }}>RESET EVERYTHING</button></div></div>}
      </aside>
    </div>
  )
}
