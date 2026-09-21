import { mkdir } from "node:fs/promises";
import { openSync } from "fontkit";
import sharp from "sharp";

const output = "public/identity";
await mkdir(output, { recursive: true });
const font = openSync("fonts/geist-400-latin.v1.woff2");
const ink = "#123d4b";
const salt = "#f3efe4";
// Reuse the established Travessia symbol. Paths also feed the inline UI mark.
const symbol =
  '<circle cx="26" cy="26" r="24.5" fill="none" stroke="currentColor"/><path d="M8 30c6-7 12-7 18 0s12 7 18 0M8 22c6-7 12-7 18 0s12 7 18 0" fill="none" stroke="currentColor"/><circle cx="26" cy="26" r="2.5" fill="currentColor"/>';
function lettering(text, x, y, size) {
  const run = font.layout(text);
  const scale = size / font.unitsPerEm;
  let offset = 0;
  return run.glyphs
    .map((glyph, index) => {
      const position = run.positions[index];
      const path = `<path transform="translate(${x + (offset + position.xOffset) * scale} ${y - position.yOffset * scale}) scale(${scale} ${-scale})" d="${glyph.path.toSVG()}"/>`;
      offset += position.xAdvance;
      return path;
    })
    .join("");
}
const svg = (w, h, body, color = ink) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" color="${color}" fill="${color}">${body}</svg>\n`;
const horizontal = `<g transform="translate(4 12)">${symbol}</g>${lettering("Travessia", 72, 34, 25)}${lettering("Viagens costeiras", 73, 58, 13)}`;
const compact = `<g transform="translate(114 4)">${symbol}</g>${lettering("Travessia", 23, 87, 24)}${lettering("Viagens costeiras", 48, 111, 13)}`;
const outputs = {
  "symbol.v1.svg": svg(52, 52, symbol),
  "horizontal.v1.svg": svg(350, 80, horizontal),
  "compact.v1.svg": svg(280, 130, compact),
  "monochrome.v1.svg": svg(350, 80, horizontal, "#000000"),
  "reversed.v1.svg": svg(350, 80, horizontal, salt),
  "favicon.v1.svg": svg(
    52,
    52,
    `<rect width="52" height="52" rx="10" fill="${ink}"/><g transform="translate(5 5) scale(.8)">${symbol}</g>`,
    salt,
  ),
};
for (const [name, body] of Object.entries(outputs))
  await Bun.write(`${output}/${name}`, body);
for (const [name, size] of [
  ["favicon-32", 32],
  ["apple-touch-icon", 180],
])
  await sharp(Buffer.from(outputs["favicon.v1.svg"]))
    .resize(size, size)
    .png()
    .toFile(`${output}/${name}.v1.png`);
const social = svg(
  1200,
  630,
  `<rect width="1200" height="630" fill="${ink}"/><g transform="translate(80 66) scale(1.25)">${horizontal}</g>${lettering("Travessia", 76, 332, 115)}${lettering("Uma viagem pela costa brasileira", 82, 425, 32)}${lettering("com tempo para olhar o mar.", 82, 471, 32)}${lettering("Comissão fictícia · paisagens reais", 82, 565, 20)}`,
  salt,
);
await Bun.write(`${output}/social.v1.svg`, social);
await sharp(Buffer.from(social)).png().toFile(`${output}/social.v1.png`);
console.log(
  "Identity SVGs and PNG derivatives reproduced from symbol paths and outlined Geist.",
);
