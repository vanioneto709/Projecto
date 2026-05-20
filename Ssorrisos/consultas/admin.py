from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html, mark_safe
from datetime import date

from .models import Clinica, Perfil, Consulta


# ============================================
# CONFIGURAÇÃO DO ADMIN
# ============================================

admin.site.site_header = "Sistema de Gestao Clinica"
admin.site.site_title = "Painel Admin"
admin.site.index_title = "Dashboard Administrativo"


class SGBDAdminMixin:
    class Media:
        css = {'all': ('admin/css/custom_admin.css',)}


# ============================================
# PERFIL INLINE
# ============================================

class PerfilInline(admin.StackedInline):
    model = Perfil
    can_delete = False
    verbose_name_plural = 'Perfil do Usuario'
    fields = ('tipo', 'clinica_vinculada', 'telefone', 'crm', 'especialidade', 'ativo', 'ultimo_acesso')
    readonly_fields = ('ultimo_acesso',)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "clinica_vinculada":
            kwargs["queryset"] = Clinica.objects.filter(status='ativa')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class UserAdminCustom(UserAdmin):
    inlines = (PerfilInline,)

    list_display = ('username', 'email', 'first_name', 'get_tipo', 'get_clinica', 'is_active', 'date_joined')
    list_filter = ('is_active', 'perfil__tipo', 'perfil__clinica_vinculada', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'perfil__telefone')

    def get_tipo(self, obj):
        if not hasattr(obj, 'perfil'):
            return mark_safe('<span style="color:#999;">SEM PERFIL</span>')

        tipo = obj.perfil.tipo

        cores = {
            'admin': '#ff6b6b',
            'admin_clinica': '#4ecdc4',
            'medico': '#45b7d1',
            'paciente': '#96ceb4',
            'recepcionista': '#d29922'
        }

        labels = {
            'admin': 'ADMIN SISTEMA',
            'admin_clinica': 'ADMIN CLINICA',
            'medico': 'MEDICO',
            'paciente': 'PACIENTE',
            'recepcionista': 'RECEPCAO'
        }

        return format_html(
            '<span style="background:{}; color:white; padding:3px 8px; border-radius:12px; font-size:10px;">{}</span>',
            cores.get(tipo, '#666'),
            labels.get(tipo, tipo.upper())
        )

    get_tipo.short_description = 'Tipo'

    def get_clinica(self, obj):
        if not hasattr(obj, 'perfil') or not obj.perfil.clinica_vinculada:
            return mark_safe('<span style="color:#666;">--</span>')

        return format_html(
            '<span style="color:#4ecdc4;">[C] {}</span>',
            obj.perfil.clinica_vinculada.nome[:25]
        )

    get_clinica.short_description = 'Clinica'


admin.site.unregister(User)
admin.site.register(User, UserAdminCustom)


# ============================================
# CLINICA ADMIN
# ============================================

@admin.register(Clinica)
class ClinicaAdmin(SGBDAdminMixin, admin.ModelAdmin):

    list_display = (
        'id',
        'nome_destaque',
        'nif_formatado',
        'contatos',
        'stats_resumo',
        'status',
        'status_badge',
        'criada_em'
    )

    list_display_links = ('nome_destaque',)
    list_filter = ('status', 'criada_em')
    search_fields = ('nome', 'NIF', 'email', 'telefone')
    ordering = ('-criada_em',)
    date_hierarchy = 'criada_em'
    list_editable = ('status',)

    def nome_destaque(self, obj):
        return format_html('<b>{}</b>', obj.nome or '')

    nome_destaque.short_description = 'Nome'

    def nif_formatado(self, obj):
        nif = obj.NIF or ''
        if nif:
            nif_limpo = nif.replace('.', '').replace('/', '').replace('-', '')
            if len(nif_limpo) == 14:
                return format_html(
                    '<code style="color:#4ecdc4;">{}.{}.{}/{}-{}</code>',
                    nif_limpo[:2], nif_limpo[2:5], nif_limpo[5:8], nif_limpo[8:12], nif_limpo[12:]
                )
        return mark_safe('<span style="color:#666;">--</span>')

    nif_formatado.short_description = 'NIF'

    def contatos(self, obj):
        email = obj.email or '--'
        telefone = obj.telefone or '--'
        return format_html(
            '<div>Email: {}<br>Tel: {}</div>',
            email,
            telefone
        )

    contatos.short_description = 'Contatos'

    def stats_resumo(self, obj):
        medicos = getattr(obj, 'totalMedicos', 0) or 0
        pacientes = getattr(obj, 'totalPacientes', 0) or 0
        return format_html(
            'Medicos: {} | Pacientes: {}',
            str(medicos),
            str(pacientes)
        )

    stats_resumo.short_description = 'Stats'

    def status_badge(self, obj):
        cores = {
            'ativa': '#238636',
            'inativa': '#da3633',
            'suspensa': '#d29922'
        }
        status_valor = obj.status or 'inativa'
        cor = cores.get(status_valor, '#666')
        label = obj.get_status_display() or status_valor
        return format_html(
            '<span style="background:{}; color:white; padding:3px 8px; border-radius:10px;">{}</span>',
            cor,
            label
        )

    status_badge.short_description = 'Status'


# ============================================
# PERFIL ADMIN
# ============================================

@admin.register(Perfil)
class PerfilAdmin(SGBDAdminMixin, admin.ModelAdmin):

    list_display = ('id', 'usuario_info', 'tipo', 'clinica_vinculada', 'ativo', 'ativo_display')
    list_editable = ('ativo',)

    def usuario_info(self, obj):
        return obj.user.username

    def ativo_display(self, obj):
        return "Ativo" if obj.ativo else "Inativo"


# ============================================
# CONSULTA ADMIN
# ============================================

@admin.register(Consulta)
class ConsultaAdmin(SGBDAdminMixin, admin.ModelAdmin):

    list_display = (
        'id',
        'data',
        'hora',
        'paciente_info',
        'medico_info',
        'status',
        'status_colorido'
    )

    list_filter = ('status', 'data')
    list_editable = ('status',)

    def paciente_info(self, obj):
        return obj.paciente.username

    def medico_info(self, obj):
        return obj.medico.username if obj.medico else "--"

    def status_colorido(self, obj):
        cores = {
            'agendada': '#d29922',
            'confirmada': '#58a6ff',
            'concluida': '#3fb950',
            'cancelada': '#f85149'
        }

        return format_html(
            '<span style="color:{}; font-weight:bold;">{}</span>',
            cores.get(obj.status, '#666'),
            obj.get_status_display()
        )