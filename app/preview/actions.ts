"use server";

// The preview's +1 saves nothing. The pause stands in for the round trip to the database,
// so the pending lock can be exercised, and the log line counts how often it ran.
export async function previewAdd(slug: string) {
  if (process.env.DESIGN_PREVIEW !== "1") return;
  await new Promise((resolve) => setTimeout(resolve, 600));
  console.log(`preview +1 ${slug}`);
}
