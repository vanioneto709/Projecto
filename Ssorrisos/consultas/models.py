from django.db import models
from django.contrib.auth.models import User


class Clinica(models.Model):
    nome = models.CharField(max_length=200)
    endereco = models.TextField(blank=True, default='')
    telefone = models.CharField(max_length=20, blank=True, default='')
    email = models.EmailField(unique=True)
    NIF = models.CharField(max_length=20, blank=True, default='')
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
    admin = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='clinica_administrada'
    )

    class Meta:
        verbose_name = "Clínica"
        verbose_name_plural = "Clínicas"
        ordering = ['-criada_em']

    def __str__(self):
        return self.nome

    @property
    def dataCadastro(self):
        return self.criada_em.strftime("%Y-%m-%d")

    @property
    def totalMedicos(self):
        return Perfil.objects.filter(tipo='medico', clinica_vinculada=self).count()

    @property
    def totalPacientes(self):
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
        ('admin_clinica', 'Admin de Clínica'),
        ('medico', 'Médico'),
        ('paciente', 'Paciente'),
        ('recepcionista', 'Recepcionista'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    tipo = models.CharField(max_length=20, choices=TIPO_USUARIO, default='paciente')
    clinica_vinculada = models.ForeignKey(
        Clinica,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='funcionarios',
        verbose_name='Clínica'
    )
    telefone = models.CharField(max_length=20, blank=True, default='')
    endereco = models.TextField(blank=True, default='')
    NIF = models.CharField(max_length=20, blank=True, default='')
    crm = models.CharField(max_length=20, blank=True, default='')
    especialidade = models.CharField(max_length=100, blank=True, default='')
    ativo = models.BooleanField(default=True)
    ultimo_acesso = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Perfil"
        verbose_name_plural = "Perfis"

    def __str__(self):
        return f"{self.user.username} - {self.tipo}"

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
        User, on_delete=models.CASCADE, related_name="consultas_paciente"
    )
    medico = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="consultas_medico"
    )
    data = models.DateField()
    hora = models.TimeField()
    motivo = models.TextField(blank=True, default='')
    descricao = models.TextField(blank=True, default='')
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

    @property
    def clinica(self):
        if self.medico and hasattr(self.medico, 'perfil') and self.medico.perfil.clinica_vinculada:
            return self.medico.perfil.clinica_vinculada.nome
        return "—"

    @property
    def clinicaId(self):
        if self.medico and hasattr(self.medico, 'perfil') and self.medico.perfil.clinica_vinculada:
            return self.medico.perfil.clinica_vinculada.id
        return None


class Prontuario(models.Model):
    """Prontuário único por paciente — clínica dentária."""
    paciente = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='prontuario'
    )
    criado_por = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='prontuarios_criados'
    )
    medico_preferencial = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='pacientes_preferenciais'
    )
    alergias = models.TextField(blank=True, default='')
    medicamentos_em_uso = models.TextField(blank=True, default='')
    doencas_sistemicas = models.TextField(blank=True, default='')
    observacoes = models.TextField(blank=True, default='')
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    atualizado_por = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='prontuarios_atualizados'
    )

    class Meta:
        verbose_name = "Prontuário"
        verbose_name_plural = "Prontuários"

    def __str__(self):
        return f"Prontuário de {self.paciente.get_full_name() or self.paciente.username}"


class ProcedimentoDentario(models.Model):
    TIPO_CHOICES = [
        ('consulta',    'Consulta de rotina'),
        ('extracao',    'Extracção'),
        ('canal',       'Tratamento de canal'),
        ('ortodontia',  'Ortodontia'),
        ('implante',    'Implante'),
        ('limpeza',     'Limpeza / Profilaxia'),
        ('restauracao', 'Restauração / Obturação'),
        ('protese',     'Prótese'),
        ('cirurgia',    'Cirurgia oral'),
        ('outro',       'Outro'),
    ]

    prontuario = models.ForeignKey(
        Prontuario, on_delete=models.CASCADE, related_name='procedimentos'
    )
    consulta = models.OneToOneField(
        'Consulta', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='procedimento_dentario'
    )
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='consulta')
    dente = models.CharField(max_length=10, blank=True, default='')
    descricao = models.TextField(blank=True, default='')
    data = models.DateField()
    medico = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='procedimentos_realizados'
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Procedimento Dentário"
        verbose_name_plural = "Procedimentos Dentários"
        ordering = ['-data']

    def __str__(self):
        return f"{self.get_tipo_display()} — dente {self.dente or '?'} — {self.data}"


