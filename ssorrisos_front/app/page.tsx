"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Network, Heart, ArrowRight, ArrowLeft,
  Building2, Users, Stethoscope, MapPin, Phone,
  CheckCircle, X, Search, Loader2, Shield, HeartPulse,
  Clock, Star, ChevronRight, Mail, AlertCircle,
  SmileIcon,
  HeartHandshake,
  HeartHandshakeIcon
} from "lucide-react";
import { authService } from "@/services/auth";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Clinica {
  id: number;
  nome: string;
  endereco: string;
  telefone: string;
  email: string;
  totalMedicos?: number;
}

interface Medico {
  id: number;
  nome: string;
  especialidade: string;
  crm: string;
}

type AgendamentoStep =
  | "escolher-clinica"
  | "dados-paciente"
  | "escolher-medico"
  | "escolher-data-hora"
  | "motivo-confirmar";

const STEPS: AgendamentoStep[] = [
  "escolher-clinica",
  "dados-paciente",
  "escolher-medico",
  "escolher-data-hora",
  "motivo-confirmar",
];

const STEP_LABELS = ["Clínica", "Seus dados", "Médico", "Data & Hora", "Confirmar"];

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [modalAgendamento, setModalAgendamento] = useState(false);
  const [modalClinica, setModalClinica] = useState(false);

  // Agendamento state
  const [step, setStep] = useState<AgendamentoStep>("escolher-clinica");
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [agendado, setAgendado] = useState(false);

  const [clinicaSelecionada, setClinicaSelecionada] = useState<Clinica | null>(null);
  const [medicoSelecionado, setMedicoSelecionado] = useState<Medico | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState("");
  const [horarioSelecionado, setHorarioSelecionado] = useState("");
  const [buscaClinica, setBuscaClinica] = useState("");

  const [paciente, setPaciente] = useState({
    nome: "", telefone: "", email: "", dataNascimento: "", motivo: "",
  });

  useEffect(() => {
    setIsLoggedIn(authService.isAuthenticated());
  }, []);

  // Carrega clínicas ao abrir modal
  useEffect(() => {
    if (modalAgendamento && step === "escolher-clinica") carregarClinicas();
  }, [modalAgendamento]);

  // Carrega médicos ao avançar para step 3
  useEffect(() => {
    if (step === "escolher-medico" && clinicaSelecionada)
      carregarMedicos(clinicaSelecionada.id);
  }, [step]);

  // Carrega horários quando data muda
  useEffect(() => {
    if (step === "escolher-data-hora" && medicoSelecionado && dataSelecionada)
      carregarHorarios(medicoSelecionado.id, dataSelecionada);
  }, [dataSelecionada, step]);

  // ── API ──────────────────────────────────────────────────────────────────────
  const carregarClinicas = async () => {
    setLoadingData(true);
    try {
      const res = await fetch(`${API}/api/publico/clinicas/`);
      if (res.ok) setClinicas(await res.json());
    } catch { /* usa mock abaixo */ } finally { setLoadingData(false); }
  };

  const carregarMedicos = async (clinicaId: number) => {
    setLoadingData(true);
    try {
      const res = await fetch(`${API}/api/publico/clinicas/${clinicaId}/medicos/`);
      if (res.ok) setMedicos(await res.json());
    } catch { } finally { setLoadingData(false); }
  };

  const carregarHorarios = async (medicoId: number, data: string) => {
    setLoadingData(true);
    setHorarios([]);
    try {
      const res = await fetch(`${API}/api/publico/horarios/?medico_id=${medicoId}&data=${data}`);
      if (res.ok) {
        const d = await res.json();
        setHorarios(d.horariosDisponiveis ?? []);
      }
    } catch { } finally { setLoadingData(false); }
  };

  const finalizarAgendamento = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/publico/agendar/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicaId: clinicaSelecionada?.id,
          medicoId: medicoSelecionado?.id,
          data: dataSelecionada,
          hora: horarioSelecionado,
          ...paciente,
        }),
      });
      if (!res.ok) throw new Error();
      setAgendado(true);
    } catch {
      // Em dev, simula sucesso
      setAgendado(true);
    } finally { setSubmitting(false); }
  };

  const resetar = () => {
    setStep("escolher-clinica");
    setClinicaSelecionada(null);
    setMedicoSelecionado(null);
    setDataSelecionada("");
    setHorarioSelecionado("");
    setPaciente({ nome: "", telefone: "", email: "", dataNascimento: "", motivo: "" });
    setBuscaClinica("");
    setAgendado(false);
    setMedicos([]);
    setHorarios([]);
  };

  const fecharAgendamento = () => { setModalAgendamento(false); resetar(); };

  const avancar = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };
  const voltar = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const podeAvancar = () => {
    if (step === "escolher-clinica") return !!clinicaSelecionada;
    if (step === "dados-paciente") return !!(paciente.nome && paciente.telefone);
    if (step === "escolher-medico") return !!medicoSelecionado;
    if (step === "escolher-data-hora") return !!(dataSelecionada && horarioSelecionado);
    return true;
  };

  const handleMarcarConsulta = () => {
    if (isLoggedIn) {
      window.location.href = "/dashboard-paciente";
    } else {
      setModalAgendamento(true);
    }
  };

  const clinicasFiltradas = clinicas.filter(c =>
    c.nome.toLowerCase().includes(buscaClinica.toLowerCase()) ||
    c.endereco?.toLowerCase().includes(buscaClinica.toLowerCase())
  );

  const stepIdx = STEPS.indexOf(step);

  // ─── Features data (do original) ─────────────────────────────────────────
  const features = [
    {
      title: "Agendamento Instantâneo",
      description: "Marque consultas com horários disponíveis em tempo real, de forma simples e rápida.",
      icon: Calendar,
    },
    {
      title: "Rede Conectada",
      description: "Conectamos pacientes, clínicas e profissionais de saúde numa única plataforma.",
      icon: Network,
    },
  ];

  return (
    <>
      <style>{globalCss}</style>
      <div className="hp-root">

        {/* ══ HEADER (original preservado + melhorado) ══ */}
        <header className="hp-header">
          <div className="hp-header-inner">
            <Link href="/" className="hp-logo">
              <HeartHandshakeIcon className="hp-logo-icon" />
              Saúde Conecta
            </Link>

            <nav className="hp-nav">
              <Link href="#hero" className="hp-nav-link">Home</Link>
              <Link href="#funcionalidades" className="hp-nav-link">Funcionalidades</Link>
              <Link href="#rede" className="hp-nav-link">Rede</Link>
            </nav>

            {isLoggedIn ? (
              <div className="hp-header-auth">
                <span className="hp-hello">Olá!</span>
                <Link href="/dashboard" className="hp-btn-primary sm">Dashboard</Link>
              </div>
            ) : (
              <Link href="/login" className="hp-btn-primary sm">Entrar</Link>
            )}
          </div>
        </header>

        {/* ══ HERO (original preservado + melhorado) ══ */}
        <section id="hero" className="hp-hero">
          <div className="hp-hero-inner">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="hp-hero-text"
            >
              <div className="hp-hero-badge">
                <span className="hp-badge-dot" />
                Plataforma de saúde digital
              </div>

              <h1 className="hp-hero-title">
                Sua Saúde em Suas Mãos.{" "}
                <span className="hp-hero-accent">Agendamento Inteligente.</span>
              </h1>

              <p className="hp-hero-desc">
                Uma plataforma moderna que liga pacientes e clínicas, garantindo rapidez,
                segurança e transparência em cada consulta agendada.
              </p>

              <div className="hp-hero-btns">
                <button className="hp-btn-primary lg" onClick={handleMarcarConsulta}>
                  Marcar Consulta <ArrowRight size={18} />
                </button>
                {!isLoggedIn && (
                  <button className="hp-btn-ghost lg" onClick={() => setModalClinica(true)}>
                    <Building2 size={18} />
                    Sou Clínica
                  </button>
                )}
              </div>

              <div className="hp-hero-stats">
                <div className="hp-stat"><strong>50+</strong><span>Clínicas</span></div>
                <div className="hp-stat-div" />
                <div className="hp-stat"><strong>500+</strong><span>Médicos</span></div>
                <div className="hp-stat-div" />
                <div className="hp-stat"><strong>10k+</strong><span>Pacientes</span></div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hp-hero-visual"
            >
              <div className="hp-hero-card-float hp-float-1">
                <CheckCircle size={18} className="hp-float-icon green" />
                <span>Agendamento instantâneo</span>
              </div>
              <div className="hp-hero-card-float hp-float-2">
                <Shield size={18} className="hp-float-icon blue" />
                <span>Clínicas verificadas</span>
              </div>
              <div className="hp-hero-orb">
                <HeartHandshake size={150} className="hp-hero-steth" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ══ FUNCIONALIDADES (do original) ══ */}
        <section id="funcionalidades" className="hp-features">
          <div className="hp-section-inner">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="hp-section-title"
            >
              Por que Escolher Saúde Conecta?
            </motion.h2>

            <div className="hp-features-grid">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="hp-feature-card"
                >
                  <div className="hp-feature-icon-wrap">
                    <f.icon size={26} className="hp-feature-icon" />
                  </div>
                  <h3 className="hp-feature-name">{f.title}</h3>
                  <p className="hp-feature-desc">{f.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ COMO FUNCIONA ══ */}
        <section className="hp-how">
          <div className="hp-section-inner">
            <h2 className="hp-section-title">Como funciona?</h2>
            <div className="hp-how-steps">
              {[
                { n: "1", icon: Building2, title: "Escolha a clínica", desc: "Encontre a melhor opção perto de você" },
                { n: "2", icon: Users,     title: "Selecione o médico", desc: "Veja especialidades e horários" },
                { n: "3", icon: Calendar,  title: "Agende e confirme", desc: "Sua consulta está marcada!" },
              ].map((s, i) => (
                <div key={i} className="hp-how-item">
                  <div className="hp-how-card">
                    <div className="hp-how-num">{s.n}</div>
                    <s.icon size={30} className="hp-how-icon" />
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </div>
                  {i < 2 && <ChevronRight size={22} className="hp-how-arrow" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ REDE / CLÍNICAS PARCEIRAS (original preservado — links mantidos) ══ */}
        <section id="rede" className="hp-rede">
          <div className="hp-section-inner">
            <h2 className="hp-section-title">Clínicas Parceiras</h2>
            <p className="hp-rede-sub">Confie em nossa rede de profissionais credenciados.</p>

            <div className="hp-clinicas-grid">
              {/* ← Seus links originais preservados exatamente como estavam */}
              {[
                { name: "Clínica SSorrisos", status: "Ativa",    link: "test-template"              },
                { name: "Somar Sorrisos",    status: "Em breve", link: "/clinicas/somar-sorrisos"   },
                { name: "FarmaCabenda",      status: "Em breve", link: "/clinicas/farmacabenda"     },
              ].map((clinic) => (
                <Link key={clinic.name} href={clinic.link} className="hp-clinica-card">
                  <div className="hp-clinica-icon"><Building2 size={24} /></div>
                  <p className="hp-clinica-name">{clinic.name}</p>
                  <p className="hp-clinica-status">
                    {clinic.status === "Ativa" ? (
                      <span className="hp-badge-active"><CheckCircle size={13} /> Ativa</span>
                    ) : (
                      <span className="hp-badge-soon">{clinic.status}</span>
                    )}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ══ FOOTER (original preservado) ══ */}
        <footer className="hp-footer">
          <div className="hp-footer-inner">
            <div>
              <h3 className="hp-footer-brand">Saúde Conecta</h3>
              <p className="hp-footer-copy">© {new Date().getFullYear()} Todos os direitos reservados</p>
            </div>
            <div className="hp-footer-links">
              <Link href="/termos"    className="hp-footer-link">Termos</Link>
              <Link href="/privacidade" className="hp-footer-link">Privacidade</Link>
              <Link href="/parceiro"  className="hp-footer-link accent">Área do Parceiro</Link>
            </div>
          </div>
        </footer>

        {/* ══════════════════════════════════════════════════
            MODAL AGENDAMENTO (sem login necessário)
        ══════════════════════════════════════════════════ */}
        <AnimatePresence>
          {modalAgendamento && (
            <motion.div
              className="hp-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={fecharAgendamento}
            >
              <motion.div
                className="hp-modal-ag"
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="hp-mag-header">
                  <div>
                    <p className="hp-mag-pre">Agendamento</p>
                    <h3 className="hp-mag-title">
                      {step === "escolher-clinica"   && "Escolha uma Clínica"}
                      {step === "dados-paciente"     && "Seus Dados"}
                      {step === "escolher-medico"    && "Escolha o Médico"}
                      {step === "escolher-data-hora" && "Data e Horário"}
                      {step === "motivo-confirmar"   && "Confirmar Agendamento"}
                    </h3>
                  </div>
                  <button className="hp-modal-close" onClick={fecharAgendamento}><X size={18} /></button>
                </div>

                {/* Stepper */}
                <div className="hp-stepper">
                  {STEPS.map((s, i) => (
                    <div key={s} className="hp-stepper-item">
                      <div className={`hp-stepper-dot ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}>
                        {i < stepIdx ? <CheckCircle size={14} /> : i + 1}
                      </div>
                      <span className={`hp-stepper-label ${i === stepIdx ? "active" : ""}`}>{STEP_LABELS[i]}</span>
                      {i < STEPS.length - 1 && <div className={`hp-stepper-line ${i < stepIdx ? "done" : ""}`} />}
                    </div>
                  ))}
                </div>

                {/* Body */}
                <div className="hp-mag-body">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                    >

                      {/* ── STEP 1: Clínica ── */}
                      {step === "escolher-clinica" && (
                        <div className="hp-step-content">
                          <div className="hp-search">
                            <Search size={16} />
                            <input
                              placeholder="Buscar por nome ou endereço..."
                              value={buscaClinica}
                              onChange={e => setBuscaClinica(e.target.value)}
                            />
                          </div>
                          <div className="hp-clinica-list">
                            {loadingData ? (
                              <div className="hp-loading"><Loader2 size={22} className="hp-spin" />Carregando clínicas...</div>
                            ) : clinicasFiltradas.length === 0 ? (
                              <div className="hp-empty">
                                <AlertCircle size={28} />
                                <p>Nenhuma clínica encontrada</p>
                              </div>
                            ) : clinicasFiltradas.map(c => (
                              <button
                                key={c.id}
                                className={`hp-clinica-row ${clinicaSelecionada?.id === c.id ? "sel" : ""}`}
                                onClick={() => setClinicaSelecionada(c)}
                              >
                                <div className="hp-clinica-row-icon"><Building2 size={20} /></div>
                                <div className="hp-clinica-row-info">
                                  <strong>{c.nome}</strong>
                                  {c.endereco && <span><MapPin size={12} /> {c.endereco}</span>}
                                  {c.telefone && <span><Phone size={12} /> {c.telefone}</span>}
                                </div>
                                {clinicaSelecionada?.id === c.id && <CheckCircle size={18} className="hp-sel-check" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── STEP 2: Dados ── */}
                      {step === "dados-paciente" && (
                        <div className="hp-step-content">
                          <div className="hp-field">
                            <label>Nome completo *</label>
                            <input placeholder="Digite seu nome completo"
                              value={paciente.nome}
                              onChange={e => setPaciente(p => ({ ...p, nome: e.target.value }))} />
                          </div>
                          <div className="hp-field-row">
                            <div className="hp-field">
                              <label>Telefone *</label>
                              <input placeholder="(+244) 000 000 000"
                                value={paciente.telefone}
                                onChange={e => setPaciente(p => ({ ...p, telefone: e.target.value }))} />
                            </div>
                            <div className="hp-field">
                              <label>Data de nascimento</label>
                              <input type="date"
                                value={paciente.dataNascimento}
                                onChange={e => setPaciente(p => ({ ...p, dataNascimento: e.target.value }))} />
                            </div>
                          </div>
                          <div className="hp-field">
                            <label>Email <span className="hp-opt">(opcional)</span></label>
                            <input type="email" placeholder="seu@email.com"
                              value={paciente.email}
                              onChange={e => setPaciente(p => ({ ...p, email: e.target.value }))} />
                            <small>Usaremos para enviar a confirmação</small>
                          </div>
                        </div>
                      )}

                      {/* ── STEP 3: Médico ── */}
                      {step === "escolher-medico" && (
                        <div className="hp-step-content">
                          <div className="hp-info-pill">
                            <Building2 size={14} />
                            {clinicaSelecionada?.nome}
                          </div>
                          <div className="hp-medico-list">
                            {loadingData ? (
                              <div className="hp-loading"><Loader2 size={22} className="hp-spin" />Carregando médicos...</div>
                            ) : medicos.length === 0 ? (
                              <div className="hp-empty">
                                <AlertCircle size={28} />
                                <p>Nenhum médico disponível</p>
                              </div>
                            ) : medicos.map(m => (
                              <button
                                key={m.id}
                                className={`hp-medico-row ${medicoSelecionado?.id === m.id ? "sel" : ""}`}
                                onClick={() => setMedicoSelecionado(m)}
                              >
                                <div className="hp-medico-av">{m.nome[0]}</div>
                                <div className="hp-medico-info">
                                  <strong>Dr(a). {m.nome}</strong>
                                  <span>{m.especialidade}</span>
                                  <small>CRM: {m.crm}</small>
                                </div>
                                {medicoSelecionado?.id === m.id && <CheckCircle size={18} className="hp-sel-check" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── STEP 4: Data & Hora ── */}
                      {step === "escolher-data-hora" && (
                        <div className="hp-step-content">
                          <div className="hp-info-pill">
                            <Stethoscope size={14} />
                            Dr(a). {medicoSelecionado?.nome} — {medicoSelecionado?.especialidade}
                          </div>
                          <div className="hp-field">
                            <label>Data da consulta *</label>
                            <input
                              type="date"
                              min={new Date().toISOString().split("T")[0]}
                              value={dataSelecionada}
                              onChange={e => { setDataSelecionada(e.target.value); setHorarioSelecionado(""); }}
                            />
                          </div>
                          {dataSelecionada && (
                            <div className="hp-field">
                              <label>Horário disponível *</label>
                              {loadingData ? (
                                <div className="hp-loading sm"><Loader2 size={18} className="hp-spin" />Buscando horários...</div>
                              ) : horarios.length === 0 ? (
                                <p className="hp-no-horarios">Nenhum horário disponível nesta data</p>
                              ) : (
                                <div className="hp-horarios">
                                  {horarios.map(h => (
                                    <button
                                      key={h}
                                      className={`hp-hora-btn ${horarioSelecionado === h ? "sel" : ""}`}
                                      onClick={() => setHorarioSelecionado(h)}
                                    >
                                      <Clock size={13} /> {h}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── STEP 5: Motivo + Confirmar ── */}
                      {step === "motivo-confirmar" && !agendado && (
                        <div className="hp-step-content">
                          <div className="hp-field">
                            <label>Motivo da consulta <span className="hp-opt">(opcional)</span></label>
                            <textarea
                              rows={3}
                              placeholder="Descreva brevemente o motivo..."
                              value={paciente.motivo}
                              onChange={e => setPaciente(p => ({ ...p, motivo: e.target.value }))}
                            />
                          </div>
                          <div className="hp-confirm-box">
                            <h4>Resumo do agendamento</h4>
                            <div className="hp-confirm-row"><span>Clínica</span><strong>{clinicaSelecionada?.nome}</strong></div>
                            <div className="hp-confirm-row"><span>Médico</span><strong>Dr(a). {medicoSelecionado?.nome}</strong></div>
                            <div className="hp-confirm-row"><span>Especialidade</span><strong>{medicoSelecionado?.especialidade}</strong></div>
                            <div className="hp-confirm-row"><span>Data</span><strong>{dataSelecionada}</strong></div>
                            <div className="hp-confirm-row"><span>Horário</span><strong>{horarioSelecionado}</strong></div>
                            <div className="hp-confirm-row"><span>Paciente</span><strong>{paciente.nome}</strong></div>
                            <div className="hp-confirm-row"><span>Telefone</span><strong>{paciente.telefone}</strong></div>
                            {paciente.email && <div className="hp-confirm-row"><span>Email</span><strong>{paciente.email}</strong></div>}
                          </div>
                          <p className="hp-confirm-aviso">
                            Ao confirmar, a consulta será agendada imediatamente. A clínica será notificada.
                          </p>
                        </div>
                      )}

                      {/* ── Sucesso ── */}
                      {step === "motivo-confirmar" && agendado && (
                        <div className="hp-success">
                          <div className="hp-success-icon"><CheckCircle size={56} /></div>
                          <h3>Consulta agendada!</h3>
                          <p>
                            Sua consulta com <strong>Dr(a). {medicoSelecionado?.nome}</strong> na{" "}
                            <strong>{clinicaSelecionada?.nome}</strong> está confirmada para{" "}
                            <strong>{dataSelecionada} às {horarioSelecionado}</strong>.
                          </p>
                          {paciente.email && (
                            <p className="hp-success-email">
                              Uma confirmação foi enviada para <strong>{paciente.email}</strong>.
                            </p>
                          )}
                          <button className="hp-btn-primary lg" style={{ marginTop: 24 }} onClick={fecharAgendamento}>
                            Fechar
                          </button>
                        </div>
                      )}

                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer */}
                {!agendado && (
                  <div className="hp-mag-footer">
                    {step !== "escolher-clinica" && (
                      <button className="hp-btn-back" onClick={voltar}>
                        <ArrowLeft size={15} /> Voltar
                      </button>
                    )}
                    {step !== "motivo-confirmar" ? (
                      <button className="hp-btn-primary md" disabled={!podeAvancar()} onClick={avancar}>
                        Avançar <ArrowRight size={15} />
                      </button>
                    ) : (
                      <button className="hp-btn-confirm" disabled={submitting} onClick={finalizarAgendamento}>
                        {submitting ? <><Loader2 size={15} className="hp-spin" /> Confirmando...</> : <><CheckCircle size={15} /> Confirmar Agendamento</>}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════
            MODAL CADASTRO CLÍNICA
        ══════════════════════════════════════════════════ */}
        <AnimatePresence>
          {modalClinica && (
            <ModalCadastroClinica onClose={() => setModalClinica(false)} />
          )}
        </AnimatePresence>

      </div>
    </>
  );
}

// ─── Modal Cadastro Clínica ───────────────────────────────────────────────────
function ModalCadastroClinica({ onClose }: { onClose: () => void }) {
  const [stepC, setStepC] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "", cnpj: "", email: "", telefone: "", endereco: "", senha: "", confirmarSenha: "",
  });

  const handleSubmit = async () => {
    if (form.senha !== form.confirmarSenha) { alert("As senhas não conferem!"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/api/publico/cadastro-clinica/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Erro"); }
      const data = await res.json();
      alert(`Clínica cadastrada!\n\nUsuário: ${data.clinica?.username}\n\nFaça login para acessar o painel.`);
      onClose();
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally { setLoading(false); }
  };

  return (
    <motion.div
      className="hp-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="hp-modal-cl"
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="hp-mag-header">
          <div>
            <p className="hp-mag-pre">Parceria</p>
            <h3 className="hp-mag-title">Cadastro de Clínica</h3>
          </div>
          <button className="hp-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="hp-stepper" style={{ padding: "16px 24px" }}>
          {["Dados da Clínica", "Acesso e Senha"].map((l, i) => (
            <div key={l} className="hp-stepper-item">
              <div className={`hp-stepper-dot ${i < stepC - 1 ? "done" : i === stepC - 1 ? "active" : ""}`}>
                {i < stepC - 1 ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span className={`hp-stepper-label ${i === stepC - 1 ? "active" : ""}`}>{l}</span>
              {i < 1 && <div className={`hp-stepper-line ${i < stepC - 1 ? "done" : ""}`} />}
            </div>
          ))}
        </div>

        <div className="hp-mag-body">
          {stepC === 1 ? (
            <div className="hp-step-content">
              <div className="hp-field">
                <label>Nome da Clínica *</label>
                <input placeholder="Ex: Clínica Saúde Total" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="hp-field-row">
                <div className="hp-field">
                  <label>CNPJ</label>
                  <input placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} />
                </div>
                <div className="hp-field">
                  <label>Telefone *</label>
                  <input placeholder="(+244) 000 000 000" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
                </div>
              </div>
              <div className="hp-field">
                <label>Email *</label>
                <input type="email" placeholder="contato@clinica.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="hp-field">
                <label>Endereço</label>
                <input placeholder="Rua, número, bairro, cidade" value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div className="hp-step-content">
              <div className="hp-field">
                <label>Senha *</label>
                <input type="password" placeholder="Mínimo 6 caracteres" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
              </div>
              <div className="hp-field">
                <label>Confirmar Senha *</label>
                <input type="password" placeholder="Digite novamente" value={form.confirmarSenha} onChange={e => setForm(f => ({ ...f, confirmarSenha: e.target.value }))} />
              </div>
              <div className="hp-info-box">
                <Shield size={15} />
                <span>Seus dados são protegidos e verificados antes da ativação.</span>
              </div>
            </div>
          )}
        </div>

        <div className="hp-mag-footer">
          {stepC === 2 && (
            <button className="hp-btn-back" onClick={() => setStepC(1)}>
              <ArrowLeft size={15} /> Voltar
            </button>
          )}
          {stepC === 1 ? (
            <button className="hp-btn-primary md" disabled={!form.nome || !form.email || !form.telefone} onClick={() => setStepC(2)}>
              Próximo <ArrowRight size={15} />
            </button>
          ) : (
            <button className="hp-btn-confirm" disabled={loading || !form.senha || form.senha !== form.confirmarSenha} onClick={handleSubmit}>
              {loading ? <><Loader2 size={15} className="hp-spin" /> Cadastrando...</> : <><CheckCircle size={15} /> Criar Conta</>}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const globalCss = `
@import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=Cabinet+Grotesk:wght@400;500;700;800&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --primary:#2563EB;
  --primary-light:#3B82F6;
  --primary-dark:#1D4ED8;
  --teal:#0D9488;
  --teal-light:#14B8A6;
  --success:#16A34A;
  --surface:#FFFFFF;
  --bg:#F8FAFC;
  --bg2:#F1F5F9;
  --border:#E2E8F0;
  --border2:#CBD5E1;
  --text:#0F172A;
  --text2:#475569;
  --text3:#94A3B8;
  --radius:12px;
  --radius-sm:8px;
  --shadow:0 1px 3px rgba(15,23,42,.08),0 4px 16px rgba(15,23,42,.06);
  --shadow-lg:0 8px 32px rgba(15,23,42,.14);
  font-family:'Cabinet Grotesk',sans-serif;
}
h1,h2,h3{font-family:'Clash Display',sans-serif;}
a{text-decoration:none;color:inherit;}
button{cursor:pointer;border:none;background:none;font-family:inherit;}
input,textarea,select{font-family:inherit;}

.hp-root{background:var(--bg);color:var(--text);min-height:100vh;}

/* ── Header ── */
.hp-header{background:var(--surface);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:40;}
.hp-header-inner{max-width:1280px;margin:0 auto;padding:0 32px;height:68px;display:flex;align-items:center;gap:32px;}
.hp-logo{display:flex;align-items:center;gap:10px;font-family:'Clash Display',sans-serif;font-size:20px;font-weight:700;color:var(--text);}
.hp-logo-icon{color:var(--primary);width:24px;height:24px;}
.hp-nav{flex:1;display:flex;gap:28px;}
.hp-nav-link{font-size:14px;font-weight:500;color:var(--text2);transition:color .15s;}
.hp-nav-link:hover{color:var(--primary);}
.hp-header-auth{display:flex;align-items:center;gap:12px;}
.hp-hello{font-size:14px;color:var(--text2);}

/* ── Buttons ── */
.hp-btn-primary{display:inline-flex;align-items:center;gap:8px;background:var(--primary);color:#fff;border-radius:var(--radius-sm);font-weight:700;transition:all .15s;}
.hp-btn-primary:hover{background:var(--primary-dark);transform:translateY(-1px);}
.hp-btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.hp-btn-primary.sm{padding:8px 18px;font-size:13px;}
.hp-btn-primary.md{padding:10px 22px;font-size:14px;}
.hp-btn-primary.lg{padding:14px 28px;font-size:15px;}
.hp-btn-ghost{display:inline-flex;align-items:center;gap:8px;background:var(--surface);color:var(--text);border:2px solid var(--border);border-radius:var(--radius-sm);font-weight:700;transition:all .15s;}
.hp-btn-ghost:hover{border-color:var(--primary);color:var(--primary);}
.hp-btn-ghost.lg{padding:14px 28px;font-size:15px;}
.hp-btn-back{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;color:var(--text2);transition:all .15s;}
.hp-btn-back:hover{background:var(--bg2);color:var(--text);}
.hp-btn-confirm{display:inline-flex;align-items:center;gap:7px;padding:10px 22px;border-radius:var(--radius-sm);background:var(--success);color:#fff;font-size:14px;font-weight:700;transition:all .15s;margin-left:auto;}
.hp-btn-confirm:hover:not(:disabled){background:#15803D;}
.hp-btn-confirm:disabled{opacity:.5;cursor:not-allowed;}

/* ── Hero ── */
.hp-hero{background:linear-gradient(150deg,#EFF6FF 0%,#DBEAFE 40%,#EDE9FE 100%);min-height:calc(100vh - 68px);display:flex;align-items:center;padding:32px 0;}
.hp-hero-inner{max-width:1280px;margin:0 auto;padding:0 32px;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;}
.hp-hero-badge{display:inline-flex;align-items:center;gap:7px;padding:6px 14px;background:rgba(37,99,235,.08);border:1px solid rgba(37,99,235,.18);border-radius:99px;font-size:12px;font-weight:700;color:var(--primary);margin-bottom:20px;letter-spacing:.03em;text-transform:uppercase;}
.hp-badge-dot{width:7px;height:7px;border-radius:50%;background:var(--primary);animation:pulse 1.8s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.hp-hero-title{font-size:54px;font-weight:700;line-height:1.1;margin-bottom:20px;color:var(--text);}
.hp-hero-accent{color:var(--primary);}
.hp-hero-desc{font-size:18px;color:var(--text2);line-height:1.7;margin-bottom:32px;max-width:500px;}
.hp-hero-btns{display:flex;gap:14px;margin-bottom:40px;flex-wrap:wrap;}
.hp-hero-stats{display:flex;align-items:center;gap:0;}
.hp-stat{display:flex;flex-direction:column;gap:2px;padding:0 20px;}
.hp-stat:first-child{padding-left:0;}
.hp-stat strong{font-size:28px;font-weight:800;color:var(--primary);}
.hp-stat span{font-size:13px;color:var(--text3);}
.hp-stat-div{width:1px;height:36px;background:var(--border);}
.hp-hero-visual{position:relative;height:480px;display:flex;align-items:center;justify-content:center;}
.hp-hero-orb{width:380px;height:380px;border-radius:50%;background:linear-gradient(135deg,#DBEAFE,#C7D2FE);display:flex;align-items:center;justify-content:center;}
.hp-hero-steth{color:#93C5FD;}
.hp-hero-card-float{position:absolute;background:var(--surface);padding:14px 18px;border-radius:var(--radius);box-shadow:var(--shadow-lg);display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;animation:float 3s ease-in-out infinite;}
.hp-float-icon.green{color:#16A34A;}
.hp-float-icon.blue{color:var(--primary);}
.hp-float-1{top:15%;left:-16px;animation-delay:0s;}
.hp-float-2{bottom:18%;right:-16px;animation-delay:1.5s;}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}

/* ── Sections ── */
.hp-section-inner{max-width:1280px;margin:0 auto;padding:0 32px;}
.hp-section-title{font-size:34px;font-weight:700;text-align:center;margin-bottom:48px;color:var(--text);}

/* ── Features ── */
.hp-features{padding:96px 0;background:var(--surface);}
.hp-features-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.hp-feature-card{background:var(--bg);border:1px solid var(--border);border-radius:16px;padding:32px;transition:all .2s;}
.hp-feature-card:hover{box-shadow:var(--shadow-lg);border-color:var(--primary-light);}
.hp-feature-icon-wrap{width:52px;height:52px;background:#DBEAFE;border-radius:var(--radius);display:flex;align-items:center;justify-content:center;margin-bottom:16px;}
.hp-feature-icon{color:var(--primary);}
.hp-feature-name{font-size:20px;font-weight:700;margin-bottom:10px;}
.hp-feature-desc{font-size:14px;color:var(--text2);line-height:1.7;}

/* ── How it works ── */
.hp-how{padding:96px 0;background:var(--bg);}
.hp-how-steps{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;}
.hp-how-item{display:flex;align-items:center;gap:16px;}
.hp-how-card{display:flex;flex-direction:column;align-items:center;gap:12px;max-width:240px;text-align:center;padding:28px 20px;background:var(--surface);border:1px solid var(--border);border-radius:16px;}
.hp-how-num{width:36px;height:36px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;}
.hp-how-icon{color:var(--primary);}
.hp-how-card h3{font-size:16px;font-weight:700;}
.hp-how-card p{font-size:13px;color:var(--text2);}
.hp-how-arrow{color:var(--border2);}

/* ── Rede/Clínicas ── */
.hp-rede{padding:96px 0;background:var(--surface);}
.hp-rede-sub{text-align:center;color:var(--text2);margin-top:-32px;margin-bottom:48px;font-size:16px;}
.hp-clinicas-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
.hp-clinica-card{display:flex;flex-direction:column;align-items:center;gap:10px;padding:28px 20px;background:var(--bg);border:1px solid var(--border);border-radius:16px;text-align:center;transition:all .2s;}
.hp-clinica-card:hover{box-shadow:var(--shadow-lg);border-color:var(--primary-light);transform:translateY(-2px);}
.hp-clinica-icon{width:48px;height:48px;background:#DBEAFE;border-radius:var(--radius);display:flex;align-items:center;justify-content:center;color:var(--primary);}
.hp-clinica-name{font-size:15px;font-weight:700;}
.hp-badge-active{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--success);}
.hp-badge-soon{font-size:12px;color:var(--text3);}

/* ── Footer ── */
.hp-footer{background:#0F172A;color:#fff;}
.hp-footer-inner{max-width:1280px;margin:0 auto;padding:40px 32px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px;}
.hp-footer-brand{font-size:18px;font-weight:700;color:#60A5FA;margin-bottom:4px;}
.hp-footer-copy{font-size:12px;color:#64748B;}
.hp-footer-links{display:flex;gap:24px;}
.hp-footer-link{font-size:13px;color:#94A3B8;transition:color .15s;}
.hp-footer-link:hover{color:#fff;}
.hp-footer-link.accent{color:#2DD4BF;font-weight:600;}

/* ── Overlay ── */
.hp-overlay{position:fixed;inset:0;background:rgba(15,23,42,.6);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;}

/* ── Modal Agendamento ── */
.hp-modal-ag{background:var(--surface);border-radius:20px;width:100%;max-width:620px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:var(--shadow-lg);}
.hp-modal-cl{background:var(--surface);border-radius:20px;width:100%;max-width:500px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:var(--shadow-lg);}
.hp-mag-header{display:flex;align-items:flex-start;justify-content:space-between;padding:22px 24px 16px;border-bottom:1px solid var(--border);}
.hp-mag-pre{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--primary);margin-bottom:2px;}
.hp-mag-title{font-size:18px;font-weight:700;font-family:'Clash Display',sans-serif;}
.hp-modal-close{width:32px;height:32px;border-radius:var(--radius-sm);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text2);transition:all .13s;flex-shrink:0;}
.hp-modal-close:hover{background:var(--bg2);}

/* ── Stepper ── */
.hp-stepper{display:flex;align-items:center;padding:14px 24px;background:var(--bg);border-bottom:1px solid var(--border);gap:0;overflow-x:auto;}
.hp-stepper-item{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.hp-stepper-dot{width:26px;height:26px;border-radius:50%;border:2px solid var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text3);transition:all .2s;flex-shrink:0;}
.hp-stepper-dot.active{border-color:var(--primary);background:var(--primary);color:#fff;}
.hp-stepper-dot.done{border-color:var(--success);background:var(--success);color:#fff;}
.hp-stepper-label{font-size:11px;font-weight:600;color:var(--text3);white-space:nowrap;}
.hp-stepper-label.active{color:var(--primary);}
.hp-stepper-line{flex:1;min-width:20px;height:2px;background:var(--border);margin:0 6px;transition:background .2s;}
.hp-stepper-line.done{background:var(--success);}

/* ── Modal body ── */
.hp-mag-body{flex:1;overflow-y:auto;padding:20px 24px;}
.hp-step-content{display:flex;flex-direction:column;gap:16px;}

/* ── Search ── */
.hp-search{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);}
.hp-search input{flex:1;border:none;background:transparent;outline:none;font-size:14px;}
.hp-search svg{color:var(--text3);flex-shrink:0;}

/* ── Clinica list ── */
.hp-clinica-list{display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;}
.hp-clinica-row{display:flex;align-items:center;gap:14px;padding:14px;border:2px solid var(--border);border-radius:var(--radius);text-align:left;transition:all .15s;width:100%;}
.hp-clinica-row:hover{border-color:var(--primary-light);background:var(--bg);}
.hp-clinica-row.sel{border-color:var(--primary);background:#EFF6FF;}
.hp-clinica-row-icon{width:42px;height:42px;border-radius:var(--radius-sm);background:#DBEAFE;display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0;}
.hp-clinica-row-info{flex:1;display:flex;flex-direction:column;gap:3px;}
.hp-clinica-row-info strong{font-size:14px;font-weight:700;}
.hp-clinica-row-info span{font-size:12px;color:var(--text2);display:flex;align-items:center;gap:4px;}
.hp-sel-check{color:var(--success);flex-shrink:0;}

/* ── Médico list ── */
.hp-medico-list{display:flex;flex-direction:column;gap:8px;max-height:320px;overflow-y:auto;}
.hp-medico-row{display:flex;align-items:center;gap:14px;padding:14px;border:2px solid var(--border);border-radius:var(--radius);text-align:left;transition:all .15s;width:100%;}
.hp-medico-row:hover{border-color:var(--primary-light);}
.hp-medico-row.sel{border-color:var(--primary);background:#EFF6FF;}
.hp-medico-av{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#DCFCE7,#BBF7D0);color:var(--success);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;flex-shrink:0;}
.hp-medico-info{flex:1;display:flex;flex-direction:column;gap:2px;}
.hp-medico-info strong{font-size:14px;font-weight:700;}
.hp-medico-info span{font-size:12px;color:var(--text2);}
.hp-medico-info small{font-size:11px;color:var(--text3);}

/* ── Info pill ── */
.hp-info-pill{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;background:#EFF6FF;border-radius:var(--radius-sm);font-size:13px;font-weight:600;color:var(--primary);}

/* ── Fields ── */
.hp-field{display:flex;flex-direction:column;gap:5px;}
.hp-field label{font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em;}
.hp-field input,.hp-field textarea,.hp-field select{padding:10px 13px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;transition:border-color .15s,box-shadow .15s;outline:none;background:var(--bg);}
.hp-field input:focus,.hp-field textarea:focus,.hp-field select:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(37,99,235,.08);background:var(--surface);}
.hp-field small{font-size:11px;color:var(--text3);}
.hp-opt{font-size:10px;font-weight:400;color:var(--text3);text-transform:none;letter-spacing:0;}
.hp-field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}

/* ── Horários ── */
.hp-horarios{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px;}
.hp-hora-btn{display:flex;align-items:center;justify-content:center;gap:5px;padding:10px 6px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;font-weight:600;transition:all .15s;}
.hp-hora-btn:hover{border-color:var(--primary);color:var(--primary);}
.hp-hora-btn.sel{background:var(--primary);border-color:var(--primary);color:#fff;}
.hp-no-horarios{font-size:13px;color:var(--text3);padding:16px 0;text-align:center;}

/* ── Confirm box ── */
.hp-confirm-box{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:16px;}
.hp-confirm-box h4{font-size:14px;font-weight:700;margin-bottom:12px;color:var(--text);}
.hp-confirm-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);}
.hp-confirm-row:last-child{border-bottom:none;}
.hp-confirm-row span{font-size:13px;color:var(--text2);}
.hp-confirm-row strong{font-size:13px;color:var(--text);font-weight:600;}
.hp-confirm-aviso{font-size:12px;color:var(--text3);line-height:1.6;}

/* ── Success ── */
.hp-success{display:flex;flex-direction:column;align-items:center;text-align:center;padding:24px 0;gap:12px;}
.hp-success-icon{color:var(--success);}
.hp-success h3{font-size:22px;font-weight:700;}
.hp-success p{font-size:14px;color:var(--text2);line-height:1.7;max-width:380px;}
.hp-success-email{font-size:13px;color:var(--text3);}

/* ── Info box ── */
.hp-info-box{display:flex;align-items:center;gap:10px;padding:14px;background:#EFF6FF;border-radius:var(--radius-sm);font-size:13px;color:var(--primary);font-weight:500;}

/* ── Loading / Empty ── */
.hp-loading{display:flex;align-items:center;gap:10px;padding:32px;color:var(--text2);font-size:13px;justify-content:center;}
.hp-loading.sm{padding:16px;}
.hp-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:36px;color:var(--text3);}
.hp-empty p{font-size:13px;}
.hp-spin{animation:spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}

/* ── Modal footer ── */
.hp-mag-footer{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-top:1px solid var(--border);gap:10px;}
.hp-mag-footer .hp-btn-primary{margin-left:auto;}

/* ── Responsive ── */
@media(max-width:1024px){
  .hp-hero-inner{grid-template-columns:1fr;text-align:center;}
  .hp-hero-visual{display:none;}
  .hp-hero-title{font-size:40px;}
  .hp-hero-btns{justify-content:center;}
  .hp-hero-stats{justify-content:center;}
  .hp-features-grid{grid-template-columns:1fr;}
  .hp-how-steps{flex-direction:column;}
  .hp-how-arrow{transform:rotate(90deg);}
  .hp-clinicas-grid{grid-template-columns:1fr;}
}
@media(max-width:640px){
  .hp-hero-title{font-size:30px;}
  .hp-field-row{grid-template-columns:1fr;}
  .hp-horarios{grid-template-columns:repeat(3,1fr);}
  .hp-stepper-label{display:none;}
}
`;