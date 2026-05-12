"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { routeLabels } from "@/lib/navigation"

function getPathCrumbs(pathname: string) {
  if (pathname === "/") {
    return [{ href: "/", label: routeLabels["/"] }]
  }

  const segments = pathname.split("/").filter(Boolean)

  if (segments[0] === "documents" && segments[1]) {
    return [{ href: pathname, label: `Document ${segments[1]}` }]
  }

  return segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`
    const fallbackLabel = segment
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")

    return {
      href,
      label: routeLabels[href] ?? fallbackLabel,
    }
  })
}

export function SiteHeader() {
  const pathname = usePathname()
  const pathCrumbs = getPathCrumbs(pathname)
  const isRootPath = pathname === "/"

  return (
    <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {isRootPath ? null : (
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Ledger Review</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            )}
            {pathCrumbs.map((crumb, index) => {
              const isLastPathCrumb = index === pathCrumbs.length - 1

              return (
                <React.Fragment key={crumb.href}>
                  {isRootPath ? null : <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {isLastPathCrumb ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
