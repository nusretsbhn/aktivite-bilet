const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const PUBLIC_PATHS = ["/auth/login"];

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const token = isPublic ? null : localStorage.getItem("token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && !isPublic) {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("auth:logout"));
    }
    throw new ApiError(
      res.status,
      (data as { message?: string }).message ?? "İstek başarısız"
    );
  }

  return data as T;
}
