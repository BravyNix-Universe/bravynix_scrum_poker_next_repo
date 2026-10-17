// @vitest-environment node
import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { AVATARS, getAvatar, isAvatarId } from "./avatars";

describe("avatar set", () => {
  it("has about 20 avatars with unique IDs (PRD FR-005)", () => {
    const ids = AVATARS.map((avatar) => avatar.id);
    expect(ids).toHaveLength(20);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("bundles an image for every avatar", () => {
    for (const { id } of AVATARS) {
      expect(existsSync(join(process.cwd(), "public", "avatars", `${id}.svg`)), id).toBe(true);
    }
  });

  it("treats unknown IDs as no avatar", () => {
    expect(isAvatarId("panda")).toBe(true);
    expect(isAvatarId("coffee")).toBe(false);
    expect(isAvatarId(undefined)).toBe(false);
    expect(getAvatar("panda").label).toBe("Panda");
  });
});
