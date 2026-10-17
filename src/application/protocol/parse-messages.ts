import type { Profile } from "@/domain/room/profile";
import type { ParticipantId, RoundId } from "@/domain/room/room";
import type { CardId } from "@/domain/rules/deck";

import { type ClientMessage, type HostMessage, MESSAGE_LIMITS } from "./messages";
import type { Refusal } from "../referee/room-command";
import type { SharedRoomState } from "../referee/room-state";
import type { SignedState } from "../sync/signed-state";
import type { StatePatch } from "../sync/state-patch";

type Fields = Record<string, unknown>;

const BASE64URL = /^[A-Za-z0-9_-]+$/;
const MESSAGE_ID = /^[A-Za-z0-9._-]{1,40}$/;
const ENTITY_ID = /^[A-Za-z0-9_-]{1,32}$/;

/**
 * Reads a message from a participant (SDD 12, rule 2). Anything malformed, oversized or of an
 * unknown type gives null and is dropped. Only the fields of the type are kept, and their
 * values are checked as far as the format goes; the referee checks what they mean.
 */
export function parseClientMessage(text: string): ClientMessage | null {
  if (text.length > MESSAGE_LIMITS.maxOfferLength) return null;
  const message = parseObject(text);
  if (!message) return null;
  if (message.type !== "offer" && text.length > MESSAGE_LIMITS.maxLength) return null;

  switch (message.type) {
    case "hello":
      return isInteger(message.protocol) && isBase64Url(message.nonce, 16, 64)
        ? { type: "hello", protocol: message.protocol, nonce: message.nonce }
        : null;
    case "offer": {
      const snapshot = toSignedState(message.snapshot);
      return snapshot ? { type: "offer", snapshot } : null;
    }
    case "join": {
      const profile = toProfile(message.profile);
      return isMessageId(message.id) &&
        isEntityId(message.participantId) &&
        isBase64Url(message.token, 22, 86) &&
        profile
        ? {
            type: "join",
            id: message.id,
            participantId: message.participantId as ParticipantId,
            token: message.token,
            profile,
          }
        : null;
    }
    case "profile": {
      const profile = toProfile(message.profile);
      return isMessageId(message.id) && profile
        ? { type: "profile", id: message.id, profile }
        : null;
    }
    case "vote":
      return isMessageId(message.id) &&
        isEntityId(message.roundId) &&
        isBase64Url(message.seal, 1, 128)
        ? {
            type: "vote",
            id: message.id,
            roundId: message.roundId as RoundId,
            seal: message.seal,
          }
        : null;
    case "open":
      return isMessageId(message.id) &&
        isEntityId(message.roundId) &&
        isShortString(message.card, 16) &&
        isBase64Url(message.salt, 16, 64)
        ? {
            type: "open",
            id: message.id,
            roundId: message.roundId as RoundId,
            card: message.card as CardId,
            salt: message.salt,
          }
        : null;
    case "resync":
    case "ping":
      return { type: message.type };
    default:
      return null;
  }
}

/**
 * Reads a message from the host. The host proves itself and signs every state, so this checks
 * shape only: the participant's session verifies signatures before trusting any content.
 */
export function parseHostMessage(text: string): HostMessage | null {
  const message = parseObject(text);
  if (!message) return null;

  switch (message.type) {
    case "welcome": {
      const snapshot = message.snapshot === null ? null : toSignedState(message.snapshot);
      return isInteger(message.protocol) &&
        typeof message.publicKey === "string" &&
        typeof message.proof === "string" &&
        (message.snapshot === null || snapshot) &&
        isFiniteNumber(message.now)
        ? {
            type: "welcome",
            protocol: message.protocol,
            publicKey: message.publicKey,
            proof: message.proof,
            snapshot,
            now: message.now,
          }
        : null;
    }
    case "incompatible":
      return isInteger(message.protocol)
        ? { type: "incompatible", protocol: message.protocol }
        : null;
    case "patch": {
      const patch = toStatePatch(message.patch);
      return isVersion(message.version) && patch && typeof message.signature === "string"
        ? { type: "patch", version: message.version, patch, signature: message.signature }
        : null;
    }
    case "snapshot": {
      const snapshot = toSignedState(message.snapshot);
      return snapshot ? { type: "snapshot", snapshot } : null;
    }
    case "ack":
      return isMessageId(message.id) ? { type: "ack", id: message.id } : null;
    case "reject":
      return isMessageId(message.id) && typeof message.refusal === "string"
        ? { type: "reject", id: message.id, refusal: message.refusal as Refusal }
        : null;
    case "ping":
      return isFiniteNumber(message.now) ? { type: "ping", now: message.now } : null;
    default:
      return null;
  }
}

function parseObject(text: string): Fields | null {
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value) && typeof value.type === "string" ? value : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return Number.isSafeInteger(value);
}

function isVersion(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isShortString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isBase64Url(value: unknown, minLength: number, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length >= minLength &&
    value.length <= maxLength &&
    BASE64URL.test(value)
  );
}

function isMessageId(value: unknown): value is string {
  return typeof value === "string" && MESSAGE_ID.test(value);
}

function isEntityId(value: unknown): value is string {
  return typeof value === "string" && ENTITY_ID.test(value);
}

/** Names and avatars are checked by the referee; this only bounds their size. */
function toProfile(value: unknown): Profile | null {
  if (!isRecord(value)) return null;
  const { displayName, avatarId } = value;
  const nameOk = displayName === null || isShortString(displayName, 256);
  const avatarOk = avatarId === null || isShortString(avatarId, 64);
  return nameOk && avatarOk ? ({ displayName, avatarId } as Profile) : null;
}

/** A signed state's envelope. Its content is trusted only once the signature checks out. */
function toSignedState(value: unknown): SignedState | null {
  if (!isRecord(value)) return null;
  const { version, state, signature } = value;
  return isVersion(version) && isRecord(state) && isBase64Url(signature, 1, 256)
    ? { version, state: state as unknown as SharedRoomState, signature }
    : null;
}

function toStatePatch(value: unknown): StatePatch | null {
  if (!isRecord(value) || !isRecord(value.fields) || !Array.isArray(value.rounds)) return null;
  return value as unknown as StatePatch;
}
