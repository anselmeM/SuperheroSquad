import { Response } from "express";
import { ZodError } from "zod";
import { createLogger } from "./config";

const logger = createLogger("errorHandler");

interface ApiError extends Error {
  status?: number;
  statusCode?: number;
  response?: any;
  code?: string;
}

export function handleApiError(res: Response, error: ApiError, resource: string, resourceId?: string) {
  const status = error.status || error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  if (error instanceof ZodError) {
    return res.status(502).json({
      error: "Invalid API response format",
      message: `The upstream API for ${resource} returned a malformed response`,
      details: error.errors,
    });
  }

  if (error instanceof TypeError && error.message?.includes("fetch")) {
    return res.status(503).json({
      error: "Service Unavailable",
      message: `Could not connect to the API for ${resource}`,
    });
  }

  if (error.response) {
    const statusCode = error.response.status || 502;
    if (statusCode === 404) {
      return res.status(404).json({
        error: `${resource} Not Found`,
        message: `No ${resource} found with ID: ${resourceId}`
      });
    } else if (statusCode === 401 || statusCode === 403) {
      return res.status(502).json({
        error: "API Authentication Error",
        message: "Could not authenticate with the Superhero API. The API key may be invalid or expired."
      });
    } else if (statusCode === 429) {
      return res.status(503).json({
        error: "API Rate Limit Exceeded",
        message: "The Superhero API rate limit has been exceeded. Please try again later."
      });
    } else {
      return res.status(502).json({
        error: "External API Error",
        message: `The Superhero API returned an error: ${statusCode} ${error.response.statusText}`
      });
    }
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(503).json({
      error: "Service Unavailable",
      message: `Connection to external API for ${resource} failed`,
      code: error.code
    });
  }

  logger.error(`Unexpected error for ${resource}${resourceId ? ` ${resourceId}` : ''}:`, error);
  return res.status(status).json({
    error: "Internal Server Error",
    message: `An unexpected error occurred while processing your request for ${resource}`,
  });
}
