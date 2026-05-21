import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const ROOT = join(import.meta.dir, "..");
const SRC = join(ROOT, "media", "icon-marketplace.svg");
const OUT = join(ROOT, "media", "icon-marketplace.png");
const SIZE = 256;

const svg = readFileSync(SRC, "utf8");
const png = new Resvg(svg, { fitTo: { mode: "width", value: SIZE } })
  .render()
  .asPng();
writeFileSync(OUT, png);

console.log(`generated ${OUT} (${SIZE}x${SIZE}, ${png.length} bytes)`);
