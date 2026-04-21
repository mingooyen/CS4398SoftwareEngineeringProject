import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("database schema", () => {
  it("includes core models and enums used by backend", () => {
    const schemaPath = resolve(process.cwd(), "../database/schema.prisma");
    const schema = readFileSync(schemaPath, "utf8");

    expect(schema).toContain("datasource db");
    expect(schema).toContain('provider = "mongodb"');
    expect(schema).toContain("model User");
    expect(schema).toContain("model Group");
    expect(schema).toContain("model Session");
    expect(schema).toContain("model Vote");
    expect(schema).toContain("enum UserSystemRole");
  });
});
