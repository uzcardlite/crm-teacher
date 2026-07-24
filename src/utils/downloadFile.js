// Turns an axios blob response into a browser download. The file name comes
// from Content-Disposition when the server sends one, otherwise from the
// caller-supplied fallback.
export function saveBlobResponse(response, fallbackName) {
  const disposition = response.headers?.["content-disposition"] || "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const fileName = match ? decodeURIComponent(match[1].trim()) : fallbackName;

  const url = URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
