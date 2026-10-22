import { listAudienceOptions, resolveAudiencePick, type AudiencePick } from "../../lib/audienceOptions.js";

export type { AudiencePick };

export async function listMessageAudienceOptions(tenantId: number) {
  return listAudienceOptions(tenantId);
}

export async function resolveMessageAudience(tenantId: number, input: AudiencePick): Promise<string> {
  const resolved = await resolveAudiencePick(tenantId, input);
  return resolved.audienceLabel;
}
