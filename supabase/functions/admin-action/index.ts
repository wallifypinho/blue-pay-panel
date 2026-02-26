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
    const { action, sessionToken, data } = await req.json();

    const adminPassword = Deno.env.get("ADMIN_PASSWORD");
    if (!adminPassword || !sessionToken) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (action) {
      case "create-operator": {
        const { name, slug, password, whatsapp } = data;
        if (!name || !slug || !password) {
          return new Response(
            JSON.stringify({ error: "Name, slug, and password are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { count } = await supabase.from("operators").select("*", { count: "exact", head: true });
        if (count && count >= 5) {
          return new Response(
            JSON.stringify({ error: "Operator limit reached (5)" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: inserted, error } = await supabase
          .from("operators")
          .insert({ name, slug, password, whatsapp: whatsapp || "" })
          .select("id, name, slug, whatsapp, created_at")
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, operator: inserted }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete-operator": {
        const { id } = data;
        const { error } = await supabase.from("operators").delete().eq("id", id);
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

      case "create-payment": {
        const { client_name, cpf, destination, destination_emoji, destination_description, value, pix_code, order_number, operator_id, payment_method, gateway_id } = data;
        
        if (!client_name || !cpf || !destination || !value || !order_number) {
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

        const method = payment_method || "manual";
        let finalPixCode = pix_code || "";
        let gatewayPixCode = null;
        let gatewayQrCodeUrl = null;

        // If gateway method, call external API
        if (method === "gateway" && gateway_id) {
          const { data: gwConfig, error: gwError } = await supabase
            .from("gateway_configs")
            .select("*")
            .eq("id", gateway_id)
            .eq("is_active", true)
            .single();

          if (gwError || !gwConfig) {
            return new Response(
              JSON.stringify({ error: "Gateway não encontrado ou inativo" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          try {
            const gwResponse = await fetch(gwConfig.api_url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${gwConfig.secret_key}`,
                "X-Public-Key": gwConfig.public_key,
              },
              body: JSON.stringify({
                amount: numValue,
                currency: "BRL",
                payment_method: "pix",
                description: `Pagamento - ${client_name} - ${destination}`,
              }),
            });

            const gwResult = await gwResponse.json();

            if (!gwResponse.ok) {
              return new Response(
                JSON.stringify({ error: `Erro no gateway: ${gwResult.message || gwResult.error || "Falha na requisição"}` }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            // Try to extract PIX code and QR code URL from common response formats
            gatewayPixCode = gwResult.pix_code || gwResult.pix?.code || gwResult.qr_code || gwResult.brcode || gwResult.payload || "";
            gatewayQrCodeUrl = gwResult.qr_code_url || gwResult.pix?.qr_code_url || gwResult.qr_code_image || "";
            finalPixCode = gatewayPixCode || finalPixCode;
          } catch (fetchErr) {
            return new Response(
              JSON.stringify({ error: "Erro ao conectar com o gateway de pagamento" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else if (method === "manual" && !pix_code) {
          return new Response(
            JSON.stringify({ error: "Código PIX é obrigatório para pagamento manual" }),
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
            pix_code: String(finalPixCode).substring(0, 500),
            order_number: String(order_number).substring(0, 10),
            operator_id: operator_id || null,
            payment_method: method,
            gateway_id: method === "gateway" ? gateway_id : null,
            gateway_pix_code: gatewayPixCode,
            gateway_qr_code_url: gatewayQrCodeUrl,
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
        const { error } = await supabase.from("payments").delete().eq("id", id);
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

      case "list-operators": {
        const { data: ops, error } = await supabase
          .from("operators")
          .select("id, name, slug, whatsapp, created_at")
          .order("created_at", { ascending: true });

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ operators: ops }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list-payments": {
        const { data: pays, error } = await supabase
          .from("payments")
          .select("*")
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

      case "create-gateway": {
        const { name, api_url, secret_key, public_key } = data;
        if (!name || !api_url || !secret_key) {
          return new Response(
            JSON.stringify({ error: "Nome, URL da API e Secret Key são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: inserted, error } = await supabase
          .from("gateway_configs")
          .insert({
            name: String(name).substring(0, 100),
            api_url: String(api_url).substring(0, 500),
            secret_key: String(secret_key).substring(0, 500),
            public_key: String(public_key || "").substring(0, 500),
          })
          .select("id, name, api_url, is_active, created_at")
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, gateway: inserted }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete-gateway": {
        const { id } = data;
        const { error } = await supabase.from("gateway_configs").delete().eq("id", id);
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

      case "toggle-gateway": {
        const { id, is_active } = data;
        const { error } = await supabase
          .from("gateway_configs")
          .update({ is_active: !!is_active })
          .eq("id", id);

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

      case "list-gateways": {
        const { data: gws, error } = await supabase
          .from("gateway_configs")
          .select("id, name, api_url, is_active, created_at")
          .order("created_at", { ascending: true });

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ gateways: gws }),
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
    console.error("Admin action error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
