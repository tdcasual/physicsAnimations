const express = require("express");
const { z } = require("zod");

const { issueToken, requireAuth, verifyLogin } = require("../lib/auth");
const { parseWithSchema } = require("../lib/validation");
const { asyncHandler } = require("../middleware/asyncHandler");
const { rateLimit } = require("../middleware/rateLimit");

function createAuthRouter({ authConfig }) {
  const router = express.Router();
  const authRequired = requireAuth({ authConfig });

  const loginSchema = z.object({
    username: z.string().min(1).max(128),
    password: z.string().min(1).max(256),
  });

  router.post(
    "/auth/login",
    rateLimit({ key: "login", windowMs: 10 * 60 * 1000, max: 60 }),
    asyncHandler(async (req, res) => {
      const body = parseWithSchema(loginSchema, req.body);

      const ok = await verifyLogin({
        username: body.username,
        password: body.password,
        authConfig,
      });
      if (!ok) {
        res.status(401).json({ error: "invalid_credentials" });
        return;
      }

      const token = issueToken({ username: body.username, authConfig });
      res.json({ token });
    }),
  );

  router.get("/auth/me", authRequired, (req, res) => {
    res.json({ username: req.user.username, role: req.user.role });
  });

  return router;
}

module.exports = {
  createAuthRouter,
};

