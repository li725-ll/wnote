export function rendererContentSecurityPolicy({
  dev,
  devPort,
}: {
  dev: boolean;
  devPort: number;
}): string {
  const directives = [
    ["default-src", "'self'"],
    ["script-src", "'self'", ...(dev ? ["'unsafe-eval'", "'unsafe-inline'"] : [])],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", ...(dev ? ["http:"] : []), "https:", "wnote-asset:"],
    ["font-src", "'self'", "data:"],
    [
      "connect-src",
      "'self'",
      ...(dev ? [`http://localhost:${devPort}`, `ws://localhost:${devPort}`] : []),
      "wnote-asset:",
    ],
    ["worker-src", "'self'", "blob:"],
  ];

  return directives.map((parts) => parts.join(" ")).join("; ");
}
