import { randomUUID } from "node:crypto";
import path from "node:path";
import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import { ensureData, readTasks, writeTasks } from "./store";
import type { Task, TaskStatus, TaskUpdate } from "./types";

try {
  process.loadEnvFile(path.resolve(__dirname, "../.env"));
} catch {
  // .env is optional; defaults keep the local setup zero-config.
}

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "*";
const MAX_TITLE_LENGTH = 120;

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "32kb" }));

const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    handler(req, res).catch(next);
  };

const getTitle = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const isTaskStatus = (value: unknown): value is TaskStatus =>
  value === "pending" || value === "done";

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get(
  "/api/tasks",
  asyncRoute(async (_req, res) => {
    res.json(await readTasks());
  }),
);

app.post(
  "/api/tasks",
  asyncRoute(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const title = getTitle(body.title);

    if (!title) {
      res.status(400).json({ error: "El título es obligatorio." });
      return;
    }

    if (title.length > MAX_TITLE_LENGTH) {
      res.status(400).json({ error: "El título supera los 120 caracteres." });
      return;
    }

    const task: Task = {
      id: randomUUID(),
      title,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const tasks = await readTasks();
    tasks.unshift(task);
    await writeTasks(tasks);
    res.status(201).json(task);
  }),
);

app.patch(
  "/api/tasks/:id",
  asyncRoute(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const hasTitle = Object.prototype.hasOwnProperty.call(body, "title");
    const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");

    if (!hasTitle && !hasStatus) {
      res.status(400).json({ error: "Envía title o status." });
      return;
    }

    const updates: TaskUpdate = {};

    if (hasTitle) {
      const title = getTitle(body.title);
      if (!title) {
        res.status(400).json({ error: "El título es obligatorio." });
        return;
      }
      if (title.length > MAX_TITLE_LENGTH) {
        res.status(400).json({ error: "El título supera los 120 caracteres." });
        return;
      }
      updates.title = title;
    }

    if (hasStatus) {
      if (!isTaskStatus(body.status)) {
        res.status(400).json({ error: "Estado inválido." });
        return;
      }
      updates.status = body.status;
    }

    const tasks = await readTasks();
    const index = tasks.findIndex((task) => task.id === req.params.id);

    if (index === -1) {
      res.status(404).json({ error: "Tarea no encontrada." });
      return;
    }

    const updated: Task = { ...tasks[index], ...updates };
    tasks[index] = updated;
    await writeTasks(tasks);
    res.json(updated);
  }),
);

app.delete(
  "/api/tasks/:id",
  asyncRoute(async (req, res) => {
    const tasks = await readTasks();
    const index = tasks.findIndex((task) => task.id === req.params.id);

    if (index === -1) {
      res.status(404).json({ error: "Tarea no encontrada." });
      return;
    }

    tasks.splice(index, 1);
    await writeTasks(tasks);
    res.status(204).end();
  }),
);

app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada." });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof SyntaxError) {
    res.status(400).json({ error: "JSON inválido." });
    return;
  }

  console.error(error);
  res.status(500).json({ error: "Error interno del servidor." });
});

async function start() {
  await ensureData();
  app.listen(PORT, () => {
    console.log(`TaskFlow API disponible en http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("No se pudo iniciar TaskFlow API.", error);
  process.exit(1);
});
