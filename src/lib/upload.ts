export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const UPLOAD_ENDPOINT = process.env.NEXT_PUBLIC_UPLOAD_URL ?? '/upload';

/**
 * Server mengembalikan path relatif (`/uploads/<file>`). Kalau endpoint-nya
 * beda origin dari halaman, path itu harus dijadikan absolut supaya <img>
 * menunjuk ke server upload, bukan ke origin halaman.
 */
function resolveUploadUrl(url: string, endpoint: string): string {
  const endpointUrl = new URL(endpoint, window.location.href);
  const resolved = new URL(url, endpointUrl);
  return resolved.origin === window.location.origin
    ? resolved.pathname + resolved.search
    : resolved.href;
}

export async function uploadImage(file: File, endpoint: string = UPLOAD_ENDPOINT): Promise<string> {
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
    throw new Error('Format harus JPEG, PNG, atau WebP.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Ukuran file maksimal 8 MB.');
  }

  // Tanpa header Content-Type custom: browser memakai MIME File (image/*,
  // safelisted) sehingga tidak memicu preflight OPTIONS saat cross-origin.
  // Server tetap menentukan tipe dari magic bytes.
  const res = await fetch(endpoint, {
    method: 'POST',
    body: file,
  });

  if (!res.ok) {
    const message =
      res.status === 413
        ? 'Ukuran file terlalu besar.'
        : res.status === 400
          ? 'File bukan gambar JPEG/PNG/WebP.'
          : 'Upload gagal. Coba lagi.';
    throw new Error(message);
  }

  let data: { url?: unknown };
  try {
    data = (await res.json()) as { url?: unknown };
  } catch {
    throw new Error('Respons upload tidak valid.');
  }
  if (typeof data.url !== 'string' || !data.url) {
    throw new Error('Respons upload tidak valid.');
  }
  return resolveUploadUrl(data.url, endpoint);
}
