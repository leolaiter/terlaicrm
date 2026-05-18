interface FileViewerProps {
  url: string
  fileType: string
  name?: string
}

export function FileViewer({ url, fileType, name }: FileViewerProps) {
  const isPdf = fileType === 'application/pdf' || url.endsWith('.pdf')
  const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url)

  if (isPdf) {
    return (
      <div className="w-full h-[600px] rounded-lg overflow-hidden border border-[#E5E5E5]">
        <iframe src={url} className="w-full h-full" title={name ?? 'PDF'} />
      </div>
    )
  }

  if (isImage) {
    return (
      <div className="flex flex-col gap-3">
        <img src={url} alt={name ?? 'Arquivo'} className="w-full rounded-lg border border-[#E5E5E5] object-contain max-h-[600px]" />
      </div>
    )
  }

  return (
    <div className="p-4 rounded-lg border border-[#E5E5E5] text-[#999] text-sm">
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#1A1A1A] underline">
        {name ?? 'Baixar arquivo'}
      </a>
    </div>
  )
}
