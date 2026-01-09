import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addPendingPayout() {
  const creatorId = "5ffeabc4-a024-4f58-a604-237667517d0a"; // SarahDesigns
  const amount = 1337.0;

  console.log(`Adding pending payout of $${amount} for SarahDesigns...`);

  const { data, error } = await supabase
    .from("payouts")
    .insert([
      {
        creator_id: creatorId,
        amount: amount,
        currency: "USD",
        status: "pending",
        method: "bank_transfer",
        transaction_reference: `PENDING-TEST-${Date.now()}`,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  if (error) {
    console.error("Error adding pending payout:", error);
  } else {
    console.log(
      "Successfully added pending payout:",
      JSON.stringify(data, null, 2)
    );
  }
}

addPendingPayout();
