'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Database, FileX, AlertTriangle, Users } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminPage() {
    const [isClearing, setIsClearing] = useState(false)
    const [isRemoving, setIsRemoving] = useState(false)
    const [isClearingPeople, setIsClearingPeople] = useState(false)

    const handleClearLogs = async () => {
        if (!confirm('Are you sure you want to clear ALL activity logs? This action cannot be undone.')) {
            return
        }

        setIsClearing(true)
        try {
            const response = await fetch('/api/admin/clear-logs', {
                method: 'DELETE',
            })

            if (response.ok) {
                const result = await response.json()
                toast.success(`Cleared ${result.deletedCount} activity log entries`)
            } else {
                throw new Error('Failed to clear logs')
            }
        } catch (error) {
            console.error('Error clearing logs:', error)
            toast.error('Failed to clear activity logs')
        } finally {
            setIsClearing(false)
        }
    }

    const handleRemoveCVs = async () => {
        if (!confirm('Are you sure you want to remove ALL CVs? This will delete files from storage and database records. This action cannot be undone.')) {
            return
        }

        setIsRemoving(true)
        try {
            const response = await fetch('/api/admin/remove-cvs', {
                method: 'DELETE',
            })

            if (response.ok) {
                const result = await response.json()
                toast.success(`Removed ${result.deletedFiles} CV files and ${result.deletedRecords} database records`)
            } else {
                throw new Error('Failed to remove CVs')
            }
        } catch (error) {
            console.error('Error removing CVs:', error)
            toast.error('Failed to remove CVs')
        } finally {
            setIsRemoving(false)
        }
    }

    const handleClearPeople = async () => {
        if (!confirm('Are you sure you want to clear ALL people data? This will delete all users, projects, technologies, and CV files from the database. This action cannot be undone.')) {
            return
        }

        setIsClearingPeople(true)
        try {
            const response = await fetch('/api/admin/clear-people', {
                method: 'DELETE',
            })

            if (response.ok) {
                const result = await response.json()
                toast.success(result.message)
            } else {
                throw new Error('Failed to clear people')
            }
        } catch (error) {
            console.error('Error clearing people:', error)
            toast.error('Failed to clear people data')
        } finally {
            setIsClearingPeople(false)
        }
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Admin Panel</h2>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Development Mode Only</span>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Clear Activity Logs */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Clear Activity Logs
                        </CardTitle>
                        <CardDescription>
                            Remove all activity log entries from the database. This will clear the entire activity history.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={handleClearLogs}
                            disabled={isClearing}
                            variant="destructive"
                            className="w-full"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isClearing ? 'Clearing Logs...' : 'Clear All Logs'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Remove All CVs */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileX className="h-5 w-5" />
                            Remove All CVs
                        </CardTitle>
                        <CardDescription>
                            Delete all CV files from Azure Storage and remove all related database records.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={handleRemoveCVs}
                            disabled={isRemoving}
                            variant="destructive"
                            className="w-full"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isRemoving ? 'Removing CVs...' : 'Remove All CVs'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Clear People Data */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Clear People Data
                        </CardTitle>
                        <CardDescription>
                            Delete all users, projects, technologies, and CV files from the database. Keeps files in storage.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={handleClearPeople}
                            disabled={isClearingPeople}
                            variant="destructive"
                            className="w-full"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isClearingPeople ? 'Clearing People...' : 'Clear All People'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Warning Section */}
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Warning
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p>• These actions are irreversible and will permanently delete data</p>
                        <p>• Only use these functions in development environments</p>
                        <p>• Always backup important data before performing these operations</p>
                        <p>• These functions should be disabled in production</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
