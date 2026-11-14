import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user";

export type Role = "player" | "leader" | "admin";

export function useRoles() {
  const { user, ready } = useUser();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!user) { setRoles([]); setLoaded(ready); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      setRoles((data ?? []).map((r) => r.role as Role));
      setLoaded(true);
    });
  }, [user, ready]);
  return { user, roles, loaded, is: (r: Role) => roles.includes(r) };
}
