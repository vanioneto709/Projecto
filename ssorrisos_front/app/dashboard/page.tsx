"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building2, Users, Calendar, Stethoscope, TrendingUp, 
  DollarSign, Bell, Settings, LogOut, Plus, Search, 
  Filter, MoreVertical, Edit2, Trash2, Eye, EyeOff,
  CheckCircle, XCircle, AlertCircle, Download, FileText,
  ChevronDown, ChevronRight, Activity, CreditCard,
  PieChart, BarChart3, Clock, MapPin, Phone, Mail,
  ShieldCheck, UserPlus, RefreshCw, X, ChevronLeft,
  ChevronRight as ChevronRightIcon, CalendarDays,
  Search as SearchIcon, Filter as FilterIcon,
  MoreHorizontal, PhoneCall, MapPinned, BadgeCheck,
  TrendingDown, Wallet, Receipt, FileSpreadsheet,
  HelpCircle, MessageSquare, Ticket, History, Lock,
  Unlock, Power, PowerOff, Archive, RotateCcw
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Clinica {
  id: number;
  nome: string;
  endereco: string;
  telefone: string;
  email: string;
  cnpj?: string;
  status: "ativa" | "inativa" | "suspensa";
  dataCadastro: string;
  totalMedicos: number;
  totalPacientes: number;
  consultasMes: number;
  faturamentoMes: number;
  cor?: string;
}

interface Usuario {
  id: number;
  username: string;
  email: string;
  tipo: "admin" | "medico" | "paciente" | "recepcionista";
  clinicaId?: number;
  clinicaNome?: string;
  status: "ativo" | "inativo";
  ultimoAcesso?: string;
  telefone?: string;
  especialidade?: string;
}

interface Consulta {
  id: number;
  paciente: string;
  pacienteId: number;
  medico: string;
  medicoId: number;
  clinica: string;
  clinicaId: number;
  data: string;
  hora: string;
  status: "agendada" | "confirmada" | "cancelada" | "concluida";
  motivo: string;
  valor?: number;
}

interface DashboardStats {
  totalClinicas: number;
  clinicasAtivas: number;
  totalMedicos: number;
  totalPacientes: number;
  consultasHoje: number;
  consultasMes: number;
  faturamentoMes: number;
  ticketMedio: number;
  crescimento: number;
}

interface Notificacao {
  id: number;
  tipo: "info" | "warning" | "error" | "success";
  titulo: string;
  mensagem: string;
  data: string;
  lida: boolean;
  link?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type NavSection = "overview" | "clinicas" | "usuarios" | "agenda" | "financeiro" | "relatorios" | "configuracoes";

const CORES_CLINICA = [
  "#58A6FF", "#3FB950", "#D29922", "#F85149", 
  "#A371F7", "#39D3F2", "#FF7B72", "#79C0FF"
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>("overview");
  const [user, setUser] = useState<any>(null);
  
  // Data states
  const [stats, setStats] = useState<DashboardStats>({
    totalClinicas: 0,
    clinicasAtivas: 0,
    totalMedicos: 0,
    totalPacientes: 0,
    consultasHoje: 0,
    consultasMes: 0,
    faturamentoMes: 0,
    ticketMedio: 0,
    crescimento: 0
  });
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotificacoes, setShowNotificacoes] = useState(false);
  
  // Modals
  const [showClinicaModal, setShowClinicaModal] = useState(false);
  const [showClinicaEdit, setShowClinicaEdit] = useState<Clinica | null>(null);
  const [showUsuarioModal, setShowUsuarioModal] = useState(false);
  const [showConsultaModal, setShowConsultaModal] = useState(false);
  
  // Forms
  const [clinicaForm, setClinicaForm] = useState({
    nome: "",
    endereco: "",
    telefone: "",
    email: "",
    cnpj: ""
  });
  const [usuarioForm, setUsuarioForm] = useState({
    username: "",
    email: "",
    password: "",
    tipo: "medico",
    clinicaId: "",
    telefone: "",
    especialidade: ""
  });
  
