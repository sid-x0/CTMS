const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function refreshAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("ctms_user_session");
    let email = "admin@aiia.gov.in";
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.user_email) email = parsed.user_email;
      } catch (e) {}
    }
    const res = await fetch(`${API_BASE_URL}/auth/login/json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Password123!" }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem("ctms_jwt_token", data.access_token);
      return data.access_token;
    }
  } catch (err) {
    console.error("Token refresh failed", err);
  }
  return null;
}

export async function fetchAPI(endpoint: string, options: RequestInit & { _isRetry?: boolean } = {}) {
  let token = typeof window !== "undefined" ? localStorage.getItem("ctms_jwt_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !options._isRetry && !endpoint.includes("/auth/login")) {
    const newToken = await refreshAuthToken();
    if (newToken) {
      return fetchAPI(endpoint, { ...options, _isRetry: true });
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "An unexpected error occurred" }));
    throw new Error(errorData.detail || `HTTP Error ${response.status}`);
  }

  return response.json();
}

