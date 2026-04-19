from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Perfil

@receiver(post_save, sender=User)
def criar_perfil(sender, instance, created, **kwargs):
    if created:
        # Só cria perfil se ainda não existir (evita duplicar com cadastro_api)
        if not Perfil.objects.filter(user=instance).exists():
            if instance.is_superuser:
                tipo = 'admin'
            elif instance.is_staff:
                tipo = 'clinica'
            else:
                tipo = 'paciente'
            Perfil.objects.create(user=instance, tipo=tipo)