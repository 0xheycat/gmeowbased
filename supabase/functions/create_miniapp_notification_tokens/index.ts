/* Supabase Edge Function: create_miniapp_notification_tokens */

// @ts-ignore - allow ts extension import for Deno Edge runtime
import { handleMiniappNotificationRequest } from "../_shared/miniapp_notification_dispatcher.ts"

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}

Deno.serve(handleMiniappNotificationRequest)
