/** browser-side file saving. kept out of core/ so the core stays dom-free. */
export function downloadBlob(data: BlobPart, filename: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([data], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // revoke on the next tick — revoking synchronously can cancel the download
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function downloadMidi(bytes: Uint8Array, filename: string): void {
  downloadBlob(bytes as BlobPart, filename, 'audio/midi')
}

export function downloadText(text: string, filename: string, mime = 'text/plain'): void {
  downloadBlob(text, filename, mime)
}
