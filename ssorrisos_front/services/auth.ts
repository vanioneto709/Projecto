import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000/api/";

export const authService = {
  // Login
  async login(username: string, password: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}auth/login/`, {
        username,
        password,
      });
      
      if (response.data.access) {
        localStorage.setItem("authToken", response.data.access);
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Registro
  async register(username: string, email: string, password: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}auth/register/`, {
        username,
        email,
        password,
      });
      
      if (response.data.access) {
        localStorage.setItem("authToken", response.data.access);
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Logout
  logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  },

  // Verificar se está logado
  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("authToken");
  },

  // Pegar token
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authToken");
  },

  // Pegar usuário
  getUser() {
    if (typeof window === "undefined") return null;
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },
};