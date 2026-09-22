const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const REQUEST_TIMEOUT_MS = 12_000;

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("ctms_jwt_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("The server did not respond in time. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (response.status === 401 && !endpoint.includes("/auth/login")) {
    if (typeof window !== "undefined") {
      // Clear expired credentials and redirect to /login
      localStorage.removeItem("ctms_jwt_token");
      localStorage.removeItem("ctms_user_session");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    throw new Error("Authentication required. Please sign in.");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "An unexpected error occurred" }));
    throw new Error(errorData.detail || `HTTP Error ${response.status}`);
  }

  return response.json();
}
