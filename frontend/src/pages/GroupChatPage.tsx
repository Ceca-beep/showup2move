import { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, ArrowLeft, Users, Loader2, Circle, Crown } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id?: string;
  content: string;
  sender_id: string;
  sender_name?: string;
  sent_at?: string;
  users?: { display_name: string };
}

interface Member {
  id: string;
  display_name: string;
  skill_level?: string;
  status?: string;
}

interface GroupInfo {
  id: string;
  captain_id: string;
  sports?: { name: string };
  max_size: number;
}

export default function GroupChatPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!groupId || !token) return;

    client.get(`/chat/${groupId}/messages`)
      .then((res) => setMessages(Array.isArray(res.data) ? res.data : []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));

    client.get(`/groups/${groupId}/members`)
      .then((res) => setMembers(Array.isArray(res.data) ? res.data : []))
      .catch(() => setMembers([]));

    // Load group info
    client.get('/match/my-groups')
      .then((res) => {
        const groups = Array.isArray(res.data) ? res.data : [];
        const found = groups.find((g: any) => g.groups?.id === groupId);
        if (found?.groups) setGroupInfo(found.groups);
      })
      .catch(() => {});

    const ws = new WebSocket(`ws://127.0.0.1:8000/chat/${groupId}/ws?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev, data]);
      } catch { }
    };

    return () => { ws.close(); wsRef.current = null; };
  }, [groupId, token]);

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ content: input.trim() }));
    setInput('');
  };

  const formatTime = (ts?: string) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSenderName = (msg: Message) => {
    return msg.users?.display_name || msg.sender_name || 'Unknown';
  };

  const sportName = groupInfo?.sports?.name || 'Group Chat';

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen md:ml-64">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <Link to="/groups" className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-slate-800 truncate">{sportName}</h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Circle className={`w-2 h-2 ${connected ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-300 text-slate-300'}`} />
            {connected ? 'Connected' : 'Connecting...'}
            <span className="mx-1">·</span>
            <Users className="w-3 h-3" /> {members.length} members
          </div>
        </div>
        <button
          onClick={() => setShowMembers(!showMembers)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showMembers ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Members</span>
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-12">No messages yet. Say hello!</p>
            ) : (
              messages.map((msg, i) => {
                const isOwn = msg.sender_id === user?.id;
                const senderName = getSenderName(msg);
                return (
                  <div key={msg.id || i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {!isOwn && (
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-semibold mr-2 mt-1 shrink-0">
                        {senderName[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className={`max-w-[75%] ${isOwn ? '' : ''}`}>
                      {!isOwn && (
                        <p className="text-xs text-slate-400 mb-0.5 ml-1">{senderName}</p>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                        isOwn
                          ? 'bg-emerald-500 text-white rounded-br-md'
                          : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-md'
                      }`}>
                        <p>{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isOwn ? 'text-emerald-200' : 'text-slate-400'}`}>
                          {formatTime(msg.sent_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="bg-white border-t border-slate-200 p-3 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={connected ? 'Type a message...' : 'Connecting...'}
              disabled={!connected}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || !connected}
              className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Members sidebar */}
        {showMembers && (
          <div className="w-64 bg-white border-l border-slate-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Members ({members.length})
              </h3>
              <div className="space-y-2">
                {members.map((m) => {
                  const isCaptain = groupInfo?.captain_id === m.id;
                  return (
                    <div key={m.id} className="flex items-center gap-2.5 py-1.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-semibold shrink-0">
                        {m.display_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-slate-700 truncate">{m.display_name}</span>
                          {isCaptain && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                        </div>
                        {m.skill_level && (
                          <p className="text-xs text-slate-400 capitalize">{m.skill_level}</p>
                        )}
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        m.status === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}