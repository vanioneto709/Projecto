// ============================================================
// LOGIN PAGE — JSX redesenhado (dark moderno estilo Linear/Vercel)
//
// ✔ LÓGICA 100% PRESERVADA:
//   - Mesmas chamadas para /api/login/ e /api/me/
//   - Mesmo fluxo de tokens (localStorage + cookie)
//   - Mesma lógica de redirect por tipo de usuário
//   - Apenas a estrutura visual mudou
// ============================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Eye, EyeOff, LogIn, Sparkles, User, Lock,
  AlertCircle, Building2, ShieldCheck, Stethoscope, BarChart3
} from "lucide-react";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ─── LÓGICA INTOCADA ────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError("Usuário ou senha inválidos");
        return;
      }

      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      document.cookie = `token=${data.access}; path=/; max-age=86400; SameSite=Lax`;

      const userRes = await fetch("http://127.0.0.1:8000/api/me/", {
        headers: { Authorization: `Bearer ${data.access}` },
      });

      if (!userRes.ok) {
        setError("Erro ao buscar dados do usuário");
        setIsLoading(false);
        return;
      }

      const userData = await userRes.json();
      console.log("UserData:", userData);
      setIsLoading(false);

      if (userData.tipo === "admin") {
        router.push("/dashboard-admin");
      } else if (userData.tipo === "admin_clinica") {
        router.push("/dashboard-clinica");
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
  // ─── FIM LÓGICA ─────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {/* ═══ LADO ESQUERDO — HERO ═══ */}
      <aside className={styles.hero}>
        <div className={styles.heroLogo}>
          <div className={styles.heroLogoIcon}>
            <Building2 size={22} />
          </div>
          AdminClinic
        </div>

        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>
            <Sparkles size={14} /> Plataforma de Gestão Clínica
          </span>
          <h1 className={styles.heroTitle}>
            Gestão completa para sua rede de clínicas.
          </h1>
          <p className={styles.heroSubtitle}>
            Centralize médicos, pacientes, agendas e financeiro em um único
            painel. Tudo seguro, em tempo real.
          </p>

          <div className={styles.heroFeatures}>
            <div className={styles.heroFeature}>
              <div className={styles.heroFeatureIcon}><ShieldCheck size={18} /></div>
              <div className={styles.heroFeatureText}>
                <p>Acesso seguro</p>
                <span>JWT + permissões por tipo de usuário</span>
              </div>
            </div>
            <div className={styles.heroFeature}>
              <div className={styles.heroFeatureIcon}><Stethoscope size={18} /></div>
              <div className={styles.heroFeatureText}>
                <p>Multi-clínica</p>
                <span>Gerencie várias unidades em um só lugar</span>
              </div>
            </div>
            <div className={styles.heroFeature}>
              <div className={styles.heroFeatureIcon}><BarChart3 size={18} /></div>
              <div className={styles.heroFeatureText}>
                <p>Relatórios em tempo real</p>
                <span>KPIs financeiros e operacionais</span>
              </div>
            </div>
          </div>
        </div>

        <p className={styles.heroFooter}>
          © {new Date().getFullYear()} AdminClinic — Todos os direitos reservados
        </p>
      </aside>

      {/* ═══ LADO DIREITO — FORM ═══ */}
      <main className={styles.formSide}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={styles.formCard}
        >
          <div className={styles.formHeader}>
            <div className={styles.formIcon}>
              <LogIn size={26} />
            </div>
            <h2 className={styles.formTitle}>Bem-vindo de volta</h2>
            <p className={styles.formSubtitle}>
              Entre com suas credenciais para acessar o painel
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="username">Utilizador</label>
              <div className={styles.inputWrap}>
                <User className={styles.inputIcon} size={18} />
                <input
                  id="username"
                  type="text"
                  placeholder="seu.usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={styles.input}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="password">Senha</label>
              <div className={styles.inputWrap}>
                <Lock className={styles.inputIcon} size={18} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className={styles.errorMsg}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={styles.submitBtn}
            >
              {isLoading ? (
                <>
                  <span className={styles.spinner} />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Entrar
                </>
              )}
            </button>
          </form>

          <p className={styles.formFooter}>
            Não tem conta?
            <Link href="/cadastro">Criar conta</Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
