(function () {
  var API_KEY = window.ANALYTICS_CONFIG?.API_KEY || "";
  var TRACKER_URL = window.ANALYTICS_CONFIG?.TRACKER_URL || "";
  var SOCKET_URL =
    window.ANALYTICS_CONFIG?.SOCKET_URL || window.location.origin;
  var SESSION_DURATION =
    window.ANALYTICS_CONFIG?.SESSION_DURATION || 60 * 60 * 1000;

  var IP_SERVICES = ["https://ipinfo.io/json"];

  var socket = null;
  var heartbeatInterval = null;
  var socketConnected = false;
  var analyticsData = null;

  var STORAGE_KEYS = {
    VISITOR_ID: "x7f3q9p2",
    SESSION_ID: "k5m8r1t4",
    LAST_ACTIVITY: "n2j6s9v3",
    SESSION_START: "b4w8q5z1",
  };

  function encodeValue(value) {
    if (value === null || value === undefined) return "";
    var strValue = typeof value === "number" ? value.toString() : value;
    try {
      return btoa(unescape(encodeURIComponent(strValue)));
    } catch (e) {
      return strValue;
    }
  }

  function decodeValue(encodedValue) {
    if (!encodedValue) return null;
    try {
      return decodeURIComponent(escape(atob(encodedValue)));
    } catch (e) {
      return encodedValue;
    }
  }

  function getLocalStorage(key) {
    var encodedKey = STORAGE_KEYS[key];
    var encodedValue = localStorage.getItem(encodedKey);
    return encodedValue ? decodeValue(encodedValue) : null;
  }

  function setLocalStorage(key, value) {
    var encodedKey = STORAGE_KEYS[key];
    var encodedValue = encodeValue(value);
    localStorage.setItem(encodedKey, encodedValue);
  }

  function getSessionStorage(key) {
    var encodedKey = STORAGE_KEYS[key];
    var encodedValue = sessionStorage.getItem(encodedKey);
    return encodedValue ? decodeValue(encodedValue) : null;
  }

  function setSessionStorage(key, value) {
    var encodedKey = STORAGE_KEYS[key];
    var encodedValue = encodeValue(value);
    sessionStorage.setItem(encodedKey, encodedValue);
  }

  function getVisitorId() {
    var visitorId = getLocalStorage("VISITOR_ID");
    if (!visitorId) {
      visitorId =
        "vis_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
      setLocalStorage("VISITOR_ID", visitorId);
    }
    return visitorId;
  }

  function getSessionId() {
    var sessionId = getSessionStorage("SESSION_ID");
    var lastActivity = getSessionStorage("LAST_ACTIVITY");
    var now = Date.now();

    if (!sessionId || !lastActivity || now - lastActivity > SESSION_DURATION) {
      sessionId = "ses_" + Math.random().toString(36).substr(2, 9) + "_" + now;
      setSessionStorage("SESSION_ID", sessionId);
      setSessionStorage("SESSION_START", now);
    }

    setSessionStorage("LAST_ACTIVITY", now);
    return sessionId;
  }

  function getGPUInfo() {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function testNetworkSpeed() {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const img = new Image();
      const imageUrl =
        "https://www.google.com/images/phd/px.gif?t=" + Date.now();

      img.onload = function () {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        const speedMbps = ((0.1 * 8) / duration).toFixed(2);
        resolve(parseFloat(speedMbps));
      };

      img.onerror = function () {
        resolve(null);
      };

      img.src = imageUrl;
    });
  }

  function getBatteryInfo() {
    if ("getBattery" in navigator) {
      return navigator.getBattery().then(function (battery) {
        return {
          level: battery.level,
          charging: battery.charging,
        };
      });
    }
    return Promise.resolve({ level: null, charging: null });
  }

  function getIPAddress() {
    return new Promise(function (resolve) {
      var localIP = getLocalIP();

      var currentServiceIndex = 0;

      function tryNextService() {
        if (currentServiceIndex >= IP_SERVICES.length) {
          resolve({
            ip: localIP || "unknown",
          });
          return;
        }

        var serviceUrl = IP_SERVICES[currentServiceIndex];

        var timeoutId = setTimeout(function () {
          currentServiceIndex++;
          tryNextService();
        }, 3000);

        fetch(serviceUrl, {
          mode: "cors",
          headers: {
            Accept: "application/json",
          },
        })
          .then(function (response) {
            clearTimeout(timeoutId);
            return response.json();
          })
          .then(function (data) {
            clearTimeout(timeoutId);
            var ip = data.ip || data.query || data.ipAddress;
            if (ip) {
              var result = {
                ip: ip,
                ipSource: serviceUrl.split("/")[2],
              };

              if (data.country) result.country = data.country;
              if (data.city) result.city = data.city;
              if (data.region) result.region = data.region;
              if (data.country_name) result.country = data.country_name;
              if (data.org) result.isp = data.org;

              resolve(result);
            } else {
              currentServiceIndex++;
              tryNextService();
            }
          })
          .catch(function () {
            clearTimeout(timeoutId);
            currentServiceIndex++;
            tryNextService();
          });
      }

      tryNextService();
    });
  }

  function getLocalIP() {
    return new Promise(function (resolve) {
      if (!window.RTCPeerConnection) {
        resolve(null);
        return;
      }

      var pc = new RTCPeerConnection({ iceServers: [] });
      var localIP = null;

      pc.createDataChannel("");
      pc.createOffer()
        .then(function (offer) {
          return pc.setLocalDescription(offer);
        })
        .catch(function () {
          resolve(null);
        });

      pc.onicecandidate = function (event) {
        if (event.candidate) {
          var ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
          var ipMatch = ipRegex.exec(event.candidate.candidate);
          if (ipMatch) {
            localIP = ipMatch[1];
            if (
              /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(localIP)
            ) {
              resolve(localIP);
            }
          }
        } else {
          resolve(null);
        }
      };

      setTimeout(function () {
        pc.close();
        resolve(null);
      }, 2000);
    });
  }

  function parseUserAgent(ua) {
    var result = {
      os: "Unknown",
      device: "Unknown",
    };

    if (ua.indexOf("Windows") > -1) {
      result.os = "Windows";
      if (ua.indexOf("Windows NT 10.0") > -1) result.osVersion = "10";
      else if (ua.indexOf("Windows NT 6.3") > -1) result.osVersion = "8.1";
      else if (ua.indexOf("Windows NT 6.2") > -1) result.osVersion = "8";
      else if (ua.indexOf("Windows NT 6.1") > -1) result.osVersion = "7";
    } else if (ua.indexOf("Mac OS X") > -1) {
      result.os = "macOS";
      var match = ua.match(/Mac OS X ([0-9_]+)/);
      if (match) result.osVersion = match[1].replace(/_/g, ".");
    } else if (ua.indexOf("Linux") > -1) {
      result.os = "Linux";
    } else if (ua.indexOf("Android") > -1) {
      result.os = "Android";
      var match = ua.match(/Android ([0-9.]+)/);
      if (match) result.osVersion = match[1];
    } else if (
      ua.indexOf("iOS") > -1 ||
      ua.indexOf("iPhone") > -1 ||
      ua.indexOf("iPad") > -1
    ) {
      result.os = "iOS";
      var match = ua.match(/OS ([0-9_]+)/);
      if (match) result.osVersion = match[1].replace(/_/g, ".");
    }

    var screenWidth = screen.width || window.innerWidth;
    if (screenWidth < 900) {
      result.device = "mobile";
    } else {
      result.device = "desktop";
    }

    return result;
  }

  function collectData() {
    var uaInfo = parseUserAgent(navigator.userAgent);

    var data = {
      apiKey: API_KEY,
      sessionId: getSessionId(),
      visitorId: getVisitorId(),

      userAgent: navigator.userAgent,
      os: uaInfo.os,
      osVersion: uaInfo.osVersion,
      device: uaInfo.device,
      gpu: getGPUInfo(),
      speed: null,

      screenResolution: {
        width: screen.width,
        height: screen.height,
      },

      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

      referrer: document.referrer,
      pageUrl: window.location.href,
      pageTitle: document.title,
      timestamp: new Date().toISOString(),
    };

    return Promise.all([
      getBatteryInfo(),
      getIPAddress(),
      testNetworkSpeed(),
    ]).then(function (results) {
      var batteryInfo = results[0];
      var ipInfo = results[1];
      var speedValue = results[2];

      data.batteryLevel = batteryInfo.level;
      data.batteryCharging = batteryInfo.charging;
      data.speed = speedValue || "notworking";

      data.ipAddress = ipInfo.ip;
      if (ipInfo.country) data.country = ipInfo.country;
      if (ipInfo.city) data.city = ipInfo.city;
      if (ipInfo.region) data.region = ipInfo.region;
      if (ipInfo.isp) data.isp = ipInfo.isp;

      return data;
    });
  }

  function sendData(data) {
    if (!TRACKER_URL || !API_KEY) {
      console.warn("Analytics not properly configured");
      return Promise.reject("Analytics not configured");
    }

    return fetch(TRACKER_URL, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then(function (response) {
        if (!response.ok) {
          console.warn("Analytics tracking failed:", response.status);
        }
        return response;
      })
      .catch(function (error) {
        console.error("Analytics error:", error);
      });
  }

  function initializeSocket() {
    if (typeof io === "undefined") {
      console.error("[Analytics] Socket.IO not loaded!");
      collectData().then(sendData);
      return;
    }

    try {
      socket = io(SOCKET_URL, {
        auth: {
          apiKey: API_KEY,
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      socket.on("connect", function () {
        socketConnected = true;

        collectData().then(function (data) {
          analyticsData = data;

          socket.emit("start-session", {
            sessionId: data.sessionId,
            visitorId: data.visitorId,
            pageUrl: data.pageUrl,
            pageTitle: data.pageTitle,
            ...data,
          });

          sendData(data);
        });

        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(function () {
          if (socketConnected) {
            socket.emit("heartbeat", {
              sessionId: getSessionId(),
            });
          }
        }, 30000);
      });

      socket.on("disconnect", function (reason) {
        socketConnected = false;
      });

      socket.on("connect_error", function (error) {
        console.warn("[Analytics] Socket connection error:", error.message);
        socketConnected = false;
        collectData().then(sendData);
      });
    } catch (error) {
      console.warn("[Analytics] Failed to initialize socket:", error);
      collectData().then(sendData);
    }
  }

  function loadDependencies() {
    if (typeof io !== "undefined") {
      initializeSocket();
      return;
    }

    var script = document.createElement("script");
    script.src = "https://cdn.socket.io/4.5.4/socket.io.min.js";
    script.crossOrigin = "anonymous";
    script.async = false;

    script.onload = function () {
      initializeSocket();
    };

    script.onerror = function () {
      console.error(
        "[Analytics] Failed to load Socket.IO, falling back to regular tracking",
      );
      collectData().then(sendData);
    };

    document.head.appendChild(script);
  }

  function init() {
    if (!API_KEY || !TRACKER_URL) {
      console.error("Analytics API key or URL missing");
      return;
    }

    loadDependencies();

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") {
        collectData().then(function (data) {
          if (socketConnected && socket) {
            socket.emit("page-view", {
              sessionId: data.sessionId,
              pageUrl: data.pageUrl,
              pageTitle: data.pageTitle,
            });
          }
          sendData(data);
        });
      }
    });

    var resizeTimeout;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        collectData().then(sendData);
      }, 1000);
    });

    window.addEventListener("beforeunload", function () {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (socket) {
        socket.disconnect();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.analytics = {
    collectData: collectData,
    sendData: sendData,
    getVisitorId: getVisitorId,
    getSessionId: getSessionId,
    getSessionDuration: function () {
      var start = getSessionStorage("SESSION_START");
      return start ? Date.now() - parseInt(start) : 0;
    },
    _helpers: {
      encodeValue: encodeValue,
      decodeValue: decodeValue,
      getLocalStorage: getLocalStorage,
      setLocalStorage: setLocalStorage,
      getSessionStorage: getSessionStorage,
      setSessionStorage: setSessionStorage,
    },
  };
})();
