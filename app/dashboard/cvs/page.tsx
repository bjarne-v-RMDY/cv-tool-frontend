"use client"

import { Button } from "@/components/ui/button"
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, Download } from "lucide-react"
import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

interface CVFile {
    name: string
    uniqueName: string
    size: number
    uploadedAt: string
    contentType: string
    url: string
    metadata: Record<string, string>
}

export default function CVsPage() {
    const [files, setFiles] = useState<File[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
    const [uploadErrors, setUploadErrors] = useState<UploadError[]>([])
    const [cvFiles, setCvFiles] = useState<CVFile[]>([])
    const [isLoadingCVs, setIsLoadingCVs] = useState(true)

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

    const fetchCVs = useCallback(async () => {
        try {
            setIsLoadingCVs(true)
            const response = await fetch('/api/cvs')
            if (response.ok) {
                const data = await response.json()
                setCvFiles(data.files || [])
            }
        } catch (error) {
            console.error('Failed to fetch CVs:', error)
        } finally {
            setIsLoadingCVs(false)
        }
    }, [])

    const handleDownload = useCallback(async (fileName: string, originalName: string) => {
        try {
            const response = await fetch(`/api/cvs/download?file=${encodeURIComponent(fileName)}`)
            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = originalName
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
            } else {
                console.error('Download failed')
            }
        } catch (error) {
            console.error('Download error:', error)
        }
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
                fetchCVs() // Refresh CV list
            } else {
                setUploadErrors([{ fileName: 'Upload failed', error: result.error || 'Unknown error' }])
            }
        } catch (error) {
            console.error('Upload error:', error)
            setUploadErrors([{ fileName: 'Upload failed', error: 'Network error' }])
        } finally {
            setIsUploading(false)
        }
    }, [files, fetchCVs])

    useEffect(() => {
        fetchCVs()
    }, [fetchCVs])

    return (
        <div className="h-screen flex flex-col">
            {/* Header Toolbar */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center justify-between px-4 md:px-8 py-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            <span className="rmdy-accent">CV</span> Management
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Upload, view, and manage candidate CV files
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-4 md:p-8">
                <div className="space-y-6">
                    {/* Upload Zone with RMDY styling */}
                    <div
                        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${isDragOver
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50"
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="flex flex-col items-center gap-4">
                            <div className="rounded-xl bg-primary/10 p-4">
                                <Upload className="h-8 w-8 text-primary" />
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

                    {/* Uploaded CVs List */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Uploaded CVs</span>
                                {cvFiles.length > 0 && (
                                    <span className="text-sm font-normal text-muted-foreground">
                                        {cvFiles.length} file{cvFiles.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingCVs ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                                    <p>Loading CVs...</p>
                                </div>
                            ) : cvFiles.length > 0 ? (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {cvFiles.map((cv, index) => (
                                        <div
                                            key={cv.uniqueName}
                                            className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                                        >
                                            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {cv.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {(cv.size / 1024).toFixed(1)} KB • {new Date(cv.uploadedAt).toLocaleDateString()} {new Date(cv.uploadedAt).toLocaleTimeString()}
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDownload(cv.uniqueName, cv.name)}
                                                className="flex-shrink-0"
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Download
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No CVs uploaded yet</p>
                                    <p className="text-sm">Upload your first CV to get started</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
