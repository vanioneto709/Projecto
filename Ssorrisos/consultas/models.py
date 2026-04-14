from django.db import models
from django.contrib.auth.models import User


class Clinica(models.Model):
    """
    Modelo separado para Clínicas - resolve os problemas do Admin
    Mas mantém compatibilidade total com a dashboard existente
    """
    # Campos que a tua dashboard já espera
    nome = models.CharField(max_length=200)
    endereco = models.TextField(blank=True, default='')
    telefone = models.CharField(max_length=20, blank=True, default='')
    email = models.EmailField(unique=True)
    cnpj = models.CharField(max_length=20, blank=True, default='')
    
    # Status que a dashboard usa: "ativa" | "inativa" | "suspensa"
    status = models.CharField(
        max_length=20,
        choices=[
            ('ativa', 'Ativa'),
            ('inativa', 'Inativa'), 
            ('suspensa', 'Suspensa')
        ],
        default='ativa'
    )
    
    criada_em = models.DateTimeField(auto_now_add=True)
    
    # Ligação ao admin (User) - opcional, não obrigatório
    admin = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clinica_administrada'
    )

    class Meta:
        verbose_name = "Clínica"
        verbose_name_plural = "Clínicas"
        ordering = ['-criada_em']

    def __str__(self):
        return self.nome

    # Propriedades que a tua dashboard espera
    @property
    def dataCadastro(self):
        return self.criada_em.strftime("%Y-%m-%d")
    
    @property
    def totalMedicos(self):
        return Perfil.objects.filter(tipo='medico', clinica_vinculada=self).count()
    
    @property
    def totalPacientes(self):
        # Pacientes únicos que têm consulta com médicos desta clínica
        return Consulta.objects.filter(
            medico__perfil__clinica_vinculada=self
        ).values('paciente').distinct().count()
    
    @property
    def consultasMes(self):
        from datetime import date
        hoje = date.today()
        inicio_mes = hoje.replace(day=1)
        return Consulta.objects.filter(
            medico__perfil__clinica_vinculada=self,
            data__gte=inicio_mes
        ).count()
    
    @property
    def faturamentoMes(self):
        from datetime import date
        from django.db.models import Sum
        hoje = date.today()
        inicio_mes = hoje.replace(day=1)
        return Consulta.objects.filter(
            medico__perfil__clinica_vinculada=self,
            data__gte=inicio_mes,
            status='concluida'
        ).aggregate(total=Sum('valor'))['total'] or 0


class Perfil(models.Model):

    TIPO_USUARIO = [
        ('admin', 'Administrador do Sistema'),
        ('admin_clinica', 'Admin de Clínica'),  # Mantido para compatibilidade
        ('medico', 'Médico'),
        ('paciente', 'Paciente'),
        ('recepcionista', 'Recepcionista'),  # ← Adicionado para a tua dashboard!
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    tipo = models.CharField(max_length=20, choices=TIPO_USUARIO, default='paciente')
    
    # AGORA sim funciona bem - ForeignKey para Clinica (não User!)
    clinica_vinculada = models.ForeignKey(
        Clinica,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='funcionarios',
        verbose_name='Clínica'
    )
    
    # Campos extras
    telefone = models.CharField(max_length=20, blank=True, default='')
    endereco = models.TextField(blank=True, default='')
    cnpj = models.CharField(max_length=20, blank=True, default='')  # Só para admin_clinica
    crm = models.CharField(max_length=20, blank=True, default='')  # Só para médicos
    especialidade = models.CharField(max_length=100, blank=True, default='')
    ativo = models.BooleanField(default=True)
    
    # Para a dashboard mostrar "último acesso"
    ultimo_acesso = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Perfil"
        verbose_name_plural = "Perfis"

    def __str__(self):
        return f"{self.user.username} - {self.tipo}"

    # Propriedade de compatibilidade para API/dashboard antiga
    @property
    def clinicaId(self):
        return self.clinica_vinculada.id if self.clinica_vinculada else None
    
    @property
    def clinicaNome(self):
        return self.clinica_vinculada.nome if self.clinica_vinculada else None


class Consulta(models.Model):

    STATUS_CHOICES = [
        ('agendada', 'Agendada'),
        ('confirmada', 'Confirmada'),
        ('concluida', 'Concluída'),
        ('cancelada', 'Cancelada'),
    ]

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
    motivo = models.TextField(blank=True, default='')
    descricao = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='agendada')
    valor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    criada_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Consulta"
        verbose_name_plural = "Consultas"
        ordering = ['-data', '-hora']

    def __str__(self):
        medico_nome = self.medico.username if self.medico else "Sem médico"
        return f"Consulta de {self.paciente.username} com {medico_nome} em {self.data}"
    
    # Propriedades para API
    @property
    def clinica(self):
        """Retorna nome da clínica do médico (para dashboard)"""
        if self.medico and hasattr(self.medico, 'perfil') and self.medico.perfil.clinica_vinculada:
            return self.medico.perfil.clinica_vinculada.nome
        return "—"
    
    @property
    def clinicaId(self):
        if self.medico and hasattr(self.medico, 'perfil') and self.medico.perfil.clinica_vinculada:
            return self.medico.perfil.clinica_vinculada.id
        return None