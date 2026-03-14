import { describe, expect, it } from "vitest";
import * as catalogViewStateModule from "../src/features/catalog/useCatalogViewState";

describe("catalog view-state persistence helpers", () => {
  it("round-trips group, category, and query through persisted storage payloads", () => {
    const serialize = (catalogViewStateModule as any).serializeCatalogViewState;
    const parse = (catalogViewStateModule as any).parseCatalogViewState;

    expect(typeof serialize).toBe("function");
    expect(typeof parse).toBe("function");

    const raw = serialize({
      groupId: "physics",
      categoryId: "mechanics",
      query: "图像",
    });

    expect(parse(raw)).toEqual({
      groupId: "physics",
      categoryId: "mechanics",
      query: "图像",
    });
  });

  it("falls back safely when persisted payloads are malformed or incomplete", () => {
    const parse = (catalogViewStateModule as any).parseCatalogViewState;

    expect(typeof parse).toBe("function");
    expect(parse(null)).toBeNull();
    expect(parse("not-json")).toBeNull();
    expect(parse(JSON.stringify({ groupId: "physics" }))).toEqual({
      groupId: "physics",
      categoryId: "all",
      query: "",
    });
    expect(parse(JSON.stringify({ query: "only-query" }))).toBeNull();
  });
});
