"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Briefcase, MapPin, Calendar, DollarSign, Loader2, User, CheckCircle2, Circle, AlertCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface Requirement {
    RequirementType: string
    RequirementValue: string
    IsRequired: boolean
    Priority: number
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
    requirements: Requirement[]
}

interface RequirementMatch {
    requirement: string
    type: string
    matched: boolean
    evidence: string
    isRequired: boolean
    priority: number
}

interface Candidate {
    score?: number
    userId: string
    name: string
    email?: string
    seniority?: string
    yearsOfExperience?: number
    location?: string
    summary?: string
    skills?: string[]
    preferredRoles?: string[]
    tools?: string[]
    languagesSpoken?: string[]
    overallScore?: number
    matchedRequirements?: string[]
    missingRequirements?: string[]
    reasoning?: string
    requirementBreakdown?: RequirementMatch[]
}

interface MatchResponse {
    success: boolean
    vacancy: Vacancy
    candidates: Candidate[]
    searchQuery: string
}

export default function VacancyDetailPage() {
    const params = useParams()
    const vacancyId = params.id as string
    const [data, setData] = useState<MatchResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true)
                const response = await fetch(`/api/vacancies/${vacancyId}/match`)

                if (!response.ok) {
                    throw new Error('Failed to fetch vacancy data')
                }

                const result = await response.json()
                setData(result)
            } catch (err) {
                console.error('Error fetching vacancy:', err)
                setError(err instanceof Error ? err.message : 'Failed to load vacancy')
            } finally {
                setIsLoading(false)
            }
        }

        if (vacancyId) {
            fetchData()
        }
    }, [vacancyId])

    if (isLoading) {
        return (
            <div className="flex flex-col h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">Loading vacancy details...</p>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="flex flex-col h-full items-center justify-center">
                <p className="text-destructive">{error || 'Vacancy not found'}</p>
                <Link href="/dashboard/vacancies">
                    <Button variant="outline" className="mt-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Vacancies
                    </Button>
                </Link>
            </div>
        )
    }

    const { vacancy, candidates } = data

    // Group requirements by type
    const requirementsByType = vacancy.requirements.reduce((acc, req) => {
        if (!acc[req.RequirementType]) {
            acc[req.RequirementType] = []
        }
        acc[req.RequirementType].push(req)
        return acc
    }, {} as Record<string, Requirement[]>)

    const getPriorityColor = (priority: number) => {
        switch (priority) {
            case 1: return 'text-red-600 dark:text-red-400'
            case 2: return 'text-yellow-600 dark:text-yellow-400'
            case 3: return 'text-green-600 dark:text-green-400'
            default: return 'text-muted-foreground'
        }
    }

    const getPriorityLabel = (priority: number) => {
        switch (priority) {
            case 1: return 'High'
            case 2: return 'Medium'
            case 3: return 'Low'
            default: return 'Unknown'
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Fixed Header */}
            <div className="shrink-0 p-4 md:p-8 pb-4 border-b bg-background">
                <div className="flex items-start gap-4">
                    <Link href="/dashboard/vacancies">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-bold">{vacancy.Title}</h1>
                        {vacancy.Client && (
                            <p className="text-lg text-muted-foreground mt-1">{vacancy.Client}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {vacancy.RemoteWork && (
                                <Badge variant="secondary">Remote</Badge>
                            )}
                            {vacancy.Location && (
                                <Badge variant="outline" className="gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {vacancy.Location}
                                </Badge>
                            )}
                            {vacancy.Duration && (
                                <Badge variant="outline" className="gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {vacancy.Duration}
                                </Badge>
                            )}
                            {vacancy.Budget && (
                                <Badge variant="outline" className="gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {vacancy.Budget}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-8 pt-6">
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left Column - Vacancy Details */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Description */}
                        {vacancy.Description && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Briefcase className="h-5 w-5" />
                                        Description
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {vacancy.Description}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Requirements */}
                        {Object.keys(requirementsByType).length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Requirements</CardTitle>
                                    <CardDescription>
                                        {vacancy.requirements.length} total requirements
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {Object.entries(requirementsByType).map(([type, reqs]) => (
                                        <div key={type}>
                                            <h4 className="font-medium text-sm mb-2">{type}</h4>
                                            <div className="space-y-1">
                                                {reqs.map((req, idx) => (
                                                    <div key={idx} className="flex items-start gap-2 text-sm">
                                                        {req.IsRequired ? (
                                                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                                        ) : (
                                                            <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                                        )}
                                                        <div className="flex-1">
                                                            <span className={req.IsRequired ? 'font-medium' : ''}>
                                                                {req.RequirementValue}
                                                            </span>
                                                            <span className={`ml-2 text-xs ${getPriorityColor(req.Priority)}`}>
                                                                {getPriorityLabel(req.Priority)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {type !== Object.keys(requirementsByType)[Object.keys(requirementsByType).length - 1] && (
                                                <Separator className="mt-3" />
                                            )}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right Column - Matched Candidates */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Matched Candidates
                                </CardTitle>
                                <CardDescription>
                                    {candidates.length > 0
                                        ? `Found ${candidates.length} matching candidate${candidates.length !== 1 ? 's' : ''}`
                                        : 'No matching candidates found'
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {candidates.length > 0 ? (
                                    <div className="space-y-4">
                                        {candidates.map((candidate) => {
                                            const matchScore = candidate.overallScore ?? (candidate.score ? Math.round(candidate.score * 100) : 0)
                                            const getScoreColor = (score: number) => {
                                                if (score >= 80) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950'
                                                if (score >= 60) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950'
                                                return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950'
                                            }

                                            return (
                                                <div
                                                    key={candidate.userId}
                                                    className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                                                >
                                                    <Link
                                                        href={`/dashboard/people/${candidate.userId}`}
                                                        className="block"
                                                    >
                                                        <div className="flex items-start justify-between gap-3 mb-3">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h4 className="font-semibold">{candidate.name}</h4>
                                                                    <Badge className={`text-xs ${getScoreColor(matchScore)}`}>
                                                                        {matchScore}% match
                                                                    </Badge>
                                                                </div>
                                                                {candidate.email && (
                                                                    <p className="text-sm text-muted-foreground">{candidate.email}</p>
                                                                )}
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    {candidate.seniority && (
                                                                        <Badge variant="outline" className="capitalize">
                                                                            {candidate.seniority}
                                                                        </Badge>
                                                                    )}
                                                                    {candidate.yearsOfExperience !== undefined && (
                                                                        <Badge variant="outline">
                                                                            {candidate.yearsOfExperience}+ years
                                                                        </Badge>
                                                                    )}
                                                                    {candidate.location && (
                                                                        <Badge variant="outline" className="gap-1">
                                                                            <MapPin className="h-3 w-3" />
                                                                            {candidate.location}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Link>

                                                    {/* Match Details */}
                                                    {candidate.reasoning && (
                                                        <div className="mb-3 p-3 bg-muted/50 rounded text-sm">
                                                            <p className="text-muted-foreground italic">{candidate.reasoning}</p>
                                                        </div>
                                                    )}

                                                    {/* Matched and Missing Requirements */}
                                                    {(candidate.matchedRequirements || candidate.missingRequirements) && (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                                            {candidate.matchedRequirements && candidate.matchedRequirements.length > 0 && (
                                                                <div className="space-y-1">
                                                                    <h5 className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                        Matched ({candidate.matchedRequirements.length})
                                                                    </h5>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {candidate.matchedRequirements.slice(0, 5).map((req, idx) => (
                                                                            <Badge key={idx} variant="outline" className="text-xs border-green-200 dark:border-green-800">
                                                                                {req}
                                                                            </Badge>
                                                                        ))}
                                                                        {candidate.matchedRequirements.length > 5 && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                +{candidate.matchedRequirements.length - 5}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {candidate.missingRequirements && candidate.missingRequirements.length > 0 && (
                                                                <div className="space-y-1">
                                                                    <h5 className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                                                                        <XCircle className="h-3 w-3" />
                                                                        Missing ({candidate.missingRequirements.length})
                                                                    </h5>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {candidate.missingRequirements.slice(0, 5).map((req, idx) => (
                                                                            <Badge key={idx} variant="outline" className="text-xs border-red-200 dark:border-red-800">
                                                                                {req}
                                                                            </Badge>
                                                                        ))}
                                                                        {candidate.missingRequirements.length > 5 && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                +{candidate.missingRequirements.length - 5}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Requirement Breakdown Details */}
                                                    {candidate.requirementBreakdown && candidate.requirementBreakdown.length > 0 && (
                                                        <details className="text-sm">
                                                            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                                                                View detailed requirement breakdown
                                                            </summary>
                                                            <div className="mt-2 space-y-2 pl-2 border-l-2">
                                                                {candidate.requirementBreakdown.map((reqMatch, idx) => (
                                                                    <div key={idx} className="flex items-start gap-2">
                                                                        {reqMatch.matched ? (
                                                                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                                                        ) : (
                                                                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                                                        )}
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`font-medium ${reqMatch.matched ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                                    {reqMatch.requirement}
                                                                                </span>
                                                                                {reqMatch.isRequired && (
                                                                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                                                                )}
                                                                                <Badge variant="outline" className="text-xs">{reqMatch.type}</Badge>
                                                                            </div>
                                                                            <p className="text-xs text-muted-foreground mt-1">{reqMatch.evidence}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </details>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>No matching candidates found</p>
                                        <p className="text-sm">Try adjusting the requirements or wait for more candidates to be indexed</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

