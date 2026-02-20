export interface User {
    id: number;
    username: string;
    avatar_path?: string;
    is_admin: boolean;
    created_at: string;
}

export interface MessageFile {
    id: number;
    filename: string;
    path: string;
    mime_type: string;
    size: number;
}

export interface Message {
    id: number;
    chat_id: number;
    sender_id: number;
    sender: User;
    text?: string;
    file?: MessageFile;
    created_at: string;
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
