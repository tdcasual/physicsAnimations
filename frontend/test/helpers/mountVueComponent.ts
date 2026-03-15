import { createApp, h, nextTick } from "vue";

export async function mountVueComponent(
  component: any,
  props: Record<string, unknown> = {},
  options: { plugins?: any[] } = {},
) {
  const host = document.createElement("div");
  document.body.appendChild(host);

  const app = createApp({
    render: () => h(component, props),
  });

  for (const plugin of options.plugins || []) {
    app.use(plugin);
  }

  app.mount(host);
  await nextTick();
  await nextTick();

  return {
    app,
    host,
    cleanup() {
      app.unmount();
      host.remove();
    },
  };
}
