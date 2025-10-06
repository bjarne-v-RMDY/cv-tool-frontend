"use client"

import { Button } from "@/components/ui/button"
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useState, useCallback } from "react"

interface UploadResult {
    fileName: string
    uniqueFileName: string
    url: string
    size: number
    uploadedAt: string
    etag: string
}

interface UploadError {
    fileName: string
    error: string
}

export default function UploadPage() {
    const [files, setFiles] = useState<File[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
    const [uploadErrors, setUploadErrors] = useState<UploadError[]>([])

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
            file => file.type === "application/pdf" || file.type === "text/plain" ||
                file.name.endsWith('.pdf') || file.name.endsWith('.txt')
        )

        setFiles(prev => [...prev, ...droppedFiles])
    }, [])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files).filter(
                file => file.type === "application/pdf" || file.type === "text/plain" ||
                    file.name.endsWith('.pdf') || file.name.endsWith('.txt')
            )
            setFiles(prev => [...prev, ...selectedFiles])
        }
    }, [])

    const removeFile = useCallback((index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }, [])

    const handleUpload = useCallback(async () => {
        if (files.length === 0) return

        setIsUploading(true)
        setUploadResults([])
        setUploadErrors([])

        try {
            const formData = new FormData()
            files.forEach(file => {
                formData.append('files', file)
            })

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()

            if (response.ok) {
                setUploadResults(result.uploadedFiles || [])
                setUploadErrors(result.errors || [])
                setFiles([]) // Clear files after successful upload
            } else {
                setUploadErrors([{ fileName: 'Upload failed', error: result.error || 'Unknown error' }])
            }
        } catch (error) {
            console.error('Upload error:', error)
            setUploadErrors([{ fileName: 'Upload failed', error: 'Network error' }])
        } finally {
            setIsUploading(false)
        }
    }, [files])

    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="space-y-4">
                <div>
                    <h1 className="text-2xl font-bold">Upload CV Files</h1>
                    <p className="text-muted-foreground">
                        Upload PDF or TXT files to process with CV-Tool
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
                                    accept=".pdf,.txt,application/pdf,text/plain"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                Choose Files
                            </label>
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            PDF and TXT files are supported (max 10MB each)
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

                        {/* Upload Button */}
                        <div className="pt-4">
                            <Button
                                onClick={handleUpload}
                                disabled={isUploading || files.length === 0}
                                className="w-full"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload {files.length} file{files.length !== 1 ? 's' : ''}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Upload Results */}
                {(uploadResults.length > 0 || uploadErrors.length > 0) && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Upload Results</h3>

                        {/* Success Results */}
                        {uploadResults.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-green-600 dark:text-green-400">
                                    Successfully Uploaded ({uploadResults.length})
                                </h4>
                                <div className="space-y-2">
                                    {uploadResults.map((result, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950"
                                        >
                                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                                    {result.fileName}
                                                </p>
                                                <p className="text-xs text-green-600 dark:text-green-400">
                                                    {(result.size / 1024).toFixed(1)} KB • Uploaded successfully
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Error Results */}
                        {uploadErrors.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-red-600 dark:text-red-400">
                                    Upload Errors ({uploadErrors.length})
                                </h4>
                                <div className="space-y-2">
                                    {uploadErrors.map((error, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950"
                                        >
                                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                                    {error.fileName}
                                                </p>
                                                <p className="text-xs text-red-600 dark:text-red-400">
                                                    {error.error}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
