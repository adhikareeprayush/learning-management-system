import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { OrgRole, PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { DEFAULT_ORG_SLUG } from "../src/lib/default-org";

// Production bootstrap: one institute and one admin, no demo data.
// Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... [ADMIN_NAME=...] pnpm admin:create [--reset-password]

const MIN_PASSWORD_LENGTH = 12;
// better-auth rejects longer passwords at sign-in.
const MAX_PASSWORD_LENGTH = 128;
const DEFAULT_ORG_NAME = "Convolution LMS";

const USAGE =
  "Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='<12+ chars>' ADMIN_NAME='Your Name' pnpm admin:create [--reset-password]";

function fail(message: string): never {
  console.error(`admin:create: ${message}`);
  process.exit(1);
}

function readInput() {
  const resetPassword = process.argv.includes("--reset-password");
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_NAME?.trim() || "Administrator";

  if (!email) fail(`ADMIN_EMAIL is not set.\n${USAGE}`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(`ADMIN_EMAIL "${email}" is not a valid address.`);
  if (password && (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH)) {
    fail(`ADMIN_PASSWORD must be ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters.`);
  }
  if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set.");

  return { email, password, name, resetPassword };
}

async function main() {
  const input = readInput();

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 15_000,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    // Same lookup as getDefaultOrganization(): the slug, else the oldest institute.
    let org =
      (await prisma.organization.findUnique({ where: { slug: DEFAULT_ORG_SLUG } })) ??
      (await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }));
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: DEFAULT_ORG_NAME,
          slug: DEFAULT_ORG_SLUG,
          subdomain: DEFAULT_ORG_SLUG,
          status: "ACTIVE",
        },
      });
      console.log(`Created institute "${org.name}" (${org.slug}). Rename it under Admin → Settings.`);
    }
    const organizationId = org.id;

    const existing = await prisma.user.findUnique({ where: { email: input.email } });

    if (existing && !input.resetPassword) {
      const member = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: existing.id } },
      });
      console.log(
        `${input.email} already exists (role ${existing.role}, institute role ${member?.role ?? "none"}); left unchanged. ` +
          "Re-run with --reset-password to make it an admin with ADMIN_PASSWORD.",
      );
      return;
    }

    if (!input.password) {
      fail(`ADMIN_PASSWORD is required to ${existing ? "reset the password" : "create the admin"}.\n${USAGE}`);
    }
    const passwordHash = await hashPassword(input.password);

    await prisma.$transaction(async (tx) => {
      const user = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { role: Role.ADMIN, emailVerified: true, disabledAt: null, disabledReason: null },
          })
        : await tx.user.create({
            data: { email: input.email, name: input.name, role: Role.ADMIN, emailVerified: true },
          });

      await tx.account.upsert({
        where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
        update: { password: passwordHash },
        create: { userId: user.id, accountId: user.id, providerId: "credential", password: passwordHash },
      });

      await tx.organizationMember.upsert({
        where: { organizationId_userId: { organizationId, userId: user.id } },
        update: { role: OrgRole.ORG_ADMIN },
        create: { organizationId, userId: user.id, role: OrgRole.ORG_ADMIN },
      });

      // A reset should also end any session opened with the old password.
      if (existing) await tx.session.deleteMany({ where: { userId: user.id } });
    });

    console.log(
      existing
        ? `Reset ${input.email}: admin role, new password, suspension cleared, sessions signed out.`
        : `Created admin ${input.email} in "${org.name}". Sign in at /login.`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error("admin:create failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
