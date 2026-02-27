from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def api_root(request):
    return JsonResponse({
        "message": "API Ssorrisos funcionando!",
        "endpoints": {
            "admin": "/admin/",
            "api": "/api/",
            "login": "/api/login/",
            "refresh": "/api/token/refresh/",
            "me": "/api/me/",
            "consultas": "/api/minhas-consultas/"
        }
    })

urlpatterns = [
    path('', api_root),
    path('admin/', admin.site.urls),
    path('api/', include('consultas.api_urls')),
]