"use client";

import React, { useState, useEffect } from "react";
import {
  Building2, Users, Calendar, Stethoscope, DollarSign,
  Bell, LogOut, Plus, Search, Edit2, Trash2, CheckCircle,
  XCircle, AlertCircle, Clock, Phone, Mail, UserPlus, X,
  ChevronLeft, ChevronRight, TriangleAlert, RefreshCw,
  Activity, FileText, TrendingUp
} from "lucide-react";
import styles from "./dashboard-clinica.module.css";

// ─── Types ───────────────────────────────────────────────────
interface Stats {
  clinica: { id: number; nome: string; status: string };
  totalMedicos: number;
  totalPacientes: number;
  consultasHoje: number;
  consultasMes: number;
  consultasPendentes: number;
  faturamentoMes: number;
  ticketMedio: number;
}
interface Medico {
  id: number; username: string; nome: string; email: string;
  telefone: string; especialidade: string; crm: string;
  status: "ativo" | "inativo"; totalConsultas: number;
  consultasMes: number; ultimoAcesso: string;
}
interface Paciente {
  id: number; username: string; nome: string; email: string;
  telefone: string; ultimaConsulta: string | null; totalConsultas: number;
}
interface Consulta {
  id: number; paciente: string; pacienteId: number;
  medico: string; medicoId: number; clinica: string;
  data: string; hora: string;
  status: "agendada" | "confirmada" | "concluida" | "cancelada";
  motivo: string; valor?: number;
}
interface MedicoSimples { id: number; nome: string; especialidade: string; }
interface PacienteSimples { id: number; nome: string; }

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
type NavSection = "overview" | "medicos" | "pacientes" | "consultas";
function authHeader(token: string) { return { Authorization: `Bearer ${token}` }; }

const STATUS_COLORS: Record<string, string> = {
  agendada: "#58A6FF", confirmada: "#3FB950",
  concluida: "#8B949E", cancelada: "#F85149",
};
const STATUS_LABELS: Record<string, string> = {
  agendada: "Agendada", confirmada: "Confirmada",
  concluida: "Concluída", cancelada: "Cancelada",
};

