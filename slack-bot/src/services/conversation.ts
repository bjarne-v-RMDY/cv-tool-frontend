export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  messages: ConversationMessage[];
  lastActivity: number;
  userId: string;
  channelId: string;
}

class ConversationService {
  private conversations: Map<string, Conversation> = new Map();
  private readonly MAX_MESSAGES = 10; // Max 10 messages (5 exchanges)
  private readonly MAX_CONVERSATIONS = 1000;
  private readonly TTL_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Generate conversation key from user and channel IDs
   */
  private getKey(userId: string, channelId: string): string {
    return `${userId}-${channelId}`;
  }

  /**
   * Evict least recently used conversation if at max capacity
   */
  private evictLRU(): void {
    if (this.conversations.size < this.MAX_CONVERSATIONS) {
      return;
    }

    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, conversation] of this.conversations.entries()) {
      if (conversation.lastActivity < oldestTime) {
        oldestTime = conversation.lastActivity;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.conversations.delete(oldestKey);
      console.log(`🗑️ Evicted LRU conversation: ${oldestKey}`);
    }
  }

  /**
   * Enforce message limit per conversation
   */
  private enforceMessageLimit(conversation: Conversation): void {
    if (conversation.messages.length > this.MAX_MESSAGES) {
      // Remove oldest 2 messages when limit exceeded
      conversation.messages.splice(0, 2);
    }
  }

  /**
   * Get or create conversation
   */
  private getOrCreateConversation(userId: string, channelId: string): Conversation {
    const key = this.getKey(userId, channelId);
    let conversation = this.conversations.get(key);

    if (!conversation) {
      this.evictLRU();
      conversation = {
        messages: [],
        lastActivity: Date.now(),
        userId,
        channelId,
      };
      this.conversations.set(key, conversation);
    }

    conversation.lastActivity = Date.now();
    return conversation;
  }

  /**
   * Add user message to conversation
   */
  addUserMessage(userId: string, channelId: string, content: string): void {
    const conversation = this.getOrCreateConversation(userId, channelId);
    conversation.messages.push({
      role: 'user',
      content,
      timestamp: Date.now(),
    });
    this.enforceMessageLimit(conversation);
  }

  /**
   * Add assistant message to conversation
   */
  addAssistantMessage(userId: string, channelId: string, content: string): void {
    const conversation = this.getOrCreateConversation(userId, channelId);
    conversation.messages.push({
      role: 'assistant',
      content,
      timestamp: Date.now(),
    });
    this.enforceMessageLimit(conversation);
  }

  /**
   * Get conversation history
   */
  getConversation(userId: string, channelId: string): ConversationMessage[] {
    const key = this.getKey(userId, channelId);
    const conversation = this.conversations.get(key);
    return conversation ? [...conversation.messages] : [];
  }

  /**
   * Get conversation message count
   */
  getMessageCount(userId: string, channelId: string): number {
    const key = this.getKey(userId, channelId);
    const conversation = this.conversations.get(key);
    return conversation ? conversation.messages.length : 0;
  }

  /**
   * Clear specific conversation
   */
  clearConversation(userId: string, channelId: string): boolean {
    const key = this.getKey(userId, channelId);
    return this.conversations.delete(key);
  }

  /**
   * Cleanup old conversations
   */
  cleanupOldConversations(): number {
    const now = Date.now();
    const cutoff = now - this.TTL_MS;
    let deleted = 0;

    for (const [key, conversation] of this.conversations.entries()) {
      if (conversation.lastActivity < cutoff) {
        this.conversations.delete(key);
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`🧹 Cleaned up ${deleted} stale conversation(s)`);
    }

    // Log warning if approaching capacity
    if (this.conversations.size > this.MAX_CONVERSATIONS * 0.8) {
      console.warn(
        `⚠️ Conversation storage at ${Math.round((this.conversations.size / this.MAX_CONVERSATIONS) * 100)}% capacity (${this.conversations.size}/${this.MAX_CONVERSATIONS})`
      );
    }

    return deleted;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalConversations: this.conversations.size,
      maxCapacity: this.MAX_CONVERSATIONS,
      utilizationPercent: Math.round((this.conversations.size / this.MAX_CONVERSATIONS) * 100),
      ttlMinutes: this.TTL_MS / (60 * 1000),
    };
  }
}

// Export singleton instance
export const conversationService = new ConversationService();

