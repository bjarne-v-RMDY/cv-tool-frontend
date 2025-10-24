"use client"

import { useState, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

function UploadPageContent() {
    const searchParams = useSearchParams()
    const uploadType = searchParams.get('type') || 'cv'
    const token = searchParams.get('token')
    const userId = searchParams.get('userId')

    const [file, setFile] = useState<File | null>(null)
    const [isDragOver, setIsDragOver] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadSuccess, setUploadSuccess] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)

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

        // Only take the first file
        if (droppedFiles.length > 0) {
            setFile(droppedFiles[0])
        }
    }, [])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0]
            if (selectedFile.type === "application/pdf" || selectedFile.type === "text/plain" ||
                selectedFile.name.endsWith('.pdf') || selectedFile.name.endsWith('.txt')) {
                setFile(selectedFile)
            }
        }
    }, [])

    const removeFile = useCallback(() => {
        setFile(null)
    }, [])

    const handleUpload = useCallback(async () => {
        if (!file) return

        if (!token) {
            setUploadError('Invalid upload link. Please request a new link from Slack.')
            return
        }

        setIsUploading(true)
        setUploadError(null)

        try {
            const formData = new FormData()
            formData.append('files', file)

            if (userId) {
                formData.append('userId', userId)
            }

            let endpoint = '/api/upload'
            if (uploadType === 'project') {
                endpoint = '/api/projects/upload'
            } else if (uploadType === 'vacancy') {
                endpoint = '/api/vacancies/upload'
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Upload-Token': token,
                },
            })

            if (response.ok) {
                setUploadSuccess(true)
                setFile(null)
                toast.success("File uploaded successfully!")
            } else {
                const error = await response.json()
                setUploadError(error.error || 'Upload failed. The link may have expired.')
                toast.error("Upload failed. Please try again.")
            }
        } catch (error) {
            console.error('Upload error:', error)
            setUploadError('Network error. Please check your connection and try again.')
            toast.error("Network error during upload.")
        } finally {
            setIsUploading(false)
        }
    }, [file, token, userId, uploadType])

    const getTitle = () => {
        switch (uploadType) {
            case 'cv':
                return '📄 Upload CV'
            case 'project':
                return '📁 Upload Project Documents'
            case 'vacancy':
                return '💼 Upload Vacancy'
            default:
                return '📤 Upload Files'
        }
    }

    const getDescription = () => {
        switch (uploadType) {
            case 'cv':
                return 'Upload your CV file (PDF or TXT format)'
            case 'project':
                return 'Upload project documentation files (PDF or TXT format)'
            case 'vacancy':
                return 'Upload job vacancy document (PDF or TXT format)'
            default:
                return 'Upload your files'
        }
    }

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            Invalid Upload Link
                        </CardTitle>
                        <CardDescription>
                            This upload link is invalid or has expired.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Please request a new upload link from Slack using the appropriate command:
                        </p>
                        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                            <li>• <code>/upload-cv</code> - For CV uploads</li>
                            <li>• <code>/upload-project</code> - For project documents</li>
                            <li>• <code>/upload-vacancy</code> - For job vacancies</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (uploadSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-5 w-5" />
                            Upload Successful!
                        </CardTitle>
                        <CardDescription>
                            Your file has been uploaded and queued for processing.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            You&apos;ll receive a notification in Slack once processing is complete.
                        </p>
                        <Button
                            onClick={() => {
                                setUploadSuccess(false)
                                setFile(null)
                            }}
                            variant="outline"
                            className="w-full"
                        >
                            Upload Another File
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>{getTitle()}</CardTitle>
                    <CardDescription>{getDescription()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Upload Zone */}
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
                                    Drag and drop your file here
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    or click to browse
                                </p>
                            </div>
                            <Button asChild variant="outline">
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <input
                                        id="file-upload"
                                        type="file"
                                        accept=".pdf,.txt,application/pdf,text/plain"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    Choose File
                                </label>
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                PDF or TXT file (max 10MB)
                            </p>
                        </div>
                    </div>

                    {/* Error Message */}
                    {uploadError && (
                        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-800 dark:text-red-200">{uploadError}</p>
                        </div>
                    )}

                    {/* File Preview */}
                    {file && (
                        <div className="space-y-2">
                            <h3 className="text-lg font-medium">Selected File</h3>
                            <div className="flex items-center gap-3 rounded-lg border p-3">
                                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
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
                                    size="icon"
                                    onClick={removeFile}
                                    className="h-8 w-8 flex-shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Upload Button */}
                            <div className="pt-4">
                                <Button
                                    onClick={handleUpload}
                                    disabled={isUploading || !file}
                                    className="w-full"
                                    size="lg"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload File
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="text-center text-xs text-muted-foreground pt-4 border-t">
                        <p>This upload link will expire in 15 minutes.</p>
                        <p className="mt-1">Uploaded via Slack Bot</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function UploadPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <UploadPageContent />
        </Suspense>
    )
}

