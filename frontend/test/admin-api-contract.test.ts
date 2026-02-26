import { describe, expect, it } from "vitest";
import {
  parseAdminItemsResponse,
  toApiError,
} from "../src/features/admin/adminContracts";

describe("admin api contracts", () => {
  it("normalizes item list payload", () => {
    const out = parseAdminItemsResponse({
      page: "2",
      pageSize: "24",
      total: "3",
      items: [{ id: "a1" }],
    });

    expect(out.page).toBe(2);
    expect(out.pageSize).toBe(24);
    expect(out.total).toBe(3);
    expect(out.items).toHaveLength(1);
  });

  it("maps backend error payload to typed error", () => {
    const err = toApiError(400, { error: "invalid_input", details: { issues: [] } });

    expect(err.status).toBe(400);
    expect(err.code).toBe("invalid_input");
    expect(err.details).toEqual({ issues: [] });
  });
});

