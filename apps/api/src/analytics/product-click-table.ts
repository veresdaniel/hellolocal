export function isMissingProductClickTable(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  return (
    err?.code === "P2021" ||
    (typeof err?.message === "string" &&
      err.message.includes("ProductClickDaily") &&
      err.message.includes("does not exist"))
  );
}
