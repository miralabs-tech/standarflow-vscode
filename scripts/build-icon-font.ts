import { createReadStream, writeFileSync } from "node:fs";
import { join } from "node:path";
import svgicons2svgfontMod from "svgicons2svgfont";
import svg2ttf from "svg2ttf";
import ttf2woff from "ttf2woff";

const SVGIcons2SVGFontStream =
  (svgicons2svgfontMod as any).SVGIcons2SVGFontStream ?? svgicons2svgfontMod;

const ROOT = join(import.meta.dir, "..");
const FONT_NAME = "standarflow-icons";
const ICONS_DIR = join(ROOT, "media", "icons");
const OUT_WOFF = join(ROOT, "media", `${FONT_NAME}.woff`);

const GLYPHS = [
  { name: "standarflow-logo", file: "standarflow-logo.svg", codepoint: 0xe000 },
];

const svgFont = await new Promise<string>((resolve, reject) => {
  const chunks: Buffer[] = [];
  const stream = new SVGIcons2SVGFontStream({
    fontName: FONT_NAME,
    fontHeight: 1000,
    normalize: true,
    centerHorizontally: true,
    centerVertically: true,
    log: () => {},
  });
  stream.on("data", (c: Buffer) => chunks.push(c));
  stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  stream.on("error", reject);
  for (const g of GLYPHS) {
    const glyph = createReadStream(join(ICONS_DIR, g.file)) as any;
    glyph.metadata = { unicode: [String.fromCodePoint(g.codepoint)], name: g.name };
    stream.write(glyph);
  }
  stream.end();
});

const ttf = svg2ttf(svgFont, { description: "Standarflow icon font" });
let woff: any = ttf2woff(new Uint8Array(ttf.buffer));
if (!(woff instanceof Uint8Array) && woff?.buffer) woff = woff.buffer;
writeFileSync(OUT_WOFF, Buffer.from(woff));

console.log(`generated ${OUT_WOFF} (${Buffer.from(woff).length} bytes)`);
