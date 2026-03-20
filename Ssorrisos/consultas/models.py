from django.db import models
from django.contrib.auth.models import User


class Perfil(models.Model):

    TIPO_USUARIO = [
        ('admin', 'Administrador'),
        ('clinica', 'Clinica'),
        ('medico', 'Medico'),
        ('paciente', 'Paciente'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=20, choices=TIPO_USUARIO)

    def __str__(self):
        return f"{self.user.username} - {self.tipo}"


class Consulta(models.Model):

    paciente = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="consultas_paciente"
    )

    medico = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultas_medico"
    )

    data = models.DateField()

    hora = models.TimeField()

    motivo = models.TextField()

    descricao = models.TextField(blank=True)

    def __str__(self):
        medico_nome = self.medico.username if self.medico else "Sem médico"
        return f"Consulta de {self.paciente.username} com {medico_nome} em {self.data}"  