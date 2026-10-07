export function database(env) {
  if (!env.DB) throw new Error("D1 binding unavailable");
  return env.DB;
}
