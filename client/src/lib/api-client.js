const getBaseUrl = () => {
  const configured = import.meta.env.VITE_SERVER_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return "";
  return "http://localhost:8000";
};
export async function apiFetch(endpoint, options = {}) {
  const baseUrl = getBaseUrl();
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }
  return data;
}
