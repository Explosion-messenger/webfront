import { useState, useEffect, useRef, useCallback } from 'react';
import { type Message, type Chat } from '../types';

export function useChatScroll(
    messages: Message[],
    messagesLoading: boolean,
    user: any,
    activeChat: Chat | null,
    onMarkChatRead: () => void
) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [unreadBottomCount, setUnreadBottomCount] = useState(0);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const isAtBottomRef = useRef(true);
    const lastMessagesLengthRef = useRef(0);
    const isInitialLoadRef = useRef(true);

    useEffect(() => {
        isInitialLoadRef.current = true;
        lastMessagesLengthRef.current = 0;
        setUnreadBottomCount(0);
        isAtBottomRef.current = true;
    }, [activeChat?.id]);

    useEffect(() => {
        if (messagesLoading || !messages.length) return;

        if (isInitialLoadRef.current) {
            const firstUnread = messages.find(m =>
                m.sender_id !== user?.id &&
                !m.read_by.some(r => r.user_id === user?.id)
            );

            if (firstUnread) {
                const el = document.getElementById(`msg-${firstUnread.id}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'auto', block: 'start' });
                } else {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
                }
            } else {
                messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            }
            isInitialLoadRef.current = false;
        } else if (messages.length > lastMessagesLengthRef.current) {
            const lastMsg = messages[messages.length - 1];
            const isMyMsg = lastMsg?.sender_id === user?.id;

            if (isAtBottomRef.current || isMyMsg) {
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        }

        lastMessagesLengthRef.current = messages.length;
    }, [messages, messagesLoading, user?.id]);

    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;

        if (isAtBottom !== isAtBottomRef.current) {
            isAtBottomRef.current = isAtBottom;
            setShowScrollButton(!isAtBottom);
        }

        if (isAtBottom) {
            setUnreadBottomCount(0);
            // We use a ref-like approach or check messages to avoid expensive logic on every scroll
        }
    }, []);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        container.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => container.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    // Separate effect for marking read to avoid running it too often on scroll
    useEffect(() => {
        if (showScrollButton === false && activeChat) {
            const hasUnread = messages.some(m =>
                m.sender_id !== user?.id &&
                !m.read_by?.some(r => r.user_id === user?.id)
            );
            if (hasUnread) {
                onMarkChatRead();
            }
        }
    }, [showScrollButton, messages, user?.id, activeChat, onMarkChatRead]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setUnreadBottomCount(0);
        onMarkChatRead();
    };

    return {
        messagesEndRef,
        scrollContainerRef,
        unreadBottomCount,
        setUnreadBottomCount,
        showScrollButton,
        isAtBottomRef,
        scrollToBottom
    };
}
