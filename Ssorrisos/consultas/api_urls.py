from django.urls import path
from .api_views import minhas_consultas_api

urlpatterns = [
    path('minhas-consultas/', minhas_consultas_api),
]
