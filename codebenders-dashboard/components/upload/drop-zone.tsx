"use client"

import { useCallback, useState, useRef } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DropZoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

export function DropZone({ onFile, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (disabled) return
      const file = e.dataTransfer.files[0]
      if (file) onFile(file)
    },
    [onFile, disabled]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragging(false), [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFile(file)
      e.target.value = ""
    },
    [onFile]
  )

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
        dragging
          ? "border-purple-500 bg-purple-50"
          : "border-muted-foreground/25 bg-muted/30 hover:border-muted-foreground/40"
      } ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
      <p className="font-semibold text-sm">Drag & drop your file here</p>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        .csv or .xlsx up to 50 MB
      </p>
      <Button
        variant="default"
        size="sm"
        className="bg-purple-600 hover:bg-purple-700"
        onClick={(e) => {
          e.stopPropagation()
          inputRef.current?.click()
        }}
        disabled={disabled}
      >
        Browse Files
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
