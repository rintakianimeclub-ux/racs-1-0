import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, Button, Input, Textarea, Avatar, Sticker } from "@/components/ui-brutal";
import { PencilSimple, SignOut, Trophy, Medal } from "@phosphor-icons/react";

export default function Profile() {
  const { user, refresh, logout } = useAuth();
  const { userId } = useParams();
  const isOwn = !userId || userId === user.user_id;
  const [profile, setProfile] = useState(isOwn ? user : null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: user.name, bio: user.bio || "", picture: user.picture || "" });

  useEffect(() => {
    if (!isOwn && userId) {
      api.get(`/users/${userId}`).then(({ data }) => setProfile(data));
    } else {
      setProfile(user);
      setForm({ name: user.name, bio: user.bio || "", picture: user.picture || "" });
    }
  }, [userId, user, isOwn]);

  const save = async (e) => {
    e.preventDefault();
    await api.patch("/profile", form);
    await refresh();
    setEdit(false);
  };

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="relative">
        <div className="h-40 md:h-52 rounded-2xl border-2 border-black overflow-hidden shadow-[6px_6px_0_#111] relative">
          <img src="https://images.unsplash.com/photo-1748740345094-7b8d8128e147?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwyfHxqYXBhbmVzZSUyMHBvcCUyMGN1bHR1cmV8ZW58MHx8fHwxNzc2ODA2MjI4fDA&ixlib=rb-4.1.0&q=85" className="w-full h-full object-cover" alt="" />
        </div>
        <div className="absolute -bottom-8 left-6">
          <div className="w-20 h-20 rounded-full border-2 border-black bg-white overflow-hidden shadow-[4px_4px_0_#111]">
            {profile.picture ? <img src={profile.picture} className="w-full h-full object-cover" alt="" /> : (
              <div className="w-full h-full flex items-center justify-center font-black text-3xl bg-[var(--accent)]">{profile.name?.[0]?.toUpperCase()}</div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-10 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-black text-3xl">{profile.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Sticker color="primary">{profile.role}</Sticker>
            <Sticker color="secondary" data-testid="points-sticker"><Trophy size={12} weight="fill" /> {profile.points ?? 0} pts</Sticker>
          </div>
        </div>
        {isOwn && (
          <div className="flex gap-2">
            <Button onClick={() => setEdit(true)} variant="ghost" data-testid="edit-profile-btn"><PencilSimple size={14} weight="bold" /> Edit</Button>
            <Button onClick={logout} variant="dark" data-testid="logout-action"><SignOut size={14} weight="bold" /> Logout</Button>
          </div>
        )}
      </div>

      <Card>
        <h3 className="font-black text-lg mb-1">About</h3>
        <p className="text-[var(--muted-fg)] whitespace-pre-wrap">{profile.bio || "No bio yet."}</p>
      </Card>

      {profile.badges?.length > 0 && (
        <Card>
          <h3 className="font-black text-lg mb-3 flex items-center gap-2"><Medal size={18} weight="fill" /> Badges</h3>
          <div className="flex gap-2 flex-wrap">
            {profile.badges.map((b) => (
              <Sticker key={b} color="accent" className="tilt-1">🏅 {b}</Sticker>
            ))}
          </div>
        </Card>
      )}

      {edit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEdit(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save}
                className="bg-white border-2 border-black rounded-2xl w-full max-w-lg p-6 shadow-[8px_8px_0_#111]" data-testid="edit-profile-form">
            <h2 className="font-black text-2xl mb-4">Edit profile</h2>
            <div className="space-y-3">
              <Input placeholder="Display name" value={form.name} data-testid="edit-name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Avatar image URL" value={form.picture} data-testid="edit-picture" onChange={(e) => setForm({ ...form, picture: e.target.value })} />
              <Textarea rows={4} placeholder="Bio" value={form.bio} data-testid="edit-bio" onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setEdit(false)}>Cancel</Button>
              <Button type="submit" data-testid="save-profile">Save</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
