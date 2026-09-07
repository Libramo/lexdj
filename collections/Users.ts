import type { CollectionConfig } from "payload";

// Minimal single-role admin auth for the editorial layer (LawCorrections).
// Unlike gouv-dj's Users collection, there's no per-ministry scoping concern
// here — every editor can correct any law — so this stays a plain
// auth-enabled collection with no role field. Extend with roles only if a
// real need for restricted editors shows up.
export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
  },
  access: {
    // Only existing admins create new accounts — no public self-registration.
    create: ({ req }) => !!req.user,
    read: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  fields: [],
};
