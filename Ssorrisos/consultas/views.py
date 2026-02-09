from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.decorators import login_required, user_passes_test
from .forms import RegistroForm, ConsultaForm
from .models import Consulta
from django.contrib.auth.forms import UserCreationForm


def home_view(request):
    return render(request, 'home.html')

def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('/')
    else:
        form = AuthenticationForm()
    return render(request, 'login.html', {'form': form})

def logout_view(request):
    if request.method == 'POST':
        logout(request)
        return redirect('/login/')

def cadastro_view(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('/')
    else:
        form = UserCreationForm()
    return render(request, 'cadastro.html', {'form': form})

@login_required
def minhas_consultas_view(request):
    consultas = Consulta.objects.filter(paciente=request.user)
    return render(request, 'minhas_consultas.html', {'consultas': consultas})

@user_passes_test(lambda u: u.is_superuser)
def gerenciar_consultas_view(request):
    consultas = Consulta.objects.all()
    return render(request, 'gerenciar_consultas.html', {'consultas': consultas})

@user_passes_test(lambda u: u.is_superuser)
def agendar_view(request):
    if request.method == 'POST':
        form = ConsultaForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('/gerenciar-consultas/')
    else:
        form = ConsultaForm()
    return render(request, 'agendar.html', {'form': form})

@user_passes_test(lambda u: u.is_superuser)
def editar_consulta_view(request, consulta_id):
    consulta = get_object_or_404(Consulta, pk=consulta_id)
    if request.method == 'POST':
        form = ConsultaForm(request.POST, instance=consulta)
        if form.is_valid():
            form.save()
            return redirect('/gerenciar-consultas/')
    else:
        form = ConsultaForm(instance=consulta)
    return render(request, 'editar_consulta.html', {'form': form, 'consulta': consulta})

@user_passes_test(lambda u: u.is_superuser)
def excluir_consulta_view(request, consulta_id):
    consulta = get_object_or_404(Consulta, pk=consulta_id)
    consulta.delete()
    return redirect('/gerenciar-consultas/')