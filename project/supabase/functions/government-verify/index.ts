import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyRequest {
  document_type: string;
  extracted_name: string | null;
  extracted_document_number: string | null;
  extracted_dob: string | null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as VerifyRequest;

    const baseUrl = Deno.env.get("GOVERNMENT_API_BASE_URL");
    const apiKey = Deno.env.get("GOVERNMENT_API_KEY");
    const clientId = Deno.env.get("GOVERNMENT_CLIENT_ID");
    const clientSecret = Deno.env.get("GOVERNMENT_CLIENT_SECRET");

    if (!baseUrl || !apiKey || !clientId || !clientSecret) {
      let method = "N/A";
      let detailsMessage = "";

      switch (body.document_type) {
        case "Aadhaar":
          method = "OTP / Demographic / Biometric / e-KYC";
          detailsMessage =
            "UIDAI verification unavailable — authorized integration required. Configure GOVERNMENT_API_BASE_URL, GOVERNMENT_API_KEY, GOVERNMENT_CLIENT_ID, GOVERNMENT_CLIENT_SECRET on the backend.";
          break;
        case "PAN":
          method = "Name + DOB + PAN verification";
          detailsMessage =
            "PAN Government Verification: NOT CONNECTED. Income Tax Department PAN Verification Webservice requires authorized API credentials on the backend.";
          break;
        default:
          method = "Document verification";
          detailsMessage =
            "Government verification adapter not configured. Authorized API credentials required on the backend.";
          break;
      }

      return new Response(
        JSON.stringify({
          document_type: body.document_type,
          verification_method: method,
          status: "NOT_CONFIGURED",
          verified_name: null,
          verified_document_number: null,
          verified_dob: null,
          details: {
            configured: false,
            message: detailsMessage,
            adapter: `${body.document_type}VerificationAdapter`,
            required_backend_env_vars: [
              "GOVERNMENT_API_BASE_URL",
              "GOVERNMENT_API_KEY",
              "GOVERNMENT_CLIENT_ID",
              "GOVERNMENT_CLIENT_SECRET",
            ],
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Credentials are configured — attempt real verification via authorized provider
    // This is where the actual adapter call would go (AadhaarVerificationAdapter / PANVerificationAdapter)
    // For now, return UNAVAILABLE since no real provider endpoint is connected
    return new Response(
      JSON.stringify({
        document_type: body.document_type,
        verification_method: "API",
        status: "UNAVAILABLE",
        verified_name: null,
        verified_document_number: null,
        verified_dob: null,
        details: {
          configured: true,
          message: "Government API credentials detected but no provider adapter is connected.",
          endpoint: baseUrl,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: "UNAVAILABLE",
        details: { message: "Government verification service error.", error: String(err) },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
