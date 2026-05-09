import { useState, useEffect, FormEvent} from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Plus, X, Loader2, Check, Calendar, Clock, Navigation, Pencil, Trash2 } from 'lucide-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Event {
  id: string;
  title: string;
  location_name: string;
  starts_at: string;
  status: string;
  lat?: number;
  lng?: number;
  creator_id: string;
  group_id?: string;
}

function MapPicker({
  onPick,
  initial,
}: {
  onPick: (lat: number, lng: number) => void;
  initial?: { lat: number; lng: number } | null;
}) {
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(initial || null);

  useMapEvents({
    click(e) {
      setPin({ lat: e.latlng.lat, lng: e.latlng.lng });
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  return pin ? <Marker position={[pin.lat, pin.lng]} /> : null;
}

const defaultCenter = { lat: 45.7489, lng: 21.2087 };

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [eventLat, setEventLat] = useState<number | null>(null);
  const [eventLng, setEventLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDateTime, setEditDateTime] = useState('');
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [editShowMap, setEditShowMap] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await client.get('/events/');
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = (setLat: (v: number) => void, setLng: (v: number) => void) => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setMessage({ type: 'error', text: 'Could not get your location.' });
        setLocating(false);
      }
    );
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await client.post('/events/', {
        title,
        location_name: location,
        starts_at: new Date(dateTime).toISOString(),
        lat: eventLat,
        lng: eventLng,
      });
      setEvents((prev) => [res.data, ...prev]);
      setShowCreate(false);
      setTitle(''); setLocation(''); setDateTime('');
      setEventLat(null); setEventLng(null); setShowMapPicker(false);
      setMessage({ type: 'success', text: 'Event created!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to create event.' });
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (event: Event) => {
    setEditingEvent(event);
    setEditTitle(event.title);
    setEditLocation(event.location_name);
    setEditDateTime(event.starts_at.slice(0, 16));
    setEditLat(event.lat || null);
    setEditLng(event.lng || null);
    setEditShowMap(false);
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    setSaving(true);
    try {
      const res = await client.patch(`/events/${editingEvent.id}`, {
        title: editTitle,
        location_name: editLocation,
        starts_at: new Date(editDateTime).toISOString(),
        lat: editLat,
        lng: editLng,
      });
      setEvents((prev) => prev.map((ev) => ev.id === editingEvent.id ? { ...ev, ...res.data } : ev));
      setEditingEvent(null);
      setMessage({ type: 'success', text: 'Event updated!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to update event.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    setDeletingId(eventId);
    try {
      await client.delete(`/events/${eventId}`);
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
      setConfirmDeleteId(null);
      setMessage({ type: 'success', text: 'Event deleted.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete event.' });
    } finally {
      setDeletingId(null);
    }
  };

  const mapCenter = { lat: eventLat || defaultCenter.lat, lng: eventLng || defaultCenter.lng };
  const editMapCenter = { lat: editLat || defaultCenter.lat, lng: editLng || defaultCenter.lng };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Events</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Event
        </button>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm mb-4 ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            : 'bg-red-50 text-red-600 border border-red-100'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div
          style={{ background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          className="fixed inset-0 z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Create Event</h2>
              <button onClick={() => setShowCreate(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                  placeholder="e.g. Sunday football match"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Location name</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required
                  placeholder="e.g. Central Park"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Date & Time</label>
                <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>

              {/* Pin location */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Pin location on map</label>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => useMyLocation(setEventLat, setEventLng)} disabled={locating}
                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                    My location
                  </button>
                  <button type="button" onClick={() => setShowMapPicker(!showMapPicker)}
                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                    <MapPin className="w-4 h-4" />
                    {showMapPicker ? 'Hide map' : 'Pick on map'}
                  </button>
                </div>

                {showMapPicker && (
                  <div className="rounded-lg overflow-hidden border border-slate-200 mb-2">
                    <p className="text-xs text-slate-500 px-2 py-1 bg-slate-50 border-b border-slate-200">
                      Click anywhere on the map to pin the location
                    </p>
                    <div style={{ height: '200px' }}>
                      <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <MapPicker
                          onPick={(lat, lng) => { setEventLat(lat); setEventLng(lng); }}
                          initial={eventLat && eventLng ? { lat: eventLat, lng: eventLng } : null}
                        />
                      </MapContainer>
                    </div>
                  </div>
                )}

                {eventLat && eventLng && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {eventLat.toFixed(4)}, {eventLng.toFixed(4)}
                    <button type="button" onClick={() => { setEventLat(null); setEventLng(null); }}
                      className="ml-2 text-slate-400 hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </p>
                )}
              </div>

              <button type="submit" disabled={creating}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl text-sm disabled:opacity-50">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Event
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEvent && (
        <div
          style={{ background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          className="fixed inset-0 z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setEditingEvent(null)}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Edit Event</h2>
              <button onClick={() => setEditingEvent(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Title</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Location name</label>
                <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Date & Time</label>
                <input type="datetime-local" value={editDateTime} onChange={(e) => setEditDateTime(e.target.value)} required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Pin location on map</label>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => useMyLocation(setEditLat, setEditLng)} disabled={locating}
                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    <Navigation className="w-4 h-4" /> My location
                  </button>
                  <button type="button" onClick={() => setEditShowMap(!editShowMap)}
                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                    <MapPin className="w-4 h-4" />
                    {editShowMap ? 'Hide map' : 'Pick on map'}
                  </button>
                </div>

                {editShowMap && (
                  <div className="rounded-lg overflow-hidden border border-slate-200 mb-2">
                    <p className="text-xs text-slate-500 px-2 py-1 bg-slate-50 border-b border-slate-200">
                      Click anywhere on the map to pin the location
                    </p>
                    <div style={{ height: '200px' }}>
                      <MapContainer center={[editMapCenter.lat, editMapCenter.lng]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <MapPicker
                          onPick={(lat, lng) => { setEditLat(lat); setEditLng(lng); }}
                          initial={editLat && editLng ? { lat: editLat, lng: editLng } : null}
                        />
                      </MapContainer>
                    </div>
                  </div>
                )}

                {editLat && editLng && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {editLat.toFixed(4)}, {editLng.toFixed(4)}
                    <button type="button" onClick={() => { setEditLat(null); setEditLng(null); }}
                      className="ml-2 text-slate-400 hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </p>
                )}
              </div>

              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl text-sm disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div
          style={{ background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          className="fixed inset-0 z-50 p-4"
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Delete event?</h2>
            <p className="text-sm text-slate-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {deletingId === confirmDeleteId ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Events List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No events yet — create the first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800">{event.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    {event.location_name}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-slate-500 mt-0.5">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    {new Date(event.starts_at).toLocaleString()}
                  </div>
                  {event.lat && event.lng && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Pinned on map
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    event.status === 'planned' ? 'bg-blue-50 text-blue-600'
                    : event.status === 'active' ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-slate-100 text-slate-500'
                  }`}>
                    {event.status}
                  </span>
                  {event.creator_id === user?.id && (
                    <>
                      <button onClick={() => openEdit(event)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(event.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 