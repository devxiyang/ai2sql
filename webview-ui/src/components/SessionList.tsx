import React from 'react';
import { ChatSession } from '../types/session';

interface SessionListProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onNewSession: () => void;
  onSwitchSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, name: string) => void;
}

const SessionList: React.FC<SessionListProps> = ({
  sessions,
  activeSessionId,
  onNewSession,
  onSwitchSession,
  onDeleteSession,
  onRenameSession,
}) => {
  const [editingSessionId, setEditingSessionId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState('');

  const handleRename = (sessionId: string) => {
    setEditingSessionId(sessionId);
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setEditingName(session.name);
    }
  };

  const handleSaveRename = (sessionId: string) => {
    if (editingName.trim()) {
      onRenameSession(sessionId, editingName.trim());
    }
    setEditingSessionId(null);
    setEditingName('');
  };

  return (
    <div className="session-list">
      <button className="new-chat-button" onClick={onNewSession}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Chat
      </button>
      <div className="flex flex-col gap-1">
        {sessions
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .map((session) => (
          <div
            key={session.id}
            className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
          >
            <div
              className="session-item-name"
              onClick={() => onSwitchSession(session.id)}
            >
              {editingSessionId === session.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleSaveRename(session.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveRename(session.id);
                    }
                  }}
                  className="w-full px-1 py-0.5 bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded"
                  autoFocus
                />
              ) : (
                <div className="flex flex-col">
                  <div className="truncate">{session.name}</div>
                  <div className="text-xs opacity-60">
                    {new Date(session.updatedAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
            <div className="session-item-actions">
              <button
                onClick={() => handleRename(session.id)}
                className="session-action-button"
                title="Rename"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDeleteSession(session.id)}
                className="session-action-button"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionList;
