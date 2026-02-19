const socketIo = require("socket.io");
const Analytics = require("../models/Analytics");
const Website = require("../models/Website");

const activeSessions = new Map();

function setupSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const apiKey =
        socket.handshake.auth.apiKey || socket.handshake.query.apiKey;

      if (!apiKey) {
        return next(new Error("API key required"));
      }

      const website = await Website.findOne({ apiKey });
      if (!website || !website.isActive) {
        return next(new Error("Invalid or inactive API key"));
      }

      socket.websiteId = website._id;
      socket.websiteApiKey = apiKey;
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    console.log(
      `[Socket] Client connected: ${socket.id} for website: ${socket.websiteId}`,
    );

    socket.on("start-session", async (data) => {
      try {
        const { sessionId, visitorId, pageUrl, pageTitle, ...sessionData } =
          data;

        if (activeSessions.has(sessionId)) {
          const existingSession = activeSessions.get(sessionId);
          existingSession.lastActivity = Date.now();
          existingSession.socketId = socket.id;
          existingSession.data = { ...existingSession.data, ...sessionData };
          activeSessions.set(sessionId, existingSession);
        } else {
          activeSessions.set(sessionId, {
            socketId: socket.id,
            websiteId: socket.websiteId,
            visitorId,
            sessionId,
            startTime: Date.now(),
            lastActivity: Date.now(),
            data: {
              pageUrl,
              pageTitle,
              ...sessionData,
            },
          });
        }

        socket.join(`website-${socket.websiteId}`);

        io.to(`website-${socket.websiteId}`).emit("active-sessions-update", {
          activeCount: getActiveSessionsCount(socket.websiteId),
          sessions: getActiveSessionsForWebsite(socket.websiteId),
        });

        console.log(
          `[Socket] Session started: ${sessionId} for website: ${socket.websiteId}`,
        );
      } catch (error) {
        console.error("[Socket] Error in start-session:", error);
      }
    });

    socket.on("page-view", async (data) => {
      try {
        const { sessionId, pageUrl, pageTitle } = data;

        if (activeSessions.has(sessionId)) {
          const session = activeSessions.get(sessionId);
          session.lastActivity = Date.now();
          session.data.pageUrl = pageUrl;
          session.data.pageTitle = pageTitle;
          activeSessions.set(sessionId, session);

          io.to(`website-${socket.websiteId}`).emit("active-sessions-update", {
            activeCount: getActiveSessionsCount(socket.websiteId),
            sessions: getActiveSessionsForWebsite(socket.websiteId),
          });
        }
      } catch (error) {
        console.error("[Socket] Error in page-view:", error);
      }
    });

    socket.on("heartbeat", async (data) => {
      try {
        const { sessionId } = data;

        if (activeSessions.has(sessionId)) {
          const session = activeSessions.get(sessionId);
          session.lastActivity = Date.now();
          activeSessions.set(sessionId, session);
        }
      } catch (error) {
        console.error("[Socket] Error in heartbeat:", error);
      }
    });

    socket.on("disconnect", async () => {
      try {
        console.log(`[Socket] Client disconnected: ${socket.id}`);

        let endedSessions = [];
        for (const [sessionId, session] of activeSessions.entries()) {
          if (session.socketId === socket.id) {
            const duration = Math.round((Date.now() - session.startTime) / 1000);

            await Analytics.updateMany(
              {
                websiteId: session.websiteId,
                sessionId: sessionId,
                sessionDuration: null,
              },
              {
                $set: {
                  sessionDuration: duration,
                  lastActivity: new Date(),
                },
              },
            );

            activeSessions.delete(sessionId);
            endedSessions.push({ sessionId, duration });
          }
        }

        if (endedSessions.length > 0) {
          io.to(`website-${socket.websiteId}`).emit("active-sessions-update", {
            activeCount: getActiveSessionsCount(socket.websiteId),
            sessions: getActiveSessionsForWebsite(socket.websiteId),
          });

          console.log(
            `[Socket] Sessions ended for socket ${socket.id}:`,
            endedSessions,
          );
        }
      } catch (error) {
        console.error("[Socket] Error in disconnect:", error);
      }
    });
  });

  setInterval(() => {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000;

    for (const [sessionId, session] of activeSessions.entries()) {
      if (now - session.lastActivity > inactiveThreshold) {
        (async () => {
          try {
            const duration = now - session.startTime;

            await Analytics.updateMany(
              {
                websiteId: session.websiteId,
                sessionId: sessionId,
                sessionDuration: null,
              },
              {
                $set: {
                  sessionDuration: duration,
                  lastActivity: new Date(),
                },
              },
            );

            activeSessions.delete(sessionId);

            io.to(`website-${session.websiteId}`).emit(
              "active-sessions-update",
              {
                activeCount: getActiveSessionsCount(session.websiteId),
                sessions: getActiveSessionsForWebsite(session.websiteId),
              },
            );

            console.log(`[Socket] Inactive session cleaned up: ${sessionId}`);
          } catch (error) {
            console.error(
              "[Socket] Error cleaning up inactive session:",
              error,
            );
          }
        })();
      }
    }
  }, 60000);

  function getActiveSessionsCount(websiteId) {
    let count = 0;
    for (const session of activeSessions.values()) {
      if (session.websiteId.toString() === websiteId.toString()) {
        count++;
      }
    }
    return count;
  }

  function getActiveSessionsForWebsite(websiteId) {
    const sessions = [];
    for (const [sessionId, session] of activeSessions.entries()) {
      if (session.websiteId.toString() === websiteId.toString()) {
        sessions.push({
          sessionId,
          visitorId: session.visitorId,
          startTime: session.startTime,
          lastActivity: session.lastActivity,
          duration: Date.now() - session.startTime,
          ...session.data,
        });
      }
    }
    return sessions;
  }

  io.getActiveSessionsCount = getActiveSessionsCount;
  io.getActiveSessionsForWebsite = getActiveSessionsForWebsite;

  return io;
}

module.exports = setupSocket;
