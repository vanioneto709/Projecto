from django.urls import path
from . import views
from django.urls import path, include

urlpatterns = [
    path('', include('consultas.urls')),      # HTML
    path('api/', include('consultas.api_urls')),# API
]
urlpatterns = [
    path('', views.home_view, name='home'),
    path('cadastro/', views.cadastro_view, name='cadastro'),
    path('login/', views.login_view, name='login'),
    path('accounts/login/', views.login_view, name='login'),
    path('agendar/', views.agendar_view, name='agendar'),
    path('minhas-consultas/', views.minhas_consultas_view, name='minhas_consultas'),
    path('gerenciar-consultas/', views.gerenciar_consultas_view, name='gerenciar_consultas'),
    path('editar-consulta/<int:consulta_id>/', views.editar_consulta_view, name='editar_consulta'),
    path('excluir-consulta/<int:consulta_id>/', views.excluir_consulta_view, name='excluir_consulta'),

]