import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api";

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

    return response.data;
  },

  logout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  },

  getToken() {
    return localStorage.getItem("access");
  },

  isAuthenticated() {
    return !!this.getToken();
  },
};