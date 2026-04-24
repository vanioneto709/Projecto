"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar, Clock, Plus, LogOut, User, Phone, Mail,
  CheckCircle, XCircle, AlertCircle, ChevronRight,
  Stethoscope, RefreshCw, X, ArrowLeft, ArrowRight,
  Search, Loader2, MapPin, History, Bell, Home,
  FileText, Heart
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ConsultaP {
  id: number;
  medico: string;
  medicoId: number;
  clinica: string;
  data: string;
  hora: string;
  status: "agendada" | "confirmada" | "cancelada" | "concluida";
  motivo: string;
}

interface Medico {
  id: number;
  nome: string;
  especialidade: string;
  crm: string;
}

interface Me {
  id: number;
  username: string;
  email: string;
  tipo: string;
}

type Secao = "inicio" | "consultas" | "agendar" | "perfil";
type AgStep = "medico" | "data-hora" | "motivo" | "confirmar";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const AG_STEPS: AgStep[] = ["medico", "data-hora", "motivo", "confirmar"];
const HORARIOS = [
  "08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30",
];

function authH(t: string) { return { Authorization: `Bearer ${t}` }; }

export default function DashboardPaciente() {
  const [token, setToken]               = useState<string | null>(null);
  const [me, setMe]                     = useState<Me | null>(null);
  const [secao, setSecao]               = useState<Secao>("inicio");
  const [consultas, setConsultas]       = useState<ConsultaP[]>([]);
  const [medicos, setMedicos]           = useState<Medico[]>([]);
  const [loading, setLoading]           = useState(true);
  const [agendado, setAgendado]         = useState(false);
  const [toast, setToast]               = useState<{msg:string;type:"ok"|"err"}|null>(null);

  // Agendamento
  const [agStep, setAgStep]             = useState<AgStep>("medico");
  const [medicoSel, setMedicoSel]       = useState<Medico|null>(null);
  const [dataSel, setDataSel]           = useState("");
  const [horaSel, setHoraSel]           = useState("");
  const [motivoAg, setMotivoAg]         = useState("");
  const [buscaMedico, setBuscaMedico]   = useState("");
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  const [submitting, setSubmitting]     = useState(false);

  const showToast = (msg: string, type: "ok"|"err" = "ok") => {
    setToast({msg,type}); setTimeout(()=>setToast(null),3500);
  };

  useEffect(()=>{
    const t = localStorage.getItem("access");
    if (!t) { window.location.href="/login"; return; }
    setToken(t);
    fetch(`${API}/api/me/`,{headers:authH(t)}).then(r=>r.json()).then(setMe).catch(()=>{});
  },[]);

  useEffect(()=>{ if(token){ fetchConsultas(); fetchMedicos(); } },[token]);

  const fetchConsultas = async () => {
    if(!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/paciente/consultas/`,{headers:authH(token)});
      if(r.ok) setConsultas(await r.json());
    } catch { } finally { setLoading(false); }
  };

  const fetchMedicos = async () => {
    if(!token) return;
    try {
      const r = await fetch(`${API}/api/publico/medicos/`);
      if(r.ok) setMedicos(await r.json());
    } catch { }
  };

const fetchHorarios = async (medicoId: number, data: string) => {
  try {
    const r = await fetch(`${API}/api/publico/horarios/?medico_id=${medicoId}&data=${data}`);
    if (r.ok) {
      const d = await r.json();
      const todosHorarios = [
        "08:00","08:30","09:00","09:30","10:00","10:30",
        "11:00","11:30","14:00","14:30","15:00","15:30",
        "16:00","16:30","17:00","17:30",
      ];
      const disponiveis: string[] = d.horariosDisponiveis || [];
      setHorariosOcupados(todosHorarios.filter(h => !disponiveis.includes(h)));
    }
  } catch { }
};

  const cancelarConsulta = async (id:number) => {
    if(!token || !confirm("Cancelar esta consulta?")) return;
    try {
      const r = await fetch(`${API}/api/paciente/cancelar/${id}/`,{method:"DELETE",headers:authH(token)});
      if(r.ok){ showToast("Consulta cancelada"); fetchConsultas(); }
      else showToast("Erro ao cancelar","err");
    } catch { showToast("Erro ao cancelar","err"); }
  };

  const confirmarAgendamento = async () => {
    if(!token||!medicoSel) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/api/paciente/agendar/`,{
        method:"POST",
        headers:{"Content-Type":"application/json",...authH(token)},
        body:JSON.stringify({medicoId:medicoSel.id,data:dataSel,hora:horaSel,motivo:motivoAg}),
      });
      if(r.ok){ setAgendado(true); fetchConsultas(); }
      else {
        const e=await r.json(); showToast(e.error||"Erro ao agendar","err");
      }
    } catch { showToast("Erro ao agendar","err"); }
    finally { setSubmitting(false); }
  };

  const resetAgendar = () => {
    setAgStep("medico"); setMedicoSel(null); setDataSel(""); setHoraSel(""); setMotivoAg(""); setAgendado(false);
  };

