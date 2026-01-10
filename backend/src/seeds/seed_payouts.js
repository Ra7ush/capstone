import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedPayouts() {
  const users = [
    { id: "14d08d35-0ea6-4690-af7e-09a19fdbb80e", username: "MikeUser99" },
    { id: "b5a20ce3-3784-4fa4-adf2-9e00b920a32b", username: "SarahConnor" },
    { id: "5ffeabc4-a024-4f58-a604-237667517d0a", username: "SarahDesigns" },
  ];

  console.log("Ensuring creators exist...");
  for (const user of users) {
    const { error } = await supabase
      .from("creators")
      .upsert(
        { user_id: user.id, verification_status: "verified" },
        { onConflict: "user_id" }
      );
    if (error) console.error(`Error ensuring creator ${user.username}:`, error);
  }

  console.log("Seeding payout records...");

  // Always create new payouts with unique transaction references (timestamp ensures uniqueness)
  const statusCycle = ["paid", "pending", "failed"];
  const payouts = users.map((user, index) => ({
    creator_id: user.id,
    amount: (index + 1) * 250.5,
    currency: "USD",
    status: statusCycle[index % 3],
    method: "bank_transfer",
    transaction_reference: `PROTOCOL-TX-${Date.now()}-${index}`,
    created_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("payouts")
    .insert(payouts)
    .select();

  if (error) {
    console.error("Error seeding payouts:", error);
  } else {
    console.log(
      "Successfully seeded protocol records:",
      JSON.stringify(data, null, 2)
    );
  }
}

seedPayouts();
