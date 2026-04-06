"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError("Usuário ou senha inválidos");
        setIsLoading(false);
        return;
      }

      // Guardar tokens
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      // Descobrir tipo de utilizador
      const userRes = await fetch("http://127.0.0.1:8000/api/me/", {
        headers: {
          Authorization: `Bearer ${data.access}`
        }
      });

      if (!userRes.ok) {
        setError("Erro ao buscar dados do usuário");
        setIsLoading(false);
        return;
      }

      const userData = await userRes.json();
      console.log("UserData:", userData);  // Verifica no console o que retorna!

      // 🔥 REDIRECIONAMENTO INTELIGENTE (VOLTEI A LÓGICA!)
      if (userData.tipo === "admin" || userData.tipo === "clinica") {
        router.push("/dashboard");
      } else if (userData.tipo === "medico") {
        router.push("/dashboard-medico");
      } else {
        router.push("/dashboard-paciente");
      }

    } catch (err) {
      console.error("Erro no login:", err);
      setError("Erro no servidor");
    }

    setIsLoading(false);
  };

  return (
    // ... resto do JSX continua igual ...
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden relative">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10 rounded-2xl p-8 md:p-10 backdrop-blur-xl border border-border/50"
        style={{ background: "hsl(220 35% 18% / 0.8)" }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-gold" />
            <span className="text-sm font-medium text-muted-foreground tracking-widest uppercase">
              Bem-vindo de volta
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white">Login</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="text"
            placeholder="Utilizador"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border/50 bg-gray-800 text-white"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border/50 bg-gray-800 text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-yellow-500 text-black font-semibold"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-400">
          Não tem conta?{" "}
          <Link href="/cadastro" className="text-yellow-400">
            Criar conta
          </Link>
        </p>
      </motion.div>
    </div>
  );
}