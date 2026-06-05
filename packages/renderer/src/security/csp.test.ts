import { describe, expect, it } from "vitest";
import { rendererContentSecurityPolicy } from "./csp";

describe("renderer CSP", () => {
  it("keeps production scripts strict", () => {
    const csp = rendererContentSecurityPolicy({ dev: false, devPort: 5190 });

    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("localhost");
    expect(csp).toContain("worker-src 'self' blob:");
  });

  it("allows vite dev server connections only in development", () => {
    const csp = rendererContentSecurityPolicy({ dev: true, devPort: 5190 });

    expect(csp).toContain("script-src 'self' 'unsafe-eval'");
    expect(csp).toContain("http://localhost:5190");
    expect(csp).toContain("ws://localhost:5190");
  });
});
