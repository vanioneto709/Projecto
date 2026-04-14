from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db import models
from .models import Consulta, Perfil, Clinica
from .serializers import ConsultaSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.db.models import Q, Count, Sum
from datetime import datetime, timedelta, date
import secrets


# ============================================
# HELPERS DE PERMISSÃO (ATUALIZADOS)
# ============================================

def get_tipo_usuario(user):
    """Retorna o tipo do usuário ou 'paciente' como padrão."""
    try:
        return Perfil.objects.get(user=user).tipo
    except Perfil.DoesNotExist:
        return 'paciente'


def is_admin_sistema(user):
    """Verifica se é admin do sistema (super admin)."""
    try:
        perfil = Perfil.objects.get(user=user)
        return perfil.tipo == 'admin' or user.is_superuser
    except Perfil.DoesNotExist:
        return user.is_superuser


def is_admin_clinica(user):
    """Verifica se é admin de alguma clínica."""
    try:
        perfil = Perfil.objects.get(user=user)
        return perfil.tipo == 'admin_clinica'
    except Perfil.DoesNotExist:
        return False


def get_minha_clinica(user):
    """Retorna a clínica do usuário (se for admin_clinica ou médico)."""
    try:
        perfil = Perfil.objects.get(user=user)
        # Se for admin_clinica, retorna a clínica que ele administra
        if perfil.tipo == 'admin_clinica' and perfil.clinica_vinculada:
            return perfil.clinica_vinculada
        # Se for médico, retorna a clínica onde trabalha
        if perfil.tipo == 'medico' and perfil.clinica_vinculada:
            return perfil.clinica_vinculada
        return None
    except Perfil.DoesNotExist:
        return None


def get_clinica_do_medico(medico_user):
    """Retorna a clínica de um médico."""
    try:
        perfil = Perfil.objects.get(user=medico_user, tipo='medico')
        return perfil.clinica_vinculada
    except Perfil.DoesNotExist:
        return None


# ============================================
# AUTH & USERS
# ============================================

