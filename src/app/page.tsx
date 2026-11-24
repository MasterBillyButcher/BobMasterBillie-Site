'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard,
  Vote,
  ShieldBan,
  Star,
  CalendarDays,
  Megaphone,
  Terminal,
  FileText,
  ScrollText,
  Zap,
  ChevronUp,
  ExternalLink,
} from 'lucide-react'

import DashboardHome from '@/components/center/dashboard-home'
import PredictionsBoard from '@/components/center/predictions-board'
import VetoBoard from '@/components/center/veto-board'
import VipBoard from '@/components/center/vip-board'
import MoviePlanner from '@/components/center/movie-planner'
import AnnouncementsBoard from '@/components/center/announcements-board'
import CommandsReference from '@/components/center/commands-reference'
import CvTemplates from '@/components/center/cv-templates'
import ActivityLogView from '@/components/center/activity-log-view'
import { AdminGate, useAdminUnlocked } from '@/components/center/admin-gate'
import QuickCopy from '@/components/center/quick-copy'
import ConnectionDot from '@/components/center/connection-dot'
import { cn } from '@/lib/utils'
import type { TabId } from '@/components/center/tab-types'

// Appears after 400px of scroll, sits above the Quick Copy button.
function ScrollToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!show) return null
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll back to the top of the page"
      title="Back to top"
      className="fixed bottom-[4.6rem] right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg transition-colors hover:border-primary/50 hover:text-foreground sm:bottom-[4.9rem] sm:right-5"
    >
      <ChevronUp className="h-5 w-5" aria-hidden />
    </button>
  )
}

const tabs = [
  { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'predictions', label: 'Predictions', icon: Vote },
  { id: 'veto', label: 'Veto Power', icon: ShieldBan },
  { id: 'vip', label: 'VIP Board', icon: Star },
  { id: 'movies', label: 'Movie Backlog', icon: CalendarDays },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'commands', label: 'Commands', icon: Terminal },
  { id: 'cv', label: 'CV Templates', icon: FileText },
  { id: 'logs', label: 'Activity Log', icon: ScrollText },
] as const

