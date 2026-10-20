import { MenuIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { PAGE_SEO } from '../data/seo'
import { TABS } from '../data/tabs'
import type { TabId } from '../types'

/** Phones: the tabs as a side menu behind a hamburger button (wider screens use the tab bar). */
export function MobileNav({ active, onSelect }: { active: TabId; onSelect: (id: TabId) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="-ml-2 md:hidden" aria-label="Open menu">
          <MenuIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="size-6 shrink-0" />
            European Economic Data
          </SheetTitle>
          <SheetDescription className="sr-only">Pages</SheetDescription>
        </SheetHeader>
        <nav aria-label="Pages" className="flex flex-col gap-0.5 p-2">
          {TABS.map((t) => (
            // Real links (crawlable, open-in-new-tab); plain taps switch tabs in the app.
            <a
              key={t.id}
              href={PAGE_SEO[t.id].path}
              aria-current={t.id === active ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-2.5 text-[15px] text-muted-foreground hover:bg-muted hover:text-foreground',
                t.id === active && 'bg-muted font-medium text-foreground',
              )}
              onClick={(e) => {
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                e.preventDefault()
                onSelect(t.id)
                setOpen(false)
              }}
            >
              {t.label}
            </a>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
