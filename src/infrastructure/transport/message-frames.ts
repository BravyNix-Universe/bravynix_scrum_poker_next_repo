/**
 * Splits long messages into frames and joins them again. Browsers deliver data-channel
 * messages above about 16 KB unreliably between Firefox and Chrome, and a room's full state
 * can be far larger (SDD 14, "Large rooms make large snapshots").
 */
/** At most 3 bytes of UTF-8 per UTF-16 unit keeps each frame under 16 KB. */
const FRAME_LENGTH = 5_000;
const FRAME_PREFIX = "~";
const FRAME_HEADER = /^~(\d{1,4})\/(\d{1,4}):/;
/** About 5 MB: far beyond any real room, and a bound on what a peer can make us buffer. */
const MAX_FRAMES = 1_000;

export function toFrames(message: string): string[] {
  if (message.length <= FRAME_LENGTH) return [message];
  const parts: string[] = [];
  let start = 0;
  while (start < message.length) {
    let end = Math.min(start + FRAME_LENGTH, message.length);
    // Never split a surrogate pair: each half would arrive as a replacement character.
    const last = message.charCodeAt(end - 1);
    if (end < message.length && last >= 0xd800 && last <= 0xdbff) end -= 1;
    parts.push(message.slice(start, end));
    start = end;
  }
  if (parts.length > MAX_FRAMES) throw new RangeError("Message too large to send");
  return parts.map((part, index) => `${FRAME_PREFIX}${index}/${parts.length}:${part}`);
}

/** Rebuilds messages from frames arriving in order on one reliable, ordered channel. */
export function createFrameAssembler() {
  let parts: string[] = [];
  let total = 0;

  const reset = () => {
    parts = [];
    total = 0;
  };

  return {
    /** The whole message once its last frame arrives; otherwise null. */
    push(frame: string): string | null {
      if (!frame.startsWith(FRAME_PREFIX)) {
        reset();
        return frame;
      }
      const header = FRAME_HEADER.exec(frame);
      if (!header) return null;
      const index = Number(header[1]);
      const count = Number(header[2]);
      if (index === 0) {
        reset();
        total = count;
      }
      if (count < 2 || count > MAX_FRAMES || count !== total || index !== parts.length) {
        reset();
        return null;
      }
      parts.push(frame.slice(header[0].length));
      if (parts.length < total) return null;
      const message = parts.join("");
      reset();
      return message;
    },
  };
}
