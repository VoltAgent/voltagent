import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import type { Hono } from "hono";
import type { VoltAgentService } from "./voltagent.service";

/**
 * NestJS middleware that integrates VoltAgent console
 * Routes all /voltagent/* requests to the Hono app
 */
@Injectable()
export class VoltAgentMiddleware implements NestMiddleware {
  private honoApp?: Hono;
  private readonly routePrefix = "/voltagent";

  constructor(private readonly voltAgentService: VoltAgentService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Lazy initialize Hono app
      if (!this.honoApp) {
        this.honoApp = await this.voltAgentService.getHonoApp();
      }

      // Debug logging
      console.log("[VoltAgent Middleware] Incoming request:", {
        method: req.method,
        path: req.path,
        url: req.url,
        originalUrl: req.originalUrl,
      });

      // Strip the route prefix from the path for internal routing
      // Use originalUrl because req.path is modified by NestJS routing
      const originalPath = req.originalUrl.split("?")[0]; // Get path without query string
      const strippedPath = originalPath.replace(this.routePrefix, "") || "/";

      // Preserve query string from originalUrl
      const queryString = req.originalUrl.includes("?") ? `?${req.originalUrl.split("?")[1]}` : "";

      // Construct URL for Web Standard Request
      const url = `${req.protocol}://${req.get("host")}${strippedPath}${queryString}`;

      console.log("[VoltAgent Middleware] Forwarding to Hono:", {
        originalPath,
        strippedPath,
        queryString,
        finalUrl: url,
      });

      // Convert Express headers to Web Standard Headers
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value && key.toLowerCase() !== "host") {
          headers.set(key, Array.isArray(value) ? value[0] : value);
        }
      }

      // Set the correct host for the internal request
      const parsedUrl = new URL(url);
      headers.set("host", parsedUrl.host);

      // Handle request body for POST/PUT/PATCH
      let body: string | undefined;
      if (!["GET", "HEAD"].includes(req.method)) {
        // Check if body exists and has content
        if (req.body && Object.keys(req.body).length > 0) {
          body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
        }
      }

      // Create Web Standard Request
      const webRequest = new Request(url, {
        method: req.method,
        headers,
        body,
      });

      // Call Hono app's fetch method
      const webResponse = await this.honoApp.fetch(webRequest);

      console.log("[VoltAgent Middleware] Hono response:", {
        status: webResponse.status,
        contentType: webResponse.headers.get("content-type"),
      });

      // Convert Web Response to Express Response
      res.status(webResponse.status);

      // Copy headers from web response to express response
      webResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      // Handle different content types appropriately
      const contentType = webResponse.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const json = await webResponse.json();
        console.log("[VoltAgent Middleware] JSON response:", json);
        res.json(json);
      } else if (contentType.includes("text/html") || contentType.includes("text/plain")) {
        const text = await webResponse.text();
        res.send(text);
      } else {
        // Handle binary data
        const buffer = await webResponse.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (error) {
      console.error("[VoltAgent Middleware] Error:", error);
      next(error);
    }
  }
}
