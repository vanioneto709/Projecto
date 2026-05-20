from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db import models
from .models import (
    Consulta, Perfil, Clinica, Prontuario, ProcedimentoDentario,
    AnexoProntuario, PartilhaProntuario, Conversa, Mensagem
)
from django.core.files.storage import default_storage
import os
from .serializers import ConsultaSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.db.models import Q, Count, Sum
from datetime import datetime, timedelta, date
import secrets


# ============================================
# HELPERS DE PERMISSÃO
# ============================================

def get_tipo_usuario(user):
    try:
        return Perfil.objects.get(user=user).tipo
    except Perfil.DoesNotExist:
        return 'paciente'


def is_admin_sistema(user):
    try:
        perfil = Perfil.objects.get(user=user)
        return perfil.tipo == 'admin' or user.is_superuser
    except Perfil.DoesNotExist:
        return user.is_superuser


def is_admin_clinica(user):
    try:
        perfil = Perfil.objects.get(user=user)
        return perfil.tipo == 'admin_clinica'
    except Perfil.DoesNotExist:
        return False


def get_minha_clinica(user):
    try:
        perfil = Perfil.objects.get(user=user)
        if perfil.tipo in ['admin_clinica', 'medico'] and perfil.clinica_vinculada:
            return perfil.clinica_vinculada
        return None
    except Perfil.DoesNotExist:
        return None


def get_clinica_do_medico(medico_user):
    try:
        perfil = Perfil.objects.get(user=medico_user, tipo='medico')
        return perfil.clinica_vinculada
    except Perfil.DoesNotExist:
        return None


def _get_clinica_do_user(user):
    try:
        perfil = Perfil.objects.get(user=user)
        return perfil.clinica_vinculada
    except Perfil.DoesNotExist:
        return None


# ============================================
# HELPER DE MENSAGENS (usado internamente)
# ============================================

def _abrir_ou_reutilizar_conversa(user_a, user_b):
    """Retorna conversa existente entre dois users ou cria uma nova."""
    conversa = Conversa.objects.filter(
        participantes=user_a
    ).filter(
        participantes=user_b
    ).first()

    if not conversa:
        conversa = Conversa.objects.create()
        conversa.participantes.add(user_a, user_b)

    return conversa


def _mensagem_sistema(conversa, corpo):
    """Cria mensagem automática do sistema (remetente=None)."""
    Mensagem.objects.create(conversa=conversa, remetente=None, corpo=corpo)
    conversa.save()


# ============================================
# AUTH & USERS
# ============================================

@api_view(['POST'])
@permission_classes([AllowAny])
def cadastro_api(request):
    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")
    tipo = request.data.get("tipo", "paciente")
    clinica_id = request.data.get("clinica_id") or request.data.get("clinicaId")
    telefone = request.data.get("telefone", "")
    especialidade = request.data.get("especialidade", "")

    if not username or not password:
        return Response({"error": "Username e password são obrigatórios"}, status=400)

    tipos_validos = ['paciente', 'medico', 'admin_clinica', 'recepcionista']
    if tipo not in tipos_validos:
        return Response({"error": f"Tipo inválido. Use: {', '.join(tipos_validos)}"}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"error": "Usuário já existe"}, status=400)

    user = User.objects.create_user(username=username, email=email or '', password=password)

    perfil_data = {'user': user, 'tipo': tipo}
    if clinica_id:
        try:
            clinica = Clinica.objects.get(id=clinica_id)
            perfil_data['clinica_vinculada'] = clinica
        except Clinica.DoesNotExist:
            pass

    perfil, created = Perfil.objects.get_or_create(user=user, defaults=perfil_data)
    if not created:
        perfil.tipo = tipo
        perfil.telefone = telefone
        perfil.especialidade = especialidade
        if 'clinica_vinculada' in perfil_data:
            perfil.clinica_vinculada = perfil_data['clinica_vinculada']
        perfil.save()

    return Response({"message": "Usuário criado com sucesso", "user_id": user.id, "tipo": tipo}, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_api(request):
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
    user = request.user
    if is_admin_sistema(user):
        perfis = Perfil.objects.all().select_related('user', 'clinica_vinculada')
    elif is_admin_clinica(user):
        minha_clinica = get_minha_clinica(user)
        if minha_clinica:
            perfis = Perfil.objects.filter(clinica_vinculada=minha_clinica).select_related('user', 'clinica_vinculada')
        else:
            perfis = Perfil.objects.filter(user=user)
    else:
        perfis = Perfil.objects.filter(user=user).select_related('user', 'clinica_vinculada')

    data = []
    for p in perfis:
        data.append({
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
        })
    return Response(data)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def usuario_detalhe_api(request, user_id):
    if not is_admin_sistema(request.user) and not is_admin_clinica(request.user):
        return Response({"error": "Acesso negado"}, status=403)

    try:
        user_alvo = User.objects.get(id=user_id)
        perfil = Perfil.objects.get(user=user_alvo)
    except (User.DoesNotExist, Perfil.DoesNotExist):
        return Response({"error": "Usuário não encontrado"}, status=404)

    if is_admin_clinica(request.user):
        minha_clinica = get_minha_clinica(request.user)
        if perfil.clinica_vinculada != minha_clinica:
            return Response({"error": "Acesso negado"}, status=403)

    if request.method == 'GET':
        return Response({
            "id": user_alvo.id,
            "username": user_alvo.username,
            "email": user_alvo.email,
            "tipo": perfil.tipo,
            "telefone": perfil.telefone or "",
            "especialidade": perfil.especialidade or "",
            "clinicaId": perfil.clinica_vinculada.id if perfil.clinica_vinculada else None,
            "status": "ativo" if perfil.ativo else "inativo",
        })

    elif request.method in ('PUT', 'PATCH'):
        dados = request.data
        if 'email' in dados:
            user_alvo.email = dados['email']
        if 'first_name' in dados:
            user_alvo.first_name = dados['first_name']
        if 'last_name' in dados:
            user_alvo.last_name = dados['last_name']
        user_alvo.save()

        if 'tipo' in dados and is_admin_sistema(request.user):
            tipos_validos = ['paciente', 'medico', 'admin_clinica', 'recepcionista']
            if dados['tipo'] in tipos_validos:
                perfil.tipo = dados['tipo']
        if 'telefone' in dados:
            perfil.telefone = dados['telefone']
        if 'especialidade' in dados:
            perfil.especialidade = dados['especialidade']
        clinica_id = dados.get('clinicaId') or dados.get('clinica_id')
        if clinica_id:
            try:
                perfil.clinica_vinculada = Clinica.objects.get(id=clinica_id)
            except Clinica.DoesNotExist:
                pass
        if 'status' in dados:
            perfil.ativo = dados['status'] == 'ativo'
        perfil.save()
        return Response({"message": "Usuário atualizado com sucesso"})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def deletar_usuario_api(request, user_id):
    try:
        user_alvo = User.objects.get(id=user_id)
        if not is_admin_sistema(request.user):
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


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def clinica_alterar_senha_usuario_api(request, user_id):
    if not is_admin_clinica(request.user):
        return Response({"error": "Acesso negado"}, status=403)

    nova_senha = request.data.get('novaSenha', '').strip()
    if not nova_senha:
        return Response({"error": "novaSenha é obrigatório"}, status=400)
    if len(nova_senha) < 6:
        return Response({"error": "Senha deve ter pelo menos 6 caracteres"}, status=400)

    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "Utilizador não encontrado"}, status=404)

    minha_clinica = get_minha_clinica(request.user)
    perfil = Perfil.objects.filter(user=target).first()

    if not perfil:
        return Response({"error": "Utilizador sem perfil"}, status=404)

    if perfil.tipo not in ['medico', 'paciente']:
        return Response({"error": "Só é possível alterar senha de médicos e pacientes"}, status=403)

    if perfil.tipo == 'medico' and perfil.clinica_vinculada != minha_clinica:
        return Response({"error": "Este médico não pertence à sua clínica"}, status=403)

    if perfil.tipo == 'paciente':
        medicos_ids = Perfil.objects.filter(
            tipo='medico', clinica_vinculada=minha_clinica
        ).values_list('user_id', flat=True)
        if not Consulta.objects.filter(paciente=target, medico_id__in=medicos_ids).exists():
            return Response({"error": "Este paciente não está associado à sua clínica"}, status=403)

    target.set_password(nova_senha)
    target.save()
    return Response({"message": f"Senha de {target.get_full_name() or target.username} alterada com sucesso"})


