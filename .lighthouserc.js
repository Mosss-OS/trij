const BASE_URL = process.env.LHCI_BASE_URL || "http://localhost:5173";

module.exports = {
  ci: {
    collect: {
      url: [
        `${BASE_URL}/`,
        `${BASE_URL}/dashboard`,
        `${BASE_URL}/triage`,
        `${BASE_URL}/patients`,
        `${BASE_URL}/settings`,
      ],
      startServerCommand: "bun run build && bun run preview",
      startServerTimeout: 30000,
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 3000 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 200 }],
        "interactive": ["warn", { maxNumericValue: 5000 }],
        "uses-http2": ["warn"],
        "uses-passive-event-listeners": ["error"],
        "deprecations": ["error"],
        "errors-in-console": ["error"],
        "valid-source-maps": ["warn"],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./lhci_reports",
    },
  },
};
