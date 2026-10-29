import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import jwt, { JwtPayload } from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT ?? 4000);
const jwtSecret = process.env.JWT_ACCESS_SECRET ?? "";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be configured.");
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_ACCESS_SECRET must be configured with at least 32 characters.");
}

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:8081", "http://127.0.0.1:8081"];

app.use(helmet());
app.use(cors({ origin: corsOrigins.length ? corsOrigins : false }));
app.use(express.json({ limit: "1mb" }));
app.use("/api/v1/auth", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
}));
app.use("/api/v1", rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

type AuthRequest = Request & { userId?: string };

function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  try {
    const token = jwt.verify(authorization.slice(7), jwtSecret) as JwtPayload;
    if (typeof token.sub !== "string") throw new Error("Token subject is missing.");
    req.userId = token.sub;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired access token." });
  }
}

app.get("/api/v1/health", (_req, res) => {
  res.json({ data: { status: "ok", service: "vig-insta-api" } });
});

app.post("/api/v1/auth/register", async (req, res, next) => {
  try {
    const input = z.object({
      username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9._]+$/),
      email: z.string().trim().email().max(254),
      password: z.string().min(12).max(128),
      displayName: z.string().trim().min(1).max(80),
    }).parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        username: input.username.toLowerCase(),
        email: input.email.toLowerCase(),
        passwordHash,
        profile: { create: { displayName: input.displayName } },
      },
      select: { id: true, username: true, profile: true },
    });
    const token = jwt.sign({}, jwtSecret, { subject: user.id, expiresIn: "1d" });
    res.status(201).json({ data: { user, accessToken: token } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid registration details.", details: error.issues });
      return;
    }
    if (isUniqueConstraintError(error)) {
      res.status(409).json({ error: "That email or username is already in use." });
      return;
    }
    next(error);
  }
});

app.post("/api/v1/auth/login", async (req, res, next) => {
  try {
    const input = z.object({
      email: z.string().trim().email(),
      password: z.string().min(1).max(128),
    }).parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      select: { id: true, username: true, passwordHash: true, profile: true },
    });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      res.status(401).json({ error: "Email or password is incorrect." });
      return;
    }
    const token = jwt.sign({}, jwtSecret, { subject: user.id, expiresIn: "1d" });
    res.json({
      data: {
        user: { id: user.id, username: user.username, profile: user.profile },
        accessToken: token,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid login details.", details: error.issues });
      return;
    }
    next(error);
  }
});

app.get("/api/v1/auth/me", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, username: true, email: true, profile: true },
    });
    if (!user) {
      res.status(404).json({ error: "Account not found." });
      return;
    }
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/conversations", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { members: { some: { userId: req.userId! } } },
      orderBy: { createdAt: "desc" },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, profile: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, username: true } } },
        },
      },
    });
    res.json({
      data: conversations.map((conversation) => ({
        id: conversation.id,
        members: conversation.members.map((member) => member.user),
        lastMessage: conversation.messages[0] ?? null,
        updatedAt: conversation.messages[0]?.createdAt ?? conversation.createdAt,
      })).sort((first, second) =>
        new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime(),
      ),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/conversations", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { username } = z.object({
      username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9._]+$/),
    }).parse(req.body);
    const otherUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, username: true, profile: true },
    });
    if (!otherUser) {
      res.status(404).json({ error: "No account found with that username." });
      return;
    }
    if (otherUser.id === req.userId) {
      res.status(400).json({ error: "You cannot start a conversation with yourself." });
      return;
    }
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { members: { some: { userId: req.userId! } } },
          { members: { some: { userId: otherUser.id } } },
          { members: { every: { userId: { in: [req.userId!, otherUser.id] } } } },
        ],
      },
      include: {
        members: { include: { user: { select: { id: true, username: true, profile: true } } } },
      },
    });
    if (existing) {
      res.json({ data: { id: existing.id, members: existing.members.map((member) => member.user) } });
      return;
    }
    const conversation = await prisma.conversation.create({
      data: {
        members: {
          create: [{ userId: req.userId! }, { userId: otherUser.id }],
        },
      },
      include: {
        members: { include: { user: { select: { id: true, username: true, profile: true } } } },
      },
    });
    res.status(201).json({
      data: { id: conversation.id, members: conversation.members.map((member) => member.user) },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Enter a valid username.", details: error.issues });
      return;
    }
    next(error);
  }
});

