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
        const { client_name, cpf, destination, destination_emoji, destination_description, value, pix_code, order_number, payment_method, gateway_id } = data;
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
            console.log("Gateway request to:", gwConfig.api_url);
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

            const responseText = await gwResponse.text();
            console.log("Gateway response status:", gwResponse.status);
            console.log("Gateway response body:", responseText.substring(0, 500));

            let gwResult: any;
            try {
              gwResult = JSON.parse(responseText);
            } catch {
              return new Response(
                JSON.stringify({ error: `Gateway retornou resposta inválida (não é JSON). Verifique se a URL da API está correta. Status: ${gwResponse.status}` }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            if (!gwResponse.ok) {
              return new Response(
                JSON.stringify({ error: `Erro no gateway (${gwResponse.status}): ${gwResult.message || gwResult.error || JSON.stringify(gwResult).substring(0, 200)}` }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            gatewayPixCode = gwResult.pix_code || gwResult.pix?.code || gwResult.qr_code || gwResult.brcode || gwResult.payload || "";
            gatewayQrCodeUrl = gwResult.qr_code_url || gwResult.pix?.qr_code_url || gwResult.qr_code_image || "";
            finalPixCode = gatewayPixCode || finalPixCode;

            console.log("Gateway PIX code extracted:", !!gatewayPixCode);
          } catch (fetchErr) {
            console.error("Gateway fetch error:", fetchErr);
            return new Response(
              JSON.stringify({ error: `Erro ao conectar com o gateway: ${fetchErr.message || "Verifique se a URL da API está correta"}` }),
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
            operator_id: operatorId,
            whatsapp: operator.whatsapp || "",
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

      case "list-gateways": {
        // Operators can list active gateways (without keys)
        const { data: gws, error } = await supabase
          .from("gateway_configs")
          .select("id, name, is_active")
          .eq("is_active", true)
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
    console.error("Operator action error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
