/**
 * AIAssistant — chat dialog for interacting with AI providers.
 *
 * Renders a conversational interface where users can ask AI to
 * generate, modify, or explain builder components. AI suggestions
 * can be applied to the document via the command engine.
 */
import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  ScrollArea,
  Badge,
  Separator,
} from "@ui-builder/ui";
import { Settings } from "lucide-react";
import { useBuilder } from "@ui-builder/builder-react";
import type { AIConfig, AIMessage, AIConversation, AICommandSuggestion, AIBuilderContext } from "./types";
import { sendAIMessage } from "./AIService";
import { AIConfigPanel } from "./AIConfig";
import { useTranslation } from "react-i18next";

// Commands the AI is allowed to dispatch — destructive/system commands are excluded
const ALLOWED_AI_COMMANDS = new Set([
  "ADD_NODE",
  "UPDATE_PROPS",
  "UPDATE_STYLE",
  "UPDATE_RESPONSIVE_PROPS",
  "UPDATE_RESPONSIVE_STYLE",
  "RENAME_NODE",
  "DUPLICATE_NODE",
  "UPDATE_CANVAS_CONFIG",
  "UPDATE_NODE_INTERACTIONS",
]);

// ── Props ───────────────────────────────────────────────────────────────

export interface AIAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: AIConfig;
  onConfigChange?: (config: AIConfig) => void;
  context: AIBuilderContext;
}

// ── Component ───────────────────────────────────────────────────────────

export function AIAssistant({ open, onOpenChange, config, onConfigChange, context }: AIAssistantProps) {
  const { t } = useTranslation();
  const { dispatch } = useBuilder();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<"chat" | "settings">("chat");
  const [conversation, setConversation] = useState<AIConversation>({
    messages: [],
    isLoading: false,
    error: null,
  });
  const [input, setInput] = useState("");

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation.messages]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || conversation.isLoading) return;
    if (!config.apiKey) {
      setConversation((c) => ({ ...c, error: t("ai.apiKeyNotConfigured") }));
      return;
    }

    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    setInput("");
    setConversation((c) => ({
      messages: [...c.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const allMessages = [...conversation.messages, userMessage];
      const response = await sendAIMessage(allMessages, context, config);

      const assistantMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.message || "(no response)",
        timestamp: Date.now(),
      };

      setConversation((c) => ({
        messages: [
          ...c.messages,
          {
            ...assistantMessage,
            // Stash suggestions in a non-serialised property
            content:
              assistantMessage.content +
              (response.suggestions
                ? `\n__SUGGESTIONS__${JSON.stringify(response.suggestions)}`
                : ""),
          },
        ],
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      setConversation((c) => ({
        ...c,
        isLoading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, [input, conversation, config, context, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const applySuggestion = useCallback(
    (suggestion: AICommandSuggestion) => {
      if (!ALLOWED_AI_COMMANDS.has(suggestion.type)) return;
      try {
        dispatch({ type: suggestion.type, payload: suggestion.payload } as never);
      } catch {
        // Command may not match — ignore
      }
    },
    [dispatch],
  );

  const clearChat = useCallback(() => {
    setConversation({ messages: [], isLoading: false, error: null });
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[80vh] flex flex-col p-0 gap-0">
        {/* Header with tabs */}
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-sm font-medium">{t("ai.title")}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {config.provider}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setView(view === "chat" ? "settings" : "chat")}
                title={view === "chat" ? "Settings" : "Chat"}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content based on view */}
        {view === "chat" ? (
          <>
            {/* Message list */}
            <ScrollArea className="flex-1 min-h-0 px-4" ref={scrollRef}>
              <div className="py-3 space-y-3">
                {conversation.messages.length === 0 && !conversation.isLoading && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    {t("ai.placeholder")}
                  </p>
                )}

                {conversation.messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onApplySuggestion={applySuggestion}
                  />
                ))}

                {conversation.isLoading && (
                  <div className="flex gap-1 items-center text-xs text-muted-foreground py-2">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse delay-100">●</span>
                    <span className="animate-pulse delay-200">●</span>
                    <span className="ml-1">Thinking…</span>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Error */}
            {conversation.error && (
              <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs border-t">
                {conversation.error}
              </div>
            )}

            <Separator />

            {/* Input */}
            <div className="px-4 py-3 flex gap-2 shrink-0">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask AI to help…"
                disabled={conversation.isLoading}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={() => void handleSend()}
                disabled={!input.trim() || conversation.isLoading}
              >
                Send
              </Button>
            </div>

            {/* Clear button at bottom */}
            {conversation.messages.length > 0 && (
              <div className="px-4 py-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8"
                  onClick={clearChat}
                >
                  Clear Conversation
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Settings panel */}
            <ScrollArea className="flex-1 min-h-0">
              <AIConfigPanel 
                config={config} 
                onChange={(newConfig) => {
                  onConfigChange?.(newConfig);
                }}
              />
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Message bubble ──────────────────────────────────────────────────────

function MessageBubble({
  message,
  onApplySuggestion,
}: {
  message: AIMessage;
  onApplySuggestion: (s: AICommandSuggestion) => void;
}) {
  const isUser = message.role === "user";

  // Extract suggestions from tail marker
  let displayContent = message.content;
  let suggestions: AICommandSuggestion[] = [];
  const idx = message.content.indexOf("__SUGGESTIONS__");
  if (idx !== -1) {
    displayContent = message.content.slice(0, idx).trim();
    try {
      suggestions = JSON.parse(message.content.slice(idx + "__SUGGESTIONS__".length));
    } catch {
      // ignore
    }
  }

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {displayContent || "(empty)"}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1 max-w-[85%]">
          {suggestions.map((s, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="h-6 text-[10px]"
              onClick={() => onApplySuggestion(s)}
            >
              Apply: {s.description}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
