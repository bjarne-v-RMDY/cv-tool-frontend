'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
    ArrowLeft, Mail, Phone, MapPin, Linkedin, Github, Globe, Briefcase,
    Calendar, Award, ChevronDown, ChevronUp, Code, Wrench, Smartphone,
    Languages, User
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

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

export default function PersonDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [person, setPerson] = useState<Person | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        programming: true,
        design: true,
        mobile: true,
        projects: true,
        certifications: true,
        languages: true,
    })

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }))
    }

    const parseDynamicField = (value: string | undefined) => {
        if (!value) return []
        try {
            return JSON.parse(value)
        } catch {
            return [value]
        }
    }

    useEffect(() => {
        if (params.id) {
            fetchPerson(params.id as string)
        }
    }, [params.id])

    const fetchPerson = async (slug: string) => {
        try {
            setIsLoading(true)
            // Extract ID from slug (format: "123-john-doe")
            const personId = slug.split('-')[0]

            const response = await fetch('/api/people')
            if (response.ok) {
                const data = await response.json()
                const foundPerson = data.people?.find((p: Person) => p.Id.toString() === personId)
                if (foundPerson) {
                    setPerson(foundPerson)
                } else {
                    router.push('/dashboard/people')
                }
            }
        } catch (error) {
            console.error('Failed to fetch person:', error)
            router.push('/dashboard/people')
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            </div>
        )
    }

    if (!person) {
        return null
    }

    const programmingLanguages = parseDynamicField(person.DynamicFields.ProgrammingLanguages)
    const designTools = parseDynamicField(person.DynamicFields.DesignTools)
    const mobilePlatforms = parseDynamicField(person.DynamicFields.MobilePlatforms)
    const certifications = parseDynamicField(person.DynamicFields.Certifications)
    const languages = parseDynamicField(person.DynamicFields.Languages)

    return (
        <div className="flex-1 flex flex-col h-screen">
            {/* Fixed Header */}
            <div className="flex-shrink-0 p-4 md:p-8 pb-4 border-b bg-background">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/people">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center font-bold text-primary text-xl">
                        {person.Name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">{person.Name}</h1>
                        <div className="flex items-center gap-4 text-muted-foreground">
                            {person.DynamicFields.YearsOfExperience && (
                                <Badge variant="secondary" className="mt-1">
                                    {person.DynamicFields.YearsOfExperience} years experience
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-6">
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left Column - Contact & Basic Info */}
                    <div className="space-y-6">
                        {/* Contact Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Contact Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {person.Email && (
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{person.Email}</span>
                                    </div>
                                )}
                                {person.Phone && (
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{person.Phone}</span>
                                    </div>
                                )}
                                {person.Location && (
                                    <div className="flex items-center gap-3">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{person.Location}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">Added {new Date(person.CreatedAt).toLocaleDateString()}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Social Links */}
                        {(person.LinkedInProfile || person.DynamicFields.GitHubProfile || person.DynamicFields.PortfolioURL) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Links</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {person.LinkedInProfile && (
                                        <a
                                            href={person.LinkedInProfile}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm"
                                        >
                                            <Linkedin className="h-4 w-4" />
                                            LinkedIn Profile
                                        </a>
                                    )}
                                    {person.DynamicFields.GitHubProfile && (
                                        <a
                                            href={person.DynamicFields.GitHubProfile}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 text-gray-700 hover:text-gray-900 dark:text-gray-300 text-sm"
                                        >
                                            <Github className="h-4 w-4" />
                                            GitHub Profile
                                        </a>
                                    )}
                                    {person.DynamicFields.PortfolioURL && (
                                        <a
                                            href={person.DynamicFields.PortfolioURL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 text-purple-600 hover:text-purple-800 dark:text-purple-400 text-sm"
                                        >
                                            <Globe className="h-4 w-4" />
                                            Portfolio
                                        </a>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Languages */}
                        {languages.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Languages className="h-5 w-5" />
                                        Languages
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {languages.map((lang: string, idx: number) => (
                                            <Badge key={idx} variant="outline" className="bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
                                                {lang}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right Column - Skills & Projects */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Programming Languages */}
                        {programmingLanguages.length > 0 && (
                            <Card>
                                <Collapsible open={expandedSections.programming} onOpenChange={() => toggleSection('programming')}>
                                    <CollapsibleTrigger asChild>
                                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                            <CardTitle className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Code className="h-5 w-5" />
                                                    Programming Languages ({programmingLanguages.length})
                                                </div>
                                                {expandedSections.programming ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </CardTitle>
                                        </CardHeader>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2">
                                                {programmingLanguages.map((lang: string, idx: number) => (
                                                    <Badge key={idx} className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                                        {lang}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </CollapsibleContent>
                                </Collapsible>
                            </Card>
                        )}

                        {/* Design Tools */}
                        {designTools.length > 0 && (
                            <Card>
                                <Collapsible open={expandedSections.design} onOpenChange={() => toggleSection('design')}>
                                    <CollapsibleTrigger asChild>
                                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                            <CardTitle className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Wrench className="h-5 w-5" />
                                                    Design Tools ({designTools.length})
                                                </div>
                                                {expandedSections.design ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </CardTitle>
                                        </CardHeader>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2">
                                                {designTools.map((tool: string, idx: number) => (
                                                    <Badge key={idx} variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                                                        {tool}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </CollapsibleContent>
                                </Collapsible>
                            </Card>
                        )}

                        {/* Mobile Platforms */}
                        {mobilePlatforms.length > 0 && (
                            <Card>
                                <Collapsible open={expandedSections.mobile} onOpenChange={() => toggleSection('mobile')}>
                                    <CollapsibleTrigger asChild>
                                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                            <CardTitle className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Smartphone className="h-5 w-5" />
                                                    Mobile Platforms ({mobilePlatforms.length})
                                                </div>
                                                {expandedSections.mobile ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </CardTitle>
                                        </CardHeader>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2">
                                                {mobilePlatforms.map((platform: string, idx: number) => (
                                                    <Badge key={idx} variant="outline" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                                                        {platform}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </CollapsibleContent>
                                </Collapsible>
                            </Card>
                        )}

                        {/* Certifications */}
                        {certifications.length > 0 && (
                            <Card>
                                <Collapsible open={expandedSections.certifications} onOpenChange={() => toggleSection('certifications')}>
                                    <CollapsibleTrigger asChild>
                                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                            <CardTitle className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Award className="h-5 w-5" />
                                                    Certifications ({certifications.length})
                                                </div>
                                                {expandedSections.certifications ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </CardTitle>
                                        </CardHeader>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2">
                                                {certifications.map((cert: string, idx: number) => (
                                                    <Badge key={idx} variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
                                                        {cert}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </CollapsibleContent>
                                </Collapsible>
                            </Card>
                        )}

                        {/* Projects */}
                        {person.Projects.length > 0 && (
                            <Card>
                                <Collapsible open={expandedSections.projects} onOpenChange={() => toggleSection('projects')}>
                                    <CollapsibleTrigger asChild>
                                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                            <CardTitle className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Briefcase className="h-5 w-5" />
                                                    Projects ({person.Projects.length})
                                                </div>
                                                {expandedSections.projects ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </CardTitle>
                                        </CardHeader>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <CardContent>
                                            <div className="space-y-6">
                                                {person.Projects.map((project) => (
                                                    <div key={project.Id} className="border-l-4 border-primary/20 pl-4 py-2">
                                                        <h4 className="font-semibold text-lg">{project.Title}</h4>
                                                        <p className="text-muted-foreground">
                                                            {project.Company} {project.Role && `• ${project.Role}`}
                                                        </p>
                                                        {project.Description && (
                                                            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                                                {project.Description}
                                                            </p>
                                                        )}
                                                        {project.Technologies.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mt-3">
                                                                {project.Technologies.map((tech, idx) => (
                                                                    <Badge key={idx} variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800">
                                                                        {tech}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </CollapsibleContent>
                                </Collapsible>
                            </Card>
                        )}

                        {/* AR/VR Experience */}
                        {person.DynamicFields.ARVRExperience && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Globe className="h-5 w-5" />
                                        AR/VR Experience
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm leading-relaxed">
                                        {person.DynamicFields.ARVRExperience}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
