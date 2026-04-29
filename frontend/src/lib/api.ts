export type ApiCard = {
  id: number;
  column_id: number;
  title: string;
  details: string;
  position: number;
};

export type ApiColumn = {
  id: number;
  title: string;
  position: number;
  cards: ApiCard[];
};

export type ApiBoard = {
  id: number;
  title: string;
  columns: ApiColumn[];
};

function getToken(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem("auth_token") ?? "";
}

function jsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: jsonHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const api = {
  login(username: string, password: string): Promise<{ token: string }> {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  getBoard(): Promise<ApiBoard> {
    return request("/api/board");
  },

  renameColumn(columnId: number, title: string): Promise<ApiColumn> {
    return request(`/api/board/columns/${columnId}/rename`, {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  },

  createCard(columnId: number, title: string, details: string): Promise<ApiCard> {
    return request(`/api/board/columns/${columnId}/cards`, {
      method: "POST",
      body: JSON.stringify({ title, details }),
    });
  },

  deleteCard(cardId: number): Promise<void> {
    return request(`/api/board/cards/${cardId}`, { method: "DELETE" });
  },

  updateCard(cardId: number, title: string, details: string): Promise<ApiCard> {
    return request(`/api/board/cards/${cardId}`, {
      method: "PUT",
      body: JSON.stringify({ title, details }),
    });
  },

  moveCard(cardId: number, columnId: number, position: number): Promise<ApiCard> {
    return request(`/api/board/cards/${cardId}/move`, {
      method: "POST",
      body: JSON.stringify({ column_id: columnId, position }),
    });
  },
};
