function defaultParseId(value) {
  return value;
}

function createItemsTaskService({ queue, screenshotService, deps = {} }) {
  const parseId = deps.parseId || defaultParseId;

  function registerScreenshotHandler() {
    if (!queue || queue.hasHandler("screenshot")) return;
    queue.registerHandler("screenshot", async (payload) => {
      const id = parseId(payload?.id);
      return screenshotService.runScreenshotTask({ id });
    });
  }

  async function createScreenshotTask({ id }) {
    if (queue) {
      const task = queue.enqueueTask({
        type: "screenshot",
        payload: { id },
        maxAttempts: 2,
      });
      return { status: 202, body: { ok: true, task } };
    }

    const result = await screenshotService.runScreenshotTask({ id });
    return { status: 200, body: result };
  }

  function getTaskById({ taskId }) {
    if (!queue) {
      return { status: 404, body: { error: "not_found" } };
    }
    const parsedTaskId = parseId(taskId);
    const task = queue.getTask(parsedTaskId);
    if (!task) {
      return { status: 404, body: { error: "not_found" } };
    }
    return { status: 200, body: { task } };
  }

  function retryTaskById({ taskId }) {
    if (!queue) {
      return { status: 404, body: { error: "not_found" } };
    }
    const parsedTaskId = parseId(taskId);
    let task = null;
    try {
      task = queue.retryTask(parsedTaskId);
    } catch (err) {
      if (err?.message === "task_not_retryable") {
        return { status: 400, body: { error: "task_not_retryable" } };
      }
      throw err;
    }
    if (!task) {
      return { status: 404, body: { error: "not_found" } };
    }
    return { status: 200, body: { ok: true, task } };
  }

  return {
    registerScreenshotHandler,
    createScreenshotTask,
    getTaskById,
    retryTaskById,
  };
}

module.exports = {
  createItemsTaskService,
};
