import { createClient } from "@supabase/supabase-js";

const DISH_IMAGES_BUCKET = "dish-images";
const PDFS_BUCKET = "pdfs";

/**
 * Cliente de Supabase con service role. Solo usar en servidor o scripts (nunca en cliente).
 */
function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar definidos"
    );
  }
  return createClient(url, key);
}

/**
 * Sube la imagen del plato (PNG) al bucket dish-images.
 * Ruta: {pdfDocumentId}/{menuIndex}.png
 * @returns URL pública del objeto subido
 */
export async function uploadDishImage(
  pdfDocumentId: number,
  menuIndex: number,
  buffer: Buffer
): Promise<string> {
  const supabase = getSupabaseServer();
  const path = `${pdfDocumentId}/${menuIndex}.png`;

  const { error } = await supabase.storage
    .from(DISH_IMAGES_BUCKET)
    .upload(path, buffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    throw new Error(`Error subiendo imagen de plato: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(DISH_IMAGES_BUCKET).getPublicUrl(path);
  return publicUrl;
}

/**
 * Sube un PDF al bucket pdfs.
 * @param storagePath - Ruta en el bucket (ej: junin/123_almuerzos.pdf)
 */
export async function uploadPdfToStorage(
  storagePath: string,
  buffer: Buffer
): Promise<void> {
  const supabase = getSupabaseServer();

  const { error } = await supabase.storage.from(PDFS_BUCKET).upload(storagePath, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (error) {
    throw new Error(`Error subiendo PDF a Storage: ${error.message}`);
  }
}

/**
 * Descarga un PDF desde Supabase Storage por su ruta.
 */
export async function downloadPdfFromStorage(storagePath: string): Promise<Buffer> {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase.storage
    .from(PDFS_BUCKET)
    .download(storagePath);

  if (error) {
    throw new Error(`Error descargando PDF desde Storage: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Elimina todas las imágenes de platos subidas para un documento (para rollback).
 */
export async function removeDishImagesForDoc(pdfDocumentId: number): Promise<void> {
  const supabase = getSupabaseServer();
  const prefix = String(pdfDocumentId);
  const { data: list, error: listError } = await supabase.storage
    .from(DISH_IMAGES_BUCKET)
    .list(prefix);

  if (listError || !list?.length) return;

  const paths = list.map((f) => `${prefix}/${f.name}`);
  await supabase.storage.from(DISH_IMAGES_BUCKET).remove(paths);
}

/**
 * Devuelve la URL pública de un objeto en el bucket dish-images.
 */
export function getDishImagePublicUrl(pdfDocumentId: number, menuIndex: number): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL no definida");
  }
  const base = url.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${DISH_IMAGES_BUCKET}/${pdfDocumentId}/${menuIndex}.png`;
}

/**
 * Devuelve la URL pública de un PDF en el bucket pdfs.
 */
export function getPdfPublicUrl(storagePath: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL no definida");
  }
  const base = url.replace(/\/$/, "");
  const normalizedPath = storagePath.replace(/^\//, "");
  return `${base}/storage/v1/object/public/${PDFS_BUCKET}/${normalizedPath}`;
}
