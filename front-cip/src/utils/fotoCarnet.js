/**
 * Procesa una foto de perfil para carnet:
 *  - Redimensiona a exactamente 413 × 531 px (3.5 × 4.5 cm a 300 dpi)
 *  - Recorta al centro para no deformar la imagen (cover crop)
 *  - Exporta como JPEG ajustando calidad hasta quedar ≤ 2 MB
 *
 * @param {File} file  Archivo de imagen seleccionado por el usuario
 * @returns {Promise<File>}  Nuevo archivo listo para subir
 * @throws {string}  Mensaje de error legible si falla la validación
 */

const ANCHO_PX  = 413;   // 3.5 cm a 300 dpi
const ALTO_PX   = 531;   // 4.5 cm a 300 dpi
const MAX_BYTES = 2 * 1024 * 1024;  // 2 MB

export async function procesarFotoCarnet(file) {
  // 1 — Validar que sea imagen
  if (!file.type.startsWith('image/')) {
    throw 'La foto debe ser una imagen (JPG, PNG, WEBP).';
  }

  // 2 — Cargar en un elemento <img> para leer dimensiones reales
  const imagenOriginal = await cargarImagen(file);

  // 3 — Crear canvas 413 × 531 y dibujar con center-crop
  const canvas = document.createElement('canvas');
  canvas.width  = ANCHO_PX;
  canvas.height = ALTO_PX;
  const ctx = canvas.getContext('2d');

  // Relación de aspecto objetivo
  const ratioTarget = ANCHO_PX / ALTO_PX;
  const ratioOrigen = imagenOriginal.naturalWidth / imagenOriginal.naturalHeight;

  let sx, sy, sw, sh; // recorte en la imagen original
  if (ratioOrigen > ratioTarget) {
    // Imagen más ancha → recortar los lados
    sh = imagenOriginal.naturalHeight;
    sw = Math.round(sh * ratioTarget);
    sx = Math.round((imagenOriginal.naturalWidth - sw) / 2);
    sy = 0;
  } else {
    // Imagen más alta → recortar arriba/abajo
    sw = imagenOriginal.naturalWidth;
    sh = Math.round(sw / ratioTarget);
    sx = 0;
    sy = Math.round((imagenOriginal.naturalHeight - sh) / 2);
  }

  ctx.drawImage(imagenOriginal, sx, sy, sw, sh, 0, 0, ANCHO_PX, ALTO_PX);

  // 4 — Exportar ajustando calidad hasta ≤ 2 MB
  let calidad = 0.92;
  let blob = null;

  while (calidad >= 0.40) {
    blob = await canvasToBlob(canvas, 'image/jpeg', calidad);
    if (blob.size <= MAX_BYTES) break;
    calidad -= 0.08;
  }

  if (!blob || blob.size > MAX_BYTES) {
    throw `No se pudo comprimir la imagen por debajo de 2 MB. Use una foto más simple.`;
  }

  // 5 — Devolver como File con nombre descriptivo
  const nombreFinal = `foto_carnet_${Date.now()}.jpg`;
  return new File([blob], nombreFinal, { type: 'image/jpeg' });
}

// ── Helpers internos ─────────────────────────────────────────────────────────

function cargarImagen(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject('No se pudo leer la imagen.'); };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}
