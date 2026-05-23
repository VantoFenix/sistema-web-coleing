#!/usr/bin/env python
"""
╔═══════════════════════════════════════════════════════════════════════════╗
║                         SCRIPT SEED - CATÁLOGOS                           ║
║                                                                            ║
║ Propósito: Poblar la base de datos con Sedes y Carreras                  ║
║ Idempotencia: Usa get_or_create() para evitar duplicados                 ║
║ Ejecución: docker compose exec backend python seed.py                    ║
╚═══════════════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import django
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════════
# 1. CONFIGURACIÓN DE DJANGO
# ═══════════════════════════════════════════════════════════════════════════

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

# Importar modelos DESPUÉS de django.setup()
from apps.finanzas.models import Sede, Carrera


# ═══════════════════════════════════════════════════════════════════════════
# 2. ESTRUCTURA DE DATOS (Extraído de init.sql)
# ═══════════════════════════════════════════════════════════════════════════

SEDES_DATA = [
    'Consejo Departamental Amazonas',
    'Consejo Departamental Áncash',
    'Consejo Departamental Arequipa',
    'Consejo Departamental Ayacucho',
    'Consejo Departamental Cajamarca',
    'Consejo Departamental Callao',
    'Consejo Departamental Cusco',
    'Consejo Departamental Ica',
    'Consejo Departamental Junín',
    'Consejo Departamental La Libertad',
    'Consejo Departamental Lambayeque',
    'Consejo Departamental Lima',
]

CARRERAS_DATA = [
    'Ingeniería Civil',
    'Ingeniería Industrial',
    'Ingeniería de Sistemas e Inteligencia Artificial',
    'Ingeniería de Software',
    'Ingeniería Agrónoma',
    'Ingeniería Ambiental',
    'Ingeniería Mecánica',
    'Ingeniería Electrónica',
    'Ingeniería Mecatrónica',
    'Ingeniería de Minas',
    'Ingeniería Química',
    'Ingeniería Geológica',
]


# ═══════════════════════════════════════════════════════════════════════════
# 3. FUNCIONES DE SEEDING
# ═══════════════════════════════════════════════════════════════════════════

def seed_sedes():
    """
    Crea todas las sedes usando get_or_create().
    
    Returns:
        tuple: (cantidad_creadas, cantidad_existentes)
    """
    created_count = 0
    existing_count = 0
    
    print("\n" + "="*70)
    print("SEEDING: SEDES")
    print("="*70)
    
    for sede_nombre in SEDES_DATA:
        sede, created = Sede.objects.get_or_create(nombre=sede_nombre)
        
        if created:
            print(f"✅ CREADA   : {sede_nombre}")
            created_count += 1
        else:
            print(f"ℹ️  EXISTENTE: {sede_nombre}")
            existing_count += 1
    
    return created_count, existing_count


def seed_carreras():
    """
    Crea todas las carreras usando get_or_create().
    
    Returns:
        tuple: (cantidad_creadas, cantidad_existentes)
    """
    created_count = 0
    existing_count = 0
    
    print("\n" + "="*70)
    print("SEEDING: CARRERAS")
    print("="*70)
    
    for carrera_nombre in CARRERAS_DATA:
        carrera, created = Carrera.objects.get_or_create(nombre=carrera_nombre)
        
        if created:
            print(f"✅ CREADA   : {carrera_nombre}")
            created_count += 1
        else:
            print(f"ℹ️  EXISTENTE: {carrera_nombre}")
            existing_count += 1
    
    return created_count, existing_count


def print_summary(sedes_created, sedes_existing, carreras_created, carreras_existing):
    """Imprime un resumen final bonito."""
    
    total_sedes = sedes_created + sedes_existing
    total_carreras = carreras_created + carreras_existing
    
    print("\n" + "="*70)
    print("RESUMEN FINAL")
    print("="*70)
    
    print(f"\n📍 SEDES:")
    print(f"   ✅ Creadas   : {sedes_created}/{total_sedes}")
    print(f"   ℹ️  Existentes: {sedes_existing}/{total_sedes}")
    
    print(f"\n🎓 CARRERAS:")
    print(f"   ✅ Creadas   : {carreras_created}/{total_carreras}")
    print(f"   ℹ️  Existentes: {carreras_existing}/{total_carreras}")
    
    print(f"\n⏰ Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70 + "\n")


# ═══════════════════════════════════════════════════════════════════════════
# 4. MAIN - EJECUCIÓN CON MANEJO DE ERRORES
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """Punto de entrada principal."""
    
    try:
        print("\n🚀 Iniciando seeding de catálogos...")
        
        # Seed Sedes
        sedes_created, sedes_existing = seed_sedes()
        
        # Seed Carreras
        carreras_created, carreras_existing = seed_carreras()
        
        # Resumen
        print_summary(sedes_created, sedes_existing, carreras_created, carreras_existing)
        
        print("✨ ¡Seeding completado exitosamente!")
        sys.exit(0)
        
    except Exception as e:
        print("\n" + "="*70)
        print("❌ ERROR DURANTE EL SEEDING")
        print("="*70)
        print(f"Tipo de error: {type(e).__name__}")
        print(f"Mensaje: {str(e)}")
        print("="*70 + "\n")
        sys.exit(1)


if __name__ == '__main__':
    main()
