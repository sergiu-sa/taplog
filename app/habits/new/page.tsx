import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { osloDay } from "@/lib/habits";
import { loginPath } from "@/lib/login";
import { freeColor } from "@/lib/palette";
import { createClient } from "@/lib/supabase/server";
import { saveHabit } from "../../actions";
import { HabitEditor } from "../../habit-editor";

export const metadata: Metadata = { title: "New habit" };

export default async function NewHabit() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) redirect(loginPath("/habits/new"));

  const { data: habits } = await supabase.from("habits").select("color").throwOnError();
  // Server Components render once per request, so this is just the request time.
  // eslint-disable-next-line react-hooks/purity
  const today = osloDay(Date.now());

  return <HabitEditor habit={null} today={today} color={freeColor(habits)} backHref="/" save={saveHabit.bind(null, null)} />;
}

