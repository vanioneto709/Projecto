"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu, X, Phone, ArrowRight, Star, Smile, Shield, Sparkles,
  Heart, Stethoscope, Baby, CheckCircle2, MapPin, Clock, Mail,
  ChevronRight, ArrowLeft, Calendar, Users, Search, Loader2,
  CheckCircle, AlertCircle, User,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Medico { id: number; nome: string; especialidade: string; crm: string; }
type AgStep = "medico" | "data-hora" | "motivo" | "confirmar";
const AG_STEPS: AgStep[] = ["medico", "data-hora", "motivo", "confirmar"];
const STEP_LABELS = ["Médico", "Data & Hora", "Motivo", "Confirmar"];
const HORARIOS = [
  "08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30",
];

// ─── Data ─────────────────────────────────────────────────────────────────────
const navLinks = [
  { label: "Início", href: "#inicio" },
  { label: "Serviços", href: "#servicos" },
  { label: "Sobre", href: "#sobre" },
  { label: "Equipa", href: "#equipa" },
  { label: "Contacto", href: "#contacto" },
];

const services = [
  { icon: Smile,      title: "Ortodontia",           desc: "Alinhamento dentário com aparelhos fixos, removíveis e invisíveis." },
  { icon: Sparkles,   title: "Estética Dentária",    desc: "Branqueamento e facetas para um sorriso mais bonito." },
  { icon: Shield,     title: "Implantologia",        desc: "Implantes dentários modernos para substituir dentes perdidos." },
  { icon: Heart,      title: "Endodontia",           desc: "Tratamento de canal com conforto e precisão." },
  { icon: Stethoscope,title: "Medicina Dentária Geral", desc: "Consultas e limpeza para manter a saúde oral." },
  { icon: Baby,       title: "Odontopediatria",      desc: "Cuidados dentários especializados para crianças." },
];

const stats = [
  { number: "15+",    label: "Anos de Experiência" },
  { number: "2.000+", label: "Pacientes Felizes" },
  { number: "8",      label: "Especialistas" },
  { number: "98%",    label: "Taxa de Satisfação" },
];

const highlights = [
  "Mais de 15 anos de experiência",
  "Equipamentos modernos de última geração",
  "Equipa especializada e dedicada",
  "Atendimento personalizado e humanizado",
];

const team = [
  { name: "Dra. Ana Rodrigues", role: "Implantologia",  initials: "AR", color: "#2563EB" },
  { name: "Dr. Miguel Santos",  role: "Ortodontia",     initials: "MS", color: "#0D9488" },
  { name: "Dra. Sofia Costa",   role: "Estética",       initials: "SC", color: "#7C3AED" },
  { name: "Dr. Pedro Almeida",  role: "Endodontia",     initials: "PA", color: "#D97706" },
];

