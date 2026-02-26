import { useState, useCallback } from 'react';
import api from '../api';
import { type Message, type Chat } from '../types';

export function useChatActions(
    activeChat: Chat | null,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    onChatDeleted: (chatId: number) => void,
    onNavigate: (path: string) => void
) {
    const [isSending, setIsSending] = useState(false);
    const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !activeChat || isSending) return false;

        const replyId = replyToMessage?.id;
        setReplyToMessage(null);
        setIsSending(true);
        try {
            await api.post('/messages/send', {
                chat_id: activeChat.id,
                text,
                reply_to_id: replyId
            });
            return true;
        } catch (err) {
            console.error(err);
            return false;
        } finally {
            setIsSending(false);
        }
    }, [activeChat, isSending, replyToMessage]);

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeChat) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const uploadResp = await api.post('/files/upload', formData);
            await api.post('/messages/send', {
                chat_id: activeChat.id,
                file_id: uploadResp.data.id,
                reply_to_id: replyToMessage?.id
            });
            setReplyToMessage(null);
        } catch (err) { console.error(err); }
    }, [activeChat, replyToMessage]);

    const markChatRead = useCallback(async () => {
        if (!activeChat) return;
        try {
            await api.post(`/chats/${activeChat.id}/read`);
        } catch (err) {
            console.error('Failed to mark chat as read:', err);
        }
    }, [activeChat]);

    const markMessageRead = useCallback(async (messageId: number) => {
        try {
            await api.post(`/messages/${messageId}/read`);
        } catch (err) {
            console.error('Failed to mark message read:', err);
        }
    }, []);

    const deleteMessage = useCallback(async (messageId: number) => {
        try {
            await api.delete(`/messages/${messageId}`);
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (err) {
            console.error('Failed to delete message:', err);
        }
    }, [setMessages]);

    const handleToggleReaction = useCallback(async (messageId: number, emoji: string) => {
        try {
            await api.post(`/messages/${messageId}/reactions`, { emoji });
        } catch (err) {
            console.error('Failed to toggle reaction:', err);
        }
    }, []);

    const handleLeaveChat = useCallback(async (chat: Chat, onMenuClose: () => void) => {
        if (!window.confirm(`Are you sure you want to leave ${chat.is_group ? 'this group' : 'this chat'}?`)) return;
        try {
            await api.post(`/chats/${chat.id}/leave`);
            onChatDeleted(chat.id);
        } catch (err) {
            console.error('Failed to leave chat:', err);
        } finally {
            onMenuClose();
        }
    }, [onChatDeleted]);

    const handleDeleteChatAccount = useCallback(async (chat: Chat, onMenuClose: () => void) => {
        if (!window.confirm('Are you sure you want to delete this chat and ALL its history for everyone? This cannot be undone.')) return;
        try {
            await api.delete(`/chats/${chat.id}`);
        } catch (err) {
            console.error('Failed to delete chat:', err);
        } finally {
            onMenuClose();
        }
    }, []);

    const handleChatCreated = useCallback((newChat: Chat, setChats: any) => {
        setChats((prev: Chat[]) => {
            const exists = prev.find(c => c.id === newChat.id);
            if (exists) return prev;
            return [newChat, ...prev];
        });
        onNavigate(`/${newChat.id}`);
    }, [onNavigate]);

    return {
        isSending,
        replyToMessage, setReplyToMessage,
        sendMessage, handleFileUpload,
        markChatRead, markMessageRead,
        deleteMessage, handleToggleReaction,
        handleLeaveChat, handleDeleteChatAccount,
        handleChatCreated
    };
}
