// Les deux passes Mac (arm64 puis x64) écrasent chacune latest-mac.yml : ce script
// reconstruit un manifeste qui liste les deux DMG d'une version.
//   node scripts/merge-mac-manifest.cjs <version> [out.yml]
// puis : gh release upload v<version> <out.yml> --clobber
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const [version, out = path.join(require("node:os").tmpdir(), "latest-mac.yml")] = process.argv.slice(2);
if (!version) { console.error("usage : node scripts/merge-mac-manifest.cjs <version> [out.yml]"); process.exit(1); }
const dir = path.resolve(__dirname, "../release");
const entry = (file) => {
  const buf = fs.readFileSync(path.join(dir, file));
  return { url: file.replace(/ /g, "-"), sha512: crypto.createHash("sha512").update(buf).digest("base64"), size: buf.length };
};
const x64 = entry(`FWST Scoring-${version}.dmg`);
const arm = entry(`FWST Scoring-${version}-arm64.dmg`);
const yml = `version: ${version}
files:
  - url: ${x64.url}
    sha512: ${x64.sha512}
    size: ${x64.size}
  - url: ${arm.url}
    sha512: ${arm.sha512}
    size: ${arm.size}
path: ${x64.url}
sha512: ${x64.sha512}
releaseDate: '${new Date().toISOString()}'
`;
fs.writeFileSync(out, yml);
console.log(out);
