import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import app from "../src/app";

describe("proposal HTTP lifecycle", () => {
  beforeEach(() => {
    // The current backend has no persistent proposal store. These hooks are the
    // boundary where the test database fixture from dependency #26 belongs.
  });

  afterEach(() => {
    // Tear down the seeded database fixture here once dependency #26 lands.
  });

  it("lists proposals", async () => {
    const response = await request(app).get("/api/proposals");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("gets a proposal by ID", async () => {
    const response = await request(app).get("/api/proposals/proposal-1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "proposal-1" });
  });

  it("invalidates proposal cache through HTTP", async () => {
    const response = await request(app)
      .post("/api/proposals/invalidate")
      .send({ id: "proposal-1" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, invalidated: "proposal-1" });
  });

  it.todo("creates a proposal after the backend proposal store is implemented");
  it.todo("casts a vote after the backend voting endpoint is implemented");
});