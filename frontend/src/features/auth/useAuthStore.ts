import { defineStore } from "pinia";
import { clearToken, getToken, login, me } from "./authApi";

interface LoginInput {
  username: string;
  password: string;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    loggedIn: false,
    username: "",
    loading: false,
  }),

  actions: {
    async bootstrap() {
      const token = getToken();
      if (!token) {
        this.loggedIn = false;
        this.username = "";
        return;
      }

      try {
        const data = await me();
        this.loggedIn = true;
        this.username = typeof data?.username === "string" ? data.username : "";
      } catch {
        clearToken();
        this.loggedIn = false;
        this.username = "";
      }
    },

    async loginWithPassword(input: LoginInput) {
      this.loading = true;
      try {
        const data = await login(input);
        const account = await me().catch(() => null);
        this.loggedIn = true;
        this.username =
          typeof account?.username === "string"
            ? account.username
            : typeof data?.username === "string"
              ? data.username
              : "";
      } catch (err) {
        this.loggedIn = false;
        this.username = "";
        throw err;
      } finally {
        this.loading = false;
      }
    },

    logout() {
      clearToken();
      this.loggedIn = false;
      this.username = "";
    },
  },
});
