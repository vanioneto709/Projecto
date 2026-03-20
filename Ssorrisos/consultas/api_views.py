from rest_framework.decorators import api_view
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

    return Response({
        "message": "Usuário criado com sucesso"
    })


# ----------------------------
# CONSULTAS DO PACIENTE
# ----------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def minhas_consultas_api(request):

    consultas = Consulta.objects.filter(paciente=request.user)

    serializer = ConsultaSerializer(
        consultas,
        many=True
    )

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