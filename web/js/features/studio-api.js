export async function studioAPI(path = "/studio", options = {}) {
  const response = await fetch("/api" + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (response.headers?.get("content-type")?.includes("text/html")) {
    const error = new Error("La sesión ha caducado. Vuelve a iniciar sesión.");
    error.status = 401;
    throw error;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.error || "El estudio no está disponible. Vuelve a intentarlo.",
    );
    error.status = response.status;
    throw error;
  }
  return data;
}
