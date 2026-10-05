"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { Inbox } from "@/components/inbox";
import { CalendarView } from "@/components/calendar";
import { SettingsView } from "@/components/settings-view";
import { ComposeModal } from "@/components/compose-modal";
import { AIChat } from "@/components/chat/ai-chat";
import { MailFolder, NormalizedMessage } from "@/types/mail";
import { useGmailMessages, GMAIL_MESSAGES_KEY } from "@/hooks/use-mail";
import { useCalendarEvents, CALENDAR_EVENTS_KEY } from "@/hooks/use-calendar";
import { useConnections } from "@/hooks/use-connections";

interface AppShellProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    id?: string | null;
  } | null;
  signOutAction: () => Promise<void>;
}

export function AppShell({ user, signOutAction }: AppShellProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeFolder, setActiveFolder] = useState<MailFolder>("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Cached Mail Query (per page)
  const {
    data: messages = [],
    isLoading: isMailLoading,
    error: mailErrorObj,
    refetch: refetchMessages,
  } = useGmailMessages({
    page: currentPage,
    pageSize,
  });
  const mailError = mailErrorObj ? mailErrorObj.message : null;

  // Cached Calendar Query
  const {
    data: events = [],
    isLoading: isCalendarLoading,
    error: calendarErrorObj,
    refetch: refetchEvents,
  } = useCalendarEvents({ limit: 50 });
  const calendarError = calendarErrorObj ? calendarErrorObj.message : null;

  // Connections status
  const { refetch: refetchConnections } = useConnections();

  // General refreshing state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: [GMAIL_MESSAGES_KEY] }),
      queryClient.invalidateQueries({ queryKey: [CALENDAR_EVENTS_KEY] }),
      refetchConnections(),
    ]);
    setIsRefreshing(false);
  };

  // Connect helper
  const handleConnect = async (service: "gmail" | "calendar") => {
    try {
      const res = await fetch(`/api/corsair/connect/${service}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.url) {
          window.location.assign(data.url);
          return;
        }
      }
      router.push(`/api/corsair/connect/${service}`);
    } catch {
      router.push(`/api/corsair/connect/${service}`);
    }
  };

  // Optimistic message update in cache
  const handleUpdateMessage = (updated: NormalizedMessage) => {
    queryClient.setQueryData<NormalizedMessage[]>(
      [GMAIL_MESSAGES_KEY, currentPage],
      (old) => (old ? old.map((m) => (m.id === updated.id ? updated : m)) : []),
    );
  };

  // Optimistic message delete in cache
  const handleDeleteMessage = (id: string) => {
    queryClient.setQueryData<NormalizedMessage[]>(
      [GMAIL_MESSAGES_KEY, currentPage],
      (old) => (old ? old.filter((m) => m.id !== id) : []),
    );
  };

  const unreadCount = messages.filter((m) => m.isUnread).length;
  const starredCount = messages.filter((m) => m.isStarred).length;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Top Header */}
      <Header
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing || isMailLoading || isCalendarLoading}
        signOutAction={signOutAction}
        onOpenAI={() => setActiveFolder("ai")}
        isAIOpen={activeFolder === "ai"}
      />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeFolder={activeFolder}
          onSelectFolder={(folder) => {
            setActiveFolder(folder);
            setCurrentPage(1);
          }}
          unreadCount={unreadCount}
          starredCount={starredCount}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenCompose={() => setIsComposeOpen(true)}
        />

        {/* Content Area */}
        <main className="flex flex-1 flex-col overflow-hidden bg-zinc-950">
          {activeFolder === "ai" ? (
            <AIChat
              user={user}
              onConnectService={handleConnect}
            />
          ) : activeFolder === "calendar" ? (
            <CalendarView
              events={events}
              isLoading={isCalendarLoading}
              error={calendarError}
              onRefresh={refetchEvents}
              onConnectCalendar={() => handleConnect("calendar")}
              onEventCreated={() =>
                queryClient.invalidateQueries({
                  queryKey: [CALENDAR_EVENTS_KEY],
                })
              }
              onEventUpdated={() =>
                queryClient.invalidateQueries({
                  queryKey: [CALENDAR_EVENTS_KEY],
                })
              }
              onEventDeleted={() =>
                queryClient.invalidateQueries({
                  queryKey: [CALENDAR_EVENTS_KEY],
                })
              }
            />
          ) : activeFolder === "settings" ? (
            <SettingsView
              user={user}
              onConnectGmail={() => handleConnect("gmail")}
              onConnectCalendar={() => handleConnect("calendar")}
            />
          ) : (
            <Inbox
              activeFolder={activeFolder}
              messages={messages}
              isLoading={isMailLoading}
              error={mailError}
              searchQuery={searchQuery}
              onRefresh={refetchMessages}
              onConnectGmail={() => handleConnect("gmail")}
              onOpenCompose={() => setIsComposeOpen(true)}
              onUpdateMessage={handleUpdateMessage}
              onDeleteMessage={handleDeleteMessage}
              currentPage={currentPage}
              pageSize={pageSize}
              onNextPage={() => setCurrentPage((p) => p + 1)}
              onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
            />
          )}
        </main>
      </div>

      {/* Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSent={() => {
          queryClient.invalidateQueries({ queryKey: [GMAIL_MESSAGES_KEY] });
        }}
      />
    </div>
  );
}
