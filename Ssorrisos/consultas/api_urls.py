from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .api_views import minhas_consultas_api, me_api
from .api_views import cadastro_api
urlpatterns = [
    path('login/', TokenObtainPairView.as_view(), name='api_login'),
    path('token/refresh/', TokenRefreshView.as_view()),
    path('cadastro/', cadastro_api)
    path('me/', me_api),
    path('minhas-consultas/', minhas_consultas_api),
]