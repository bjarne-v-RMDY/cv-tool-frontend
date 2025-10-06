"use client"

import { Button } from "@/components/ui/button"
import { Upload, FileText, X } from "lucide-react"
import { useState, useCallback } from "react"

export default function UploadPage() {
    const [files, setFiles] = useState<File[]>([])
    const [isDragOver, setIsDragOver] = useState(false)

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)

        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            file => file.type === "text/plain" || file.name.endsWith('.txt')
        )

        setFiles(prev => [...prev, ...droppedFiles])
    }, [])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files).filter(
                file => file.type === "text/plain" || file.name.endsWith('.txt')
            )
            setFiles(prev => [...prev, ...selectedFiles])
        }
    }, [])

    const removeFile = useCallback((index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }, [])

    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="space-y-4">
                <div>
                    <h1 className="text-2xl font-bold">Upload Files</h1>
                    <p className="text-muted-foreground">
                        Upload text files to process with CV-Tool
                    </p>
                </div>

                {/* Upload Zone */}
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-muted-foreground/50"
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center gap-4">
                        <div className="rounded-full bg-muted p-3">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-lg font-medium">
                                Drag and drop your files here
                            </p>
                            <p className="text-sm text-muted-foreground">
                                or click to browse files
                            </p>
                        </div>
                        <Button asChild variant="outline">
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <input
                                    id="file-upload"
                                    type="file"
                                    multiple
                                    accept=".txt,text/plain"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                Choose Files
                            </label>
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            Only .txt files are supported
                        </p>
                    </div>
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium">Selected Files</h3>
                        <div className="space-y-2">
                            {files.map((file, index) => (
                                <div
                                    key={`${file.name}-${index}`}
                                    className="flex items-center gap-3 rounded-lg border p-3"
                                >
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeFile(index)}
                                        className="h-8 w-8 p-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
