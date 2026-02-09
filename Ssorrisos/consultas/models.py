from django.db import models
from django.contrib.auth.models import User

class Consulta(models.Model):
    paciente = models.ForeignKey(User, on_delete=models.CASCADE)
    data = models.DateField()
    hora = models.TimeField()
    motivo = models.TextField()
    descricao = models.TextField(blank=True)

    def __str__(self):
        return f"Consulta de {self.paciente.username} em {self.data} às {self.hora}"

