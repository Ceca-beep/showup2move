import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Users, ThumbsUp, ThumbsDown, Loader2, Navigation, CheckCircle } from 'lucide-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function FlyToUser({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 13, { duration: 1.5 });
  }, [lat, lng, map]);
  return null;
}

interface Event {
  id: string;
  title: string;
  location_name: string;
  starts_at: string;
  lat?: number;
  lng?: number;
  status: string;
  group_id?: string;
}

interface Group {
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

export default function DashboardPage() {
  const { user } = useAuth();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matchMessage, setMatchMessage] = useState<string | null>(null);
  const [joiningGroup, setJoiningGroup] = useState<string | null>(null);
  const [joinedGroups, setJoinedGroups] = useState<Set<string>>(new Set());
  const [joiningEvent, setJoiningEvent] = useState<string | null>(null);
  const [joinedEvents, setJoinedEvents] = useState<Set<string>>(new Set());

  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationAsked, setLocationAsked] = useState(false);

  const defaultPos = { lat: 45.7489, lng: 21.2087 };

  useEffect(() => { requestLocation(); }, []);
  useEffect(() => { loadData(); }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(coords);
        setLocationEnabled(true);
        setLocationAsked(true);
        client.patch('/users/me', { lat: coords.lat, lng: coords.lng }).catch(() => {});
      },
      () => {
        setLocationAsked(true);
        setUserPos(defaultPos);
      }
    );
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsRes, groupsRes] = await Promise.all([
        client.get('/events/').catch(() => ({ data: [] })),
        client.get('/match/my-groups').catch(() => ({ data: [] })),
      ]);
      setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
      setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  const handleAvailability = async (isAvailable: boolean) => {
    setSubmitting(true);
    setMatchMessage(null);
    try {
      await client.post('/availability/today', { is_available: isAvailable });
      setAvailable(isAvailable);
      if (isAvailable) {
        setMatching(true);
        const res = await client.post('/match/run', null, { params: { radius_km: 10 } });
        const count = res.data?.groups_created || 0;
        setMatchMessage(
          count > 0
            ? `${count} group${count > 1 ? 's' : ''} formed! Check your groups below.`
            : 'No matches yet — check back soon as more players join!'
        );
        await loadData();
      }
    } catch {
      setMatchMessage('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
      setMatching(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    setJoiningGroup(groupId);
    try {
      await client.post(`/match/groups/${groupId}/confirm`);
      setJoinedGroups((prev) => new Set([...prev, groupId]));
    } catch {
      //
    } finally {
      setJoiningGroup(null);
    }
  };

  const handleJoinFromEvent = async (eventId: string, groupId?: string) => {
    if (!groupId) return;
    setJoiningEvent(eventId);
    try {
      await client.post(`/match/groups/${groupId}/confirm`);
      setJoinedEvents((prev) => new Set([...prev, eventId]));
      setJoinedGroups((prev) => new Set([...prev, groupId]));
      await loadData();
    } catch {
      //
    } finally {
      setJoiningEvent(null);
    }
  };

  const mapCenter = userPos || defaultPos;

  const sportEmoji: Record<string, string> = {
    football: '⚽', basketball: '🏀', tennis: '🎾',
    running: '🏃', cycling: '🚴', volleyball: '🏐',
    swimming: '🏊', badminton: '🏸', default: '🏅',
  };

  const eventIcon = L.divIcon({
    className: '',
    html: '<div style="width:28px;height:28px;background:#10b981;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:14px">📍</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Hey, {user?.display_name || 'Athlete'}!
        </h1>
        <p className="text-slate-500 text-sm mt-1">Ready to find your next game?</p>
      </div>

      {/* Location banner */}
      {locationAsked && !locationEnabled && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl mb-4">
          <Navigation className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Enable location for better matches</p>
            <p className="text-xs text-amber-600 mt-0.5">We use your location to find nearby players and events</p>
          </div>
          <button
            onClick={requestLocation}
            className="px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-colors"
          >
            Enable
          </button>
        </div>
      )}

      {locationEnabled && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl mb-4">
          <MapPin className="w-4 h-4 text-emerald-500" />
          <p className="text-sm text-emerald-700 font-medium">Location enabled — showing nearby events</p>
        </div>
      )}

      {/* ShowUpToday */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">ShowUpToday?</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {available === null
                ? 'Are you available to play today? We will find you a group!'
                : available
                ? 'You are showing up today!'
                : 'You are marked as unavailable today'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleAvailability(true)}
              disabled={submitting}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                available === true
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              } disabled:opacity-50`}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
              Yes, I'm in!
            </button>
            <button
              onClick={() => handleAvailability(false)}
              disabled={submitting}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                available === false
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } disabled:opacity-50`}
            >
              <ThumbsDown className="w-4 h-4" />
              Not today
            </button>
          </div>
        </div>

        {(matching || matchMessage) && (
          <div className={`mt-4 flex items-center gap-2 p-3 rounded-xl text-sm ${
            matching ? 'bg-blue-50 text-blue-700'
              : matchMessage?.includes('group') ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-50 text-slate-600'
          }`}>
            {matching ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {matching ? 'Looking for players near you...' : matchMessage}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Map */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <h2 className="font-semibold text-slate-800">Nearby Events</h2>
              <span className="text-xs text-slate-400 ml-1">
                {events.filter(e => e.lat && e.lng).length} pinned
              </span>
            </div>
            {!locationEnabled && (
              <button
                onClick={requestLocation}
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
              >
                <Navigation className="w-3 h-3" /> Enable location
              </button>
            )}
          </div>
          <div className="h-72 md:h-96">
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={12}
              className="h-full w-full"
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FlyToUser lat={mapCenter.lat} lng={mapCenter.lng} />

              {/* User marker */}
              {locationEnabled && userPos && (
                <Marker
                  position={[userPos.lat, userPos.lng]}
                  icon={L.divIcon({
                    className: '',
                    html: '<div style="width:14px;height:14px;background:#10b981;border:2px solid white;border-radius:50%;box-shadow:0 0 6px rgba(16,185,129,0.6)"></div>',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7],
                  })}
                >
                  <Popup>You are here</Popup>
                </Marker>
              )}

              {/* Event markers */}
              {events
                .filter((ev) => ev.lat && ev.lng)
                .map((ev) => {
                  const alreadyJoined = joinedEvents.has(ev.id);
                  return (
                    <Marker key={ev.id} position={[ev.lat!, ev.lng!]} icon={eventIcon}>
                      <Popup minWidth={200}>
                        <div style={{ fontFamily: 'sans-serif', padding: '4px' }}>
                          <p style={{ fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>
                            {ev.title}
                          </p>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 2px' }}>
                            📍 {ev.location_name}
                          </p>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px' }}>
                            🕐 {new Date(ev.starts_at).toLocaleString()}
                          </p>
                          {ev.group_id ? (
                            alreadyJoined ? (
                              <div style={{ background: '#ecfdf5', color: '#065f46', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', textAlign: 'center' }}>
                                ✓ Joined
                              </div>
                            ) : (
                              <button
                                onClick={() => handleJoinFromEvent(ev.id, ev.group_id)}
                                disabled={joiningEvent === ev.id}
                                style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}
                              >
                                {joiningEvent === ev.id ? 'Joining...' : 'Join group'}
                              </button>
                            )
                          ) : (
                            <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                              No group attached
                            </p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          </div>
        </div>

        {/* Matched Groups */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            <h2 className="font-semibold text-slate-800">My Groups</h2>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">
                  No groups yet. Tap <strong>Yes, I'm in!</strong> to get matched!
                </p>
              </div>
            ) : (
              groups.map((g, i) => {
                const group = g.groups;
                if (!group) return null;
                const sportName = group.sports?.name?.toLowerCase() || 'default';
                const isJoined = joinedGroups.has(group.id) || g.status === 'confirmed';
                return (
                  <div key={group.id || i} className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-lg flex-shrink-0">
                        {sportEmoji[sportName] || sportEmoji.default}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {group.sports?.name || 'Sports group'}
                        </p>
                        <p className="text-xs text-slate-400">
                          Up to {group.max_size} players ·{' '}
                          <span className={`font-medium ${g.status === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {g.status}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-2">
                      {!isJoined ? (
                        <button
                          onClick={() => handleJoinGroup(group.id)}
                          disabled={joiningGroup === group.id}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                        >
                          {joiningGroup === group.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Confirm joining
                        </button>
                      ) : (
                        <div className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg">
                          <CheckCircle className="w-3 h-3" /> Joined
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}