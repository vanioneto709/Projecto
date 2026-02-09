from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import Consulta
from .serializers import ConsultaSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def minhas_consultas_api(request):
    consultas = Consulta.objects.filter(paciente=request.user)
    serializer = ConsultaSerializer(consultas, many=True)
    return Response(serializer.data)
