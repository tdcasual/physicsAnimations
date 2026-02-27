const CLASSROOM_MODE_KEY = "pa_classroom_mode";

function setClassroomDataset(enabled: boolean) {
  const root = document.documentElement;
  if (enabled) {
    root.dataset.classroom = "on";
    return;
  }
  delete root.dataset.classroom;
}

export function applyStoredClassroomMode(): boolean {
  const saved = localStorage.getItem(CLASSROOM_MODE_KEY);
  const enabled = saved === "on";
  setClassroomDataset(enabled);
  return enabled;
}

export function toggleClassroomMode(): boolean {
  const enabled = document.documentElement.dataset.classroom === "on";
  const next = !enabled;
  setClassroomDataset(next);
  localStorage.setItem(CLASSROOM_MODE_KEY, next ? "on" : "off");
  return next;
}
