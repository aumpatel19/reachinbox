import { PrismaClient, Prisma } from "@prisma/client";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

const ETHEREAL_AUTO_CREATE_SENDERS = Number(process.env.ETHEREAL_AUTO_CREATE_SENDERS ?? 2);

async function main() {
  const existing = await prisma.sender.count();
  if (existing > 0) {
    console.log(`Senders table already has ${existing} row(s), skipping seed.`);
    return;
  }

  // Senders reference the user that created them. At seed time no one has
  // logged in via Google yet, so a placeholder system user owns the seeded
  // senders; real senders created later via POST /api/senders/ethereal are
  // owned by the authenticated user.
  const systemUser = await prisma.user.upsert({
    where: { googleId: "seed-system" },
    update: {},
    create: {
      googleId: "seed-system",
      email: "system@reachinbox.local",
      name: "System",
    },
  });

  // Ethereal pools test accounts per source IP: repeated createTestAccount()
  // calls from the same machine can return the same account. That collides
  // with the unique(email) constraint here, so duplicates are skipped rather
  // than treated as a fatal error.
  let seeded = 0;
  for (let i = 0; i < ETHEREAL_AUTO_CREATE_SENDERS && seeded < ETHEREAL_AUTO_CREATE_SENDERS; i++) {
    const account = await nodemailer.createTestAccount();
    try {
      const sender = await prisma.sender.create({
        data: {
          name: `Sender ${seeded + 1}`,
          email: account.user,
          smtpHost: account.smtp.host,
          smtpPort: account.smtp.port,
          smtpUser: account.user,
          smtpPass: account.pass,
          createdById: systemUser.id,
        },
      });
      seeded += 1;
      console.log(`Seeded sender: ${sender.email} (user: ${account.user}, pass: ${account.pass})`);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        console.log(`Ethereal returned a duplicate account (${account.user}); skipping.`);
        continue;
      }
      throw err;
    }
  }
  if (seeded === 0) {
    console.log(
      "No senders seeded (Ethereal kept returning a pooled account). Create one later via POST /api/senders/ethereal.",
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
