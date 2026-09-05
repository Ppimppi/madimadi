export function appUrl(): URL {
  const value = process.env.APP_URL;
  if (!value) throw new Error("APP_URL is required");
  return new URL(value);
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
