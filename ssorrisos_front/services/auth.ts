import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000/api/";

export const authService = {
  async login(username: string, password: string) {
    const response = await axios.post(`${API_BASE_URL}login/`, {
      username,
      password,
    });

    if (response.data.access) {
      localStorage.setItem("authToken",response.data.access);
    }

    return response.data;
  },

  async getUser() {
    const token = this.getToken();
    if (!token) return null;

    const response = await axios.get(`${API_BASE_URL}me/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  },

  logout() {
    localStorage.removeItem("authToken");
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("authToken");
  },

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authToken");
  },
};