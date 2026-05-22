import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";

import { applicationStatuses } from "@/lib/status";
import { demoDocuments } from "@/lib/demo-data";
import { listDocuments, updateDocumentAdmin } from "./documents";

export async function createContext(request: Request) {
  return {
    adminToken:
      request.headers.get("x-admin-token") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""),
  };
}

const t = initTRPC.context<typeof createContext>().create({
  transformer: superjson,
});

const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!process.env.ADMIN_TOKEN) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "ADMIN_TOKEN is not configured.",
    });
  }

  if (ctx.adminToken !== process.env.ADMIN_TOKEN) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next();
});

export const appRouter = t.router({
  documents: t.router({
    list: t.procedure.query(async () => {
      const documents = await listDocuments();
      return documents.length ? documents : demoDocuments;
    }),
    updateAdmin: adminProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          applicationStatus: z.enum(applicationStatuses),
          adminNotes: z.string().max(2000),
        }),
      )
      .mutation(({ input }) => updateDocumentAdmin(input)),
  }),
});

export type AppRouter = typeof appRouter;
