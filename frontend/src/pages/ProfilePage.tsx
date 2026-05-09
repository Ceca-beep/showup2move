import { useState, useEffect, FormEvent } from 'react';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Save, Loader2, Check, X } from 'lucide-react';

const SPORTS_LIST = [
  'Soccer', 'Basketball', 'Tennis', 'Running', 'Cycling',
  'Volleyball', 'Yoga', 'Swimming', 'Badminton', 'Cricket',
  'Baseball', 'Football', 'Hiking', 'Boxing', 'CrossFit',
  'Golf', 'Hockey', 'Martial Arts', 'Pilates', 'Rowing',
];

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [skillLevel, setSkillLevel] = useState(user?.skill_level || 'Beginner');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [availableSports, setAvailableSports] = useState<string[]>(SPORTS_LIST);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.photo_url || null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    client.get('/users/sports').then((res) => {
      const sports = Array.isArray(res.data) ? res.data.map((s: any) => s.name || s) : SPORTS_LIST;
      setAvailableSports(sports.length > 0 ? sports : SPORTS_LIST);
    }).catch(() => {
      setAvailableSports(SPORTS_LIST);
    });
  }, []);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setBio(user.bio || '');
      setSkillLevel(user.skill_level || 'Beginner');
      setPhotoPreview(user.photo_url || null);
    }
  }, [user]);

  const toggleSport = (sport: string) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await client.patch('/users/me', {
        display_name: displayName,
        bio,
        skill_level: skillLevel.toLowerCase(),
      });

      if (selectedSports.length > 0) {
        const sportsRes = await client.get('/users/sports');
        const allSports = sportsRes.data;

        const sportPayload = selectedSports
          .map((name) => {
            const found = allSports.find((s: any) => s.name.toLowerCase() === name.toLowerCase());
            return found ? { sport_id: found.id, skill_level: skillLevel.toLowerCase() } : null;
          })
          .filter(Boolean);

        if (sportPayload.length > 0) {
          await client.put('/users/me/sports', sportPayload);
        }
      }

      await refreshUser();
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Your Profile</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Photo */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Photo</h2>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden group">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-emerald-600">
                  {displayName?.[0]?.toUpperCase() || '?'}
                </span>
              )}
              <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-5 h-5 text-white" />
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
            <div className="text-sm text-slate-500">
              <p>Click to upload a photo</p>
              <p className="text-xs text-slate-400 mt-0.5">JPG, PNG up to 5MB</p>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Basic Info</h2>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell others about yourself..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Skill Level</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSkillLevel(level)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    skillLevel === level
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sports */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Your Sports</h2>
          <div className="flex flex-wrap gap-2">
            {availableSports.map((sport) => (
              <button
                key={sport}
                type="button"
                onClick={() => toggleSport(sport)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedSports.includes(sport)
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {selectedSports.includes(sport) && <Check className="w-3.5 h-3.5" />}
                {sport}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-red-50 text-red-600 border border-red-100'
            }`}
          >
            {message.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* Save */}
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Profile
        </button>
      </form>
    </div>
  );
}