# ============================================
# CLÍNICAS (Admin Sistema)
# ============================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def clinicas_api(request):
    if not is_admin_sistema(request.user):
        return Response({"error": "Acesso negado. Somente admin do sistema."}, status=403)

    if request.method == 'GET':
        clinicas = Clinica.objects.all().order_by('-criada_em')
        CORES = ["#58A6FF", "#3FB950", "#D29922", "#F85149", "#A371F7", "#39D3F2", "#FF7B72", "#79C0FF"]
        data = []
        for i, c in enumerate(clinicas):
            data.append({
                "id": c.id,
                "nome": c.nome,
                "email": c.email or "",
                "telefone": c.telefone or "",
                "endereco": c.endereco or "",
                "NIF": c.NIF or "",
                "status": c.status,
                "dataCadastro": c.dataCadastro,
                "totalMedicos": c.totalMedicos,
                "totalPacientes": c.totalPacientes,
                "consultasMes": c.consultasMes,
                "faturamentoMes": float(c.faturamentoMes),
                "cor": CORES[i % len(CORES)],
            })
        return Response(data)

    elif request.method == 'POST':
        dados = request.data
        nome = dados.get('nome', '').strip()
        email = dados.get('email', '').strip()
        if not nome or not email:
            return Response({"error": "Nome e email são obrigatórios"}, status=400)
        if Clinica.objects.filter(email=email).exists():
            return Response({"error": "Email já cadastrado"}, status=400)
        clinica = Clinica.objects.create(
            nome=nome, email=email,
            telefone=dados.get('telefone', ''),
            endereco=dados.get('endereco', ''),
            NIF=dados.get('NIF', ''),
            status='ativa'
        )
        return Response({"id": clinica.id, "nome": nome, "message": "Clínica criada"}, status=201)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def clinica_detalhe_api(request, clinica_id):
    if not is_admin_sistema(request.user):
        return Response({"error": "Acesso negado"}, status=403)

    try:
        clinica = Clinica.objects.get(id=clinica_id)
    except Clinica.DoesNotExist:
        return Response({"error": "Clínica não encontrada"}, status=404)

    if request.method == 'GET':
        return Response({
            "id": clinica.id, "nome": clinica.nome,
            "email": clinica.email or "", "telefone": clinica.telefone or "",
            "endereco": clinica.endereco or "", "NIF": clinica.NIF or "",
            "status": clinica.status, "dataCadastro": clinica.dataCadastro,
            "totalMedicos": clinica.totalMedicos, "totalPacientes": clinica.totalPacientes,
        })

    elif request.method in ('PUT', 'PATCH'):
        dados = request.data
        for campo in ['nome', 'email', 'telefone', 'endereco', 'NIF', 'status']:
            if campo in dados:
                setattr(clinica, campo, dados[campo])
        clinica.save()
        return Response({"message": "Clínica atualizada"})

    elif request.method == 'DELETE':
        clinica.status = 'inativa'
        clinica.save()
        return Response({"message": "Clínica desativada"})


# ============================================
# CONSULTAS — helpers e views
# ============================================

