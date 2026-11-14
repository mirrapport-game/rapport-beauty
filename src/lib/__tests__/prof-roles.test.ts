import { describe, expect, it } from "vitest";
import { PROF_ROLES, ROLE_CATEGORIES, allowedCategories } from "@/lib/prof-roles";

/** Rubric ids that actually exist in the database (public.categories). */
const DB_CATEGORIES = [
  "admin_client", "admin_master", "client_admin", "client_master", "client_salon",
  "leader_master", "manager_admin", "master_admin", "master_client", "master_master",
  "owner_staff",
];

describe("salon roles", () => {
  it("offers roles from SMM specialist up to owner of a studio network", () => {
    expect(PROF_ROLES).toContain("SMM-специалист");
    expect(PROF_ROLES).toContain("Администратор");
    expect(PROF_ROLES).toContain("Владелец сети студий");
  });

  it("every rubric a role points to exists in the database", () => {
    for (const [role, cats] of Object.entries(ROLE_CATEGORIES)) {
      for (const c of cats) {
        expect(DB_CATEGORIES, `role ${role} -> ${c}`).toContain(c);
      }
    }
  });
});

describe("allowedCategories", () => {
  it("SMM specialist trains salon-wide situations, not master-client ones", () => {
    const s = allowedCategories("SMM-специалист", []);
    expect(s).not.toBeNull();
    expect(s!.has("client_salon")).toBe(true);
    expect(s!.has("master_client")).toBe(false);
  });

  it("administrator trains client and staff situations, not master-client ones", () => {
    const s = allowedCategories("Администратор", []);
    expect(s!.has("admin_client")).toBe(true);
    expect(s!.has("client_admin")).toBe(true);
    expect(s!.has("master_client")).toBe(false);
  });

  it("master trains master-client situations, not admin-client ones", () => {
    const s = allowedCategories("Мастер", []);
    expect(s!.has("master_client")).toBe(true);
    expect(s!.has("admin_client")).toBe(false);
  });

  it("owner of a studio network trains staff and management situations", () => {
    const s = allowedCategories("Владелец сети студий", []);
    expect(s!.has("owner_staff")).toBe(true);
    expect(s!.has("manager_admin")).toBe(true);
  });

  it("group scenarios stay open to every role", () => {
    expect(allowedCategories("Мастер", [])!.has("group")).toBe(true);
  });

  it("extra colleague roles widen the set", () => {
    const own = allowedCategories("Мастер", [])!;
    const withColleague = allowedCategories("Мастер", ["Администратор"])!;
    expect(own.has("admin_client")).toBe(false);
    expect(withColleague.has("admin_client")).toBe(true);
  });

  it("no chosen role or an unspecified one means no restriction", () => {
    expect(allowedCategories(null, [])).toBeNull();
    expect(allowedCategories("Другое", [])).toBeNull();
  });
});
