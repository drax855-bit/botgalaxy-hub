import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, ImagePlus, Loader2, LockKeyhole, Save, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/useSession";
import { OfficialOwnerBadge } from "@/components/OfficialOwnerBadge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — BotGalaxy" },
      { name: "description", content: "Manage your BotGalaxy profile." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const fileInput = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [officialOwner, setOfficialOwner] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      void navigate({ to: "/auth", replace: true });
      return;
    }

    let active = true;

    (async () => {
      setLoading(true);
      const { data, error: loadError } = await (supabase as any)
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (!active) return;

      if (loadError) {
        setError(loadError.message);
      } else {
        const row = data as ProfileRow;
        setProfile(row);
        setDisplayName(row.display_name || row.username || "");
      }

      setLoading(false);
    })();

    void (async () => {
      const { count } = await (supabase as any)
        .from("bots")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("status", "approved");

      if (active) setOfficialOwner((count ?? 0) > 0);
    })();

    return () => {
      active = false;
    };
  }, [user, sessionLoading, navigate]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function selectImage(selected: File | null) {
    setError("");
    setSuccess("");

    if (!selected) return;

    if (!ALLOWED_TYPES.has(selected.type)) {
      setError("Use JPG, PNG or WebP.");
      return;
    }

    if (selected.size > MAX_SIZE) {
      setError("Image must be 5 MB or smaller.");
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !profile) return;

    const name = displayName.trim();

    if (name.length < 2 || name.length > 40) {
      setError("Display name must be 2 to 40 characters.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let avatarUrl = profile.avatar_url;

      if (file) {
        const extension =
          file.type === "image/png" ? "png" :
          file.type === "image/webp" ? "webp" : "jpg";

        const path = `${user.id}/avatar.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, file, {
            upsert: true,
            cacheControl: "3600",
            contentType: file.type,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
      }

      const { error: updateError } = await (supabase as any)
        .from("profiles")
        .update({
          display_name: name,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          display_name: name,
          avatar_url: avatarUrl,
        },
      });

      if (authError) throw authError;

      setProfile({ ...profile, display_name: name, avatar_url: avatarUrl });
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview("");
      setSuccess("Profile saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Profile unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const avatar = preview || profile.avatar_url || "";
  const initials = (profile.display_name || profile.username || "BG").slice(0, 2).toUpperCase();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2 text-primary">
        <UserRound className="h-5 w-5" />
        <span className="text-sm font-medium">Your account</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-3xl font-bold">Profile settings</h1>
        {officialOwner && <OfficialOwnerBadge />}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Change your public display name and profile picture.
      </p>

      <form onSubmit={save} className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Profile picture</h2>

        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="group relative h-28 w-28 overflow-hidden rounded-full border border-border bg-secondary"
          >
            {avatar ? (
              <img src={avatar} alt="Profile preview" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-bold">
                {initials}
              </span>
            )}

            <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </span>
          </button>

          <div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => selectImage(event.target.files?.[0] ?? null)}
            />

            <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>
              <ImagePlus className="h-4 w-4" />
              Choose image
            </Button>

            <p className="mt-2 text-xs text-muted-foreground">
              JPG, PNG or WebP. Maximum 5 MB.
            </p>
          </div>
        </div>

        <div className="my-7 border-t border-border" />

        <label htmlFor="display-name" className="text-sm font-medium">
          Display name
        </label>
        <Input
          id="display-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="mt-2"
          minLength={2}
          maxLength={40}
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Free to change. This is the name people see.
        </p>

        <label htmlFor="username" className="mt-5 block text-sm font-medium">
          Username
        </label>
        <div className="relative mt-2">
          <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="username" value={profile.username} className="pl-10" disabled />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Paid username changes will be added later.
        </p>

        <label htmlFor="email" className="mt-5 block text-sm font-medium">
          Email
        </label>
        <Input id="email" value={user?.email ?? ""} className="mt-2" disabled />
        <p className="mt-1 text-xs text-muted-foreground">Your email is private.</p>

        {error && (
          <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
            {success}
          </div>
        )}

        <Button type="submit" className="mt-6" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save profile
        </Button>
      </form>
    </main>
  );
}

