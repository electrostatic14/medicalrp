import { readdir, readFile, access } from "node:fs/promises";
import { resolve, dirname, extname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const sourceFiles = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (
      [".git", "node_modules", "test-results", "__pycache__"].includes(
        entry.name,
      )
    )
      continue;
    const full = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(full);
    else sourceFiles.push(full);
  }
}
await walk(root);
if (process.argv.includes("--link-modules")) {
  // Link, but never evaluate, browser modules. This catches misspelled named
  // exports without requiring DOM/WebGL globals or starting the application.
  const { SourceTextModule } = await import("node:vm");
  const modules = new Map();
  async function loadModule(file) {
    if (!modules.has(file))
      modules.set(
        file,
        readFile(file, "utf8").then(
          (source) => new SourceTextModule(source, { identifier: file }),
        ),
      );
    return modules.get(file);
  }
  for (const file of sourceFiles.filter(
    (file) => file.endsWith(".js") && !file.includes(`${sep}tests${sep}`),
  )) {
    const module = await loadModule(file);
    if (module.status === "unlinked")
      await module.link((specifier, importer) =>
        loadModule(resolve(dirname(importer.identifier), specifier)),
      );
  }
  process.exit(0);
}
function problem(file, message) {
  problems.push(`${relative(root, file)}: ${message}`);
}
async function localReference(file, reference) {
  const ref = reference.trim().split(/[?#]/)[0];
  if (!ref || /^(?:data:|blob:|mailto:|tel:|https?:|\/\/)/i.test(ref)) return;
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref))
    return problem(file, `Unsupported reference ${reference}`);
  if (ref.startsWith("/"))
    return problem(
      file,
      `Root-relative path breaks project Pages: ${reference}`,
    );
  const target = resolve(dirname(file), decodeURIComponent(ref));
  if (!target.startsWith(root + sep) && target !== root)
    return problem(file, `Reference leaves site: ${reference}`);
  try {
    await access(target);
  } catch {
    problem(file, `Missing local resource ${reference}`);
  }
}

const ids = [
  "intern",
  "paramedic",
  "feldsher",
  "narcologist",
  "pediatrician",
  "therapist",
  "traumatologist",
  "surgeon",
];
for (const required of [
  "index.html",
  ".nojekyll",
  "js/app.js",
  "js/catalog.js",
  "js/game-kit.js",
  "js/storage.js",
  "js/progress.js",
  "js/audio.js",
  "assets/vendor/three.module.js",
  "assets/vendor/OrbitControls.js",
  "assets/vendor/THREE-LICENSE.txt",
  ...ids.map((id) => `games/${id}.js`),
]) {
  try {
    await access(resolve(root, required));
  } catch {
    problems.push(`Missing required file: ${required}`);
  }
}

for (const file of sourceFiles) {
  const extension = extname(file);
  if (![".js", ".mjs", ".html", ".css"].includes(extension)) continue;
  const source = await readFile(file, "utf8");
  if ([".js", ".mjs"].includes(extension)) {
    const result = spawnSync(process.execPath, ["--check", file], {
      encoding: "utf8",
    });
    if (result.status !== 0) problem(file, result.stderr.trim());
    // Check both static imports/re-exports and literal lazy imports.
    const imports =
      /(?:\b(?:import|export)\s+(?:[^;\n]*?\s+from\s*)?['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
    for (const match of source.matchAll(imports)) {
      const ref = match[1] || match[2];
      if (!ref.startsWith(".")) {
        if (!file.includes(`${sep}tests${sep}`))
          problem(file, `Browser module has nonlocal import ${ref}`);
      } else await localReference(file, ref);
    }
    if (
      ids.some((id) => file === resolve(root, "games", `${id}.js`)) &&
      !/export\s+(?:async\s+)?function\s+mount\s*\(/.test(source)
    )
      problem(file, "Game must export mount(ctx)");
  }
  if (extension === ".html") {
    for (const match of source.matchAll(
      /\b(?:src|href)\s*=\s*['"]([^'"]+)['"]/g,
    ))
      await localReference(file, match[1]);
    for (const match of source.matchAll(
      /<(?:script|link|img)\b[^>]*\b(?:src|href)\s*=\s*['"](https?:\/\/[^'"]+)['"]/g,
    ))
      problem(file, `Runtime resource must be vendored: ${match[1]}`);
  }
  if (extension === ".css")
    for (const match of source.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g))
      await localReference(file, match[1]);
}

try {
  const { GAMES, SHOP_ITEMS, ACHIEVEMENTS } = await import("../js/catalog.js");
  assert.deepEqual([...GAMES.map((game) => game.id)].sort(), [...ids].sort());
  assert.equal(
    new Set(SHOP_ITEMS.map((item) => item.id)).size,
    SHOP_ITEMS.length,
  );
  assert.equal(
    new Set(ACHIEVEMENTS.map((item) => item.id)).size,
    ACHIEVEMENTS.length,
  );
  assert.equal(GAMES.find((game) => game.id === "surgeon").reward, 300);
  assert.equal(GAMES.find((game) => game.id === "intern").reward, 100);
} catch (error) {
  problems.push(`Catalog invariant: ${error.message}`);
}

if (!problems.length) {
  const linked = spawnSync(
    process.execPath,
    [
      "--experimental-vm-modules",
      fileURLToPath(import.meta.url),
      "--link-modules",
    ],
    { encoding: "utf8", env: { ...process.env, NODE_NO_WARNINGS: "1" } },
  );
  if (linked.status !== 0)
    problems.push(`Module linking failed:\n${linked.stderr.trim()}`);
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Checked ${sourceFiles.length} files: syntax, local imports/assets, all eight games and catalog invariants passed.`,
  );
