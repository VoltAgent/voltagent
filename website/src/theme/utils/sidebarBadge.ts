export type SidebarBadgeConfig = {
  label: string;
  variant?: string;
};

export function resolveSidebarBadge(badge: unknown): SidebarBadgeConfig | null {
  if (typeof badge === "string") {
    return { label: badge, variant: "accent" };
  }

  if (!badge || typeof badge !== "object") {
    return null;
  }

  const maybeBadge = badge as { label?: unknown; variant?: unknown };
  if (typeof maybeBadge.label !== "string") {
    return null;
  }

  const variant =
    typeof maybeBadge.variant === "string" && maybeBadge.variant.trim() !== ""
      ? maybeBadge.variant
      : "accent";

  return { label: maybeBadge.label, variant };
}