@api_view(['POST'])
@permission_classes([AllowAny])
def cadastro_api(request):
    """
    Cadastro genérico - usado para criar usuários.
    Tipos válidos: paciente, medico, admin_clinica, recepcionista
    """
    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")
    tipo = request.data.get("tipo", "paciente")
    clinica_id = request.data.get("clinica_id")  # ID da Clinica (não mais User!)

    # Validações
    if not username or not password:
        return Response(
            {"error": "Username e password são obrigatórios"},
            status=status.HTTP_400_BAD_REQUEST
        )

    tipos_validos = ['paciente', 'medico', 'admin_clinica', 'recepcionista']
    if tipo not in tipos_validos:
        return Response(
            {"error": f"Tipo inválido. Use: {', '.join(tipos_validos)}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {"error": "Usuário já existe"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Criar usuário
    user = User.objects.create_user(
        username=username,
        email=email or '',
        password=password
    )

    # Criar perfil
    perfil_data = {'user': user, 'tipo': tipo}
    
    if clinica_id:
        try:
            clinica = Clinica.objects.get(id=clinica_id)
            perfil_data['clinica_vinculada'] = clinica
        except Clinica.DoesNotExist:
            pass  # Clinica não existe, cria sem vínculo
    
    Perfil.objects.create(**perfil_data)

    return Response({
        "message": "Usuário criado com sucesso",
        "user_id": user.id,
        "tipo": tipo
    }, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_api(request):
    """Retorna dados do usuário logado."""
    try:
        perfil = Perfil.objects.get(user=request.user)
        tipo = perfil.tipo
        clinica_id = perfil.clinica_vinculada.id if perfil.clinica_vinculada else None
    except Perfil.DoesNotExist:
        tipo = "paciente"
        clinica_id = None

    return Response({
        "id": request.user.id,
        "username": request.user.username,
        "email": request.user.email,
        "tipo": tipo,
        "clinica_id": clinica_id,
        "first_name": request.user.first_name,
        "last_name": request.user.last_name,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_usuarios_api(request):
    """
    Lista usuários baseado no tipo do solicitante:
    - Admin sistema: vê todos
    - Admin clínica: vê só médicos e pacientes da sua clínica
    - Outros: vê só próprio
    """
    user = request.user
    
    if is_admin_sistema(user):
        # Admin do sistema vê tudo
        perfis = Perfil.objects.all().select_related('user', 'clinica_vinculada')
    elif is_admin_clinica(user):
        # Admin da clínica vê seus funcionários e pacientes
        minha_clinica = get_minha_clinica(user)
        if minha_clinica:
            # Todos os perfis vinculados à minha clínica
            perfis = Perfil.objects.filter(
                clinica_vinculada=minha_clinica
            ).select_related('user', 'clinica_vinculada')
        else:
            perfis = Perfil.objects.filter(user=user)
    else:
        # Só vê a si mesmo
        perfis = Perfil.objects.filter(user=user).select_related('user', 'clinica_vinculada')

    data = []
    for p in perfis:
        item = {
            "id": p.user.id,
            "username": p.user.username,
            "email": p.user.email or "",
            "tipo": p.tipo,
            "status": "ativo" if p.ativo else "inativo",
            "clinicaId": p.clinica_vinculada.id if p.clinica_vinculada else None,
            "clinicaNome": p.clinica_vinculada.nome if p.clinica_vinculada else None,
            "telefone": p.telefone or "",
            "especialidade": p.especialidade or "",
            "ultimoAcesso": p.ultimo_acesso.strftime("%Y-%m-%d %H:%M") if p.ultimo_acesso else "—",
        }
        data.append(item)

    return Response(data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def deletar_usuario_api(request, user_id):
    """Deleta usuário (só admin do sistema ou admin da própria clínica)."""
    try:
        user_alvo = User.objects.get(id=user_id)
        
        # Verificar permissões
        if not is_admin_sistema(request.user):
            # Se for admin_clinica, só pode deletar funcionários da sua clínica
            if is_admin_clinica(request.user):
                minha_clinica = get_minha_clinica(request.user)
                try:
                    perfil_alvo = Perfil.objects.get(user=user_alvo)
                    if perfil_alvo.clinica_vinculada != minha_clinica:
                        return Response({"error": "Acesso negado"}, status=403)
                except Perfil.DoesNotExist:
                    return Response({"error": "Usuário não encontrado"}, status=404)
            else:
                return Response({"error": "Acesso negado"}, status=403)
        
        user_alvo.delete()
        return Response({"message": "Usuário deletado"})
        
    except User.DoesNotExist:
        return Response({"error": "Não encontrado"}, status=404)


# ============================================
# CLÍNICAS (Admin Sistema) - REESCRITO
# ============================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def clinicas_api(request):
    """
    GET  → lista clínicas (só admin do sistema)
    POST → cria nova clínica (só admin do sistema)
    """
    # Verificar se é admin do sistema
    if not is_admin_sistema(request.user):
        return Response({"error": "Acesso negado. Somente admin do sistema."}, status=403)

    if request.method == 'GET':
        clinicas = Clinica.objects.all().order_by('-criada_em')
        
        data = []
        for i, c in enumerate(clinicas):
            # Buscar cor ou gerar uma
            CORES = ["#58A6FF", "#3FB950", "#D29922", "#F85149", "#A371F7", "#39D3F2", "#FF7B72", "#79C0FF"]
            
            data.append({
                "id": c.id,
                "nome": c.nome,
                "email": c.email or "",
                "telefone": c.telefone or "",
                "endereco": c.endereco or "",
                "cnpj": c.cnpj or "",
                "status": c.status,  # "ativa", "inativa", "suspensa"
                "dataCadastro": c.dataCadastro,
                "totalMedicos": c.totalMedicos,
                "totalPacientes": c.totalPacientes,
                "consultasMes": c.consultasMes,
                "faturamentoMes": float(c.faturamentoMes),
                "cor": CORES[i % len(CORES)],
            })
        
        return Response(data)

    elif request.method == 'POST':
        # Criar nova clínica
        dados = request.data
        nome = dados.get('nome', '').strip()
        email = dados.get('email', '').strip()
        telefone = dados.get('telefone', '').strip()
        endereco = dados.get('endereco', '').strip()
        cnpj = dados.get('cnpj', '').strip()

        if not nome or not email:
            return Response({"error": "Nome e email são obrigatórios"}, status=400)

        if Clinica.objects.filter(email=email).exists():
            return Response({"error": "Email já cadastrado"}, status=400)

        clinica = Clinica.objects.create(
            nome=nome,
            email=email,
            telefone=telefone,
            endereco=endereco,
            cnpj=cnpj,
            status='ativa'
        )

        return Response({
            "id": clinica.id,
            "nome": nome,
            "email": email,
            "message": "Clínica criada com sucesso"
        }, status=201)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def clinica_detalhe_api(request, clinica_id):
    """
    Operações em clínica específica (só admin do sistema).
    """
    if not is_admin_sistema(request.user):
        return Response({"error": "Acesso negado"}, status=403)

    try:
        clinica = Clinica.objects.get(id=clinica_id)
    except Clinica.DoesNotExist:
        return Response({"error": "Clínica não encontrada"}, status=404)

    if request.method == 'GET':
        return Response({
            "id": clinica.id,
            "nome": clinica.nome,
            "email": clinica.email or "",
            "telefone": clinica.telefone or "",
            "endereco": clinica.endereco or "",
            "cnpj": clinica.cnpj or "",
            "status": clinica.status,
            "dataCadastro": clinica.dataCadastro,
            "totalMedicos": clinica.totalMedicos,
            "totalPacientes": clinica.totalPacientes,
        })

    elif request.method in ('PUT', 'PATCH'):
        dados = request.data
        
        if 'nome' in dados:
            clinica.nome = dados['nome']
        if 'email' in dados:
            clinica.email = dados['email']
        if 'telefone' in dados:
            clinica.telefone = dados['telefone']
        if 'endereco' in dados:
            clinica.endereco = dados['endereco']
        if 'cnpj' in dados:
            clinica.cnpj = dados['cnpj']
        if 'status' in dados:
            clinica.status = dados['status']
        
        clinica.save()
        return Response({"message": "Clínica atualizada"})

    elif request.method == 'DELETE':
        # Desativar em vez de deletar (mais seguro)
        clinica.status = 'inativa'
        clinica.save()
        return Response({"message": "Clínica desativada"})


# ============================================
# CONSULTAS
# ============================================

def _serializar_consulta(c):
    """Helper para serializar consulta - compatível com dashboard."""
    medico_nome = c.medico.get_full_name() or c.medico.username if c.medico else "—"
    paciente_nome = c.paciente.get_full_name() or c.paciente.username
    
    # Descobrir clínica
    clinica_nome = "—"
    clinica_id = None
    if c.medico:
        try:
            perfil = Perfil.objects.get(user=c.medico)
            if perfil.clinica_vinculada:
                clinica_nome = perfil.clinica_vinculada.nome
                clinica_id = perfil.clinica_vinculada.id
        except Perfil.DoesNotExist:
            pass

    return {
        "id": c.id,
        "paciente": paciente_nome,
        "pacienteId": c.paciente.id,
        "medico": medico_nome,
        "medicoId": c.medico.id if c.medico else None,
        "clinica": clinica_nome,
        "clinicaId": clinica_id,
        "data": c.data.strftime("%Y-%m-%d"),
        "hora": c.hora.strftime("%H:%M") if hasattr(c.hora, 'strftime') else str(c.hora),
        "status": c.status,
        "motivo": c.motivo or "",
        "valor": float(c.valor) if c.valor else None,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def todas_consultas_api(request):
    """
    Lista consultas baseado no tipo de usuário:
    - Admin sistema: todas
    - Admin clínica: só da sua clínica
    - Médico: só as suas
    - Paciente: só as suas
    """
    user = request.user
    tipo = get_tipo_usuario(user)

    if tipo == 'admin':
        qs = Consulta.objects.all()
    elif tipo == 'admin_clinica':
        # Consultas onde o médico pertence à esta clínica
        minha_clinica = get_minha_clinica(user)
        if minha_clinica:
            medicos_da_clinica = Perfil.objects.filter(
                tipo='medico',
                clinica_vinculada=minha_clinica
            ).values_list('user_id', flat=True)
            qs = Consulta.objects.filter(medico_id__in=medicos_da_clinica)
        else:
            qs = Consulta.objects.none()
    elif tipo == 'medico':
        qs = Consulta.objects.filter(medico=user)
    else:  # paciente
        qs = Consulta.objects.filter(paciente=user)

    qs = qs.select_related('paciente', 'medico').order_by('-data', '-hora')
    return Response([_serializar_consulta(c) for c in qs])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def criar_consulta_api(request):
    """Criar consulta (admin ou admin_clinica)."""
    tipo = get_tipo_usuario(request.user)
    
    if tipo not in ['admin', 'admin_clinica']:
        return Response({"error": "Acesso negado"}, status=403)

    dados = request.data
    paciente_id = dados.get("paciente")
    medico_id = dados.get("medico")
    data = dados.get("data")
    hora = dados.get("hora")
    motivo = dados.get("motivo", "")
    valor = dados.get("valor")

    # Se for admin_clinica, verificar se médico pertence à sua clínica
    if tipo == 'admin_clinica':
        try:
            perfil_medico = Perfil.objects.get(user_id=medico_id, tipo='medico')
            minha_clinica = get_minha_clinica(request.user)
            if perfil_medico.clinica_vinculada != minha_clinica:
                return Response({"error": "Médico não pertence à sua clínica"}, status=403)
        except Perfil.DoesNotExist:
            return Response({"error": "Médico não encontrado"}, status=404)

    consulta = Consulta.objects.create(
        paciente_id=paciente_id,
        medico_id=medico_id,
        data=data,
        hora=hora,
        motivo=motivo,
        valor=valor,
        status='agendada'
    )

    return Response({
        "message": "Consulta criada",
        "id": consulta.id
    }, status=201)


# ============================================
# STATS & DASHBOARD
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats_api(request):
    """Estatísticas para o dashboard."""
    user = request.user
    tipo = get_tipo_usuario(user)
    
    hoje = date.today()
    inicio_mes = hoje.replace(day=1)
    
    if tipo == 'admin':
        # Admin do sistema - vê tudo
        total_clinicas = Clinica.objects.count()
        clinicas_ativas = Clinica.objects.filter(status='ativa').count()
        total_medicos = Perfil.objects.filter(tipo='medico').count()
        total_pacientes = Perfil.objects.filter(tipo='paciente').count()
        
        consultas_hoje = Consulta.objects.filter(data=hoje).count()
        consultas_mes = Consulta.objects.filter(data__gte=inicio_mes).count()
        
        faturamento = Consulta.objects.filter(
            data__gte=inicio_mes,
            status='concluida',
            valor__isnull=False
        ).aggregate(total=Sum('valor'))['total'] or 0

        return Response({
            "totalClinicas": total_clinicas,
            "clinicasAtivas": clinicas_ativas,
            "totalMedicos": total_medicos,
            "totalPacientes": total_pacientes,
            "consultasHoje": consultas_hoje,
            "consultasMes": consultas_mes,
            "faturamentoMes": float(faturamento),
            "ticketMedio": float(faturamento / consultas_mes) if consultas_mes > 0 else 0,
            "crescimento": 0,
        })
    
    elif tipo == 'admin_clinica':
        # Admin da clínica - vê só da sua clínica
        minha_clinica = get_minha_clinica(user)
        
        if not minha_clinica:
            return Response({
                "totalClinicas": 0, "clinicasAtivas": 0, "totalMedicos": 0,
                "totalPacientes": 0, "consultasHoje": 0, "consultasMes": 0,
                "faturamentoMes": 0, "ticketMedio": 0, "crescimento": 0,
            })
        
        medicos_ids = Perfil.objects.filter(
            tipo='medico',
            clinica_vinculada=minha_clinica
        ).values_list('user_id', flat=True)
        
        total_medicos = len(medicos_ids)
        
        pacientes_ids = Consulta.objects.filter(
            medico_id__in=medicos_ids
        ).values_list('paciente_id', flat=True).distinct()
        total_pacientes = len(pacientes_ids)
        
        consultas_hoje = Consulta.objects.filter(
            medico_id__in=medicos_ids,
            data=hoje
        ).count()
        
        consultas_mes = Consulta.objects.filter(
            medico_id__in=medicos_ids,
            data__gte=inicio_mes
        ).count()
        
        faturamento = Consulta.objects.filter(
            medico_id__in=medicos_ids,
            data__gte=inicio_mes,
            status='concluida',
            valor__isnull=False
        ).aggregate(total=Sum('valor'))['total'] or 0
        
        return Response({
            "totalClinicas": 1,
            "clinicasAtivas": 1 if minha_clinica.status == 'ativa' else 0,
            "totalMedicos": total_medicos,
            "totalPacientes": total_pacientes,
            "consultasHoje": consultas_hoje,
            "consultasMes": consultas_mes,
            "faturamentoMes": float(faturamento),
            "ticketMedio": float(faturamento / consultas_mes) if consultas_mes > 0 else 0,
            "crescimento": 0,
        })
    
    else:
        return Response({"error": "Acesso negado"}, status=403)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notificacoes_api(request):
    """Notificações para o dashboard."""
    tipo = get_tipo_usuario(request.user)
    
    if tipo not in ['admin', 'admin_clinica']:
        return Response([])
    
    hoje = date.today()
    notificacoes = []
    
    if tipo == 'admin':
        # Notificações para admin do sistema
        consultas_hoje = Consulta.objects.filter(data=hoje).count()
        if consultas_hoje > 0:
            notificacoes.append({
                "id": 1,
                "tipo": "info",
                "titulo": "Consultas hoje",
                "mensagem": f"{consultas_hoje} consultas agendadas para hoje",
                "data": datetime.now().isoformat(),
                "lida": False,
            })
        
        # Clínicas sem médicos
        clinicas_sem_medicos = []
        for clinica in Clinica.objects.filter(status='ativa'):
            if Perfil.objects.filter(tipo='medico', clinica_vinculada=clinica).count() == 0:
                clinicas_sem_medicos.append(clinica.nome)
        
        if clinicas_sem_medicos:
            notificacoes.append({
                "id": 2,
                "tipo": "warning",
                "titulo": "Clínicas sem médicos",
                "mensagem": f"{len(clinicas_sem_medicos)} clínica(s) precisam de médicos",
                "data": datetime.now().isoformat(),
                "lida": False,
            })
    
    else:  # admin_clinica
        # Notificações para admin da clínica
        minha_clinica = get_minha_clinica(request.user)
        if minha_clinica:
            medicos_ids = Perfil.objects.filter(
                tipo='medico',
                clinica_vinculada=minha_clinica
            ).values_list('user_id', flat=True)
            
            consultas_hoje = Consulta.objects.filter(
                medico_id__in=medicos_ids,
                data=hoje
            ).count()
            
            if consultas_hoje > 0:
                notificacoes.append({
                    "id": 1,
                    "tipo": "info",
                    "titulo": "Agenda de hoje",
                    "mensagem": f"{consultas_hoje} consultas na sua clínica hoje",
                    "data": datetime.now().isoformat(),
                    "lida": False,
                })
    
    return Response(notificacoes)


# ============================================
# PACIENTE
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def minhas_consultas_api(request):
    """Consultas do paciente logado."""
    consultas = Consulta.objects.filter(
        paciente=request.user
    ).select_related('medico').order_by('-data', '-hora')
    
    return Response([_serializar_consulta(c) for c in consultas])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def consultas_paciente_api(request):
    """Alias para minhas_consultas_api."""
    return minhas_consultas_api(request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agendar_consulta_paciente_api(request):
    """Paciente agenda consulta."""
    dados = request.data
    medico_id = dados.get('medicoId')
    data_str = dados.get('data')
    hora_str = dados.get('hora')
    motivo = dados.get('motivo', '')

    if not all([medico_id, data_str, hora_str]):
        return Response({"error": "medicoId, data e hora são obrigatórios"}, status=400)

    # Verificar se horário está disponível
    if Consulta.objects.filter(medico_id=medico_id, data=data_str, hora=hora_str).exists():
        return Response({"error": "Horário já ocupado"}, status=409)

    c = Consulta.objects.create(
        paciente=request.user,
        medico_id=medico_id,
        data=data_str,
        hora=hora_str,
        motivo=motivo,
        status='agendada'
    )
    
    return Response({
        "success": True, 
        "consultaId": c.id,
        "message": "Consulta agendada com sucesso"
    }, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cancelar_consulta_paciente_api(request, consulta_id):
    """Paciente cancela consulta."""
    try:
        c = Consulta.objects.get(id=consulta_id, paciente=request.user)
        c.status = 'cancelada'
        c.save()
        return Response({"message": "Consulta cancelada"})
    except Consulta.DoesNotExist:
        return Response({"error": "Consulta não encontrada"}, status=404)


# ============================================
# MÉDICO
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agenda_medico_api(request):
    """Agenda do médico logado."""
    tipo = get_tipo_usuario(request.user)
    if tipo != 'medico':
        return Response({"error": "Acesso negado"}, status=403)
    
    data_param = request.query_params.get('data')
    qs = Consulta.objects.filter(medico=request.user)
    
    if data_param:
        qs = qs.filter(data=data_param)
    
    qs = qs.select_related('paciente').order_by('data', 'hora')
    return Response([_serializar_consulta(c) for c in qs])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pacientes_medico_api(request):
    """Pacientes do médico."""
    tipo = get_tipo_usuario(request.user)
    if tipo != 'medico':
        return Response({"error": "Acesso negado"}, status=403)
    
    pacientes_ids = Consulta.objects.filter(
        medico=request.user
    ).values_list('paciente_id', flat=True).distinct()
    
    users = User.objects.filter(id__in=pacientes_ids)
    data = []
    for u in users:
        ultima = Consulta.objects.filter(
            medico=request.user, 
            paciente=u
        ).order_by('-data').first()
        
        # Buscar telefone do perfil do paciente
        telefone = ""
        try:
            perfil = Perfil.objects.get(user=u)
            telefone = perfil.telefone or ""
        except Perfil.DoesNotExist:
            pass
        
        data.append({
            "id": u.id,
            "nome": u.get_full_name() or u.username,
            "email": u.email or "",
            "telefone": telefone,
            "ultimaConsulta": ultima.data.strftime("%Y-%m-%d") if ultima else None,
            "totalConsultas": Consulta.objects.filter(medico=request.user, paciente=u).count(),
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def horarios_medico_api(request):
    """Horários disponíveis do médico."""
    tipo = get_tipo_usuario(request.user)
    if tipo != 'medico':
        return Response({"error": "Acesso negado"}, status=403)
    
    data_str = request.query_params.get('data', date.today().strftime('%Y-%m-%d'))
    
    HORARIOS = [
        "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
        "11:00", "11:30", "14:00", "14:30", "15:00", "15:30",
        "16:00", "16:30", "17:00", "17:30",
    ]
    
    ocupados = Consulta.objects.filter(
        medico=request.user, 
        data=data_str
    ).values_list('hora', flat=True)
    
    ocupados_str = [h.strftime('%H:%M') if hasattr(h, 'strftime') else str(h)[:5] for h in ocupados]
    
    return Response({
        "data": data_str,
        "ocupados": ocupados_str,
        "disponiveis": [h for h in HORARIOS if h not in ocupados_str],
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def salvar_descricao_consulta_api(request, consulta_id):
    """Médico salva descrição da consulta."""
    tipo = get_tipo_usuario(request.user)
    if tipo != 'medico':
        return Response({"error": "Acesso negado"}, status=403)
    
    try:
        c = Consulta.objects.get(id=consulta_id, medico=request.user)
        c.descricao = request.data.get('descricao', c.descricao)
        c.save()
        return Response({"message": "Descrição salva"})
    except Consulta.DoesNotExist:
        return Response({"error": "Consulta não encontrada"}, status=404)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def atualizar_status_consulta_api(request, consulta_id):
    """Médico ou admin_clinica atualiza status."""
    tipo = get_tipo_usuario(request.user)
    
    try:
        c = Consulta.objects.get(id=consulta_id)
    except Consulta.DoesNotExist:
        return Response({"error": "Consulta não encontrada"}, status=404)
    
    # Verificar permissão
    pode_alterar = False
    if tipo == 'admin':
        pode_alterar = True
    elif tipo == 'medico' and c.medico == request.user:
        pode_alterar = True
    elif tipo == 'admin_clinica':
        # Verificar se consulta é de médico da sua clínica
        if c.medico:
            clinica_medico = get_clinica_do_medico(c.medico)
            minha_clinica = get_minha_clinica(request.user)
            if clinica_medico == minha_clinica:
                pode_alterar = True
    
    if not pode_alterar:
        return Response({"error": "Acesso negado"}, status=403)
    
    novo_status = request.data.get('status')
    if novo_status not in ['agendada', 'confirmada', 'concluida', 'cancelada']:
        return Response({"error": "Status inválido"}, status=400)
    
    c.status = novo_status
    c.save()
    
    return Response({
        "message": f"Consulta {novo_status} com sucesso",
        "consultaId": c.id,
        "novoStatus": novo_status
    })


# ============================================
# PÚBLICO (sem login)
# ============================================

@api_view(['GET'])
@permission_classes([AllowAny])
def listar_clinicas_publico_api(request):
    """Lista clínicas ativas (público)."""
    clinicas = Clinica.objects.filter(status='ativa')
    
    data = []
    for c in clinicas:
        total_medicos = Perfil.objects.filter(
            tipo='medico',
            clinica_vinculada=c
        ).count()
        
        data.append({
            "id": c.id,
            "nome": c.nome,
            "endereco": c.endereco or "",
            "telefone": c.telefone or "",
            "email": c.email or "",
            "totalMedicos": total_medicos,
        })
    
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def medicos_por_clinica_api(request, clinica_id):
    """Médicos de uma clínica (público)."""
    try:
        clinica = Clinica.objects.get(id=clinica_id, status='ativa')
    except Clinica.DoesNotExist:
        return Response({"error": "Clínica não encontrada"}, status=404)
    
    medicos = Perfil.objects.filter(
        tipo='medico',
        clinica_vinculada=clinica,
        ativo=True
    ).select_related('user')
    
    data = []
    for p in medicos:
        data.append({
            "id": p.user.id,
            "nome": p.user.get_full_name() or p.user.username,
            "especialidade": p.especialidade or 'Geral',
            "crm": p.crm or "",
        })
    
    return Response(data)


@api_view(['GET'])
@permission_classes([AllowAny])
def horarios_disponiveis_api(request):
    """Horários disponíveis para médico em data (público)."""
    medico_id = request.query_params.get('medico_id')
    data_str = request.query_params.get('data')
    
    if not medico_id or not data_str:
        return Response({"error": "medico_id e data são obrigatórios"}, status=400)
    
    try:
        data_consulta = datetime.strptime(data_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({"error": "Formato de data inválido. Use YYYY-MM-DD"}, status=400)
    
    HORARIOS = [
        "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
        "11:00", "11:30", "14:00", "14:30", "15:00", "15:30",
        "16:00", "16:30", "17:00", "17:30"
    ]
    
    ocupados = Consulta.objects.filter(
        medico_id=medico_id,
        data=data_consulta,
        status__in=['agendada', 'confirmada']
    ).values_list('hora', flat=True)
    
    ocupados_str = [h.strftime('%H:%M') for h in ocupados]
    
    disponiveis = [
        h for h in HORARIOS 
        if h not in ocupados_str and data_consulta >= date.today()
    ]
    
    return Response({
        "data": data_str,
        "medico_id": medico_id,
        "horariosDisponiveis": disponiveis
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def agendamento_rapido_api(request):
    """Agendamento sem login."""
    dados = request.data
    
    clinica_id = dados.get('clinicaId')
    medico_id = dados.get('medicoId')
    data = dados.get('data')
    hora = dados.get('hora')
    nome = dados.get('nome')
    telefone = dados.get('telefone')
    email = dados.get('email', '')
    motivo = dados.get('motivo', '')
    
    if not all([clinica_id, medico_id, data, hora, nome, telefone]):
        return Response({"error": "Dados incompletos"}, status=400)
    
    # Verificar se médico pertence à clínica
    try:
        perfil_medico = Perfil.objects.get(user_id=medico_id, tipo='medico')
        if perfil_medico.clinica_vinculada_id != int(clinica_id):
            return Response({"error": "Médico não pertence à clínica"}, status=400)
    except Perfil.DoesNotExist:
        return Response({"error": "Médico não encontrado"}, status=404)
    
    # Criar ou pegar paciente
    paciente = None
    if email and User.objects.filter(email=email).exists():
        paciente = User.objects.get(email=email)
        paciente.first_name = nome
        paciente.save()
    else:
        username = f"pac_{nome.lower().replace(' ', '_')}_{datetime.now().strftime('%H%M%S')}"
        senha = secrets.token_urlsafe(8)
        
        paciente = User.objects.create_user(
            username=username,
            email=email,
            first_name=nome,
            password=senha
        )
        
        Perfil.objects.create(
            user=paciente,
            tipo='paciente',
            telefone=telefone
        )
    
    # Criar consulta
    try:
        consulta = Consulta.objects.create(
            paciente=paciente,
            medico_id=medico_id,
            data=data,
            hora=hora,
            motivo=motivo,
            status='agendada'
        )
        
        return Response({
            "success": True,
            "message": "Consulta agendada com sucesso!",
            "consultaId": consulta.id,
            "paciente": {
                "id": paciente.id,
                "nome": nome,
                "username": paciente.username
            }
        }, status=201)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def cadastro_clinica_api(request):
    """Cadastro público de clínica."""
    dados = request.data
    
    nome = dados.get('nome')
    cnpj = dados.get('cnpj', '')
    email = dados.get('email')
    telefone = dados.get('telefone')
    endereco = dados.get('endereco', '')
    senha = dados.get('senha')
    
    if not all([nome, email, telefone, senha]):
        return Response({"error": "Nome, email, telefone e senha são obrigatórios"}, status=400)
    
    if Clinica.objects.filter(email=email).exists():
        return Response({"error": "Email já cadastrado"}, status=400)
    
    # Criar clínica primeiro
    try:
        clinica = Clinica.objects.create(
            nome=nome,
            email=email,
            telefone=telefone,
            endereco=endereco,
            cnpj=cnpj,
            status='ativa'
        )
        
        # Criar usuário admin para a clínica
        username = nome.lower().replace(' ', '_').replace('-', '_')
        base = username
        n = 1
        while User.objects.filter(username=username).exists():
            username = f"{base}_{n}"
            n += 1
        
        user = User.objects.create_user(
            username=username,
            email=email,
            password=senha,
            first_name=nome,
            is_active=True
        )
        
        # Vincular usuário à clínica
        Perfil.objects.create(
            user=user,
            tipo='admin_clinica',
            clinica_vinculada=clinica,
            telefone=telefone
        )
        
        # Atualizar admin da clínica
        clinica.admin = user
        clinica.save()
        
        return Response({
            "success": True,
            "message": "Clínica cadastrada com sucesso!",
            "clínica": {
                "id": clinica.id,
                "nome": nome,
                "username": username,
                "email": email
            }
        }, status=201)
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def listar_medicos_publico_api(request):
    """Lista todos os médicos (público)."""
    medicos = Perfil.objects.filter(
        tipo='medico',
        ativo=True
    ).select_related('user', 'clinica_vinculada')
    
    return Response([
        {
            "id": p.user.id,
            "nome": p.user.get_full_name() or p.user.username,
            "especialidade": p.especialidade or "Geral",
            "crm": p.crm or "",
            "clinica": p.clinica_vinculada.nome if p.clinica_vinculada else "—",
        }
        for p in medicos
    ])


# ============================================
# DASHBOARD CLÍNICA (views específicas)
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def consultas_clinica_api(request):
    """Consultas da clínica (para admin_clinica)."""
    tipo = get_tipo_usuario(request.user)
    
    if tipo != 'admin_clinica':
        return Response({"error": "Acesso negado"}, status=403)
    
    minha_clinica = get_minha_clinica(request.user)
    if not minha_clinica:
        return Response([])
    
    # Médicos da clínica
    medicos_ids = Perfil.objects.filter(
        tipo='medico',
        clinica_vinculada=minha_clinica
    ).values_list('user_id', flat=True)
    
    consultas = Consulta.objects.filter(
        medico_id__in=medicos_ids
    ).select_related('paciente', 'medico').order_by('-data', '-hora')
    
    data = []
    for c in consultas:
        # Buscar telefone do paciente
        telefone_paciente = ""
        try:
            perfil_paciente = Perfil.objects.get(user=c.paciente)
            telefone_paciente = perfil_paciente.telefone or ""
        except Perfil.DoesNotExist:
            pass
        
        data.append({
            "id": c.id,
            "paciente": c.paciente.get_full_name() or c.paciente.username,
            "pacienteTelefone": telefone_paciente,
            "medico": c.medico.get_full_name() or c.medico.username if c.medico else "Não atribuído",
            "data": c.data.strftime('%d/%m/%Y'),
            "hora": c.hora.strftime('%H:%M') if hasattr(c.hora, 'strftime') else str(c.hora),
            "status": c.status,
            "motivo": c.motivo or "",
        })
    
    return Response(data)