app.get("/api/v1/conversations/:conversationId/messages", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const conversationId = z.string().uuid().parse(req.params.conversationId);
    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.userId! } },
    });
    if (!membership) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { sender: { select: { id: true, username: true } } },
    });
    res.json({ data: messages });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid conversation ID." });
      return;
    }
    next(error);
  }
});

app.post("/api/v1/conversations/:conversationId/messages", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const conversationId = z.string().uuid().parse(req.params.conversationId);
    const { body } = z.object({ body: z.string().trim().min(1).max(4000) }).parse(req.body);
    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.userId! } },
    });
    if (!membership) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }
    const message = await prisma.message.create({
      data: { conversationId, senderId: req.userId!, body },
      include: { sender: { select: { id: true, username: true } } },
    });
    res.status(201).json({ data: message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Message must contain 1 to 4000 characters.", details: error.issues });
      return;
    }
    next(error);
  }
});

app.get("/api/v1/posts", async (_req, res, next) => {
  try {
    const query = z.object({ mediaType: z.enum(["IMAGE", "VIDEO"]).optional() }).safeParse(_req.query);
    if (!query.success) {
      res.status(400).json({ error: "Unsupported media type filter.", details: query.error.issues });
      return;
    }
    const posts = await prisma.post.findMany({
      where: {
        published: true,
        ...(query.data.mediaType
          ? { media: { some: { type: query.data.mediaType } } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        author: { select: { id: true, username: true, profile: true } },
        media: { orderBy: { position: "asc" } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    res.json({ data: posts });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/posts", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const input = z.object({
      caption: z.string().trim().max(2200).default(""),
      media: z.array(z.object({
        url: z.string().url(),
        type: z.enum(["IMAGE", "VIDEO"]),
      })).min(1).max(10),
    }).parse(req.body);
    const post = await prisma.post.create({
      data: {
        authorId: req.userId!,
        caption: input.caption,
        published: true,
        media: {
          create: input.media.map((item, position) => ({
            url: item.url,
            type: item.type,
            position,
          })),
        },
      },
      include: {
        author: { select: { id: true, username: true, profile: true } },
        media: { orderBy: { position: "asc" } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    res.status(201).json({ data: post });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid post details.", details: error.issues });
      return;
    }
    next(error);
  }
});

app.post("/api/v1/posts/:postId/like", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const postId = z.string().uuid().parse(req.params.postId);
    const postExists = await prisma.post.count({ where: { id: postId, published: true } });
    if (!postExists) {
      res.status(404).json({ error: "Post not found." });
      return;
    }
    const result = await prisma.like.upsert({
      where: { userId_postId: { userId: req.userId!, postId } },
      create: { userId: req.userId!, postId },
      update: {},
    });
    res.status(200).json({ data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid post ID." });
      return;
    }
    next(error);
  }
});

app.post("/api/v1/posts/:postId/comments", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const postId = z.string().uuid().parse(req.params.postId);
    const { body } = z.object({ body: z.string().trim().min(1).max(2200) }).parse(req.body);
    const postExists = await prisma.post.count({ where: { id: postId, published: true } });
    if (!postExists) {
      res.status(404).json({ error: "Post not found." });
      return;
    }
    const comment = await prisma.comment.create({
      data: { postId, userId: req.userId!, body },
      include: { user: { select: { id: true, username: true, profile: true } } },
    });
    res.status(201).json({ data: comment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid comment details.", details: error.issues });
      return;
    }
    next(error);
  }
});

app.post("/api/v1/users/:userId/follow", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const followingId = z.string().uuid().parse(req.params.userId);
    if (followingId === req.userId) {
      res.status(400).json({ error: "You cannot follow your own account." });
      return;
    }
    const targetExists = await prisma.user.count({ where: { id: followingId } });
    if (!targetExists) {
      res.status(404).json({ error: "Account not found." });
      return;
    }
    const follow = await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: req.userId!, followingId } },
      create: { followerId: req.userId!, followingId },
      update: {},
    });
    res.status(200).json({ data: follow });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid account ID." });
      return;
    }
    next(error);
  }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("API request failed:", error);
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ error: "Malformed JSON request." });
    return;
  }
  res.status(500).json({ error: "An unexpected server error occurred." });
});

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: string }).code === "P2002";
}

const server = app.listen(port, () => {
  console.log(`Vig_Insta API listening on port ${port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
