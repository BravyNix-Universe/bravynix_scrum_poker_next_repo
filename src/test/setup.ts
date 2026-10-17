import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  // Some suites run in the Node environment, where there is no DOM or localStorage.
  if (typeof window === "undefined") return;
  cleanup();
  window.localStorage.clear();
});
