import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import prisma from "../../lib/prisma";

async function main() {
  try {
    // Check if required environment variables are set
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error("Supabase environment variables are not set");
      console.error("Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env");
      process.exit(1);
    }
    if (!process.env.LOCAL_USER_EMAIL || !process.env.LOCAL_USER_PASSWORD) {
      console.error(
        "Make sure LOCAL_USER_EMAIL and LOCAL_USER_PASSWORD is set in .env"
      );
      process.exit(1);
    }
    // 1. Create a role with name 'SUPERADMIN'
    const role = await prisma.role.upsert({
      where: { name: "SUPERADMIN" },
      update: {},
      create: {
        name: "SUPERADMIN",
        description: "Super administrator with full access",
      },
    });
    console.log("Role created successfully:", role.name);

    // 2. Create a user using Supabase admin API (bypassing hooks)
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // First, try to get the user by email
    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();

    let authUid;

    if (authError) {
      console.error("Error listing users:", authError);
      return;
    }

    // Find user with matching email
    const existingUser = authData?.users?.find(
      (user) => user.email === process.env.LOCAL_USER_EMAIL
    );

    if (existingUser) {
      console.log(
        "User already exists in auth, skipping creation for:",
        process.env.LOCAL_USER_EMAIL
      );
      authUid = existingUser.id;
    } else {
      // Create user with admin api
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: process.env.LOCAL_USER_EMAIL,
          password: process.env.LOCAL_USER_PASSWORD,
          email_confirm: true,
        });

      if (createError) {
        console.error("Error creating Supabase user:", createError);
        return;
      }

      console.log(
        "Creating new Supabase user with email:",
        process.env.LOCAL_USER_EMAIL
      );
      console.log("Supabase user created successfully:", newUser.user.email);
      authUid = newUser.user.id;
    }

    if (!authUid) {
      console.error("No auth user ID available");
      return;
    }

    // 3. Create a public.user with the specified properties
    const user = await prisma.user.upsert({
      where: { email: process.env.LOCAL_USER_EMAIL },
      update: {
        userId: authUid,
      },
      create: {
        userId: authUid,
        email: process.env.LOCAL_USER_EMAIL!,
        fullName: "Super Admin",
      },
    });
    console.log("User created successfully in the database:", user.email);

    // 4. Create a public.userRole with the specified properties
    // First, check if the user role already exists
    const existingUserRole = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        role: "SUPERADMIN",
      },
    });

    let userRole;
    if (existingUserRole) {
      // If it exists, no need to update
      userRole = existingUserRole;
      console.log("Existing UserRole found:", userRole.role);
    } else {
      // If it doesn't exist, create it
      userRole = await prisma.userRole.create({
        data: {
          userId: user.id,
          role: "SUPERADMIN",
        },
      });
      console.log("UserRole created successfully for user ID:", user.id);
    }

    console.log(
      "Seeding completed successfully. All operations were successful."
    );
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
