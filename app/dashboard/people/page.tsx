'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Mail, MapPin, ChevronRight } from 'lucide-react'
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

// Utility function to create URL-friendly slug
function createPersonSlug(person: Person) {
    const nameSlug = person.Name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim()
    return `${person.Id}-${nameSlug}`
}

// Simple Person List Item Component with RMDY styling
function PersonListItem({ person }: { person: Person }) {
    return (
        <Link href={`/dashboard/people/${createPersonSlug(person)}`}>
            <Card className="rmdy-card hover:shadow-md cursor-pointer mb-2 active:scale-[0.98] transition-transform">
                <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center font-bold text-sm sm:text-base text-primary ring-2 ring-primary/10">
                                {person.Name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-base sm:text-lg truncate">{person.Name}</h3>
                                <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                                    {person.Email && (
                                        <div className="flex items-center gap-1 min-w-0">
                                            <Mail className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate hidden sm:inline">{person.Email}</span>
                                            <span className="truncate sm:hidden">{person.Email.split('@')[0]}</span>
                                        </div>
                                    )}
                                    {person.Location && (
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <MapPin className="h-3 w-3" />
                                            <span className="hidden md:inline">{person.Location}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            {person.DynamicFields.YearsOfExperience && (
                                <Badge variant="outline" className="border-primary/30 text-primary text-xs px-2">
                                    {person.DynamicFields.YearsOfExperience}y
                                </Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-primary/50" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
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

    return (
        <div className="h-screen flex flex-col">
            {/* Header Toolbar */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center justify-between px-3 sm:px-4 md:px-8 py-3 sm:py-4 gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                            <span className="rmdy-accent">Candidate</span> Profiles
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
                            Browse and manage candidate profiles
                        </p>
                    </div>
                    <Badge className="text-xs sm:text-sm flex-shrink-0">
                        {people.length}
                    </Badge>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-8">
                {isLoading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="mb-2">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-12 w-12 rounded-xl" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-5 w-48" />
                                                <Skeleton className="h-4 w-64" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="h-6 w-16" />
                                            <Skeleton className="h-4 w-4" />
                                        </div>
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
                    <div className="space-y-2">
                        {people.map((person) => (
                            <PersonListItem key={person.Id} person={person} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}


