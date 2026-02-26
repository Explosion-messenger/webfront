import { useState, useEffect } from 'react';
import { type Message } from '../types';

export function useMessageSearch(messages: Message[]) {
    const [isMsgSearchOpen, setIsMsgSearchOpen] = useState(false);
    const [msgSearchQuery, setMsgSearchQuery] = useState('');
    const [searchMatchIds, setSearchMatchIds] = useState<number[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
    const [highlightedMsgId, setHighlightedMsgId] = useState<number | null>(null);

    useEffect(() => {
        if (!msgSearchQuery.trim() || !messages.length) {
            setSearchMatchIds([]);
            setCurrentMatchIndex(-1);
            return;
        }

        const matches = messages
            .filter(m => m.text?.toLowerCase().includes(msgSearchQuery.toLowerCase()))
            .map(m => m.id);

        setSearchMatchIds(matches);
        if (matches.length > 0) {
            setCurrentMatchIndex(matches.length - 1); // Start from the newest match
            scrollToMatch(matches[matches.length - 1]);
        } else {
            setCurrentMatchIndex(-1);
        }
    }, [msgSearchQuery, messages]);

    const scrollToMatch = (msgId: number) => {
        setTimeout(() => {
            const el = document.getElementById(`msg-${msgId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedMsgId(msgId);
                setTimeout(() => setHighlightedMsgId(null), 2000);
            }
        }, 100);
    };

    const nextMatch = () => {
        if (searchMatchIds.length === 0) return;
        const nextIndex = (currentMatchIndex + 1) % searchMatchIds.length;
        setCurrentMatchIndex(nextIndex);
        scrollToMatch(searchMatchIds[nextIndex]);
    };

    const prevMatch = () => {
        if (searchMatchIds.length === 0) return;
        const prevIndex = (currentMatchIndex - 1 + searchMatchIds.length) % searchMatchIds.length;
        setCurrentMatchIndex(prevIndex);
        scrollToMatch(searchMatchIds[prevIndex]);
    };

    const clearSearch = () => {
        setMsgSearchQuery('');
        setSearchMatchIds([]);
        setCurrentMatchIndex(-1);
        setIsMsgSearchOpen(false);
    };

    return {
        isMsgSearchOpen, setIsMsgSearchOpen,
        msgSearchQuery, setMsgSearchQuery,
        searchMatchIds, currentMatchIndex,
        highlightedMsgId,
        nextMatch, prevMatch, clearSearch
    };
}
