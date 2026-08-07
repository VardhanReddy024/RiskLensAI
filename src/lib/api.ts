const API_URL = import.meta.env.VITE_API_URL || "";

export const apiFetch = (url: string, options?: RequestInit) => {
    return fetch(`${API_URL}${url}`, options);
};