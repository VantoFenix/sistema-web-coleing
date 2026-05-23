from django.db.models import Sum
from .models import Colegiado, Cuota

def calcular_deuda_colegiado(colegiado: Colegiado) -> dict:
    """
    Retorna la información de deuda total y cantidad de cuotas pendientes de un colegiado.
    """
    cuotas_pendientes = colegiado.cuotas.filter(pagado=False)
    deuda_total = cuotas_pendientes.aggregate(Sum('monto'))['monto__sum'] or 0
    cantidad_cuotas = cuotas_pendientes.count()

    return {
        'colegiado_id': colegiado.id,
        'colegiado_nombre': colegiado.nombre_completo,
        'deuda_total': deuda_total,
        'cantidad_cuotas_pendientes': cantidad_cuotas,
        'habilitado': colegiado.habilitado
    }


def obtener_resumen_financiero() -> dict:
    """
    Calcula y retorna un resumen global del estado financiero de las cuotas.
    """
    total_cuotas = Cuota.objects.count()
    
    agregados_pagados = Cuota.objects.filter(pagado=True).aggregate(total=Sum('monto'))
    total_pagado = agregados_pagados['total'] or 0
    
    agregados_pendientes = Cuota.objects.filter(pagado=False).aggregate(total=Sum('monto'))
    total_pendiente = agregados_pendientes['total'] or 0
    
    cuotas_pagadas = Cuota.objects.filter(pagado=True).count()
    cuotas_pendientes = Cuota.objects.filter(pagado=False).count()

    porcentaje = round((cuotas_pagadas / total_cuotas * 100), 2) if total_cuotas > 0 else 0

    return {
        'total_cuotas': total_cuotas,
        'cuotas_pagadas': cuotas_pagadas,
        'cuotas_pendientes': cuotas_pendientes,
        'monto_total_pagado': total_pagado,
        'monto_total_pendiente': total_pendiente,
        'monto_total': total_pagado + total_pendiente,
        'porcentaje_pagado': porcentaje
    }
