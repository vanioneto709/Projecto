from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Perfil

@receiver(post_save, sender=User)
def criar_perfil(sender, instance, created, **kwargs):
    if created:
        # Define tipo baseado nas permissões do Django
        if instance.is_superuser:
            tipo = 'admin'
        elif instance.is_staff:
            tipo = 'clinica'  # ou 'medico', depende da sua lógica
        else:
            tipo = 'paciente'
        
        Perfil.objects.create(user=instance, tipo=tipo)