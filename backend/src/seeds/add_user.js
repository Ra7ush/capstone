import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from backend root (two levels up from seeds folder)
dotenv.config({ path: path.join(__dirname, "../../.env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addUser() {
  const userId = "7a8b9c0d-1e2f-4a5b-b6c7-d8e9f0a1b2c3"; // Generated UUID
  const email = "johndoe@example.com";
  const username = "JohnDoe";

  console.log(`Adding user: ${username} (${email})...`);

  // 1. Insert into auth.users (This requires admin privileges and usually happens via auth.signUp,
  // but for seeding we often just insert into the public 'users' table if it's mirroring auth,
  // or we use the admin auth API to create a real auth user.)

  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: "Password123!",
      email_confirm: true,
      user_metadata: { username },
    });

  let finalUserId;

  if (authError) {
    console.error("Auth status:", authError.message);
    if (
      authError.message.includes("already registered") ||
      authError.code === "email_exists"
    ) {
      console.log("User already exists in Auth. Fetching ID...");
      const { data: listData, error: listError } =
        await supabase.auth.admin.listUsers();
      if (listError) throw listError;
      const existingUser = listData.users.find((u) => u.email === email);
      if (existingUser) {
        finalUserId = existingUser.id;
      }
    } else {
      return;
    }
  } else {
    finalUserId = authUser?.user?.id;
  }

  if (!finalUserId) {
    console.error("Could not determine User ID");
    return;
  }

  // 2. Ensure user is in 'users' table (assuming there's a trigger, but we'll upsert to be safe)
  const { error: userError } = await supabase.from("users").upsert({
    id: finalUserId,
    email,
    password_hash: "hashed_password_123",
    username,
    role: "creator",
    status: "active",
  });

  if (userError) {
    console.error("Error upserting user:", userError);
    return;
  }

  // 3. Ensure creator record exists
  const { error: creatorError } = await supabase.from("creators").upsert({
    user_id: finalUserId,
    verification_status: "verified",
    total_earnings: 1250.0,
  });

  if (creatorError) {
    console.error("Error upserting creator:", creatorError);
    return;
  }

  console.log("User 'JohnDoe' added successfully as a Creator.");
}

addUser();
