import type { Role } from "@/lib/domain/constants";

export type Permission =
  | "quotes.delete"
  | "customers.delete"
  | "settings.manage"
  | "members.manage"
  | "owners.manage"
  | "data.export"
  | "organization.delete"
  | "audit.read"
  | "templates.manage"
  | "policy.manage"
  | "email.manage";

const MATRIX: Record<Permission, readonly Role[]> = {
  "quotes.delete": ["owner", "admin"],
  "customers.delete": ["owner", "admin"],
  "settings.manage": ["owner", "admin"],
  "members.manage": ["owner", "admin"],
  "owners.manage": ["owner"],
  "data.export": ["owner", "admin"],
  "organization.delete": ["owner"],
  "audit.read": ["owner", "admin"],
  "templates.manage": ["owner", "admin"],
  "policy.manage": ["owner", "admin"],
  "email.manage": ["owner", "admin"],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return !!role && MATRIX[permission].includes(role);
}
