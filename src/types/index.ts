export interface User {
    id: number;
    username: string;
    email?: string;
    avatar_path?: string;
    is_admin: boolean;
    is_chat_admin?: boolean;
    is_chat_owner?: boolean;
    is_verified: boolean;
    is_2fa_enabled: boolean;
    created_at: string;
}

export interface MessageFile {
    id: number;
    filename: string;
    path: string;
    mime_type: string;
    size: number;
}

export interface MessageRead {
    user_id: number;
    read_at: string;
}

export interface MessageReaction {
    id: number;
    user_id: number;
    emoji: string;
    created_at: string;
}

export interface Message {
    id: number;
    chat_id: number;
    sender_id: number;
    sender: User;
    text?: string;
    file?: MessageFile;
    created_at: string;
    read_by: MessageRead[];
    reactions: MessageReaction[];
    reply_to?: {
        id: number;
        text?: string;
        sender: User;
    };
}

export interface Chat {
    id: number;
    name?: string;
    avatar_path?: string;
    is_group: boolean;
    members: User[];
    last_message?: Message;
    created_at: string;
    unread_count: number;
}

export const WSEventType = {
    NEW_MESSAGE: 'new_message',
    DELETE_MESSAGE: 'delete_message',
    MESSAGE_READ: 'message_read',
    MESSAGE_REACTION: 'message_reaction',
    NEW_CHAT: 'new_chat',
    CHAT_UPDATED: 'chat_updated',
    CHAT_DELETED: 'chat_deleted',
    USER_STATUS: 'user_status',
    ONLINE_LIST: 'online_list',
    USER_UPDATED: 'user_updated',
    TYPING: 'typing',
    USER_STATUS_UPDATE: 'user_status_update'
} as const;

export type WSEventType = (typeof WSEventType)[keyof typeof WSEventType];
