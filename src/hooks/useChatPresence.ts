import { useEffect, useRef, useState } from 'react';
import { type Chat } from '../types';

export function useChatPresence(
    token: string | null,
    user: any,
    activeChat: Chat | null,
    inputText: string,
    sendJson: (data: any) => void
) {
    const [userStatuses, setUserStatuses] = useState<Map<number, string>>(new Map());
    const [typingUsers, setTypingUsers] = useState<Record<number, Record<number, { username: string, timestamp: number }>>>({});

    // Inactivity / Away Status Logic
    const lastSentStatusRef = useRef<'online' | 'away'>('online');

    useEffect(() => {
        if (!token || !user) return;

        let inactivityTimer: ReturnType<typeof setTimeout>;

        const updateStatus = (newStatus: 'online' | 'away') => {
            if (lastSentStatusRef.current === newStatus) return;
            sendJson({ type: 'user_status_update', status: newStatus });
            lastSentStatusRef.current = newStatus;

            // Immediately update local state for current user to fix top-left UI
            if (user?.id) {
                setUserStatuses(prev => {
                    const newMap = new Map(prev);
                    newMap.set(user.id, newStatus);
                    return newMap;
                });
            }
        };

        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            updateStatus('online');

            inactivityTimer = setTimeout(() => {
                updateStatus('away');
            }, 60000); // 1 minute
        };

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(name => document.addEventListener(name, resetTimer));

        // Initial setup
        resetTimer();

        return () => {
            events.forEach(name => document.removeEventListener(name, resetTimer));
            clearTimeout(inactivityTimer);
        };
    }, [token, user?.id, sendJson]);

    // Send typing status
    const lastSentTypingTimeRef = useRef<Record<number, number>>({});

    useEffect(() => {
        if (!activeChat || !token) return;

        const now = Date.now();
        const lastSent = lastSentTypingTimeRef.current[activeChat.id] || 0;
        const isCurrentlyTyping = inputText.length > 0;

        // If user deleted all text, send "stopped typing" immediately
        if (!isCurrentlyTyping && lastSent !== 0) {
            sendJson({
                type: 'typing',
                chat_id: activeChat.id,
                is_typing: false
            });
            lastSentTypingTimeRef.current[activeChat.id] = 0;
            return;
        }

        // Send "typing" update if it's the first time or every 2 seconds (heartbeat)
        if (isCurrentlyTyping && (now - lastSent > 2000)) {
            sendJson({
                type: 'typing',
                chat_id: activeChat.id,
                is_typing: true
            });
            lastSentTypingTimeRef.current[activeChat.id] = now;
        }

        // Set local timeout to send "stopped" if user stops typing
        if (isCurrentlyTyping) {
            const timeout = setTimeout(() => {
                sendJson({
                    type: 'typing',
                    chat_id: activeChat.id,
                    is_typing: false
                });
                lastSentTypingTimeRef.current[activeChat.id] = 0;
            }, 3000);
            return () => clearTimeout(timeout);
        }
    }, [inputText, activeChat?.id, token, sendJson]);

    return {
        userStatuses, setUserStatuses,
        typingUsers, setTypingUsers
    };
}
