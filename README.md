# Trackio Backend

Backend server for the Trackio analytics platform. Handles data collection, processing, and API endpoints for the dashboard.

## Overview

Node.js backend that serves two main functions:

1. Processes analytics data from embedded tracker scripts
2. Provides API endpoints for the React dashboard

## Features

- Tracker script generation with obfuscation
- Real-time data processing for analytics events
- JWT and Google OAuth authentication
- Rate limiting and security headers
- MongoDB integration for data storage

## API Endpoints

- POST /api/track - Analytics data collection
- GET /api/analytics/:websiteId - Retrieve analytics data
- GET /api/websites - User's website list
- POST /api/auth/\* - Authentication endpoints

## Tracker Script

Websites embed the tracker with this script:

```html
<script>
  (function (a, n, a, l, y, t, i, c, s) {
    s = document.createElement("script");
    s.src =
      "http://localhost:5000/tracker.js?key=YOUR_API_KEY";
    s.async = 1;
    document.head.appendChild(s);
  })();
</script>
```
