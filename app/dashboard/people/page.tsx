'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Mail, Phone, MapPin, Linkedin, Github, Globe, Briefcase, Calendar, Award } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface Project {
    Id: number
    Title: string
    Company: string
    Role: string | null
    Description: string | null
    Technologies: string[]
}

interface Person {
    Id: number
    Name: string
    Email: string
    Phone: string | null
    Location: string | null
    LinkedInProfile: string | null
    CreatedAt: string
    UpdatedAt: string
    Projects: Project[]
    DynamicFields: Record<string, string>
}

export default function PeoplePage() {
    const [people, setPeople] = useState<Person[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchPeople()
    }, [])

    const fetchPeople = async () => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/people')
            if (response.ok) {
                const data = await response.json()
                setPeople(data.people || [])
            }
        } catch (error) {
            console.error('Failed to fetch people:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const parseDynamicField = (value: string | undefined) => {
        if (!value) return []
        try {
            return JSON.parse(value)
        } catch {
            return [value]
        }
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">People</h2>
                <Badge variant="secondary" className="text-sm">
                    {people.length} {people.length === 1 ? 'person' : 'people'}
                </Badge>
            </div>

            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2 mt-2" />
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : people.length === 0 ? (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No people yet</p>
                            <p className="text-sm">Upload and process CVs to see candidates here</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {people.map((person) => (
                        <Card key={person.Id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <CardTitle className="flex items-start justify-between">
                                    <span className="text-lg">{person.Name}</span>
                                    {person.DynamicFields.YearsOfExperience && (
                                        <Badge variant="secondary" className="ml-2">
                                            {person.DynamicFields.YearsOfExperience}y exp
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Contact Information */}
                                <div className="space-y-2 text-sm">
                                    {person.Email && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Mail className="h-4 w-4 flex-shrink-0" />
                                            <span className="truncate">{person.Email}</span>
                                        </div>
                                    )}
                                    {person.Phone && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Phone className="h-4 w-4 flex-shrink-0" />
                                            <span>{person.Phone}</span>
                                        </div>
                                    )}
                                    {person.Location && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <MapPin className="h-4 w-4 flex-shrink-0" />
                                            <span>{person.Location}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Social Links */}
                                <div className="flex flex-wrap gap-2">
                                    {person.LinkedInProfile && (
                                        <a
                                            href={person.LinkedInProfile}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                        >
                                            <Linkedin className="h-4 w-4" />
                                        </a>
                                    )}
                                    {person.DynamicFields.GitHubProfile && (
                                        <a
                                            href={person.DynamicFields.GitHubProfile}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-700 hover:text-gray-900 dark:text-gray-300"
                                        >
                                            <Github className="h-4 w-4" />
                                        </a>
                                    )}
                                    {person.DynamicFields.PortfolioURL && (
                                        <a
                                            href={person.DynamicFields.PortfolioURL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-600 hover:text-purple-800 dark:text-purple-400"
                                        >
                                            <Globe className="h-4 w-4" />
                                        </a>
                                    )}
                                </div>

                                {/* Projects */}
                                {person.Projects.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Briefcase className="h-4 w-4" />
                                            <span>Projects ({person.Projects.length})</span>
                                        </div>
                                        <div className="space-y-2">
                                            {person.Projects.slice(0, 2).map((project) => (
                                                <div key={project.Id} className="text-sm border-l-2 border-muted pl-3 py-1">
                                                    <p className="font-medium">{project.Title}</p>
                                                    <p className="text-muted-foreground text-xs">
                                                        {project.Company} {project.Role && `• ${project.Role}`}
                                                    </p>
                                                    {project.Technologies.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {project.Technologies.slice(0, 3).map((tech, idx) => (
                                                                <Badge key={idx} variant="outline" className="text-xs">
                                                                    {tech}
                                                                </Badge>
                                                            ))}
                                                            {project.Technologies.length > 3 && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    +{project.Technologies.length - 3}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {person.Projects.length > 2 && (
                                                <p className="text-xs text-muted-foreground pl-3">
                                                    +{person.Projects.length - 2} more projects
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Certifications */}
                                {person.DynamicFields.Certifications && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Award className="h-4 w-4" />
                                            <span>Certifications</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {parseDynamicField(person.DynamicFields.Certifications).slice(0, 3).map((cert: string, idx: number) => (
                                                <Badge key={idx} variant="secondary" className="text-xs">
                                                    {cert}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Languages */}
                                {person.DynamicFields.Languages && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Globe className="h-4 w-4" />
                                            <span>Languages</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {parseDynamicField(person.DynamicFields.Languages).map((lang: string, idx: number) => (
                                                <Badge key={idx} variant="outline" className="text-xs">
                                                    {lang}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Added Date */}
                                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                                    <Calendar className="h-3 w-3" />
                                    <span>Added {new Date(person.CreatedAt).toLocaleDateString()}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}


