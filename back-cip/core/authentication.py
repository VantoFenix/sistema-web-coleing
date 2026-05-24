import jwt
from django.conf import settings
from rest_framework import authentication
from rest_framework import exceptions
from .models import Administrador, Colegiado

class CustomJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token expirado')
        except jwt.DecodeError:
            raise exceptions.AuthenticationFailed('Token inválido')

        user_id = payload.get('user_id')
        role = payload.get('role')

        if not user_id or not role:
            raise exceptions.AuthenticationFailed('Token malformado')

        if role == 'ADMIN':
            user = Administrador.objects.filter(id=user_id).first()
        elif role == 'COLEGIADO':
            user = Colegiado.objects.filter(id=user_id).first()
        else:
            raise exceptions.AuthenticationFailed('Rol no válido')

        if not user:
            raise exceptions.AuthenticationFailed('Usuario no encontrado')

        # Attach custom properties to the request.user object (which is now our model instance)
        user.is_authenticated = True
        user.role = role

        return (user, token)
