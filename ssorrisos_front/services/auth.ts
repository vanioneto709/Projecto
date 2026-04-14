import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

type LoginResponse = {
  access: string;
  refresh: string;
};

export const authService = {
  async login(username: string, password: string) {
    const response = await axios.post<LoginResponse>(`${API_URL}/login/`, {
      username,
      password,
    });

    const { access, refresh } = response.data;

    localStorage.setItem("access", access);
    localStorage.setItem("refresh", refresh);
    document.cookie = `token=${access}; path=/; max-age=86400; SameSite=Lax`;

    return response.data;
  },

  logout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  },

  getToken() {
    return localStorage.getItem("access");
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  // NOVO: Pegar tipo do usuário do token
  getUserType(): string | null {
    const token = this.getToken();
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.tipo || 'paciente';
    } catch {
      return null;
    }
  },

  // NOVO: Verificar se é admin do sistema
  isAdminSistema(): boolean {
    return this.getUserType() === 'admin';
  },

  // NOVO: Verificar se é admin de clínica
  isAdminClinica(): boolean {
    return this.getUserType() === 'admin_clinica';
  },
};