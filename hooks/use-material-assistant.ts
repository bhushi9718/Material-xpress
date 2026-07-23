import { startTransition, useState } from 'react';

import {
  getMaterialAssistantResponse,
  getMaterialAssistantStarterPrompts,
  type MaterialAssistantResponse,
} from '@/services/assistant/material-assistant-service';

type MaterialAssistantMessage = {
  id: string;
  recommendations?: MaterialAssistantResponse;
  role: 'assistant' | 'user';
  text: string;
};

const STARTER_MESSAGE: MaterialAssistantMessage = {
  id: 'assistant-intro',
  role: 'assistant',
  text: 'Tell me the room, hardware type, and counts you need, and I will suggest products, compatible materials, and working quantities.',
};

export function useMaterialAssistant() {
  const [draftMessage, setDraftMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<MaterialAssistantMessage[]>([
    STARTER_MESSAGE,
  ]);
  const starterPrompts = getMaterialAssistantStarterPrompts();

  async function sendMessage(nextValue?: string) {
    const submittedValue = (nextValue ?? draftMessage).trim();

    if (submittedValue.length < 3) {
      return;
    }

    const userMessage: MaterialAssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: submittedValue,
    };

    setDraftMessage('');
    setIsLoading(true);
    setMessages((currentMessages) => [...currentMessages, userMessage]);

    try {
      const response = await getMaterialAssistantResponse(submittedValue);

      startTransition(() => {
        setMessages((currentMessages) => [
          ...currentMessages,
          {
            id: `assistant-${Date.now()}`,
            recommendations: response,
            role: 'assistant',
            text: response.reply,
          },
        ]);
      });
    } catch (error) {
      console.error('Material assistant failed', error);

      startTransition(() => {
        setMessages((currentMessages) => [
          ...currentMessages,
          {
            id: `assistant-error-${Date.now()}`,
            role: 'assistant',
            text: 'I could not generate recommendations right now. Try a shorter requirement or search the catalog directly.',
          },
        ]);
      });
    } finally {
      setIsLoading(false);
    }
  }

  function resetConversation() {
    setDraftMessage('');
    setMessages([STARTER_MESSAGE]);
  }

  return {
    draftMessage,
    isLoading,
    messages,
    resetConversation,
    sendMessage,
    setDraftMessage,
    starterPrompts,
  };
}
