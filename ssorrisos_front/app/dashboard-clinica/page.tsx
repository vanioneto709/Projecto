"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Building2, Users, Calendar, Stethoscope, DollarSign,
  Bell, LogOut, Plus, Search, Edit2, Trash2, CheckCircle,
  XCircle, AlertCircle, Clock, Phone, Mail, UserPlus, X,
  ChevronLeft, ChevronRight, TriangleAlert, RefreshCw,
  Activity, FileText, TrendingUp, MessageSquare, Send
} from "lucide-react";
import styles from "./dashboard-clinica.module.css";

// ─── Types ───────────────────────────────────────────────────
interface Stats {
  clinica: { id: number; nome: string; status: string };
  totalMedicos: number; totalPacientes: number;
  consultasHoje: number; consultasMes: number;
  consultasPendentes: number; faturamentoMes: number; ticketMedio: number;
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
interface Prontuario {
  id: number; pacienteId: number; pacienteNome: string;
  medicoPreferencial: { id: number; nome: string } | null;
  alergias: string; medicamentosEmUso: string;
  doencasSistemicas: string; observacoes: string;
  criadoEm: string; atualizadoEm: string; atualizadoPor: string;
  procedimentos: ProcedimentoD[]; anexos: AnexoD[];
}
interface ProcedimentoD {
  id: number; tipo: string; tipoLabel: string;
  dente: string; descricao: string; data: string; medico: string;
}
interface AnexoD {
  id: number; tipo: string; tipoLabel: string;
  titulo: string; dataExame: string; descricao: string; url: string;
}
interface Partilha {
  id: number; prontuarioId: number; pacienteNome: string; pacienteId: number;
  escopo: string; tipo: string; tipoLabel: string;
  estado: string; estadoLabel: string; mensagem: string; resposta: string;
  enviadoPor: string; clinicaOrigem: string; clinicaOrigemId: number | null;
  clinicaDestino: string | null; clinicaDestinoId: number | null;
  medicoDestino: string | null; medicoResponsavelDestino: string | null;
  criadoEm: string;
}
interface ClinicaExterna { id: number; nome: string; }
interface MedicoSimples { id: number; nome: string; especialidade: string; }
interface PacienteSimples { id: number; nome: string; }

// ── Mensagens ──
interface Conversa {
  id: number; comId: number; comNome: string; comTipo: string; comClinica: string;
  ultimaMensagem: string; ultimaData: string; naoLidas: number;
}
interface Mensagem {
  id: number; remetenteId: number | null; remetenteNome: string;
  minha: boolean; sistema: boolean; corpo: string; lida: boolean; criadaEm: string;
}
interface Contacto { id: number; nome: string; tipo: string; clinica: string; }

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
type NavSection = "overview" | "medicos" | "pacientes" | "consultas" | "prontuarios" | "partilhas" | "mensagens";
function authHeader(token: string) { return { Authorization: `Bearer ${token}` }; }

const STATUS_COLORS: Record<string, string> = {
  agendada: "#58A6FF", confirmada: "#3FB950", concluida: "#8B949E", cancelada: "#F85149",
};
const STATUS_LABELS: Record<string, string> = {
  agendada: "Agendada", confirmada: "Confirmada", concluida: "Concluída", cancelada: "Cancelada",
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

  // ── Prontuários ──
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [prontuarioAberto, setProntuarioAberto] = useState<Prontuario | null>(null);
  const [loadingProntuario, setLoadingProntuario] = useState(false);
  const [showNovoProntuario, setShowNovoProntuario] = useState(false);
  const [novoProntuarioPacId, setNovoProntuarioPacId] = useState("");
  const [novoProntuarioForm, setNovoProntuarioForm] = useState({
    alergias: "", medicamentosEmUso: "", doencasSistemicas: "", observacoes: "",
  });
  const [showProcedimento, setShowProcedimento] = useState(false);
  const [procForm, setProcForm] = useState({
    tipo: "consulta", dente: "", descricao: "", data: new Date().toISOString().split("T")[0],
  });
  const [showAnexo, setShowAnexo] = useState(false);
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [anexoForm, setAnexoForm] = useState({
    titulo: "", tipo: "raio_x_panoramico",
    dataExame: new Date().toISOString().split("T")[0], descricao: "",
  });

  // ── Partilhas ──
  const [partilhas, setPartilhas] = useState<Partilha[]>([]);
  const [clinicasExternas, setClinicasExternas] = useState<ClinicaExterna[]>([]);
  const [showNovaPartilha, setShowNovaPartilha] = useState(false);
  const [partilhaForm, setPartilhaForm] = useState({
    prontuarioId: "", escopo: "externa", tipo: "segunda_opiniao",
    mensagem: "", medicoDestinoId: "", clinicaDestinoId: "",
  });
  const [aceitarPartilhaId, setAceitarPartilhaId] = useState<number | null>(null);
  const [medicoResponsavelSel, setMedicoResponsavelSel] = useState("");

  // ── Mensagens ──
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAberta, setConversaAberta] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [showNovaConversa, setShowNovaConversa] = useState(false);
  const [buscaContacto, setBuscaContacto] = useState("");
  const [naoLidasTotal, setNaoLidasTotal] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const mensagensEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  };

  // Modais
  const [showSenhaModal, setShowSenhaModal] = useState(false);
  const [senhaTarget, setSenhaTarget] = useState<{ id: number; nome: string } | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [senhaErro, setSenhaErro] = useState("");
  const [senhaOk, setSenhaOk] = useState(false);
  const [showMedicoModal, setShowMedicoModal] = useState(false);
  const [showMedicoEdit, setShowMedicoEdit] = useState<Medico | null>(null);
  const [showConsultaModal, setShowConsultaModal] = useState(false);
  const [showConsultaEdit, setShowConsultaEdit] = useState<Consulta | null>(null);

  // Forms
  const [medicoForm, setMedicoForm] = useState({
    username: "", email: "", password: "", especialidade: "", crm: "", telefone: "",
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

  // ─── Auth ──────────────────────────────────────────────────
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
    const interval = setInterval(() => {
      carregarTudo();
      fetchNaoLidas();
    }, 60000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const carregarTudo = async () => {
    setLoading(true);
    try {
      await Promise.allSettled([
        fetchStats(), fetchMedicos(), fetchPacientes(),
        fetchConsultas(), fetchListas(),
        fetchProntuarios(), fetchPartilhas(), fetchConversas(), fetchNaoLidas(),
      ]);
    } finally { setLoading(false); }
  };

  // ─── Fetches existentes ────────────────────────────────────
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
  const fetchProntuarios = async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API_URL}/api/prontuarios/`, { headers: authHeader(token) });
      if (r.ok) setProntuarios(await r.json());
    } catch {}
  };
  const fetchPartilhas = async () => {
    if (!token) return;
    try {
      const [rP, rCE] = await Promise.all([
        fetch(`${API_URL}/api/partilhas/`, { headers: authHeader(token) }),
        fetch(`${API_URL}/api/clinicas/`, { headers: authHeader(token) }),
      ]);
      if (rP.ok) setPartilhas(await rP.json());
      if (rCE.ok) setClinicasExternas(await rCE.json());
    } catch {}
  };

  // ─── Fetches de Mensagens ─────────────────────────────────
  const fetchConversas = async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API_URL}/api/mensagens/`, { headers: authHeader(token) });
      if (r.ok) setConversas(await r.json());
    } catch {}
  };
  const fetchNaoLidas = async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API_URL}/api/mensagens/nao-lidas/`, { headers: authHeader(token) });
      if (r.ok) { const d = await r.json(); setNaoLidasTotal(d.naoLidas); }
    } catch {}
  };
  const fetchContactos = async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API_URL}/api/mensagens/contactos/`, { headers: authHeader(token) });
      if (r.ok) setContactos(await r.json());
    } catch {}
  };
  const abrirConversa = async (c: Conversa) => {
    setConversaAberta(c);
    if (!token) return;
    try {
      const r = await fetch(`${API_URL}/api/mensagens/${c.id}/`, { headers: authHeader(token) });
      if (r.ok) {
        setMensagens(await r.json());
        fetchConversas();
        fetchNaoLidas();
      }
    } catch {}
  };
  const enviarMensagem = async () => {
    if (!token || !conversaAberta || !novaMensagem.trim() || enviando) return;
    setEnviando(true);
    try {
      const r = await fetch(`${API_URL}/api/mensagens/${conversaAberta.id}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify({ mensagem: novaMensagem.trim() }),
      });
      if (r.ok) {
        const msg = await r.json();
        setMensagens(prev => [...prev, msg]);
        setNovaMensagem("");
        fetchConversas();
      }
    } catch {}
    finally { setEnviando(false); }
  };
  const iniciarConversa = async (contacto: Contacto) => {
    if (!token) return;
    try {
      const r = await fetch(`${API_URL}/api/mensagens/nova/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify({ destinatarioId: contacto.id, mensagem: "Olá!" }),
      });
      if (r.ok) {
        const data = await r.json();
        setShowNovaConversa(false);
        setBuscaContacto("");
        await fetchConversas();
        const conv = conversas.find(c => c.id === data.conversaId) || {
          id: data.conversaId, comId: contacto.id, comNome: contacto.nome,
          comTipo: contacto.tipo, comClinica: contacto.clinica,
          ultimaMensagem: "Olá!", ultimaData: "", naoLidas: 0,
        };
        abrirConversa(conv as Conversa);
      }
    } catch {}
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
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `HTTP ${res.status}`); }
      setShowMedicoModal(false);
      setMedicoForm({ username: "", email: "", password: "", especialidade: "", crm: "", telefone: "" });
      await fetchMedicos(); await fetchListas(); await fetchStats();
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
      setShowMedicoEdit(null); await fetchMedicos(); showToast("Médico atualizado!");
    } catch (err: any) { showToast(err.message, "err"); }
  };
  const removerMedico = async (id: number) => {
    if (!token) return;
    if (!window.confirm("Remover este médico da clínica?")) return;
    try {
      const res = await fetch(`${API_URL}/api/minha-clinica/medicos/${id}/`, { method: "DELETE", headers: authHeader(token) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchMedicos(); await fetchStats(); showToast("Médico removido");
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
        body: JSON.stringify({ medico: consultaForm.medico, paciente: consultaForm.paciente, data: consultaForm.data, hora: consultaForm.hora, motivo: consultaForm.motivo, valor: consultaForm.valor || null }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `HTTP ${res.status}`); }
      setShowConsultaModal(false);
      setConsultaForm({ medico: "", paciente: "", data: "", hora: "", motivo: "", valor: "" });
      await fetchConsultas(); await fetchStats(); showToast("Consulta criada!");
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
      await fetchConsultas(); await fetchStats(); showToast("Status atualizado!");
    } catch (err: any) { showToast(err.message, "err"); }
  };

  const logout = () => {
    localStorage.removeItem("access"); localStorage.removeItem("refresh");
    document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
    window.location.replace("/login");
  };
  const abrirModalSenha = (id: number, nome: string) => {
    setSenhaTarget({ id, nome }); setNovaSenha(""); setSenhaErro(""); setSenhaOk(false); setShowSenhaModal(true);
  };
  const alterarSenha = async () => {
    if (!token || !senhaTarget) return;
    if (novaSenha.length < 6) { setSenhaErro("Mínimo 6 caracteres"); return; }
    setSenhaErro("");
    try {
      const r = await fetch(`${API_URL}/api/minha-clinica/usuarios/${senhaTarget.id}/senha/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify({ novaSenha }),
      });
      if (r.ok) { setSenhaOk(true); setTimeout(() => setShowSenhaModal(false), 1500); }
      else { const e = await r.json(); setSenhaErro(e.error || "Erro ao alterar"); }
    } catch { setSenhaErro("Erro de ligação"); }
  };

  const formatarMoeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  // ── Prontuários ──
  const abrirProntuario = async (pacienteId: number) => {
    if (!token) return; setLoadingProntuario(true);
    try {
      const r = await fetch(`${API_URL}/api/prontuarios/${pacienteId}/`, { headers: authHeader(token) });
      if (r.ok) setProntuarioAberto(await r.json()); else showToast("Prontuário não encontrado", "err");
    } catch {} finally { setLoadingProntuario(false); }
  };
  const criarProntuario = async () => {
    if (!token || !novoProntuarioPacId) { showToast("Selecciona um paciente", "err"); return; }
    try {
      const r = await fetch(`${API_URL}/api/prontuarios/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify({ pacienteId: Number(novoProntuarioPacId), ...novoProntuarioForm }),
      });
      if (r.ok) {
        showToast("Prontuário criado!"); setShowNovoProntuario(false); setNovoProntuarioPacId("");
        setNovoProntuarioForm({ alergias: "", medicamentosEmUso: "", doencasSistemicas: "", observacoes: "" });
        await fetchProntuarios();
      } else { const e = await r.json(); showToast(e.error || "Erro ao criar", "err"); }
    } catch { showToast("Erro ao criar", "err"); }
  };
  const salvarProntuario = async () => {
    if (!token || !prontuarioAberto) return;
    try {
      const r = await fetch(`${API_URL}/api/prontuarios/${prontuarioAberto.pacienteId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify({ alergias: prontuarioAberto.alergias, medicamentosEmUso: prontuarioAberto.medicamentosEmUso, doencasSistemicas: prontuarioAberto.doencasSistemicas, observacoes: prontuarioAberto.observacoes }),
      });
      if (r.ok) { showToast("Guardado!"); setProntuarioAberto(await r.json()); } else showToast("Erro ao guardar", "err");
    } catch { showToast("Erro", "err"); }
  };
  const adicionarProcedimento = async () => {
    if (!token || !prontuarioAberto) return;
    try {
      const r = await fetch(`${API_URL}/api/prontuarios/${prontuarioAberto.pacienteId}/procedimentos/`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader(token) }, body: JSON.stringify(procForm),
      });
      if (r.ok) {
        showToast("Procedimento adicionado!"); setShowProcedimento(false);
        setProcForm({ tipo: "consulta", dente: "", descricao: "", data: new Date().toISOString().split("T")[0] });
        await abrirProntuario(prontuarioAberto.pacienteId);
      } else showToast("Erro", "err");
    } catch { showToast("Erro", "err"); }
  };
  const removerProcedimento = async (procId: number) => {
    if (!token || !prontuarioAberto || !confirm("Remover procedimento?")) return;
    const r = await fetch(`${API_URL}/api/prontuarios/procedimentos/${procId}/`, { method: "DELETE", headers: authHeader(token) });
    if (r.ok) { showToast("Removido"); await abrirProntuario(prontuarioAberto.pacienteId); }
  };
  const uploadAnexo = async () => {
    if (!token || !prontuarioAberto || !anexoFile) { showToast("Selecciona um ficheiro", "err"); return; }
    const fd = new FormData();
    fd.append("arquivo", anexoFile); fd.append("titulo", anexoForm.titulo || anexoFile.name);
    fd.append("tipo", anexoForm.tipo); fd.append("dataExame", anexoForm.dataExame); fd.append("descricao", anexoForm.descricao);
    try {
      const r = await fetch(`${API_URL}/api/prontuarios/${prontuarioAberto.pacienteId}/anexos/`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (r.ok) {
        showToast("Anexo enviado!"); setShowAnexo(false); setAnexoFile(null);
        setAnexoForm({ titulo: "", tipo: "raio_x_panoramico", dataExame: new Date().toISOString().split("T")[0], descricao: "" });
        await abrirProntuario(prontuarioAberto.pacienteId);
      } else showToast("Erro ao enviar", "err");
    } catch { showToast("Erro", "err"); }
  };
  const removerAnexo = async (anexoId: number) => {
    if (!token || !prontuarioAberto || !confirm("Remover anexo?")) return;
    const r = await fetch(`${API_URL}/api/prontuarios/anexos/${anexoId}/`, { method: "DELETE", headers: authHeader(token) });
    if (r.ok) { showToast("Removido"); await abrirProntuario(prontuarioAberto.pacienteId); }
  };
  const apagarProntuario = async (pacienteId: number) => {
    if (!token || !confirm("Apagar prontuário permanentemente?")) return;
    const r = await fetch(`${API_URL}/api/prontuarios/${pacienteId}/`, { method: "DELETE", headers: authHeader(token) });
    if (r.ok) { showToast("Prontuário apagado"); setProntuarioAberto(null); await fetchProntuarios(); }
    else showToast("Erro ao apagar", "err");
  };

  // ── Partilhas ──
  const enviarPartilha = async () => {
    if (!token || !partilhaForm.prontuarioId) { showToast("Selecciona um prontuário", "err"); return; }
    const body: any = { prontuarioId: Number(partilhaForm.prontuarioId), escopo: partilhaForm.escopo, tipo: partilhaForm.tipo, mensagem: partilhaForm.mensagem };
    if (partilhaForm.escopo === "interna") body.medicoDestinoId = Number(partilhaForm.medicoDestinoId);
    else body.clinicaDestinoId = Number(partilhaForm.clinicaDestinoId);
    try {
      const r = await fetch(`${API_URL}/api/partilhas/`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeader(token) }, body: JSON.stringify(body) });
      if (r.ok) {
        showToast("Partilha enviada!"); setShowNovaPartilha(false);
        setPartilhaForm({ prontuarioId: "", escopo: "externa", tipo: "segunda_opiniao", mensagem: "", medicoDestinoId: "", clinicaDestinoId: "" });
        await fetchPartilhas();
      } else { const e = await r.json(); showToast(e.error || "Erro", "err"); }
    } catch { showToast("Erro", "err"); }
  };
  const responderPartilha = async (id: number, acao: "aceitar" | "recusar") => {
    if (!token) return;
    if (acao === "aceitar" && !medicoResponsavelSel) { showToast("Selecciona um médico responsável", "err"); return; }
    const body: any = { acao };
    if (acao === "aceitar") body.medicoResponsavelId = Number(medicoResponsavelSel);
    const r = await fetch(`${API_URL}/api/partilhas/${id}/responder/`, { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeader(token) }, body: JSON.stringify(body) });
    if (r.ok) { showToast(acao === "aceitar" ? "Partilha aceite!" : "Partilha recusada"); setAceitarPartilhaId(null); setMedicoResponsavelSel(""); await fetchPartilhas(); }
    else showToast("Erro", "err");
  };

  // Filtros
  const medicosFiltrados = medicos.filter(m => m.nome.toLowerCase().includes(filtroMedico.toLowerCase()) || m.especialidade.toLowerCase().includes(filtroMedico.toLowerCase()));
  const pacientesFiltrados = pacientes.filter(p => p.nome.toLowerCase().includes(filtroPaciente.toLowerCase()) || p.email.toLowerCase().includes(filtroPaciente.toLowerCase()));
  const consultasFiltradas = consultas.filter(c => filtroConsultaStatus === "todas" || c.status === filtroConsultaStatus);
  const totalPaginas = Math.ceil(consultasFiltradas.length / itensPorPagina);
  const consultasPaginadas = consultasFiltradas.slice((paginaConsultas - 1) * itensPorPagina, paginaConsultas * itensPorPagina);
  const contactosFiltrados = contactos.filter(c => c.nome.toLowerCase().includes(buscaContacto.toLowerCase()));

  if (!token || loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0d1117", color: "#e6edf3", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid #30363d", borderTop: "3px solid #58A6FF", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <p>Carregando dashboard...</p>
    </div>
  );

  const navItems: [NavSection, any, string, number][] = [
    ["overview",    TrendingUp,    "Visão Geral",  0],
    ["medicos",     Stethoscope,   "Médicos",      medicos.length],
    ["pacientes",   Users,         "Pacientes",    pacientes.length],
    ["consultas",   Calendar,      "Consultas",    consultas.filter(c => c.status === "agendada").length],
    ["prontuarios", FileText,      "Prontuários",  0],
    ["partilhas",   Bell,          "Partilhas",    partilhas.filter(p => p.estado === "pendente").length],
    ["mensagens",   MessageSquare, "Mensagens",    naoLidasTotal],
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0d1117", color: "#e6edf3", fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.type === "ok" ? "#1a3a2a" : "#3a1a1a", border: `1px solid ${toast.type === "ok" ? "#3FB950" : "#F85149"}`, color: toast.type === "ok" ? "#3FB950" : "#F85149", padding: "12px 20px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.4)", fontSize: 14 }}>
          {toast.type === "ok" ? <CheckCircle size={16} /> : <TriangleAlert size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside style={{ width: 240, background: "#161b22", borderRight: "1px solid #30363d", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #30363d" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ background: "#1f6feb", borderRadius: 8, padding: 7, display: "flex" }}>
              <Building2 size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#e6edf3" }}>{stats?.clinica.nome || "Minha Clínica"}</div>
              <div style={{ fontSize: 11, color: "#8b949e" }}>Painel da Clínica</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "16px 12px" }}>
          {navItems.map(([id, Icon, label, count]) => (
            <button key={id} onClick={() => { setActiveSection(id); if (id === "mensagens") { fetchConversas(); fetchNaoLidas(); } }} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: activeSection === id ? "#1f2937" : "transparent",
              color: activeSection === id ? "#e6edf3" : "#8b949e",
              marginBottom: 2, fontSize: 14, transition: "all 0.15s",
            }}>
              <Icon size={16} />
              <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
              {count > 0 && (
                <span style={{ background: id === "mensagens" ? "#F85149" : id === "consultas" ? "#1f6feb" : "#21262d", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>{count}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: "16px 12px", borderTop: "1px solid #30363d" }}>
          <div style={{ fontSize: 13, color: "#8b949e", marginBottom: 8, paddingLeft: 4 }}>{user?.username}</div>
          <button onClick={logout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "#8b949e", fontSize: 13 }}>
            <LogOut size={15} /> Sair
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 32px", borderBottom: "1px solid #30363d", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#161b22", position: "sticky", top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
              {{ overview: "Visão Geral", medicos: "Médicos", pacientes: "Pacientes", consultas: "Consultas", prontuarios: "Prontuários", partilhas: "Partilhas", mensagens: "Mensagens" }[activeSection]}
            </h1>
            <p style={{ fontSize: 12, color: "#8b949e", margin: "2px 0 0" }}>
              {stats?.clinica.nome} · {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <button onClick={carregarTudo} style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 8, color: "#8b949e", padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>

        <div style={{ padding: 32, flex: 1 }}>

          {/* ══ OVERVIEW ══ */}
          {activeSection === "overview" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
                {[
                  { label: "Médicos", value: stats?.totalMedicos ?? 0, icon: Stethoscope, color: "#58A6FF" },
                  { label: "Pacientes", value: stats?.totalPacientes ?? 0, icon: Users, color: "#3FB950" },
                  { label: "Consultas Hoje", value: stats?.consultasHoje ?? 0, icon: Calendar, color: "#D29922" },
                  { label: "Consultas no Mês", value: stats?.consultasMes ?? 0, icon: Activity, color: "#A371F7" },
                  { label: "Faturamento Mês", value: formatarMoeda(stats?.faturamentoMes ?? 0), icon: DollarSign, color: "#3FB950", isText: true },
                  { label: "Ticket Médio", value: formatarMoeda(stats?.ticketMedio ?? 0), icon: TrendingUp, color: "#58A6FF", isText: true },
                ].map(({ label, value, icon: Icon, color, isText }) => (
                  <div key={label} style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{ fontSize: 13, color: "#8b949e" }}>{label}</span>
                      <div style={{ background: `${color}22`, borderRadius: 8, padding: 8 }}><Icon size={16} color={color} /></div>
                    </div>
                    <div style={{ fontSize: isText ? 20 : 28, fontWeight: 700, color: "#e6edf3" }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Próximas Consultas</h2>
                  <button onClick={() => setActiveSection("consultas")} style={{ background: "transparent", border: "none", color: "#58A6FF", cursor: "pointer", fontSize: 13 }}>Ver todas →</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {consultas.filter(c => c.status === "agendada").slice(0, 5).map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#0d1117", borderRadius: 8, border: "1px solid #21262d" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ background: "#1f2937", borderRadius: 8, padding: 8 }}><Calendar size={14} color="#58A6FF" /></div>
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
                    <div style={{ color: "#8b949e", textAlign: "center", padding: 24, fontSize: 14 }}>Nenhuma consulta agendada</div>
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
                  <input value={filtroMedico} onChange={e => setFiltroMedico(e.target.value)} placeholder="Buscar médico..." style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px 9px 36px", fontSize: 14, width: 280, outline: "none" }} />
                </div>
                <button onClick={() => setShowMedicoModal(true)} style={{ background: "#1f6feb", border: "none", borderRadius: 8, color: "#fff", padding: "9px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500 }}>
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
                          <span style={{ background: m.status === "ativo" ? "#1a3a2a" : "#2a1a1a", color: m.status === "ativo" ? "#3FB950" : "#F85149", borderRadius: 6, padding: "3px 10px", fontSize: 12 }}>{m.status}</span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => { setMedicoEditForm({ email: m.email, especialidade: m.especialidade, crm: m.crm, telefone: m.telefone, status: m.status }); setShowMedicoEdit(m); }} style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#8b949e", padding: "6px 10px", cursor: "pointer" }}><Edit2 size={13} /></button>
                            <button onClick={() => abrirModalSenha(m.id, m.nome)} title="Alterar senha" style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#8b949e", padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>🔑</button>
                            <button onClick={() => removerMedico(m.id)} style={{ background: "#2a1a1a", border: "1px solid #3a2020", borderRadius: 6, color: "#F85149", padding: "6px 10px", cursor: "pointer" }}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {medicosFiltrados.length === 0 && <div style={{ color: "#8b949e", textAlign: "center", padding: 40, fontSize: 14 }}>Nenhum médico encontrado</div>}
              </div>
            </div>
          )}

          {/* ══ PACIENTES ══ */}
          {activeSection === "pacientes" && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8b949e" }} />
                  <input value={filtroPaciente} onChange={e => setFiltroPaciente(e.target.value)} placeholder="Buscar paciente..." style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px 9px 36px", fontSize: 14, width: 280, outline: "none" }} />
                </div>
              </div>
              <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #30363d" }}>
                      {["Paciente", "Contato", "Última Consulta", "Total Consultas", "Ações"].map(h => (
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
                        <td style={{ padding: "14px 16px", fontSize: 14, color: "#8b949e" }}>{p.ultimaConsulta ? new Date(p.ultimaConsulta + "T00:00").toLocaleDateString("pt-BR") : "—"}</td>
                        <td style={{ padding: "14px 16px", fontSize: 14 }}>{p.totalConsultas}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <button onClick={() => abrirModalSenha(p.id, p.nome)} title="Alterar senha" style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#8b949e", padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>🔑 Senha</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pacientesFiltrados.length === 0 && <div style={{ color: "#8b949e", textAlign: "center", padding: 40, fontSize: 14 }}>Nenhum paciente encontrado</div>}
              </div>
            </div>
          )}

          {/* ══ CONSULTAS ══ */}
          {activeSection === "consultas" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  {["todas", "agendada", "confirmada", "concluida", "cancelada"].map(s => (
                    <button key={s} onClick={() => { setFiltroConsultaStatus(s); setPaginaConsultas(1); }} style={{ background: filtroConsultaStatus === s ? "#1f6feb" : "#21262d", border: `1px solid ${filtroConsultaStatus === s ? "#1f6feb" : "#30363d"}`, borderRadius: 8, color: filtroConsultaStatus === s ? "#fff" : "#8b949e", padding: "7px 14px", cursor: "pointer", fontSize: 13 }}>
                      {s === "todas" ? "Todas" : STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowConsultaModal(true)} style={{ background: "#1f6feb", border: "none", borderRadius: 8, color: "#fff", padding: "9px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500 }}>
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
                          <span style={{ background: `${STATUS_COLORS[c.status]}22`, color: STATUS_COLORS[c.status], borderRadius: 6, padding: "3px 10px", fontSize: 12 }}>{STATUS_LABELS[c.status]}</span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <select value={c.status} onChange={e => atualizarStatusConsulta(c.id, e.target.value)} style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#8b949e", padding: "5px 8px", fontSize: 12, cursor: "pointer" }}>
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
                {consultasPaginadas.length === 0 && <div style={{ color: "#8b949e", textAlign: "center", padding: 40, fontSize: 14 }}>Nenhuma consulta encontrada</div>}
              </div>
              {totalPaginas > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 }}>
                  <button onClick={() => setPaginaConsultas(p => Math.max(1, p - 1))} disabled={paginaConsultas === 1} style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#8b949e", padding: "6px 10px", cursor: "pointer" }}><ChevronLeft size={14} /></button>
                  <span style={{ fontSize: 13, color: "#8b949e" }}>{paginaConsultas} / {totalPaginas}</span>
                  <button onClick={() => setPaginaConsultas(p => Math.min(totalPaginas, p + 1))} disabled={paginaConsultas === totalPaginas} style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#8b949e", padding: "6px 10px", cursor: "pointer" }}><ChevronRight size={14} /></button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ════ PRONTUÁRIOS ════ */}
        {activeSection === "prontuarios" && (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {prontuarioAberto ? (
              <>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <button onClick={() => setProntuarioAberto(null)} style={{ fontSize: 12, color: "#8B949E", marginBottom: 8, display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer" }}>← Voltar à lista</button>
                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>Prontuário — {prontuarioAberto.pacienteNome}</h2>
                    <p style={{ fontSize: 12, color: "#8B949E", marginTop: 2 }}>Actualizado em {prontuarioAberto.atualizadoEm} por {prontuarioAberto.atualizadoPor}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={salvarProntuario} style={{ padding: "8px 16px", background: "#238636", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Guardar</button>
                    <button onClick={() => apagarProntuario(prontuarioAberto.pacienteId)} style={{ padding: "8px 16px", background: "#3a1a1a", color: "#F85149", border: "1px solid #F85149", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Apagar</button>
                  </div>
                </div>
                <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 20 }}>
                  <p style={{ fontWeight: 700, marginBottom: 16, fontSize: 13 }}>Informação Clínica</p>
                  {([["Alergias (anestesia, medicamentos)", "alergias"], ["Medicamentos em uso", "medicamentosEmUso"], ["Doenças sistémicas (diabetes, hipertensão...)", "doencasSistemicas"], ["Observações", "observacoes"]] as [string, keyof Prontuario][]).map(([label, field]) => (
                    <div key={field} style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#8B949E", textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>
                      <textarea rows={3} style={{ width: "100%", padding: "8px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#e6edf3", resize: "vertical", fontFamily: "inherit", outline: "none" }}
                        value={prontuarioAberto[field] as string}
                        onChange={e => setProntuarioAberto(p => p ? { ...p, [field]: e.target.value } : p)} />
                    </div>
                  ))}
                </div>
                <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #30363d" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Histórico de Procedimentos</span>
                    <button onClick={() => setShowProcedimento(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#238636", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}><Plus size={12} /> Adicionar</button>
                  </div>
                  {prontuarioAberto.procedimentos.length === 0 ? <p style={{ padding: 20, textAlign: "center", color: "#8B949E", fontSize: 13 }}>Sem procedimentos registados</p>
                    : prontuarioAberto.procedimentos.map(p => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid #21262d" }}>
                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: 13 }}>{p.tipoLabel}{p.dente ? ` — Dente ${p.dente}` : ""}</strong>
                          <p style={{ fontSize: 12, color: "#8B949E", marginTop: 2 }}>{p.data} · {p.medico}</p>
                          {p.descricao && <p style={{ fontSize: 12, color: "#c9d1d9", marginTop: 3 }}>{p.descricao}</p>}
                        </div>
                        <button onClick={() => removerProcedimento(p.id)} style={{ color: "#F85149", background: "none", border: "none", cursor: "pointer", padding: 4 }}><Trash2 size={14} /></button>
                      </div>
                    ))}
                </div>
                <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #30363d" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Raio-X e Anexos</span>
                    <button onClick={() => setShowAnexo(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#1f6feb", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}><Plus size={12} /> Anexar</button>
                  </div>
                  {prontuarioAberto.anexos.length === 0 ? <p style={{ padding: 20, textAlign: "center", color: "#8B949E", fontSize: 13 }}>Sem anexos</p>
                    : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 12, padding: 16 }}>
                        {prontuarioAberto.anexos.map(a => (
                          <div key={a.id} style={{ border: "1px solid #30363d", borderRadius: 8, overflow: "hidden" }}>
                            {a.url.match(/\.(jpg|jpeg|png|webp)$/i) ? <img src={a.url} alt={a.titulo} style={{ width: "100%", height: 110, objectFit: "cover" }} />
                              : <div style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1117", color: "#8B949E" }}><FileText size={30} /></div>}
                            <div style={{ padding: "8px 10px" }}>
                              <p style={{ fontSize: 12, fontWeight: 700 }}>{a.titulo}</p>
                              <p style={{ fontSize: 11, color: "#8B949E" }}>{a.tipoLabel} · {a.dataExame}</p>
                              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                                <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#58A6FF" }}>Ver</a>
                                <button onClick={() => removerAnexo(a.id)} style={{ fontSize: 11, color: "#F85149", background: "none", border: "none", cursor: "pointer" }}>Remover</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
                {showProcedimento && (
                  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowProcedimento(false)}>
                    <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: 24, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
                        <strong style={{ fontSize: 15 }}>Novo Procedimento</strong>
                        <button onClick={() => setShowProcedimento(false)} style={{ background: "none", border: "none", color: "#8B949E", cursor: "pointer" }}><X size={16} /></button>
                      </div>
                      {([["Tipo", <select style={{ width: "100%", padding: "8px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#e6edf3" }} value={procForm.tipo} onChange={e => setProcForm(f => ({ ...f, tipo: e.target.value }))}>
                        {[["consulta", "Consulta de rotina"], ["extracao", "Extracção"], ["canal", "Tratamento de canal"], ["ortodontia", "Ortodontia"], ["implante", "Implante"], ["limpeza", "Limpeza / Profilaxia"], ["restauracao", "Restauração"], ["protese", "Prótese"], ["cirurgia", "Cirurgia oral"], ["outro", "Outro"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>],
                      ["Dente (notação FDI, ex: 36 — opcional)", <input style={{ width: "100%", padding: "8px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#e6edf3" }} value={procForm.dente} onChange={e => setProcForm(f => ({ ...f, dente: e.target.value }))} placeholder="ex: 36" />],
                      ["Data", <input type="date" style={{ width: "100%", padding: "8px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#e6edf3" }} value={procForm.data} onChange={e => setProcForm(f => ({ ...f, data: e.target.value }))} />],
                      ["Descrição", <textarea rows={3} style={{ width: "100%", padding: "8px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#e6edf3", resize: "vertical", fontFamily: "inherit" }} value={procForm.descricao} onChange={e => setProcForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Notas sobre o procedimento..." />]] as [string, React.ReactNode][]).map(([label, el]) => (
                        <div key={label} style={{ marginBottom: 12 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#8B949E", textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>
                          {el}
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                        <button onClick={() => setShowProcedimento(false)} style={{ padding: "8px 14px", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#8B949E", background: "none", cursor: "pointer" }}>Cancelar</button>
                        <button onClick={adicionarProcedimento} style={{ padding: "8px 16px", background: "#238636", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Guardar</button>
                      </div>
                    </div>
                  </div>
                )}
                {showAnexo && (
                  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowAnexo(false)}>
                    <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: 24, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
                        <strong style={{ fontSize: 15 }}>Adicionar Raio-X / Anexo</strong>
                        <button onClick={() => setShowAnexo(false)} style={{ background: "none", border: "none", color: "#8B949E", cursor: "pointer" }}><X size={16} /></button>
                      </div>
                      {([["Tipo", <select style={{ width: "100%", padding: "8px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#e6edf3" }} value={anexoForm.tipo} onChange={e => setAnexoForm(f => ({ ...f, tipo: e.target.value }))}>
                        <option value="raio_x_panoramico">Raio-X Panorâmico</option><option value="raio_x_apical">Raio-X Apical</option><option value="foto_clinica">Foto Clínica</option><option value="outro">Outro</option>
                      </select>],
                      ["Data do Exame", <input type="date" style={{ width: "100%", padding: "8px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#e6edf3" }} value={anexoForm.dataExame} onChange={e => setAnexoForm(f => ({ ...f, dataExame: e.target.value }))} />],
                      ["Ficheiro (JPG, PNG, PDF)", <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={e => setAnexoFile(e.target.files?.[0] || null)} style={{ fontSize: 13, color: "#e6edf3" }} />],
                      ["Descrição (opcional)", <input style={{ width: "100%", padding: "8px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#e6edf3" }} value={anexoForm.descricao} onChange={e => setAnexoForm(f => ({ ...f, descricao: e.target.value }))} placeholder="ex: região molar superior" />]] as [string, React.ReactNode][]).map(([label, el]) => (
                        <div key={label} style={{ marginBottom: 12 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#8B949E", textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>
                          {el}
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                        <button onClick={() => setShowAnexo(false)} style={{ padding: "8px 14px", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#8B949E", background: "none", cursor: "pointer" }}>Cancelar</button>
                        <button onClick={uploadAnexo} disabled={!anexoFile} style={{ padding: "8px 16px", background: "#1f6feb", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: !anexoFile ? .5 : 1 }}>Enviar</button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>Prontuários</h2>
                  <button onClick={() => setShowNovoProntuario(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#238636", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}><Plus size={13} /> Novo Prontuário</button>
                </div>
                {prontuarios.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#8B949E" }}><FileText size={36} style={{ marginBottom: 10 }} /><p>Nenhum prontuário criado</p></div>
                ) : prontuarios.map(p => (
                  <div key={p.id} onClick={() => abrirProntuario(p.pacienteId)} style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "border-color .14s" }} onMouseEnter={e => (e.currentTarget.style.borderColor = "#58A6FF")} onMouseLeave={e => (e.currentTarget.style.borderColor = "#30363d")}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1f3a5f", color: "#58A6FF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{p.pacienteNome[0]?.toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 14 }}>{p.pacienteNome}</strong>
                      <p style={{ fontSize: 12, color: "#8B949E", marginTop: 2 }}>Médico: {p.medicoPreferencial?.nome || "—"} · {p.atualizadoEm.split(" ")[0]}</p>
                    </div>
                    <span style={{ fontSize: 12, color: "#8B949E" }}>→</span>
                  </div>
                ))}
                {showNovoProntuario && (
                  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowNovoProntuario(false)}>
                    <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: 24, width: 460, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
                        <strong style={{ fontSize: 15 }}>Novo Prontuário</strong>
                        <button onClick={() => setShowNovoProntuario(false)} style={{ background: "none", border: "none", color: "#8B949E", cursor: "pointer" }}><X size={16} /></button>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#8B949E", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Paciente *</label>
                        <select style={{ width: "100%", padding: "8px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#e6edf3" }} value={novoProntuarioPacId} onChange={e => setNovoProntuarioPacId(e.target.value)}>
                          <option value="">Seleccionar...</option>
                          {pacientesLista.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                      </div>
                      {([["Alergias", "alergias"], ["Medicamentos em uso", "medicamentosEmUso"], ["Doenças sistémicas", "doencasSistemicas"], ["Observações", "observacoes"]] as [string, keyof typeof novoProntuarioForm][]).map(([label, field]) => (
                        <div key={field} style={{ marginBottom: 12 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#8B949E", textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>
                          <textarea rows={2} style={{ width: "100%", padding: "8px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#e6edf3", resize: "vertical", fontFamily: "inherit" }} value={novoProntuarioForm[field]} onChange={e => setNovoProntuarioForm(f => ({ ...f, [field]: e.target.value }))} />
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                        <button onClick={() => setShowNovoProntuario(false)} style={{ padding: "8px 14px", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#8B949E", background: "none", cursor: "pointer" }}>Cancelar</button>
                        <button onClick={criarProntuario} style={{ padding: "8px 16px", background: "#238636", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Criar</button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════ PARTILHAS ════ */}
        {activeSection === "partilhas" && (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Partilhas de Prontuário</h2>
              <button onClick={() => { fetchPartilhas(); setShowNovaPartilha(true); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#1f6feb", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}><Plus size={13} /> Nova Partilha</button>
            </div>
            {partilhas.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#8B949E" }}><Bell size={36} style={{ marginBottom: 10 }} /><p>Sem partilhas</p></div>
            ) : partilhas.map(p => {
              const corEstado: Record<string, string> = { pendente: "#D29922", aceite: "#3FB950", recusado: "#F85149", concluido: "#8B949E" };
              const recebida = p.clinicaDestinoId === user?.clinica_id;
              return (
                <div key={p.id} style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: corEstado[p.estado] + "22", color: corEstado[p.estado] }}>{p.estadoLabel}</span>
                    <span style={{ fontSize: 12, color: "#8B949E" }}>{p.tipoLabel}</span>
                    <span style={{ fontSize: 11, color: "#8B949E", marginLeft: "auto" }}>{p.criadoEm}</span>
                  </div>
                  <strong style={{ fontSize: 14 }}>{p.pacienteNome}</strong>
                  <p style={{ fontSize: 12, color: "#8B949E", marginTop: 3 }}>{p.escopo === "interna" ? `Interno · para ${p.medicoDestino}` : `${p.clinicaOrigem} → ${p.clinicaDestino}`}</p>
                  {p.mensagem && <p style={{ fontSize: 12, color: "#c9d1d9", marginTop: 6, fontStyle: "italic" }}>"{p.mensagem}"</p>}
                  {p.estado === "pendente" && recebida && (
                    <>
                      {aceitarPartilhaId === p.id ? (
                        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <select value={medicoResponsavelSel} onChange={e => setMedicoResponsavelSel(e.target.value)} style={{ padding: "6px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, fontSize: 12, color: "#e6edf3" }}>
                            <option value="">Atribuir médico...</option>
                            {medicosLista.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                          </select>
                          <button onClick={() => responderPartilha(p.id, "aceitar")} style={{ padding: "6px 12px", background: "#238636", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Confirmar</button>
                          <button onClick={() => setAceitarPartilhaId(null)} style={{ padding: "6px 10px", border: "1px solid #30363d", borderRadius: 6, fontSize: 12, color: "#8B949E", background: "none", cursor: "pointer" }}>Cancelar</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <button onClick={() => setAceitarPartilhaId(p.id)} style={{ padding: "6px 14px", background: "#238636", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Aceitar</button>
                          <button onClick={() => responderPartilha(p.id, "recusar")} style={{ padding: "6px 14px", background: "none", color: "#F85149", border: "1px solid #F85149", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Recusar</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            {showNovaPartilha && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowNovaPartilha(false)}>
                <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: 24, width: 460, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
                    <strong style={{ fontSize: 15 }}>Nova Partilha de Prontuário</strong>
                    <button onClick={() => setShowNovaPartilha(false)} style={{ background: "none", border: "none", color: "#8B949E", cursor: "pointer" }}><X size={16} /></button>
                  </div>
                  {([["Prontuário / Paciente", <select style={{ width: "100%", padding: "8px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#e6edf3" }} value={partilhaForm.prontuarioId} onChange={e => setPartilhaForm(f => ({ ...f, prontuarioId: e.target.value }))}><option value="">Seleccionar...</option>{prontuarios.map(p => <option key={p.id} value={p.id}>{p.pacienteNome}</option>)}</select>],
                  ["Tipo", <select style={{ width: "100%", padding: "8px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#e6edf3" }} value={partilhaForm.tipo} onChange={e => setPartilhaForm(f => ({ ...f, tipo: e.target.value }))}><option value="segunda_opiniao">Segunda Opinião</option><option value="transferencia">Transferência de Paciente</option></select>],
                  ["Clínica Destino", <select style={{ width: "100%", padding: "8px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#e6edf3" }} value={partilhaForm.clinicaDestinoId} onChange={e => setPartilhaForm(f => ({ ...f, clinicaDestinoId: e.target.value }))}><option value="">Seleccionar clínica...</option>{clinicasExternas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>],
                  ["Mensagem / Contexto clínico", <textarea rows={3} style={{ width: "100%", padding: "8px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#e6edf3", resize: "vertical", fontFamily: "inherit" }} value={partilhaForm.mensagem} onChange={e => setPartilhaForm(f => ({ ...f, mensagem: e.target.value }))} placeholder="Descreve o motivo da partilha..." />]] as [string, React.ReactNode][]).map(([label, el]) => (
                    <div key={label} style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#8B949E", textTransform: "uppercase", display: "block", marginBottom: 4 }}>{label}</label>
                      {el}
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                    <button onClick={() => setShowNovaPartilha(false)} style={{ padding: "8px 14px", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#8B949E", background: "none", cursor: "pointer" }}>Cancelar</button>
                    <button onClick={enviarPartilha} style={{ padding: "8px 16px", background: "#1f6feb", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Enviar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ MENSAGENS ════ */}
        {activeSection === "mensagens" && (
          <div style={{ display: "flex", height: "calc(100vh - 81px)", overflow: "hidden" }}>
            {/* Lista de conversas */}
            <div style={{ width: 300, borderRight: "1px solid #30363d", display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={{ padding: "16px", borderBottom: "1px solid #30363d", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Conversas</span>
                <button onClick={() => { fetchContactos(); setShowNovaConversa(true); }} style={{ background: "#1f6feb", border: "none", borderRadius: 6, color: "#fff", padding: "5px 10px", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                  <Plus size={12} /> Nova
                </button>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {conversas.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 32, color: "#8B949E", fontSize: 13 }}>
                    <MessageSquare size={28} style={{ marginBottom: 8, opacity: .4 }} /><br />Sem conversas ainda
                  </div>
                ) : conversas.map(c => (
                  <div key={c.id} onClick={() => abrirConversa(c)} style={{ padding: "14px 16px", borderBottom: "1px solid #21262d", cursor: "pointer", background: conversaAberta?.id === c.id ? "#1f2937" : "transparent", transition: "background .13s" }}
                    onMouseEnter={e => { if (conversaAberta?.id !== c.id) e.currentTarget.style.background = "#161b22"; }}
                    onMouseLeave={e => { if (conversaAberta?.id !== c.id) e.currentTarget.style.background = "transparent"; }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1f6feb22", color: "#58A6FF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {c.comNome[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: "#e6edf3" }}>{c.comNome}</span>
                          {c.naoLidas > 0 && <span style={{ background: "#F85149", color: "#fff", borderRadius: 99, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{c.naoLidas}</span>}
                        </div>
                        <p style={{ fontSize: 11, color: "#8B949E", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.ultimaMensagem || "Sem mensagens"}</p>
                        <p style={{ fontSize: 10, color: "#6e7681", marginTop: 1 }}>{c.comTipo} {c.comClinica !== "—" ? `· ${c.comClinica}` : ""}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Área do chat */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {conversaAberta ? (
                <>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid #30363d", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1f6feb22", color: "#58A6FF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{conversaAberta.comNome[0]?.toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{conversaAberta.comNome}</div>
                      <div style={{ fontSize: 11, color: "#8B949E" }}>{conversaAberta.comTipo}{conversaAberta.comClinica !== "—" ? ` · ${conversaAberta.comClinica}` : ""}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {mensagens.map(m => (
                      <div key={m.id} style={{ display: "flex", justifyContent: m.sistema ? "center" : m.minha ? "flex-end" : "flex-start" }}>
                        {m.sistema ? (
                          <div style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 8, padding: "6px 12px", fontSize: 11, color: "#8B949E", maxWidth: "70%", textAlign: "center", whiteSpace: "pre-line" }}>{m.corpo}</div>
                        ) : (
                          <div style={{ maxWidth: "70%" }}>
                            {!m.minha && <div style={{ fontSize: 10, color: "#8B949E", marginBottom: 3, paddingLeft: 4 }}>{m.remetenteNome}</div>}
                            <div style={{ background: m.minha ? "#1f6feb" : "#21262d", color: m.minha ? "#fff" : "#e6edf3", borderRadius: m.minha ? "12px 12px 2px 12px" : "12px 12px 12px 2px", padding: "8px 14px", fontSize: 13, lineHeight: 1.5 }}>{m.corpo}</div>
                            <div style={{ fontSize: 10, color: "#6e7681", marginTop: 3, textAlign: m.minha ? "right" : "left", paddingLeft: 4, paddingRight: 4 }}>{m.criadaEm}</div>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={mensagensEndRef} />
                  </div>
                  <div style={{ padding: "12px 20px", borderTop: "1px solid #30363d", display: "flex", gap: 10, alignItems: "center" }}>
                    <input value={novaMensagem} onChange={e => setNovaMensagem(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
                      placeholder="Escreve uma mensagem..."
                      style={{ flex: 1, background: "#21262d", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 14px", fontSize: 13, outline: "none" }} />
                    <button onClick={enviarMensagem} disabled={!novaMensagem.trim() || enviando}
                      style={{ background: novaMensagem.trim() ? "#1f6feb" : "#21262d", border: "none", borderRadius: 8, color: "#fff", padding: "9px 14px", cursor: novaMensagem.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6, fontSize: 13, transition: "background .13s" }}>
                      <Send size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#8B949E", gap: 12 }}>
                  <MessageSquare size={48} style={{ opacity: .2 }} />
                  <p style={{ fontSize: 14 }}>Selecciona uma conversa para começar</p>
                  <button onClick={() => { fetchContactos(); setShowNovaConversa(true); }} style={{ background: "#1f6feb", border: "none", borderRadius: 8, color: "#fff", padding: "8px 16px", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    <Plus size={14} /> Nova conversa
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Nova Conversa */}
        {showNovaConversa && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowNovaConversa(false)}>
            <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: 24, width: 400, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <strong style={{ fontSize: 15 }}>Nova Conversa</strong>
                <button onClick={() => setShowNovaConversa(false)} style={{ background: "none", border: "none", color: "#8B949E", cursor: "pointer" }}><X size={16} /></button>
              </div>
              <div style={{ position: "relative", marginBottom: 12 }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#8B949E" }} />
                <input value={buscaContacto} onChange={e => setBuscaContacto(e.target.value)} placeholder="Procurar contacto..." style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3", padding: "8px 10px 8px 32px", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {contactosFiltrados.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 20, color: "#8B949E", fontSize: 13 }}>Nenhum contacto encontrado</div>
                ) : contactosFiltrados.map(c => (
                  <button key={c.id} onClick={() => iniciarConversa(c)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid #30363d", background: "#0d1117", cursor: "pointer", textAlign: "left", transition: "border-color .13s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#1f6feb"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#30363d"}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1f6feb22", color: "#58A6FF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{c.nome[0]?.toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf3" }}>{c.nome}</div>
                      <div style={{ fontSize: 11, color: "#8B949E" }}>{c.tipo}{c.clinica !== "—" ? ` · ${c.clinica}` : ""}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ══ MODAL: Novo Médico ══ */}
      {showMedicoModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowMedicoModal(false)}>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, width: 480, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}><UserPlus size={16} style={{ marginRight: 8 }} />Novo Médico</h3>
              <button onClick={() => setShowMedicoModal(false)} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[{ label: "Username *", key: "username", type: "text", placeholder: "dr.joao" }, { label: "Email", key: "email", type: "email", placeholder: "dr@clinica.com" }, { label: "Senha *", key: "password", type: "password", placeholder: "••••••••" }, { label: "Especialidade", key: "especialidade", type: "text", placeholder: "Cardiologia" }, { label: "CRM", key: "crm", type: "text", placeholder: "CRM/SP 12345" }, { label: "Telefone", key: "telefone", type: "text", placeholder: "(11) 99999-9999" }].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>{label}</label>
                  <input type={type} placeholder={placeholder} value={(medicoForm as any)[key]} onChange={e => setMedicoForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowMedicoEdit(null)}>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, width: 480, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}><Edit2 size={16} style={{ marginRight: 8 }} />Editar: {showMedicoEdit.nome}</h3>
              <button onClick={() => setShowMedicoEdit(null)} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[{ label: "Email", key: "email", type: "email" }, { label: "Especialidade", key: "especialidade", type: "text" }, { label: "CRM", key: "crm", type: "text" }, { label: "Telefone", key: "telefone", type: "text" }].map(({ label, key, type }) => (
                <div key={key}>
                  <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={(medicoEditForm as any)[key]} onChange={e => setMedicoEditForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>Status</label>
                <select value={medicoEditForm.status} onChange={e => setMedicoEditForm(f => ({ ...f, status: e.target.value }))} style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14 }}>
                  <option value="ativo">Ativo</option><option value="inativo">Inativo</option>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowConsultaModal(false)}>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, width: 480, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}><Plus size={16} style={{ marginRight: 8 }} />Nova Consulta</h3>
              <button onClick={() => setShowConsultaModal(false)} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>Médico *</label>
                <select value={consultaForm.medico} onChange={e => setConsultaForm(f => ({ ...f, medico: e.target.value }))} style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14 }}>
                  <option value="">Selecione...</option>
                  {medicosLista.map(m => <option key={m.id} value={m.id}>{m.nome}{m.especialidade ? ` — ${m.especialidade}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>Paciente *</label>
                <select value={consultaForm.paciente} onChange={e => setConsultaForm(f => ({ ...f, paciente: e.target.value }))} style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14 }}>
                  <option value="">Selecione...</option>
                  {pacientesLista.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>Data *</label>
                  <input type="date" value={consultaForm.data} onChange={e => setConsultaForm(f => ({ ...f, data: e.target.value }))} style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>Hora *</label>
                  <input type="time" value={consultaForm.hora} onChange={e => setConsultaForm(f => ({ ...f, hora: e.target.value }))} style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>Motivo</label>
                <input type="text" value={consultaForm.motivo} onChange={e => setConsultaForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Consulta de rotina, retorno..." style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#8b949e", display: "block", marginBottom: 6 }}>Valor (R$)</label>
                <input type="number" value={consultaForm.valor} onChange={e => setConsultaForm(f => ({ ...f, valor: e.target.value }))} placeholder="150.00" style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", padding: "9px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowConsultaModal(false)} style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 8, color: "#8b949e", padding: "8px 16px", cursor: "pointer" }}>Cancelar</button>
              <button onClick={criarConsulta} style={{ background: "#1f6feb", border: "none", borderRadius: 8, color: "#fff", padding: "8px 20px", cursor: "pointer", fontWeight: 500 }}>Criar Consulta</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Alterar Senha ══ */}
      {showSenhaModal && senhaTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSenhaModal(false)}>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: 24, width: 360, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <strong style={{ fontSize: 15 }}>Alterar Senha</strong>
                <p style={{ fontSize: 12, color: "#8B949E", marginTop: 2 }}>{senhaTarget.nome}</p>
              </div>
              <button onClick={() => setShowSenhaModal(false)} style={{ background: "none", border: "none", color: "#8B949E", cursor: "pointer" }}><X size={16} /></button>
            </div>
            {senhaOk ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#3FB950", fontSize: 14 }}>✓ Senha alterada com sucesso!</div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#8B949E", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Nova Senha</label>
                  <input type="password" placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={e => { setNovaSenha(e.target.value); setSenhaErro(""); }} autoFocus style={{ width: "100%", padding: "9px 12px", background: "#0d1117", border: `1px solid ${senhaErro ? "#F85149" : "#30363d"}`, borderRadius: 6, fontSize: 13, color: "#e6edf3", outline: "none", boxSizing: "border-box" }} />
                  {senhaErro && <p style={{ fontSize: 12, color: "#F85149", marginTop: 5 }}>{senhaErro}</p>}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowSenhaModal(false)} style={{ padding: "8px 14px", border: "1px solid #30363d", borderRadius: 6, fontSize: 13, color: "#8B949E", background: "none", cursor: "pointer" }}>Cancelar</button>
                  <button onClick={alterarSenha} disabled={novaSenha.length < 6} style={{ padding: "8px 16px", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: novaSenha.length >= 6 ? "pointer" : "not-allowed", background: novaSenha.length >= 6 ? "#1f6feb" : "#1f6feb44", color: "#fff" }}>Confirmar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}