import { describe, expect, it } from "vitest";
import { loginBodySchema, registerBodySchema } from "./auth-dtos.js";
import { createGroupBodySchema, createGroupInviteBodySchema } from "./group-dtos.js";

describe("DTO schemas", () => {
  it("accepts valid auth payloads", () => {
    const register = registerBodySchema.parse({
      email: "xavier@example.com",
      password: "password123",
      displayName: "Xavier",
    });
    const login = loginBodySchema.parse({
      email: "xavier@example.com",
      password: "password123",
    });

    expect(register.displayName).toBe("Xavier");
    expect(login.email).toBe("xavier@example.com");
  });

  it("rejects invalid group payloads", () => {
    const badGroup = createGroupBodySchema.safeParse({ name: "" });
    const badInvite = createGroupInviteBodySchema.safeParse({ inviteeUserId: "" });

    expect(badGroup.success).toBe(false);
    expect(badInvite.success).toBe(false);
  });
});
