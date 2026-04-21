import { describe, expect, it } from "vitest";
import { signAccess, signRefresh, verifyAccess, verifyRefresh } from "./jwt.js";

describe("jwt utils", () => {
  it("signs and verifies access tokens with role", () => {
    const token = signAccess("user-123", "USER");
    const payload = verifyAccess(token);

    expect(payload.sub).toBe("user-123");
    expect(payload.type).toBe("access");
    expect(payload.systemRole).toBe("USER");
  });

  it("rejects refresh token in access verifier", () => {
    const refresh = signRefresh("user-123", "rt-1");
    expect(() => verifyAccess(refresh)).toThrow("Invalid or expired token");
  });

  it("signs and verifies refresh tokens", () => {
    const token = signRefresh("user-456", "token-789");
    const payload = verifyRefresh(token);

    expect(payload.sub).toBe("user-456");
    expect(payload.type).toBe("refresh");
    expect(payload.tokenId).toBe("token-789");
  });
});
