"use client";

import React, { useState, useEffect } from "react";
import {
  Building2, Users, Calendar, Stethoscope, TrendingUp,
  DollarSign, Bell, Settings, LogOut, Plus, Search,
  Edit2, Trash2, CheckCircle, XCircle, AlertCircle, Download,
  FileText, Activity, Clock, MapPin, Phone, Mail,
  UserPlus, X, ChevronLeft, ChevronRight, Power, PowerOff,
  TriangleAlert, Filter, RefreshCw, BarChart3
} from "lucide-react";
import styles from "./dashboard.module.css";

// ─── Types ───────────────────────────────────────────────────
interface Clinica {
  id: number; nome: string; endereco: string; telefone: string; email: string;
  cnpj?: string; status: "ativa" | "inativa" | "suspensa"; dataCadastro: string;
  totalMedicos: number; totalPacientes: number; consultasMes: number;
  faturamentoMes: number; cor?: string;
}
interface Usuario {
  id: number; username: string; email?: string;
  tipo: "admin" | "medico" | "paciente" | "recepcionista";
  clinicaId?: number; clinicaNome?: string; status: "ativo" | "inativo";
  ultimoAcesso?: string; telefone?: string; especialidade?: string;
}
interface Consulta {
  id: number; paciente: string; pacienteId: number; medico: string; medicoId: number;
  clinica: string; clinicaId: number; data: string; hora: string;
  status: "agendada" | "confirmada" | "cancelada" | "concluida";
  motivo: string; valor?: number;
}
interface DashboardStats {
  totalClinicas: number; clinicasAtivas: number; totalMedicos: number;
  totalPacientes: number; consultasHoje: number; consultasMes: number;
  faturamentoMes: number; ticketMedio: number; crescimento: number;
}
interface Notificacao {
  id: number; tipo: "info" | "warning" | "error" | "success";
  titulo: string; mensagem: string; data: string; lida: boolean; link?: string;
}

// ─── Constants ──────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
type NavSection = "overview" | "clinicas" | "usuarios" | "agenda" | "financeiro" | "relatorios" | "configuracoes";
const CORES_CLINICA = ["#58A6FF", "#3FB950", "#D29922", "#F85149", "#A371F7", "#39D3F2", "#FF7B72", "#79C0FF"];
function authHeader(token: string) { return { Authorization: `Bearer ${token}` }; }

