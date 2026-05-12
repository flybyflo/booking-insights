"use client"

import { ConvexProvider, ConvexReactClient } from "convex/react"
import type { ReactNode } from "react"

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <main className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-3xl rounded-md border p-6">
          <h1 className="text-xl font-semibold">Convex is not configured</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Run <code>pnpm convex</code> once, keep it running, then import the
            dataset with <code>pnpm seed</code>.
          </p>
        </div>
      </main>
    )
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
