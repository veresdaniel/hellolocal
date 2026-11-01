/** True when Postgres/Prisma rejects a select or write because a column is absent. */
export function isMissingColumn(error: unknown, column?: string): boolean {
  const err = error as {
    code?: string;
    name?: string;
    message?: string;
    meta?: { column?: string; driverAdapterError?: { name?: string } };
  } | null;
  const message = typeof err?.message === "string" ? err.message : "";
  const missing =
    err?.code === "P2022" ||
    err?.meta?.driverAdapterError?.name === "ColumnNotFound" ||
    /column .* does not exist|does not exist in the current database/i.test(message) ||
    // Generated client can lag schema: select rejects before the DB round-trip.
    (err?.name === "PrismaClientValidationError" && /Unknown field/i.test(message));
  if (!missing) return false;
  if (!column) return true;
  const hay = `${err?.meta?.column ?? ""} ${message}`.toLowerCase();
  return hay.includes(column.toLowerCase());
}