// ─── Component ──────────────────────────────────────────────
export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>("overview");
  const [user, setUser] = useState<any>(null);

  const [stats, setStats] = useState<DashboardStats>({
    totalClinicas: 0, clinicasAtivas: 0, totalMedicos: 0, totalPacientes: 0,
    consultasHoje: 0, consultasMes: 0, faturamentoMes: 0, ticketMedio: 0, crescimento: 0,
  });
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);

  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotificacoes, setShowNotificacoes] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [showClinicaModal, setShowClinicaModal] = useState(false);
  const [showClinicaEdit, setShowClinicaEdit] = useState<Clinica | null>(null);
  const [showUsuarioModal, setShowUsuarioModal] = useState(false);
  const [showUsuarioEdit, setShowUsuarioEdit] = useState<Usuario | null>(null);
  const [usuarioEditForm, setUsuarioEditForm] = useState({
  email: "", tipo: "medico" as string, telefone: "", especialidade: "", clinicaId: "", status: "ativo",
});
  const abrirEditarUsuario = (u: Usuario) => {
  setUsuarioEditForm({
    email: u.email || "",
    tipo: u.tipo,
    telefone: u.telefone || "",
    especialidade: u.especialidade || "",
    clinicaId: u.clinicaId ? String(u.clinicaId) : "",
    status: u.status,
  });
  setShowUsuarioEdit(u);
};
const salvarEditarUsuario = async () => {
  if (!token || !showUsuarioEdit) return;
  try {
    const res = await fetch(`${API_URL}/api/usuarios/${showUsuarioEdit.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader(token) },
      body: JSON.stringify({
        email: usuarioEditForm.email,
        tipo: usuarioEditForm.tipo,
        telefone: usuarioEditForm.telefone,
        especialidade: usuarioEditForm.especialidade,
        clinicaId: usuarioEditForm.clinicaId || null,
        status: usuarioEditForm.status,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    setShowUsuarioEdit(null);
    await fetchUsuarios();
    showToast("Usuário atualizado com sucesso!");
  } catch (err: any) { showToast(err.message, "err"); }
};
  const [clinicaForm, setClinicaForm] = useState({
    nome: "", endereco: "", telefone: "", email: "", cnpj: "",
  });
  const [usuarioForm, setUsuarioForm] = useState({
    username: "", email: "", password: "", tipo: "medico",
    clinicaId: "", telefone: "", especialidade: "",
  });

  const [filtroClinica, setFiltroClinica] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroConsultaStatus, setFiltroConsultaStatus] = useState("todas");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  // ─── Auth & Init ──────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem("access");
    if (!t) { window.location.href = "/login"; return; }
    setToken(t);
    fetch(`${API_URL}/api/me/`, { headers: authHeader(t) })
      .then(r => r.json()).then(setUser).catch(console.error);
  }, []);

  useEffect(() => {
    if (!token) return;
    carregarTodosDados();
    const interval = setInterval(carregarTodosDados, 60000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const carregarTodosDados = async () => {
    setLoading(true);
    try {
      await Promise.allSettled([
        fetchStats(), fetchClinicas(), fetchUsuarios(),
        fetchConsultas(), fetchNotificacoes(),
      ]);
    } finally { setLoading(false); }
  };

  // ─── API ──────────────────────────────────────────────────
  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/stats/`, { headers: authHeader(token) });
      if (res.ok) setStats(await res.json());
    } catch { /* silencioso */ }
  };

  const fetchClinicas = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/clinicas/`, { headers: authHeader(token) });
      if (!res.ok) { console.warn(`fetchClinicas: HTTP ${res.status}`); return; }
      const data = await res.json();
      const enriched: Clinica[] = (Array.isArray(data) ? data : []).map((c: any, i: number) => ({
        ...c,
        cor: c.cor || CORES_CLINICA[i % CORES_CLINICA.length],
        status: c.status || "ativa",
        totalMedicos: c.totalMedicos ?? 0,
        totalPacientes: c.totalPacientes ?? 0,
        consultasMes: c.consultasMes ?? 0,
        faturamentoMes: c.faturamentoMes ?? 0,
      }));
      setClinicas(enriched);
    } catch (err) { console.warn("fetchClinicas falhou:", err); }
  };

  const fetchUsuarios = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/usuarios/`, { headers: authHeader(token) });
      if (!res.ok) { console.warn(`fetchUsuarios: HTTP ${res.status}`); return; }
      const data = await res.json();
      const enriched: Usuario[] = (Array.isArray(data) ? data : []).map((u: any) => ({
        ...u,
        email: u.email ?? "",
        username: u.username ?? "(sem nome)",
        status: u.status || "ativo",
        ultimoAcesso: u.ultimoAcesso || "—",
        clinicaNome: clinicas.find(c => c.id === u.clinicaId)?.nome || u.clinicaNome || "—",
      }));
      setUsuarios(enriched);

      setStats(prev => ({
        ...prev,
        totalPacientes: enriched.filter(u => u.tipo === "paciente").length,
        totalMedicos: enriched.filter(u => u.tipo === "medico").length,
      }));
    } catch (err) { console.warn("fetchUsuarios falhou:", err); }
  };

  const fetchConsultas = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/consultas/`, { headers: authHeader(token) });
      if (!res.ok) { console.warn(`fetchConsultas: HTTP ${res.status}`); return; }
      const data = await res.json();
      setConsultas(Array.isArray(data) ? data : []);
    } catch (err) { console.warn("fetchConsultas falhou:", err); }
  };

  const fetchNotificacoes = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/notificacoes/`, { headers: authHeader(token) });
      if (res.ok) setNotificacoes(await res.json());
    } catch { /* silencioso */ }
  };

  // ─── CRUD Clínicas ────────────────────────────────────────
  const criarClinica = async () => {
    if (!token) return;
    if (!clinicaForm.nome.trim()) { showToast("Nome é obrigatório", "err"); return; }
    if (!clinicaForm.email.trim()) { showToast("Email é obrigatório", "err"); return; }
    if (!clinicaForm.telefone.trim()) { showToast("Telefone é obrigatório", "err"); return; }

    try {
      const payload = {
        nome: clinicaForm.nome.trim(),
        endereco: clinicaForm.endereco.trim(),
        telefone: clinicaForm.telefone.trim(),
        email: clinicaForm.email.trim(),
        cnpj: clinicaForm.cnpj.trim(),
        status: "ativa",
        dataCadastro: new Date().toISOString(),
      };
      const res = await fetch(`${API_URL}/api/clinicas/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = `HTTP ${res.status}`;
        try { msg = JSON.parse(text)?.error ?? msg; } catch { msg = text.slice(0, 120) || msg; }
        throw new Error(msg);
      }
      setShowClinicaModal(false);
      setClinicaForm({ nome: "", endereco: "", telefone: "", email: "", cnpj: "" });
      await fetchClinicas();
      await fetchStats();
      showToast("Clínica criada com sucesso!");
    } catch (err: any) { showToast(err.message, "err"); }
  };

  const atualizarClinica = async () => {
    if (!token || !showClinicaEdit) return;
    try {
      const res = await fetch(`${API_URL}/api/clinicas/${showClinicaEdit.id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify(showClinicaEdit),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setShowClinicaEdit(null);
      await fetchClinicas();
      showToast("Clínica atualizada!");
    } catch (err: any) { showToast(err.message, "err"); }
  };

  const toggleClinicaStatus = async (clinica: Clinica) => {
    if (!token) return;
    const novoStatus = clinica.status === "ativa" ? "inativa" : "ativa";
    try {
      const res = await fetch(`${API_URL}/api/clinicas/${clinica.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchClinicas();
    } catch (err: any) { showToast(err.message, "err"); }
  };

  // ─── CRUD Usuários ────────────────────────────────────────
  const criarUsuario = async () => {
    if (!token) return;
    if (!usuarioForm.username.trim()) { showToast("Username obrigatório", "err"); return; }
    if (!usuarioForm.password.trim()) { showToast("Senha obrigatória", "err"); return; }
    if (!usuarioForm.clinicaId) { showToast("Selecione uma clínica", "err"); return; }
    try {
      const res = await fetch(`${API_URL}/api/cadastro/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify({
          username: usuarioForm.username.trim(),
          email: usuarioForm.email.trim(),
          password: usuarioForm.password,
          tipo: usuarioForm.tipo,
          clinicaId: usuarioForm.clinicaId,
          telefone: usuarioForm.telefone.trim(),
          especialidade: usuarioForm.especialidade.trim(),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = `HTTP ${res.status}`;
        try { msg = JSON.parse(text)?.error ?? msg; } catch { msg = text.slice(0, 120) || msg; }
        throw new Error(msg);
      }
      setShowUsuarioModal(false);
      setUsuarioForm({ username: "", email: "", password: "", tipo: "medico", clinicaId: "", telefone: "", especialidade: "" });
      await fetchUsuarios();
      showToast("Usuário criado com sucesso!");
    } catch (err: any) { showToast(err.message, "err"); }
  };

  const deletarUsuario = async (id: number) => {
    if (!token) return;
    if (!window.confirm("Remover este usuário?")) return;
    try {
      await fetch(`${API_URL}/api/usuarios/${id}/`, {
        method: "DELETE", headers: authHeader(token),
      });
      await fetchUsuarios();
      showToast("Usuário removido");
    } catch (err: any) { showToast(err.message, "err"); }
  };

  // ─── Util ─────────────────────────────────────────────────
  const logout = () => {
    localStorage.clear();
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/login";
  };

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);

  const formatarData = (data: string) => {
    try { return new Date(data).toLocaleDateString("pt-BR"); } catch { return data; }
  };

  const notificacoesNaoLidas = notificacoes.filter(n => !n.lida).length;

  const clinicasFiltradas = clinicas.filter(c =>
    (c.nome ?? "").toLowerCase().includes(filtroClinica.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(filtroClinica.toLowerCase())
  );

  const usuariosFiltrados = usuarios.filter(u =>
    (u.username ?? "").toLowerCase().includes(filtroUsuario.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(filtroUsuario.toLowerCase()) ||
    (u.clinicaNome ?? "").toLowerCase().includes(filtroUsuario.toLowerCase())
  );

  const consultasFiltradas = consultas.filter(c => {
    if (filtroConsultaStatus !== "todas" && c.status !== filtroConsultaStatus) return false;
    if (filtroDataInicio && new Date(c.data) < new Date(filtroDataInicio)) return false;
    if (filtroDataFim && new Date(c.data) > new Date(filtroDataFim)) return false;
    return true;
  });

  const totalPaginas = Math.ceil(consultasFiltradas.length / itensPorPagina);
  const consultasPaginadas = consultasFiltradas.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  useEffect(() => {
    if (clinicas.length > 0) {
      setStats(prev => ({
        ...prev,
        totalClinicas: clinicas.length,
        clinicasAtivas: clinicas.filter(c => c.status === "ativa").length,
      }));
    }
  }, [clinicas]);

  useEffect(() => {
    if (consultas.length > 0) {
      const hoje = new Date().toISOString().split("T")[0];
      setStats(prev => ({
        ...prev,
        consultasMes: consultas.length,
        consultasHoje: consultas.filter(c => c.data?.startsWith(hoje)).length,
      }));
    }
  }, [consultas]);

  // ─── Loading state ────────────────────────────────────────
  if (!token) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner} />
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  const sectionTitles: Record<NavSection, string> = {
    overview: "Visão Geral",
    clinicas: "Gestão de Clínicas",
    usuarios: "Gestão de Usuários",
    agenda: "Agenda Geral",
    financeiro: "Financeiro",
    relatorios: "Relatórios",
    configuracoes: "Configurações",
  };

  const navMain: [NavSection, any, string, number | null][] = [
    ["overview", TrendingUp, "Visão Geral", null],
    ["clinicas", Building2, "Clínicas", clinicas.length],
    ["usuarios", Users, "Usuários", usuarios.length],
    ["agenda", Calendar, "Agenda Geral", consultas.filter(c => c.status === "agendada").length],
  ];

  const navManage: [NavSection, any, string][] = [
    ["financeiro", DollarSign, "Financeiro"],
    ["relatorios", FileText, "Relatórios"],
    ["configuracoes", Settings, "Configurações"],
  ];

  return (
    <div className={styles.shell}>
      {/* ── Toast ── */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "ok" ? styles.toastOk : styles.toastErr}`}>
          {toast.type === "ok" ? <CheckCircle size={16} /> : <TriangleAlert size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ─── SIDEBAR ─── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}><Building2 size={20} /></div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>AdminClinic</span>
              <span className={styles.brandSub}>Gestão de Clínicas</span>
            </div>
          </div>
        </div>

        <nav>
          <div className={styles.navSection}>
            <p className={styles.navTitle}>Principal</p>
            {navMain.map(([id, Icon, label, count]) => (
              <button
                key={id}
                className={`${styles.navItem} ${activeSection === id ? styles.navItemActive : ""}`}
                onClick={() => setActiveSection(id)}
              >
                <Icon size={17} />
                <span className={styles.navLabel}>{label}</span>
                {count !== null && count > 0 && <span className={styles.navBadge}>{count}</span>}
              </button>
            ))}
          </div>

          <div className={styles.navSection}>
            <p className={styles.navTitle}>Gestão</p>
            {navManage.map(([id, Icon, label]) => (
              <button
                key={id}
                className={`${styles.navItem} ${activeSection === id ? styles.navItemActive : ""}`}
                onClick={() => setActiveSection(id)}
              >
                <Icon size={17} />
                <span className={styles.navLabel}>{label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className={styles.userBox}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>{user?.username?.[0]?.toUpperCase() || "A"}</div>
            <div className={styles.userMeta}>
              <p className={styles.userName}>{user?.username || "Admin"}</p>
              <p className={styles.userRole}>Administrador</p>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={logout}>
            <LogOut size={15} /> Sair
          </button>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <h1>{sectionTitles[activeSection]}</h1>
            <p className={styles.breadcrumb}>AdminClinic / {activeSection}</p>
          </div>

          <div className={styles.topbarRight}>
            <span className={styles.timeChip}>{currentTime.toLocaleTimeString("pt-BR")}</span>

            <button className={styles.iconBtn} onClick={() => setShowNotificacoes(!showNotificacoes)}>
              <Bell size={17} />
              {notificacoesNaoLidas > 0 && <span className={styles.notifDot}>{notificacoesNaoLidas}</span>}
            </button>

            {showNotificacoes && (
              <div className={styles.notifPanel}>
                <div className={styles.notifHeader}>
                  <h3>Notificações</h3>
                  <button>Marcar todas lidas</button>
                </div>
                <div className={styles.notifList}>
                  {notificacoes.length === 0 ? (
                    <p className={styles.notifEmpty}>Sem notificações</p>
                  ) : notificacoes.map(n => (
                    <div key={n.id} className={styles.notifItem}>
                      <div className={styles.notifIcon}>
                        {n.tipo === "error" ? <XCircle size={16} color="#ff7b72" /> :
                         n.tipo === "warning" ? <AlertCircle size={16} color="#d29922" /> :
                         n.tipo === "success" ? <CheckCircle size={16} color="#3fb950" /> :
                         <Bell size={16} color="#58a6ff" />}
                      </div>
                      <div className={styles.notifBody}>
                        <h4>{n.titulo}</h4>
                        <p>{n.mensagem}</p>
                        <span className={styles.notifTime}>{n.data}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className={styles.iconBtn} onClick={carregarTodosDados} title="Recarregar">
              <RefreshCw size={17} />
            </button>
          </div>
        </header>

        <main className={styles.content}>
          {/* ════════════════ OVERVIEW ════════════════ */}
          {activeSection === "overview" && (
            <>
              <div className={styles.kpiGrid}>
                {[
                  { label: "Clínicas Cadastradas", value: stats.totalClinicas, sub: `${stats.clinicasAtivas} ativas`, icon: Building2, color: "#58A6FF" },
                  { label: "Médicos no Sistema", value: stats.totalMedicos, sub: `Em ${stats.totalClinicas} clínicas`, icon: Stethoscope, color: "#3FB950" },
                  { label: "Pacientes", value: stats.totalPacientes, sub: "+12% este mês", icon: Users, color: "#A371F7" },
                  { label: "Consultas Hoje", value: stats.consultasHoje, sub: `${stats.consultasMes} este mês`, icon: Calendar, color: "#D29922" },
                  { label: "Faturamento Mensal", value: formatarMoeda(stats.faturamentoMes), sub: `${stats.crescimento >= 0 ? "+" : ""}${stats.crescimento}% vs mês passado`, icon: DollarSign, color: "#39D3F2", highlight: true },
                ].map((k, i) => {
                  const Icon = k.icon;
                  return (
                    <div key={i} className={`${styles.kpi} ${k.highlight ? styles.kpiHighlight : ""}`}>
                      <div className={styles.kpiIcon} style={{ background: `${k.color}20`, color: k.color }}>
                        <Icon size={18} />
                      </div>
                      <div className={styles.kpiValue}>{k.value}</div>
                      <p className={styles.kpiLabel}>{k.label}</p>
                      <span className={styles.kpiSub}>{k.sub}</span>
                    </div>
                  );
                })}
              </div>

              <div className={styles.panelGrid}>
                <div className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <h3 className={styles.panelTitle}>Consultas por Clínica (Mês)</h3>
                    <select className={styles.selectMini}>
                      <option>Últimos 30 dias</option>
                      <option>Últimos 7 dias</option>
                    </select>
                  </div>
                  <div className={styles.bars}>
                    {clinicas.length === 0 ? (
                      <p className={styles.empty}>Nenhuma clínica carregada ainda</p>
                    ) : clinicas.slice(0, 5).map(c => {
                      const max = Math.max(...clinicas.map(x => x.consultasMes), 1);
                      return (
                        <div key={c.id} className={styles.bar}>
                          <div className={styles.barLabel}>
                            <span className={styles.barDot} style={{ background: c.cor }} />
                            <span>{c.nome}</span>
                          </div>
                          <div className={styles.barTrack}>
                            <div className={styles.barFill} style={{ width: `${(c.consultasMes / max) * 100}%`, background: c.cor }} />
                          </div>
                          <span className={styles.barValue}>{c.consultasMes}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <h3 className={styles.panelTitle}>Últimas Atividades</h3>
                    <button className={styles.linkBtn} onClick={() => setActiveSection("agenda")}>Ver todas</button>
                  </div>
                  <div className={styles.activityList}>
                    {consultas.length === 0 ? (
                      <p className={styles.empty}>Nenhuma consulta carregada</p>
                    ) : consultas.slice(0, 5).map(c => (
                      <div key={c.id} className={styles.activityItem}>
                        <span className={styles.activityDot} />
                        <div className={styles.activityBody}>
                          <p><strong>{c.paciente}</strong> agendou com {c.medico}</p>
                          <small>{c.clinica} • {formatarData(c.data)} às {c.hora}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h3 className={styles.panelTitle}>Ações Rápidas</h3>
                </div>
                <div className={styles.quickActions}>
                  <button className={styles.quickBtn} onClick={() => { setActiveSection("clinicas"); setShowClinicaModal(true); }}>
                    <Plus size={16} /> Nova Clínica
                  </button>
                  <button className={styles.quickBtn} onClick={() => { setActiveSection("usuarios"); setShowUsuarioModal(true); }}>
                    <UserPlus size={16} /> Novo Usuário
                  </button>
                  <button className={styles.quickBtn} onClick={() => setActiveSection("agenda")}>
                    <Calendar size={16} /> Ver Agenda
                  </button>
                  <button className={styles.quickBtn} onClick={() => setActiveSection("relatorios")}>
                    <Download size={16} /> Exportar Dados
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ════════════════ CLÍNICAS ════════════════ */}
          {activeSection === "clinicas" && (
            <>
              <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                  <div className={styles.search}>
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="Buscar clínica por nome ou email..."
                      value={filtroClinica}
                      onChange={e => setFiltroClinica(e.target.value)}
                    />
                  </div>
                </div>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowClinicaModal(true)}>
                  <Plus size={16} /> Nova Clínica
                </button>
              </div>

              {clinicasFiltradas.length === 0 ? (
                <div className={styles.emptyState}>
                  <Building2 size={42} />
                  <p>{filtroClinica ? "Nenhuma clínica encontrada" : "Nenhuma clínica cadastrada ainda"}</p>
                  {!filtroClinica && (
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowClinicaModal(true)}>
                      <Plus size={16} /> Cadastrar primeira clínica
                    </button>
                  )}
                </div>
              ) : (
                <div className={styles.clinicaGrid}>
                  {clinicasFiltradas.map(clinica => (
                    <div key={clinica.id} className={styles.clinicaCard}>
                      <div className={styles.clinicaHeader}>
                        <div className={styles.clinicaIdentity}>
                          <div className={styles.clinicaAvatar} style={{ background: clinica.cor }}>
                            {(clinica.nome[0] ?? "?").toUpperCase()}
                          </div>
                          <div className={styles.clinicaTitle}>
                            <h3 className={styles.clinicaName}>{clinica.nome}</h3>
                            <span className={`${styles.statusBadge} ${
                              clinica.status === "ativa" ? styles.statusAtiva :
                              clinica.status === "inativa" ? styles.statusInativa :
                              styles.statusSuspensa
                            }`}>
                              {clinica.status === "ativa" ? "Ativa" : clinica.status === "inativa" ? "Inativa" : "Suspensa"}
                            </span>
                          </div>
                        </div>
                        <div className={styles.clinicaActions}>
                          <button className={styles.iconAction} onClick={() => setShowClinicaEdit(clinica)} title="Editar">
                            <Edit2 size={14} />
                          </button>
                          <button
                            className={`${styles.iconAction} ${clinica.status === "ativa" ? styles.danger : styles.success}`}
                            onClick={() => toggleClinicaStatus(clinica)}
                            title={clinica.status === "ativa" ? "Desativar" : "Ativar"}
                          >
                            {clinica.status === "ativa" ? <PowerOff size={14} /> : <Power size={14} />}
                          </button>
                        </div>
                      </div>

                      <div className={styles.clinicaInfo}>
                        <p><MapPin size={13} /> {clinica.endereco || "—"}</p>
                        <p><Phone size={13} /> {clinica.telefone || "—"}</p>
                        <p><Mail size={13} /> {clinica.email || "—"}</p>
                      </div>

                      <div className={styles.clinicaStats}>
                        {[
                          { icon: Stethoscope, val: clinica.totalMedicos, lbl: "Médicos" },
                          { icon: Users, val: clinica.totalPacientes, lbl: "Pacientes" },
                          { icon: Calendar, val: clinica.consultasMes, lbl: "Consultas" },
                        ].map((s, idx) => {
                          const Icon = s.icon;
                          return (
                            <div key={idx} className={styles.clinicaStat}>
                              <Icon size={14} />
                              <div className={styles.clinicaStatVal}>{s.val}</div>
                              <div className={styles.clinicaStatLbl}>{s.lbl}</div>
                            </div>
                          );
                        })}
                        <div className={styles.clinicaRevenue}>
                          <div className={styles.clinicaRevenueVal}>{formatarMoeda(clinica.faturamentoMes)}</div>
                          <div className={styles.clinicaRevenueLbl}>Faturamento</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ════════════════ USUÁRIOS ════════════════ */}
          {activeSection === "usuarios" && (
            <>
              <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                  <div className={styles.search}>
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="Buscar usuário, email ou clínica..."
                      value={filtroUsuario}
                      onChange={e => setFiltroUsuario(e.target.value)}
                    />
                  </div>
                </div>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowUsuarioModal(true)}>
                  <UserPlus size={16} /> Novo Usuário
                </button>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>Tipo</th>
                      <th>Clínica</th>
                      <th>Contato</th>
                      <th>Último acesso</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className={styles.tableEmpty}>
                          {loading ? "Carregando..." : filtroUsuario ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                        </td>
                      </tr>
                    ) : usuariosFiltrados.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div className={styles.userCell}>
                            <div className={styles.userMini}>{(u.username?.[0] ?? "?").toUpperCase()}</div>
                            <div>
                              <strong>{u.username}</strong>
                              <small>{u.email || "—"}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.tag} ${
                            u.tipo === "admin" ? styles.tagAdmin :
                            u.tipo === "medico" ? styles.tagMedico :
                            u.tipo === "recepcionista" ? styles.tagRecep :
                            styles.tagPaciente
                          }`}>
                            {u.tipo === "admin" ? "Admin" : u.tipo === "medico" ? "Médico" : u.tipo === "recepcionista" ? "Recepção" : "Paciente"}
                          </span>
                        </td>
                        <td>{u.clinicaNome || "—"}</td>
                        <td>{u.telefone || "—"}</td>
                        <td>{u.ultimoAcesso}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${u.status === "ativo" ? styles.statusAtiva : styles.statusInativa}`}>
                            {u.status === "ativo" ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionsCell}>
                            <button className={styles.btnIcon} onClick={() => abrirEditarUsuario(u)}>
                              <Edit2 size={14} />
                              </button>
                            <button className={`${styles.iconAction} ${styles.danger}`} onClick={() => deletarUsuario(u.id)} title="Remover">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ════════════════ AGENDA ════════════════ */}
          {activeSection === "agenda" && (
            <>
              <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                  <select className={styles.filterSelect} value={filtroConsultaStatus} onChange={e => setFiltroConsultaStatus(e.target.value)}>
                    <option value="todas">Todas</option>
                    <option value="agendada">Agendadas</option>
                    <option value="confirmada">Confirmadas</option>
                    <option value="concluida">Concluídas</option>
                    <option value="cancelada">Canceladas</option>
                  </select>
                  <input type="date" className={styles.filterDate} value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} />
                  <input type="date" className={styles.filterDate} value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} />
                  <button className={styles.btn} onClick={() => { setFiltroConsultaStatus("todas"); setFiltroDataInicio(""); setFiltroDataFim(""); }}>
                    <Filter size={14} /> Limpar
                  </button>
                </div>
                <button className={styles.btn}>
                  <Download size={14} /> Exportar
                </button>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Data / Hora</th>
                      <th>Paciente</th>
                      <th>Médico</th>
                      <th>Clínica</th>
                      <th>Motivo</th>
                      <th>Valor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultasPaginadas.length === 0 ? (
                      <tr>
                        <td colSpan={7} className={styles.tableEmpty}>
                          {loading ? "Carregando..." : "Nenhuma consulta encontrada"}
                        </td>
                      </tr>
                    ) : consultasPaginadas.map(c => {
                      const cor = clinicas.find(cl => cl.id === c.clinicaId)?.cor ?? "#58A6FF";
                      return (
                        <tr key={c.id}>
                          <td>
                            <strong>{formatarData(c.data)}</strong>
                            <br /><small style={{ color: "#6b7484" }}>{c.hora}</small>
                          </td>
                          <td>{c.paciente}</td>
                          <td>{c.medico}</td>
                          <td>
                            <span className={styles.clinicTag} style={{ background: cor + "20", color: cor }}>
                              {c.clinica}
                            </span>
                          </td>
                          <td>{c.motivo || "—"}</td>
                          <td>{c.valor ? formatarMoeda(c.valor) : "—"}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${
                              c.status === "agendada" ? styles.statusSuspensa :
                              c.status === "confirmada" ? styles.statusAtiva :
                              c.status === "concluida" ? styles.statusInativa :
                              styles.statusInativa
                            }`}>
                              {c.status === "agendada" ? "Agendada" : c.status === "confirmada" ? "Confirmada" : c.status === "concluida" ? "Concluída" : "Cancelada"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {totalPaginas > 1 && (
                  <div className={styles.pagination}>
                    <button className={styles.pagBtn} disabled={paginaAtual === 1} onClick={() => setPaginaAtual(p => p - 1)}>
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        className={`${styles.pagBtn} ${paginaAtual === p ? styles.pagActive : ""}`}
                        onClick={() => setPaginaAtual(p)}
                      >
                        {p}
                      </button>
                    ))}
                    <button className={styles.pagBtn} disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(p => p + 1)}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ════════ PLACEHOLDERS ════════ */}
          {activeSection === "financeiro" && (
            <div className={styles.placeholder}>
              <h2>Módulo Financeiro</h2>
              <p>Em desenvolvimento. Aqui terá:</p>
              <ul>
                <li>Faturamento por clínica</li>
                <li>Comissões de médicos</li>
                <li>Inadimplência</li>
                <li>Previsões de receita</li>
              </ul>
            </div>
          )}

          {activeSection === "relatorios" && (
            <div className={styles.placeholder}>
              <h2>Relatórios</h2>
              <p>Em desenvolvimento. Aqui terá:</p>
              <ul>
                <li>Relatório de consultas (PDF/Excel)</li>
                <li>Relatório de usuários</li>
                <li>Relatório financeiro</li>
                <li>Agendamentos automáticos</li>
              </ul>
            </div>
          )}

          {activeSection === "configuracoes" && (
            <div className={styles.placeholder}>
              <h2>Configurações do Sistema</h2>
              <p>Em desenvolvimento. Aqui terá:</p>
              <ul>
                <li>Horários de funcionamento padrão</li>
                <li>Especialidades médicas</li>
                <li>Planos de saúde aceitos</li>
                <li>Integrações (WhatsApp, Email)</li>
                <li>Backup e segurança</li>
              </ul>
            </div>
          )}
        </main>
      </div>

      {/* ─── MODAL: Nova Clínica ─── */}
      {showClinicaModal && (
        <div className={styles.modalOverlay} onClick={() => setShowClinicaModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3><Building2 size={18} /> Nova Clínica</h3>
              <button className={styles.modalClose} onClick={() => setShowClinicaModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formField}>
                <label>Nome da Clínica *</label>
                <input
                  type="text"
                  placeholder="Ex: Clínica Vida Saudável"
                  value={clinicaForm.nome}
                  onChange={e => setClinicaForm(f => ({ ...f, nome: e.target.value }))}
                />
              </div>
              <div className={styles.formField}>
                <label>CNPJ</label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={clinicaForm.cnpj}
                  onChange={e => setClinicaForm(f => ({ ...f, cnpj: e.target.value }))}
                />
              </div>
              <div className={styles.formField}>
                <label>Endereço</label>
                <input
                  type="text"
                  placeholder="Rua, número, bairro, cidade"
                  value={clinicaForm.endereco}
                  onChange={e => setClinicaForm(f => ({ ...f, endereco: e.target.value }))}
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Telefone *</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={clinicaForm.telefone}
                    onChange={e => setClinicaForm(f => ({ ...f, telefone: e.target.value }))}
                  />
                </div>
                <div className={styles.formField}>
                  <label>Email *</label>
                  <input
                    type="email"
                    placeholder="contato@clinica.com"
                    value={clinicaForm.email}
                    onChange={e => setClinicaForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btn} onClick={() => setShowClinicaModal(false)}>Cancelar</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={criarClinica}>
                <Plus size={15} /> Criar Clínica
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Editar Clínica ─── */}
      {showClinicaEdit && (
        <div className={styles.modalOverlay} onClick={() => setShowClinicaEdit(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3><Edit2 size={18} /> Editar Clínica</h3>
              <button className={styles.modalClose} onClick={() => setShowClinicaEdit(null)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formField}>
                <label>Nome</label>
                <input
                  type="text"
                  value={showClinicaEdit.nome}
                  onChange={e => setShowClinicaEdit({ ...showClinicaEdit, nome: e.target.value })}
                />
              </div>
              <div className={styles.formField}>
                <label>Endereço</label>
                <input
                  type="text"
                  value={showClinicaEdit.endereco}
                  onChange={e => setShowClinicaEdit({ ...showClinicaEdit, endereco: e.target.value })}
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Telefone</label>
                  <input
                    type="text"
                    value={showClinicaEdit.telefone}
                    onChange={e => setShowClinicaEdit({ ...showClinicaEdit, telefone: e.target.value })}
                  />
                </div>
                <div className={styles.formField}>
                  <label>Email</label>
                  <input
                    type="email"
                    value={showClinicaEdit.email}
                    onChange={e => setShowClinicaEdit({ ...showClinicaEdit, email: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btn} onClick={() => setShowClinicaEdit(null)}>Cancelar</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={atualizarClinica}>Salvar</button>
            </div>
          </div>
        </div>
      )}
      {/* ─── MODAL: Editar Usuário ─── */}
{showUsuarioEdit && (
  <div className={styles.modalOverlay} onClick={() => setShowUsuarioEdit(null)}>
    <div className={styles.modal} onClick={e => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <h3><Edit2 size={18} /> Editar Usuário: {showUsuarioEdit.username}</h3>
        <button className={styles.modalClose} onClick={() => setShowUsuarioEdit(null)}>
          <X size={18} />
        </button>
      </div>
      <div className={styles.modalBody}>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label>Tipo *</label>
            <select value={usuarioEditForm.tipo}
              onChange={e => setUsuarioEditForm(f => ({ ...f, tipo: e.target.value }))}>
              <option value="medico">Médico</option>
              <option value="recepcionista">Recepcionista</option>
              <option value="admin_clinica">Admin de Clínica</option>
              <option value="paciente">Paciente</option>
            </select>
          </div>
          <div className={styles.formField}>
            <label>Status</label>
            <select value={usuarioEditForm.status}
              onChange={e => setUsuarioEditForm(f => ({ ...f, status: e.target.value }))}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>
        <div className={styles.formField}>
          <label>Email</label>
          <input type="email" value={usuarioEditForm.email}
            onChange={e => setUsuarioEditForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className={styles.formField}>
          <label>Clínica</label>
          <select value={usuarioEditForm.clinicaId}
            onChange={e => setUsuarioEditForm(f => ({ ...f, clinicaId: e.target.value }))}>
            <option value="">Sem clínica</option>
            {clinicas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label>Telefone</label>
            <input type="text" value={usuarioEditForm.telefone}
              onChange={e => setUsuarioEditForm(f => ({ ...f, telefone: e.target.value }))} />
          </div>
          {usuarioEditForm.tipo === "medico" && (
            <div className={styles.formField}>
              <label>Especialidade</label>
              <input type="text" value={usuarioEditForm.especialidade}
                onChange={e => setUsuarioEditForm(f => ({ ...f, especialidade: e.target.value }))} />
            </div>
          )}
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btn} onClick={() => setShowUsuarioEdit(null)}>Cancelar</button>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={salvarEditarUsuario}>
          Salvar Alterações
        </button>
      </div>
    </div>
  </div>
)}

      {/* ─── MODAL: Novo Usuário ─── */}
      {showUsuarioModal && (
        <div className={styles.modalOverlay} onClick={() => setShowUsuarioModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3><UserPlus size={18} /> Novo Usuário</h3>
              <button className={styles.modalClose} onClick={() => setShowUsuarioModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label>Nome de usuário *</label>
                  <input
                    type="text"
                    placeholder="joao.silva"
                    value={usuarioForm.username}
                    onChange={e => setUsuarioForm(f => ({ ...f, username: e.target.value }))}
                  />
                </div>
                <div className={styles.formField}>
                  <label>Tipo *</label>
                  <select
                    value={usuarioForm.tipo}
                    onChange={e => setUsuarioForm(f => ({ ...f, tipo: e.target.value }))}
                  >
                    <option value="medico">Médico</option>
                    <option value="recepcionista">Recepcionista</option>
                    <option value="admin">Admin de Clínica</option>
                    <option value="paciente">Paciente</option>
                  </select>
                </div>
              </div>
              <div className={styles.formField}>
                <label>Email</label>
                <input
                  type="email"
                  placeholder="usuario@clinica.com"
                  value={usuarioForm.email}
                  onChange={e => setUsuarioForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className={styles.formField}>
                <label>Senha *</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={usuarioForm.password}
                  onChange={e => setUsuarioForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div className={styles.formField}>
                <label>Clínica *</label>
                <select
                  value={usuarioForm.clinicaId}
                  onChange={e => setUsuarioForm(f => ({ ...f, clinicaId: e.target.value }))}
                >
                  <option value="">Selecione uma clínica...</option>
                  {clinicas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              {usuarioForm.tipo === "medico" && (
                <div className={styles.formField}>
                  <label>Especialidade</label>
                  <input
                    type="text"
                    placeholder="Cardiologia, Pediatria..."
                    value={usuarioForm.especialidade}
                    onChange={e => setUsuarioForm(f => ({ ...f, especialidade: e.target.value }))}
                  />
                </div>
              )}
              <div className={styles.formField}>
                <label>Telefone</label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={usuarioForm.telefone}
                  onChange={e => setUsuarioForm(f => ({ ...f, telefone: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btn} onClick={() => setShowUsuarioModal(false)}>Cancelar</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={criarUsuario}>
                <UserPlus size={15} /> Criar Usuário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
