"use client"

import * as React from "react"
import { Activity, Upload, Users, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ActivityItem {
    id: number
    type: 'upload' | 'processing' | 'completed' | 'error' | 'matching'
    title: string
    description: string
    createdAt: Date
    status: 'pending' | 'processing' | 'completed' | 'failed'
    userId?: number
    fileName?: string
    metadata?: string
    updatedAt: Date
}

interface PaginationInfo {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
        case 'upload':
            return <Upload className="h-4 w-4" />
        case 'processing':
            return <Clock className="h-4 w-4" />
        case 'completed':
            return <CheckCircle className="h-4 w-4" />
        case 'error':
            return <AlertCircle className="h-4 w-4" />
        case 'matching':
            return <Users className="h-4 w-4" />
        default:
            return <Activity className="h-4 w-4" />
    }
}

const getStatusColor = (status: ActivityItem['status']) => {
    switch (status) {
        case 'completed':
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        case 'processing':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        case 'failed':
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        case 'pending':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
}

const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
}

export function ActivityLog() {
    const [activities, setActivities] = React.useState<ActivityItem[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isLoadingMore, setIsLoadingMore] = React.useState(false)
    const [pagination, setPagination] = React.useState<PaginationInfo | null>(null)
    const [currentPage, setCurrentPage] = React.useState(1)

    // Fetch activities from API with pagination
    const fetchActivities = React.useCallback(async (page: number = 1, append: boolean = false) => {
        try {
            if (!append) setIsLoading(true)
            else setIsLoadingMore(true)

            const response = await fetch(`/api/activity-log?page=${page}&limit=10`)
            if (response.ok) {
                const data = await response.json()
                const formattedActivities = data.activities.map((activity: {
                    Id: number
                    Type: string
                    Title: string
                    Description: string
                    CreatedAt: string
                    Status: string
                    UserId?: number
                    FileName?: string
                    Metadata?: string
                    UpdatedAt: string
                }) => ({
                    id: activity.Id,
                    type: activity.Type,
                    title: activity.Title,
                    description: activity.Description,
                    createdAt: new Date(activity.CreatedAt),
                    status: activity.Status,
                    userId: activity.UserId,
                    fileName: activity.FileName,
                    metadata: activity.Metadata,
                    updatedAt: new Date(activity.UpdatedAt)
                }))

                if (append) {
                    setActivities(prev => [...prev, ...formattedActivities])
                } else {
                    setActivities(formattedActivities)
                }

                setPagination(data.pagination)
                setCurrentPage(page)
            }
        } catch (error) {
            console.error('Failed to fetch activities:', error)
            if (!append) {
                setActivities([])
            }
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }, [])

    // Load more activities (infinite scroll)
    const loadMore = React.useCallback(() => {
        if (pagination?.hasNext && !isLoadingMore) {
            fetchActivities(currentPage + 1, true)
        }
    }, [pagination, currentPage, isLoadingMore, fetchActivities])

    // Initial fetch and periodic updates for latest activities
    React.useEffect(() => {
        fetchActivities(1, false)

        const interval = setInterval(() => {
            // Only refresh the first page to get latest activities
            fetchActivities(1, false)
        }, 15000) // Update every 15 seconds

        return () => clearInterval(interval)
    }, [fetchActivities])

    // Infinite scroll handler
    const scrollContainerRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container
            const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100

            if (isNearBottom) {
                loadMore()
            }
        }

        container.addEventListener('scroll', handleScroll)
        return () => container.removeEventListener('scroll', handleScroll)
    }, [loadMore])

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Activity Log
                    {pagination && (
                        <Badge variant="secondary" className="ml-auto">
                            {pagination.total} total
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex-1 overflow-hidden">
                <div ref={scrollContainerRef} className="space-y-4 h-full overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50 animate-pulse" />
                            <p>Loading activities...</p>
                        </div>
                    ) : activities.length > 0 ? (
                        <>
                            {activities.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex-shrink-0 mt-0.5">
                                        {getActivityIcon(activity.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-sm font-medium truncate">{activity.title}</h4>
                                            <Badge variant="secondary" className={`text-xs ${getStatusColor(activity.status)}`}>
                                                {activity.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs text-muted-foreground">
                                                {formatTimestamp(activity.createdAt)}
                                            </span>
                                            {activity.fileName && (
                                                <span className="text-xs text-muted-foreground">•</span>
                                            )}
                                            {activity.fileName && (
                                                <span className="text-xs text-muted-foreground">{activity.fileName}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Loading more indicator */}
                            {isLoadingMore && (
                                <div className="text-center py-4 text-muted-foreground">
                                    <Activity className="h-6 w-6 mx-auto mb-2 opacity-50 animate-pulse" />
                                    <p className="text-sm">Loading more...</p>
                                </div>
                            )}

                            {/* End of list indicator */}
                            {!pagination?.hasNext && activities.length > 0 && (
                                <div className="text-center py-4 text-muted-foreground">
                                    <p className="text-sm">No more activities</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No activity yet</p>
                            <p className="text-sm">Upload a CV to see activity here</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}