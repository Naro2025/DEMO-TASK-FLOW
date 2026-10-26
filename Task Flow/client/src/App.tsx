import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createTask, deleteTask, getTasks, updateTask } from "./api";
import type { Task, TaskFilter, TaskStatus } from "./types";

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "done", label: "Completadas" },
];

const EMPTY_STATES: Record<TaskFilter, { title: string; copy: string }> = {
  all: {
    title: "Tu lista empieza aquí",
    copy: "Agrega tu primera tarea y dale un poco de orden al día.",
  },
  pending: {
    title: "Todo al día",
    copy: "No tienes tareas pendientes. Buen momento para agregar la siguiente.",
  },
  done: {
    title: "Todavía nada completado",
    copy: "Marca una tarea como completada y aparecerá aquí.",
  },
};

const DATE_FORMATTER = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Ocurrió un error inesperado.";

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setTasks(await getTasks());
    } catch (loadError) {
      setError(toErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const counts = useMemo<Record<TaskFilter, number>>(
    () => ({
      all: tasks.length,
      pending: tasks.filter((task) => task.status === "pending").length,
      done: tasks.filter((task) => task.status === "done").length,
    }),
    [tasks],
  );

  const visibleTasks = useMemo(
    () =>
      filter === "all" ? tasks : tasks.filter((task) => task.status === filter),
    [filter, tasks],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();

    if (!cleanTitle || saving) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const task = await createTask(cleanTitle);
      setTasks((current) => [task, ...current]);
      setTitle("");
      setFilter("all");
    } catch (createError) {
      setError(toErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(task: Task) {
    if (busyId) {
      return;
    }

    const nextStatus: TaskStatus = task.status === "pending" ? "done" : "pending";
    setBusyId(task.id);
    setError(null);

    try {
      const updated = await updateTask(task.id, nextStatus);
      setTasks((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (toggleError) {
      setError(toErrorMessage(toggleError));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(task: Task) {
    if (busyId) {
      return;
    }

    setBusyId(task.id);
    setError(null);

    try {
      await deleteTask(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
    } catch (deleteError) {
      setError(toErrorMessage(deleteError));
    } finally {
      setBusyId(null);
    }
  }

  const isBusy = busyId !== null;

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">TF</span>
          <span>TaskFlow</span>
        </div>
        <span className="topbar-meta">React + Express</span>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">Simple por diseño</p>
          <h1>
            Menos ruido.
            <br />
            <em>Más hechas.</em>
          </h1>
          <p className="hero-copy">
            Un espacio enfocado para capturar, completar y cerrar tus tareas del día.
          </p>

          <div className="hero-stats" aria-label="Resumen de tareas">
            <div>
              <strong>{counts.all}</strong>
              <span>Total</span>
            </div>
            <div>
              <strong>{counts.pending}</strong>
              <span>Pendientes</span>
            </div>
            <div>
              <strong>{counts.done}</strong>
              <span>Completadas</span>
            </div>
          </div>
        </section>

        <section className="workspace" aria-label="Gestor de tareas">
          <form className="composer" onSubmit={handleSubmit}>
            <div className="composer-heading">
              <label htmlFor="task-title">Nueva tarea</label>
              <span>{title.length}/120</span>
            </div>
            <div className="composer-row">
              <input
                id="task-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ej. Preparar propuesta para el cliente"
                maxLength={120}
                autoComplete="off"
                disabled={saving}
              />
              <button
                type="submit"
                className="add-button"
                disabled={!title.trim() || saving}
              >
                {saving ? "Guardando..." : "Agregar tarea"}
              </button>
            </div>
          </form>

          <div className="toolbar">
            <div className="filters" role="group" aria-label="Filtrar tareas">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`filter${filter === item.value ? " is-active" : ""}`}
                  aria-pressed={filter === item.value}
                  onClick={() => setFilter(item.value)}
                >
                  <span>{item.label}</span>
                  <span className="filter-count">{counts[item.value]}</span>
                </button>
              ))}
            </div>
            <p className="visible-count">
              {visibleTasks.length} de {tasks.length}
            </p>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => void loadTasks()}>
                Reintentar
              </button>
            </div>
          )}

          {loading ? (
            <div className="skeleton-list" aria-busy="true" aria-label="Cargando tareas">
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
            </div>
          ) : visibleTasks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-mark" aria-hidden="true" />
              <h2>{EMPTY_STATES[filter].title}</h2>
              <p>{EMPTY_STATES[filter].copy}</p>
            </div>
          ) : (
            <ul className="task-list">
              {visibleTasks.map((task) => (
                <li
                  key={task.id}
                  className={`task-row${task.status === "done" ? " is-done" : ""}${
                    busyId === task.id ? " is-busy" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="task-check"
                    onClick={() => void handleToggle(task)}
                    disabled={isBusy}
                    aria-label={
                      task.status === "done"
                        ? `Marcar "${task.title}" como pendiente`
                        : `Marcar "${task.title}" como completada`
                    }
                    aria-pressed={task.status === "done"}
                  >
                    <span aria-hidden="true" />
                  </button>

                  <div className="task-copy">
                    <p className="task-title">{task.title}</p>
                    <time dateTime={task.createdAt}>
                      {DATE_FORMATTER.format(new Date(task.createdAt))}
                    </time>
                  </div>

                  <span className={`status-badge ${task.status}`}>
                    {task.status === "done" ? "Completada" : "Pendiente"}
                  </span>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => void handleDelete(task)}
                    disabled={isBusy}
                    aria-label={`Eliminar "${task.title}"`}
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="footer">
          <span>TaskFlow</span>
          <span>Datos persistidos en JSON local</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
