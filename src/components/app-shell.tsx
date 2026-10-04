"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { Inbox } from "@/components/inbox";
import { CalendarView } from "@/components/calendar";
import { SettingsView } from "@/components/settings-view";
import { ComposeModal } from "@/components/compose-modal";
import {
  MailFolder,
  NormalizedMessage,
  NormalizedEvent,
  parseGmailMessage,
  parseCalendarEvent,
} from "@/types/mail";

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
  const [activeFolder, setActiveFolder] = useState<MailFolder>("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Mail state
  const [messages, setMessages] = useState<NormalizedMessage[]>([]);
  const [isMailLoading, setIsMailLoading] = useState(true);
  const [mailError, setMailError] = useState<string | null>(null);

  // Calendar state
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // General refreshing state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch Gmail messages
  const fetchMessages = useCallback(async () => {
    setIsMailLoading(true);
    setMailError(null);
    try {
      const res = await fetch(`/api/gmail/messages?limit=100&offset=0`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.error || `Failed to fetch messages (Status: ${res.status})`,
        );
      }
      const data = await res.json();
      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.messages)
          ? data.messages
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.data)
              ? data.data
              : [];

      const parsed = rawList.map((m: unknown, idx: number) =>
        parseGmailMessage(m, idx),
      );
      setMessages(parsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load messages";
      setMailError(msg);
      setMessages([]);
    } finally {
      setIsMailLoading(false);
    }
  }, []);

  // Fetch Calendar events
  const fetchEvents = useCallback(async () => {
    setIsCalendarLoading(true);
    setCalendarError(null);
    try {
      const res = await fetch("/api/calendar/events?limit=50");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.error || `Failed to fetch events (Status: ${res.status})`,
        );
      }
      const data = await res.json();
      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.events)
            ? data.events
            : Array.isArray(data?.data)
              ? data.data
              : [];

      const parsed = rawList.map((e: unknown, idx: number) =>
        parseCalendarEvent(e, idx),
      );
      setEvents(parsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load calendar events";
      setCalendarError(msg);
      setEvents([]);
    } finally {
      setIsCalendarLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      try {
        const [msgRes, evtRes] = await Promise.allSettled([
          fetch(`/api/gmail/messages?limit=100&offset=0`),
          fetch(`/api/calendar/events?limit=50`),
        ]);

        if (ignore) return;

        if (msgRes.status === "fulfilled" && msgRes.value.ok) {
          const data = await msgRes.value.json();
          const rawList = Array.isArray(data)
            ? data
            : Array.isArray(data?.messages)
              ? data.messages
              : Array.isArray(data?.items)
                ? data.items
                : Array.isArray(data?.data)
                  ? data.data
                  : [];
          setMessages(rawList.map((m: unknown, idx: number) => parseGmailMessage(m, idx)));
          setMailError(null);
        } else if (msgRes.status === "fulfilled") {
          const errData = await msgRes.value.json().catch(() => ({}));
          setMailError(errData?.error || "Failed to fetch messages");
        } else {
          setMailError("Network error fetching messages");
        }
        setIsMailLoading(false);

        if (evtRes.status === "fulfilled" && evtRes.value.ok) {
          const data = await evtRes.value.json();
          const rawList = Array.isArray(data)
            ? data
            : Array.isArray(data?.items)
              ? data.items
              : Array.isArray(data?.events)
                ? data.events
                : Array.isArray(data?.data)
                  ? data.data
                  : [];
          setEvents(rawList.map((e: unknown, idx: number) => parseCalendarEvent(e, idx)));
          setCalendarError(null);
        } else if (evtRes.status === "fulfilled") {
          const errData = await evtRes.value.json().catch(() => ({}));
          setCalendarError(errData?.error || "Failed to fetch calendar events");
        }
        setIsCalendarLoading(false);
      } catch {
        if (!ignore) {
          setIsMailLoading(false);
          setIsCalendarLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([fetchMessages(), fetchEvents()]);
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

  // Optimistic message update
  const handleUpdateMessage = (updated: NormalizedMessage) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m)),
    );
  };

  // Optimistic message delete
  const handleDeleteMessage = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
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
          {activeFolder === "calendar" ? (
            <CalendarView
              events={events}
              isLoading={isCalendarLoading}
              error={calendarError}
              onRefresh={fetchEvents}
              onConnectCalendar={() => handleConnect("calendar")}
              onEventCreated={fetchEvents}
              onEventUpdated={fetchEvents}
              onEventDeleted={fetchEvents}
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
              onRefresh={fetchMessages}
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
          fetchMessages();
        }}
      />
    </div>
  );
}
