const test = require("node:test");
const assert = require("node:assert/strict");

const { createLibraryService } = require("../server/services/library/libraryService");

function createMemoryStore() {
  const blobs = new Map();
  return {
    blobs,
    async readBuffer(key) {
      return blobs.has(key) ? Buffer.from(blobs.get(key)) : null;
    },
    async writeBuffer(key, buffer) {
      blobs.set(key, Buffer.from(buffer));
    },
    async deletePath(prefix, options = {}) {
      const normalized = String(prefix || "").replace(/^\/+/, "").replace(/\/+$/, "");
      if (!normalized) return;
      if (options.recursive) {
        for (const key of Array.from(blobs.keys())) {
          if (key === normalized || key.startsWith(`${normalized}/`)) blobs.delete(key);
        }
        return;
      }
      blobs.delete(normalized);
    },
  };
}

test("uploadFolderCover cleans previous cover file when extension changes", async () => {
  const store = createMemoryStore();
  const service = createLibraryService({ store });

  const folder = await service.createFolder({ name: "封面替换", categoryId: "other" });
  assert.equal(folder?.id?.startsWith("f_"), true);

  const first = await service.uploadFolderCover({
    folderId: folder.id,
    fileBuffer: Buffer.from("jpeg"),
    originalName: "cover.jpg",
    mimeType: "image/jpeg",
  });
  assert.equal(first?.ok, true);
  assert.match(String(first?.coverPath || ""), /\.jpg$/);

  const second = await service.uploadFolderCover({
    folderId: folder.id,
    fileBuffer: Buffer.from("png"),
    originalName: "cover.png",
    mimeType: "image/png",
  });
  assert.equal(second?.ok, true);
  assert.match(String(second?.coverPath || ""), /\.png$/);

  const coverKeys = Array.from(store.blobs.keys()).filter((key) => key.startsWith(`library/covers/${folder.id}`));
  assert.deepEqual(coverKeys, [`library/covers/${folder.id}.png`]);
});

test("uploadFolderCover never persists unsafe non-image extension from original filename", async () => {
  const store = createMemoryStore();
  const service = createLibraryService({ store });

  const folder = await service.createFolder({ name: "封面安全", categoryId: "other" });
  assert.equal(folder?.id?.startsWith("f_"), true);

  const result = await service.uploadFolderCover({
    folderId: folder.id,
    fileBuffer: Buffer.from("png"),
    originalName: "cover.html",
    mimeType: "image/png",
  });

  assert.equal(result?.ok, true);
  assert.match(String(result?.coverPath || ""), /\.png$/);
  assert.equal(String(result?.coverPath || "").endsWith(".html"), false);

  const coverKeys = Array.from(store.blobs.keys()).filter((key) => key.startsWith(`library/covers/${folder.id}`));
  assert.deepEqual(coverKeys, [`library/covers/${folder.id}.png`]);
});
