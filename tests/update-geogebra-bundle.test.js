const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");

const JSZip = require("jszip");

const { parseArgs, runUpdate } = require("../scripts/update_geogebra_bundle");

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pa-ggb-update-"));
  fs.mkdirSync(path.join(root, "content"), { recursive: true });
  return root;
}

async function makeBundleZip(tag) {
  const zip = new JSZip();
  zip.file("bundle/GeoGebra/deployggb.js", `window.__GGB_DEPLOY__ = ${JSON.stringify(tag)};`);
  zip.file("bundle/GeoGebra/HTML5/5.0/web3d/web3d.nocache.js", `console.log(${JSON.stringify(tag)});`);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

async function startBundleServer(bundleZipBuffer, zipName) {
  const server = http.createServer((req, res) => {
    if (req.url === "/package/geogebra-math-apps-bundle") {
      res.writeHead(302, { Location: `/files/${zipName}` });
      res.end();
      return;
    }
    if (req.url === `/files/${zipName}`) {
      res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Length": bundleZipBuffer.length,
      });
      res.end(bundleZipBuffer);
      return;
    }
    res.writeHead(404);
    res.end("not found");
  });

  await new Promise((resolve) => { server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  const port = Number(address && typeof address === "object" ? address.port : 0);
  return {
    server,
    url: `http://127.0.0.1:${port}/package/geogebra-math-apps-bundle`,
  };
}

async function pathExists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

test("parseArgs supports new updater options", () => {
  const args = parseArgs([
    "node",
    "scripts/update_geogebra_bundle.js",
    "--retain",
    "3",
    "--sha256",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "--no-lock",
    "--lock-file",
    "/tmp/ggb.lock",
  ]);

  assert.equal(args.retain, 3);
  assert.equal(args.noLock, true);
  assert.equal(args.sha256, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  assert.equal(args.lockFile, path.resolve("/tmp/ggb.lock"));
});

test("parseArgs keeps default retain value when omitted", () => {
  const args = parseArgs([
    "node",
    "scripts/update_geogebra_bundle.js",
  ]);
  assert.equal(args.retain, 0);
});

test("runUpdate updates current symlink and prunes older releases", async () => {
  const rootDir = makeTempRoot();
  const vendorDir = path.join(rootDir, "content", "library", "vendor", "geogebra");
  const releasesDir = path.join(vendorDir, "releases");
  const currentDir = path.join(vendorDir, "current");

  try {
    await fsp.mkdir(path.join(releasesDir, "old-a"), { recursive: true });
    await fsp.writeFile(path.join(releasesDir, "old-a", "marker.txt"), "a", "utf8");
    await new Promise((resolve) => { setTimeout(resolve, 25); });
    await fsp.mkdir(path.join(releasesDir, "old-b"), { recursive: true });
    await fsp.writeFile(path.join(releasesDir, "old-b", "marker.txt"), "b", "utf8");
    await fsp.symlink(path.relative(path.dirname(currentDir), path.join(releasesDir, "old-a")), currentDir, "dir");

    const zip = await makeBundleZip("new-release");
    const { server, url } = await startBundleServer(zip, "geogebra-math-apps-bundle-9-9-9.zip");
    try {
      const result = await runUpdate({
        rootDir,
        url,
        version: "release-new",
        retain: 2,
      });

      assert.equal(result.version, "release-new");
      assert.equal(result.removedReleases.length, 1);

      const currentTarget = await fsp.realpath(currentDir);
      const expectedCurrentTarget = await fsp.realpath(path.join(releasesDir, "release-new"));
      assert.equal(currentTarget, expectedCurrentTarget);

      const names = (await fsp.readdir(releasesDir)).sort();
      assert.deepEqual(names, ["old-b", "release-new"]);
      assert.equal(await pathExists(path.join(releasesDir, "release-new", "manifest.json")), true);
    } finally {
      await new Promise((resolve) => { server.close(resolve); });
    }
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("runUpdate aborts on sha256 mismatch and keeps existing current release", async () => {
  const rootDir = makeTempRoot();
  const vendorDir = path.join(rootDir, "content", "library", "vendor", "geogebra");
  const releasesDir = path.join(vendorDir, "releases");
  const currentDir = path.join(vendorDir, "current");

  try {
    await fsp.mkdir(path.join(releasesDir, "stable"), { recursive: true });
    await fsp.symlink(path.relative(path.dirname(currentDir), path.join(releasesDir, "stable")), currentDir, "dir");

    const zip = await makeBundleZip("bad-release");
    const { server, url } = await startBundleServer(zip, "geogebra-math-apps-bundle-1-0-0.zip");
    try {
      await assert.rejects(
        () => runUpdate({
          rootDir,
          url,
          version: "broken-release",
          sha256: "0000000000000000000000000000000000000000000000000000000000000000",
        }),
        /sha256 mismatch/,
      );
    } finally {
      await new Promise((resolve) => { server.close(resolve); });
    }

    const currentTarget = await fsp.realpath(currentDir);
    const expectedCurrentTarget = await fsp.realpath(path.join(releasesDir, "stable"));
    assert.equal(currentTarget, expectedCurrentTarget);
    assert.equal(await pathExists(path.join(releasesDir, "broken-release")), false);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("runUpdate fails fast when updater lock exists", async () => {
  const rootDir = makeTempRoot();
  const vendorDir = path.join(rootDir, "content", "library", "vendor", "geogebra");
  const lockFilePath = path.join(vendorDir, "update.lock");

  try {
    await fsp.mkdir(vendorDir, { recursive: true });
    await fsp.writeFile(lockFilePath, "busy\n", "utf8");

    await assert.rejects(
      () => runUpdate({ rootDir, version: "never-runs" }),
      /Update lock already exists/,
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
