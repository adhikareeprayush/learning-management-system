import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export const auth = betterAuth({
    database: prismaAdapter(prisma, 
        {
            provider: "postgresql",
        }
    ),
    emailAndPassword: {
        enabled: true,
    }, 
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "STUDENT",
                input: false, // don't let signup body set role
              },
            bio: {
                type: "string",
                required: false, 
                input: true,
            }
        }
    },
    plugins: [
        nextCookies(),
    ]
})

export async function getServerSession() {
    const session = await auth.api.getSession({
        headers: await headers(), // get the headers (cookies go here) from the request
    })
    return session;
}