export interface LinkOpenTarget {
  href: string;
  target: "_blank";
  features: string;
}

export function createLinkOpenTarget(href: string | null | undefined): LinkOpenTarget | null {
  const normalized = href?.trim();
  if (!normalized) return null;
  return {
    href: normalized,
    target: "_blank",
    features: "noopener,noreferrer",
  };
}
