'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  Vote,
  ShieldBan,
  Star,
  CalendarDays,
  Terminal,
  FileText,
  ScrollText,
} from 'lucide-react'

import DashboardHome from '@/components/center/dashboard-home'
import PredictionsBoard from '@/components/center/predictions-board'
import VetoBoard from '@/components/center/veto-board'
import VipBoard from '@/components/center/vip-board'
import MoviePlanner from '@/components/center/movie-planner'
import CommandsReference from '@/components/center/commands-reference'
import CvTemplates from '@/components/center/cv-templates'
import ActivityLogView from '@/components/center/activity-log-view'
import { cn } from '@/lib/utils'
import type { TabId } from '@/components/center/tab-types'

const tabs = [
  { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'predictions', label: 'Predictions', icon: Vote },
  { id: 'veto', label: 'Veto Power', icon: ShieldBan },
  { id: 'vip', label: 'VIP Board', icon: Star },
  { id: 'movies', label: 'Movie Backlog', icon: CalendarDays },
  { id: 'commands', label: 'Commands', icon: Terminal },
  { id: 'cv', label: 'CV Templates', icon: FileText },
  { id: 'logs', label: 'Activity Log', icon: ScrollText },
] as const

export default function Home() {
  const [active, setActive] = useState<TabId>('home')

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
              <span className="font-display text-lg leading-none text-primary-foreground" aria-hidden>
                B
              </span>
            </div>
            <div className="leading-tight">
              <h1 className="font-display text-lg tracking-wide sm:text-xl">BobMasterBillie</h1>
              <p className="text-xs text-muted-foreground">Command Center</p>
            </div>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Prediction setups, backlog counter, vetoes, movie nights and the full log
          </p>
        </div>

        {/* Tab navigation - underline style, scrollable on mobile */}
        <nav aria-label="Main navigation" className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl overflow-x-auto px-2 sm:px-4">
            <div className="flex min-w-max items-center gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = active === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActive(tab.id)}
                    aria-current={isActive ? 'page' : undefined}
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {active === 'home' && <DashboardHome onNavigate={setActive} />}
        {active === 'predictions' && <PredictionsBoard />}
        {active === 'veto' && <VetoBoard />}
        {active === 'vip' && <VipBoard />}
        {active === 'movies' && <MoviePlanner />}
        {active === 'commands' && <CommandsReference />}
        {active === 'cv' && <CvTemplates />}
        {active === 'logs' && <ActivityLogView />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-center text-xs text-muted-foreground sm:flex-row sm:px-6 sm:text-left">
          <p>
            <span className="font-medium text-foreground">BobMasterBillie</span> Command Center
          </p>
          <div className="flex items-center gap-4">
            <a href="/terms" className="hover:text-foreground">Terms &amp; Conditions</a>
            <a href="/privacy" className="hover:text-foreground">Privacy Policy</a>
            <span>GitHub + Supabase + Vercel ready</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
