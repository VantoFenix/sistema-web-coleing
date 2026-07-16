import time
from .models import PagoBancoNacionMock

class BancoNacionMockService:
    """
    Servicio simulador (Mock) de la API del Banco de la Nación.
    Se utiliza para validar números de operación de comprobantes en tiempo real.
    """

    @classmethod
    def verificar_operacion(cls, numero_operacion: str, fecha_pago: str = None) -> dict:
        """
        Simula una llamada a la API del banco.
        Consulta la tabla `PagoBancoNacionMock` para ver si el depósito existe.
        """
        numero = str(numero_operacion).strip()
        
        # Opcional: Mantener regla "99" para forzar errores de conexión en la demo
        if numero.startswith("99"):
            return {
                "valido": False,
                "mensaje": "Error de conexión con el servicio del Banco de la Nación. Intente nuevamente más tarde.",
                "datos_banco": None
            }

        # BÚSQUEDA EN LA BASE DE DATOS (El verdadero Mock Realista)
        try:
            pago_banco = PagoBancoNacionMock.objects.get(numero_operacion=numero)
            
            # Verificamos que la fecha coincida si se proporciona
            if fecha_pago and str(pago_banco.fecha_pago) != str(fecha_pago):
                return {
                    "valido": False,
                    "mensaje": "El número de operación existe, pero la fecha de pago no coincide.",
                    "datos_banco": None
                }
                
            # Éxito: El comprobante es 100% auténtico según el banco
            return {
                "valido": True,
                "mensaje": "Operación verificada correctamente.",
                "datos_banco": {
                    "numero_operacion": pago_banco.numero_operacion,
                    "fecha_pago": pago_banco.fecha_pago,
                    "monto": str(pago_banco.monto),
                    "estado": "PROCESADO"
                }
            }
            
        except PagoBancoNacionMock.DoesNotExist:
            return {
                "valido": False,
                "mensaje": "El número de operación NO figura en los registros del Banco de la Nación. Posible comprobante falso.",
                "datos_banco": None
            }
