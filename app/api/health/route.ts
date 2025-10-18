/**
 * Health Check Endpoint
 *
 * Simple health check for Docker and monitoring systems.
 */
export async function GET() {
  // Note: We intentionally don't log health checks to avoid cluttering logs
  // Health checks run frequently (every 30s by Docker)
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
}
