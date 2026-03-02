import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api";

export const authService = {
  async login(username: string, password: string) {
    const response = await axios.post<any>(`${API_URL}/login/`, {
      username,
      password,
    });

    const token = response.data.access;

    // salva token em cookie (middleware precisa disso)
    document.cookie = `token=${token}; path=/`;

    return response.data;
  },

  logout() {
    document.cookie = "token=; Max-Age=0; path=/";
  },

  getToken() {
    const match = document.cookie.match(/token=([^;]+)/);
    return match ? match[1] : null;
  },

  isAuthenticated() {
    return !!this.getToken();
  },
};