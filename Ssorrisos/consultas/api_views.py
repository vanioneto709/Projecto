from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import Consulta, Perfil
from .serializers import ConsultaSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes
from rest_framework import status


# ----------------------------
# CADASTRO DE UTILIZADOR
# ----------------------------
@api_view(['POST'])
def cadastro_api(request):
    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")
    tipo = request.data.get("tipo", "paciente")

    if not username or not password:
        return Response(
            {"error": "Username e password são obrigatórios"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {"error": "Usuário já existe"},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password
    )

    # 🔥 cria perfil automaticamente
    Perfil.objects.create(user=user, tipo=tipo)

    return Response({"message": "Usuário criado com sucesso"})


# ----------------------------
# CONSULTAS DO PACIENTE
# ----------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def minhas_consultas_api(request):
    consultas = Consulta.objects.filter(paciente=request.user)

    serializer = ConsultaSerializer(consultas, many=True)
    return Response(serializer.data)


# ----------------------------
# DADOS DO UTILIZADOR LOGADO
# ----------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_api(request):
    try:
        perfil = Perfil.objects.get(user=request.user)
        tipo = perfil.tipo
    except Perfil.DoesNotExist:
        tipo = "paciente"

    return Response({
        "id": request.user.id,
        "username": request.user.username,
        "email": request.user.email,
        "tipo": tipo
    })


# ----------------------------
# LISTAR USUÁRIOS
# ----------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_usuarios_api(request):
    users = User.objects.all()

    data = []
    for u in users:
        try:
            perfil = Perfil.objects.get(user=u)
            tipo = perfil.tipo
        except Perfil.DoesNotExist:
            tipo = "paciente"

        data.append({
            "id": u.id,
            "username": u.username,
            "tipo": tipo
        })

    return Response(data)


# ----------------------------
# DELETAR USUÁRIO
# ----------------------------
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def deletar_usuario_api(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        user.delete()
        return Response({"message": "Usuário deletado"})
    except User.DoesNotExist:
        return Response({"error": "Não encontrado"}, status=404)


# ----------------------------
# CRIAR CONSULTA
# ----------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def criar_consulta_api(request):
    paciente_id = request.data.get("paciente")
    medico_id = request.data.get("medico")
    data = request.data.get("data")
    hora = request.data.get("hora")
    motivo = request.data.get("motivo")

    consulta = Consulta.objects.create(
        paciente_id=paciente_id,
        medico_id=medico_id,
        data=data,
        hora=hora,
        motivo=motivo
    )

    return Response({"message": "Consulta criada"})