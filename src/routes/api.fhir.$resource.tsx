import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  mapPatientToFhir,
  mapVitalSignsToFhirObservations,
  mapAssessmentToFhirCondition,
  mapAssessmentToFhirClinicalImpression,
} from "@/lib/fhir";
import { dbRowToAssessment, dbRowToPatient, operationOutcome, searchBundle } from "./-fhir-helpers";

export const Route = createFileRoute("/api/fhir/$resource")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { resource } = params;
        const url = new URL(request.url);
        const patientFilter = url.searchParams.get("patient");

        switch (resource) {
          case "Patient": {
            let query = supabaseAdmin.from("patients").select("*");
            if (patientFilter) query = query.eq("id", patientFilter);
            const { data, error } = await query;
            if (error) return operationOutcome("error", "exception", error.message, 500);

            const patients = (data ?? []).map(
              (r) => dbRowToPatient(r as unknown as Record<string, unknown>),
            );
            const entries = patients.map((p) => ({
              fullUrl: `urn:uuid:${p.id}`,
              resource: mapPatientToFhir(p),
            }));
            return new Response(searchBundle(entries), {
              headers: { "Content-Type": "application/fhir+json" },
            });
          }

          case "Observation": {
            let query = supabaseAdmin.from("assessments").select("*");
            if (patientFilter) query = query.eq("patient_id", patientFilter);
            const { data, error } = await query;
            if (error) return operationOutcome("error", "exception", error.message, 500);

            const entries: { fullUrl: string; resource: unknown }[] = [];
            for (const row of data ?? []) {
              const a = dbRowToAssessment(row as unknown as Record<string, unknown>);
              if (!a.vitalSigns) continue;
              const fhirObs = mapVitalSignsToFhirObservations(a.vitalSigns, a.patientId, a.id);
              for (const obs of fhirObs) {
                entries.push({
                  fullUrl: `urn:uuid:${a.id}-${obs.code.coding[0].code}`,
                  resource: obs,
                });
              }
            }
            return new Response(searchBundle(entries), {
              headers: { "Content-Type": "application/fhir+json" },
            });
          }

          case "Condition": {
            let query = supabaseAdmin.from("assessments").select("*");
            if (patientFilter) query = query.eq("patient_id", patientFilter);
            const { data, error } = await query;
            if (error) return operationOutcome("error", "exception", error.message, 500);

            const entries: { fullUrl: string; resource: unknown }[] = [];
            for (const row of data ?? []) {
              const a = dbRowToAssessment(row as unknown as Record<string, unknown>);
              const condition = mapAssessmentToFhirCondition(a, a.patientId);
              if (condition) {
                entries.push({ fullUrl: `urn:uuid:${condition.id}`, resource: condition });
              }
            }
            return new Response(searchBundle(entries), {
              headers: { "Content-Type": "application/fhir+json" },
            });
          }

          case "ClinicalImpression": {
            let query = supabaseAdmin.from("assessments").select("*");
            if (patientFilter) query = query.eq("patient_id", patientFilter);
            const { data, error } = await query;
            if (error) return operationOutcome("error", "exception", error.message, 500);

            const entries: { fullUrl: string; resource: unknown }[] = [];
            for (const row of data ?? []) {
              const a = dbRowToAssessment(row as unknown as Record<string, unknown>);
              const impression = mapAssessmentToFhirClinicalImpression(a, a.patientId);
              if (impression) {
                entries.push({ fullUrl: `urn:uuid:${impression.id}`, resource: impression });
              }
            }
            return new Response(searchBundle(entries), {
              headers: { "Content-Type": "application/fhir+json" },
            });
          }

          default:
            return operationOutcome(
              "error",
              "not-found",
              `Unknown FHIR resource type: ${resource}`,
              404,
            );
        }
      },
    },
  },
});