  // Filters
  const [filtroClinica, setFiltroClinica] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroConsultaStatus, setFiltroConsultaStatus] = useState("todas");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  // ─── Auth & Init ──────────────────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem("access");
    if (!t) {
      window.location.href = "/login";
      return;
    }
    setToken(t);
    
    // Buscar dados do usuário logado
    fetch(`${API_URL}/api/me/`, {
      headers: { Authorization: `Bearer ${t}` }
    })
    .then(r => r.json())
    .then(data => setUser(data))
    .catch(console.error);
  }, []);

  useEffect(() => {
    if (!token) return;
    carregarTodosDados();
    
    // Auto-refresh a cada 60 segundos
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
      await Promise.all([
        fetchStats(),
        fetchClinicas(),
        fetchUsuarios(),
        fetchConsultas(),
        fetchNotificacoes()
      ]);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── API Functions ──────────────────────────────────────────────────────────
  
  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/stats/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.log("Stats não disponível, usando cálculo local");
      // Fallback: calcular dos dados locais
    }
  };

  const fetchClinicas = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/clinicas/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Adicionar cor se não tiver
      const clinicasComCor = data.map((c: any, i: number) => ({
        ...c,
        cor: c.cor || CORES_CLINICA[i % CORES_CLINICA.length],
        status: c.status || "ativa",
        totalMedicos: c.totalMedicos || 0,
        totalPacientes: c.totalPacientes || 0,
        consultasMes: c.consultasMes || 0,
        faturamentoMes: c.faturamentoMes || 0
      }));
      setClinicas(clinicasComCor);
    } catch (err) {
      console.error("fetchClinicas error:", err);
      setClinicas([]);
    }
  };

  const fetchUsuarios = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/usuarios/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Enriquecer com nome da clínica
      const usuariosEnriquecidos = data.map((u: any) => ({
        ...u,
        clinicaNome: clinicas.find(c => c.id === u.clinicaId)?.nome || "—",
        status: u.status || "ativo",
        ultimoAcesso: u.ultimoAcesso || "—"
      }));
      setUsuarios(usuariosEnriquecidos);
    } catch (err) {
      console.error("fetchUsuarios error:", err);
      setUsuarios([]);
    }
  };

  const fetchConsultas = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/consultas/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConsultas(data);
    } catch (err) {
      console.error("fetchConsultas error:", err);
      setConsultas([]);
    }
  };

  const fetchNotificacoes = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/notificacoes/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotificacoes(data);
      }
    } catch (err) {
      // Silencioso - não é crítico
    }
  };

  // ─── CRUD Clínicas ─────────────────────────────────────────────────────────
  
  const criarClinica = async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_URL}/api/clinicas/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...clinicaForm,
          status: "ativa",
          dataCadastro: new Date().toISOString()
        })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar clínica");
      }
      
      setShowClinicaModal(false);
      setClinicaForm({ nome: "", endereco: "", telefone: "", email: "", cnpj: "" });
      await fetchClinicas();
      await fetchStats();
      alert("Clínica criada com sucesso!");
    } catch (err: any) {
      alert("Erro: " + err.message);
    }
  };

  const atualizarClinica = async () => {
    if (!token || !showClinicaEdit) return;
    
    try {
      const res = await fetch(`${API_URL}/api/clinicas/${showClinicaEdit.id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(showClinicaEdit)
      });
      
      if (!res.ok) throw new Error("Erro ao atualizar");
      
      setShowClinicaEdit(null);
      await fetchClinicas();
      alert("Clínica atualizada!");
    } catch (err) {
      alert("Erro ao atualizar clínica");
    }
  };

  const toggleClinicaStatus = async (clinica: Clinica) => {
    if (!token) return;
    
    const novoStatus = clinica.status === "ativa" ? "inativa" : "ativa";
    
    try {
      const res = await fetch(`${API_URL}/api/clinicas/${clinica.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: novoStatus })
      });
      
      if (!res.ok) throw new Error("Erro");
      
      await fetchClinicas();
      await fetchStats();
    } catch (err) {
      alert("Erro ao alterar status");
    }
  };

  // ─── CRUD Usuários ──────────────────────────────────────────────────────────
  
  const criarUsuario = async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_URL}/api/cadastro/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(usuarioForm)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar usuário");
      }
      
      setShowUsuarioModal(false);
      setUsuarioForm({
        username: "", email: "", password: "", tipo: "medico",
        clinicaId: "", telefone: "", especialidade: ""
      });
      await fetchUsuarios();
      await fetchStats();
      alert("Usuário criado com sucesso!");
    } catch (err: any) {
      alert("Erro: " + err.message);
    }
  };

  const deletarUsuario = async (id: number) => {
    if (!token) return;
    if (!confirm("Tem certeza que deseja remover este usuário?")) return;
    
    try {
      await fetch(`${API_URL}/api/usuarios/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchUsuarios();
      await fetchStats();
    } catch (err) {
      alert("Erro ao remover usuário");
    }
  };

  // ─── Utilidades ─────────────────────────────────────────────────────────────
  
  const logout = () => {
    localStorage.clear();
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/login";
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const notificacoesNaoLidas = notificacoes.filter(n => !n.lida).length;

  // ─── Derived Data ────────────────────────────────────────────────────────────
  
  const clinicasFiltradas = clinicas.filter(c => 
    c.nome.toLowerCase().includes(filtroClinica.toLowerCase()) ||
    c.email.toLowerCase().includes(filtroClinica.toLowerCase())
  );

  const usuariosFiltrados = usuarios.filter(u => 
    u.username.toLowerCase().includes(filtroUsuario.toLowerCase()) ||
    u.email.toLowerCase().includes(filtroUsuario.toLowerCase()) ||
    u.clinicaNome?.toLowerCase().includes(filtroUsuario.toLowerCase())
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

  // ─── Render Loading ───────────────────────────────────────────────────────────
  
  if (!token) {
    return (
      <div className="loading-screen">
        <Building2 size={48} className="loading-icon" />
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <style>{css}</style>
      
      {/* ─── SIDEBAR ─── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <Building2 size={24} />
            <div>
              <h1>AdminClinic</h1>
              <span>Gestão de Clínicas</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <span className="nav-label">Principal</span>
            <button 
              className={activeSection === "overview" ? "active" : ""}
              onClick={() => setActiveSection("overview")}
            >
              <TrendingUp size={18} />
              Visão Geral
            </button>
            <button 
              className={activeSection === "clinicas" ? "active" : ""}
              onClick={() => setActiveSection("clinicas")}
            >
              <Building2 size={18} />
              Clínicas
              <span className="badge">{clinicas.length}</span>
            </button>
            <button 
              className={activeSection === "usuarios" ? "active" : ""}
              onClick={() => setActiveSection("usuarios")}
            >
              <Users size={18} />
              Usuários
              <span className="badge">{usuarios.length}</span>
            </button>
            <button 
              className={activeSection === "agenda" ? "active" : ""}
              onClick={() => setActiveSection("agenda")}
            >
              <Calendar size={18} />
              Agenda Geral
              <span className="badge">{consultas.filter(c => c.status === "agendada").length}</span>
            </button>
          </div>

          <div className="nav-section">
            <span className="nav-label">Gestão</span>
            <button 
              className={activeSection === "financeiro" ? "active" : ""}
              onClick={() => setActiveSection("financeiro")}
            >
              <DollarSign size={18} />
              Financeiro
            </button>
            <button 
              className={activeSection === "relatorios" ? "active" : ""}
              onClick={() => setActiveSection("relatorios")}
            >
              <FileText size={18} />
              Relatórios
            </button>
            <button 
              className={activeSection === "configuracoes" ? "active" : ""}
              onClick={() => setActiveSection("configuracoes")}
            >
              <Settings size={18} />
              Configurações
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.username?.[0]?.toUpperCase() || "A"}</div>
            <div>
              <p className="user-name">{user?.username || "Admin"}</p>
              <p className="user-role">Administrador do Sistema</p>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-content">
        
        {/* Header */}
        <header className="main-header">
          <div className="header-left">
            <h2>{{
              overview: "Visão Geral",
              clinicas: "Gestão de Clínicas",
              usuarios: "Gestão de Usuários",
              agenda: "Agenda Geral",
              financeiro: "Financeiro",
              relatorios: "Relatórios",
              configuracoes: "Configurações"
            }[activeSection]}</h2>
            <p className="breadcrumb">AdminClinic / {activeSection}</p>
          </div>
          
          <div className="header-right">
            <div className="header-time">
              <Clock size={16} />
              {currentTime.toLocaleTimeString('pt-BR')}
            </div>
            
            <div className="notificacoes-wrapper">
              <button 
                className="notificacao-btn"
                onClick={() => setShowNotificacoes(!showNotificacoes)}
              >
                <Bell size={20} />
                {notificacoesNaoLidas > 0 && (
                  <span className="notif-badge">{notificacoesNaoLidas}</span>
                )}
              </button>
              
              {showNotificacoes && (
                <div className="notificacoes-dropdown">
                  <div className="notif-header">
                    <h4>Notificações</h4>
                    <button>Marcar todas lidas</button>
                  </div>
                  {notificacoes.length === 0 ? (
                    <p className="notif-empty">Sem notificações</p>
                  ) : (
                    notificacoes.map(n => (
                      <div key={n.id} className={`notif-item ${!n.lida ? 'nao-lida' : ''}`}>
                        <div className={`notif-icon ${n.tipo}`}>
                          {n.tipo === 'error' ? <AlertCircle size={16} /> :
                           n.tipo === 'warning' ? <AlertTriangle size={16} /> :
                           n.tipo === 'success' ? <CheckCircle size={16} /> :
                           <Bell size={16} />}
                        </div>
                        <div className="notif-content">
                          <p className="notif-titulo">{n.titulo}</p>
                          <p className="notif-mensagem">{n.mensagem}</p>
                          <span className="notif-data">{n.data}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            <button className="refresh-btn" onClick={carregarTodosDados}>
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            </button>
          </div>
        </header>

        {/* ════════════════ OVERVIEW ════════════════ */}
        {activeSection === "overview" && (
          <div className="section-content">
            {/* KPI Cards */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon" style={{background: '#58A6FF20', color: '#58A6FF'}}>
                  <Building2 size={24} />
                </div>
                <div className="kpi-info">
                  <h3>{stats.totalClinicas}</h3>
                  <p>Clínicas Cadastradas</p>
                  <span className="kpi-sub">{stats.clinicasAtivas} ativas</span>
                </div>
              </div>
              
              <div className="kpi-card">
                <div className="kpi-icon" style={{background: '#3FB95020', color: '#3FB950'}}>
                  <Stethoscope size={24} />
                </div>
                <div className="kpi-info">
                  <h3>{stats.totalMedicos}</h3>
                  <p>Médicos no Sistema</p>
                  <span className="kpi-sub">Em {stats.totalClinicas} clínicas</span>
                </div>
              </div>
              
              <div className="kpi-card">
                <div className="kpi-icon" style={{background: '#A371F720', color: '#A371F7'}}>
                  <Users size={24} />
                </div>
                <div className="kpi-info">
                  <h3>{stats.totalPacientes}</h3>
                  <p>Pacientes Cadastrados</p>
                  <span className="kpi-sub">+12% este mês</span>
                </div>
              </div>
              
              <div className="kpi-card">
                <div className="kpi-icon" style={{background: '#D2992220', color: '#D29922'}}>
                  <Calendar size={24} />
                </div>
                <div className="kpi-info">
                  <h3>{stats.consultasHoje}</h3>
                  <p>Consultas Hoje</p>
                  <span className="kpi-sub">{stats.consultasMes} este mês</span>
                </div>
              </div>
              
              <div className="kpi-card highlight">
                <div className="kpi-icon" style={{background: '#39D3F220', color: '#39D3F2'}}>
                  <DollarSign size={24} />
                </div>
                <div className="kpi-info">
                  <h3>{formatarMoeda(stats.faturamentoMes)}</h3>
                  <p>Faturamento Mensal</p>
                  <span className={`kpi-sub ${stats.crescimento >= 0 ? 'positive' : 'negative'}`}>
                    {stats.crescimento >= 0 ? '+' : ''}{stats.crescimento}% vs mês passado
                  </span>
                </div>
              </div>
            </div>

            {/* Charts & Recent Activity */}
            <div className="overview-grid">
              <div className="card">
                <div className="card-header">
                  <h4>Consultas por Clínica (Mês)</h4>
                  <select>
                    <option>Últimos 30 dias</option>
                    <option>Últimos 7 dias</option>
                  </select>
                </div>
                <div className="clinicas-chart">
                  {clinicas.slice(0, 5).map(c => (
                    <div key={c.id} className="chart-bar-item">
                      <div className="bar-label">
                        <span className="bar-color" style={{background: c.cor}}></span>
                        <span className="bar-name">{c.nome}</span>
                      </div>
                      <div className="bar-wrapper">
                        <div 
                          className="bar-fill" 
                          style={{
                            width: `${Math.min((c.consultasMes / Math.max(...clinicas.map(x => x.consultasMes))) * 100, 100)}%`,
                            background: c.cor
                          }}
                        ></div>
                      </div>
                      <span className="bar-value">{c.consultasMes}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h4>Últimas Atividades</h4>
                  <button>Ver todas</button>
                </div>
                <div className="activity-list">
                  {consultas.slice(0, 5).map(c => (
                    <div key={c.id} className="activity-item">
                      <div className={`activity-status ${c.status}`}></div>
                      <div className="activity-content">
                        <p><strong>{c.paciente}</strong> agendou com <strong>{c.medico}</strong></p>
                        <span>{c.clinica} • {formatarData(c.data)} às {c.hora}</span>
                      </div>
                      <span className={`status-tag ${c.status}`}>{c.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h4>Ações Rápidas</h4>
              <div className="actions-grid">
                <button onClick={() => { setActiveSection("clinicas"); setShowClinicaModal(true); }}>
                  <Plus size={20} />
                  Nova Clínica
                </button>
                <button onClick={() => { setActiveSection("usuarios"); setShowUsuarioModal(true); }}>
                  <UserPlus size={20} />
                  Novo Usuário
                </button>
                <button onClick={() => setActiveSection("agenda")}>
                  <Calendar size={20} />
                  Ver Agenda
                </button>
                <button onClick={() => setActiveSection("relatorios")}>
                  <Download size={20} />
                  Exportar Dados
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ CLÍNICAS ════════════════ */}
        {activeSection === "clinicas" && (
          <div className="section-content">
            <div className="section-toolbar">
              <div className="search-box">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar clínica por nome ou email..."
                  value={filtroClinica}
                  onChange={(e) => setFiltroClinica(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={() => setShowClinicaModal(true)}>
                <Plus size={18} />
                Nova Clínica
              </button>
            </div>

            <div className="clinicas-grid">
              {clinicasFiltradas.map(clinica => (
                <div key={clinica.id} className={`clinica-card ${clinica.status}`}>
                  <div className="clinica-header" style={{borderLeftColor: clinica.cor}}>
                    <div className="clinica-info">
                      <div className="clinica-avatar" style={{background: clinica.cor}}>
                        {clinica.nome[0].toUpperCase()}
                      </div>
                      <div>
                        <h4>{clinica.nome}</h4>
                        <span className={`status-badge ${clinica.status}`}>
                          {clinica.status === 'ativa' ? 'Ativa' : 
                           clinica.status === 'inativa' ? 'Inativa' : 'Suspensa'}
                        </span>
                      </div>
                    </div>
                    <div className="clinica-actions">
                      <button 
                        title="Editar"
                        onClick={() => setShowClinicaEdit(clinica)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        title={clinica.status === 'ativa' ? 'Desativar' : 'Ativar'}
                        onClick={() => toggleClinicaStatus(clinica)}
                        className={clinica.status === 'ativa' ? 'danger' : 'success'}
                      >
                        {clinica.status === 'ativa' ? <PowerOff size={16} /> : <Power size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="clinica-dados">
                    <div className="dado-item">
                      <MapPin size={14} />
                      <span>{clinica.endereco || "—"}</span>
                    </div>
                    <div className="dado-item">
                      <Phone size={14} />
                      <span>{clinica.telefone || "—"}</span>
                    </div>
                    <div className="dado-item">
                      <Mail size={14} />
                      <span>{clinica.email || "—"}</span>
                    </div>
                  </div>

                  <div className="clinica-stats">
                    <div className="stat-box">
                      <Stethoscope size={16} />
                      <span>{clinica.totalMedicos}</span>
                      <small>Médicos</small>
                    </div>
                    <div className="stat-box">
                      <Users size={16} />
                      <span>{clinica.totalPacientes}</span>
                      <small>Pacientes</small>
                    </div>
                    <div className="stat-box">
                      <Calendar size={16} />
                      <span>{clinica.consultasMes}</span>
                      <small>Consultas/mês</small>
                    </div>
                    <div className="stat-box highlight">
                      <DollarSign size={16} />
                      <span>{formatarMoeda(clinica.faturamentoMes)}</span>
                      <small>Faturamento</small>
                    </div>
                  </div>
                </div>
              ))}
              
              {clinicasFiltradas.length === 0 && (
                <div className="empty-state">
                  <Building2 size={48} />
                  <p>Nenhuma clínica encontrada</p>
                  <button onClick={() => setShowClinicaModal(true)}>
                    Cadastrar primeira clínica
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════ USUÁRIOS ════════════════ */}
        {activeSection === "usuarios" && (
          <div className="section-content">
            <div className="section-toolbar">
              <div className="search-box">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar usuário por nome, email ou clínica..."
                  value={filtroUsuario}
                  onChange={(e) => setFiltroUsuario(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={() => setShowUsuarioModal(true)}>
                <UserPlus size={18} />
                Novo Usuário
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Tipo</th>
                    <th>Clínica</th>
                    <th>Contato</th>
                    <th>Último Acesso</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="user-cell">
                          <div className={`user-avatar tipo-${u.tipo}`}>
                            {u.username[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="user-name">{u.username}</p>
                            <p className="user-email">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`tipo-badge ${u.tipo}`}>
                          {u.tipo === 'admin' ? 'Admin' :
                           u.tipo === 'medico' ? 'Médico' :
                           u.tipo === 'recepcionista' ? 'Recepção' : 'Paciente'}
                        </span>
                      </td>
                      <td>{u.clinicaNome || "—"}</td>
                      <td>{u.telefone || "—"}</td>
                      <td>{u.ultimoAcesso}</td>
                      <td>
                        <span className={`status-dot ${u.status}`}>
                          {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button title="Editar"><Edit2 size={16} /></button>
                          <button 
                            title="Remover" 
                            className="danger"
                            onClick={() => deletarUsuario(u.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {usuariosFiltrados.length === 0 && (
                <div className="table-empty">
                  <Users size={48} />
                  <p>Nenhum usuário encontrado</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════ AGENDA ════════════════ */}
        {activeSection === "agenda" && (
          <div className="section-content">
            <div className="section-toolbar">
              <div className="filtros-agenda">
                <select 
                  value={filtroConsultaStatus}
                  onChange={(e) => setFiltroConsultaStatus(e.target.value)}
                >
                  <option value="todas">Todas as consultas</option>
                  <option value="agendada">Agendadas</option>
                  <option value="confirmada">Confirmadas</option>
                  <option value="concluida">Concluídas</option>
                  <option value="cancelada">Canceladas</option>
                </select>
                
                <input 
                  type="date" 
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                  placeholder="De"
                />
                <input 
                  type="date" 
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  placeholder="Até"
                />
                
                <button onClick={() => {
                  setFiltroConsultaStatus("todas");
                  setFiltroDataInicio("");
                  setFiltroDataFim("");
                }}>
                  <RefreshCw size={16} />
                  Limpar
                </button>
              </div>
              
              <button className="btn-primary">
                <Download size={18} />
                Exportar
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Paciente</th>
                    <th>Médico</th>
                    <th>Clínica</th>
                    <th>Motivo</th>
                    <th>Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {consultasPaginadas.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div className="data-hora">
                          <span className="data">{formatarData(c.data)}</span>
                          <span className="hora">{c.hora}</span>
                        </div>
                      </td>
                      <td>{c.paciente}</td>
                      <td>
                        <div className="medico-cell">
                          <Stethoscope size={14} />
                          {c.medico}
                        </div>
                      </td>
                      <td>
                        <span 
                          className="clinica-tag"
                          style={{
                            background: clinicas.find(cl => cl.id === c.clinicaId)?.cor + '20',
                            color: clinicas.find(cl => cl.id === c.clinicaId)?.cor
                          }}
                        >
                          {c.clinica}
                        </span>
                      </td>
                      <td>{c.motivo || "—"}</td>
                      <td>{c.valor ? formatarMoeda(c.valor) : "—"}</td>
                      <td>
                        <span className={`consulta-status ${c.status}`}>
                          {c.status === 'agendada' ? 'Agendada' :
                           c.status === 'confirmada' ? 'Confirmada' :
                           c.status === 'concluida' ? 'Concluída' : 'Cancelada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Paginação */}
              {totalPaginas > 1 && (
                <div className="pagination">
                  <button 
                    disabled={paginaAtual === 1}
                    onClick={() => setPaginaAtual(p => p - 1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {Array.from({length: totalPaginas}, (_, i) => i + 1).map(p => (
                    <button 
                      key={p}
                      className={paginaAtual === p ? 'active' : ''}
                      onClick={() => setPaginaAtual(p)}
                    >
                      {p}
                    </button>
                  ))}
                  
                  <button 
                    disabled={paginaAtual === totalPaginas}
                    onClick={() => setPaginaAtual(p => p + 1)}
                  >
                    <ChevronRightIcon size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════ FINANCEIRO (Placeholder) ════════════════ */}
        {activeSection === "financeiro" && (
          <div className="section-content">
            <div className="placeholder-section">
              <Wallet size={64} />
              <h3>Módulo Financeiro</h3>
              <p>Em desenvolvimento. Aqui terá:</p>
              <ul>
                <li>Faturamento por clínica</li>
                <li>Comissões de médicos</li>
                <li>Inadimplência</li>
                <li>Previsões de receita</li>
              </ul>
            </div>
          </div>
        )}

        {/* ════════════════ RELATÓRIOS (Placeholder) ════════════════ */}
        {activeSection === "relatorios" && (
          <div className="section-content">
            <div className="placeholder-section">
              <FileText size={64} />
              <h3>Relatórios</h3>
              <p>Em desenvolvimento. Aqui terá:</p>
              <ul>
                <li>Relatório de consultas (PDF/Excel)</li>
                <li>Relatório de usuários</li>
                <li>Relatório financeiro</li>
                <li>Agendamentos automáticos</li>
              </ul>
            </div>
          </div>
        )}

        {/* ════════════════ CONFIGURAÇÕES (Placeholder) ════════════════ */}
        {activeSection === "configuracoes" && (
          <div className="section-content">
            <div className="placeholder-section">
              <Settings size={64} />
              <h3>Configurações do Sistema</h3>
              <p>Em desenvolvimento. Aqui terá:</p>
              <ul>
                <li>Horários de funcionamento padrão</li>
                <li>Especialidades médicas</li>
                <li>Planos de saúde aceitos</li>
                <li>Integrações (WhatsApp, Email)</li>
                <li>Backup e segurança</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* ─── MODAL: Nova Clínica ─── */}
      {showClinicaModal && (
        <div className="modal-overlay" onClick={() => setShowClinicaModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Building2 size={20} /> Nova Clínica</h3>
              <button onClick={() => setShowClinicaModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <label>Nome da Clínica *</label>
              <input 
                type="text" 
                value={clinicaForm.nome}
                onChange={e => setClinicaForm(f => ({...f, nome: e.target.value}))}
                placeholder="Ex: Clínica Saúde Total"
              />
              
              <label>CNPJ</label>
              <input 
                type="text" 
                value={clinicaForm.cnpj}
                onChange={e => setClinicaForm(f => ({...f, cnpj: e.target.value}))}
                placeholder="00.000.000/0000-00"
              />
              
              <label>Endereço</label>
              <input 
                type="text" 
                value={clinicaForm.endereco}
                onChange={e => setClinicaForm(f => ({...f, endereco: e.target.value}))}
                placeholder="Rua, número, bairro, cidade"
              />
              
              <div className="form-row">
                <div>
                  <label>Telefone *</label>
                  <input 
                    type="text" 
                    value={clinicaForm.telefone}
                    onChange={e => setClinicaForm(f => ({...f, telefone: e.target.value}))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label>Email *</label>
                  <input 
                    type="email" 
                    value={clinicaForm.email}
                    onChange={e => setClinicaForm(f => ({...f, email: e.target.value}))}
                    placeholder="contato@clinica.com"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowClinicaModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn-primary" 
                onClick={criarClinica}
                disabled={!clinicaForm.nome || !clinicaForm.telefone || !clinicaForm.email}
              >
                <Plus size={16} />
                Criar Clínica
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Editar Clínica ─── */}
      {showClinicaEdit && (
        <div className="modal-overlay" onClick={() => setShowClinicaEdit(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Edit2 size={20} /> Editar Clínica</h3>
              <button onClick={() => setShowClinicaEdit(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <label>Nome</label>
              <input 
                type="text" 
                value={showClinicaEdit.nome}
                onChange={e => setShowClinicaEdit({...showClinicaEdit, nome: e.target.value})}
              />
              
              <label>Endereço</label>
              <input 
                type="text" 
                value={showClinicaEdit.endereco || ""}
                onChange={e => setShowClinicaEdit({...showClinicaEdit, endereco: e.target.value})}
              />
              
              <div className="form-row">
                <div>
                  <label>Telefone</label>
                  <input 
                    type="text" 
                    value={showClinicaEdit.telefone || ""}
                    onChange={e => setShowClinicaEdit({...showClinicaEdit, telefone: e.target.value})}
                  />
                </div>
                <div>
                  <label>Email</label>
                  <input 
                    type="email" 
                    value={showClinicaEdit.email || ""}
                    onChange={e => setShowClinicaEdit({...showClinicaEdit, email: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowClinicaEdit(null)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={atualizarClinica}>
                <CheckCircle size={16} />
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Novo Usuário ─── */}
      {showUsuarioModal && (
        <div className="modal-overlay" onClick={() => setShowUsuarioModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><UserPlus size={20} /> Novo Usuário</h3>
              <button onClick={() => setShowUsuarioModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div>
                  <label>Nome de usuário *</label>
                  <input 
                    type="text" 
                    value={usuarioForm.username}
                    onChange={e => setUsuarioForm(f => ({...f, username: e.target.value}))}
                    placeholder="joao.silva"
                  />
                </div>
                <div>
                  <label>Tipo *</label>
                  <select 
                    value={usuarioForm.tipo}
                    onChange={e => setUsuarioForm(f => ({...f, tipo: e.target.value}))}
                  >
                    <option value="medico">Médico</option>
                    <option value="recepcionista">Recepcionista</option>
                    <option value="admin">Admin de Clínica</option>
                    <option value="paciente">Paciente</option>
                  </select>
                </div>
              </div>
              
              <label>Email *</label>
              <input 
                type="email" 
                value={usuarioForm.email}
                onChange={e => setUsuarioForm(f => ({...f, email: e.target.value}))}
                placeholder="joao@clinica.com"
              />
              
              <label>Senha *</label>
              <input 
                type="password" 
                value={usuarioForm.password}
                onChange={e => setUsuarioForm(f => ({...f, password: e.target.value}))}
                placeholder="••••••••"
              />
              
              <label>Clínica *</label>
              <select 
                value={usuarioForm.clinicaId}
                onChange={e => setUsuarioForm(f => ({...f, clinicaId: e.target.value}))}
              >
                <option value="">Selecione uma clínica...</option>
                {clinicas.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              
              {usuarioForm.tipo === 'medico' && (
                <>
                  <label>Especialidade</label>
                  <input 
                    type="text" 
                    value={usuarioForm.especialidade}
                    onChange={e => setUsuarioForm(f => ({...f, especialidade: e.target.value}))}
                    placeholder="Ex: Cardiologia"
                  />
                </>
              )}
              
              <label>Telefone</label>
              <input 
                type="text" 
                value={usuarioForm.telefone}
                onChange={e => setUsuarioForm(f => ({...f, telefone: e.target.value}))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowUsuarioModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn-primary" 
                onClick={criarUsuario}
                disabled={!usuarioForm.username || !usuarioForm.email || !usuarioForm.password || !usuarioForm.clinicaId}
              >
                <UserPlus size={16} />
                Criar Usuário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --accent-blue: #3b82f6;
  --accent-green: #22c55e;
  --accent-yellow: #eab308;
  --accent-red: #ef4444;
  --accent-purple: #a855f7;
  --border-color: #334155;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
  --radius: 8px;
}

body {
  font-family: 'Inter', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* Loading */
.loading-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--bg-primary);
}

.loading-icon {
  color: var(--accent-blue);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Layout */
.dashboard {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  width: 260px;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--accent-blue);
}

.logo h1 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.logo span {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 24px;
}

.nav-label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  padding: 0 12px;
  margin-bottom: 8px;
}

.sidebar-nav button {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  position: relative;
}

.sidebar-nav button:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.sidebar-nav button.active {
  background: var(--accent-blue);
  color: white;
}

.badge {
  margin-left: auto;
  background: var(--accent-red);
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.user-role {
  font-size: 11px;
  color: var(--text-muted);
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border-radius: var(--radius);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.logout-btn:hover {
  border-color: var(--accent-red);
  color: var(--accent-red);
  background: rgba(239, 68, 68, 0.1);
}

/* Main Content */
.main-content {
  margin-left: 260px;
  padding: 24px;
  min-height: 100vh;
}

.main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.header-left h2 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.breadcrumb {
  font-size: 12px;
  color: var(--text-muted);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-time {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 14px;
}

.notificacoes-wrapper {
  position: relative;
}

.notificacao-btn {
  position: relative;
  padding: 8px;
  border-radius: var(--radius);
  color: var(--text-secondary);
  transition: all 0.2s;
}

.notificacao-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.notif-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent-red);
  color: white;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notificacoes-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  width: 320px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  z-index: 100;
}

.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.notif-header h4 {
  font-size: 14px;
  font-weight: 600;
}

.notif-header button {
  font-size: 11px;
  color: var(--accent-blue);
}

.notif-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.notif-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.2s;
}

.notif-item:hover {
  background: var(--bg-tertiary);
}

.notif-item.nao-lida {
  background: rgba(59, 130, 246, 0.05);
}

.notif-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notif-icon.error { background: rgba(239, 68, 68, 0.2); color: var(--accent-red); }
.notif-icon.warning { background: rgba(234, 179, 8, 0.2); color: var(--accent-yellow); }
.notif-icon.success { background: rgba(34, 197, 94, 0.2); color: var(--accent-green); }
.notif-icon.info { background: rgba(59, 130, 246, 0.2); color: var(--accent-blue); }

.notif-content {
  flex: 1;
}

.notif-titulo {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 2px;
}

.notif-mensagem {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.notif-data {
  font-size: 11px;
  color: var(--text-muted);
}

.refresh-btn {
  padding: 8px;
  border-radius: var(--radius);
  color: var(--text-secondary);
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Section Content */
.section-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.kpi-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  transition: all 0.2s;
}

.kpi-card:hover {
  border-color: var(--accent-blue);
}

.kpi-card.highlight {
  background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(59, 130, 246, 0.1) 100%);
  border-color: var(--accent-blue);
}

.kpi-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
}

.kpi-info h3 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.kpi-info p {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.kpi-sub {
  font-size: 11px;
  color: var(--text-muted);
}

.kpi-sub.positive {
  color: var(--accent-green);
}

.kpi-sub.negative {
  color: var(--accent-red);
}

/* Overview Grid */
.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.card-header h4 {
  font-size: 14px;
  font-weight: 600;
}

.card-header select,
.card-header button {
  font-size: 12px;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border-color);
  padding: 4px 8px;
  border-radius: 4px;
}

/* Clínicas Chart */
.clinicas-chart {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 140px;
  flex-shrink: 0;
}

.bar-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.bar-name {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-wrapper {
  flex: 1;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.bar-value {
  width: 40px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Activity List */
.activity-list {
  padding: 12px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius);
  transition: background 0.2s;
}

.activity-item:hover {
  background: var(--bg-tertiary);
}

.activity-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.activity-status.agendada { background: var(--accent-yellow); }
.activity-status.confirmada { background: var(--accent-blue); }
.activity-status.concluida { background: var(--accent-green); }
.activity-status.cancelada { background: var(--accent-red); }

.activity-content {
  flex: 1;
}

.activity-content p {
  font-size: 13px;
  margin-bottom: 2px;
}

.activity-content span {
  font-size: 11px;
  color: var(--text-muted);
}

.status-tag {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 10px;
}

.status-tag.agendada { background: rgba(234, 179, 8, 0.2); color: var(--accent-yellow); }
.status-tag.confirmada { background: rgba(59, 130, 246, 0.2); color: var(--accent-blue); }
.status-tag.concluida { background: rgba(34, 197, 94, 0.2); color: var(--accent-green); }
.status-tag.cancelada { background: rgba(239, 68, 68, 0.2); color: var(--accent-red); }

/* Quick Actions */
.quick-actions {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 20px;
}

.quick-actions h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.actions-grid button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  border-radius: var(--radius);
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  transition: all 0.2s;
}

.actions-grid button:hover {
  border-color: var(--accent-blue);
  color: var(--text-primary);
  background: var(--bg-secondary);
}

/* Section Toolbar */
.section-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 10px 16px;
  flex: 1;
  max-width: 400px;
}

.search-box svg {
  color: var(--text-muted);
}

.search-box input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.search-box input::placeholder {
  color: var(--text-muted);
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--accent-blue);
  color: white;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* Clínicas Grid */
.clinicas-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.clinica-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  overflow: hidden;
  transition: all 0.2s;
}

.clinica-card:hover {
  border-color: var(--accent-blue);
}

.clinica-card.inativa {
  opacity: 0.7;
}

.clinica-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-left: 4px solid;
}

.clinica-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.clinica-avatar {
  width: 44px;
  height: 44px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: white;
}

.clinica-info h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.status-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 10px;
}

.status-badge.ativa { background: rgba(34, 197, 94, 0.2); color: var(--accent-green); }
.status-badge.inativa { background: rgba(239, 68, 68, 0.2); color: var(--accent-red); }
.status-badge.suspensa { background: rgba(234, 179, 8, 0.2); color: var(--accent-yellow); }

.clinica-actions {
  display: flex;
  gap: 8px;
}

.clinica-actions button {
  width: 32px;
  height: 32px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.clinica-actions button:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.clinica-actions button.danger:hover {
  background: rgba(239, 68, 68, 0.2);
  color: var(--accent-red);
}

.clinica-actions button.success:hover {
  background: rgba(34, 197, 94, 0.2);
  color: var(--accent-green);
}

.clinica-dados {
  padding: 12px 20px;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dado-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.dado-item svg {
  color: var(--text-muted);
  flex-shrink: 0;
}

.clinica-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 16px 20px;
  gap: 12px;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
}

.stat-box svg {
  color: var(--text-muted);
}

.stat-box span {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-box small {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.stat-box.highlight span {
  color: var(--accent-blue);
}

/* Empty State */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: var(--text-muted);
  text-align: center;
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin-bottom: 16px;
}

.empty-state button {
  padding: 10px 20px;
  background: var(--accent-blue);
  color: white;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
}

/* Table Container */
.table-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.data-table tr:hover td {
  background: rgba(59, 130, 246, 0.05);
}

.data-table tr:last-child td {
  border-bottom: none;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-cell .user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.user-avatar.tipo-admin { background: var(--accent-red); }
.user-avatar.tipo-medico { background: var(--accent-green); }
.user-avatar.tipo-recepcionista { background: var(--accent-yellow); }
.user-avatar.tipo-paciente { background: var(--accent-purple); }

.user-name {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.user-email {
  font-size: 12px;
  color: var(--text-muted);
}

.tipo-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 10px;
}

.tipo-badge.admin { background: rgba(239, 68, 68, 0.2); color: var(--accent-red); }
.tipo-badge.medico { background: rgba(34, 197, 94, 0.2); color: var(--accent-green); }
.tipo-badge.recepcionista { background: rgba(234, 179, 8, 0.2); color: var(--accent-yellow); }
.tipo-badge.paciente { background: rgba(168, 85, 247, 0.2); color: var(--accent-purple); }

.status-dot {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.status-dot::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.ativo::before { background: var(--accent-green); }
.status-dot.inativo::before { background: var(--accent-red); }

.table-actions {
  display: flex;
  gap: 8px;
}

.table-actions button {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.table-actions button:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.table-actions button.danger:hover {
  background: rgba(239, 68, 68, 0.2);
  color: var(--accent-red);
}

.table-empty {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}

.table-empty svg {
  margin-bottom: 12px;
  opacity: 0.5;
}

/* Filtros Agenda */
.filtros-agenda {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filtros-agenda select,
.filtros-agenda input {
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-size: 13px;
}

.filtros-agenda button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  color: var(--text-secondary);
  font-size: 13px;
}

.filtros-agenda button:hover {
  color: var(--text-primary);
}

/* Data Hora */
.data-hora {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.data-hora .data {
  font-weight: 500;
  color: var(--text-primary);
}

.data-hora .hora {
  font-size: 12px;
  color: var(--text-muted);
}

.medico-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
}

.medico-cell svg {
  color: var(--accent-green);
}

.clinica-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.consulta-status {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 10px;
}

.consulta-status.agendada { background: rgba(234, 179, 8, 0.2); color: var(--accent-yellow); }
.consulta-status.confirmada { background: rgba(59, 130, 246, 0.2); color: var(--accent-blue); }
.consulta-status.concluida { background: rgba(34, 197, 94, 0.2); color: var(--accent-green); }
.consulta-status.cancelada { background: rgba(239, 68, 68, 0.2); color: var(--accent-red); }

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.pagination button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
}

.pagination button:hover:not(:disabled) {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.pagination button.active {
  background: var(--accent-blue);
  color: white;
}

.pagination button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Placeholder Section */
.placeholder-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px;
  text-align: center;
  color: var(--text-muted);
}

.placeholder-section svg {
  margin-bottom: 24px;
  opacity: 0.3;
}

.placeholder-section h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.placeholder-section p {
  margin-bottom: 16px;
}

.placeholder-section ul {
  text-align: left;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.8;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlide 0.2s ease;
}

@keyframes modalSlide {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
}

.modal-header h3 svg {
  color: var(--accent-blue);
}

.modal-header button {
  color: var(--text-muted);
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-header button:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-body label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.modal-body input,
.modal-body select {
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.modal-body input:focus,
.modal-body select:focus {
  border-color: var(--accent-blue);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

/* Responsive */
@media (max-width: 1200px) {
  .kpi-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .overview-grid {
    grid-template-columns: 1fr;
  }
  
  .clinicas-grid {
    grid-template-columns: 1fr;
  }
  
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard {
    grid-template-columns: 1fr;
  }
  
  .sidebar {
    display: none;
  }
  
  .main-content {
    margin-left: 0;
  }
  
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .clinica-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
`;