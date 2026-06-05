import { useCallback, useState } from 'react'
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn, formatFileSize, isValidFileType } from '@/lib/utils'

const ACCEPTED_TYPES = ['.jpg', '.jpeg', '.png', '.pdf', 'image/jpeg', 'image/png', 'application/pdf']
const IMAGE_TYPES = ['.jpg', '.jpeg', '.png', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

interface DocumentUploaderProps {
  label: string
  description?: string
  acceptImages?: boolean
  acceptPdf?: boolean
  value?: File | null
  onChange: (file: File | null) => void
  error?: string
}

export function DocumentUploader({
  label, description, acceptImages = true, acceptPdf = false,
  value, onChange, error
}: DocumentUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const acceptTypes = [
    ...(acceptImages ? IMAGE_TYPES : []),
    ...(acceptPdf ? ['.pdf', 'application/pdf'] : []),
  ]

  const validateAndSet = (file: File) => {
    setFileError(null)
    if (!isValidFileType(file, acceptTypes)) {
      const typeStr = [acceptImages && 'JPG/PNG', acceptPdf && 'PDF'].filter(Boolean).join(' or ')
      setFileError(`Only ${typeStr} files are accepted`)
      return
    }
    if (file.size > MAX_SIZE) {
      setFileError('File size must be under 10MB')
      return
    }
    onChange(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) validateAndSet(file)
  }, [acceptTypes])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSet(file)
    e.target.value = ''
  }

  const accept = [
    ...(acceptImages ? ['image/jpeg', 'image/png'] : []),
    ...(acceptPdf ? ['application/pdf'] : []),
  ].join(',')

  const isImage = value && value.type.startsWith('image/')
  const preview = isImage ? URL.createObjectURL(value!) : null

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">{label}</div>
      {description && <div className="text-xs text-muted-foreground">{description}</div>}

      {value ? (
        <div className="relative border-2 border-[#34C270] bg-green-50/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            {preview ? (
              <img src={preview} alt="preview" className="w-16 h-16 object-cover rounded-lg border" />
            ) : (
              <div className="w-16 h-16 bg-[#063840]/10 rounded-lg flex items-center justify-center">
                <FileText className="w-8 h-8 text-[#063840]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#34C270] shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{value.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{formatFileSize(value.size)}</span>
            </div>
            <button
              type="button"
              onClick={() => { onChange(null); setFileError(null) }}
              className="p-1 rounded-full hover:bg-black/5 transition-colors shrink-0"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      ) : (
        <label
          className={cn(
            'relative flex flex-col items-center justify-center min-h-[120px] border-2 border-dashed rounded-xl cursor-pointer transition-all',
            dragging ? 'border-[#063840] bg-[#063840]/5 scale-[1.01]' : 'border-border hover:border-[#6FC2CB] hover:bg-[#6FC2CB]/5',
            (error || fileError) && 'border-red-400 bg-red-50'
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input type="file" className="sr-only" accept={accept} onChange={onFileInput} />
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <Upload className={cn('w-8 h-8', dragging ? 'text-[#063840]' : 'text-muted-foreground')} />
            <div>
              <span className="text-sm font-medium text-[#063840]">Click to upload</span>
              <span className="text-sm text-muted-foreground"> or drag and drop</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {[acceptImages && 'JPG, PNG', acceptPdf && 'PDF'].filter(Boolean).join(', ')} · Max 10MB
            </div>
          </div>
        </label>
      )}

      {(error || fileError) && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5" />
          {error || fileError}
        </div>
      )}
    </div>
  )
}

export { ACCEPTED_TYPES, MAX_SIZE }
