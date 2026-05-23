from django.utils import timezone
from .models import Cuota

class CuotaNoPendienteException(Exception):
    pass

def marcar_cuota_como_pagada(cuota: Cuota, transaccion_id: str = None) -> Cuota:
    """
    Marca una cuota como pagada registrando su fecha y transacción.
    Valida que la cuota no esté pagada previamente.
    """
    if cuota.pagado:
        raise CuotaNoPendienteException("Esta cuota ya ha sido pagada.")
    
    cuota.pagado = True
    cuota.fecha_pago = timezone.now()
    if transaccion_id:
        cuota.transaccion_id = transaccion_id
    cuota.save(update_fields=['pagado', 'fecha_pago', 'transaccion_id'])
    
    return cuota