def _serializar_consulta(c):
    medico_nome = c.medico.get_full_name() or c.medico.username if c.medico else "—"
    paciente_nome = c.paciente.get_full_name() or c.paciente.username
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
        "descricao": c.descricao or "",
        "valor": float(c.valor) if c.valor else None,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def todas_consultas_api(request):
    tipo = get_tipo_usuario(request.user)
    if tipo == 'admin':
        qs = Consulta.objects.all()
    elif tipo == 'admin_clinica':
        minha_clinica = get_minha_clinica(request.user)
        if minha_clinica:
            medicos_ids = Perfil.objects.filter(tipo='medico', clinica_vinculada=minha_clinica).values_list('user_id', flat=True)
            qs = Consulta.objects.filter(medico_id__in=medicos_ids)
        else:
            qs = Consulta.objects.none()
    elif tipo == 'medico':
        qs = Consulta.objects.filter(medico=request.user)
    else:
        qs = Consulta.objects.filter(paciente=request.user)
    qs = qs.select_related('paciente', 'medico').order_by('-data', '-hora')
    return Response([_serializar_consulta(c) for c in qs])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def criar_consulta_api(request):
    tipo = get_tipo_usuario(request.user)
    if tipo not in ['admin', 'admin_clinica']:
        return Response({"error": "Acesso negado"}, status=403)
    dados = request.data
    if tipo == 'admin_clinica':
        try:
            perfil_medico = Perfil.objects.get(user_id=dados.get("medico"), tipo='medico')
            if perfil_medico.clinica_vinculada != get_minha_clinica(request.user):
                return Response({"error": "Médico não pertence à sua clínica"}, status=403)
        except Perfil.DoesNotExist:
            return Response({"error": "Médico não encontrado"}, status=404)
    consulta = Consulta.objects.create(
        paciente_id=dados.get("paciente"),
        medico_id=dados.get("medico"),
        data=dados.get("data"),
        hora=dados.get("hora"),
        motivo=dados.get("motivo", ""),
        valor=dados.get("valor"),
        status='agendada'
    )
    return Response({"message": "Consulta criada", "id": consulta.id}, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def minhas_consultas_api(request):
    consultas = Consulta.objects.filter(paciente=request.user).select_related('medico').order_by('-data', '-hora')
    return Response([_serializar_consulta(c) for c in consultas])


# ============================================
# PRONTUÁRIO
# ============================================

def _pode_editar_prontuario(user):
    return get_tipo_usuario(user) in ['medico', 'admin', 'admin_clinica']


def _serializar_prontuario(p, request=None, detalhe=False):
    medico_pref = None
    if p.medico_preferencial:
        medico_pref = {
            "id": p.medico_preferencial.id,
            "nome": p.medico_preferencial.get_full_name() or p.medico_preferencial.username,
        }
    data = {
        "id": p.id,
        "pacienteId": p.paciente.id,
        "pacienteNome": p.paciente.get_full_name() or p.paciente.username,
        "criadoPor": p.criado_por.get_full_name() or p.criado_por.username if p.criado_por else "—",
        "medicoPreferencial": medico_pref,
        "alergias": p.alergias,
        "medicamentosEmUso": p.medicamentos_em_uso,
        "doencasSistemicas": p.doencas_sistemicas,
        "observacoes": p.observacoes,
        "criadoEm": p.criado_em.strftime("%Y-%m-%d %H:%M"),
        "atualizadoEm": p.atualizado_em.strftime("%Y-%m-%d %H:%M"),
        "atualizadoPor": (
            p.atualizado_por.get_full_name() or p.atualizado_por.username
            if p.atualizado_por else "—"
        ),
    }
    if detalhe:
        data["procedimentos"] = [
            {
                "id": pr.id, "tipo": pr.tipo, "tipoLabel": pr.get_tipo_display(),
                "dente": pr.dente, "descricao": pr.descricao,
                "data": pr.data.strftime("%Y-%m-%d"),
                "medico": pr.medico.get_full_name() or pr.medico.username if pr.medico else "—",
                "consultaId": pr.consulta.id if pr.consulta else None,
            }
            for pr in p.procedimentos.all()
        ]
        data["anexos"] = [
            {
                "id": a.id, "tipo": a.tipo, "tipoLabel": a.get_tipo_display(),
                "titulo": a.titulo,
                "dataExame": a.data_exame.strftime("%Y-%m-%d"),
                "descricao": a.descricao,
                "url": (
                    request.build_absolute_uri(a.arquivo.url)
                    if request else f"/media/{a.arquivo.name}"
                ),
                "adicionadoPor": (
                    a.adicionado_por.get_full_name() or a.adicionado_por.username
                    if a.adicionado_por else "—"
                ),
            }
            for a in p.anexos.all()
        ]
    return data


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def prontuarios_api(request):
    if not _pode_editar_prontuario(request.user):
        return Response({"error": "Acesso negado"}, status=403)
    tipo = get_tipo_usuario(request.user)

    if request.method == 'GET':
        if tipo == 'admin':
            qs = Prontuario.objects.all()
        elif tipo == 'admin_clinica':
            minha_clinica = get_minha_clinica(request.user)
            medicos_ids = Perfil.objects.filter(tipo='medico', clinica_vinculada=minha_clinica).values_list('user_id', flat=True)
            if medicos_ids:
                pacientes_ids = Consulta.objects.filter(medico_id__in=medicos_ids).values_list('paciente_id', flat=True).distinct()
                qs = Prontuario.objects.filter(paciente_id__in=pacientes_ids)
            else:
                qs = Prontuario.objects.all()
        else:
            pacientes_ids = Consulta.objects.filter(medico=request.user).values_list('paciente_id', flat=True).distinct()
            qs = Prontuario.objects.filter(paciente_id__in=pacientes_ids)
        qs = qs.select_related('paciente', 'criado_por', 'medico_preferencial')
        return Response([_serializar_prontuario(p) for p in qs])

    elif request.method == 'POST':
        paciente_id = request.data.get('pacienteId')
        if not paciente_id:
            return Response({"error": "pacienteId é obrigatório"}, status=400)
        try:
            paciente = User.objects.get(id=paciente_id)
        except User.DoesNotExist:
            return Response({"error": "Paciente não encontrado"}, status=404)
        if Prontuario.objects.filter(paciente=paciente).exists():
            return Response({"error": "Este paciente já tem prontuário"}, status=409)

        d = request.data
        medico_pref_id = d.get('medicoPreferencialId')
        if medico_pref_id:
            try:
                medico_pref = User.objects.get(id=medico_pref_id)
            except User.DoesNotExist:
                medico_pref = request.user
        else:
            medico_pref = request.user if tipo == 'medico' else None

        prontuario = Prontuario.objects.create(
            paciente=paciente, criado_por=request.user,
            atualizado_por=request.user, medico_preferencial=medico_pref,
            alergias=d.get('alergias', ''),
            medicamentos_em_uso=d.get('medicamentosEmUso', ''),
            doencas_sistemicas=d.get('doencasSistemicas', ''),
            observacoes=d.get('observacoes', ''),
        )
        return Response(_serializar_prontuario(prontuario, request, detalhe=True), status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def prontuario_detalhe_api(request, paciente_id):
    try:
        prontuario = Prontuario.objects.get(paciente_id=paciente_id)
    except Prontuario.DoesNotExist:
        return Response({"error": "Prontuário não encontrado"}, status=404)

    tipo = get_tipo_usuario(request.user)
    eh_proprio_paciente = (tipo == 'paciente' and request.user.id == paciente_id)
    pode_ler = _pode_editar_prontuario(request.user) or eh_proprio_paciente

    if not pode_ler:
        return Response({"error": "Acesso negado"}, status=403)

    if request.method == 'GET':
        return Response(_serializar_prontuario(prontuario, request, detalhe=True))

    elif request.method == 'PATCH':
        if not _pode_editar_prontuario(request.user):
            return Response({"error": "Acesso negado"}, status=403)
        d = request.data
        mapa = {
            'alergias': 'alergias', 'medicamentosEmUso': 'medicamentos_em_uso',
            'doencasSistemicas': 'doencas_sistemicas', 'observacoes': 'observacoes',
        }
        for campo_json, campo_model in mapa.items():
            if campo_json in d:
                setattr(prontuario, campo_model, d[campo_json])
        if 'medicoPreferencialId' in d:
            try:
                prontuario.medico_preferencial = User.objects.get(id=d['medicoPreferencialId'])
            except User.DoesNotExist:
                pass
        prontuario.atualizado_por = request.user
        prontuario.save()
        return Response(_serializar_prontuario(prontuario, request, detalhe=True))

    elif request.method == 'DELETE':
        if tipo not in ['admin', 'admin_clinica']:
            return Response({"error": "Apenas admins podem apagar prontuários"}, status=403)
        prontuario.delete()
        return Response({"message": "Prontuário apagado"})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def prontuario_adicionar_procedimento_api(request, paciente_id):
    if not _pode_editar_prontuario(request.user):
        return Response({"error": "Acesso negado"}, status=403)
    try:
        prontuario = Prontuario.objects.get(paciente_id=paciente_id)
    except Prontuario.DoesNotExist:
        return Response({"error": "Prontuário não encontrado"}, status=404)
    d = request.data
    if not d.get('tipo') or not d.get('data'):
        return Response({"error": "tipo e data são obrigatórios"}, status=400)
    proc = ProcedimentoDentario.objects.create(
        prontuario=prontuario, tipo=d['tipo'],
        dente=d.get('dente', ''), descricao=d.get('descricao', ''),
        data=d['data'], medico=request.user,
        consulta_id=d.get('consultaId') or None,
    )
    proc.refresh_from_db()
    return Response({
        "id": proc.id, "tipo": proc.tipo, "tipoLabel": proc.get_tipo_display(),
        "dente": proc.dente, "descricao": proc.descricao,
        "data": proc.data.strftime("%Y-%m-%d"),
        "medico": request.user.get_full_name() or request.user.username,
    }, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def prontuario_remover_procedimento_api(request, procedimento_id):
    if not _pode_editar_prontuario(request.user):
        return Response({"error": "Acesso negado"}, status=403)
    try:
        ProcedimentoDentario.objects.get(id=procedimento_id).delete()
        return Response({"message": "Procedimento removido"})
    except ProcedimentoDentario.DoesNotExist:
        return Response({"error": "Procedimento não encontrado"}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def prontuario_adicionar_anexo_api(request, paciente_id):
    if not _pode_editar_prontuario(request.user):
        return Response({"error": "Acesso negado"}, status=403)
    try:
        prontuario = Prontuario.objects.get(paciente_id=paciente_id)
    except Prontuario.DoesNotExist:
        return Response({"error": "Prontuário não encontrado"}, status=404)
    arquivo = request.FILES.get('arquivo')
    titulo = request.data.get('titulo', '').strip()
    tipo = request.data.get('tipo', 'outro')
    data_exame = request.data.get('dataExame')
    if not arquivo:
        return Response({"error": "Nenhum ficheiro enviado"}, status=400)
    if not titulo:
        return Response({"error": "titulo é obrigatório"}, status=400)
    if not data_exame:
        return Response({"error": "dataExame é obrigatório"}, status=400)
    ext = os.path.splitext(arquivo.name)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.pdf']:
        return Response({"error": "Apenas JPG, PNG, WEBP ou PDF"}, status=400)
    anexo = AnexoProntuario.objects.create(
        prontuario=prontuario, tipo=tipo, titulo=titulo, arquivo=arquivo,
        descricao=request.data.get('descricao', ''),
        data_exame=data_exame, adicionado_por=request.user,
    )
    return Response({
        "id": anexo.id, "tipo": anexo.tipo, "tipoLabel": anexo.get_tipo_display(),
        "titulo": anexo.titulo,
        "dataExame": anexo.data_exame.strftime("%Y-%m-%d"),
        "url": request.build_absolute_uri(anexo.arquivo.url),
    }, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def prontuario_remover_anexo_api(request, anexo_id):
    if not _pode_editar_prontuario(request.user):
        return Response({"error": "Acesso negado"}, status=403)
    try:
        anexo = AnexoProntuario.objects.get(id=anexo_id)
        if default_storage.exists(anexo.arquivo.name):
            default_storage.delete(anexo.arquivo.name)
        anexo.delete()
        return Response({"message": "Anexo removido"})
    except AnexoProntuario.DoesNotExist:
        return Response({"error": "Anexo não encontrado"}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def meu_prontuario_api(request):
    if get_tipo_usuario(request.user) != 'paciente':
        return Response({"error": "Endpoint exclusivo para pacientes"}, status=403)
    try:
        p = Prontuario.objects.get(paciente=request.user)
        return Response(_serializar_prontuario(p, request, detalhe=True))
    except Prontuario.DoesNotExist:
        return Response({"error": "Prontuário ainda não criado"}, status=404)


# ============================================
# PARTILHA DE PRONTUÁRIO (integrada com mensagens)
# ============================================

def _serializar_partilha(p):
    return {
        "id": p.id,
        "prontuarioId": p.prontuario.id,
        "pacienteNome": p.prontuario.paciente.get_full_name() or p.prontuario.paciente.username,
        "pacienteId": p.prontuario.paciente.id,
        "escopo": p.escopo,
        "tipo": p.tipo,
        "tipoLabel": p.get_tipo_display(),
        "estado": p.estado,
        "estadoLabel": p.get_estado_display(),
        "mensagem": p.mensagem,
        "resposta": p.resposta,
        "enviadoPor": p.enviado_por.get_full_name() or p.enviado_por.username if p.enviado_por else "—",
        "clinicaOrigem": p.clinica_origem.nome if p.clinica_origem else "—",
        "clinicaOrigemId": p.clinica_origem.id if p.clinica_origem else None,
        "clinicaDestino": p.clinica_destino.nome if p.clinica_destino else None,
        "clinicaDestinoId": p.clinica_destino.id if p.clinica_destino else None,
        "medicoDestino": p.medico_destino.get_full_name() or p.medico_destino.username if p.medico_destino else None,
        "medicoDestinoId": p.medico_destino.id if p.medico_destino else None,
        "medicoResponsavelDestino": (
            p.medico_responsavel_destino.get_full_name() or p.medico_responsavel_destino.username
            if p.medico_responsavel_destino else None
        ),
        "conversaId": p.conversa.id if p.conversa else None,
        "criadoEm": p.criado_em.strftime("%Y-%m-%d %H:%M"),
        "atualizadoEm": p.atualizado_em.strftime("%Y-%m-%d %H:%M"),
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def partilhas_api(request):
    tipo_user = get_tipo_usuario(request.user)
    if tipo_user not in ['medico', 'admin', 'admin_clinica']:
        return Response({"error": "Acesso negado"}, status=403)

    minha_clinica = _get_clinica_do_user(request.user)

    if request.method == 'GET':
        if tipo_user == 'medico':
            qs = PartilhaProntuario.objects.filter(
                models.Q(enviado_por=request.user) |
                models.Q(medico_destino=request.user) |
                models.Q(medico_responsavel_destino=request.user)
            )
        else:
            qs = PartilhaProntuario.objects.filter(
                models.Q(clinica_origem=minha_clinica) |
                models.Q(clinica_destino=minha_clinica)
            )
        qs = qs.select_related(
            'prontuario__paciente', 'enviado_por',
            'clinica_origem', 'clinica_destino',
            'medico_destino', 'medico_responsavel_destino'
        )
        return Response([_serializar_partilha(p) for p in qs])

    elif request.method == 'POST':
        d = request.data
        prontuario_id = d.get('prontuarioId')
        escopo = d.get('escopo')
        tipo = d.get('tipo')
        mensagem = d.get('mensagem', '')

        if not all([prontuario_id, escopo, tipo]):
            return Response({"error": "prontuarioId, escopo e tipo são obrigatórios"}, status=400)

        try:
            prontuario = Prontuario.objects.get(id=prontuario_id)
        except Prontuario.DoesNotExist:
            return Response({"error": "Prontuário não encontrado"}, status=404)

        paciente_nome = prontuario.paciente.get_full_name() or prontuario.paciente.username

        partilha_data = {
            "prontuario": prontuario,
            "enviado_por": request.user,
            "clinica_origem": minha_clinica,
            "escopo": escopo,
            "tipo": tipo,
            "mensagem": mensagem,
        }

        destinatario = None  # para criar a conversa

        if escopo == 'interna':
            medico_destino_id = d.get('medicoDestinoId')
            if not medico_destino_id:
                return Response({"error": "medicoDestinoId é obrigatório"}, status=400)
            try:
                medico_destino = User.objects.get(id=medico_destino_id)
            except User.DoesNotExist:
                return Response({"error": "Médico destino não encontrado"}, status=404)
            if _get_clinica_do_user(medico_destino) != minha_clinica:
                return Response({"error": "Médico não pertence à mesma clínica"}, status=400)

            partilha_data["medico_destino"] = medico_destino
            partilha_data["clinica_destino"] = minha_clinica
            partilha_data["estado"] = "aceite"
            partilha_data["medico_responsavel_destino"] = medico_destino
            destinatario = medico_destino

        elif escopo == 'externa':
            clinica_destino_id = d.get('clinicaDestinoId')
            if not clinica_destino_id:
                return Response({"error": "clinicaDestinoId é obrigatório"}, status=400)
            try:
                clinica_destino = Clinica.objects.get(id=clinica_destino_id)
            except Clinica.DoesNotExist:
                return Response({"error": "Clínica destino não encontrada"}, status=404)
            if clinica_destino == minha_clinica:
                return Response({"error": "Clínica destino deve ser diferente da origem"}, status=400)

            partilha_data["clinica_destino"] = clinica_destino
            partilha_data["estado"] = "pendente"

            # Encontrar admin da clínica destino para a conversa
            perfil_admin_destino = Perfil.objects.filter(
                tipo='admin_clinica', clinica_vinculada=clinica_destino
            ).first()
            if perfil_admin_destino:
                destinatario = perfil_admin_destino.user
        else:
            return Response({"error": "escopo inválido"}, status=400)

        # Criar partilha
        partilha = PartilhaProntuario.objects.create(**partilha_data)

        # Criar/reutilizar conversa automaticamente e enviar mensagem do sistema
        if destinatario:
            conversa = _abrir_ou_reutilizar_conversa(request.user, destinatario)
            tipo_label = "Transferência" if tipo == 'transferencia' else "Segunda Opinião"
            remetente_nome = request.user.get_full_name() or request.user.username
            clinica_origem_nome = minha_clinica.nome if minha_clinica else "—"
            corpo = (
                f"📋 Novo pedido de {tipo_label} — Partilha #{partilha.id}\n"
                f"Paciente: {paciente_nome}\n"
                f"De: {remetente_nome} ({clinica_origem_nome})\n"
            )
            if mensagem:
                corpo += f"Mensagem: {mensagem}"
            _mensagem_sistema(conversa, corpo)
            partilha.conversa = conversa
            partilha.save()

        return Response(_serializar_partilha(partilha), status=201)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def partilha_responder_api(request, partilha_id):
    try:
        partilha = PartilhaProntuario.objects.get(id=partilha_id)
    except PartilhaProntuario.DoesNotExist:
        return Response({"error": "Partilha não encontrada"}, status=404)

    minha_clinica = _get_clinica_do_user(request.user)
    if partilha.clinica_destino != minha_clinica:
        return Response({"error": "Acesso negado"}, status=403)
    if partilha.estado != 'pendente':
        return Response({"error": f"Partilha já foi {partilha.estado}"}, status=400)

    d = request.data
    acao = d.get('acao')
    if acao not in ['aceitar', 'recusar']:
        return Response({"error": "acao deve ser 'aceitar' ou 'recusar'"}, status=400)

    partilha.resposta = d.get('resposta', '')

    if acao == 'recusar':
        partilha.estado = 'recusado'
        # Notificar na conversa
        if partilha.conversa and partilha.enviado_por:
            _mensagem_sistema(
                partilha.conversa,
                f"❌ Pedido de partilha #{partilha.id} foi recusado por {minha_clinica.nome if minha_clinica else '—'}."
                + (f"\nMotivo: {partilha.resposta}" if partilha.resposta else "")
            )

    elif acao == 'aceitar':
        medico_responsavel_id = d.get('medicoResponsavelId')
        if not medico_responsavel_id:
            return Response({"error": "medicoResponsavelId é obrigatório ao aceitar"}, status=400)
        try:
            medico = User.objects.get(id=medico_responsavel_id)
        except User.DoesNotExist:
            return Response({"error": "Médico não encontrado"}, status=404)
        if _get_clinica_do_user(medico) != minha_clinica:
            return Response({"error": "Médico não pertence à clínica destino"}, status=400)

        partilha.estado = 'aceite'
        partilha.medico_responsavel_destino = medico

        if partilha.tipo == 'transferencia':
            partilha.prontuario.medico_preferencial = medico
            partilha.prontuario.save()

        # Adicionar médico responsável à conversa e notificar
        if partilha.conversa:
            partilha.conversa.participantes.add(medico)
            medico_nome = medico.get_full_name() or medico.username
            _mensagem_sistema(
                partilha.conversa,
                f"✅ Pedido de partilha #{partilha.id} aceite por {minha_clinica.nome if minha_clinica else '—'}.\n"
                f"Médico responsável: Dr(a). {medico_nome}"
            )

    partilha.save()
    return Response(_serializar_partilha(partilha))


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def partilha_concluir_api(request, partilha_id):
    try:
        partilha = PartilhaProntuario.objects.get(id=partilha_id)
    except PartilhaProntuario.DoesNotExist:
        return Response({"error": "Partilha não encontrada"}, status=404)

    if partilha.medico_responsavel_destino != request.user:
        return Response({"error": "Apenas o médico responsável pode concluir"}, status=403)
    if partilha.estado != 'aceite':
        return Response({"error": "Partilha não está aceite"}, status=400)

    partilha.estado = 'concluido'
    partilha.save()

    if partilha.conversa:
        _mensagem_sistema(
            partilha.conversa,
            f"✔️ Partilha #{partilha.id} concluída por Dr(a). {request.user.get_full_name() or request.user.username}."
        )

    return Response(_serializar_partilha(partilha))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def partilha_prontuario_ver_api(request, partilha_id):
    try:
        partilha = PartilhaProntuario.objects.get(id=partilha_id)
    except PartilhaProntuario.DoesNotExist:
        return Response({"error": "Partilha não encontrada"}, status=404)

    if partilha.estado not in ['aceite', 'concluido']:
        return Response({"error": "Partilha ainda não foi aceite"}, status=403)

    minha_clinica = _get_clinica_do_user(request.user)
    eh_responsavel = partilha.medico_responsavel_destino == request.user
    eh_admin_destino = (
        get_tipo_usuario(request.user) in ['admin_clinica', 'admin']
        and minha_clinica == partilha.clinica_destino
    )

    if not (eh_responsavel or eh_admin_destino):
        return Response({"error": "Acesso negado"}, status=403)

    prontuario_data = _serializar_prontuario(partilha.prontuario, request, detalhe=True)
    prontuario_data["_permissoes"] = {
        "podeAdicionarProcedimentos": partilha.tipo == 'transferencia',
        "podeAdicionarNotas": True,
        "podeAdicionarAnexos": True,
        "tipo": partilha.tipo,
        "partilhaId": partilha.id,
    }
    return Response(prontuario_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def clinicas_lista_api(request):
    """Lista clínicas do sistema (para selects de partilha)."""
    tipo_user = get_tipo_usuario(request.user)
    if tipo_user not in ['medico', 'admin', 'admin_clinica']:
        return Response({"error": "Acesso negado"}, status=403)
    minha_clinica = _get_clinica_do_user(request.user)
    clinicas = Clinica.objects.exclude(id=minha_clinica.id if minha_clinica else None)
    return Response([{"id": c.id, "nome": c.nome, "telefone": c.telefone or ""} for c in clinicas])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def medicos_da_clinica_api(request):
    """Lista médicos da mesma clínica."""
    tipo_user = get_tipo_usuario(request.user)
    if tipo_user not in ['medico', 'admin', 'admin_clinica']:
        return Response({"error": "Acesso negado"}, status=403)
    minha_clinica = _get_clinica_do_user(request.user)
    medicos_ids = Perfil.objects.filter(
        tipo='medico', clinica_vinculada=minha_clinica
    ).exclude(user=request.user).values_list('user_id', flat=True)
    medicos = User.objects.filter(id__in=medicos_ids)
    return Response([{"id": m.id, "nome": m.get_full_name() or m.username} for m in medicos])


# ============================================
# STATS & DASHBOARD
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats_api(request):
    tipo = get_tipo_usuario(request.user)
    hoje = date.today()
    inicio_mes = hoje.replace(day=1)

    if tipo == 'admin':
        faturamento = Consulta.objects.filter(
            data__gte=inicio_mes, status='concluida', valor__isnull=False
        ).aggregate(total=Sum('valor'))['total'] or 0
        consultas_mes = Consulta.objects.filter(data__gte=inicio_mes).count()
        return Response({
            "totalClinicas": Clinica.objects.count(),
            "clinicasAtivas": Clinica.objects.filter(status='ativa').count(),
            "totalMedicos": Perfil.objects.filter(tipo='medico').count(),
            "totalPacientes": Perfil.objects.filter(tipo='paciente').count(),
            "consultasHoje": Consulta.objects.filter(data=hoje).count(),
            "consultasMes": consultas_mes,
            "faturamentoMes": float(faturamento),
            "ticketMedio": float(faturamento / consultas_mes) if consultas_mes > 0 else 0,
            "crescimento": 0,
        })

    elif tipo == 'admin_clinica':
        minha_clinica = get_minha_clinica(request.user)
        if not minha_clinica:
            return Response({"totalClinicas": 0, "clinicasAtivas": 0, "totalMedicos": 0,
                             "totalPacientes": 0, "consultasHoje": 0, "consultasMes": 0,
                             "faturamentoMes": 0, "ticketMedio": 0, "crescimento": 0})
        medicos_ids = Perfil.objects.filter(tipo='medico', clinica_vinculada=minha_clinica).values_list('user_id', flat=True)
        total_pacientes = Consulta.objects.filter(medico_id__in=medicos_ids).values('paciente_id').distinct().count()
        consultas_mes = Consulta.objects.filter(medico_id__in=medicos_ids, data__gte=inicio_mes).count()
        faturamento = Consulta.objects.filter(
            medico_id__in=medicos_ids, data__gte=inicio_mes, status='concluida', valor__isnull=False
        ).aggregate(total=Sum('valor'))['total'] or 0
        return Response({
            "totalClinicas": 1,
            "clinicasAtivas": 1 if minha_clinica.status == 'ativa' else 0,
            "totalMedicos": len(medicos_ids),
            "totalPacientes": total_pacientes,
            "consultasHoje": Consulta.objects.filter(medico_id__in=medicos_ids, data=hoje).count(),
            "consultasMes": consultas_mes,
            "faturamentoMes": float(faturamento),
            "ticketMedio": float(faturamento / consultas_mes) if consultas_mes > 0 else 0,
            "crescimento": 0,
        })

    return Response({"error": "Acesso negado"}, status=403)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notificacoes_api(request):
    tipo = get_tipo_usuario(request.user)
    if tipo not in ['admin', 'admin_clinica']:
        return Response([])
    hoje = date.today()
    notificacoes = []
    if tipo == 'admin':
        consultas_hoje = Consulta.objects.filter(data=hoje).count()
        if consultas_hoje > 0:
            notificacoes.append({"id": 1, "tipo": "info", "titulo": "Consultas hoje",
                                  "mensagem": f"{consultas_hoje} consultas agendadas para hoje",
                                  "data": datetime.now().isoformat(), "lida": False})
        sem_medicos = [c.nome for c in Clinica.objects.filter(status='ativa')
                       if Perfil.objects.filter(tipo='medico', clinica_vinculada=c).count() == 0]
        if sem_medicos:
            notificacoes.append({"id": 2, "tipo": "warning", "titulo": "Clínicas sem médicos",
                                  "mensagem": f"{len(sem_medicos)} clínica(s) precisam de médicos",
                                  "data": datetime.now().isoformat(), "lida": False})
    else:
        minha_clinica = get_minha_clinica(request.user)
        if minha_clinica:
            medicos_ids = Perfil.objects.filter(tipo='medico', clinica_vinculada=minha_clinica).values_list('user_id', flat=True)
            consultas_hoje = Consulta.objects.filter(medico_id__in=medicos_ids, data=hoje).count()
            if consultas_hoje > 0:
                notificacoes.append({"id": 1, "tipo": "info", "titulo": "Agenda de hoje",
                                      "mensagem": f"{consultas_hoje} consultas na sua clínica hoje",
                                      "data": datetime.now().isoformat(), "lida": False})
    return Response(notificacoes)


# ============================================
# PACIENTE
# ============================================

def _consultas_do_paciente(user):
    """Lógica pura — sem decorators DRF."""
    consultas = Consulta.objects.filter(paciente=user).select_related('medico').order_by('-data', '-hora')
    return [_serializar_consulta(c) for c in consultas]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def minhas_consultas_paciente_api(request):
    return Response(_consultas_do_paciente(request.user))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def consultas_paciente_api(request):
    return Response(_consultas_do_paciente(request.user))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agendar_consulta_paciente_api(request):
    dados = request.data
    medico_id = dados.get('medicoId')
    data_str = dados.get('data')
    hora_str = dados.get('hora')
    motivo = dados.get('motivo', '')
    if not all([medico_id, data_str, hora_str]):
        return Response({"error": "medicoId, data e hora são obrigatórios"}, status=400)
    if Consulta.objects.filter(medico_id=medico_id, data=data_str, hora=hora_str).exists():
        return Response({"error": "Horário já ocupado"}, status=409)
    c = Consulta.objects.create(
        paciente=request.user, medico_id=medico_id,
        data=data_str, hora=hora_str, motivo=motivo, status='agendada'
    )
    return Response({"success": True, "consultaId": c.id, "message": "Consulta agendada"}, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cancelar_consulta_paciente_api(request, consulta_id):
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
    if get_tipo_usuario(request.user) != 'medico':
        return Response({"error": "Acesso negado"}, status=403)
    data_param = request.query_params.get('data')
    qs = Consulta.objects.filter(medico=request.user)
    if data_param:
        qs = qs.filter(data=data_param)
    return Response([_serializar_consulta(c) for c in qs.select_related('paciente').order_by('data', 'hora')])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pacientes_medico_api(request):
    if get_tipo_usuario(request.user) != 'medico':
        return Response({"error": "Acesso negado"}, status=403)
    pacientes_ids = Consulta.objects.filter(medico=request.user).values_list('paciente_id', flat=True).distinct()
    users = User.objects.filter(id__in=pacientes_ids)
    data = []
    for u in users:
        ultima = Consulta.objects.filter(medico=request.user, paciente=u).order_by('-data').first()
        telefone = ""
        try:
            telefone = Perfil.objects.get(user=u).telefone or ""
        except Perfil.DoesNotExist:
            pass
        data.append({
            "id": u.id, "nome": u.get_full_name() or u.username,
            "email": u.email or "", "telefone": telefone,
            "ultimaConsulta": ultima.data.strftime("%Y-%m-%d") if ultima else None,
            "totalConsultas": Consulta.objects.filter(medico=request.user, paciente=u).count(),
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def horarios_medico_api(request):
    if get_tipo_usuario(request.user) != 'medico':
        return Response({"error": "Acesso negado"}, status=403)
    data_str = request.query_params.get('data', date.today().strftime('%Y-%m-%d'))
    HORARIOS = ["08:00","08:30","09:00","09:30","10:00","10:30",
                "11:00","11:30","14:00","14:30","15:00","15:30",
                "16:00","16:30","17:00","17:30"]
    ocupados = Consulta.objects.filter(medico=request.user, data=data_str).values_list('hora', flat=True)
    ocupados_str = [h.strftime('%H:%M') if hasattr(h, 'strftime') else str(h)[:5] for h in ocupados]
    return Response({
        "data": data_str,
        "ocupados": ocupados_str,
        "disponiveis": [h for h in HORARIOS if h not in ocupados_str],
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def salvar_descricao_consulta_api(request, consulta_id):
    if get_tipo_usuario(request.user) != 'medico':
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
    tipo = get_tipo_usuario(request.user)
    try:
        c = Consulta.objects.get(id=consulta_id)
    except Consulta.DoesNotExist:
        return Response({"error": "Consulta não encontrada"}, status=404)

    pode_alterar = (
        tipo == 'admin' or
        (tipo == 'medico' and c.medico == request.user) or
        (tipo == 'admin_clinica' and c.medico and
         get_clinica_do_medico(c.medico) == get_minha_clinica(request.user))
    )
    if not pode_alterar:
        return Response({"error": "Acesso negado"}, status=403)

    novo_status = request.data.get('status')
    if novo_status not in ['agendada', 'confirmada', 'concluida', 'cancelada']:
        return Response({"error": "Status inválido"}, status=400)
    c.status = novo_status
    c.save()
    return Response({"message": f"Consulta {novo_status}", "consultaId": c.id, "novoStatus": novo_status})


# ============================================
# PÚBLICO
# ============================================

@api_view(['GET'])
@permission_classes([AllowAny])
def listar_clinicas_publico_api(request):
    clinicas = Clinica.objects.filter(status='ativa')
    return Response([{
        "id": c.id, "nome": c.nome, "endereco": c.endereco or "",
        "telefone": c.telefone or "", "email": c.email or "",
        "totalMedicos": Perfil.objects.filter(tipo='medico', clinica_vinculada=c).count(),
    } for c in clinicas])


@api_view(['GET'])
@permission_classes([AllowAny])
def medicos_por_clinica_api(request, clinica_id):
    try:
        clinica = Clinica.objects.get(id=clinica_id, status='ativa')
    except Clinica.DoesNotExist:
        return Response({"error": "Clínica não encontrada"}, status=404)
    medicos = Perfil.objects.filter(tipo='medico', clinica_vinculada=clinica, ativo=True).select_related('user')
    return Response([{
        "id": p.user.id, "nome": p.user.get_full_name() or p.user.username,
        "especialidade": p.especialidade or 'Geral', "crm": p.crm or "",
    } for p in medicos])


@api_view(['GET'])
@permission_classes([AllowAny])
def horarios_disponiveis_api(request):
    medico_id = request.query_params.get('medico_id')
    data_str = request.query_params.get('data')
    if not medico_id or not data_str:
        return Response({"error": "medico_id e data são obrigatórios"}, status=400)
    try:
        data_consulta = datetime.strptime(data_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({"error": "Formato de data inválido. Use YYYY-MM-DD"}, status=400)
    HORARIOS = ["08:00","08:30","09:00","09:30","10:00","10:30",
                "11:00","11:30","14:00","14:30","15:00","15:30",
                "16:00","16:30","17:00","17:30"]
    ocupados = Consulta.objects.filter(
        medico_id=medico_id, data=data_consulta, status__in=['agendada', 'confirmada']
    ).values_list('hora', flat=True)
    ocupados_str = [h.strftime('%H:%M') for h in ocupados]
    return Response({
        "data": data_str, "medico_id": medico_id,
        "horariosDisponiveis": [h for h in HORARIOS if h not in ocupados_str and data_consulta >= date.today()],
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def agendamento_rapido_api(request):
    dados = request.data
    clinica_id = dados.get('clinicaId')
    medico_id  = dados.get('medicoId')
    data       = dados.get('data')
    hora       = dados.get('hora')
    nome       = dados.get('nome', '').strip()
    telefone   = dados.get('telefone', '').strip()
    email      = dados.get('email', '').strip()
    motivo     = dados.get('motivo', '')

    if not all([clinica_id, data, hora, nome, telefone]):
        return Response({"error": "clinicaId, data, hora, nome e telefone são obrigatórios"}, status=400)

    try:
        clinica = Clinica.objects.get(id=clinica_id)
    except Clinica.DoesNotExist:
        return Response({"error": "Clínica não encontrada"}, status=404)

    medico = None
    if medico_id:
        try:
            perfil_medico = Perfil.objects.get(user_id=medico_id, tipo='medico')
            if perfil_medico.clinica_vinculada_id != int(clinica_id):
                return Response({"error": "Médico não pertence à clínica"}, status=400)
            medico = perfil_medico.user
        except Perfil.DoesNotExist:
            return Response({"error": "Médico não encontrado"}, status=404)

    paciente = None
    if email and User.objects.filter(email=email).exists():
        paciente = User.objects.get(email=email)
        if paciente.first_name != nome:
            paciente.first_name = nome
            paciente.save()
    else:
        username = f"pac_{nome.lower().replace(' ', '_')}_{datetime.now().strftime('%H%M%S')}"
        senha = secrets.token_urlsafe(8)
        paciente = User.objects.create_user(
            username=username,
            email=email or f"{username}@sem-email.local",
            first_name=nome, password=senha
        )

    Perfil.objects.get_or_create(user=paciente, defaults={'tipo': 'paciente', 'telefone': telefone})

    try:
        consulta = Consulta.objects.create(
            paciente=paciente, medico=medico,
            data=data, hora=hora, motivo=motivo, status='agendada'
        )
        return Response({
            "success": True, "message": "Consulta agendada com sucesso!",
            "consultaId": consulta.id,
            "paciente": {"id": paciente.id, "nome": nome, "username": paciente.username},
        }, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def cadastro_clinica_api(request):
    dados = request.data
    nome = dados.get('nome')
    email = dados.get('email')
    telefone = dados.get('telefone')
    senha = dados.get('senha')
    if not all([nome, email, telefone, senha]):
        return Response({"error": "Nome, email, telefone e senha são obrigatórios"}, status=400)
    if Clinica.objects.filter(email=email).exists():
        return Response({"error": "Email já cadastrado"}, status=400)
    try:
        clinica = Clinica.objects.create(
            nome=nome, email=email, telefone=telefone,
            endereco=dados.get('endereco', ''), NIF=dados.get('NIF', ''), status='ativa'
        )
        username = nome.lower().replace(' ', '_').replace('-', '_')
        base, n = username, 1
        while User.objects.filter(username=username).exists():
            username = f"{base}_{n}"; n += 1
        user = User.objects.create_user(username=username, email=email, password=senha, first_name=nome)
        Perfil.objects.create(user=user, tipo='admin_clinica', clinica_vinculada=clinica, telefone=telefone)
        clinica.admin = user
        clinica.save()
        return Response({"success": True, "message": "Clínica cadastrada!",
                         "clínica": {"id": clinica.id, "nome": nome, "username": username, "email": email}}, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def listar_medicos_publico_api(request):
    medicos = Perfil.objects.filter(tipo='medico', ativo=True).select_related('user', 'clinica_vinculada')
    return Response([{
        "id": p.user.id, "nome": p.user.get_full_name() or p.user.username,
        "especialidade": p.especialidade or "Geral", "crm": p.crm or "",
        "clinica": p.clinica_vinculada.nome if p.clinica_vinculada else "—",
    } for p in medicos])


# ============================================
# DASHBOARD CLÍNICA
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def consultas_clinica_api(request):
    if get_tipo_usuario(request.user) != 'admin_clinica':
        return Response({"error": "Acesso negado"}, status=403)
    minha_clinica = get_minha_clinica(request.user)
    if not minha_clinica:
        return Response([])
    medicos_ids = Perfil.objects.filter(tipo='medico', clinica_vinculada=minha_clinica).values_list('user_id', flat=True)
    consultas = Consulta.objects.filter(medico_id__in=medicos_ids).select_related('paciente', 'medico').order_by('-data', '-hora')
    data = []
    for c in consultas:
        telefone_paciente = ""
        try:
            telefone_paciente = Perfil.objects.get(user=c.paciente).telefone or ""
        except Perfil.DoesNotExist:
            pass
        data.append({
            "id": c.id,
            "paciente": c.paciente.get_full_name() or c.paciente.username,
            "pacienteTelefone": telefone_paciente,
            "medico": c.medico.get_full_name() or c.medico.username if c.medico else "Não atribuído",
            "data": c.data.strftime('%d/%m/%Y'),
            "hora": c.hora.strftime('%H:%M') if hasattr(c.hora, 'strftime') else str(c.hora),
            "status": c.status, "motivo": c.motivo or "",
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def clinica_stats_api(request):
    if not is_admin_clinica(request.user):
        return Response({"error": "Acesso negado"}, status=403)
    minha_clinica = get_minha_clinica(request.user)
    if not minha_clinica:
        return Response({"error": "Clínica não encontrada"}, status=404)
    hoje = date.today()
    inicio_mes = hoje.replace(day=1)
    medicos_ids = Perfil.objects.filter(tipo='medico', clinica_vinculada=minha_clinica).values_list('user_id', flat=True)
    consultas_mes = Consulta.objects.filter(medico_id__in=medicos_ids, data__gte=inicio_mes).count()
    faturamento = Consulta.objects.filter(
        medico_id__in=medicos_ids, data__gte=inicio_mes, status='concluida', valor__isnull=False
    ).aggregate(total=Sum('valor'))['total'] or 0
    return Response({
        "clinica": {"id": minha_clinica.id, "nome": minha_clinica.nome, "status": minha_clinica.status},
        "totalMedicos": len(medicos_ids),
        "totalPacientes": Consulta.objects.filter(medico_id__in=medicos_ids).values('paciente_id').distinct().count(),
        "consultasHoje": Consulta.objects.filter(medico_id__in=medicos_ids, data=hoje).count(),
        "consultasMes": consultas_mes,
        "consultasPendentes": Consulta.objects.filter(medico_id__in=medicos_ids, status='agendada').count(),
        "faturamentoMes": float(faturamento),
        "ticketMedio": float(faturamento / consultas_mes) if consultas_mes > 0 else 0,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def clinica_medicos_api(request):
    if not is_admin_clinica(request.user):
        return Response({"error": "Acesso negado"}, status=403)
    minha_clinica = get_minha_clinica(request.user)
    if not minha_clinica:
        return Response({"error": "Clínica não encontrada"}, status=404)

    if request.method == 'GET':
        perfis = Perfil.objects.filter(tipo='medico', clinica_vinculada=minha_clinica).select_related('user')
        data = []
        for p in perfis:
            data.append({
                "id": p.user.id, "username": p.user.username,
                "nome": p.user.get_full_name() or p.user.username,
                "email": p.user.email or "", "telefone": p.telefone or "",
                "especialidade": p.especialidade or "", "crm": p.crm or "",
                "status": "ativo" if p.ativo else "inativo",
                "totalConsultas": Consulta.objects.filter(medico=p.user).count(),
                "consultasMes": Consulta.objects.filter(medico=p.user, data__gte=date.today().replace(day=1)).count(),
                "ultimoAcesso": p.ultimo_acesso.strftime("%Y-%m-%d %H:%M") if p.ultimo_acesso else "—",
            })
        return Response(data)

    elif request.method == 'POST':
        dados = request.data
        username = dados.get('username', '').strip()
        password = dados.get('password', '').strip()
        if not username or not password:
            return Response({"error": "Username e senha são obrigatórios"}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({"error": "Username já existe"}, status=400)
        user = User.objects.create_user(username=username, email=dados.get('email', ''), password=password)
        perfil, created = Perfil.objects.get_or_create(user=user, defaults={
            'tipo': 'medico', 'clinica_vinculada': minha_clinica,
            'especialidade': dados.get('especialidade', ''),
            'crm': dados.get('crm', ''), 'telefone': dados.get('telefone', ''),
        })
        if not created:
            perfil.tipo = 'medico'; perfil.clinica_vinculada = minha_clinica
            perfil.especialidade = dados.get('especialidade', '')
            perfil.crm = dados.get('crm', ''); perfil.telefone = dados.get('telefone', '')
            perfil.save()
        return Response({"message": "Médico criado", "id": user.id, "username": username}, status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def clinica_medico_detalhe_api(request, medico_id):
    if not is_admin_clinica(request.user):
        return Response({"error": "Acesso negado"}, status=403)
    minha_clinica = get_minha_clinica(request.user)
    try:
        perfil = Perfil.objects.get(user_id=medico_id, tipo='medico', clinica_vinculada=minha_clinica)
        user_alvo = perfil.user
    except Perfil.DoesNotExist:
        return Response({"error": "Médico não encontrado nesta clínica"}, status=404)

    if request.method == 'GET':
        return Response({
            "id": user_alvo.id, "username": user_alvo.username,
            "email": user_alvo.email or "", "telefone": perfil.telefone or "",
            "especialidade": perfil.especialidade or "", "crm": perfil.crm or "",
            "status": "ativo" if perfil.ativo else "inativo",
        })
    elif request.method == 'PATCH':
        dados = request.data
        for campo in ['email', 'first_name', 'last_name']:
            if campo in dados: setattr(user_alvo, campo, dados[campo])
        user_alvo.save()
        for campo in ['especialidade', 'crm', 'telefone']:
            if campo in dados: setattr(perfil, campo, dados[campo])
        if 'status' in dados: perfil.ativo = dados['status'] == 'ativo'
        perfil.save()
        return Response({"message": "Médico atualizado"})
    elif request.method == 'DELETE':
        perfil.clinica_vinculada = None; perfil.ativo = False; perfil.save()
        return Response({"message": "Médico removido da clínica"})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def clinica_pacientes_api(request):
    if not is_admin_clinica(request.user):
        return Response({"error": "Acesso negado"}, status=403)
    minha_clinica = get_minha_clinica(request.user)
    medicos_ids = Perfil.objects.filter(tipo='medico', clinica_vinculada=minha_clinica).values_list('user_id', flat=True)
    pacientes_ids = Consulta.objects.filter(medico_id__in=medicos_ids).values_list('paciente_id', flat=True).distinct()
    vistos = set()
    data = []
    for uid in pacientes_ids:
        if uid in vistos: continue
        vistos.add(uid)
        try:
            u = User.objects.get(id=uid)
            perfil = Perfil.objects.filter(user=u).first()
            ultima = Consulta.objects.filter(paciente=u, medico_id__in=medicos_ids).order_by('-data').first()
            data.append({
                "id": u.id, "nome": u.get_full_name() or u.username,
                "username": u.username, "email": u.email,
                "telefone": perfil.telefone if perfil else "",
                "ultimaConsulta": ultima.data.strftime("%Y-%m-%d") if ultima else None,
                "totalConsultas": Consulta.objects.filter(paciente=u, medico_id__in=medicos_ids).count(),
            })
        except User.DoesNotExist:
            continue
    return Response(data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def clinica_consultas_gestao_api(request):
    if not is_admin_clinica(request.user):
        return Response({"error": "Acesso negado"}, status=403)
    minha_clinica = get_minha_clinica(request.user)
    if not minha_clinica:
        return Response({"error": "Clínica não encontrada"}, status=404)
    medicos_ids = Perfil.objects.filter(tipo='medico', clinica_vinculada=minha_clinica).values_list('user_id', flat=True)

    if request.method == 'GET':
        qs = Consulta.objects.filter(medico_id__in=medicos_ids).select_related('paciente', 'medico').order_by('-data', '-hora')
        return Response([_serializar_consulta(c) for c in qs])

    elif request.method == 'POST':
        dados = request.data
        medico_id = dados.get('medico')
        paciente_id = dados.get('paciente')
        data_c = dados.get('data')
        hora_c = dados.get('hora')
        if not all([medico_id, paciente_id, data_c, hora_c]):
            return Response({"error": "medico, paciente, data e hora são obrigatórios"}, status=400)
        if int(medico_id) not in list(medicos_ids):
            return Response({"error": "Médico não pertence à sua clínica"}, status=403)
        if Consulta.objects.filter(medico_id=medico_id, data=data_c, hora=hora_c).exists():
            return Response({"error": "Horário já ocupado"}, status=409)
        consulta = Consulta.objects.create(
            paciente_id=paciente_id, medico_id=medico_id,
            data=data_c, hora=hora_c,
            motivo=dados.get('motivo', ''), valor=dados.get('valor'),
            status='agendada'
        )
        return Response({"message": "Consulta criada", "id": consulta.id}, status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def clinica_consulta_detalhe_api(request, consulta_id):
    if not is_admin_clinica(request.user):
        return Response({"error": "Acesso negado"}, status=403)
    minha_clinica = get_minha_clinica(request.user)
    medicos_ids = Perfil.objects.filter(tipo='medico', clinica_vinculada=minha_clinica).values_list('user_id', flat=True)
    try:
        consulta = Consulta.objects.get(id=consulta_id, medico_id__in=medicos_ids)
    except Consulta.DoesNotExist:
        return Response({"error": "Consulta não encontrada"}, status=404)
    if request.method == 'PATCH':
        novo_status = request.data.get('status')
        if novo_status not in ['agendada', 'confirmada', 'concluida', 'cancelada']:
            return Response({"error": "Status inválido"}, status=400)
        consulta.status = novo_status; consulta.save()
        return Response({"message": f"Consulta {novo_status}"})
    elif request.method == 'DELETE':
        consulta.status = 'cancelada'; consulta.save()
        return Response({"message": "Consulta cancelada"})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def clinica_medicos_lista_api(request):
    if not is_admin_clinica(request.user):
        return Response({"error": "Acesso negado"}, status=403)
    minha_clinica = get_minha_clinica(request.user)
    perfis = Perfil.objects.filter(tipo='medico', clinica_vinculada=minha_clinica, ativo=True).select_related('user')
    return Response([{"id": p.user.id, "nome": p.user.get_full_name() or p.user.username, "especialidade": p.especialidade or ""} for p in perfis])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def clinica_pacientes_lista_api(request):
    if not is_admin_clinica(request.user):
        return Response({"error": "Acesso negado"}, status=403)
    minha_clinica = get_minha_clinica(request.user)
    medicos_ids = Perfil.objects.filter(tipo='medico', clinica_vinculada=minha_clinica).values_list('user_id', flat=True)
    pacientes_ids = Consulta.objects.filter(medico_id__in=medicos_ids).values_list('paciente_id', flat=True).distinct()
    users = User.objects.filter(id__in=pacientes_ids)
    return Response([{"id": u.id, "nome": u.get_full_name() or u.username} for u in users])


# ============================================
# MENSAGENS
# ============================================

def _serializar_conversa(conversa, user):
    outra = conversa.participantes.exclude(id=user.id).first()
    ultima = conversa.mensagens.last()
    nao_lidas = conversa.mensagens.filter(lida=False).exclude(remetente=user).count()
    perfil_outro = Perfil.objects.filter(user=outra).first() if outra else None
    return {
        "id": conversa.id,
        "comId": outra.id if outra else None,
        "comNome": outra.get_full_name() or outra.username if outra else "—",
        "comTipo": perfil_outro.tipo if perfil_outro else "—",
        "comClinica": (
            perfil_outro.clinica_vinculada.nome
            if perfil_outro and perfil_outro.clinica_vinculada else "—"
        ),
        "ultimaMensagem": ultima.corpo[:60] if ultima else "",
        "ultimaData": ultima.criada_em.strftime("%Y-%m-%d %H:%M") if ultima else "",
        "naoLidas": nao_lidas,
    }


def _serializar_mensagem(m, user):
    return {
        "id": m.id,
        "remetenteId": m.remetente.id if m.remetente else None,
        "remetenteNome": m.remetente.get_full_name() or m.remetente.username if m.remetente else "Sistema",
        "minha": m.remetente_id == user.id if m.remetente else False,
        "sistema": m.remetente is None,
        "corpo": m.corpo,
        "lida": m.lida,
        "criadaEm": m.criada_em.strftime("%Y-%m-%d %H:%M"),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversas_api(request):
    """Lista todas as conversas do utilizador logado."""
    conversas = Conversa.objects.filter(
        participantes=request.user
    ).prefetch_related('participantes', 'mensagens')
    return Response([_serializar_conversa(c, request.user) for c in conversas])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def nova_conversa_api(request):
    """Inicia conversa com outro utilizador. Reutiliza se já existe."""
    destinatario_id = request.data.get('destinatarioId')
    primeira_mensagem = request.data.get('mensagem', '').strip()

    if not destinatario_id:
        return Response({"error": "destinatarioId é obrigatório"}, status=400)
    if not primeira_mensagem:
        return Response({"error": "mensagem é obrigatória"}, status=400)

    try:
        destinatario = User.objects.get(id=destinatario_id)
    except User.DoesNotExist:
        return Response({"error": "Utilizador não encontrado"}, status=404)

    if destinatario == request.user:
        return Response({"error": "Não pode enviar mensagem para si próprio"}, status=400)

    conversa = _abrir_ou_reutilizar_conversa(request.user, destinatario)

    Mensagem.objects.create(
        conversa=conversa, remetente=request.user, corpo=primeira_mensagem
    )
    conversa.save()

    return Response({"conversaId": conversa.id, **_serializar_conversa(conversa, request.user)}, status=201)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def conversa_detalhe_api(request, conversa_id):
    """
    GET  → lê mensagens e marca como lidas
    POST → envia nova mensagem
    """
    try:
        conversa = Conversa.objects.get(id=conversa_id, participantes=request.user)
    except Conversa.DoesNotExist:
        return Response({"error": "Conversa não encontrada"}, status=404)

    if request.method == 'GET':
        conversa.mensagens.filter(lida=False).exclude(remetente=request.user).update(lida=True)
        return Response([_serializar_mensagem(m, request.user) for m in conversa.mensagens.all()])

    elif request.method == 'POST':
        corpo = request.data.get('mensagem', '').strip()
        if not corpo:
            return Response({"error": "mensagem não pode estar vazia"}, status=400)
        msg = Mensagem.objects.create(conversa=conversa, remetente=request.user, corpo=corpo)
        conversa.save()
        return Response(_serializar_mensagem(msg, request.user), status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def contactos_api(request):
    """Lista utilizadores com quem o user pode iniciar conversa."""
    tipo = get_tipo_usuario(request.user)

    if tipo == 'paciente':
        medicos_ids = Consulta.objects.filter(
            paciente=request.user, medico__isnull=False
        ).values_list('medico_id', flat=True).distinct()
        clinicas_ids = Perfil.objects.filter(user_id__in=medicos_ids).values_list('clinica_vinculada_id', flat=True).distinct()
        admins_ids = Perfil.objects.filter(tipo='admin_clinica', clinica_vinculada_id__in=clinicas_ids).values_list('user_id', flat=True)
        ids = set(list(medicos_ids) + list(admins_ids))

    elif tipo == 'medico':
        pacientes_ids = Consulta.objects.filter(medico=request.user).values_list('paciente_id', flat=True).distinct()
        medicos_ids = Perfil.objects.filter(tipo='medico').exclude(user=request.user).values_list('user_id', flat=True)
        admins_ids = Perfil.objects.filter(tipo__in=['admin', 'admin_clinica']).values_list('user_id', flat=True)
        ids = set(list(pacientes_ids) + list(medicos_ids) + list(admins_ids))

    else:  # admin ou admin_clinica
        ids = set(User.objects.exclude(id=request.user.id).values_list('id', flat=True))

    users = User.objects.filter(id__in=ids)
    resultado = []
    for u in users:
        perfil = Perfil.objects.filter(user=u).first()
        resultado.append({
            "id": u.id,
            "nome": u.get_full_name() or u.username,
            "tipo": perfil.tipo if perfil else "—",
            "clinica": perfil.clinica_vinculada.nome if perfil and perfil.clinica_vinculada else "—",
        })
    return Response(resultado)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mensagens_nao_lidas_api(request):
    """Contagem de não lidas para o badge na sidebar."""
    total = Mensagem.objects.filter(
        conversa__participantes=request.user,
        lida=False
    ).exclude(remetente=request.user).count()
    return Response({"naoLidas": total})