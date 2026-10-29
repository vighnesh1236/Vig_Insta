import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, MediaType } from "@prisma/client";

const prisma = new PrismaClient();

const demoPosts = [
  {
    caption: [
      "Max Verstappen at the 2017 Malaysian Grand Prix fan meeting.",
      "Photo: Morio · CC BY-SA 4.0",
      "Source: https://commons.wikimedia.org/wiki/File:Max_Verstappen_2017_Malaysia_1.jpg",
      "License: https://creativecommons.org/licenses/by-sa/4.0/",
    ].join("\n"),
    mediaUrl: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Max_Verstappen_2017_Malaysia_1.jpg",
    media: MediaType.IMAGE,
  },
  {
    caption: [
      "Max Verstappen during 2020 pre-season testing in Barcelona.",
      "Photo: Jen Ross · CC BY 2.0 · brightened by Democfest",
      "Source: https://commons.wikimedia.org/wiki/File:Max_Verstappen,_2020_pre-season_testing.jpg",
      "License: https://creativecommons.org/licenses/by/2.0/",
    ].join("\n"),
    mediaUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c0/Max_Verstappen%2C_2020_pre-season_testing.jpg",
    media: MediaType.IMAGE,
  },
  {
    caption: [
      "Max Verstappen at the 2017 United States Grand Prix.",
      "Photo: Steve (from Austin, TX, USA) · CC BY-SA 2.0",
      "Source: https://commons.wikimedia.org/wiki/File:Max_Verstappen_(37949014232).jpg",
      "License: https://creativecommons.org/licenses/by-sa/2.0/",
    ].join("\n"),
    mediaUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Max_Verstappen_%2837949014232%29.jpg",
    media: MediaType.IMAGE,
  },
  {
    caption: [
      "Max Verstappen at the Red Bull Fan Zone, Melbourne · 10 sec.",
      "Video: Yu Chu Chin (Pangalau) · CC BY-SA 4.0",
      "Source: https://commons.wikimedia.org/wiki/File:Max_Verstappen_at_the_Red_Bull_Fan_Zone_%E2%80%93_Crown_Riverwalk,_Melbourne_(028A7670).webm",
      "License: https://creativecommons.org/licenses/by-sa/4.0/",
    ].join("\n"),
    mediaUrl: "https://upload.wikimedia.org/wikipedia/commons/4/47/Max_Verstappen_at_the_Red_Bull_Fan_Zone_%E2%80%93_Crown_Riverwalk%2C_Melbourne_%28028A7670%29.webm",
    media: MediaType.VIDEO,
  },
  {
    caption: [
      "Max Verstappen at the Red Bull Fan Zone, Melbourne · 12 sec.",
      "Video: Yu Chu Chin (Pangalau) · CC BY-SA 4.0",
      "Source: https://commons.wikimedia.org/wiki/File:Max_Verstappen_at_the_Red_Bull_Fan_Zone_%E2%80%93_Crown_Riverwalk,_Melbourne_(028A7674).webm",
      "License: https://creativecommons.org/licenses/by-sa/4.0/",
    ].join("\n"),
    mediaUrl: "https://upload.wikimedia.org/wikipedia/commons/0/07/Max_Verstappen_at_the_Red_Bull_Fan_Zone_%E2%80%93_Crown_Riverwalk%2C_Melbourne_%28028A7674%29.webm",
    media: MediaType.VIDEO,
  },
];

async function seed() {
  const existing = await prisma.user.findUnique({ where: { username: "viginsta.f1" } });
  const user = existing ?? await prisma.user.create({
    data: {
      username: "viginsta.f1",
      email: "f1-demo@viginsta.example",
      passwordHash: await bcrypt.hash(randomBytes(48).toString("base64url"), 12),
      profile: { create: { displayName: "Vig_Insta F1 Picks", bio: "Community F1 highlights. Media credits are included with each post." } },
    },
  });

  for (const [position, post] of demoPosts.entries()) {
    const saved = await prisma.post.findFirst({
      where: { authorId: user.id, caption: post.caption },
      select: { id: true },
    });
    if (saved) continue;

    await prisma.post.create({
      data: {
        authorId: user.id,
        caption: post.caption,
        published: true,
        createdAt: new Date(Date.now() - position * 60_000),
        media: { create: [{ url: post.mediaUrl, type: post.media, position: 0 }] },
      },
    });
  }

  console.log(`Seeded ${demoPosts.length} licensed F1 demo posts for @${user.username}.`);
}

seed()
  .catch((error: unknown) => {
    console.error("Unable to seed demo media.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
