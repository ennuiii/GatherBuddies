/**
 * ChatInput Component
 *
 * Sends chat messages via Colyseus that appear as speech bubbles in Phaser.
 */

import React, { useState, useCallback } from 'react';
import { colyseusService } from '../../services/colyseusService';

interface ChatInputProps {
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ disabled = false }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = message.trim();
    if (!trimmed || disabled) return;

    colyseusService.sendChatMessage(trimmed);
    setMessage('');
  }, [message, disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Prevent game controls while typing
    e.stopPropagation();
  }, []);

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-2 bg-gray-800/90 rounded-lg">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        maxLength={200}
        disabled={disabled}
        className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </form>
  );
};
