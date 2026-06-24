import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  mapPatientToFhir,
  mapVitalSignsToFhirObservations,
  mapAssessmentToFhirCondition,
  mapAssessmentToFhirClinicalImpression,
} from "@/lib/fhir";
import { dbRowToAssessment, dbRowToPatient, operationOutcome } from "./-fhir-helpers";

export const Route = createFileRoute("/api/fhir/$resource/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { resource, id } = params;

        switch (resource) {
          case "Patient": {
            const { data, error } = await supabaseAdmin
              .from("patients")
              .select("*")
              .eq("id", id)
              .maybeSingle();
            if (error) return operationOutcome("error", "exception", error.message, 500);
            if (!data)
              return operationOutcome("error", "not-found", `Patient ${id} not found`, 404);
            const patient = dbRowToPatient(data as unknown as Record<string, unknown>);
            return new Response(JSON.stringify(mapPatientToFhir(patient)), {
              headers: { "Content-Type": "application/fhir+json" },
            });
          }

          case "Observation": {
            const { data, error } = await supabaseAdmin
              .from("assessments")
              .select("*")
              .eq("id", id)
              .maybeSingle();
            if (error) return operationOutcome("error", "exception", error.message, 500);
            if (!data)
              return operationOutcome("error", "not-found", `Assessment ${id} not found`, 404);
            const a = dbRowToAssessment(data as unknown as Record<string, unknown>);
            if (!a.vitalSigns)
              return operationOutcome(
                "error",
                "not-found",
                `No vital signs for assessment ${id}`,
                404,
              );
            const observations = mapVitalSignsToFhirObservations(a.vitalSigns, a.patientId, a.id);
            return new Response(
              JSON.stringify({
                resourceType: "Bundle",
                type: "collection",
                total: observations.length,
                entry: observations.map((obs) => ({
                  fullUrl: `urn:uuid:${a.id}-${obs.code.coding[0].code}`,
                  resource: obs,
                })),
              }),
              { headers: { "Content-Type": "application/fhir+json" } },
            );
          }

          case "Condition": {
            const { data, error } = await supabaseAdmin
              .from("assessments")
              .select("*")
              .eq("id", id)
              .maybeSingle();
            if (error) return operationOutcome("error", "exception", error.message, 500);
            if (!data)
              return operationOutcome("error", "not-found", `Assessment ${id} not found`, 404);
            const a = dbRowToAssessment(data as unknown as Record<string, unknown>);
            const condition = mapAssessmentToFhirCondition(a, a.patientId);
            if (!condition)
              return operationOutcome(
                "error",
                "not-found",
                `No condition data for assessment ${id}`,
                404,
              );
            return new Response(JSON.stringify(condition), {
              headers: { "Content-Type": "application/fhir+json" },
            });
          }

          case "ClinicalImpression": {
            const assessmentId = id.endsWith("-impression") ? id.slice(0, -11) : id;
            const { data, error } = await supabaseAdmin
              .from("assessments")
              .select("*")
              .eq("id", assessmentId)
              .maybeSingle();
            if (error) return operationOutcome("error", "exception", error.message, 500);
            if (!data)
              return operationOutcome(
                "error",
                "not-found",
                `Assessment ${assessmentId} not found`,
                404,
              );
            const a = dbRowToAssessment(data as unknown as Record<string, unknown>);
            const conditionId = a.condition ? a.id : undefined;
            const impression = mapAssessmentToFhirClinicalImpression(a, a.patientId, conditionId);
            return new Response(JSON.stringify(impression), {
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
