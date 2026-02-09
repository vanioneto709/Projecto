from rest_framework import serializers
from .models import Consulta

class ConsultaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Consulta
        fields = '__all__'
