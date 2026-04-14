from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from datetime import date

from .models import Clinica, Perfil, Consulta


# ============================================
# CONFIGURAÇÃO DO ADMIN
# ============================================

admin.site.site_header = "🏥 Sistema de Gestão Clínica"
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
    verbose_name_plural = 'Perfil do Usuário'
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
            return format_html('<span style="color:#999;">SEM PERFIL</span>')

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
            'admin_clinica': 'ADMIN CLÍNICA',
            'medico': 'MÉDICO',
            'paciente': 'PACIENTE',
            'recepcionista': 'RECEPÇÃO'
        }

        return format_html(
            '<span style="background:{}; color:white; padding:3px 8px; border-radius:12px; font-size:10px;">{}</span>',
            cores.get(tipo, '#666'),
            labels.get(tipo, tipo.upper())
        )

    get_tipo.short_description = 'Tipo'

    def get_clinica(self, obj):
        if not hasattr(obj, 'perfil') or not obj.perfil.clinica_vinculada:
            return format_html('<span style="color:#666;">—</span>')

        return format_html(
            '<span style="color:#4ecdc4;">🏥 {}</span>',
            obj.perfil.clinica_vinculada.nome[:25]
        )

    get_clinica.short_description = 'Clínica'


admin.site.unregister(User)
admin.site.register(User, UserAdminCustom)


# ============================================
# CLÍNICA ADMIN
# ============================================

@admin.register(Clinica)
class ClinicaAdmin(SGBDAdminMixin, admin.ModelAdmin):

    list_display = (
        'id',
        'nome_destaque',
        'cnpj_formatado',
        'contatos',
        'stats_resumo',
        'status',
        'status_badge',
        'criada_em'
    )

    list_display_links = ('nome_destaque',)
    list_filter = ('status', 'criada_em')
    search_fields = ('nome', 'cnpj', 'email', 'telefone')
    ordering = ('-criada_em',)
    date_hierarchy = 'criada_em'
    list_editable = ('status',)

    def nome_destaque(self, obj):
        return format_html('<b>{}</b>', obj.nome)

    nome_destaque.short_description = 'Nome'

    def cnpj_formatado(self, obj):
        if obj.cnpj:
            cnpj = obj.cnpj.replace('.', '').replace('/', '').replace('-', '')

            if len(cnpj) == 14:
                return format_html(
                    '<code style="color:#4ecdc4;">{}.{}.{}/{}-{}</code>',
                    cnpj[:2], cnpj[2:5], cnpj[5:8], cnpj[8:12], cnpj[12:]
                )

        return format_html('<span style="color:#666;">—</span>')

    cnpj_formatado.short_description = 'CNPJ'

    def contatos(self, obj):
        return format_html(
            '<div>📧 {}<br>📱 {}</div>',
            obj.email or '—',
            obj.telefone or '—'
        )

    contatos.short_description = 'Contatos'

    def stats_resumo(self, obj):
        return format_html(
            '👨‍⚕️ {} médicos | 🧑‍⚕️ {} pacientes',
            getattr(obj, 'totalMedicos', 0),
            getattr(obj, 'totalPacientes', 0)
        )

    stats_resumo.short_description = 'Stats'

    def status_badge(self, obj):
        cores = {
            'ativa': '#238636',
            'inativa': '#da3633',
            'suspensa': '#d29922'
        }

        return format_html(
            '<span style="background:{}; color:white; padding:3px 8px; border-radius:10px;">{}</span>',
            cores.get(obj.status, '#666'),
            obj.get_status_display()
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
        return obj.medico.username if obj.medico else "—"

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