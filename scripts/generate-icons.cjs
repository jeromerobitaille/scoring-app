#!/usr/bin/env node
// Renders build/icon.svg + public/sttite.png into PNG/ICNS/ICO for electron-builder.
// The SVG is the rounded brown card background; the Saint-Tite festival logo is
// composited centered on top. Uses sharp (SVG -> PNG) and png2icons (PNG -> ICNS + ICO).
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const png2icons = require("png2icons");

const ROOT = path.join(__dirname, "..");
const BUILD = path.join(ROOT, "build");
const SVG = path.join(BUILD, "icon.svg");
const LOGO = path.join(ROOT, "public", "sttite.png");
const PNG = path.join(BUILD, "icon.png");
const ICNS = path.join(BUILD, "icon.icns");
const ICO = path.join(BUILD, "icon.ico");

const CANVAS = 1024;
// Logo occupies ~72% of the smaller canvas dimension — leaves a comfortable margin
const LOGO_FILL = 0.72;

(async () => {
  if (!fs.existsSync(SVG)) {
    console.error(`Missing source: ${SVG}`);
    process.exit(1);
  }
  if (!fs.existsSync(LOGO)) {
    console.error(`Missing logo: ${LOGO}`);
    process.exit(1);
  }

  // 1. Render the SVG background to a base canvas
  const bg = await sharp(fs.readFileSync(SVG), { density: 384 })
    .resize(CANVAS, CANVAS)
    .png()
    .toBuffer();

  // 2. Resize the logo to fit within LOGO_FILL of the canvas (preserving aspect ratio)
  const logoMeta = await sharp(LOGO).metadata();
  const maxDim = Math.round(CANVAS * LOGO_FILL);
  const scale = Math.min(maxDim / logoMeta.width, maxDim / logoMeta.height);
  const logoW = Math.round(logoMeta.width * scale);
  const logoH = Math.round(logoMeta.height * scale);

  // Recolor: extract the logo's alpha mask and apply it over a pure white fill,
  // so the wordmark renders white regardless of the source artwork color.
  const alphaMask = await sharp(LOGO)
    .resize(logoW, logoH, { fit: "inside" })
    .ensureAlpha()
    .extractChannel("alpha")
    .toBuffer();

  const logoBuffer = await sharp({
    create: {
      width: logoW,
      height: logoH,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .joinChannel(alphaMask)
    .png()
    .toBuffer();

  // 3. Composite logo centered on the brown card
  await sharp(bg)
    .composite([{
      input: logoBuffer,
      left: Math.round((CANVAS - logoW) / 2),
      top: Math.round((CANVAS - logoH) / 2),
    }])
    .png({ compressionLevel: 9 })
    .toFile(PNG);
  console.log(`✓ build/icon.png (${CANVAS}x${CANVAS}, logo ${logoW}x${logoH})`);

  const pngBuffer = fs.readFileSync(PNG);

  const icns = png2icons.createICNS(pngBuffer, png2icons.BILINEAR, 0);
  if (!icns) throw new Error("Failed to create ICNS");
  fs.writeFileSync(ICNS, icns);
  console.log("✓ build/icon.icns");

  const ico = png2icons.createICO(pngBuffer, png2icons.BILINEAR, 0, false);
  if (!ico) throw new Error("Failed to create ICO");
  fs.writeFileSync(ICO, ico);
  console.log("✓ build/icon.ico");
})();
