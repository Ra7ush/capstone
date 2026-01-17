import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function migrate() {
  console.log("Starting legacy post migration...");

  // 1. Get a default creator for the General community
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id")
    .limit(1)
    .single();

  if (userError || !userData) {
    console.error("No users found to assign as creator of General community.");
    return;
  }

  const defaultCreatorId = userData.id;

  // 2. Find or create the General community
  let { data: generalCommunity, error: findError } = await supabase
    .from("communities")
    .select("id")
    .eq("name", "General")
    .single();

  if (findError || !generalCommunity) {
    console.log("Creating 'General' community...");
    const { data: newCommunity, error: createError } = await supabase
      .from("communities")
      .insert({
        name: "General",
        description: "A place for all general discussions and legacy posts.",
        category: "General",
        creator_id: defaultCreatorId,
        privacy: "public",
      })
      .select()
      .single();

    if (createError) {
      console.error("Failed to create General community:", createError.message);
      return;
    }
    generalCommunity = newCommunity;
  }

  console.log(`General community ID: ${generalCommunity.id}`);

  // 3. Update legacy posts
  const { count, error: updateError } = await supabase
    .from("posts")
    .update({ community_id: generalCommunity.id })
    .is("community_id", null);

  if (updateError) {
    console.error("Failed to update legacy posts:", updateError.message);
  } else {
    console.log(`Successfully migrated legacy posts. Count: ${count || 0}`);
  }
}

migrate();
