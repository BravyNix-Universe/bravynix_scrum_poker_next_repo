/** The app's release, from package.json at build time. Reported in diagnostics (PRD FR-053). */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "development";
