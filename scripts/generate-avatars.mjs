/**
 * Writes the bundled avatar images to public/avatars from Microsoft's Fluent Emoji (MIT).
 * Run with `npm run avatars` after changing the set; commit the generated files.
 * The avatar IDs and labels live in src/domain/avatars/avatars.ts.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "avatars");

/** Avatar ID → Fluent Emoji Flat icon name. */
const SOURCES = {
  "woman-red-hair-light": "woman-red-hair-light",
  "man-light": "man-light",
  "woman-medium-light": "woman-medium-light",
  "older-person-medium-light": "older-person-medium-light",
  "man-beard-medium": "man-beard-medium",
  "woman-curly-hair-medium": "woman-curly-hair-medium",
  "man-medium-dark": "man-medium-dark",
  "woman-headscarf-medium-dark": "woman-with-headscarf-medium-dark",
  "woman-dark": "woman-dark",
  "man-curly-hair-dark": "man-curly-hair-dark",
  panda: "panda",
  tiger: "tiger-face",
  fox: "fox",
  cat: "cat-face",
  dog: "dog-face",
  koala: "koala",
  owl: "owl",
  penguin: "penguin",
  frog: "frog",
  rabbit: "rabbit-face",
};

const LICENSE = `The avatar images in this folder come from Fluent Emoji by Microsoft Corporation
(https://github.com/microsoft/fluentui-emoji), via @iconify-json/fluent-emoji-flat.

MIT License

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

const iconSet = JSON.parse(
  await readFile(require.resolve("@iconify-json/fluent-emoji-flat/icons.json"), "utf8"),
);

await mkdir(outDir, { recursive: true });
for (const [id, name] of Object.entries(SOURCES)) {
  const icon = iconSet.icons[name];
  if (!icon) throw new Error(`Fluent Emoji Flat has no icon named "${name}"`);
  const width = icon.width ?? iconSet.width ?? 32;
  const height = icon.height ?? iconSet.height ?? 32;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${icon.body}</svg>\n`;
  await writeFile(join(outDir, `${id}.svg`), svg);
}
await writeFile(join(outDir, "LICENSE.txt"), LICENSE);

console.log(`Wrote ${Object.keys(SOURCES).length} avatars to public/avatars`);
