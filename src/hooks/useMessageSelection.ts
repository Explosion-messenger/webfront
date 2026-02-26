import { useState } from 'react';
import api from '../api';

export function useMessageSelection(onDeleteComplete: (ids: Set<number>) => void) {
    const [selectedMsgIds, setSelectedMsgIds] = useState<Set<number>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const toggleMsgSelection = (id: number) => {
        setSelectedMsgIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedMsgIds(new Set());
    };

    const handleBulkDelete = async () => {
        if (selectedMsgIds.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedMsgIds.size} messages?`)) return;

        try {
            const ids = Array.from(selectedMsgIds);
            await api.post('/messages/bulk/delete', { message_ids: ids });
            onDeleteComplete(selectedMsgIds);
            setSelectedMsgIds(new Set());
            setIsSelectionMode(false);
        } catch (err) {
            console.error('Failed bulk delete:', err);
        }
    };

    return {
        selectedMsgIds, setSelectedMsgIds,
        isSelectionMode, setIsSelectionMode,
        toggleMsgSelection, toggleSelectionMode,
        handleBulkDelete
    };
}
