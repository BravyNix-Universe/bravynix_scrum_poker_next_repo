import { describe, expect, it } from "vitest";

import { toPeerServerOptions } from "./peer-server-config";

describe("toPeerServerOptions", () => {
  it("uses PeerJS cloud when no host is set", () => {
    expect(toPeerServerOptions({})).toEqual({});
    expect(toPeerServerOptions({ host: "", port: "9000" })).toEqual({});
  });

  it("reads a self-hosted PeerServer, secure unless turned off", () => {
    expect(toPeerServerOptions({ host: "peer.example.com" })).toStrictEqual({
      host: "peer.example.com",
      path: "/",
      secure: true,
    });
    expect(
      toPeerServerOptions({ host: "localhost", port: "9000", path: "/poker", secure: "false" }),
    ).toEqual({ host: "localhost", port: 9000, path: "/poker", secure: false });
  });

  it("leaves out a port that isn't a positive whole number, so PeerJS keeps its default", () => {
    expect(toPeerServerOptions({ host: "localhost", port: "abc" })).not.toHaveProperty("port");
    expect(toPeerServerOptions({ host: "localhost", port: "-1" })).not.toHaveProperty("port");
  });
});
