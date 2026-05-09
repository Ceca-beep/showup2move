import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  Users, MessageCircle, Crown, Loader2,
  MapPin, Filter, CheckCircle
} from 'lucide-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MyGroup {
  groups?: {
    id: string;
    sport_id: string;
    captain_id: string;
    status: string;
    max_size: number;
    sports?: { name: string };
  };
  status: string;
  joined_at: string;
}

interface PublicGroup {
  id: string;
  sport_id: string;
  captain_id: string;
  status: string;
  max_size: number;
  sports?: { name: string };
  lat?: number;
  lng?: number;
  member_count?: number;
}

const sportEmoji: Record<string, string> = {
  football: '⚽', basketball: '🏀', tennis: '🎾',
  running: '🏃', cycling: '🚴', volleyball: '🏐',
  swimming: '🏊', badminton: '🏸', default: '🏅',
};

const SPORT_FILTERS = ['All', 'Football', 'Basketball', 'Tennis', 'Running', 'Cycling', 'Volleyball', 'Swimming', 'Badminton'];

export default function GroupsPage() {
  const { user } = useAuth();
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [publicGroups, setPublicGroups] = useState<PublicGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mine' | 'all'>('mine');
  const [sportFilter, setSportFilter] = useState('All');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [showMap, setShowMap] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [myRes, allRes] = await Promise.all([
        client.get('/match/my-groups').catch(() => ({ data: [] })),
        client.get('/groups/').catch(() => ({ data: [] })),
      ]);
      setMyGroups(Array.isArray(myRes.data) ? myRes.data : []);
      setPublicGroups(Array.isArray(allRes.data) ? allRes.data : []);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (groupId: string) => {
    setJoiningId(groupId);
    try {
      await client.post(`/match/groups/${groupId}/confirm`);
      setJoinedIds((prev) => new Set([...prev, groupId]));
      await loadData();
    } catch {
      //
    } finally {
      setJoiningId(null);
    }
  };

  const filteredPublic = publicGroups.filter((g) => {
    if (sportFilter === 'All') return true;
    return g.sports?.name?.toLowerCase() === sportFilter.toLowerCase();
  });

  const mappableGroups = filteredPublic.filter((g) => g.lat && g.lng);
  const myGroupIds = new Set(myGroups.map((g) => g.groups?.id).filter(Boolean));

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Groups</h1>
          <p className="text-sm text-slate-500 mt-1">Your groups and nearby sports groups</p>
        </div>
        <button
          onClick={() => setShowMap(!showMap)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            showMap ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          {showMap ? 'Hide map' : 'Show map'}
        </button>
      </div>

      {/* Map */}
      {showMap && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span className="font-medium text-slate-800 text-sm">Groups on map</span>
            <span className="text-xs text-slate-400 ml-1">{mappableGroups.length} pinned</span>
          </div>
          <div style={{ height: '300px' }}>
            <MapContainer
              center={[45.7489, 21.2087]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mappableGroups.map((g) => (
                <Marker key={g.id} position={[g.lat!, g.lng!]}>
                  <Popup minWidth={180}>
                    <div style={{ fontFamily: 'sans-serif', padding: '4px' }}>
                      <p style={{ fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>
                        {sportEmoji[g.sports?.name?.toLowerCase() || 'default']} {g.sports?.name || 'Sports group'}
                      </p>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px' }}>
                        Up to {g.max_size} players
                      </p>
                      {myGroupIds.has(g.id) || joinedIds.has(g.id) ? (
                        <div style={{ background: '#ecfdf5', color: '#065f46', padding: '5px 10px', borderRadius: '8px', fontSize: '12px', textAlign: 'center' }}>
                          ✓ Joined
                        </div>
                      ) : (
                        <button
                          onClick={() => handleJoin(g.id)}
                          style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
                        >
                          Join group
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('mine')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'mine' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          My Groups ({myGroups.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'all' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Groups ({publicGroups.length})
        </button>
      </div>

      {/* Sport filter — only on All tab */}
      {activeTab === 'all' && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {SPORT_FILTERS.map((sport) => (
            <button
              key={sport}
              onClick={() => setSportFilter(sport)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                sportFilter === sport
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sport !== 'All' && (sportEmoji[sport.toLowerCase()] || '🏅')} {sport}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : activeTab === 'mine' ? (
        /* My Groups */
        myGroups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No groups yet</h3>
            <p className="text-sm text-slate-400">
              Mark yourself available on the dashboard to get matched!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myGroups.map((g, i) => {
              const group = g.groups;
              if (!group) return null;
              const sportName = group.sports?.name || 'Sports group';
              const sportKey = sportName.toLowerCase();
              const isCaptain = group.captain_id === user?.id;
              return (
                <div key={group.id || i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-xl shrink-0">
                        {sportEmoji[sportKey] || sportEmoji.default}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-800">{sportName}</h3>
                          {isCaptain && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-xs font-semibold">
                              <Crown className="w-3 h-3" /> Captain
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            g.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {g.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Up to {group.max_size} players</p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 px-5 py-3 flex gap-2">
                    <Link
                      to={`/groups/${group.id}/chat`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Open chat
                    </Link>
                    <Link
                      to={`/groups/${group.id}/chat`}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" /> Members
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* All Groups */
        filteredPublic.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <Filter className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No groups found for this sport.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredPublic.map((g) => {
              const sportName = g.sports?.name || 'Sports group';
              const sportKey = sportName.toLowerCase();
              const isJoined = myGroupIds.has(g.id) || joinedIds.has(g.id);
              return (
                <div key={g.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-xl shrink-0">
                        {sportEmoji[sportKey] || sportEmoji.default}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800">{sportName}</h3>
                        <p className="text-xs text-slate-400 mt-1">Up to {g.max_size} players</p>
                        {g.lat && g.lng && (
                          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Pinned on map
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 px-5 py-3">
                    {isJoined ? (
                      <div className="flex items-center justify-center gap-1.5 py-2 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg">
                        <CheckCircle className="w-3.5 h-3.5" /> Joined
                      </div>
                    ) : (
                      <button
                        onClick={() => handleJoin(g.id)}
                        disabled={joiningId === g.id}
                        className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                      >
                        {joiningId === g.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Join group
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}