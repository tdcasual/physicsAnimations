const express = require("express");
const { z } = require("zod");

const bcrypt = require("bcryptjs");
const { issueToken, requireAuth, resolveAdminCredentials, verifyLogin } = require("../lib/auth");
const { saveAdminState } = require("../lib/adminState");
const { parseWithSchema } = require("../lib/validation");
const { asyncHandler } = require("../middleware/asyncHandler");
const { rateLimit } = require("../middleware/rateLimit");

function createAuthRouter({ authConfig, store }) {
  const router = express.Router();
  const authRequired = requireAuth({ authConfig });

  const loginSchema = z.object({
    username: z.string().min(1).max(128),
    password: z.string().min(1).max(256),
  });

  const accountSchema = z.object({
    currentPassword: z.string().min(1).max(256),
    newUsername: z.string().min(1).max(128).optional(),
    newPassword: z.string().min(1).max(256).optional(),
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
        store,
      });
      if (!ok) {
        res.status(401).json({ error: "invalid_credentials" });
        return;
      }

      const token = issueToken({ username: body.username, authConfig });
      res.json({ token });
    }),
  );

  router.post(
    "/auth/account",
    authRequired,
    rateLimit({ key: "account_update", windowMs: 10 * 60 * 1000, max: 20 }),
    asyncHandler(async (req, res) => {
      const body = parseWithSchema(accountSchema, req.body);
      const hasNewUsername = typeof body.newUsername === "string" && body.newUsername.trim();
      const hasNewPassword = typeof body.newPassword === "string" && body.newPassword;

      if (!hasNewUsername && !hasNewPassword) {
        res.status(400).json({ error: "no_changes" });
        return;
      }

      const current = await resolveAdminCredentials({ authConfig, store });
      const ok = await bcrypt.compare(body.currentPassword, current.passwordHash);
      if (!ok) {
        res.status(401).json({ error: "invalid_credentials" });
        return;
      }

      const nextUsername = hasNewUsername ? body.newUsername.trim() : current.username;
      if (!nextUsername) {
        res.status(400).json({ error: "invalid_username" });
        return;
      }

      const nextPasswordHash = hasNewPassword
        ? await bcrypt.hash(body.newPassword, 10)
        : current.passwordHash;

      await saveAdminState({
        store,
        state: {
          version: 1,
          username: nextUsername,
          passwordHash: nextPasswordHash,
          updatedAt: new Date().toISOString(),
        },
      });

      const token = issueToken({ username: nextUsername, authConfig });
      res.json({ token, username: nextUsername });
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
