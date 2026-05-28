const API_URL = process.env.NEXT_PUBLIC_RAILS_API_URL ?? ""

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers: extraHeaders, ...rest } = options
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  }

  const res = await fetch(`${API_URL}${path}`, { ...rest, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message =
      body.error ?? (body.errors as string[] | undefined)?.join(", ") ?? `HTTP ${res.status}`
    throw new ApiError(res.status, message)
  }

  return res.json() as Promise<T>
}

export const api = {
  auth: {
    line: (accessToken: string) =>
      request<{ token: string; dogs: { id: number; name: string }[] }>("/api/v1/auth/line", {
        method: "POST",
        body: JSON.stringify({ access_token: accessToken }),
      }),
  },
  groups: {
    create: (token: string, name: string) =>
      request<{ id: number; name: string; invite_token: string }>("/api/v1/groups", {
        method: "POST",
        token,
        body: JSON.stringify({ name }),
      }),
    join: (token: string, inviteToken: string) =>
      request<{ id: number; name: string }>("/api/v1/groups/join", {
        method: "POST",
        token,
        body: JSON.stringify({ invite_token: inviteToken }),
      }),
  },
  dogs: {
    create: (
      token: string,
      params: { group_id: number; name: string; birth_date: string }
    ) =>
      request<{ id: number; name: string }>("/api/v1/dogs", {
        method: "POST",
        token,
        body: JSON.stringify(params),
      }),
  },
  careRecords: {
    index: (token: string, dogId: number) =>
      request<{ id: number; care_type: string; recorded_at: string; user_name: string }[]>(
        `/api/v1/dogs/${dogId}/care_records`,
        { token }
      ),
  },
}
