import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loginPath } from "@/lib/login";
import { freeColor } from "@/lib/palette";
import { createClient } from "@/lib/supabase/server";
import { readTheme } from "@/lib/theme";
import { saveHabit, signOut, signOutEverywhere } from "../../actions";
import { HabitEditor } from "../../habit-editor";

export const metadata: Metadata = { title: "New habit" };

export default async function NewHabit() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) redirect(loginPath("/habits/new"));

  const { data: habits } = await supabase.from("habits").select("color").throwOnError();

  return (
    <HabitEditor
      habit={null}
      color={freeColor(habits)}
      backHref="/"
      save={saveHabit.bind(null, null)}
      frame={{ theme: await readTheme(), signOut, signOutEverywhere }}
    />
  );
}

