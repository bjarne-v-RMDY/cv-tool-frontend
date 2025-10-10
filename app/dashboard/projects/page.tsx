"use client"

import { Button } from "@/components/ui/button"
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, Briefcase, User } from "lucide-react"
import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

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

interface Person {
    Id: number
    Name: string
    Email: string
    Location: string | null
}

interface Project {
    Id: number
    Title: string
    Company: string
    Role: string | null
    Description: string | null
    StartDate: string | null
    EndDate: string | null
    IsCurrentJob: boolean
    Technologies: string[]
}

export default function ProjectsPage() {
    const [files, setFiles] = useState<File[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
    const [uploadErrors, setUploadErrors] = useState<UploadError[]>([])
    const [people, setPeople] = useState<Person[]>([])
    const [selectedUserId, setSelectedUserId] = useState<string>("")
    const [projects, setProjects] = useState<Project[]>([])
    const [isLoadingPeople, setIsLoadingPeople] = useState(true)
    const [isLoadingProjects, setIsLoadingProjects] = useState(false)

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

    const fetchPeople = useCallback(async () => {
        try {
            setIsLoadingPeople(true)
            const response = await fetch('/api/people')
            if (response.ok) {
                const data = await response.json()
                setPeople(data.people || [])
            }
        } catch (error) {
            console.error('Failed to fetch people:', error)
        } finally {
            setIsLoadingPeople(false)
        }
    }, [])

    const fetchProjects = useCallback(async (userId: string) => {
        if (!userId) {
            setProjects([])
            return
        }

        try {
            setIsLoadingProjects(true)
            const response = await fetch(`/api/projects?userId=${userId}`)
            if (response.ok) {
                const data = await response.json()
                setProjects(data.projects || [])
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error)
        } finally {
            setIsLoadingProjects(false)
        }
    }, [])

    const handleUpload = useCallback(async () => {
        if (files.length === 0 || !selectedUserId) return

        setIsUploading(true)
        setUploadResults([])
        setUploadErrors([])

        try {
            const formData = new FormData()
            files.forEach(file => {
                formData.append('files', file)
            })
            formData.append('userId', selectedUserId)

            const response = await fetch('/api/projects/upload', {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()

            if (response.ok) {
                setUploadResults(result.uploadedFiles || [])
                setUploadErrors(result.errors || [])
                setFiles([]) // Clear files after successful upload
                fetchProjects(selectedUserId) // Refresh project list
            } else {
                setUploadErrors([{ fileName: 'Upload failed', error: result.error || 'Unknown error' }])
            }
        } catch (error) {
            console.error('Upload error:', error)
            setUploadErrors([{ fileName: 'Upload failed', error: 'Network error' }])
        } finally {
            setIsUploading(false)
        }
    }, [files, selectedUserId, fetchProjects])

    useEffect(() => {
        fetchPeople()
    }, [fetchPeople])

    useEffect(() => {
        if (selectedUserId) {
            fetchProjects(selectedUserId)
        }
    }, [selectedUserId, fetchProjects])

    const selectedPerson = people.find(p => p.Id.toString() === selectedUserId)

    return (
        <div className="h-screen flex flex-col">
            {/* Header Toolbar */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center justify-between px-3 sm:px-4 md:px-8 py-3 sm:py-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                            <span className="rmdy-accent">Project</span> Management
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
                            Upload project documents to enrich user profiles
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-8">
                <div className="space-y-4 sm:space-y-6">
                    {/* User Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <User className="h-5 w-5" />
                                Select User
                            </CardTitle>
                            <CardDescription>
                                Choose the user to add project information to
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Choose a user..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {isLoadingPeople ? (
                                        <div className="p-2 text-center text-sm text-muted-foreground">
                                            Loading users...
                                        </div>
                                    ) : people.length > 0 ? (
                                        people.map(person => (
                                            <SelectItem key={person.Id} value={person.Id.toString()}>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{person.Name}</span>
                                                    <span className="text-xs text-muted-foreground">{person.Email}</span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="p-2 text-center text-sm text-muted-foreground">
                                            No users found
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>

                            {selectedPerson && (
                                <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-full bg-primary/10 p-2">
                                            <User className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{selectedPerson.Name}</p>
                                            <p className="text-sm text-muted-foreground">{selectedPerson.Email}</p>
                                            {selectedPerson.Location && (
                                                <p className="text-xs text-muted-foreground mt-1">{selectedPerson.Location}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Upload Zone */}
                    {selectedUserId && (
                        <>
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
                                            Drag and drop project files here
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
                                        PDF and TXT files containing project information
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
                                            disabled={isUploading || files.length === 0 || !selectedUserId}
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
                                                                Processing started - projects will be added soon
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
                        </>
                    )}

                    {/* Current Projects Display */}
                    {selectedUserId && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between gap-2 text-base sm:text-lg">
                                    <span className="flex items-center gap-2">
                                        <Briefcase className="h-5 w-5" />
                                        <span className="truncate">Current Projects</span>
                                    </span>
                                    {projects.length > 0 && (
                                        <span className="text-xs sm:text-sm font-normal text-muted-foreground flex-shrink-0">
                                            {projects.length} project{projects.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </CardTitle>
                                <CardDescription>
                                    Projects currently associated with this user
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoadingProjects ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 animate-spin" />
                                        <p className="text-sm">Loading projects...</p>
                                    </div>
                                ) : projects.length > 0 ? (
                                    <div className="space-y-4">
                                        {projects.map((project) => (
                                            <div
                                                key={project.Id}
                                                className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-sm sm:text-base">
                                                            {project.Title}
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            {project.Company}
                                                            {project.Role && ` • ${project.Role}`}
                                                        </p>
                                                    </div>
                                                    {project.IsCurrentJob && (
                                                        <Badge variant="secondary" className="flex-shrink-0">
                                                            Current
                                                        </Badge>
                                                    )}
                                                </div>
                                                {project.Description && (
                                                    <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
                                                        {project.Description}
                                                    </p>
                                                )}
                                                {project.Technologies.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-3">
                                                        {project.Technologies.slice(0, 8).map((tech, idx) => (
                                                            <Badge key={idx} variant="outline" className="text-xs">
                                                                {tech}
                                                            </Badge>
                                                        ))}
                                                        {project.Technologies.length > 8 && (
                                                            <Badge variant="outline" className="text-xs">
                                                                +{project.Technologies.length - 8} more
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>No projects yet</p>
                                        <p className="text-sm">Upload a project file to get started</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}

