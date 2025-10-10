"use client"

import { Button } from "@/components/ui/button"
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, Briefcase, Calendar, MapPin } from "lucide-react"
import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface UploadResult {
    fileName: string
    uniqueFileName: string
    size: number
    uploadedAt: string
}

interface UploadError {
    fileName: string
    error: string
}

interface Vacancy {
    Id: number
    Title: string
    Client: string | null
    Description: string | null
    Location: string | null
    Duration: string | null
    RemoteWork: boolean
    StartDate: string | null
    Budget: string | null
    CreatedAt: string
    RequirementsCount?: number
}

export default function VacanciesPage() {
    const [files, setFiles] = useState<File[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
    const [uploadErrors, setUploadErrors] = useState<UploadError[]>([])
    const [vacancies, setVacancies] = useState<Vacancy[]>([])
    const [isLoadingVacancies, setIsLoadingVacancies] = useState(true)

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

    const fetchVacancies = useCallback(async () => {
        try {
            setIsLoadingVacancies(true)
            const response = await fetch('/api/vacancies')
            if (response.ok) {
                const data = await response.json()
                setVacancies(data.vacancies || [])
            }
        } catch (error) {
            console.error('Failed to fetch vacancies:', error)
        } finally {
            setIsLoadingVacancies(false)
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

            const response = await fetch('/api/vacancies/upload', {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()

            if (response.ok) {
                setUploadResults(result.uploadedFiles || [])
                setUploadErrors(result.errors || [])
                setFiles([]) // Clear files after successful upload
                fetchVacancies() // Refresh vacancy list
            } else {
                setUploadErrors([{ fileName: 'Upload failed', error: result.error || 'Unknown error' }])
            }
        } catch (error) {
            console.error('Upload error:', error)
            setUploadErrors([{ fileName: 'Upload failed', error: 'Network error' }])
        } finally {
            setIsUploading(false)
        }
    }, [files, fetchVacancies])

    useEffect(() => {
        fetchVacancies()
    }, [fetchVacancies])

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Not specified'
        return new Date(dateString).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        })
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header Toolbar */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
                <div className="flex items-center justify-between px-3 sm:px-4 md:px-8 py-3 sm:py-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                            <span className="rmdy-accent">Vacancy</span> Management
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
                            Upload vacancy documents and find matching candidates
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 md:p-8">
                <div className="space-y-4 sm:space-y-6">
                    {/* Upload Zone */}
                    <div
                        className={`border-2 border-dashed rounded-xl p-6 sm:p-10 text-center transition-all ${isDragOver
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50"
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="flex flex-col items-center gap-3 sm:gap-4">
                            <div className="rounded-xl bg-primary/10 p-3 sm:p-4">
                                <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                            </div>
                            <div className="space-y-1 sm:space-y-2">
                                <p className="text-base sm:text-lg font-medium">
                                    Drag and drop vacancy files here
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    or click to browse files
                                </p>
                            </div>
                            <Button asChild variant="outline" size="sm" className="sm:size-default">
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
                                PDF and TXT files containing job requirements and descriptions
                            </p>
                        </div>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-base sm:text-lg font-medium">Selected Files</h3>
                            <div className="space-y-2">
                                {files.map((file, index) => (
                                    <div
                                        key={`${file.name}-${index}`}
                                        className="flex items-center gap-2 sm:gap-3 rounded-lg border p-2 sm:p-3"
                                    >
                                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs sm:text-sm font-medium truncate">
                                                {file.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeFile(index)}
                                            className="h-8 w-8 flex-shrink-0"
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
                                            Processing...
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
                        <div className="space-y-3 sm:space-y-4">
                            <h3 className="text-base sm:text-lg font-medium">Upload Results</h3>

                            {/* Success Results */}
                            {uploadResults.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">
                                        Successfully Uploaded ({uploadResults.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {uploadResults.map((result, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-2 sm:gap-3 rounded-lg border border-green-200 bg-green-50 p-2 sm:p-3 dark:border-green-800 dark:bg-green-950"
                                            >
                                                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-200 truncate">
                                                        {result.fileName}
                                                    </p>
                                                    <p className="text-xs text-green-600 dark:text-green-400">
                                                        Processing - vacancy will appear soon
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
                                    <h4 className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">
                                        Upload Errors ({uploadErrors.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {uploadErrors.map((error, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-2 sm:gap-3 rounded-lg border border-red-200 bg-red-50 p-2 sm:p-3 dark:border-red-800 dark:bg-red-950"
                                            >
                                                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-medium text-red-800 dark:text-red-200 truncate">
                                                        {error.fileName}
                                                    </p>
                                                    <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">
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

                    {/* Vacancies List */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between gap-2 text-base sm:text-lg">
                                <span className="flex items-center gap-2">
                                    <Briefcase className="h-5 w-5" />
                                    <span className="truncate">Open Vacancies</span>
                                </span>
                                {vacancies.length > 0 && (
                                    <span className="text-xs sm:text-sm font-normal text-muted-foreground flex-shrink-0">
                                        {vacancies.length} {vacancies.length === 1 ? 'vacancy' : 'vacancies'}
                                    </span>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Click on a vacancy to view details and find matching candidates
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingVacancies ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 animate-spin" />
                                    <p className="text-sm">Loading vacancies...</p>
                                </div>
                            ) : vacancies.length > 0 ? (
                                <div className="space-y-4">
                                    {vacancies.map((vacancy) => (
                                        <Link
                                            key={vacancy.Id}
                                            href={`/dashboard/vacancies/${vacancy.Id}`}
                                            className="block"
                                        >
                                            <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-sm sm:text-base">
                                                            {vacancy.Title}
                                                        </h4>
                                                        {vacancy.Client && (
                                                            <p className="text-sm text-muted-foreground">
                                                                {vacancy.Client}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {vacancy.RemoteWork && (
                                                        <Badge variant="secondary" className="flex-shrink-0">
                                                            Remote
                                                        </Badge>
                                                    )}
                                                </div>
                                                {vacancy.Description && (
                                                    <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
                                                        {vacancy.Description}
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                                                    {vacancy.Location && (
                                                        <div className="flex items-center gap-1">
                                                            <MapPin className="h-3 w-3" />
                                                            <span>{vacancy.Location}</span>
                                                        </div>
                                                    )}
                                                    {vacancy.Duration && (
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>{vacancy.Duration}</span>
                                                        </div>
                                                    )}
                                                    {vacancy.StartDate && (
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>Start: {formatDate(vacancy.StartDate)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {vacancy.RequirementsCount !== undefined && vacancy.RequirementsCount > 0 && (
                                                    <div className="mt-2">
                                                        <Badge variant="outline" className="text-xs">
                                                            {vacancy.RequirementsCount} requirements
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No vacancies yet</p>
                                    <p className="text-sm">Upload a vacancy file to get started</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