const logout = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  // Apagar o cookie que o middleware lê
  document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
  window.location.replace("/login");
};
  const formatData = (d:string) => { try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; } };

  const consultasFuturas = consultas.filter(c=>c.status!=="cancelada"&&c.status!=="concluida");
  const consultasHistorico = consultas.filter(c=>c.status==="concluida"||c.status==="cancelada");

  const medicosFiltrados = medicos.filter(m=>
    m.nome.toLowerCase().includes(buscaMedico.toLowerCase())||
    m.especialidade.toLowerCase().includes(buscaMedico.toLowerCase())
  );

  const agStepIdx = AG_STEPS.indexOf(agStep);

  const statusColor: Record<string,string> = {
    agendada:"#D29922", confirmada:"#3b82f6", concluida:"#22c55e", cancelada:"#ef4444",
  };
  const statusLabel: Record<string,string> = {
    agendada:"Agendada", confirmada:"Confirmada", concluida:"Concluída", cancelada:"Cancelada",
  };

  if(!token) return null;

  return (
    <>
      <style>{css}</style>
      <div className="dp-root">
        {toast && (
          <div className={`dp-toast ${toast.type}`}>
            {toast.type==="ok"?<CheckCircle size={15}/>:<AlertCircle size={15}/>}
            {toast.msg}
          </div>
        )}

        {/* ── Sidebar ── */}
        <aside className="dp-sidebar">
          <div className="dp-brand">
            <Heart size={22} className="dp-brand-icon" />
            <div>
              <p className="dp-brand-name">Saúde Conecta</p>
              <p className="dp-brand-sub">Área do Paciente</p>
            </div>
          </div>

          <nav className="dp-nav">
            {([
              ["inicio",    Home,     "Início"],
              ["consultas", Calendar, "Minhas Consultas"],
              ["agendar",   Plus,     "Agendar Consulta"],
              ["perfil",    User,     "Meu Perfil"],
            ] as [Secao,any,string][]).map(([id,Icon,label])=>(
              <button key={id} className={`dp-nav-btn ${secao===id?"active":""}`}
                onClick={()=>{ setSecao(id); if(id==="agendar") resetAgendar(); }}>
                <Icon size={17}/><span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="dp-sidebar-footer">
            <div className="dp-user-row">
              <div className="dp-avatar">{me?.username?.[0]?.toUpperCase()||"P"}</div>
              <div>
                <p className="dp-uname">{me?.username||"Paciente"}</p>
                <p className="dp-urole">Paciente</p>
              </div>
            </div>
            <button className="dp-logout" onClick={logout}><LogOut size={15}/> Sair</button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="dp-main">

          {/* ════ INÍCIO ════ */}
          {secao==="inicio" && (
            <div className="dp-section">
              <div className="dp-page-header">
                <h2>Olá, {me?.username||"Paciente"} 👋</h2>
                <p className="dp-page-sub">Bem-vindo à sua área de saúde</p>
              </div>

              <div className="dp-kpi-row">
                <div className="dp-kpi">
                  <div className="dp-kpi-icon blue"><Calendar size={20}/></div>
                  <div><p className="dp-kpi-val">{consultasFuturas.length}</p><p className="dp-kpi-lbl">Consultas ativas</p></div>
                </div>
                <div className="dp-kpi">
                  <div className="dp-kpi-icon green"><CheckCircle size={20}/></div>
                  <div><p className="dp-kpi-val">{consultas.filter(c=>c.status==="concluida").length}</p><p className="dp-kpi-lbl">Realizadas</p></div>
                </div>
                <div className="dp-kpi">
                  <div className="dp-kpi-icon teal"><Stethoscope size={20}/></div>
                  <div><p className="dp-kpi-val">{[...new Set(consultas.map(c=>c.medicoId))].length}</p><p className="dp-kpi-lbl">Médicos</p></div>
                </div>
              </div>

              {/* Próximas */}
              <div className="dp-card">
                <div className="dp-card-header">
                  <span><Calendar size={15}/> Próximas Consultas</span>
                  <button className="dp-link-btn" onClick={()=>setSecao("consultas")}>Ver todas <ChevronRight size={13}/></button>
                </div>
                {consultasFuturas.length===0 ? (
                  <div className="dp-empty">
                    <Calendar size={36}/>
                    <p>Nenhuma consulta agendada</p>
                    <button className="dp-btn-primary" onClick={()=>{ setSecao("agendar"); resetAgendar(); }}>
                      <Plus size={15}/> Agendar agora
                    </button>
                  </div>
                ) : consultasFuturas.slice(0,3).map(c=>(
                  <div key={c.id} className="dp-consulta-row">
                    <div className="dp-c-dot" style={{background:statusColor[c.status]}}/>
                    <div className="dp-c-info">
                      <strong>Dr(a). {c.medico}</strong>
                      <span>{formatData(c.data)} às {c.hora} · {c.motivo||"—"}</span>
                    </div>
                    <span className="dp-status-pill" style={{background:statusColor[c.status]+"22",color:statusColor[c.status]}}>
                      {statusLabel[c.status]}
                    </span>
                  </div>
                ))}
              </div>

              <button className="dp-fab" onClick={()=>{ setSecao("agendar"); resetAgendar(); }}>
                <Plus size={20}/> Agendar Consulta
              </button>
            </div>
          )}

          {/* ════ CONSULTAS ════ */}
          {secao==="consultas" && (
            <div className="dp-section">
              <div className="dp-page-header">
                <h2>Minhas Consultas</h2>
                <button className="dp-icon-btn" onClick={fetchConsultas}><RefreshCw size={16} className={loading?"spinning":""}/></button>
              </div>

              <h3 className="dp-subsection-title">Ativas</h3>
              {consultasFuturas.length===0 ? (
                <div className="dp-empty-sm">Nenhuma consulta ativa</div>
              ) : consultasFuturas.map(c=>(
                <div key={c.id} className="dp-consulta-card">
                  <div className="dp-cc-left">
                    <div className="dp-cc-date">
                      <span className="dp-cc-day">{new Date(c.data).getDate()}</span>
                      <span className="dp-cc-month">{new Date(c.data).toLocaleString("pt-BR",{month:"short"})}</span>
                    </div>
                  </div>
                  <div className="dp-cc-body">
                    <p className="dp-cc-medico">Dr(a). {c.medico}</p>
                    <p className="dp-cc-detail"><Clock size={12}/> {c.hora}</p>
                    <p className="dp-cc-detail">{c.motivo||"Sem motivo"}</p>
                  </div>
                  <div className="dp-cc-right">
                    <span className="dp-status-pill" style={{background:statusColor[c.status]+"22",color:statusColor[c.status]}}>
                      {statusLabel[c.status]}
                    </span>
                    {c.status==="agendada" && (
                      <button className="dp-cancel-btn" onClick={()=>cancelarConsulta(c.id)}>
                        <X size={13}/> Cancelar
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <h3 className="dp-subsection-title" style={{marginTop:24}}>Histórico</h3>
              {consultasHistorico.length===0 ? (
                <div className="dp-empty-sm">Nenhum histórico ainda</div>
              ) : consultasHistorico.map(c=>(
                <div key={c.id} className="dp-consulta-card muted">
                  <div className="dp-cc-left">
                    <div className="dp-cc-date muted">
                      <span className="dp-cc-day">{new Date(c.data).getDate()}</span>
                      <span className="dp-cc-month">{new Date(c.data).toLocaleString("pt-BR",{month:"short"})}</span>
                    </div>
                  </div>
                  <div className="dp-cc-body">
                    <p className="dp-cc-medico">Dr(a). {c.medico}</p>
                    <p className="dp-cc-detail"><Clock size={12}/> {c.hora}</p>
                    <p className="dp-cc-detail">{c.motivo||"—"}</p>
                  </div>
                  <div className="dp-cc-right">
                    <span className="dp-status-pill" style={{background:statusColor[c.status]+"22",color:statusColor[c.status]}}>
                      {statusLabel[c.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ════ AGENDAR ════ */}
          {secao==="agendar" && (
            <div className="dp-section">
              <div className="dp-page-header">
                <h2>Agendar Consulta</h2>
              </div>

              {agendado ? (
                <div className="dp-success-box">
                  <CheckCircle size={52} className="dp-success-icon"/>
                  <h3>Consulta agendada!</h3>
                  <p>Sua consulta com <strong>Dr(a). {medicoSel?.nome}</strong> está marcada para <strong>{formatData(dataSel)} às {horaSel}</strong>.</p>
                  <div style={{display:"flex",gap:12,marginTop:20}}>
                    <button className="dp-btn-primary" onClick={()=>{ setSecao("consultas"); }}>Ver consultas</button>
                    <button className="dp-btn-ghost" onClick={resetAgendar}>Agendar outra</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Stepper */}
                  <div className="dp-stepper">
                    {(["Médico","Data & Hora","Motivo","Confirmar"] as string[]).map((l,i)=>(
                      <div key={l} className="dp-stepper-item">
                        <div className={`dp-stepper-dot ${i<agStepIdx?"done":i===agStepIdx?"active":""}`}>
                          {i<agStepIdx?<CheckCircle size={13}/>:i+1}
                        </div>
                        <span className={`dp-stepper-lbl ${i===agStepIdx?"active":""}`}>{l}</span>
                        {i<3&&<div className={`dp-stepper-line ${i<agStepIdx?"done":""}`}/>}
                      </div>
                    ))}
                  </div>

                  <div className="dp-ag-body">

                    {/* Step 1: Médico */}
                    {agStep==="medico" && (
                      <div>
                        <div className="dp-search">
                          <Search size={15}/>
                          <input placeholder="Buscar por nome ou especialidade..."
                            value={buscaMedico} onChange={e=>setBuscaMedico(e.target.value)}/>
                        </div>
                        <div className="dp-medico-list">
                          {medicosFiltrados.map(m=>(
                            <button key={m.id}
                              className={`dp-medico-row ${medicoSel?.id===m.id?"sel":""}`}
                              onClick={()=>setMedicoSel(m)}>
                              <div className="dp-medico-av">{m.nome[0]}</div>
                              <div className="dp-medico-info">
                                <strong>Dr(a). {m.nome}</strong>
                                <span>{m.especialidade||"Geral"}</span>
                              </div>
                              {medicoSel?.id===m.id&&<CheckCircle size={17} className="dp-sel-check"/>}
                            </button>
                          ))}
                          {medicosFiltrados.length===0 && <p className="dp-empty-sm">Nenhum médico encontrado</p>}
                        </div>
                      </div>
                    )}

                    {/* Step 2: Data & Hora */}
                    {agStep==="data-hora" && (
                      <div className="dp-dh-wrap">
                        <div className="dp-info-pill"><Stethoscope size={13}/> Dr(a). {medicoSel?.nome} — {medicoSel?.especialidade}</div>
                        <div className="dp-field">
                          <label>Data da consulta *</label>
                          <input type="date" min={new Date().toISOString().split("T")[0]}
                            value={dataSel}
                            onChange={e=>{ setDataSel(e.target.value); setHoraSel(""); if(medicoSel) fetchHorarios(medicoSel.id,e.target.value); }}/>
                        </div>
                        {dataSel && (
                          <div className="dp-field">
                            <label>Horário *</label>
                            <div className="dp-horarios">
                              {HORARIOS.map(h=>(
                                <button key={h}
                                  className={`dp-hora-btn ${horaSel===h?"sel":""} ${horariosOcupados.includes(h)?"busy":""}`}
                                  disabled={horariosOcupados.includes(h)}
                                  onClick={()=>setHoraSel(h)}>
                                  <Clock size={12}/>{h}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 3: Motivo */}
                    {agStep==="motivo" && (
                      <div className="dp-field">
                        <label>Motivo da consulta <span className="dp-opt">(opcional)</span></label>
                        <textarea rows={4} placeholder="Descreva brevemente o motivo..."
                          value={motivoAg} onChange={e=>setMotivoAg(e.target.value)}/>
                      </div>
                    )}

                    {/* Step 4: Confirmar */}
                    {agStep==="confirmar" && (
                      <div className="dp-confirm-box">
                        <h4>Confirme os dados</h4>
                        {[
                          ["Médico",   `Dr(a). ${medicoSel?.nome}`],
                          ["Especialidade", medicoSel?.especialidade||"Geral"],
                          ["Data",     formatData(dataSel)],
                          ["Horário",  horaSel],
                          ["Motivo",   motivoAg||"—"],
                        ].map(([l,v])=>(
                          <div key={l} className="dp-confirm-row">
                            <span>{l}</span><strong>{v}</strong>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Navegação */}
                    <div className="dp-ag-footer">
                      {agStepIdx>0 && (
                        <button className="dp-btn-ghost" onClick={()=>setAgStep(AG_STEPS[agStepIdx-1])}>
                          <ArrowLeft size={14}/> Voltar
                        </button>
                      )}
                      {agStep!=="confirmar" ? (
                        <button className="dp-btn-primary"
                          disabled={
                            (agStep==="medico"&&!medicoSel)||
                            (agStep==="data-hora"&&(!dataSel||!horaSel))
                          }
                          onClick={()=>setAgStep(AG_STEPS[agStepIdx+1])}>
                          Avançar <ArrowRight size={14}/>
                        </button>
                      ) : (
                        <button className="dp-btn-confirm" disabled={submitting} onClick={confirmarAgendamento}>
                          {submitting?<><Loader2 size={14} className="spinning"/>Agendando...</>:<><CheckCircle size={14}/>Confirmar</>}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════ PERFIL ════ */}
          {secao==="perfil" && (
            <div className="dp-section">
              <div className="dp-page-header"><h2>Meu Perfil</h2></div>
              <div className="dp-card" style={{maxWidth:480}}>
                <div className="dp-perfil-header">
                  <div className="dp-perfil-av">{me?.username?.[0]?.toUpperCase()||"P"}</div>
                  <div>
                    <p className="dp-perfil-name">{me?.username||"Paciente"}</p>
                    <span className="dp-perfil-tag">Paciente</span>
                  </div>
                </div>
                <div className="dp-perfil-rows">
                  <div className="dp-perfil-row"><User size={15}/><span>{me?.username||"—"}</span></div>
                  <div className="dp-perfil-row"><Mail size={15}/><span>{me?.email||"—"}</span></div>
                </div>
                <div className="dp-perfil-stats">
                  <div className="dp-pstat"><span>{consultas.length}</span><small>Total consultas</small></div>
                  <div className="dp-pstat"><span>{consultas.filter(c=>c.status==="concluida").length}</span><small>Realizadas</small></div>
                  <div className="dp-pstat"><span>{consultasFuturas.length}</span><small>Agendadas</small></div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#F0F6FF;--surface:#fff;--surface-2:#F7F9FC;
  --border:#E4ECF5;--border2:#EEF3F9;
  --blue:#2563EB;--teal:#0D9488;--green:#16A34A;--red:#DC2626;--amber:#D97706;
  --text:#0F2137;--text2:#4B5563;--text3:#9CA3AF;
  --radius:10px;--radius-sm:6px;
  --shadow:0 1px 3px rgba(15,33,55,.06),0 4px 16px rgba(15,33,55,.05);
  font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);
}
button{cursor:pointer;font-family:inherit;border:none;background:none;}

/* Toast */
.dp-toast{position:fixed;top:20px;right:20px;z-index:9999;display:flex;align-items:center;gap:9px;padding:11px 16px;border-radius:var(--radius);font-size:13px;font-weight:500;box-shadow:0 6px 24px rgba(0,0,0,.15);animation:fadeIn .2s ease;}
.dp-toast.ok{background:#DCFCE7;color:#15803D;border:1px solid #86EFAC;}
.dp-toast.err{background:#FEE2E2;color:#B91C1C;border:1px solid #FCA5A5;}
@keyframes fadeIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}

/* Layout */
.dp-root{display:grid;grid-template-columns:240px 1fr;min-height:100vh;}

/* Sidebar */
.dp-sidebar{background:var(--text);display:flex;flex-direction:column;height:100vh;position:sticky;top:0;padding:20px 14px;}
.dp-brand{display:flex;align-items:center;gap:10px;margin-bottom:28px;padding:0 4px;}
.dp-brand-icon{color:#60A5FA;flex-shrink:0;}
.dp-brand-name{font-size:14px;font-weight:700;color:#fff;}
.dp-brand-sub{font-size:10px;color:#60A5FA;font-weight:600;}
.dp-nav{flex:1;display:flex;flex-direction:column;gap:2px;}
.dp-nav-btn{display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;color:rgba(255,255,255,.5);transition:all .13s;text-align:left;}
.dp-nav-btn:hover{background:rgba(255,255,255,.06);color:rgba(255,255,255,.85);}
.dp-nav-btn.active{background:rgba(37,99,235,.2);color:#60A5FA;}
.dp-sidebar-footer{padding-top:14px;border-top:1px solid rgba(255,255,255,.08);}
.dp-user-row{display:flex;align-items:center;gap:9px;margin-bottom:10px;}
.dp-avatar{width:30px;height:30px;border-radius:50%;background:var(--blue);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;}
.dp-uname{font-size:13px;font-weight:600;color:#fff;}
.dp-urole{font-size:10px;color:rgba(255,255,255,.4);}
.dp-logout{display:flex;align-items:center;gap:7px;width:100%;padding:8px 10px;border-radius:var(--radius-sm);font-size:12px;font-weight:600;color:rgba(255,255,255,.4);transition:all .13s;}
.dp-logout:hover{background:rgba(220,38,38,.12);color:#FCA5A5;}

/* Main */
.dp-main{padding:28px;display:flex;flex-direction:column;}
.dp-section{display:flex;flex-direction:column;gap:20px;}
.dp-page-header{display:flex;align-items:center;justify-content:space-between;}
.dp-page-header h2{font-size:22px;font-weight:700;}
.dp-page-sub{font-size:13px;color:var(--text3);margin-top:2px;}
.dp-icon-btn{padding:8px;border-radius:var(--radius-sm);border:1px solid var(--border);color:var(--text2);transition:all .13s;}
.dp-icon-btn:hover{background:var(--surface-2);}

/* KPIs */
.dp-kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.dp-kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;display:flex;align-items:center;gap:13px;box-shadow:var(--shadow);}
.dp-kpi-icon{width:40px;height:40px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.dp-kpi-icon.blue{background:#EFF6FF;color:var(--blue);}
.dp-kpi-icon.green{background:#F0FDF4;color:var(--green);}
.dp-kpi-icon.teal{background:#F0FDFA;color:var(--teal);}
.dp-kpi-val{font-size:22px;font-weight:700;color:var(--text);}
.dp-kpi-lbl{font-size:12px;color:var(--text3);}

/* Card */
.dp-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;}
.dp-card-header{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid var(--border2);font-size:12px;font-weight:700;color:var(--text2);gap:6px;}
.dp-card-header>span{display:flex;align-items:center;gap:6px;}
.dp-link-btn{display:flex;align-items:center;gap:3px;font-size:11px;font-weight:600;color:var(--blue);}

/* Consulta row */
.dp-consulta-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border2);}
.dp-consulta-row:last-child{border-bottom:none;}
.dp-c-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.dp-c-info{flex:1;}
.dp-c-info strong{font-size:13px;font-weight:700;display:block;margin-bottom:2px;}
.dp-c-info span{font-size:11px;color:var(--text3);}

/* Status pill */
.dp-status-pill{padding:3px 9px;border-radius:99px;font-size:10px;font-weight:700;}

/* Consulta cards */
.dp-consulta-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;display:flex;align-items:center;gap:14px;box-shadow:var(--shadow);margin-bottom:8px;}
.dp-consulta-card.muted{opacity:.65;}
.dp-cc-left{flex-shrink:0;}
.dp-cc-date{display:flex;flex-direction:column;align-items:center;width:38px;background:var(--blue);color:#fff;border-radius:var(--radius-sm);padding:5px 0;}
.dp-cc-date.muted{background:var(--text3);}
.dp-cc-day{font-size:18px;font-weight:800;line-height:1;}
.dp-cc-month{font-size:9px;font-weight:600;text-transform:uppercase;opacity:.85;}
.dp-cc-body{flex:1;}
.dp-cc-medico{font-size:14px;font-weight:700;margin-bottom:3px;}
.dp-cc-detail{font-size:12px;color:var(--text3);display:flex;align-items:center;gap:4px;}
.dp-cc-right{display:flex;flex-direction:column;align-items:flex-end;gap:7px;}
.dp-cancel-btn{display:flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--red);padding:4px 8px;border-radius:var(--radius-sm);border:1px solid #FECACA;transition:all .13s;}
.dp-cancel-btn:hover{background:#FEE2E2;}

/* FAB */
.dp-fab{display:flex;align-items:center;gap:8px;align-self:flex-start;padding:12px 22px;background:var(--blue);color:#fff;border-radius:var(--radius);font-size:14px;font-weight:700;box-shadow:0 4px 14px rgba(37,99,235,.3);transition:all .15s;}
.dp-fab:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(37,99,235,.4);}

/* Subsection */
.dp-subsection-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);padding:4px 0;}

/* Empty */
.dp-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:36px;color:var(--text3);}
.dp-empty-sm{padding:20px;text-align:center;font-size:13px;color:var(--text3);}

/* Agendar stepper */
.dp-stepper{display:flex;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 20px;gap:0;overflow-x:auto;box-shadow:var(--shadow);}
.dp-stepper-item{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.dp-stepper-dot{width:26px;height:26px;border-radius:50%;border:2px solid var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text3);transition:all .2s;flex-shrink:0;}
.dp-stepper-dot.active{border-color:var(--blue);background:var(--blue);color:#fff;}
.dp-stepper-dot.done{border-color:var(--green);background:var(--green);color:#fff;}
.dp-stepper-lbl{font-size:11px;font-weight:600;color:var(--text3);white-space:nowrap;}
.dp-stepper-lbl.active{color:var(--blue);}
.dp-stepper-line{flex:1;min-width:20px;height:2px;background:var(--border);margin:0 6px;transition:background .2s;}
.dp-stepper-line.done{background:var(--green);}

.dp-ag-body{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;box-shadow:var(--shadow);}

/* Search */
.dp-search{display:flex;align-items:center;gap:9px;padding:9px 13px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:14px;}
.dp-search input{flex:1;border:none;background:transparent;outline:none;font-size:13px;color:var(--text);}
.dp-search svg{color:var(--text3);}

/* Médico list */
.dp-medico-list{display:flex;flex-direction:column;gap:8px;max-height:320px;overflow-y:auto;}
.dp-medico-row{display:flex;align-items:center;gap:13px;padding:13px;border:1.5px solid var(--border);border-radius:var(--radius);text-align:left;transition:all .14s;width:100%;}
.dp-medico-row:hover{border-color:var(--blue);}
.dp-medico-row.sel{border-color:var(--blue);background:#EFF6FF;}
.dp-medico-av{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#DBEAFE,#C7D2FE);color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;flex-shrink:0;}
.dp-medico-info{flex:1;}
.dp-medico-info strong{font-size:13px;font-weight:700;display:block;margin-bottom:2px;}
.dp-medico-info span{font-size:12px;color:var(--text3);}
.dp-sel-check{color:var(--green);}

/* Info pill */
.dp-info-pill{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;background:#EFF6FF;border-radius:var(--radius-sm);font-size:12px;font-weight:600;color:var(--blue);margin-bottom:14px;}

/* Field */
.dp-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}
.dp-field label{font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;}
.dp-field input,.dp-field textarea{padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;font-family:inherit;color:var(--text);background:var(--surface-2);outline:none;transition:border-color .14s;}
.dp-field input:focus,.dp-field textarea:focus{border-color:var(--blue);background:var(--surface);}
.dp-opt{font-size:10px;color:var(--text3);text-transform:none;font-weight:400;letter-spacing:0;}

/* Horários */
.dp-horarios{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px;}
.dp-hora-btn{display:flex;align-items:center;justify-content:center;gap:5px;padding:9px 6px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:12px;font-weight:600;transition:all .14s;}
.dp-hora-btn:hover:not(:disabled){border-color:var(--blue);color:var(--blue);}
.dp-hora-btn.sel{background:var(--blue);border-color:var(--blue);color:#fff;}
.dp-hora-btn.busy{opacity:.4;cursor:not-allowed;text-decoration:line-through;}

/* Confirm box */
.dp-confirm-box{background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:14px;}
.dp-confirm-box h4{font-size:13px;font-weight:700;margin-bottom:12px;}
.dp-confirm-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);}
.dp-confirm-row:last-child{border-bottom:none;}
.dp-confirm-row span{font-size:12px;color:var(--text2);}
.dp-confirm-row strong{font-size:12px;font-weight:600;}

/* Ag Footer */
.dp-ag-footer{display:flex;align-items:center;justify-content:space-between;margin-top:18px;padding-top:14px;border-top:1px solid var(--border);}

/* Buttons */
.dp-btn-primary{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;background:var(--blue);color:#fff;border-radius:var(--radius-sm);font-size:13px;font-weight:700;transition:all .13s;}
.dp-btn-primary:hover:not(:disabled){transform:translateY(-1px);}
.dp-btn-primary:disabled{opacity:.5;cursor:not-allowed;}
.dp-btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;font-weight:600;color:var(--text2);transition:all .13s;}
.dp-btn-ghost:hover{background:var(--surface-2);}
.dp-btn-confirm{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;background:var(--green);color:#fff;border-radius:var(--radius-sm);font-size:13px;font-weight:700;transition:all .13s;margin-left:auto;}
.dp-btn-confirm:hover:not(:disabled){opacity:.88;}
.dp-btn-confirm:disabled{opacity:.5;cursor:not-allowed;}

/* Success box */
.dp-success-box{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:40px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;box-shadow:var(--shadow);}
.dp-success-icon{color:var(--green);}
.dp-success-box h3{font-size:20px;font-weight:700;}
.dp-success-box p{font-size:14px;color:var(--text2);max-width:360px;line-height:1.7;}

/* dh-wrap */
.dp-dh-wrap{display:flex;flex-direction:column;}

/* Perfil */
.dp-perfil-header{display:flex;align-items:center;gap:14px;padding:20px;}
.dp-perfil-av{width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,var(--blue),#6366F1);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;}
.dp-perfil-name{font-size:17px;font-weight:700;margin-bottom:4px;}
.dp-perfil-tag{font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:#EFF6FF;color:var(--blue);}
.dp-perfil-rows{padding:0 20px 16px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid var(--border);}
.dp-perfil-row{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text2);}
.dp-perfil-row svg{color:var(--text3);}
.dp-perfil-stats{display:grid;grid-template-columns:repeat(3,1fr);padding:16px 20px;}
.dp-pstat{display:flex;flex-direction:column;align-items:center;gap:3px;}
.dp-pstat span{font-size:20px;font-weight:700;color:var(--text);}
.dp-pstat small{font-size:10px;color:var(--text3);text-transform:uppercase;}

.spinning{animation:spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}

@media(max-width:768px){
  .dp-root{grid-template-columns:1fr;}
  .dp-sidebar{display:none;}
  .dp-kpi-row{grid-template-columns:1fr 1fr;}
  .dp-horarios{grid-template-columns:repeat(3,1fr);}
}
`;
