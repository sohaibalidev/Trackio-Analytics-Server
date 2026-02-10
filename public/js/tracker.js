(function () {
  var API_KEY = window.ANALYTICS_CONFIG?.API_KEY || "";
  var TRACKER_URL = window.ANALYTICS_CONFIG?.TRACKER_URL || "";
  var SESSION_END_URL = window.ANALYTICS_CONFIG?.SESSION_END_URL || "";
  var SESSION_DURATION =
    window.ANALYTICS_CONFIG?.SESSION_DURATION || 60 * 60 * 1000;

  var IP_SERVICES = [
    "https://api.ipify.org?format=json",
    "https://api64.ipify.org?format=json",
    "https://ipapi.co/json/",
    "https://ipinfo.io/json",
    "https://api.myip.com",
  ];

  var sessionStartTime = null;

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

  function removeSessionStorage(key) {
    var encodedKey = STORAGE_KEYS[key];
    sessionStorage.removeItem(encodedKey);
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

      sessionStartTime = now;
      setSessionStorage("SESSION_START", now);
    } else {
      sessionStartTime = getSessionStorage("SESSION_START") || now;
    }

    setSessionStorage("LAST_ACTIVITY", now);
    return sessionId;
  }

  function getSessionDuration() {
    if (!sessionStartTime) {
      sessionStartTime = getSessionStorage("SESSION_START") || Date.now();
    }
    return Date.now() - sessionStartTime;
  }

  function sendSessionEndData() {
    var sessionId = getSessionStorage("SESSION_ID");
    var duration = getSessionDuration();

    if (sessionId && duration > 0) {
      var data = {
        apiKey: API_KEY,
        sessionId: sessionId,
        duration: duration,
      };

      if (navigator.sendBeacon) {
        var blob = new Blob([JSON.stringify(data)], {
          type: "application/json",
        });
        return navigator.sendBeacon(SESSION_END_URL, blob);
      } else {
        return fetch(SESSION_END_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
      }
    }
    return false;
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
            ipSource: localIP ? "local" : "unknown",
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

  function getEnvironmentInfo() {
    var info = {
      doNotTrack: navigator.doNotTrack || window.doNotTrack,
      deviceMemory: navigator.deviceMemory || "unknown",
      connection: {},
    };

    if (navigator.connection) {
      info.connection = {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
      };
    }

    return info;
  }

  function parseUserAgent(ua) {
    var result = {
      browser: "Unknown",
      browserVersion: "Unknown",
      os: "Unknown",
      device: "Unknown",
    };

    if (
      ua.indexOf("Chrome") > -1 &&
      ua.indexOf("Edg") === -1 &&
      ua.indexOf("OPR") === -1
    ) {
      result.browser = "Chrome";
      var match = ua.match(/Chrome\/([0-9.]+)/);
      if (match) result.browserVersion = match[1];
    } else if (ua.indexOf("Firefox") > -1) {
      result.browser = "Firefox";
      var match = ua.match(/Firefox\/([0-9.]+)/);
      if (match) result.browserVersion = match[1];
    } else if (ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") === -1) {
      result.browser = "Safari";
      var match = ua.match(/Version\/([0-9.]+)/);
      if (match) result.browserVersion = match[1];
    } else if (ua.indexOf("Edg") > -1) {
      result.browser = "Edge";
      var match = ua.match(/Edg\/([0-9.]+)/);
      if (match) result.browserVersion = match[1];
    } else if (ua.indexOf("OPR") > -1) {
      result.browser = "Opera";
      var match = ua.match(/OPR\/([0-9.]+)/);
      if (match) result.browserVersion = match[1];
    }

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
    if (screenWidth < 768) {
      result.device = "mobile";
    } else if (screenWidth < 1024) {
      result.device = "tablet";
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
      browser: uaInfo.browser,
      browserVersion: uaInfo.browserVersion,
      os: uaInfo.os,
      osVersion: uaInfo.osVersion,
      device: uaInfo.device,

      screenResolution: {
        width: screen.width,
        height: screen.height,
      },
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },

      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

      referrer: document.referrer,
      pageUrl: window.location.href,
      pageTitle: document.title,
      timestamp: new Date().toISOString(),

      environment: getEnvironmentInfo(),
    };

    return Promise.all([getBatteryInfo(), getIPAddress()]).then(
      function (results) {
        var batteryInfo = results[0];
        var ipInfo = results[1];

        data.batteryLevel = batteryInfo.level;
        data.batteryCharging = batteryInfo.charging;

        data.ipAddress = ipInfo.ip;
        data.ipSource = ipInfo.ipSource;
        if (ipInfo.country) data.country = ipInfo.country;
        if (ipInfo.city) data.city = ipInfo.city;
        if (ipInfo.region) data.region = ipInfo.region;
        if (ipInfo.isp) data.isp = ipInfo.isp;

        return data;
      },
    );
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

  function init() {
    if (!API_KEY || !TRACKER_URL) {
      console.error("Analytics API key or URL missing");
      return;
    }

    setTimeout(function () {
      collectData().then(function (data) {
        return sendData(data);
      });
    }, 500);

    document.addEventListener("visibilitychange", function () {
      setTimeout(function () {
        collectData().then(sendData);
      }, 1000);
    });

    var resizeTimeout;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        collectData().then(sendData);
      }, 1000);
    });

    window.addEventListener("beforeunload", function () {
      sendSessionEndData();
    });

    window.addEventListener("unload", function () {
      sendSessionEndData();
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
    sendSessionEndData: sendSessionEndData,
    getVisitorId: getVisitorId,
    getSessionId: getSessionId,
    getSessionDuration: getSessionDuration,
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
