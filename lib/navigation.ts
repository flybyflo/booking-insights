import {
  IconAlertTriangle,
  IconBook,
  IconDatabase,
  IconFiles,
  IconGitCompare,
  IconSettings,
} from "@tabler/icons-react"

export const routeLabels: Record<string, string> = {
  "/": "Ledger Review",
  "/anomalies": "Anomalies",
  "/booking-manual": "Booking Manual",
  "/duplicates": "Duplicates",
  "/data-source": "Data source",
  "/settings": "Settings",
}

export const navItems = [
  { title: "Ledger Review", href: "/", icon: IconDatabase },
  { title: "Anomalies", href: "/anomalies", icon: IconAlertTriangle },
  { title: "Duplicates", href: "/duplicates", icon: IconGitCompare },
  { title: "Booking Manual", href: "/booking-manual", icon: IconBook },
]

export const secondaryItems = [
  { title: "Data source", href: "/data-source", icon: IconFiles },
  { title: "Settings", href: "/settings", icon: IconSettings },
]