export default function Home() {
  const [active, setActive] = useState<TabId>('home')
  const unlocked = useAdminUnlocked()

  // CV Templates are staff-only: if the site gets locked while the tab is
  // open, send the visitor back to the dashboard instead of a blank page.
  useEffect(() => {
    if (active === 'cv' && !unlocked) setActive('home')
  }, [active, unlocked])

  // The browser tab title follows the active section - screenshots, history
  // and bookmarks always say which part of the Command Center is open.
  useEffect(() => {
    const tab = tabs.find((t) => t.id === active)
    document.title =
      tab && tab.id !== 'home'
        ? `${tab.label} - BobMasterBillie Command Center`
        : 'BobMasterBillie Command Center'
  }, [active])

  const visibleTabs = useMemo(
    () => (unlocked ? tabs : tabs.filter((tab) => tab.id !== 'cv')),
    [unlocked]
  )

  // Tabs are deep-linkable: #commands, #logs and so on open that board
  // directly, and browser back/forward moves between tabs. Without a deep
  // link, the last board this browser used is restored from local storage.
  useEffect(() => {
    const tabFromHash = (): TabId | null => {
      const h = window.location.hash.replace('#', '')
      return tabs.some((t) => t.id === h) ? (h as TabId) : null
    }
    const hashTab = tabFromHash()
    if (hashTab) {
      setActive(hashTab)
    } else {
      try {
        const stored = window.localStorage.getItem('bmb-last-tab')
        if (stored && tabs.some((t) => t.id === stored)) setActive(stored as TabId)
      } catch {
        // storage blocked - the Dashboard default stays
      }
    }
    const onHash = () => {
      const t = tabFromHash()
      if (t) setActive(t)
    }
    window.addEventListener('hashchange', onHash)
    window.addEventListener('popstate', onHash)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('popstate', onHash)
    }
  }, [])

  // Writes the active tab into the URL (without new history entries) and
  // remembers it locally for the next visit.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const desired = active === 'home' ? '' : active
    if (window.location.hash.replace('#', '') !== desired) {
      const url = desired
        ? `#${desired}`
        : window.location.pathname + window.location.search
      window.history.replaceState(null, '', url)
    }
    try {
      window.localStorage.setItem('bmb-last-tab', active)
    } catch {
      // storage blocked - remembering the tab is a nice-to-have
    }
  }, [active])

  // Alt + 1..9 jumps straight to a tab (order matches the visible nav).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const n = Number(e.key)
      if (!Number.isInteger(n) || n < 1 || n > 9) return
      const target = visibleTabs[n - 1]
      if (target) {
        e.preventDefault()
        setActive(target.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visibleTabs])

  // "/" opens the Quick Copy palette from any tab except Commands, where it
  // already focuses that board's search box. Ignored while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      if (active === 'commands') return
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      ) {
        return
      }
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('bmb:quick-copy'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  // On narrow screens the active tab can sit outside the visible strip -
  // bring it to the middle whenever the tab changes.
  useEffect(() => {
    const el = document.querySelector('[data-tab-active="true"]')
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [active])

  return (
    <div className="flex min-h-screen flex-col">
      {/* Keyboard users can jump past the header straight into the page */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setActive('home')}
            aria-label="BobMasterBillie - back to the Dashboard"
            title="Back to Dashboard"
            className="flex items-center gap-3 rounded-md text-left transition-opacity hover:opacity-85"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
              <span className="font-display text-lg leading-none text-primary-foreground" aria-hidden>
                B
              </span>
            </div>
            <div className="leading-tight">
              <h1 className="font-display text-lg tracking-wide sm:text-xl">BobMasterBillie</h1>
              <p className="text-xs text-muted-foreground">Command Center</p>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('bmb:quick-copy'))}
              aria-label="Open quick copy - search and copy anything from any tab"
              title="Quick copy (Ctrl K or /)"
              className="hidden items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              <Zap className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span>Quick copy</span>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
                Ctrl K
              </kbd>
            </button>
            <AdminGate />
          </div>
        </div>

        {/* Tab navigation - underline style, scrollable on mobile */}
        <nav aria-label="Main navigation" className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl overflow-x-auto px-2 no-scrollbar sm:px-4">
            <div className="flex min-w-max items-center gap-1">
              {visibleTabs.map((tab, i) => {
                const Icon = tab.icon
                const isActive = active === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActive(tab.id)}
                    aria-current={isActive ? 'page' : undefined}
                    data-tab-active={isActive ? 'true' : undefined}
                    title={`${tab.label} (Alt+${i + 1})`}
                    className={cn(
                      'flex min-h-[44px] items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'border-primary font-medium text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon
                      className={cn('h-4 w-4', isActive ? 'text-primary' : '')}
                      aria-hidden
                    />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {/* Keyed by tab so each switch replays the gentle entrance animation */}
        <div key={active} className="animate-tab-in">
          {active === 'home' && <DashboardHome onNavigate={setActive} />}
          {active === 'predictions' && <PredictionsBoard />}
          {active === 'veto' && <VetoBoard />}
          {active === 'vip' && <VipBoard />}
          {active === 'movies' && <MoviePlanner />}
          {active === 'announcements' && <AnnouncementsBoard />}
          {active === 'commands' && <CommandsReference />}
          {active === 'cv' && unlocked && <CvTemplates />}
          {active === 'logs' && <ActivityLogView />}
        </div>
      </main>

      {/* Instant copy - searchable palette over every command, prediction and announcement */}
      <QuickCopy />

      {/* Back to top - long tabs like Commands and the Activity Log get an escape hatch */}
      <ScrollToTop />

      {/* Footer */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-center text-xs text-muted-foreground sm:flex-row sm:px-6 sm:text-left">
          <div>
            <p>
              <span className="font-medium text-foreground">BobMasterBillie</span> Command Center
            </p>
            <p className="mt-1 hidden items-center gap-1 lg:flex">
              <kbd className="rounded border border-border bg-secondary px-1 py-0.5 font-mono">Ctrl K</kbd>
              quick copy
              <span aria-hidden>·</span>
              <kbd className="rounded border border-border bg-secondary px-1 py-0.5 font-mono">/</kbd>
              search
              <span aria-hidden>·</span>
              <kbd className="rounded border border-border bg-secondary px-1 py-0.5 font-mono">Alt 1-9</kbd>
              tabs
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start">
            <ConnectionDot />
            <a
              href="https://twitch.tv/bobmasterbillie"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              Twitch
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
            <a href="/terms" className="hover:text-foreground">Terms &amp; Conditions</a>
            <a href="/privacy" className="hover:text-foreground">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
