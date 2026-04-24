from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .api_views import (
    # Auth & Users
    cadastro_api, me_api, listar_usuarios_api, deletar_usuario_api,usuario_detalhe_api,
    
    # Clínicas (Admin Sistema)
    clinicas_api, clinica_detalhe_api,
    
    # Consultas
    todas_consultas_api, criar_consulta_api, minhas_consultas_api,
    
    # Stats & Dashboard
    admin_stats_api, notificacoes_api,
    
    # Paciente
    consultas_paciente_api, agendar_consulta_paciente_api, cancelar_consulta_paciente_api,
    
    # Médico
    agenda_medico_api, pacientes_medico_api, horarios_medico_api,
    salvar_descricao_consulta_api, atualizar_status_consulta_api,
    
    # Público
    listar_clinicas_publico_api, medicos_por_clinica_api,
    horarios_disponiveis_api, agendamento_rapido_api,
    cadastro_clinica_api, listar_medicos_publico_api,
    
    # Dashboard Clínica
    consultas_clinica_api,
clinica_stats_api,
    clinica_medicos_api,
    clinica_medico_detalhe_api,
    clinica_pacientes_api,
    clinica_consultas_gestao_api,
    clinica_consulta_detalhe_api,
    clinica_medicos_lista_api,
    clinica_pacientes_lista_api,
)

urlpatterns = [
    # Auth & JWT
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('cadastro/', cadastro_api, name='cadastro'),
    path('me/', me_api, name='me'),
    
    # Users
    path('usuarios/', listar_usuarios_api, name='listar_usuarios'),
   path('usuarios/<int:user_id>/', deletar_usuario_api, name='deletar_usuario'),
path('usuarios/<int:user_id>/editar/', usuario_detalhe_api, name='usuario_detalhe'),
# Clínicas (só admin sistema) - ✅ Compatível com novo modelo Clinica
    path('clinicas/', clinicas_api, name='clinicas'),
    path('clinicas/<int:clinica_id>/', clinica_detalhe_api, name='clinica_detalhe'),
    
    # Consultas
    path('consultas/', todas_consultas_api, name='consultas'),
    path('minhas-consultas/', minhas_consultas_api, name='minhas_consultas'),
    path('criar-consulta/', criar_consulta_api, name='criar_consulta'),
    
    # Stats & Notificações
    path('admin/stats/', admin_stats_api, name='admin_stats'),
    path('notificacoes/', notificacoes_api, name='notificacoes'),
    
    # Paciente
    path('paciente/consultas/', consultas_paciente_api, name='consultas_paciente'),
    path('paciente/agendar/', agendar_consulta_paciente_api, name='agendar_consulta'),
    path('paciente/cancelar/<int:consulta_id>/', cancelar_consulta_paciente_api, name='cancelar_consulta'),
    
    # Médico - ✅ Corrigido: movido status para grupo medico para consistência
    path('medico/agenda/', agenda_medico_api, name='agenda_medico'),
    path('medico/pacientes/', pacientes_medico_api, name='pacientes_medico'),
    path('medico/horarios/', horarios_medico_api, name='horarios_medico'),
    path('medico/consulta/<int:consulta_id>/descricao/', salvar_descricao_consulta_api, name='salvar_descricao'),
    path('medico/consulta/<int:consulta_id>/status/', atualizar_status_consulta_api, name='atualizar_status'),  # ← Movido para /medico/
    
    # Público (sem autenticação)
    path('publico/clinicas/', listar_clinicas_publico_api, name='clinicas_publico'),
    path('publico/clinicas/<int:clinica_id>/medicos/', medicos_por_clinica_api, name='medicos_por_clinica'),
    path('publico/horarios/', horarios_disponiveis_api, name='horarios_disponiveis'),
    path('publico/agendar/', agendamento_rapido_api, name='agendamento_rapido'),
    path('publico/cadastro-clinica/', cadastro_clinica_api, name='cadastro_clinica_publico'),
    path('publico/medicos/', listar_medicos_publico_api, name='medicos_publico'),
    
    # Dashboard Clínica (admin_clinica)
    path('clinica/consultas/', consultas_clinica_api, name='consultas_clinica'),
# ── Dashboard Clínica (admin_clinica) ──
path('minha-clinica/stats/', clinica_stats_api, name='clinica_stats'),
path('minha-clinica/medicos/', clinica_medicos_api, name='clinica_medicos'),
path('minha-clinica/medicos/<int:medico_id>/', clinica_medico_detalhe_api, name='clinica_medico_detalhe'),
path('minha-clinica/pacientes/', clinica_pacientes_api, name='clinica_pacientes'),
path('minha-clinica/consultas/', clinica_consultas_gestao_api, name='clinica_consultas_gestao'),
path('minha-clinica/consultas/<int:consulta_id>/', clinica_consulta_detalhe_api, name='clinica_consulta_detalhe'),
path('minha-clinica/medicos-lista/', clinica_medicos_lista_api, name='clinica_medicos_lista'),
path('minha-clinica/pacientes-lista/', clinica_pacientes_lista_api, name='clinica_pacientes_lista'),
]