export default function DashboardClinica() {
  const [token, setToken] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>("overview");
  const [user, setUser] = useState<any>(null);

  const [stats, setStats] = useState<Stats | null>(null);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [medicosLista, setMedicosLista] = useState<MedicoSimples[]>([]);
  const [pacientesLista, setPacientesLista] = useState<PacienteSimples[]>([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Modais
  const [showMedicoModal, setShowMedicoModal] = useState(false);
  const [showMedicoEdit, setShowMedicoEdit] = useState<Medico | null>(null);
  const [showConsultaModal, setShowConsultaModal] = useState(false);
  const [showConsultaEdit, setShowConsultaEdit] = useState<Consulta | null>(null);

  // Forms
  const [medicoForm, setMedicoForm] = useState({
    username: "", email: "", password: "",
    especialidade: "", crm: "", telefone: "",
  });
  const [medicoEditForm, setMedicoEditForm] = useState({
    email: "", especialidade: "", crm: "", telefone: "", status: "ativo",
  });
  const [consultaForm, setConsultaForm] = useState({
    medico: "", paciente: "", data: "", hora: "", motivo: "", valor: "",
  });

  // Filtros
  const [filtroMedico, setFiltroMedico] = useState("");
  const [filtroPaciente, setFiltroPaciente] = useState("");
  const [filtroConsultaStatus, setFiltroConsultaStatus] = useState("todas");
  const [paginaConsultas, setPaginaConsultas] = useState(1);
  const itensPorPagina = 10;

  // ─── Auth ─────────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem("access");
    if (!t) { window.location.href = "/login"; return; }
    setToken(t);
    fetch(`${API_URL}/api/me/`, { headers: authHeader(t) })
      .then(r => r.json())
      .then(u => {
        setUser(u);
        if (u.tipo !== "admin_clinica") window.location.href = "/login";
      })
      .catch(() => window.location.href = "/login");
  }, []);

  useEffect(() => {
    if (!token) return;
    carregarTudo();
    const interval = setInterval(carregarTudo, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const carregarTudo = async () => {
    setLoading(true);
    try {
      await Promise.allSettled([
        fetchStats(), fetchMedicos(), fetchPacientes(),
        fetchConsultas(), fetchListas(),
      ]);
    } finally { setLoading(false); }
  };

  // ─── Fetches ──────────────────────────────────────────────
  const fetchStats = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/minha-clinica/stats/`, { headers: authHeader(token) });
    if (res.ok) setStats(await res.json());
  };

  const fetchMedicos = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/minha-clinica/medicos/`, { headers: authHeader(token) });
    if (res.ok) setMedicos(await res.json());
  };

  const fetchPacientes = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/minha-clinica/pacientes/`, { headers: authHeader(token) });
    if (res.ok) setPacientes(await res.json());
  };

  const fetchConsultas = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/minha-clinica/consultas/`, { headers: authHeader(token) });
    if (res.ok) setConsultas(await res.json());
  };

  const fetchListas = async () => {
    if (!token) return;
    const [r1, r2] = await Promise.all([
      fetch(`${API_URL}/api/minha-clinica/medicos-lista/`, { headers: authHeader(token) }),
      fetch(`${API_URL}/api/minha-clinica/pacientes-lista/`, { headers: authHeader(token) }),
    ]);
    if (r1.ok) setMedicosLista(await r1.json());
    if (r2.ok) setPacientesLista(await r2.json());
  };

  // ─── CRUD Médicos ─────────────────────────────────────────
  const criarMedico = async () => {
    if (!token) return;
    if (!medicoForm.username.trim()) { showToast("Username obrigatório", "err"); return; }
    if (!medicoForm.password.trim()) { showToast("Senha obrigatória", "err"); return; }
    try {
      const res = await fetch(`${API_URL}/api/minha-clinica/medicos/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify(medicoForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setShowMedicoModal(false);
      setMedicoForm({ username: "", email: "", password: "", especialidade: "", crm: "", telefone: "" });
      await fetchMedicos();
      await fetchListas();
      await fetchStats();
      showToast("Médico criado com sucesso!");
    } catch (err: any) { showToast(err.message, "err"); }
  };

  const salvarMedicoEdit = async () => {
    if (!token || !showMedicoEdit) return;
    try {
      const res = await fetch(`${API_URL}/api/minha-clinica/medicos/${showMedicoEdit.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify(medicoEditForm),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setShowMedicoEdit(null);
      await fetchMedicos();
      showToast("Médico atualizado!");
    } catch (err: any) { showToast(err.message, "err"); }
  };

  const removerMedico = async (id: number) => {
    if (!token) return;
    if (!window.confirm("Remover este médico da clínica?")) return;
    try {
      const res = await fetch(`${API_URL}/api/minha-clinica/medicos/${id}/`, {
        method: "DELETE", headers: authHeader(token),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchMedicos();
      await fetchStats();
      showToast("Médico removido");
    } catch (err: any) { showToast(err.message, "err"); }
  };

  // ─── CRUD Consultas ───────────────────────────────────────
  const criarConsulta = async () => {
    if (!token) return;
    if (!consultaForm.medico || !consultaForm.paciente || !consultaForm.data || !consultaForm.hora) {
      showToast("Preencha médico, paciente, data e hora", "err"); return;
    }
    try {
      const res = await fetch(`${API_URL}/api/minha-clinica/consultas/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify({
          medico: consultaForm.medico,
          paciente: consultaForm.paciente,
          data: consultaForm.data,
          hora: consultaForm.hora,
          motivo: consultaForm.motivo,
          valor: consultaForm.valor || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setShowConsultaModal(false);
      setConsultaForm({ medico: "", paciente: "", data: "", hora: "", motivo: "", valor: "" });
      await fetchConsultas();
      await fetchStats();
      showToast("Consulta criada!");
    } catch (err: any) { showToast(err.message, "err"); }
  };

  const atualizarStatusConsulta = async (id: number, status: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/minha-clinica/consultas/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchConsultas();
      await fetchStats();
      showToast("Status atualizado!");
    } catch (err: any) { showToast(err.message, "err"); }
  };

  const logout = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  // Apagar o cookie que o middleware lê
  document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
  window.location.replace("/login");
};

  const formatarMoeda = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  // Filtros
  const medicosFiltrados = medicos.filter(m =>
    m.nome.toLowerCase().includes(filtroMedico.toLowerCase()) ||
    m.especialidade.toLowerCase().includes(filtroMedico.toLowerCase())
  );
  const pacientesFiltrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(filtroPaciente.toLowerCase()) ||
    p.email.toLowerCase().includes(filtroPaciente.toLowerCase())
  );
  const consultasFiltradas = consultas.filter(c =>
    filtroConsultaStatus === "todas" || c.status === filtroConsultaStatus
  );
  const totalPaginas = Math.ceil(consultasFiltradas.length / itensPorPagina);
  const consultasPaginadas = consultasFiltradas.slice(
    (paginaConsultas - 1) * itensPorPagina,
    paginaConsultas * itensPorPagina
  );

  if (!token || loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0d1117", color: "#e6edf3", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid #30363d", borderTop: "3px solid #58A6FF", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <p>Carregando dashboard...</p>
    </div>
  );

  const navItems: [NavSection, any, string, number][] = [
    ["overview", TrendingUp, "Visão Geral", 0],
    ["medicos", Stethoscope, "Médicos", medicos.length],
    ["pacientes", Users, "Pacientes", pacientes.length],
    ["consultas", Calendar, "Consultas", consultas.filter(c => c.status === "agendada").length],
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0d1117", color: "#e6edf3", fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.type === "ok" ? "#1a3a2a" : "#3a1a1a",
          border: `1px solid ${toast.type === "ok" ? "#3FB950" : "#F85149"}`,
          color: toast.type === "ok" ? "#3FB950" : "#F85149",
          padding: "12px 20px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontSize: 14,
        }}>
          {toast.type === "ok" ? <CheckCircle size={16} /> : <TriangleAlert size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, background: "#161b22", borderRight: "1px solid #30363d",
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #30363d" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ background: "#1f6feb", borderRadius: 8, padding: 7, display: "flex" }}>
              <Building2 size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#e6edf3" }}>
                {stats?.clinica.nome || "Minha Clínica"}
              </div>
              <div style={{ fontSize: 11, color: "#8b949e" }}>Painel da Clínica</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "16px 12px" }}>
          {navItems.map(([id, Icon, label, count]) => (
            <button key={id} onClick={() => setActiveSection(id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: activeSection === id ? "#1f2937" : "transparent",
              color: activeSection === id ? "#e6edf3" : "#8b949e",
              marginBottom: 2, fontSize: 14, transition: "all 0.15s",
            }}>
              <Icon size={16} />
              <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
              {count > 0 && (
                <span style={{
                  background: id === "consultas" ? "#1f6feb" : "#21262d",
                  color: id === "consultas" ? "#fff" : "#8b949e",
                  borderRadius: 10, padding: "1px 7px", fontSize: 11,
                }}>{count}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: "16px 12px", borderTop: "1px solid #30363d" }}>
          <div style={{ fontSize: 13, color: "#8b949e", marginBottom: 8, paddingLeft: 4 }}>
            {user?.username}
          </div>
          <button onClick={logout} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer",
            background: "transparent", color: "#8b949e", fontSize: 13,
          }}>
            <LogOut size={15} /> Sair
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{
          padding: "20px 32px", borderBottom: "1px solid #30363d",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#161b22", position: "sticky", top: 0, zIndex: 10,
        }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
              {{ overview: "Visão Geral", medicos: "Médicos", pacientes: "Pacientes", consultas: "Consultas" }[activeSection]}
            </h1>
            <p style={{ fontSize: 12, color: "#8b949e", margin: "2px 0 0" }}>
              {stats?.clinica.nome} · {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <button onClick={carregarTudo} style={{
            background: "#21262d", border: "1px solid #30363d", borderRadius: 8,
            color: "#8b949e", padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13,
          }}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>

        <div style={{ padding: 32, flex: 1 }}>

          {/* ══ OVERVIEW ══ */}
          {activeSection === "overview" && (
            <div>
              {/* Cards de stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
                {[
                  { label: "Médicos", value: stats?.totalMedicos ?? 0, icon: Stethoscope, color: "#58A6FF" },
                  { label: "Pacientes", value: stats?.totalPacientes ?? 0, icon: Users, color: "#3FB950" },
                  { label: "Consultas Hoje", value: stats?.consultasHoje ?? 0, icon: Calendar, color: "#D29922" },
                  { label: "Consultas no Mês", value: stats?.consultasMes ?? 0, icon: Activity, color: "#A371F7" },
                  { label: "Faturamento Mês", value: formatarMoeda(stats?.faturamentoMes ?? 0), icon: DollarSign, color: "#3FB950", isText: true },
                  { label: "Ticket Médio", value: formatarMoeda(stats?.ticketMedio ?? 0), icon: TrendingUp, color: "#58A6FF", isText: true },
                ].map(({ label, value, icon: Icon, color, isText }) => (
                  <div key={label} style={{
                    background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: "20px 24px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{ fontSize: 13, color: "#8b949e" }}>{label}</span>
                      <div style={{ background: `${color}22`, borderRadius: 8, padding: 8 }}>
                        <Icon size={16} color={color} />
                      </div>
                    </div>
                    <div style={{ fontSize: isText ? 20 : 28, fontWeight: 700, color: "#e6edf3" }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Consultas pendentes */}
              <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Próximas Consultas</h2>
                  <button onClick={() => setActiveSection("consultas")} style={{
                    background: "transparent", border: "none", color: "#58A6FF", cursor: "pointer", fontSize: 13,
                  }}>Ver todas →</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {consultas.filter(c => c.status === "agendada").slice(0, 5).map(c => (
                    <div key={c.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 16px", background: "#0d1117", borderRadius: 8, border: "1px solid #21262d",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ background: "#1f2937", borderRadius: 8, padding: 8 }}>
                          <Calendar size={14} color="#58A6FF" />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{c.paciente}</div>
                          <div style={{ fontSize: 12, color: "#8b949e" }}>Dr. {c.medico} · {c.motivo || "Consulta geral"}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, color: "#e6edf3" }}>{new Date(c.data + "T00:00").toLocaleDateString("pt-BR")}</div>
                        <div style={{ fontSize: 12, color: "#8b949e" }}>{c.hora}</div>
                      </div>
                    </div>
                  ))}
                  {consultas.filter(c => c.status === "agendada").length === 0 && (
                    <div style={{ color: "#8b949e", textAlign: "center", padding: 24, fontSize: 14 }}>
                      Nenhuma consulta agendada
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ MÉDICOS ══ */}
          {activeSection === "medicos" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ position: "relative" }}>
                  <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8b949e" }} />
                  <input value={filtroMedico} onChange={e => setFiltroMedico(e.target.value)}
                    placeholder="Buscar médico..." style={{
                      background: "#21262d", border: "1px solid #30363d", borderRadius: 8,
                      color: "#e6edf3", padding: "9px 12px 9px 36px", fontSize: 14, width: 280, outline: "none",
                    }} />
                </div>
                <button onClick={() => setShowMedicoModal(true)} style={{
                  background: "#1f6feb", border: "none", borderRadius: 8, color: "#fff",
                  padding: "9px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500,
                }}>
                  <UserPlus size={15} /> Novo Médico
                </button>
              </div>

              <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #30363d" }}>
                      {["Médico", "Especialidade", "CRM", "Telefone", "Consultas", "Status", "Ações"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#8b949e", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {medicosFiltrados.map(m => (
                      <tr key={m.id} style={{ borderBottom: "1px solid #21262d" }}>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{m.nome}</div>
                          <div style={{ fontSize: 12, color: "#8b949e" }}>{m.email}</div>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 14, color: "#8b949e" }}>{m.especialidade || "—"}</td>
                        <td style={{ padding: "14px 16px", fontSize: 14, color: "#8b949e" }}>{m.crm || "—"}</td>
                        <td style={{ padding: "14px 16px", fontSize: 14, color: "#8b949e" }}>{m.telefone || "—"}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontSize: 14 }}>{m.consultasMes} <span style={{ fontSize: 11, color: "#8b949e" }}>este mês</span></div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            background: m.status === "ativo" ? "#1a3a2a" : "#2a1a1a",
                            color: m.status === "ativo" ? "#3FB950" : "#F85149",
                            borderRadius: 6, padding: "3px 10px", fontSize: 12,
                          }}>{m.status}</span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => {
                              setMedicoEditForm({ email: m.email, especialidade: m.especialidade, crm: m.crm, telefone: m.telefone, status: m.status });
                              setShowMedicoEdit(m);
                            }} style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#8b949e", padding: "6px 10px", cursor: "pointer" }}>
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => removerMedico(m.id)} style={{ background: "#2a1a1a", border: "1px solid #3a2020", borderRadius: 6, color: "#F85149", padding: "6px 10px", cursor: "pointer" }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {medicosFiltrados.length === 0 && (
                  <div style={{ color: "#8b949e", textAlign: "center", padding: 40, fontSize: 14 }}>Nenhum médico encontrado</div>
                )}
              </div>
            </div>
          )}

          {/* ══ PACIENTES ══ */}
          {activeSection === "pacientes" && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8b949e" }} />
                  <input value={filtroPaciente} onChange={e => setFiltroPaciente(e.target.value)}
                    placeholder="Buscar paciente..." style={{
                      background: "#21262d", border: "1px solid #30363d", borderRadius: 8,
                      color: "#e6edf3", padding: "9px 12px 9px 36px", fontSize: 14, width: 280, outline: "none",
                    }} />
                </div>
              </div>

              <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #30363d" }}>
                      {["Paciente", "Contato", "Última Consulta", "Total Consultas"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#8b949e", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pacientesFiltrados.map(p => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #21262d" }}>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{p.nome}</div>
                          <div style={{ fontSize: 12, color: "#8b949e" }}>@{p.username}</div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontSize: 13, color: "#8b949e", display: "flex", flexDirection: "column", gap: 2 }}>
                            {p.email && <span><Mail size={11} style={{ marginRight: 4 }} />{p.email}</span>}
                            {p.telefone && <span><Phone size={11} style={{ marginRight: 4 }} />{p.telefone}</span>}
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 14, color: "#8b949e" }}>
                          {p.ultimaConsulta ? new Date(p.ultimaConsulta + "T00:00").toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 14 }}>{p.totalConsultas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pacientesFiltrados.length === 0 && (
                  <div style={{ color: "#8b949e", textAlign: "center", padding: 40, fontSize: 14 }}>Nenhum paciente encontrado</div>
                )}
              </div>
            </div>
          )}

          {/* ══ CONSULTAS ══ */}
          {activeSection === "consultas" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  {["todas", "agendada", "confirmada", "concluida", "cancelada"].map(s => (
                    <button key={s} onClick={() => { setFiltroConsultaStatus(s); setPaginaConsultas(1); }} style={{
                      background: filtroConsultaStatus === s ? "#1f6feb" : "#21262d",
                      border: `1px solid ${filtroConsultaStatus === s ? "#1f6feb" : "#30363d"}`,
                      borderRadius: 8, color: filtroConsultaStatus === s ? "#fff" : "#8b949e",
                      padding: "7px 14px", cursor: "pointer", fontSize: 13,
                    }}>
                      {s === "todas" ? "Todas" : STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowConsultaModal(true)} style={{
                  background: "#1f6feb", border: "none", borderRadius: 8, color: "#fff",
                  padding: "9px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500,
                }}>
                  <Plus size={15} /> Nova Consulta
                </button>
              </div>

              <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #30363d" }}>
                      {["Paciente", "Médico", "Data", "Hora", "Motivo", "Status", "Ações"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#8b949e", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {consultasPaginadas.map(c => (
                      <tr key={c.id} style={{ borderBottom: "1px solid #21262d" }}>
                        <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 500 }}>{c.paciente}</td>
                        <td style={{ padding: "14px 16px", fontSize: 14, color: "#8b949e" }}>{c.medico}</td>
                        <td style={{ padding: "14px 16px", fontSize: 14 }}>{new Date(c.data + "T00:00").toLocaleDateString("pt-BR")}</td>
                        <td style={{ padding: "14px 16px", fontSize: 14 }}>{c.hora}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: "#8b949e", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.motivo || "—"}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            background: `${STATUS_COLORS[c.status]}22`,
                            color: STATUS_COLORS[c.status],
                            borderRadius: 6, padding: "3px 10px", fontSize: 12,
                          }}>{STATUS_LABELS[c.status]}</span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <select
                            value={c.status}
                            onChange={e => atualizarStatusConsulta(c.id, e.target.value)}
                            style={{
                              background: "#21262d", border: "1px solid #30363d", borderRadius: 6,
                              color: "#8b949e", padding: "5px 8px", fontSize: 12, cursor: "pointer",
                            }}
                          >
                            <option value="agendada">Agendada</option>
                            <option value="confirmada">Confirmada</option>
                            <option value="concluida">Concluída</option>
                            <option value="cancelada">Cancelada</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {consultasPaginadas.length === 0 && (
                  <div style={{ color: "#8b949e", textAlign: "center", padding: 40, fontSize: 14 }}>Nenhuma consulta encontrada</div>
                )}
              </div>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 }}>
                  <button onClick={() => setPaginaConsultas(p => Math.max(1, p - 1))} disabled={paginaConsultas === 1}
                    style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#8b949e", padding: "6px 10px", cursor: "pointer" }}>
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontSize: 13, color: "#8b949e" }}>{paginaConsultas} / {totalPaginas}</span>
                  <button onClick={() => setPaginaConsultas(p => Math.min(totalPaginas, p + 1))} disabled={paginaConsultas === totalPaginas}
                    style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#8b949e", padding: "6px 10px", cursor: "pointer" }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ══ MODAL: Novo Médico ══ */}
      {showMedicoModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setShowMedicoModal(false)}>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, width: 480, padding: 24 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}><UserPlus size={16} style={{ marginRight: 8 }} />Novo Médico</h3>
              <button onClick={() => setShowMedicoModal(false)} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Username *", key: "username", type: "text", placeholder: "dr.joao" },
                { label: "Email", key: "email", type: "email", placeholder: "dr@clinica.com" },
                { label: "Senha *", key: "password", type: "password", placeholder: "••••••••" },
                { label: "Especialidade", key: "especialidade", type: "text", placeholder: "Cardiologia" },
                { label: "CRM", key: "crm", type: "text", placeholder: "CRM/SP 12345" },
                { label: "Telefone", key: "telefone", type: "text", placeholder: "(11) 99999-9999" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>{label}</label>
                  <input type={type} placeholder={placeholder} value={(medicoForm as any)[key]}
                    onChange={e => setMedicoForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowMedicoModal(false)} style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 8, color: "#8b949e", padding: "8px 16px", cursor: "pointer" }}>Cancelar</button>
              <button onClick={criarMedico} style={{ background: "#1f6feb", border: "none", borderRadius: 8, color: "#fff", padding: "8px 20px", cursor: "pointer", fontWeight: 500 }}>Criar Médico</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Editar Médico ══ */}
      {showMedicoEdit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setShowMedicoEdit(null)}>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, width: 480, padding: 24 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}><Edit2 size={16} style={{ marginRight: 8 }} />Editar: {showMedicoEdit.nome}</h3>
              <button onClick={() => setShowMedicoEdit(null)} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Email", key: "email", type: "email" },
                { label: "Especialidade", key: "especialidade", type: "text" },
                { label: "CRM", key: "crm", type: "text" },
                { label: "Telefone", key: "telefone", type: "text" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={(medicoEditForm as any)[key]}
                    onChange={e => setMedicoEditForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>Status</label>
                <select value={medicoEditForm.status} onChange={e => setMedicoEditForm(f => ({ ...f, status: e.target.value }))}
                  style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14 }}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowMedicoEdit(null)} style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 8, color: "#8b949e", padding: "8px 16px", cursor: "pointer" }}>Cancelar</button>
              <button onClick={salvarMedicoEdit} style={{ background: "#1f6feb", border: "none", borderRadius: 8, color: "#fff", padding: "8px 20px", cursor: "pointer", fontWeight: 500 }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Nova Consulta ══ */}
      {showConsultaModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setShowConsultaModal(false)}>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, width: 480, padding: 24 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}><Plus size={16} style={{ marginRight: 8 }} />Nova Consulta</h3>
              <button onClick={() => setShowConsultaModal(false)} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>Médico *</label>
                <select value={consultaForm.medico} onChange={e => setConsultaForm(f => ({ ...f, medico: e.target.value }))}
                  style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14 }}>
                  <option value="">Selecione...</option>
                  {medicosLista.map(m => <option key={m.id} value={m.id}>{m.nome}{m.especialidade ? ` — ${m.especialidade}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>Paciente *</label>
                <select value={consultaForm.paciente} onChange={e => setConsultaForm(f => ({ ...f, paciente: e.target.value }))}
                  style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14 }}>
                  <option value="">Selecione...</option>
                  {pacientesLista.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>Data *</label>
                  <input type="date" value={consultaForm.data} onChange={e => setConsultaForm(f => ({ ...f, data: e.target.value }))}
                    style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>Hora *</label>
                  <input type="time" value={consultaForm.hora} onChange={e => setConsultaForm(f => ({ ...f, hora: e.target.value }))}
                    style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>Motivo</label>
                <input type="text" value={consultaForm.motivo} onChange={e => setConsultaForm(f => ({ ...f, motivo: e.target.value }))}
                  placeholder="Consulta de rotina, retorno..."
                  style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>Valor (R$)</label>
                <input type="number" value={consultaForm.valor} onChange={e => setConsultaForm(f => ({ ...f, valor: e.target.value }))}
                  placeholder="150.00"
                  style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowConsultaModal(false)} style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 8, color: "#8b949e", padding: "8px 16px", cursor: "pointer" }}>Cancelar</button>
              <button onClick={criarConsulta} style={{ background: "#1f6feb", border: "none", borderRadius: 8, color: "#fff", padding: "8px 20px", cursor: "pointer", fontWeight: 500 }}>Criar Consulta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}