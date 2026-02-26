import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug, password } = await req.json();

    if (!slug || !password || typeof slug !== "string" || typeof password !== "string") {
      return new Response(
        JSON.stringify({ error: "Slug and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS and access password field
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: operator, error } = await supabase
      .from("operators")
      .select("id, name, slug, password, whatsapp")
      .eq("slug", slug)
      .single();

    if (error || !operator) {
      return new Response(
        JSON.stringify({ error: "Operator not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password !== operator.password) {
      return new Response(
        JSON.stringify({ error: "Invalid password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new session token
    const sessionToken = crypto.randomUUID();
    await supabase
      .from("operators")
      .update({ session_token: sessionToken })
      .eq("id", operator.id);

    return new Response(
      JSON.stringify({
        success: true,
        operator: {
          id: operator.id,
          name: operator.name,
          slug: operator.slug,
          whatsapp: operator.whatsapp,
        },
        sessionToken,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Operator login error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
