#!/usr/bin/env node
// Renders build/icon.svg into PNG/ICNS/ICO for electron-builder.
// Uses sharp (SVG -> PNG) and png2icons (PNG -> ICNS + ICO).
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const png2icons = require("png2icons");

const BUILD = path.join(__dirname, "..", "build");
const SVG = path.join(BUILD, "icon.svg");
const PNG = path.join(BUILD, "icon.png");
const ICNS = path.join(BUILD, "icon.icns");
const ICO = path.join(BUILD, "icon.ico");

(async () => {
  if (!fs.existsSync(SVG)) {
    console.error(`Missing source: ${SVG}`);
    process.exit(1);
  }

  const svg = fs.readFileSync(SVG);

  await sharp(svg, { density: 384 })
    .resize(1024, 1024)
    .png({ compressionLevel: 9 })
    .toFile(PNG);
  console.log("✓ build/icon.png (1024x1024)");

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
