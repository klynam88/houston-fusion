export const runtime = "nodejs";

export async function GET(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return new Response("Google Places is not configured", { status: 404 });

  const name = new URL(request.url).searchParams.get("name") ?? "";
  if (!/^places\/[^/]+\/photos\/[^/]+$/.test(name)) {
    return new Response("Bad photo", { status: 400 });
  }

  const meta = await fetch(
    `https://places.googleapis.com/v1/${name}/media?maxHeightPx=900&skipHttpRedirect=true`,
    { headers: { "X-Goog-Api-Key": key } },
  );
  if (!meta.ok) return new Response("Photo unavailable", { status: 502 });
  const body = (await meta.json()) as { photoUri?: string };
  if (!body.photoUri) return new Response("Photo unavailable", { status: 502 });

  let host = "";
  try {
    host = new URL(body.photoUri).host;
  } catch {
    return new Response("Photo unavailable", { status: 502 });
  }
  if (!/(^|\.)googleusercontent\.com$|(^|\.)googleapis\.com$/.test(host)) {
    return new Response("Unexpected photo host", { status: 502 });
  }

  const image = await fetch(body.photoUri);
  if (!image.ok || !image.body) return new Response("Photo unavailable", { status: 502 });
  return new Response(image.body, {
    headers: {
      "Content-Type": image.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
