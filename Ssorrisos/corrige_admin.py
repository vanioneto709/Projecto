# corrige_admin.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ssorrisos.settings')  # muda 'ssorrisos' pelo nome do seu projeto
django.setup()

from django.contrib.auth.models import User
from consultas.models import Perfil

print("=== USUÁRIOS ATUAIS ===")
for u in User.objects.all():
    try:
        print(f"{u.username}: superuser={u.is_superuser}, tipo={u.perfil.tipo}")
    except:
        print(f"{u.username}: SEM PERFIL")

print("\n=== CORRIGINDO ADMINS ===")
for user in User.objects.filter(is_superuser=True):
    perfil, created = Perfil.objects.get_or_create(user=user)
    if perfil.tipo != 'admin':
        perfil.tipo = 'admin'
        perfil.save()
        print(f"✅ {user.username} corrigido para admin")
    else:
        print(f"✓ {user.username} já é admin")

print("\n=== VERIFICAÇÃO FINAL ===")
for u in User.objects.all():
    try:
        print(f"{u.username}: tipo={u.perfil.tipo}")
    except:
        print(f"{u.username}: SEM PERFIL")