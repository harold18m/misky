"use server";

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { db } from "@/db";
import { departments } from "@/db/schema/departments";
import { pdfDocuments } from "@/db/schema/pdf-documents";
import { eq } from "drizzle-orm";
import { runScrapForDoc } from "@/lib/scrap-doc";
import {
  removeDishImagesForDoc,
  getPdfPublicUrl,
  uploadPdfToStorage,
} from "@/lib/supabase-storage";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "pdfs");

/** Asegura que el directorio de uploads existe */
async function ensureUploadDir(departmentSlug: string): Promise<string> {
  const dir = path.join(UPLOAD_DIR, departmentSlug);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Genera un nombre de archivo único */
function generateFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const base = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .substring(0, 50);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${base}_${timestamp}_${random}${ext}`;
}

export type UploadResult = {
  success: boolean;
  uploaded: number;
  errors: string[];
};

/** Sube múltiples PDFs para un departamento */
export async function uploadPdfs(
  formData: FormData
): Promise<UploadResult> {
  const departmentId = formData.get("departmentId");
  const files = formData.getAll("files") as File[];

  if (!departmentId || typeof departmentId !== "string") {
    return { success: false, uploaded: 0, errors: ["Departamento no seleccionado."] };
  }

  const deptId = parseInt(departmentId, 10);
  if (isNaN(deptId)) {
    return { success: false, uploaded: 0, errors: ["ID de departamento inválido."] };
  }

  // Verificar que el departamento existe
  const dept = await db.query.departments.findFirst({
    where: eq(departments.id, deptId),
  });

  if (!dept) {
    return { success: false, uploaded: 0, errors: ["Departamento no encontrado."] };
  }

  if (files.length === 0) {
    return { success: false, uploaded: 0, errors: ["No se seleccionaron archivos."] };
  }

  const dir = await ensureUploadDir(dept.slug);
  const errors: string[] = [];
  let uploaded = 0;

  for (const file of files) {
    // Validar que sea PDF
    if (file.type !== "application/pdf") {
      errors.push(`"${file.name}" no es un archivo PDF.`);
      continue;
    }

    // Validar tamaño (máx 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      errors.push(`"${file.name}" excede el límite de 50MB.`);
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = generateFileName(file.name);
    const tempPath = path.join(os.tmpdir(), `scrap-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`);

    try {
      await fs.writeFile(tempPath, buffer);

      const [inserted] = await db
        .insert(pdfDocuments)
        .values({
          departmentId: deptId,
          originalName: file.name,
          fileName,
          filePath: tempPath,
          fileSize: file.size,
          status: "processing",
        })
        .returning({ id: pdfDocuments.id });

      if (!inserted) {
        await fs.unlink(tempPath).catch(() => { });
        continue;
      }

      try {
        await runScrapForDoc(inserted.id, tempPath);
      } catch (scrapError) {
        await db.delete(pdfDocuments).where(eq(pdfDocuments.id, inserted.id));
        await removeDishImagesForDoc(inserted.id).catch(() => { });
        await fs.unlink(tempPath).catch(() => { });
        const msg = scrapError instanceof Error ? scrapError.message : String(scrapError);
        errors.push(`Error procesando "${file.name}": ${msg}`);
        continue;
      }

      const finalPath = path.join(dir, fileName);
      await fs.rename(tempPath, finalPath);

      const storagePath = `${dept.slug}/${inserted.id}_${fileName}`;
      try {
        await uploadPdfToStorage(storagePath, buffer);
        await db
          .update(pdfDocuments)
          .set({
            filePath: path.relative(process.cwd(), finalPath),
            storagePath,
          })
          .where(eq(pdfDocuments.id, inserted.id));
      } catch {
        await db
          .update(pdfDocuments)
          .set({ filePath: path.relative(process.cwd(), finalPath) })
          .where(eq(pdfDocuments.id, inserted.id));
      }

      uploaded++;
    } catch (error) {
      await fs.unlink(tempPath).catch(() => { });
      const msg = error instanceof Error ? error.message : "Error desconocido";
      errors.push(`Error subiendo "${file.name}": ${msg}`);
    }
  }

  return {
    success: uploaded > 0,
    uploaded,
    errors,
  };
}

export type DepartmentWithCount = {
  id: number;
  name: string;
  slug: string;
  pdfCount: number;
};

/** Lista departamentos con cantidad de PDFs */
export async function getDepartmentsWithPdfCount(): Promise<DepartmentWithCount[]> {
  const depts = await db.query.departments.findMany({
    orderBy: (departments, { asc }) => [asc(departments.name)],
  });

  const counts = await Promise.all(
    depts.map(async (dept) => {
      const docs = await db.query.pdfDocuments.findMany({
        where: eq(pdfDocuments.departmentId, dept.id),
      });
      return {
        id: dept.id,
        name: dept.name,
        slug: dept.slug,
        pdfCount: docs.length,
      };
    })
  );

  return counts;
}

export type PdfDocumentInfo = {
  id: number;
  originalName: string;
  fileSize: number;
  status: "pending" | "processing" | "done" | "error";
  uploadedAt: Date;
  departmentName: string;
  pdfUrl: string | null;
};

/** Lista PDFs de un departamento */
export async function getPdfsByDepartment(
  departmentId: number
): Promise<PdfDocumentInfo[]> {
  const dept = await db.query.departments.findFirst({
    where: eq(departments.id, departmentId),
  });

  if (!dept) return [];

  const docs = await db.query.pdfDocuments.findMany({
    where: eq(pdfDocuments.departmentId, departmentId),
    orderBy: (pdfDocuments, { desc }) => [desc(pdfDocuments.uploadedAt)],
  });

  return docs.map((doc) => ({
    id: doc.id,
    originalName: doc.originalName,
    fileSize: doc.fileSize,
    status: doc.status,
    uploadedAt: doc.uploadedAt,
    departmentName: dept.name,
    pdfUrl: doc.storagePath ? getPdfPublicUrl(doc.storagePath) : null,
  }));
}

/** Elimina un PDF (archivo + registro) */
export async function deletePdf(
  pdfId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const doc = await db.query.pdfDocuments.findFirst({
      where: eq(pdfDocuments.id, pdfId),
    });

    if (!doc) {
      return { success: false, error: "Documento no encontrado." };
    }

    // Eliminar archivo del disco
    const fullPath = path.join(process.cwd(), doc.filePath);
    try {
      await fs.unlink(fullPath);
    } catch {
      // El archivo puede no existir, seguimos con la eliminación del registro
    }

    // Eliminar registro de BD
    await db.delete(pdfDocuments).where(eq(pdfDocuments.id, pdfId));

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, error: msg };
  }
}
