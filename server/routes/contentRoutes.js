const express = require("express");

function createContentRouter({
  store,
  guessContentType,
  safeContentKey,
  safeAliasedContentKey,
  isHtmlContentKey,
  applyUploadHtmlHeaders,
}) {
  const router = express.Router();

  function fullPath(req) {
    return `${req.baseUrl}${req.path}`;
  }

  async function streamContent({ req, res, next, key, onBeforePipe }) {
    try {
      if (!key) {
        res.status(400).json({ error: "invalid_path" });
        return;
      }
      const stream = await store.createReadStream(key);
      if (!stream) {
        res.status(404).send("Not Found");
        return;
      }
      res.setHeader("Content-Type", guessContentType(key));
      if (typeof onBeforePipe === "function") onBeforePipe(key);
      stream.on("error", next);
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  router.get(/^\/isolated\/uploads\/.*/, async (req, res, next) => {
    const key = safeAliasedContentKey(fullPath(req), "/content/isolated/uploads/", "uploads");
    await streamContent({
      req,
      res,
      next,
      key,
      onBeforePipe(contentKey) {
        if (isHtmlContentKey(contentKey)) {
          applyUploadHtmlHeaders(res, { isolated: true });
        }
      },
    });
  });

  router.get(/^\/uploads\/.*/, async (req, res, next) => {
    const key = safeContentKey(fullPath(req), "uploads");
    await streamContent({
      req,
      res,
      next,
      key,
      onBeforePipe(contentKey) {
        if (isHtmlContentKey(contentKey)) {
          applyUploadHtmlHeaders(res);
        }
      },
    });
  });

  router.get(/^\/thumbnails\/.*/, async (req, res, next) => {
    const key = safeContentKey(fullPath(req), "thumbnails");
    await streamContent({ req, res, next, key });
  });

  router.get(/^\/library\/.*/, async (req, res, next) => {
    const key = safeContentKey(fullPath(req), "library");
    await streamContent({ req, res, next, key });
  });

  return router;
}

module.exports = {
  createContentRouter,
};
