const baseUrl = import.meta.env.VITE_API_BASE_URL as string;

async function parseError(res: Response): Promise<never> {
  let message = `Error ${res.status}`;

  try {
    const text = await res.text();

    if (text) {
      try {
        const json = JSON.parse(text);
        if (typeof json.message === "string") {
          message = json.message;
        } else if (Array.isArray(json.message)) {
          message = json.message.join(", ");
        } else {
          message = text;
        }
      } catch {
        message = text;
      }
    }
  } catch {
    // noop: usamos mensaje por defecto
  }

  throw new Error(message);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`);

  if (!res.ok) {
    await parseError(res);
  }

  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await parseError(res);
  }

  return (await res.json()) as T;
}
