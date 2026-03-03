"use strict";

function toInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function toText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toBooleanStrict(value, fallback = false) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function toBooleanLoose(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const text = toText(value).trim().toLowerCase();
  if (!text) return fallback;
  if (text === "1" || text === "true" || text === "yes" || text === "on") return true;
  if (text === "0" || text === "false" || text === "no" || text === "off") return false;
  return fallback;
}

function parseBooleanLike(value, fallback = undefined) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;

  const raw = String(value).trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === "1" || raw === "true" || raw === "yes" || raw === "on") return true;
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") return false;
  return fallback;
}

module.exports = {
  toInt,
  toText,
  toBooleanStrict,
  toBooleanLoose,
  parseBooleanLike,
};
