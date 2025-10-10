'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Database, FileX, AlertTriangle, Users, RefreshCw, MessageCircle, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { useChatStore } from '@/lib/chat-store'

export default function AdminPage() {
    const [isClearing, setIsClearing] = useState(false)
    const [isRemoving, setIsRemoving] = useState(false)
    const [isClearingPeople, setIsClearingPeople] = useState(false)
    const [isClearingVacancies, setIsClearingVacancies] = useState(false)
    const [isReindexing, setIsReindexing] = useState(false)
    const [isClearingChat, setIsClearingChat] = useState(false)
    const { clearChat } = useChatStore()

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
                toast.success(`Removed ${result.deletedFiles} CV files, ${result.deletedRecords} database records, and ${result.deletedIndexDocuments || 0} search index documents`)
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
                toast.success(`${result.message} (${result.deletedIndexDocuments || 0} search index documents cleared)`)
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

    const handleClearVacancies = async () => {
        if (!confirm('Are you sure you want to clear ALL vacancies? This will delete all vacancy data, requirements, and files from storage. This action cannot be undone.')) {
            return
        }

        setIsClearingVacancies(true)
        try {
            const response = await fetch('/api/admin/clear-vacancies', {
                method: 'DELETE',
            })

            if (response.ok) {
                const result = await response.json()
                toast.success(`${result.message} (${result.deletedFiles || 0} files deleted from storage)`)
            } else {
                throw new Error('Failed to clear vacancies')
            }
        } catch (error) {
            console.error('Error clearing vacancies:', error)
            toast.error('Failed to clear vacancies')
        } finally {
            setIsClearingVacancies(false)
        }
    }

    const handleClearChat = async () => {
        if (!confirm('Are you sure you want to clear the chat history? This will remove all conversation data.')) {
            return
        }

        setIsClearingChat(true)
        try {
            // Call the API endpoint (though it just returns success since chat is client-side)
            const response = await fetch('/api/admin/clear-chat', {
                method: 'POST',
            })

            if (response.ok) {
                clearChat()
                toast.success('Chat history cleared successfully')
            } else {
                throw new Error('Failed to clear chat history')
            }
        } catch (error) {
            console.error('Error clearing chat:', error)
            toast.error('Failed to clear chat history')
        } finally {
            setIsClearingChat(false)
        }
    }

    const handleReindex = async () => {
        if (!confirm('Re-index all candidates in AI Search? This will update the search index with latest data from all users.')) {
            return
        }

        setIsReindexing(true)
        try {
            const response = await fetch('/api/admin/reindex', {
                method: 'POST',
            })

            if (response.ok) {
                const result = await response.json()
                toast.success(`Queued ${result.count} candidates for re-indexing`)

                // Clear chat history if the API indicates to do so
                if (result.clearChat) {
                    clearChat()
                    toast.success('Chat history cleared')
                }
            } else {
                throw new Error('Failed to start re-indexing')
            }
        } catch (error) {
            console.error('Error re-indexing:', error)
            toast.error('Failed to start re-indexing')
        } finally {
            setIsReindexing(false)
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
                            Delete all CV files from Azure Storage, remove all related database records, and clear the search index.
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
                            Delete all users, projects, technologies, and CV files from the database and clear the search index. Keeps files in storage.
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

                {/* Clear Vacancies */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Clear Vacancies
                        </CardTitle>
                        <CardDescription>
                            Delete all vacancies, requirements, and associated files from both the database and Azure Storage.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={handleClearVacancies}
                            disabled={isClearingVacancies}
                            variant="destructive"
                            className="w-full"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isClearingVacancies ? 'Clearing Vacancies...' : 'Clear All Vacancies'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Clear Chat History */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            Clear Chat History
                        </CardTitle>
                        <CardDescription>
                            Clear all chat conversation history. This removes all stored messages from the AI chat interface.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={handleClearChat}
                            disabled={isClearingChat}
                            variant="destructive"
                            className="w-full"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isClearingChat ? 'Clearing Chat...' : 'Clear Chat History'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Re-index AI Search */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5" />
                            Re-index AI Search
                        </CardTitle>
                        <CardDescription>
                            Queue all candidates for re-indexing in Azure AI Search. Updates search index with latest data and clears chat history.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={handleReindex}
                            disabled={isReindexing}
                            className="w-full"
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${isReindexing ? 'animate-spin' : ''}`} />
                            {isReindexing ? 'Queueing...' : 'Re-index All'}
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
