// Use relative path so requests go to the same origin (e.g., https://book.idnbogor.id)
// The Vite proxy will then forward these requests to the backend container
// OR use the environment variable if set (e.g. for local dev)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
