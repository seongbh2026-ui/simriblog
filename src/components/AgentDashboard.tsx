import React, { useState, useEffect } from 'react';
import { Search, PenTool, Loader2, BookOpen, AlertCircle, Send, LogIn } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { initAuth, googleSignIn, getAccessToken } from '../lib/firebase';
import { User } from 'firebase/auth';

interface Topic {
  title: string;
  theory: string;
  reason: string;
}

export default function AgentDashboard() {
  const [keyword, setKeyword] = useState('유튜브 심리학 트렌드, 일상 고민 상담');
  const [isSearching, setIsSearching] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [isWriting, setIsWriting] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [blogContent, setBlogContent] = useState('');
  
  const [needsAuth, setNeedsAuth] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const BLOG_ID = '9001707100532443972';

  useEffect(() => {
    initAuth(
      (user, token) => {
        setNeedsAuth(false);
        setUser(user);
        setToken(token);
      },
      () => setNeedsAuth(true)
    );
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePublishToBlogger = async () => {
    if (!token || !selectedTopic || !blogContent) {
      setNeedsAuth(true);
      return;
    }

    setIsPublishing(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: selectedTopic.title,
          content: blogContent.replace(/\n/g, '<br/>'), // simple md to html for now, or just send raw as Blogger supports basic html
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || '발행에 실패했습니다.');
      }

      setSuccess('블로그에 성공적으로 발행되었습니다!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSearchTopics = async () => {
    if (!keyword.trim()) return;
    setIsSearching(true);
    setError('');
    setSuccess('');
    setTopics([]);
    setSelectedTopic(null);
    setBlogContent('');

    try {
      const res = await fetch('/api/agent/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to search topics');
      }

      setTopics(data.topics || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateBlog = async (topic: Topic) => {
    setIsWriting(true);
    setSelectedTopic(topic);
    setBlogContent('');
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/agent/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.title, theory: topic.theory }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to write blog');
      }

      setBlogContent(data.content);
    } catch (err: any) {
      setError(err.message);
      setSelectedTopic(null);
    } finally {
      setIsWriting(false);
    }
  };

  return (
    <section className="flex-1 flex flex-col min-w-0 bg-slate-50 p-6 gap-6 overflow-y-auto">
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 shrink-0">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium">오류가 발생했습니다</h3>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 text-emerald-700 shrink-0">
          <div className="w-5 h-5 shrink-0 mt-0.5 bg-emerald-500 rounded-full flex items-center justify-center text-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <div>
            <h3 className="font-medium">성공</h3>
            <p className="text-sm opacity-90">{success}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
        {/* Module 1: Topic Search */}
        <div className="bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" /> Topic Search Agent
            </span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase tracking-wide">Module 1</span>
          </div>

          <div className="p-6 flex-1 flex flex-col gap-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: 직장인 번아웃, 자존감 회복, 대인관계"
                className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                onKeyDown={(e) => e.key === 'Enter' && handleSearchTopics()}
              />
              <button
                onClick={handleSearchTopics}
                disabled={isSearching}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                검색
              </button>
            </div>

            {topics.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Discovered Topics</h3>
                {topics.map((topic, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-indigo-300 transition-colors group">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900 mb-1">{topic.title}</h4>
                        <div className="flex items-center gap-1.5 mb-2">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-xs font-medium text-indigo-700">{topic.theory}</span>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2">{topic.reason}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleGenerateBlog(topic)}
                      disabled={isWriting}
                      className="mt-4 w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors flex items-center justify-center gap-2"
                    >
                      {isWriting && selectedTopic?.title === topic.title ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PenTool className="w-4 h-4" />
                      )}
                      이 주제로 OREO 블로그 작성하기
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Module 2: OREO Blog Writer */}
        <div className="bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm h-[800px] lg:h-auto">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
            <span className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-slate-400" /> OREO Writing Engine
            </span>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold uppercase tracking-wide">Module 2</span>
          </div>

          <div className="p-6 flex-1 overflow-y-auto bg-white">
            {isWriting ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm">에이전트가 열심히 블로그 글을 작성하고 있습니다...</p>
                <div className="flex gap-2 text-xs font-medium text-slate-500">
                  <span className="bg-slate-100 px-2 py-1 rounded">Opinion</span>
                  <span className="bg-slate-100 px-2 py-1 rounded">Reason</span>
                  <span className="bg-slate-100 px-2 py-1 rounded">Example</span>
                  <span className="bg-slate-100 px-2 py-1 rounded">Offer</span>
                </div>
              </div>
            ) : blogContent ? (
              <div className="flex flex-col h-full">
                <div className="prose prose-slate prose-sm max-w-none text-slate-700 flex-1 overflow-y-auto mb-6">
                  <ReactMarkdown>{blogContent}</ReactMarkdown>
                </div>
                <div className="pt-4 border-t border-slate-200 shrink-0">
                  {needsAuth ? (
                    <button
                      onClick={handleLogin}
                      disabled={isLoggingIn}
                      className="w-full bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
                    >
                      {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4 text-blue-500" />}
                      Blogger 계정 연결하기
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                          {user?.displayName?.charAt(0) || 'U'}
                        </div>
                        <span className="truncate max-w-[120px]">{user?.email}</span>
                      </div>
                      <button
                        onClick={handlePublishToBlogger}
                        disabled={isPublishing}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-md text-sm font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                      >
                        {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        블로거(Blogger)에 바로 발행
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <PenTool className="w-12 h-12 text-slate-200 mb-2" />
                <p>좌측에서 글감을 검색한 후</p>
                <p>작성 버튼을 눌러보세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
