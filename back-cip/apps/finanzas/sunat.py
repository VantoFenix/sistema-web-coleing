import os
import requests
from datetime import datetime

# Credenciales de FactuSmart por variables de entorno
FACTUSMART_API_KEY = os.getenv("FACTU_API_KEY", "")
FACTUSMART_URL = os.getenv("FACTU_URL", "https://20123456789.s2.factusmart.pe/api/v1/issuer/documents")
RUC_EMISOR = os.getenv("SUNAT_RUC_EMISOR", "20123456789")

def procesar_comprobante_sunat(comprobante):
    """
    Versión FactuSmart: Envía un JSON directo por API REST.
    """
    if not FACTUSMART_API_KEY:
        comprobante.sunat_estado = 'RECHAZADO'
        comprobante.sunat_mensaje = 'Falta configurar FACTU_API_KEY'
        comprobante.save(update_fields=['sunat_estado', 'sunat_mensaje'])
        return comprobante

    es_factura = comprobante.sunat_tipo_comprobante == '01'
    tipo_comprobante = '01' if es_factura else '03'
    
    # Datos del cliente
    if es_factura and comprobante.cliente_documento:
        tipo_doc_cliente = '6'
        doc_cliente = comprobante.cliente_documento
        nombre_cliente = comprobante.cliente_nombre
    else:
        tipo_doc_cliente = '1'
        if comprobante.colegiado.tipo_documento == 'CE': tipo_doc_cliente = '4'
        elif comprobante.colegiado.tipo_documento == 'RUC': tipo_doc_cliente = '6'
        doc_cliente = comprobante.colegiado.numero_documento
        nombre_cliente = comprobante.colegiado.nombre_completo

    monto_total = float(comprobante.monto)
    
    # Payload JSON para FactuSmart
    payload = {
        "ruc": RUC_EMISOR,
        "numero_documento": "#", 
        "fecha_de_emision": datetime.now().strftime("%Y-%m-%d"),
        "hora_de_emision": datetime.now().strftime("%H:%M:%S"),
        "codigo_tipo_operacion": "0101",
        "codigo_tipo_documento": tipo_comprobante,
        "codigo_tipo_moneda": "PEN",
        "datos_del_cliente_o_receptor": {
            "codigo_tipo_documento_identidad": tipo_doc_cliente,
            "numero_documento": doc_cliente,
            "apellidos_y_nombres_o_razon_social": nombre_cliente
        },
        "totales": {
            "total_operaciones_inafectas": monto_total,
            "total_igv": 0.00,
            "total_impuestos": 0.00,
            "total_valor": monto_total,
            "total_venta": monto_total
        },
        "items": [
            {
                "codigo_interno": f"CUOTA-{comprobante.id}",
                "descripcion": "CUOTA INSTITUCIONAL",
                "unidad_de_medida": "NIU",
                "cantidad": 1,
                "valor_unitario": monto_total,
                "codigo_tipo_precio": "01",
                "precio_unitario": monto_total,
                "codigo_tipo_afectacion_igv": "30", # 30 = Inafecto de IGV
                "total_base_igv": monto_total,
                "porcentaje_igv": 0,
                "total_igv": 0.00,
                "total_impuestos": 0.00,
                "total_valor_item": monto_total,
                "total_item": monto_total
            }
        ]
    }
    if comprobante.observaciones:
        payload["informacion_adicional"] = comprobante.observaciones


    headers = {
        "Content-Type": "application/json",
        "X-API-Key": FACTUSMART_API_KEY
    }

    try:
        response = requests.post(FACTUSMART_URL, json=payload, headers=headers, timeout=10)
        data = response.json()
        
        if response.status_code == 200 and data.get("success"):
            comprobante.sunat_estado = 'ACEPTADO' if data.get("aceptado_por_sunat") else 'RECHAZADO'
            comprobante.sunat_mensaje = data.get("sunat", {}).get("descripcion", "Aceptado")
            
            if "serie_numero" in data:
                partes = data["serie_numero"].split("-")
                comprobante.sunat_serie = partes[0]
                comprobante.sunat_correlativo = partes[1]
                
            if "external_id" in data:
                comprobante.sunat_hash = data["external_id"]
                
        else:
            comprobante.sunat_estado = 'RECHAZADO'
            comprobante.sunat_mensaje = data.get("message", f"Error HTTP {response.status_code}")
            
    except Exception as e:
        comprobante.sunat_estado = 'RECHAZADO'
        comprobante.sunat_mensaje = str(e)

    comprobante.save(update_fields=['sunat_estado', 'sunat_mensaje', 'sunat_serie', 'sunat_correlativo', 'sunat_hash'])
    return comprobante
