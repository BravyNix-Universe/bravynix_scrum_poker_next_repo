/**
 * The version of the messages devices exchange in a room (SDD 12). A device that speaks a
 * different version can't take part and is asked to refresh (PRD FR-052).
 */
export const PROTOCOL_VERSION = 1;

export function isSupportedProtocol(version: unknown): boolean {
  return version === PROTOCOL_VERSION;
}
