import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "VideoTube API",
      version: "1.0.0",
      description: "A YouTube-like video sharing platform API",
      contact: {
        name: "API Support",
        email: "support@videotube.example.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "API v1 (current)",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
          description: "JWT access token in httpOnly cookie",
        },
        csrfToken: {
          type: "apiKey",
          in: "header",
          name: "x-csrf-token",
          description: "CSRF token for mutating requests",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            statusCode: { type: "integer", example: 400 },
            message: { type: "string", example: "Validation failed" },
            errors: {
              type: "array",
              items: { type: "string" },
              example: ["email is required", "password must be at least 8 characters"],
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            statusCode: { type: "integer", example: 200 },
            message: { type: "string", example: "Operation successful" },
            data: { type: "object" },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439011" },
            fullName: { type: "string", example: "John Doe" },
            username: { type: "string", example: "johndoe" },
            email: { type: "string", format: "email", example: "john@example.com" },
            avatar: { type: "string", format: "uri", example: "https://res.cloudinary.com/.../avatar.jpg" },
            coverImage: { type: "string", format: "uri" },
            subscribersCount: { type: "integer", example: 1250 },
            channelsSubscribedToCount: { type: "integer", example: 42 },
            isEmailVerified: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Video: {
          type: "object",
          properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439012" },
            title: { type: "string", example: "How to build a REST API" },
            description: { type: "string", example: "Learn REST API best practices..." },
            videoFile: { type: "string", format: "uri" },
            thumbnail: { type: "string", format: "uri" },
            duration: { type: "number", example: 642 },
            views: { type: "integer", example: 15420 },
            isPublished: { type: "boolean", example: true },
            owner: { $ref: "#/components/schemas/User" },
            tags: { type: "array", items: { type: "string" }, example: ["tutorial", "api", "nodejs"] },
            category: { type: "string", example: "Education" },
            hlsUrl: { type: "string", format: "uri" },
            qualities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  resolution: { type: "string", example: "720p" },
                  url: { type: "string", format: "uri" },
                  bitrate: { type: "integer", example: 2500 },
                },
              },
            },
            transcodingStatus: { type: "string", enum: ["pending", "processing", "completed", "failed"], example: "completed" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Playlist: {
          type: "object",
          properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439013" },
            name: { type: "string", example: "My Favorites" },
            description: { type: "string", example: "Collection of my favorite videos" },
            videos: { type: "array", items: { $ref: "#/components/schemas/Video" } },
            owner: { $ref: "#/components/schemas/User" },
            visibility: { type: "string", enum: ["public", "private", "unlisted"], example: "public" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Comment: {
          type: "object",
          properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439014" },
            content: { type: "string", example: "Great video!" },
            video: { type: "string", example: "507f1f77bcf86cd799439012" },
            owner: { $ref: "#/components/schemas/User" },
            likesCount: { type: "integer", example: 15 },
            isLiked: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        PaginatedResponse: {
          type: "object",
          properties: {
            docs: { type: "array", items: { type: "object" } },
            total: { type: "integer", example: 150 },
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            totalPages: { type: "integer", example: 8 },
            hasNextPage: { type: "boolean", example: true },
            hasPrevPage: { type: "boolean", example: false },
          },
        },
      },
    },
    security: [{ cookieAuth: [], csrfToken: [] }],
    tags: [
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Users", description: "User profile & settings" },
      { name: "Videos", description: "Video CRUD & streaming" },
      { name: "Playlists", description: "Playlist management" },
      { name: "Comments", description: "Video comments" },
      { name: "Likes", description: "Like/dislike videos & comments" },
      { name: "Subscriptions", description: "Channel subscriptions" },
      { name: "Playlists", description: "Playlist management" },
      { name: "Dashboard", description: "Creator dashboard & analytics" },
      { name: "Admin", description: "Admin panel endpoints" },
      { name: "Health", description: "Health check endpoints" },
    ],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js"],
};

export default swaggerJSDoc(options);