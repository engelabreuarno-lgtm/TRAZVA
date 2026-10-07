export async function studioAPI(path = "/studio", options = {}) {
  const response = await fetch("/api" + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      data.error || "El estudio no está disponible. Vuelve a intentarlo.",
    );
  return data;
}
