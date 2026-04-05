import React, { useState, useEffect } from 'react'
import { Mail } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import Newsletter from './Newsletter'

const DISMISSED_KEY = 'newsletter-dismissed'
const SCROLL_THRESHOLD = 0.4

export default function NewsletterPopup() {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem(DISMISSED_KEY)
    if (stored) return

    setDismissed(false)

    const handleScroll = () => {
      const scrollPct =
        window.scrollY / (document.body.scrollHeight - window.innerHeight)
      if (scrollPct > SCROLL_THRESHOLD) {
        setOpen(true)
        window.removeEventListener('scroll', handleScroll)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (!value) {
      sessionStorage.setItem(DISMISSED_KEY, '1')
      setDismissed(true)
    }
  }

  return (
    <>
      {/* Floating button — visible when popup is closed and not auto-dismissed */}
      {!open && !dismissed && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Subscribe to newsletter"
        >
          <Mail className="h-5 w-5" />
        </button>
      )}

      {/* Always show a subtle floating button after dismiss so users can still subscribe */}
      {!open && dismissed && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Subscribe to newsletter"
        >
          <Mail className="h-4 w-4" />
        </button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Stay Updated
            </DialogTitle>
            <DialogDescription>
              Get the latest posts about Kubernetes, bare-metal infrastructure, and homelab engineering delivered to your inbox.
            </DialogDescription>
          </DialogHeader>
          <Newsletter />
        </DialogContent>
      </Dialog>
    </>
  )
}
