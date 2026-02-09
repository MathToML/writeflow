import { VertexAI } from "@google-cloud/vertexai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = "gemini-2.0-flash";

type ModelWrapper = {
  type: "vertex" | "genai";
  model: ReturnType<VertexAI["getGenerativeModel"]> | ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;
};

let cached: ModelWrapper | null = null;

export function getModel(): ModelWrapper {
  if (cached) return cached;

  const gcpProject = process.env.GCP_PROJECT_ID;
  const gcpLocation = process.env.GCP_LOCATION || "us-central1";
  const apiKey = process.env.GEMINI_API_KEY;

  if (gcpProject) {
    const vertexAI = new VertexAI({
      project: gcpProject,
      location: gcpLocation,
    });
    cached = { type: "vertex", model: vertexAI.getGenerativeModel({ model: MODEL }) };
    return cached;
  }

  if (apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    cached = { type: "genai", model: genAI.getGenerativeModel({ model: MODEL }) };
    return cached;
  }

  throw new Error(
    "AI not configured: Set GCP_PROJECT_ID or GEMINI_API_KEY in .env.local"
  );
}
