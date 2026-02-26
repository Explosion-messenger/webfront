import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, isSameDay } from 'date-fns';
import { ChevronDown, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useChats, useMessages, useAvatarEditor, useWebSocket } from '../hooks/useChat';
import { type Chat, type Message } from '../types';

import MessageBubble from '../components/MessageBubble';
import GroupSettingsModal from '../components/GroupSettingsModal';
import MessageContextMenu from '../components/MessageContextMenu';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import BigReaction from '../components/BigReaction';
import AvatarCropModal from '../components/chat/AvatarCropModal';
import ChatContextMenu from '../components/chat/ChatContextMenu';
import NewChatModal from '../components/chat/NewChatModal';
import ChatInput from '../components/chat/ChatInput';
import ChatHeader from '../components/chat/ChatHeader';
import ChatSidebar from '../components/chat/ChatSidebar';

import { useMessageSearch } from '../hooks/useMessageSearch';
import { useMessageSelection } from '../hooks/useMessageSelection';
import { useChatScroll } from '../hooks/useChatScroll';
import { useChatActions } from '../hooks/useChatActions';
import { useChatPresence } from '../hooks/useChatPresence';
import { useChatWebSocketHandlers } from '../hooks/useChatWebSocketHandlers';

const ChatPage: React.FC = () => {
    const { user, logout, token, refreshUser } = useAuth();
    const navigate = useNavigate();
    const { chatId: urlChatId } = useParams();

    // Core State
    const { chats, setChats, fetchChats, loading: chatsLoading, error: chatsError } = useChats();
    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const { messages, setMessages, loading: messagesLoading } = useMessages(activeChat?.id || null);

    // UI State
    const [inputText, setInputText] = useState('');
    const [showNewChat, setShowNewChat] = useState(false);
    const [showGroupSettings, setShowGroupSettings] = useState(false);

    // Context Menus & Modals
    const [selectedMessageForReceipts, setSelectedMessageForReceipts] = useState<Message | null>(null);
    const [receiptsPosition, setReceiptsPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [messageToDelete, setMessageToDelete] = useState<number | null>(null);
    const [chatMenuPos, setChatMenuPos] = useState<{ x: number, y: number } | null>(null);
    const [chatMenuTarget, setChatMenuTarget] = useState<Chat | null>(null);
    const [activeBigReaction, setActiveBigReaction] = useState<{ emoji: string, timestamp: number } | null>(null);

    // Hooks Custom Extraction
    const {
        isMsgSearchOpen, setIsMsgSearchOpen,
        msgSearchQuery, setMsgSearchQuery,
        searchMatchIds, currentMatchIndex,
        highlightedMsgId,
        nextMatch, prevMatch, clearSearch
    } = useMessageSearch(messages);

    const {
        selectedMsgIds,
        isSelectionMode, setIsSelectionMode,
        toggleMsgSelection, toggleSelectionMode,
        handleBulkDelete
    } = useMessageSelection((deletedIds) => {
        setMessages(prev => prev.filter(m => !deletedIds.has(m.id)));
    });

    const chatActions = useChatActions(activeChat, setMessages, (deletedId) => {
        setChats(prev => prev.filter(c => c.id !== deletedId));
        if (activeChat?.id === deletedId) {
            navigate('/');
            setShowGroupSettings(false);
        }
    }, navigate);

    const {
        messagesEndRef,
        scrollContainerRef,
        unreadBottomCount,
        setUnreadBottomCount,
        showScrollButton,
        isAtBottomRef,
        scrollToBottom
    } = useChatScroll(messages, messagesLoading, user, activeChat, chatActions.markChatRead);

    const avatarEditor = useAvatarEditor(
        async (formData) => {
            await api.post('/me/avatar', formData);
            await refreshUser();
        },
        async () => {
            await api.delete('/me/avatar');
            await refreshUser();
        }
    );

    // Initial Loading & URL routing
    useEffect(() => {
        fetchChats();
    }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (urlChatId && chats.length > 0) {
            const foundChat = chats.find(c => c.id === Number(urlChatId));
            if (foundChat) {
                setActiveChat(foundChat);
                localStorage.setItem('activeChatId', urlChatId);
            }
        } else if (!urlChatId) {
            const lastChatId = localStorage.getItem('activeChatId');
            if (lastChatId && chats.length > 0) {
                const foundChat = chats.find(c => c.id === Number(lastChatId));
                if (foundChat) {
                    navigate(`/${lastChatId}`);
                } else setActiveChat(null);
            } else setActiveChat(null);
        }
    }, [urlChatId, chats, navigate]);

    useEffect(() => {
        if (!activeChat) return;
        setInputText('');
        setIsSelectionMode(false);
        clearSearch();

        if (activeChat.unread_count > 0) {
            setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, unread_count: 0 } : c));
            chatActions.markChatRead();
        }
    }, [activeChat?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            // Only disable on app structure, not inputs. But for simplicity let's disable whole window default.
            // Actually, we should probably allow it on inputs, but let's conform to original logic.
            // A better way is to allow inputs to have context menu. 
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
            e.preventDefault();
        };
        window.addEventListener('contextmenu', handleContextMenu);
        return () => window.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showNewChat) setShowNewChat(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showNewChat]);

    // Setup Presence and WebSocket
    const { userStatuses, setUserStatuses, typingUsers, setTypingUsers } = useChatPresence(
        token, user, activeChat, inputText, (data) => wsActions.sendJson(data)
    );

    const wsHandlers = useChatWebSocketHandlers(
        activeChat?.id || null, user, setMessages, setChats, fetchChats,
        isAtBottomRef.current, setUnreadBottomCount, setUserStatuses, setTypingUsers, setActiveBigReaction,
        setActiveChat, navigate, setShowGroupSettings
    );

    const wsActions = useWebSocket(token, wsHandlers);

    return (
        <div className="flex h-full w-full bg-brand-bg text-brand-text overflow-hidden font-sans relative p-4 gap-4">
            <div className="radar-glow" />

            <ChatSidebar
                currentUser={user}
                userStatuses={userStatuses}
                typingUsers={typingUsers}
                chats={chats}
                activeChatId={activeChat?.id || null}
                chatsLoading={chatsLoading}
                chatsError={chatsError}
                onLogout={logout}
                onShowNewChat={() => setShowNewChat(true)}
                onFetchChats={fetchChats}
                onChatSelect={(id) => navigate(`/${id}`)}
                onChatContextMenu={(e, chat) => {
                    e.preventDefault();
                    setChatMenuPos({ x: e.clientX, y: e.clientY });
                    setChatMenuTarget(chat);
                }}
                avatarFileInputRef={avatarEditor.fileInputRef}
                onSelectAvatarFile={avatarEditor.onSelectFile}
                onDeleteAvatar={avatarEditor.handleAvatarDelete}
            />

            <div className="flex-1 flex flex-col relative z-10 glass-panel overflow-hidden min-w-0">
                <AnimatePresence mode="wait">
                    {activeChat ? (
                        <div key={activeChat.id} className="flex-1 flex flex-col min-h-0">
                            <ChatHeader
                                activeChat={activeChat}
                                currentUser={user}
                                userStatuses={userStatuses}
                                typingUsers={typingUsers[activeChat.id] || {}}
                                onGroupSettingsClick={() => setShowGroupSettings(true)}
                                isMsgSearchOpen={isMsgSearchOpen}
                                setIsMsgSearchOpen={setIsMsgSearchOpen}
                                msgSearchQuery={msgSearchQuery}
                                setMsgSearchQuery={setMsgSearchQuery}
                                searchMatchIds={searchMatchIds}
                                currentMatchIndex={currentMatchIndex}
                                onPrevMatch={prevMatch}
                                onNextMatch={nextMatch}
                                onClearSearch={clearSearch}
                                isSelectionMode={isSelectionMode}
                                toggleSelectionMode={toggleSelectionMode}
                                selectedMsgIdsSize={selectedMsgIds.size}
                                onBulkDelete={handleBulkDelete}
                            />

                            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
                                <AnimatePresence mode="popLayout">
                                    {!messagesLoading ? (
                                        messages.map((msg, index) => {
                                            const prevMsg = messages[index - 1];
                                            const showDate = !prevMsg || !isSameDay(new Date(msg.created_at), new Date(prevMsg.created_at));

                                            return (
                                                <React.Fragment key={msg.id}>
                                                    {showDate && (
                                                        <div className="flex justify-center my-8 first:mt-2">
                                                            <div className="px-5 py-1.5 rounded-full bg-white/60 border border-white/50 text-[10px] font-black text-brand-text-dim uppercase tracking-[0.2em] shadow-sm backdrop-blur-md">
                                                                {format(new Date(msg.created_at), 'd MMMM, yyyy')}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <MessageBubble
                                                        msg={msg}
                                                        currentUser={user}
                                                        isGroup={activeChat.is_group}
                                                        onDelete={setMessageToDelete}
                                                        onRead={chatActions.markMessageRead}
                                                        onReadReceiptsClick={(m, pos) => {
                                                            setSelectedMessageForReceipts(m);
                                                            setReceiptsPosition(pos);
                                                        }}
                                                        onReactionToggle={chatActions.handleToggleReaction}
                                                        isSelectionMode={isSelectionMode}
                                                        isSelected={selectedMsgIds.has(msg.id)}
                                                        onSelect={() => toggleMsgSelection(msg.id)}
                                                        isHighlighted={highlightedMsgId === msg.id}
                                                    />
                                                </React.Fragment>
                                            );
                                        })
                                    ) : (
                                        <div className="flex flex-col space-y-4 animate-pulse">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className={`h-16 w-2/3 rounded-2xl bg-brand-card/20 ${i % 2 === 0 ? 'self-end' : 'self-start'}`} />
                                            ))}
                                        </div>
                                    )}
                                </AnimatePresence>
                                <div ref={messagesEndRef} />
                            </div>

                            <AnimatePresence>
                                {showScrollButton && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                        onClick={scrollToBottom}
                                        className="absolute bottom-28 right-8 z-40 bg-brand-accent text-white p-3 rounded-full shadow-glow flex items-center space-x-2 group hover:scale-110 active:scale-95 transition-all"
                                    >
                                        <div className="relative">
                                            <ChevronDown size={24} className="group-hover:translate-y-0.5 transition-transform" />
                                            {unreadBottomCount > 0 && (
                                                <span className="absolute -top-4 -right-4 bg-red-500 text-[10px] font-black w-6 h-6 rounded-full border-2 border-brand-bg flex items-center justify-center shadow-lg">
                                                    {unreadBottomCount > 99 ? '99+' : unreadBottomCount}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] uppercase font-black tracking-widest pr-2 hidden group-hover:block">Scroll to latest</span>
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            <ChatInput
                                inputText={inputText}
                                setInputText={setInputText}
                                isSending={chatActions.isSending}
                                replyToMessage={chatActions.replyToMessage}
                                onClearReply={() => chatActions.setReplyToMessage(null)}
                                onSendMessage={(e) => {
                                    e.preventDefault();
                                    chatActions.sendMessage(inputText).then(success => { if (success) setInputText(''); });
                                }}
                                onFileUpload={chatActions.handleFileUpload}
                            />
                        </div>
                    ) : (
                        <div key="welcome" className="flex-1 flex flex-col items-center justify-center text-brand-text-dim space-y-6">
                            <div className="w-24 h-24 bg-brand-card/50 border border-brand-border rounded-3xl flex items-center justify-center shadow-premium relative">
                                <Send size={40} strokeWidth={1} className="text-brand-accent" />
                                <div className="absolute inset-0 bg-brand-accent/10 blur-2xl rounded-full" />
                            </div>
                            <div className="text-center">
                                <p className="text-xs uppercase tracking-[0.4em] font-bold text-brand-accent opacity-80 mb-2">Encrypted Messenger</p>
                                <p className="text-lg font-light tracking-tight text-white/50 italic">Waiting for connection...</p>
                            </div>
                        </div>
                    )}
                </AnimatePresence>

                <NewChatModal
                    show={showNewChat}
                    onClose={() => setShowNewChat(false)}
                    onChatCreated={(chat) => chatActions.handleChatCreated(chat, setChats)}
                />

                <AvatarCropModal
                    show={avatarEditor.showAvatarEditor}
                    onClose={() => avatarEditor.setShowAvatarEditor(false)}
                    imgSrc={avatarEditor.imgSrc}
                    crop={avatarEditor.crop}
                    setCrop={avatarEditor.setCrop}
                    setCompletedCrop={avatarEditor.setCompletedCrop}
                    onSave={avatarEditor.handleAvatarSave}
                    imgRef={avatarEditor.imgRef}
                />

                <AnimatePresence>
                    {showGroupSettings && activeChat && (
                        <GroupSettingsModal
                            chat={activeChat}
                            currentUser={user}
                            userStatuses={userStatuses}
                            onClose={() => setShowGroupSettings(false)}
                            onUpdate={(updatedChat) => {
                                setChats(prev => prev.map(c => c.id === updatedChat.id ? updatedChat : c));
                                setActiveChat(updatedChat);
                            }}
                            onDelete={(chatId) => {
                                setChats(prev => prev.filter(c => c.id !== chatId));
                                navigate('/');
                                setShowGroupSettings(false);
                            }}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {selectedMessageForReceipts && activeChat && (
                        <MessageContextMenu
                            message={selectedMessageForReceipts}
                            chat={activeChat}
                            position={receiptsPosition}
                            onClose={() => setSelectedMessageForReceipts(null)}
                            onReactionToggle={(emoji) => chatActions.handleToggleReaction(selectedMessageForReceipts.id, emoji)}
                            onReply={chatActions.setReplyToMessage}
                            currentUserId={user?.id}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {messageToDelete && (
                        <ConfirmDeleteModal
                            onConfirm={() => {
                                chatActions.deleteMessage(messageToDelete);
                                setMessageToDelete(null);
                            }}
                            onCancel={() => setMessageToDelete(null)}
                        />
                    )}
                </AnimatePresence>

                <ChatContextMenu
                    pos={chatMenuPos}
                    target={chatMenuTarget}
                    currentUser={user}
                    onClose={() => {
                        setChatMenuPos(null);
                        setChatMenuTarget(null);
                    }}
                    onLeaveChat={(chat) => chatActions.handleLeaveChat(chat, () => {
                        setChatMenuPos(null);
                        setChatMenuTarget(null);
                    })}
                    onDeleteChat={(chat) => chatActions.handleDeleteChatAccount(chat, () => {
                        setChatMenuPos(null);
                        setChatMenuTarget(null);
                    })}
                />

                <AnimatePresence>
                    {activeBigReaction && (
                        <BigReaction
                            key={activeBigReaction.timestamp}
                            emoji={activeBigReaction.emoji}
                            onComplete={() => setActiveBigReaction(null)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ChatPage;