const contactInfo = [
  { icon: MapPin, label: "Morada",   value: "Av. da Liberdade 120, Luanda" },
  { icon: Phone,  label: "Telefone", value: "+244 912 345 678" },
  { icon: Mail,   label: "Email",    value: "info@ssorrisos.ao" },
  { icon: Clock,  label: "Horário",  value: "Seg–Sex: 08h–18h" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getStoredTipo() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("user_tipo");
}
function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access");
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ClinicaSsorrisos() {
  const router = useRouter();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [userTipo, setUserTipo]       = useState<string|null>(null);

  // Modal de login necessário
  const [showLoginModal, setShowLoginModal] = useState(false);
  // Modal de agendamento
  const [showAgModal, setShowAgModal] = useState(false);

  // Agendamento state
  const [agStep, setAgStep]           = useState<AgStep>("medico");
  const [medicos, setMedicos]         = useState<Medico[]>([]);
  const [medicoSel, setMedicoSel]     = useState<Medico|null>(null);
  const [dataSel, setDataSel]         = useState("");
  const [horaSel, setHoraSel]         = useState("");
  const [motivo, setMotivo]           = useState("");
  const [buscaMed, setBuscaMed]       = useState("");
  const [horarioOcup, setHorarioOcup] = useState<string[]>([]);
  const [submitting, setSubmitting]   = useState(false);
  const [agendado, setAgendado]       = useState(false);
  const [agError, setAgError]         = useState("");

  // Paciente sem login
  const [pacNome, setPacNome]         = useState("");
  const [pacTel, setPacTel]           = useState("");
  const [pacEmail, setPacEmail]       = useState("");

  useEffect(() => {
    const tipo = getStoredTipo();
    const token = getStoredToken();
    setIsLoggedIn(!!token && !!tipo);
    setUserTipo(tipo);
    fetchMedicos();
  }, []);

  const fetchMedicos = async () => {
    try {
      const r = await fetch(`${API}/api/publico/medicos/`);
      if (r.ok) setMedicos(await r.json());
    } catch {}
  };

  const fetchHorarios = async (medicoId: number, data: string) => {
    try {
      const r = await fetch(`${API}/api/publico/horarios/?medico_id=${medicoId}&data=${data}`);
      if (r.ok) { const d = await r.json(); setHorarioOcup(d.horariosOcupados ?? []); }
    } catch {}
  };

  const handleMarcarConsulta = () => {
    // Se logado como paciente → abre o modal de agendamento autenticado
    // Se logado como outro tipo → redireciona para o dashboard dele
    // Se não logado → abre o fluxo de agendamento público (com dados do paciente)
    resetAg();
    setShowAgModal(true);
  };

  const handleEntrar = () => {
    if (isLoggedIn && userTipo) {
      const map: Record<string, string> = {
        admin: "/dashboard", clinica: "/dashboard-clinica",
        admin_clinica: "/dashboard-clinica", medico: "/dashboard-medico",
        paciente: "/dashboard-paciente",
      };
      router.push(map[userTipo] ?? "/dashboard-paciente");
    } else {
      router.push("/login");
    }
  };

  const resetAg = () => {
    setAgStep("medico"); setMedicoSel(null); setDataSel(""); setHoraSel("");
    setMotivo(""); setBuscaMed(""); setAgendado(false); setAgError("");
    setPacNome(""); setPacTel(""); setPacEmail("");
  };

  const confirmarAgendamento = async () => {
    setSubmitting(true); setAgError("");
    try {
      const token = getStoredToken();
      const isAuth = !!token && userTipo === "paciente";

      const endpoint = isAuth ? `${API}/api/paciente/agendar/` : `${API}/api/publico/agendar/`;
      const body = isAuth
        ? { medicoId: medicoSel!.id, data: dataSel, hora: horaSel, motivo }
        : { clinicaId: 1, medicoId: medicoSel!.id, data: dataSel, hora: horaSel,
            motivo, nome: pacNome, telefone: pacTel, email: pacEmail };

      const headers: Record<string,string> = { "Content-Type": "application/json" };
      if (isAuth && token) headers["Authorization"] = `Bearer ${token}`;

      const r = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });
      if (r.ok) { setAgendado(true); }
      else {
        const e = await r.json();
        setAgError(e.error ?? "Erro ao agendar. Tente novamente.");
      }
    } catch { setAgError("Erro de conexão. Verifique sua internet."); }
    finally { setSubmitting(false); }
  };

  const agStepIdx = AG_STEPS.indexOf(agStep);
  const medicosFiltrados = medicos.filter(m =>
    m.nome.toLowerCase().includes(buscaMed.toLowerCase()) ||
    (m.especialidade ?? "").toLowerCase().includes(buscaMed.toLowerCase())
  );

  const podeAvancar = () => {
    if (agStep === "medico") return !!medicoSel;
    if (agStep === "data-hora") return !!dataSel && !!horaSel;
    if (agStep === "motivo") {
      const isAuth = !!getStoredToken() && userTipo === "paciente";
      if (!isAuth) return !!(pacNome && pacTel);
      return true;
    }
    return true;
  };

  return (
    <>
      <style>{css}</style>
      <div className="cl-root">

        {/* ── NAVBAR ── */}
        <nav className="cl-nav">
          <div className="cl-nav-inner">
            <a href="#inicio" className="cl-logo">
              <span className="cl-logo-tooth">🦷</span> SSorrisos
            </a>

            <div className="cl-nav-links">
              {navLinks.map(l => (
                <a key={l.href} href={l.href} className="cl-nav-link">{l.label}</a>
              ))}
            </div>

            <div className="cl-nav-actions">
              <button className="cl-btn-outline" onClick={handleEntrar}>
                {isLoggedIn ? (
                  <><User size={15}/> Meu Painel</>
                ) : (
                  <><User size={15}/> Entrar</>
                )}
              </button>
              <button className="cl-btn-primary" onClick={handleMarcarConsulta}>
                <Calendar size={15}/> Marcar Consulta
              </button>
            </div>

            <button className="cl-hamburger" onClick={() => setMenuOpen(p => !p)}>
              {menuOpen ? <X size={22}/> : <Menu size={22}/>}
            </button>
          </div>

          {/* Mobile menu */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div className="cl-mobile-menu"
                initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}>
                {navLinks.map(l => (
                  <a key={l.href} href={l.href} className="cl-mobile-link" onClick={()=>setMenuOpen(false)}>{l.label}</a>
                ))}
                <button className="cl-btn-primary w-full" onClick={()=>{setMenuOpen(false);handleMarcarConsulta();}}>
                  <Calendar size={15}/> Marcar Consulta
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* ── HERO ── */}
        <section id="inicio" className="cl-hero">
          <div className="cl-hero-overlay"/>
          <img src="https://images.unsplash.com/photo-1588776814546-1ffbb172748c?w=1920&q=80"
            alt="Clínica SSorrisos" className="cl-hero-img"/>
          <div className="cl-hero-content">
            <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:.7}}>
              <div className="cl-hero-badge"><Star size={13}/> Clínica de Excelência em Angola</div>
              <h1 className="cl-hero-title">
                O seu sorriso merece<br/><span>o melhor cuidado</span>
              </h1>
              <p className="cl-hero-desc">
                Medicina dentária moderna com a mais avançada tecnologia.<br/>
                Cuidamos do seu sorriso com dedicação e profissionalismo.
              </p>
              <div className="cl-hero-btns">
                <button className="cl-btn-hero-primary" onClick={handleMarcarConsulta}>
                  <Calendar size={18}/> Marcar Consulta
                </button>
                <a href="#servicos" className="cl-btn-hero-ghost">
                  Ver Serviços <ArrowRight size={16}/>
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── STATS BAR ── */}
        <div className="cl-stats-bar">
          {stats.map(s => (
            <div key={s.label} className="cl-stat">
              <strong>{s.number}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── SERVIÇOS ── */}
        <section id="servicos" className="cl-section">
          <div className="cl-section-inner">
            <div className="cl-section-header">
              <p className="cl-section-pre">O que oferecemos</p>
              <h2>Os Nossos Serviços</h2>
              <p className="cl-section-sub">
                Tratamentos dentários completos com tecnologia de ponta e profissionais especializados.
              </p>
            </div>

            <div className="cl-services-grid">
              {services.map((s, i) => (
                <motion.div key={s.title} className="cl-service-card"
                  initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}}
                  viewport={{once:true}} transition={{delay:i*.08}}>
                  <div className="cl-service-icon"><s.icon size={24}/></div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SOBRE ── */}
        <section id="sobre" className="cl-section cl-sobre">
          <div className="cl-section-inner">
            <div className="cl-sobre-grid">
              <div>
                <p className="cl-section-pre">Quem somos</p>
                <h2>Sobre a SSorrisos</h2>
                <p className="cl-sobre-desc">
                  A Clínica SSorrisos é referência em medicina dentária em Angola.
                  Com mais de 15 anos de experiência, oferecemos atendimento de excelência
                  com uma equipa de especialistas altamente qualificados.
                </p>
                {highlights.map(h => (
                  <div key={h} className="cl-highlight">
                    <CheckCircle2 size={18} className="cl-check"/> <span>{h}</span>
                  </div>
                ))}
                <button className="cl-btn-primary" style={{marginTop:24}} onClick={handleMarcarConsulta}>
                  Marcar Consulta <ArrowRight size={16}/>
                </button>
              </div>

              <div className="cl-stats-grid">
                {stats.map(s => (
                  <div key={s.label} className="cl-stat-card">
                    <strong>{s.number}</strong>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── EQUIPA ── */}
        <section id="equipa" className="cl-section">
          <div className="cl-section-inner">
            <div className="cl-section-header">
              <p className="cl-section-pre">Profissionais</p>
              <h2>A Nossa Equipa</h2>
            </div>
            <div className="cl-team-grid">
              {team.map(m => (
                <motion.div key={m.name} className="cl-team-card"
                  initial={{opacity:0,scale:.96}} whileInView={{opacity:1,scale:1}}
                  viewport={{once:true}}>
                  <div className="cl-team-av" style={{background:m.color}}>{m.initials}</div>
                  <h3>{m.name}</h3>
                  <p>{m.role}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BAND ── */}
        <div className="cl-cta-band">
          <div className="cl-cta-inner">
            <div>
              <h3>Pronto para cuidar do seu sorriso?</h3>
              <p>Agende a sua consulta hoje mesmo. Rápido, fácil e sem complicações.</p>
            </div>
            <button className="cl-btn-cta" onClick={handleMarcarConsulta}>
              <Calendar size={17}/> Marcar Consulta Agora
            </button>
          </div>
        </div>

        {/* ── CONTACTO ── */}
        <section id="contacto" className="cl-section cl-sobre">
          <div className="cl-section-inner">
            <div className="cl-section-header">
              <p className="cl-section-pre">Fale connosco</p>
              <h2>Contacto</h2>
            </div>
            <div className="cl-contact-grid">
              <div>
                {contactInfo.map(c => (
                  <div key={c.label} className="cl-contact-row">
                    <div className="cl-contact-icon"><c.icon size={18}/></div>
                    <div>
                      <p className="cl-contact-label">{c.label}</p>
                      <p className="cl-contact-val">{c.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cl-contact-form">
                <h3>Envie uma mensagem</h3>
                <input className="cl-input" placeholder="O seu nome"/>
                <input className="cl-input" placeholder="Email ou telefone"/>
                <textarea className="cl-input" rows={4} placeholder="A sua mensagem..."/>
                <button className="cl-btn-primary">Enviar Mensagem</button>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="cl-footer">
          <div className="cl-footer-inner">
            <div>
              <p className="cl-footer-brand">🦷 SSorrisos</p>
              <p className="cl-footer-copy">© {new Date().getFullYear()} Clínica SSorrisos. Todos os direitos reservados.</p>
            </div>
            <div className="cl-footer-links">
              <a href="/termos">Termos</a>
              <a href="/privacidade">Privacidade</a>
              <Link href="/login">Área Restrita</Link>
            </div>
          </div>
        </footer>

        {/* ══════════════════════════════════════
            MODAL DE AGENDAMENTO
        ══════════════════════════════════════ */}
        <AnimatePresence>
          {showAgModal && (
            <motion.div className="cl-overlay"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>{ setShowAgModal(false); }}>
              <motion.div className="cl-modal"
                initial={{opacity:0,y:32}} animate={{opacity:1,y:0}} exit={{opacity:0,y:32}}
                onClick={e=>e.stopPropagation()}>

                {/* Header */}
                <div className="cl-modal-header">
                  <div>
                    <p className="cl-modal-pre">Clínica SSorrisos</p>
                    <h3 className="cl-modal-title">
                      {agendado ? "Consulta Agendada!" :
                       agStep==="medico" ? "Escolha o Médico" :
                       agStep==="data-hora" ? "Data e Horário" :
                       agStep==="motivo" ? "Dados e Motivo" : "Confirmar Agendamento"}
                    </h3>
                  </div>
                  <button className="cl-modal-close" onClick={()=>setShowAgModal(false)}><X size={17}/></button>
                </div>

                {/* Stepper */}
                {!agendado && (
                  <div className="cl-stepper">
                    {STEP_LABELS.map((l,i)=>(
                      <div key={l} className="cl-stepper-item">
                        <div className={`cl-sdot ${i<agStepIdx?"done":i===agStepIdx?"active":""}`}>
                          {i<agStepIdx?<CheckCircle size={13}/>:i+1}
                        </div>
                        <span className={`cl-slbl ${i===agStepIdx?"active":""}`}>{l}</span>
                        {i<3&&<div className={`cl-sline ${i<agStepIdx?"done":""}`}/>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Body */}
                <div className="cl-modal-body">
                  <AnimatePresence mode="wait">
                    <motion.div key={agendado?"success":agStep}
                      initial={{opacity:0,x:14}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-14}}
                      transition={{duration:.18}}>

                      {/* ── SUCESSO ── */}
                      {agendado && (
                        <div className="cl-success">
                          <CheckCircle size={56} className="cl-success-icon"/>
                          <h3>Consulta agendada com sucesso!</h3>
                          <p>A sua consulta com <strong>Dr(a). {medicoSel?.nome}</strong> está marcada para <strong>{new Date(dataSel).toLocaleDateString("pt-BR")} às {horaSel}</strong>.</p>
                          {!getStoredToken() && <p className="cl-success-note">Receberá uma confirmação em breve.</p>}
                          <div style={{display:"flex",gap:12,marginTop:20,justifyContent:"center"}}>
                            <button className="cl-btn-primary" onClick={()=>setShowAgModal(false)}>Fechar</button>
                            <button className="cl-btn-outline-sm" onClick={resetAg}>Agendar outra</button>
                          </div>
                        </div>
                      )}

                      {/* ── STEP 1: Médico ── */}
                      {!agendado && agStep==="medico" && (
                        <div>
                          <div className="cl-search">
                            <Search size={15}/><input placeholder="Buscar por nome ou especialidade..." value={buscaMed} onChange={e=>setBuscaMed(e.target.value)}/>
                          </div>
                          <div className="cl-medico-list">
                            {medicosFiltrados.length===0 && <p className="cl-empty-sm">Nenhum médico encontrado</p>}
                            {medicosFiltrados.map(m=>(
                              <button key={m.id} className={`cl-medico-row ${medicoSel?.id===m.id?"sel":""}`} onClick={()=>setMedicoSel(m)}>
                                <div className="cl-med-av">{m.nome[0]}</div>
                                <div className="cl-med-info"><strong>Dr(a). {m.nome}</strong><span>{m.especialidade||"Geral"}</span></div>
                                {medicoSel?.id===m.id&&<CheckCircle size={17} className="cl-sel-chk"/>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── STEP 2: Data & Hora ── */}
                      {!agendado && agStep==="data-hora" && (
                        <div>
                          <div className="cl-info-pill"><Stethoscope size={13}/> Dr(a). {medicoSel?.nome} — {medicoSel?.especialidade||"Geral"}</div>
                          <div className="cl-field">
                            <label>Data da consulta *</label>
                            <input type="date" min={new Date().toISOString().split("T")[0]}
                              value={dataSel}
                              onChange={e=>{ setDataSel(e.target.value); setHoraSel(""); if(medicoSel) fetchHorarios(medicoSel.id,e.target.value); }}/>
                          </div>
                          {dataSel && (
                            <div className="cl-field">
                              <label>Horário disponível *</label>
                              <div className="cl-horarios">
                                {HORARIOS.map(h=>(
                                  <button key={h}
                                    className={`cl-hora-btn ${horaSel===h?"sel":""} ${horarioOcup.includes(h)?"busy":""}`}
                                    disabled={horarioOcup.includes(h)}
                                    onClick={()=>setHoraSel(h)}>
                                    <Clock size={11}/>{h}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── STEP 3: Motivo (+ dados se não logado) ── */}
                      {!agendado && agStep==="motivo" && (
                        <div>
                          {!getStoredToken() && (
                            <div>
                              <div className="cl-field-row">
                                <div className="cl-field">
                                  <label>Nome completo *</label>
                                  <input placeholder="Ex: João Silva" value={pacNome} onChange={e=>setPacNome(e.target.value)}/>
                                </div>
                                <div className="cl-field">
                                  <label>Telefone *</label>
                                  <input placeholder="+244 9XX XXX XXX" value={pacTel} onChange={e=>setPacTel(e.target.value)}/>
                                </div>
                              </div>
                              <div className="cl-field">
                                <label>Email <span className="cl-opt">(opcional)</span></label>
                                <input type="email" placeholder="seu@email.com" value={pacEmail} onChange={e=>setPacEmail(e.target.value)}/>
                              </div>
                            </div>
                          )}
                          <div className="cl-field">
                            <label>Motivo da consulta <span className="cl-opt">(opcional)</span></label>
                            <textarea rows={3} placeholder="Ex: Dor de dente, limpeza, revisão..." value={motivo} onChange={e=>setMotivo(e.target.value)}/>
                          </div>
                        </div>
                      )}

                      {/* ── STEP 4: Confirmar ── */}
                      {!agendado && agStep==="confirmar" && (
                        <div>
                          {agError && <div className="cl-error"><AlertCircle size={14}/> {agError}</div>}
                          <div className="cl-confirm-box">
                            <h4>Resumo do agendamento</h4>
                            {[
                              ["Clínica",       "Clínica SSorrisos"],
                              ["Médico",        `Dr(a). ${medicoSel?.nome}`],
                              ["Especialidade", medicoSel?.especialidade||"Geral"],
                              ["Data",          new Date(dataSel).toLocaleDateString("pt-BR")],
                              ["Horário",       horaSel],
                              ...(!getStoredToken() ? [
                                ["Paciente", pacNome],
                                ["Telefone", pacTel],
                                ...(pacEmail ? [["Email", pacEmail]] : []),
                              ] : []),
                              ...(motivo ? [["Motivo", motivo]] : []),
                            ].map(([l,v])=>(
                              <div key={l} className="cl-confirm-row">
                                <span>{l}</span><strong>{v}</strong>
                              </div>
                            ))}
                          </div>
                          <p className="cl-confirm-note">
                            Ao confirmar, a consulta será registada e a clínica será notificada.
                          </p>
                        </div>
                      )}

                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer */}
                {!agendado && (
                  <div className="cl-modal-footer">
                    {agStepIdx>0 && (
                      <button className="cl-btn-back" onClick={()=>setAgStep(AG_STEPS[agStepIdx-1])}>
                        <ArrowLeft size={14}/> Voltar
                      </button>
                    )}
                    {agStep!=="confirmar" ? (
                      <button className="cl-btn-primary" disabled={!podeAvancar()}
                        onClick={()=>setAgStep(AG_STEPS[agStepIdx+1])}>
                        Avançar <ArrowRight size={14}/>
                      </button>
                    ) : (
                      <button className="cl-btn-confirm" disabled={submitting} onClick={confirmarAgendamento}>
                        {submitting
                          ? <><Loader2 size={14} className="spin"/> Agendando...</>
                          : <><CheckCircle size={14}/> Confirmar Agendamento</>}
                      </button>
                    )}
                  </div>
                )}

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --blue:#2563EB;--blue-d:#1D4ED8;--blue-l:#EFF6FF;
  --teal:#0D9488;--surface:#fff;--bg:#F8FAFF;--bg2:#F1F5FB;
  --border:#E4ECF5;--text:#0B1F3A;--text2:#4B5563;--text3:#9CA3AF;
  --radius:12px;--radius-sm:8px;
  font-family:'Outfit',sans-serif;background:var(--surface);color:var(--text);
}
a{text-decoration:none;color:inherit;}
button{cursor:pointer;font-family:inherit;border:none;background:none;}
img{max-width:100%;}

.cl-root{min-height:100vh;}

/* ── Navbar ── */
.cl-nav{position:fixed;top:0;left:0;right:0;z-index:50;background:rgba(255,255,255,.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);}
.cl-nav-inner{max-width:1200px;margin:0 auto;padding:0 24px;height:64px;display:flex;align-items:center;gap:28px;}
.cl-logo{font-size:20px;font-weight:800;color:var(--blue);letter-spacing:-.02em;flex-shrink:0;}
.cl-logo-tooth{margin-right:4px;}
.cl-nav-links{flex:1;display:flex;gap:24px;}
.cl-nav-link{font-size:14px;font-weight:500;color:var(--text2);transition:color .13s;}
.cl-nav-link:hover{color:var(--blue);}
.cl-nav-actions{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.cl-hamburger{display:none;color:var(--text2);}
.cl-mobile-menu{background:var(--surface);border-top:1px solid var(--border);padding:16px 24px;display:flex;flex-direction:column;gap:8px;}
.cl-mobile-link{padding:10px 0;font-size:15px;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border);}

/* ── Buttons ── */
.cl-btn-primary{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;background:var(--blue);color:#fff;border-radius:var(--radius-sm);font-size:14px;font-weight:700;transition:all .14s;}
.cl-btn-primary:hover:not(:disabled){background:var(--blue-d);transform:translateY(-1px);}
.cl-btn-primary:disabled{opacity:.5;cursor:not-allowed;}
.cl-btn-outline{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border:1.5px solid var(--border);background:var(--surface);color:var(--text2);border-radius:var(--radius-sm);font-size:13px;font-weight:600;transition:all .14s;}
.cl-btn-outline:hover{border-color:var(--blue);color:var(--blue);}
.cl-btn-outline-sm{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:1.5px solid var(--border);background:transparent;color:var(--text2);border-radius:var(--radius-sm);font-size:13px;font-weight:600;}
.cl-btn-back{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;color:var(--text2);transition:all .13s;}
.cl-btn-back:hover{background:var(--bg);}
.cl-btn-confirm{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;background:var(--teal);color:#fff;border-radius:var(--radius-sm);font-size:13px;font-weight:700;margin-left:auto;transition:opacity .13s;}
.cl-btn-confirm:hover:not(:disabled){opacity:.88;}
.cl-btn-confirm:disabled{opacity:.5;cursor:not-allowed;}
.w-full{width:100%;}

/* ── Hero ── */
.cl-hero{position:relative;min-height:100vh;display:flex;align-items:center;padding-top:64px;}
.cl-hero-overlay{position:absolute;inset:0;background:linear-gradient(105deg,rgba(11,31,58,.82) 0%,rgba(11,31,58,.4) 60%,transparent 100%);}
.cl-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.cl-hero-content{position:relative;z-index:2;max-width:1200px;margin:0 auto;padding:0 32px;}
.cl-hero-badge{display:inline-flex;align-items:center;gap:7px;padding:6px 14px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);backdrop-filter:blur(8px);border-radius:99px;font-size:12px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.06em;margin-bottom:20px;}
.cl-hero-title{font-size:58px;font-weight:800;line-height:1.08;color:#fff;margin-bottom:20px;max-width:640px;}
.cl-hero-title span{color:#7DD3FC;}
.cl-hero-desc{font-size:18px;color:rgba(255,255,255,.8);line-height:1.7;max-width:500px;margin-bottom:36px;}
.cl-hero-btns{display:flex;gap:14px;flex-wrap:wrap;}
.cl-btn-hero-primary{display:inline-flex;align-items:center;gap:9px;padding:15px 30px;background:var(--blue);color:#fff;border-radius:var(--radius-sm);font-size:15px;font-weight:700;box-shadow:0 6px 24px rgba(37,99,235,.35);transition:all .15s;}
.cl-btn-hero-primary:hover{background:var(--blue-d);transform:translateY(-2px);}
.cl-btn-hero-ghost{display:inline-flex;align-items:center;gap:9px;padding:15px 28px;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.3);color:#fff;border-radius:var(--radius-sm);font-size:15px;font-weight:600;transition:all .15s;}
.cl-btn-hero-ghost:hover{background:rgba(255,255,255,.2);}

/* ── Stats bar ── */
.cl-stats-bar{background:var(--blue);display:grid;grid-template-columns:repeat(4,1fr);}
.cl-stat{display:flex;flex-direction:column;align-items:center;padding:24px;border-right:1px solid rgba(255,255,255,.15);}
.cl-stat:last-child{border-right:none;}
.cl-stat strong{font-size:28px;font-weight:800;color:#fff;}
.cl-stat span{font-size:13px;color:rgba(255,255,255,.7);}

/* ── Sections ── */
.cl-section{padding:96px 0;}
.cl-sobre{background:var(--bg2);}
.cl-section-inner{max-width:1200px;margin:0 auto;padding:0 32px;}
.cl-section-header{text-align:center;margin-bottom:56px;}
.cl-section-pre{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--blue);margin-bottom:10px;}
.cl-section-header h2{font-size:38px;font-weight:800;margin-bottom:14px;color:var(--text);}
.cl-section-sub{font-size:16px;color:var(--text2);max-width:540px;margin:0 auto;line-height:1.7;}

/* ── Services ── */
.cl-services-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
.cl-service-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;transition:all .2s;}
.cl-service-card:hover{border-color:var(--blue);box-shadow:0 8px 32px rgba(37,99,235,.1);transform:translateY(-3px);}
.cl-service-icon{width:48px;height:48px;background:var(--blue-l);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;color:var(--blue);margin-bottom:16px;}
.cl-service-card h3{font-size:17px;font-weight:700;margin-bottom:8px;}
.cl-service-card p{font-size:14px;color:var(--text2);line-height:1.7;}

/* ── Sobre ── */
.cl-sobre-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;}
.cl-sobre-grid h2{font-size:36px;font-weight:800;margin-bottom:14px;}
.cl-sobre-desc{font-size:15px;color:var(--text2);line-height:1.8;margin-bottom:20px;}
.cl-highlight{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;margin-bottom:10px;}
.cl-check{color:var(--blue);flex-shrink:0;}
.cl-stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.cl-stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;text-align:center;box-shadow:0 2px 8px rgba(15,33,55,.04);}
.cl-stat-card strong{display:block;font-size:32px;font-weight:800;color:var(--blue);margin-bottom:4px;}
.cl-stat-card span{font-size:13px;color:var(--text2);}

/* ── Team ── */
.cl-team-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;}
.cl-team-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px 20px;text-align:center;transition:all .2s;}
.cl-team-card:hover{border-color:var(--blue);transform:translateY(-3px);}
.cl-team-av{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:800;margin:0 auto 14px;}
.cl-team-card h3{font-size:15px;font-weight:700;margin-bottom:4px;}
.cl-team-card p{font-size:13px;color:var(--text3);}

/* ── CTA Band ── */
.cl-cta-band{background:linear-gradient(120deg,#0B1F3A,#1E3A5F);padding:56px 32px;}
.cl-cta-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap;}
.cl-cta-inner h3{font-size:26px;font-weight:800;color:#fff;margin-bottom:6px;}
.cl-cta-inner p{font-size:15px;color:rgba(255,255,255,.65);}
.cl-btn-cta{display:inline-flex;align-items:center;gap:9px;padding:14px 28px;background:#fff;color:var(--blue);border-radius:var(--radius-sm);font-size:15px;font-weight:800;flex-shrink:0;transition:all .15s;}
.cl-btn-cta:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(255,255,255,.2);}

/* ── Contact ── */
.cl-contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:start;}
.cl-contact-row{display:flex;align-items:flex-start;gap:14px;margin-bottom:20px;}
.cl-contact-icon{width:40px;height:40px;border-radius:var(--radius-sm);background:var(--blue-l);color:var(--blue);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cl-contact-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);margin-bottom:2px;}
.cl-contact-val{font-size:14px;font-weight:600;color:var(--text);}
.cl-contact-form{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;box-shadow:0 4px 16px rgba(15,33,55,.06);}
.cl-contact-form h3{font-size:18px;font-weight:700;margin-bottom:20px;}
.cl-input{width:100%;padding:10px 13px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;color:var(--text);background:var(--bg);margin-bottom:12px;outline:none;transition:border-color .13s;display:block;resize:vertical;}
.cl-input:focus{border-color:var(--blue);background:var(--surface);}

/* ── Footer ── */
.cl-footer{background:#0B1F3A;padding:32px;}
.cl-footer-inner{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;}
.cl-footer-brand{font-size:18px;font-weight:800;color:#fff;margin-bottom:4px;}
.cl-footer-copy{font-size:12px;color:rgba(255,255,255,.4);}
.cl-footer-links{display:flex;gap:20px;}
.cl-footer-links a{font-size:13px;color:rgba(255,255,255,.5);transition:color .13s;}
.cl-footer-links a:hover{color:#fff;}

/* ── Modal ── */
.cl-overlay{position:fixed;inset:0;background:rgba(11,31,58,.6);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;}
.cl-modal{background:var(--surface);border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3);}
.cl-modal-header{display:flex;align-items:flex-start;justify-content:space-between;padding:20px 22px 14px;border-bottom:1px solid var(--border);}
.cl-modal-pre{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--blue);margin-bottom:2px;}
.cl-modal-title{font-size:17px;font-weight:700;}
.cl-modal-close{width:30px;height:30px;border-radius:var(--radius-sm);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text2);transition:all .13s;flex-shrink:0;}
.cl-modal-close:hover{background:var(--bg);}

/* Stepper */
.cl-stepper{display:flex;align-items:center;padding:12px 22px;background:var(--bg);border-bottom:1px solid var(--border);gap:0;overflow-x:auto;}
.cl-stepper-item{display:flex;align-items:center;gap:5px;flex-shrink:0;}
.cl-sdot{width:24px;height:24px;border-radius:50%;border:2px solid var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--text3);transition:all .2s;flex-shrink:0;}
.cl-sdot.active{border-color:var(--blue);background:var(--blue);color:#fff;}
.cl-sdot.done{border-color:#16A34A;background:#16A34A;color:#fff;}
.cl-slbl{font-size:10px;font-weight:600;color:var(--text3);white-space:nowrap;}
.cl-slbl.active{color:var(--blue);}
.cl-sline{flex:1;min-width:18px;height:2px;background:var(--border);margin:0 5px;transition:background .2s;}
.cl-sline.done{background:#16A34A;}

.cl-modal-body{flex:1;overflow-y:auto;padding:18px 22px;}

/* Search */
.cl-search{display:flex;align-items:center;gap:9px;padding:9px 13px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:13px;}
.cl-search input{flex:1;border:none;background:transparent;outline:none;font-size:13px;color:var(--text);font-family:inherit;}
.cl-search svg{color:var(--text3);}

/* Médico list */
.cl-medico-list{display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;}
.cl-medico-row{display:flex;align-items:center;gap:12px;padding:12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);text-align:left;transition:all .14s;width:100%;}
.cl-medico-row:hover{border-color:var(--blue);}
.cl-medico-row.sel{border-color:var(--blue);background:var(--blue-l);}
.cl-med-av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#DBEAFE,#C7D2FE);color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex-shrink:0;}
.cl-med-info{flex:1;}
.cl-med-info strong{font-size:13px;font-weight:700;display:block;margin-bottom:2px;}
.cl-med-info span{font-size:11px;color:var(--text3);}
.cl-sel-chk{color:#16A34A;flex-shrink:0;}

/* Info pill */
.cl-info-pill{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;background:var(--blue-l);border-radius:var(--radius-sm);font-size:12px;font-weight:600;color:var(--blue);margin-bottom:14px;}

/* Field */
.cl-field{display:flex;flex-direction:column;gap:5px;margin-bottom:13px;}
.cl-field label{font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;}
.cl-field input,.cl-field textarea{padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;font-family:inherit;color:var(--text);background:var(--bg);outline:none;transition:border-color .13s;resize:vertical;}
.cl-field input:focus,.cl-field textarea:focus{border-color:var(--blue);background:var(--surface);}
.cl-field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.cl-opt{font-size:10px;color:var(--text3);text-transform:none;font-weight:400;letter-spacing:0;}

/* Horários */
.cl-horarios{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:6px;}
.cl-hora-btn{display:flex;align-items:center;justify-content:center;gap:4px;padding:9px 5px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:11px;font-weight:600;transition:all .13s;font-family:inherit;}
.cl-hora-btn:hover:not(:disabled){border-color:var(--blue);color:var(--blue);}
.cl-hora-btn.sel{background:var(--blue);border-color:var(--blue);color:#fff;}
.cl-hora-btn.busy{opacity:.35;cursor:not-allowed;text-decoration:line-through;}

/* Confirm */
.cl-confirm-box{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;margin-bottom:12px;}
.cl-confirm-box h4{font-size:13px;font-weight:700;margin-bottom:12px;}
.cl-confirm-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);}
.cl-confirm-row:last-child{border-bottom:none;}
.cl-confirm-row span{font-size:12px;color:var(--text2);}
.cl-confirm-row strong{font-size:12px;font-weight:600;}
.cl-confirm-note{font-size:12px;color:var(--text3);line-height:1.6;}
.cl-error{display:flex;align-items:center;gap:8px;padding:10px 13px;background:#FEE2E2;border:1px solid #FCA5A5;border-radius:var(--radius-sm);color:#B91C1C;font-size:13px;margin-bottom:14px;}

/* Success */
.cl-success{display:flex;flex-direction:column;align-items:center;text-align:center;padding:24px 0;gap:12px;}
.cl-success-icon{color:#16A34A;}
.cl-success h3{font-size:20px;font-weight:800;}
.cl-success p{font-size:14px;color:var(--text2);max-width:380px;line-height:1.7;}
.cl-success-note{font-size:12px;color:var(--text3);}

/* Modal footer */
.cl-modal-footer{display:flex;align-items:center;padding:14px 22px;border-top:1px solid var(--border);gap:10px;}
.cl-modal-footer .cl-btn-primary{margin-left:auto;}

/* Empty */
.cl-empty-sm{padding:20px;text-align:center;font-size:13px;color:var(--text3);}

.spin{animation:spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}

/* Responsive */
@media(max-width:900px){
  .cl-nav-links,.cl-nav-actions{display:none;}
  .cl-hamburger{display:flex;}
  .cl-hero-title{font-size:36px;}
  .cl-services-grid{grid-template-columns:1fr 1fr;}
  .cl-sobre-grid{grid-template-columns:1fr;}
  .cl-team-grid{grid-template-columns:repeat(2,1fr);}
  .cl-contact-grid{grid-template-columns:1fr;}
  .cl-stats-bar{grid-template-columns:repeat(2,1fr);}
  .cl-field-row{grid-template-columns:1fr;}
  .cl-horarios{grid-template-columns:repeat(3,1fr);}
  .cl-cta-inner{flex-direction:column;text-align:center;}
}
@media(max-width:600px){
  .cl-services-grid{grid-template-columns:1fr;}
  .cl-team-grid{grid-template-columns:1fr 1fr;}
  .cl-hero-title{font-size:28px;}
}
`;