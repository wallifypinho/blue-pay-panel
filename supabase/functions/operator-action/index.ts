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
    const { action, sessionToken, operatorId, data } = await req.json();

    if (!sessionToken || !operatorId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate session token
    const { data: operator, error: opError } = await supabase
      .from("operators")
      .select("id, name, slug, whatsapp, session_token")
      .eq("id", operatorId)
      .single();

    if (opError || !operator || operator.session_token !== sessionToken) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "create-payment": {
        const { client_name, cpf, destination, destination_emoji, destination_description, value, pix_code, order_number } = data;
        if (!client_name || !cpf || !destination || !value || !pix_code || !order_number) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const numValue = Number(value);
        if (isNaN(numValue) || numValue <= 0 || numValue > 100000) {
          return new Response(
            JSON.stringify({ error: "Invalid value" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: inserted, error } = await supabase
          .from("payments")
          .insert({
            client_name: String(client_name).substring(0, 100),
            cpf: String(cpf).substring(0, 20),
            destination: String(destination).substring(0, 100),
            destination_emoji: String(destination_emoji || "✈️").substring(0, 10),
            destination_description: String(destination_description || "").substring(0, 200),
            value: numValue,
            pix_code: String(pix_code).substring(0, 500),
            order_number: String(order_number).substring(0, 10),
            operator_id: operatorId,
            whatsapp: operator.whatsapp || "",
          })
          .select("*")
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, payment: inserted }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete-payment": {
        const { id } = data;
        // Only delete own payments
        const { error } = await supabase
          .from("payments")
          .delete()
          .eq("id", id)
          .eq("operator_id", operatorId);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list-payments": {
        const { data: pays, error } = await supabase
          .from("payments")
          .select("*")
          .eq("operator_id", operatorId)
          .order("created_at", { ascending: false });

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ payments: pays }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update-whatsapp": {
        const { whatsapp } = data;
        const { error } = await supabase
          .from("operators")
          .update({ whatsapp: String(whatsapp || "").substring(0, 20) })
          .eq("id", operatorId);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    console.error("Operator action error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
