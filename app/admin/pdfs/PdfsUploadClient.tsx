"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  FileText,
  Loader2,
  MapPin,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  getPdfsByDepartment,
  deletePdf,
  uploadPdfs,
} from "@/app/actions/pdfs";
import type { DepartmentWithCount, PdfDocumentInfo } from "@/app/actions/pdfs";

/* ─── Status badge ──────────────────────────────────────────── */
function StatusBadge({ status }: Readonly<{ status: string }>) {
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    processing: "bg-blue-50 text-blue-700",
    done: "bg-emerald-50 text-emerald-700",
    error: "bg-red-50 text-red-600",
  };
  const labels: Record<string, string> = {
    pending: "Pendiente",
    processing: "Procesando",
    done: "Procesado",
    error: "Error",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

/* ─── Format file size ──────────────────────────────────────── */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ─── Department selector ───────────────────────────────────── */
function DepartmentSelector({
  departments,
  selectedId,
  onSelect,
}: Readonly<{
  departments: DepartmentWithCount[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );
  const selected = departments.find((d) => d.id === selectedId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-card-border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-primary/40"
      >
        <span className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {selected ? (
            <span className="text-foreground">{selected.name}</span>
          ) : (
            <span className="text-muted-foreground">
              Selecciona un departamento
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-card-border bg-card shadow-lg">
          <div className="border-b border-card-border p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar departamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.map((dept) => (
              <li key={dept.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(dept.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-primary-light/40 ${dept.id === selectedId ? "bg-primary-light/50" : ""
                    }`}
                >
                  <span className="text-foreground">{dept.name}</span>
                  {dept.pdfCount > 0 && (
                    <span className="rounded-full bg-secondary-light px-2 py-0.5 text-xs font-medium text-secondary-hover">
                      {dept.pdfCount} PDF{dept.pdfCount !== 1 && "s"}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-center text-sm text-muted-foreground">
                No se encontró ese departamento
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─── Upload zone ───────────────────────────────────────────── */
function UploadZone({
  departmentId,
  onUploadComplete,
}: Readonly<{
  departmentId: number | null;
  onUploadComplete: () => void;
}>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    uploaded: number;
    errors: string[];
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const pdfs = Array.from(fileList).filter(
      (f) => f.type === "application/pdf"
    );
    setSelectedFiles((prev) => [...prev, ...pdfs]);
    setResult(null);
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (!departmentId || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("departmentId", departmentId.toString());
      for (const file of selectedFiles) {
        formData.append("files", file);
      }

      const res = await uploadPdfs(formData);
      setResult({ uploaded: res.uploaded, errors: res.errors });
      if (res.uploaded > 0) {
        setSelectedFiles([]);
        onUploadComplete();
      }
    } catch {
      setResult({ uploaded: 0, errors: ["Error de conexión al subir los archivos."] });
    } finally {
      setUploading(false);
    }
  }

  const disabled = !departmentId;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${dragOver
          ? "border-primary bg-primary-light/30"
          : disabled
            ? "cursor-not-allowed border-card-border/50 opacity-40"
            : "cursor-pointer border-card-border hover:border-primary/40 hover:bg-accent-warm/30"
          }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {disabled
              ? "Selecciona un departamento primero"
              : "Arrastra tus PDFs aquí o haz clic para seleccionar"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Solo archivos PDF, máximo 50MB cada uno
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Selected files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            {selectedFiles.length} archivo{selectedFiles.length !== 1 && "s"}{" "}
            seleccionado{selectedFiles.length !== 1 && "s"}
          </p>
          <ul className="space-y-1.5">
            {selectedFiles.map((file, i) => (
              <li
                key={`${file.name}-${file.lastModified}-${i}`}
                className="flex items-center justify-between rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm"
              >
                <span className="flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate text-foreground">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatSize(file.size)}
                  </span>
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="ml-2 rounded-lg p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={handleUpload}
            disabled={uploading || disabled}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Subiendo y procesando (puede tardar varios minutos)...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Subir {selectedFiles.length} PDF
                {selectedFiles.length !== 1 && "s"}
              </>
            )}
          </button>
        </div>
      )}

      {/* Feedback */}
      {result && (
        <div className="space-y-2">
          {result.uploaded > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <Check className="h-4 w-4" />
              {result.uploaded} PDF{result.uploaded !== 1 && "s"} subido
              {result.uploaded !== 1 && "s"} correctamente.
            </div>
          )}
          {result.errors.map((err) => (
            <div
              key={err}
              className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {err}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── PDF list ──────────────────────────────────────────────── */
function PdfList({
  departmentId,
  refreshKey,
  onDelete,
}: Readonly<{
  departmentId: number;
  refreshKey: number;
  onDelete: () => void;
}>) {
  const [pdfs, setPdfs] = useState<PdfDocumentInfo[] | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [, startDeleteTransition] = useTransition();

  const currentKey = `${departmentId}-${refreshKey}`;
  const loading = loadedKey !== currentKey;

  useEffect(() => {
    let cancelled = false;

    getPdfsByDepartment(departmentId).then((docs) => {
      if (!cancelled) {
        setPdfs(docs);
        setLoadedKey(`${departmentId}-${refreshKey}`);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [departmentId, refreshKey]);

  function handleDelete(pdfId: number) {
    setDeletingId(pdfId);
    startDeleteTransition(async () => {
      const res = await deletePdf(pdfId);
      if (res.success) {
        setPdfs((prev) => prev?.filter((p) => p.id !== pdfId) ?? null);
        onDelete();
      }
      setDeletingId(null);
    });
  }

  if (loading || pdfs === null) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Cargando...
      </div>
    );
  }

  if (pdfs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-card-border py-10 text-center">
        <FileText className="mx-auto mb-2 h-8 w-8 text-muted" />
        <p className="text-sm text-muted-foreground">
          Aún no hay PDFs para este departamento.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {pdfs.map((pdf) => (
        <li
          key={pdf.id}
          className="flex items-center justify-between rounded-xl border border-card-border bg-card px-4 py-3"
        >
          <div className="flex items-center gap-3 truncate">
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <div className="truncate">
              <p className="truncate text-sm font-medium text-foreground">
                {pdf.originalName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatSize(pdf.fileSize)} ·{" "}
                {new Date(pdf.uploadedAt).toLocaleDateString("es-PE", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={pdf.status} />
            {pdf.pdfUrl && (
              <a
                href={pdf.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-light"
              >
                <Eye className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              onClick={() => handleDelete(pdf.id)}
              disabled={deletingId === pdf.id}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              title="Eliminar"
            >
              {deletingId === pdf.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ─── Main component ────────────────────────────────────────── */
export default function PdfsUploadClient({
  departments,
}: Readonly<{ departments: DepartmentWithCount[] }>) {
  const [selectedDept, setSelectedDept] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleRefresh() {
    setRefreshKey((k) => k + 1);
  }

  const selectedDeptData = departments.find((d) => d.id === selectedDept);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-card-border bg-card/50">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4 sm:px-6">
          <Link
            href="/"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary-light hover:text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Subir PDFs de Recetas
            </h1>
            <p className="text-sm text-muted-foreground">
              Organiza los PDFs por departamento
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6">
        {/* Departamento */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-foreground">
            Departamento
          </label>
          <DepartmentSelector
            departments={departments}
            selectedId={selectedDept}
            onSelect={setSelectedDept}
          />
        </div>

        {/* Upload */}
        <div className="mb-8">
          <UploadZone
            departmentId={selectedDept}
            onUploadComplete={handleRefresh}
          />
        </div>

        {/* PDFs existentes */}
        {selectedDept && (
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPin className="h-4 w-4 text-secondary" />
              PDFs de {selectedDeptData?.name}
            </h2>
            <PdfList
              departmentId={selectedDept}
              refreshKey={refreshKey}
              onDelete={handleRefresh}
            />
          </div>
        )}
      </div>
    </div>
  );
}
