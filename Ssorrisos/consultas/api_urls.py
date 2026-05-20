from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .api_views import (
    # Auth & Users
    cadastro_api, me_api, listar_usuarios_api, deletar_usuario_api,
    usuario_detalhe_api, clinica_alterar_senha_usuario_api,

    # Clínicas (Admin Sistema)
    clinicas_api, clinica_detalhe_api,

    # Consultas
    todas_consultas_api, criar_consulta_api, minhas_consultas_api,

    # Prontuários
    prontuarios_api, prontuario_detalhe_api,
    prontuario_adicionar_procedimento_api, prontuario_remover_procedimento_api,
    prontuario_adicionar_anexo_api, prontuario_remover_anexo_api,
    meu_prontuario_api,

    # Partilhas
    partilhas_api, partilha_responder_api, partilha_concluir_api,
    partilha_prontuario_ver_api, clinicas_lista_api, medicos_da_clinica_api,

    # Stats & Dashboard
    admin_stats_api, notificacoes_api,

    # Paciente
    consultas_paciente_api, agendar_consulta_paciente_api,
    cancelar_consulta_paciente_api,

    # Médico
    agenda_medico_api, pacientes_medico_api, horarios_medico_api,
    salvar_descricao_consulta_api, atualizar_status_consulta_api,

    # Público
    listar_clinicas_publico_api, medicos_por_clinica_api,
    horarios_disponiveis_api, agendamento_rapido_api,
    cadastro_clinica_api, listar_medicos_publico_api,

    # Dashboard Clínica
    consultas_clinica_api, clinica_stats_api, clinica_medicos_api,
    clinica_medico_detalhe_api, clinica_pacientes_api,
    clinica_consultas_gestao_api, clinica_consulta_detalhe_api,
    clinica_medicos_lista_api, clinica_pacientes_lista_api,

    # Mensagens
    conversas_api, nova_conversa_api, conversa_detalhe_api,
    contactos_api, mensagens_nao_lidas_api,
)

urlpatterns = [
    # ── Auth & JWT ──────────────────────────────────────────
    path('login/',          TokenObtainPairView.as_view()),
    path('token/refresh/',  TokenRefreshView.as_view()),
    path('cadastro/',       cadastro_api),
    path('me/',             me_api),

    # ── Users ───────────────────────────────────────────────
    path('usuarios/',                                   listar_usuarios_api),
    path('usuarios/<int:user_id>/',                     deletar_usuario_api),
    path('usuarios/<int:user_id>/editar/',              usuario_detalhe_api),
    path('minha-clinica/usuarios/<int:user_id>/senha/', clinica_alterar_senha_usuario_api),

    # ── Clínicas (admin sistema) ─────────────────────────────
    # NOTA: /api/admin/clinicas/ é para o painel de admin sistema
    # NOTA: /api/clinicas/ é a lista pública usada nos selects de partilha
    path('admin/clinicas/',                     clinicas_api),
    path('admin/clinicas/<int:clinica_id>/',    clinica_detalhe_api),

    # ── Consultas ───────────────────────────────────────────
    path('consultas/',      todas_consultas_api),
    path('minhas-consultas/', minhas_consultas_api),
    path('criar-consulta/', criar_consulta_api),

    # ── Prontuários ─────────────────────────────────────────
    path('prontuarios/',                                            prontuarios_api),
    path('prontuarios/<int:paciente_id>/',                         prontuario_detalhe_api),
    path('prontuarios/<int:paciente_id>/procedimentos/',           prontuario_adicionar_procedimento_api),
    path('prontuarios/procedimentos/<int:procedimento_id>/',       prontuario_remover_procedimento_api),
    path('prontuarios/<int:paciente_id>/anexos/',                  prontuario_adicionar_anexo_api),
    path('prontuarios/anexos/<int:anexo_id>/',                     prontuario_remover_anexo_api),
    path('paciente/prontuario/',                                   meu_prontuario_api),

    # ── Partilhas ───────────────────────────────────────────
    path('partilhas/',                              partilhas_api),
    path('partilhas/<int:partilha_id>/responder/',  partilha_responder_api),
    path('partilhas/<int:partilha_id>/concluir/',   partilha_concluir_api),
    path('partilhas/<int:partilha_id>/prontuario/', partilha_prontuario_ver_api),

    # lista de clínicas para selects (partilhas, etc.)
    path('clinicas/',               clinicas_lista_api),
    path('minha-clinica/medicos/',  medicos_da_clinica_api),

    # ── Stats & Notificações ─────────────────────────────────
    path('admin/stats/',    admin_stats_api),
    path('notificacoes/',   notificacoes_api),

    # ── Paciente ────────────────────────────────────────────
    path('paciente/consultas/',                         consultas_paciente_api),
    path('paciente/agendar/',                           agendar_consulta_paciente_api),
    path('paciente/cancelar/<int:consulta_id>/',        cancelar_consulta_paciente_api),

    # ── Médico ──────────────────────────────────────────────
    path('medico/agenda/',                                      agenda_medico_api),
    path('medico/pacientes/',                                   pacientes_medico_api),
    path('medico/horarios/',                                    horarios_medico_api),
    path('medico/consulta/<int:consulta_id>/descricao/',        salvar_descricao_consulta_api),
    path('medico/consulta/<int:consulta_id>/status/',           atualizar_status_consulta_api),

    # ── Público ─────────────────────────────────────────────
    path('publico/clinicas/',                               listar_clinicas_publico_api),
    path('publico/clinicas/<int:clinica_id>/medicos/',      medicos_por_clinica_api),
    path('publico/horarios/',                               horarios_disponiveis_api),
    path('publico/agendar/',                                agendamento_rapido_api),
    path('publico/cadastro-clinica/',                       cadastro_clinica_api),
    path('publico/medicos/',                                listar_medicos_publico_api),

    # ── Dashboard Clínica (admin_clinica) ────────────────────
    path('clinica/consultas/',                                  consultas_clinica_api),
    path('minha-clinica/stats/',                                clinica_stats_api),
    path('minha-clinica/medicos/',                              clinica_medicos_api),
    path('minha-clinica/medicos/<int:medico_id>/',              clinica_medico_detalhe_api),
    path('minha-clinica/pacientes/',                            clinica_pacientes_api),
    path('minha-clinica/consultas/',                            clinica_consultas_gestao_api),
    path('minha-clinica/consultas/<int:consulta_id>/',          clinica_consulta_detalhe_api),
    path('minha-clinica/medicos-lista/',                        clinica_medicos_lista_api),
    path('minha-clinica/pacientes-lista/',                      clinica_pacientes_lista_api),

    # ── Mensagens ────────────────────────────────────────────
    path('mensagens/',                          conversas_api),
    path('mensagens/nova/',                     nova_conversa_api),
    path('mensagens/<int:conversa_id>/',        conversa_detalhe_api),
    path('mensagens/contactos/',                contactos_api),
    path('mensagens/nao-lidas/',                mensagens_nao_lidas_api),
]