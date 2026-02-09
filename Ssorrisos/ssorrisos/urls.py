from django.contrib import admin
from django.urls import path, include
from django.contrib.auth.views import LogoutView
from django.http import JsonResponse

# Endpoint de teste seguro
def test_api(request):
    return JsonResponse({"status": "ok", "from": "django"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('consultas.urls')),  # mantém tudo que já funciona
    path('logout/', LogoutView.as_view(), name='logout'),
    
    # Rota de teste
    path('api/test/', test_api),
]
