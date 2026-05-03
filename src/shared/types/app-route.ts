export type AppRouteChild = {
  label: string
  path?: string
  isDisabled?: boolean
}

export type AppRoute = {
  label: string
  shortLabel: string
  path: string
  segment: string
  description: string
  group: "business" | "contacts" | "workspace"
  children?: AppRouteChild[]
  featureBadge?: string
  isVisible?: boolean
}
