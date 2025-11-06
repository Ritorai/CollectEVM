import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRedisAvailable } from "@/lib/redis";

export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: "ok",
      environment: process.env.NODE_ENV || "development",
      database: "connected",
      redis: isRedisAvailable() ? "connected" : "not configured",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        environment: process.env.NODE_ENV || "development",
        database: "error",
        redis: isRedisAvailable() ? "connected" : "not configured",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

