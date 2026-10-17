/** Where the PeerJS connection service runs. Empty settings mean PeerJS cloud (SDD ADR-03). */
export interface PeerServerSettings {
  host?: string;
  port?: string;
  path?: string;
  secure?: string;
}

export interface PeerServerOptions {
  host?: string;
  port?: number;
  path?: string;
  secure?: boolean;
}

/**
 * Reads build-time settings, for a self-hosted PeerServer or local testing. Unset values are left
 * out rather than set to `undefined`, because PeerJS spreads these over its own defaults.
 */
export function toPeerServerOptions({
  host,
  port,
  path,
  secure,
}: PeerServerSettings): PeerServerOptions {
  if (!host) return {};
  const portNumber = Number(port);
  return {
    host,
    ...(Number.isInteger(portNumber) && portNumber > 0 ? { port: portNumber } : {}),
    path: path || "/",
    secure: secure !== "false",
  };
}
