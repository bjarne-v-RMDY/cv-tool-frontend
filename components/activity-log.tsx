"use client"

import * as React from "react"
import { Activity, Upload, FileText, Users, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ActivityItem {
    id: string
    type: 'upload' | 'processing' | 'completed' | 'error' | 'matching'
    title: string
    description: string
    timestamp: Date
    status: 'pending' | 'processing' | 'completed' | 'failed'
    userId?: string
    fileName?: string
}

const mockActivities: ActivityItem[] = [
    {
        id: '1',
        type: 'upload',
        title: 'CV Uploaded',
        description: 'john.doe.pdf uploaded successfully',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        status: 'completed',
        userId: 'user-123',
        fileName: 'john.doe.pdf'
    },
    {
        id: '2',
        type: 'processing',
        title: 'CV Processing',
        description: 'jane.smith.pdf is being processed',
        timestamp: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
        status: 'processing',
        userId: 'user-456',
        fileName: 'jane.smith.pdf'
    },
    {
        id: '3',
        type: 'completed',
        title: 'CV Processed',
        description: 'mike.wilson.pdf processed successfully - 3 projects extracted',
        timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        status: 'completed',
        userId: 'user-789',
        fileName: 'mike.wilson.pdf'
    },
    {
        id: '4',
        type: 'matching',
        title: 'Candidate Matching',
        description: 'Found 5 matching candidates for React Developer position',
        timestamp: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
        status: 'completed'
    },
    {
        id: '5',
        type: 'error',
        title: 'Processing Error',
        description: 'Failed to process sarah.jones.pdf - file format not supported',
        timestamp: new Date(Date.now() - 30 * 1000), // 30 seconds ago
        status: 'failed',
        userId: 'user-101',
        fileName: 'sarah.jones.pdf'
    },
    {
        id: '10',
        type: 'upload',
        title: 'CV Uploaded',
        description: 'john.doe.pdf uploaded successfully',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        status: 'completed',
        userId: 'user-123',
        fileName: 'john.doe.pdf'
    },
    {
        id: '22',
        type: 'processing',
        title: 'CV Processing',
        description: 'jane.smith.pdf is being processed',
        timestamp: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
        status: 'processing',
        userId: 'user-456',
        fileName: 'jane.smith.pdf'
    },
    {
        id: '33',
        type: 'completed',
        title: 'CV Processed',
        description: 'mike.wilson.pdf processed successfully - 3 projects extracted',
        timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        status: 'completed',
        userId: 'user-789',
        fileName: 'mike.wilson.pdf'
    },
    {
        id: '42',
        type: 'matching',
        title: 'Candidate Matching',
        description: 'Found 5 matching candidates for React Developer position',
        timestamp: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
        status: 'completed'
    },
    {
        id: '51',
        type: 'error',
        title: 'Processing Error',
        description: 'Failed to process sarah.jones.pdf - file format not supported',
        timestamp: new Date(Date.now() - 30 * 1000), // 30 seconds ago
        status: 'failed',
        userId: 'user-101',
        fileName: 'sarah.jones.pdf'
    }
]

const getActivityIcon = (type: ActivityItem['type'], status: ActivityItem['status']) => {
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
    const [activities, setActivities] = React.useState<ActivityItem[]>(mockActivities)

    // Simulate real-time updates
    React.useEffect(() => {
        const interval = setInterval(() => {
            // In a real app, this would fetch from your API
            setActivities(prev => [...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()))
        }, 30000) // Update every 30 seconds

        return () => clearInterval(interval)
    }, [])

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Activity Log
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex-1 overflow-hidden">
                <div className="space-y-4 h-full overflow-y-auto">
                    {activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex-shrink-0 mt-0.5">
                                {getActivityIcon(activity.type, activity.status)}
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
                                        {formatTimestamp(activity.timestamp)}
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
                </div>

                {activities.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No activity yet</p>
                        <p className="text-sm">Upload a CV to see activity here</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
