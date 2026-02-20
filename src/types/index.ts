export interface User {
    id: number;
    username: string;
    email?: string;
    avatar_path?: string;
    is_admin: boolean;
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
}

export interface Chat {
    id: number;
    name?: string;
    avatar_path?: string;
    is_group: boolean;
    members: User[];
    last_message?: Message;
    created_at: string;
}