class AnexoProntuario(models.Model):
    TIPO_CHOICES = [
        ('raio_x_panoramico', 'Raio-X Panorâmico'),
        ('raio_x_apical',     'Raio-X Apical'),
        ('foto_clinica',      'Foto Clínica'),
        ('outro',             'Outro'),
    ]

    prontuario = models.ForeignKey(
        Prontuario, on_delete=models.CASCADE, related_name='anexos'
    )
    tipo = models.CharField(max_length=30, choices=TIPO_CHOICES, default='outro')
    titulo = models.CharField(max_length=200)
    arquivo = models.FileField(upload_to='prontuarios/%Y/%m/')
    descricao = models.TextField(blank=True, default='')
    data_exame = models.DateField()
    adicionado_por = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='anexos_adicionados'
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Anexo"
        verbose_name_plural = "Anexos"
        ordering = ['-data_exame']

    def __str__(self):
        return f"{self.get_tipo_display()} — {self.titulo}"


class PartilhaProntuario(models.Model):
    TIPO_CHOICES = [
        ('transferencia',   'Transferência de Paciente'),
        ('segunda_opiniao', 'Segunda Opinião'),
    ]
    ESTADO_CHOICES = [
        ('pendente',  'Pendente'),
        ('aceite',    'Aceite'),
        ('recusado',  'Recusado'),
        ('concluido', 'Concluído'),
    ]
    ESCOPO_CHOICES = [
        ('interna', 'Interna'),
        ('externa', 'Externa'),
    ]

    prontuario = models.ForeignKey(
        Prontuario, on_delete=models.CASCADE, related_name='partilhas'
    )
    enviado_por = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='partilhas_enviadas'
    )
    clinica_origem = models.ForeignKey(
        'Clinica', on_delete=models.SET_NULL, null=True,
        related_name='partilhas_enviadas'
    )
    clinica_destino = models.ForeignKey(
        'Clinica', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='partilhas_recebidas'
    )
    medico_destino = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='partilhas_recebidas'
    )
    escopo = models.CharField(max_length=10, choices=ESCOPO_CHOICES)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='pendente')
    mensagem = models.TextField(blank=True, default='')
    resposta = models.TextField(blank=True, default='')
    medico_responsavel_destino = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='partilhas_responsavel'
    )
    conversa = models.ForeignKey(
        'Conversa', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='partilhas_associadas'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Partilha de Prontuário"
        verbose_name_plural = "Partilhas de Prontuário"
        ordering = ['-criado_em']

    def __str__(self):
        return f"{self.get_tipo_display()} — {self.prontuario} — {self.estado}"


class Conversa(models.Model):
    """Thread de mensagens entre dois utilizadores."""
    participantes = models.ManyToManyField(User, related_name='conversas')
    criada_em = models.DateTimeField(auto_now_add=True)
    atualizada_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-atualizada_em']

    def __str__(self):
        nomes = ", ".join(u.username for u in self.participantes.all())
        return f"Conversa: {nomes}"


class Mensagem(models.Model):
    """Mensagem individual dentro de uma conversa."""
    conversa = models.ForeignKey(
        Conversa, on_delete=models.CASCADE, related_name='mensagens'
    )
    remetente = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='mensagens_enviadas'
    )
    # remetente=None significa mensagem automática do sistema
    corpo = models.TextField()
    lida = models.BooleanField(default=False)
    criada_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['criada_em']

    def __str__(self):
        remetente = self.remetente.username if self.remetente else "Sistema"
        return f"{remetente} ({self.criada_em:%H:%M}): {self.corpo[:40]}"