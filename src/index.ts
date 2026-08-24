/**
 * Camera Monitor
 *
 * Lightweight RTSP camera availability monitor for
 * home and small office environments.
 *
 * Features:
 * - RTSP availability checks
 * - Automatic monitoring via Cloudflare Cron Triggers
 * - Web dashboard
 * - Telegram notifications
 * - Password-protected dashboard
 *
 * Repository:
 * https://github.com/fsdevcom2000/camera-monitor
 *
 * Author:
 * fsdevcom2000
 *
 * License:
 * MIT
 */


import { cameras } from "./cameras";
import { checkRTSP } from "./rtsp";

interface Env {
  CAMERA_STATUS: KVNamespace;

  ADMIN_PASSWORD: string;

  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
}


// Configuration

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

const SESSION_COOKIE = "camera_session";


// Authentication helpers


function getCookie(
  request: Request,
  name: string,
): string | null {

  const cookieHeader =
    request.headers.get("Cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookies =
    cookieHeader.split(";");

  for (const cookie of cookies) {

    const [key, ...value] =
      cookie.trim().split("=");

    if (key === name) {

      return decodeURIComponent(
        value.join("="),
      );

    }
  }

  return null;
}


async function createSession(
  env: Env,
): Promise<string> {

  const token =
    crypto.randomUUID() +
    "-" +
    crypto.randomUUID();

  const key =
    `session:${token}`;

  await env.CAMERA_STATUS.put(
    key,
    "authenticated",
    {
      expirationTtl:
        SESSION_TTL,
    },
  );

  return token;
}


async function isAuthenticated(
  request: Request,
  env: Env,
): Promise<boolean> {

  const token =
    getCookie(
      request,
      SESSION_COOKIE,
    );

  if (!token) {
    return false;
  }

  const key =
    `session:${token}`;

  const session =
    await env.CAMERA_STATUS.get(
      key,
    );

  return session ===
    "authenticated";
}


async function destroySession(
  request: Request,
  env: Env,
) {

  const token =
    getCookie(
      request,
      SESSION_COOKIE,
    );

  if (!token) {
    return;
  }

  await env.CAMERA_STATUS.delete(
    `session:${token}`,
  );
}


function redirectToLogin(
  request: Request,
): Response {

  const url =
    new URL(request.url);

  return Response.redirect(
    `${url.origin}/login`,
    302,
  );
}


function unauthorizedResponse():
  Response {

  return Response.json(
    {
      error:
        "Unauthorized",
    },
    {
      status: 401,
    },
  );
}


// Telegram

async function sendTelegramMessage(
  env: Env,
  message: string,
) {

  try {

    const response =
      await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            chat_id:
              env.TELEGRAM_CHAT_ID,

            text:
              message,
          }),
        },
      );


    if (!response.ok) {

      const text =
        await response.text();

      console.error(
        "[TELEGRAM ERROR]",
        text,
      );

    }

  } catch (error) {

    console.error(
      "[TELEGRAM EXCEPTION]",
      error,
    );

  }
}


// Camera monitoring

async function checkAllCameras(
  env: Env,
) {

  const results =
    await Promise.all(
      cameras.map(
        async (camera) => {

          const result =
            await checkRTSP(
              camera.host,
              camera.port,
            );


          const currentStatus =
            result.online &&
            result.rtsp
              ? "online"
              : "offline";


          const statusKey =
            `camera:${camera.id}`;


          const previousStatus =
            await env.CAMERA_STATUS.get(
              statusKey,
            );


          const changed =
            previousStatus !== null &&
            previousStatus !==
              currentStatus;


          await env.CAMERA_STATUS.put(
            statusKey,
            currentStatus,
          );


          return {
            camera,
            result,
            currentStatus,
            previousStatus,
            changed,
          };
        },
      ),
    );


  return results;
}


// Cron monitoring

async function runScheduledCheck(
  env: Env,
) {

  console.log(
    "Camera monitor cron started",
  );


  const results =
    await checkAllCameras(
      env,
    );


  for (
    const item
    of results
  ) {

    if (item.changed) {

      console.log(
        `[STATE CHANGE] ` +
        `${item.camera.name}: ` +
        `${item.previousStatus} -> ` +
        `${item.currentStatus}`,
      );


      const emoji =
        item.currentStatus ===
        "online"
          ? "🟢"
          : "🔴";


      const message =
        `${emoji} Camera status changed\n\n` +
        `Camera: ${item.camera.name}\n` +
        `Status: ${item.currentStatus.toUpperCase()}`;


      await sendTelegramMessage(
        env,
        message,
      );


    } else {

      console.log(
        `[NO CHANGE] ` +
        `${item.camera.name}: ` +
        `${item.currentStatus}`,
      );

    }

  }


  console.log(
    "Camera monitor cron finished",
  );
}


// Login page

function loginPage(
  error = "",
): Response {

  return new Response(
    `
<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<title>Login - IP Camera Monitor</title>

<style>

* {
  box-sizing: border-box;
}

body {

  margin: 0;

  min-height: 100vh;

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 20px;

  background: #0f172a;

  color: #f8fafc;

  font-family:
    Arial,
    sans-serif;
}

.login {

  width: 100%;

  max-width: 380px;

  background: #1e293b;

  padding: 30px;

  border-radius: 14px;

}

h1 {

  margin-top: 0;

  margin-bottom: 25px;

  text-align: center;

}

label {

  display: block;

  margin-bottom: 7px;

  color: #94a3b8;

}

input {

  width: 100%;

  padding: 12px;

  margin-bottom: 18px;

  border: 1px solid #475569;

  border-radius: 8px;

  background: #0f172a;

  color: #fff;

  font-size: 16px;

}

button {

  width: 100%;

  padding: 12px;

  border: 0;

  border-radius: 8px;

  background: #2563eb;

  color: white;

  font-size: 16px;

  cursor: pointer;
}

button:hover {

  background: #1d4ed8;
}

.error {

  margin-bottom: 18px;

  padding: 10px;

  border-radius: 8px;

  background: #450a0a;

  color: #fca5a5;

}

</style>

</head>

<body>

<div class="login">

  <h1>
    Authorization
  </h1>

  ${
    error
      ? `
        <div class="error">
          ${escapeHtmlServer(error)}
        </div>
      `
      : ""
  }

  <form method="POST" action="/login">

    <label>
      Password
    </label>

    <input
      type="password"
      name="password"
      autocomplete="current-password"
      required
      autofocus
    />

    <button type="submit">
      Login
    </button>

  </form>

</div>

</body>

</html>
`,
    {
      headers: {
        "Content-Type":
          "text/html; charset=UTF-8",
      },
    },
  );
}


function escapeHtmlServer(
  value: string,
): string {

  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// Dashboard

function dashboardPage(): Response {

  return new Response(
`
<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<title>IP Camera Monitor</title>

<style>

* {
  box-sizing: border-box;
}

body {

  margin: 0;

  padding: 30px;

  background: #0f172a;

  color: #f8fafc;

  font-family:
    Arial,
    sans-serif;
}


/* ==========================================================
   Main container
   ========================================================== */

.container {

  width: 100%;

  max-width: 1600px;

  margin: auto;
}


/* ==========================================================
   Header
   ========================================================== */

.header {

  margin-bottom: 25px;

  display: flex;

  justify-content:
    space-between;

  align-items:
    flex-start;

  gap: 20px;
}

.header h1 {

  margin: 0 0 8px 0;
}

.header p {

  margin: 0;

  color: #94a3b8;
}


/* ==========================================================
   Logout
   ========================================================== */

.logout {

  display: inline-block;

  padding:
    9px 14px;

  border-radius: 8px;

  background: #334155;

  color: white;

  text-decoration: none;

  font-size: 14px;
}

.logout:hover {

  background: #475569;
}


/* ==========================================================
   Summary
   ========================================================== */

.summary {

  display: flex;

  gap: 15px;

  margin-bottom: 15px;
}

.summary-item {

  background: #1e293b;

  border-radius: 10px;

  padding:
    15px 20px;

  min-width: 120px;
}

.summary-value {

  font-size: 24px;

  font-weight: bold;
}

.summary-label {

  color: #94a3b8;

  font-size: 13px;

  margin-top: 4px;
}


/* ==========================================================
   Last check
   ========================================================== */

.last-check {

  color: #94a3b8;

  margin-bottom: 20px;

  font-size: 14px;
}


/* ==========================================================
   Toolbar
   ========================================================== */

.toolbar {

  margin-bottom: 20px;
}


/* ==========================================================
   Camera grid
   ========================================================== */

.camera-grid {

  display: grid;

  grid-template-columns:
    repeat(
      auto-fit,
      minmax(
        240px,
        1fr
      )
    );

  gap: 15px;
}


/* ==========================================================
   Camera card
   ========================================================== */

.camera {

  background: #1e293b;

  border-radius: 14px;

  padding: 18px;

  min-width: 0;
}


/* ==========================================================
   Camera header
   ========================================================== */

.camera-header {

  display: flex;

  justify-content:
    space-between;

  align-items:
    flex-start;

  gap: 10px;
}

.camera-name {

  font-size: 18px;

  font-weight: bold;

  overflow-wrap: anywhere;
}


/* ==========================================================
   Status
   ========================================================== */

.status {

  font-size: 16px;

  font-weight: bold;

  white-space: nowrap;
}

.online {

  color: #22c55e;
}

.offline {

  color: #ef4444;
}

.warning {

  color: #eab308;
}


/* ==========================================================
   Details
   ========================================================== */

.details {

  margin-top: 15px;
}

.row {

  display: flex;

  justify-content:
    space-between;

  align-items:
    center;

  gap: 10px;

  padding: 8px 0;

  border-bottom:
    1px solid #334155;

  font-size: 14px;
}

.row:last-child {

  border-bottom: 0;
}

.label {

  color: #94a3b8;
}


/* ==========================================================
   Buttons
   ========================================================== */

button {

  margin-top: 15px;

  padding:
    9px 16px;

  border: 0;

  border-radius: 8px;

  background: #2563eb;

  color: white;

  font-size: 14px;

  cursor: pointer;
}

button:hover {

  background: #1d4ed8;
}

button:disabled {

  opacity: 0.6;

  cursor: wait;
}


/* ==========================================================
   Mobile
   ========================================================== */

@media (max-width: 600px) {

  body {

    padding: 15px;
  }


  .header {

    flex-direction:
      column;
  }


  .summary {

    flex-wrap: wrap;
  }


  .summary-item {

    flex: 1;

    min-width: 100px;
  }


  .camera-grid {

    grid-template-columns:
      1fr;
  }


  .camera {

    padding: 16px;
  }

}

</style>

</head>

<body>

<div class="container">


  <!-- ======================================================
       HEADER
       ====================================================== -->

  <div class="header">

    <div>

      <h1>
        IP Camera Monitor
      </h1>

      <p>
        RTSP camera availability monitor
      </p>

    </div>


    <a
      class="logout"
      href="/logout"
    >
      Logout
    </a>

  </div>


  <!-- ======================================================
       SUMMARY
       ====================================================== -->

  <div class="summary">

    <div class="summary-item">

      <div
        id="total"
        class="summary-value"
      >
        0
      </div>

      <div class="summary-label">
        Cameras
      </div>

    </div>


    <div class="summary-item">

      <div
        id="online"
        class="summary-value online"
      >
        0
      </div>

      <div class="summary-label">
        Online
      </div>

    </div>


    <div class="summary-item">

      <div
        id="offline"
        class="summary-value offline"
      >
        0
      </div>

      <div class="summary-label">
        Offline
      </div>

    </div>

  </div>


  <!-- ======================================================
       LAST CHECK
       ====================================================== -->

  <div
    id="last-check"
    class="last-check"
  >
    Last check: never
  </div>


  <!-- ======================================================
       TOOLBAR
       ====================================================== -->

  <div class="toolbar">

    <button
      data-check-all
      onclick="checkAll()"
    >
      Check all
    </button>

  </div>


  <!-- ======================================================
       CAMERAS
       ====================================================== -->

  <div
    id="cameras"
    class="camera-grid"
  ></div>


</div>


<script>

let cameraList = [];

let checkingAll = false;


// ==========================================================
// 							Load cameras
// ==========================================================

async function loadCameras() {

  const response =
    await fetch(
      "/api/cameras"
    );


  if (response.status === 401) {

    window.location.href =
      "/login";

    return;
  }


  if (!response.ok) {

    throw new Error(
      "Failed to load cameras"
    );

  }


  cameraList =
    await response.json();


  document
    .getElementById("total")
    .textContent =
      cameraList.length;


  renderCameras();
}


// ==========================================================
// 							Render cameras
// ==========================================================

function renderCameras() {

  const container =
    document.getElementById(
      "cameras"
    );


  container.innerHTML = "";


  for (
    const camera
    of cameraList
  ) {

    const element =
      document.createElement(
        "div"
      );


    element.className =
      "camera";


    element.innerHTML = \`

      <div class="camera-header">

        <div>

          <div class="camera-name">

            \${escapeHtml(
              camera.name
            )}

          </div>

        </div>


        <div
          id="status-\${camera.id}"
          class="status"
        >

          ⚪ Not checked

        </div>

      </div>


      <div
        id="details-\${camera.id}"
        class="details"
      >
      </div>


      <button
        id="button-\${camera.id}"
        onclick="checkCamera(
          '\${camera.id}'
        )"
      >

        Check

      </button>

    \`;


    container.appendChild(
      element
    );
  }
}


// ==========================================================
// 						Check single camera
// ==========================================================

async function checkCamera(
  id
) {

  const status =
    document.getElementById(
      "status-" + id
    );


  const details =
    document.getElementById(
      "details-" + id
    );


  const button =
    document.getElementById(
      "button-" + id
    );


  status.className =
    "status";


  status.textContent =
    "Checking...";


  button.disabled = true;


  try {

    const response =
      await fetch(
        "/api/check?id=" +
        encodeURIComponent(id)
      );


    if (response.status === 401) {

      window.location.href =
        "/login";

      return;
    }


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Request failed"
      );

    }


    renderCameraResult(
      data
    );


  } catch (error) {

    status.className =
      "status offline";


    status.textContent =
      "🔴 ERROR";


    details.innerHTML = \`

      <div class="row">

        <span class="label">
          Error
        </span>

        <span>

          \${escapeHtml(
            String(error)
          )}

        </span>

      </div>

    \`;

  } finally {

    button.disabled = false;

  }


  updateSummary();
}


// ==========================================================
// 						Render result
// ==========================================================

function renderCameraResult(
  data
) {

  const id =
    data.camera.id;


  const status =
    document.getElementById(
      "status-" + id
    );


  const details =
    document.getElementById(
      "details-" + id
    );


  if (!data.online) {

    status.className =
      "status offline";


    status.textContent =
      "🔴 OFFLINE";


    details.innerHTML = \`

      <div class="row">

        <span class="label">
          TCP
        </span>

        <span>
          Connection failed
        </span>

      </div>


      <div class="row">

        <span class="label">
          Error
        </span>

        <span>

          \${escapeHtml(
            data.error ||
            "Unknown error"
          )}

        </span>

      </div>

    \`;

    return;
  }


  if (!data.rtsp) {

    status.className =
      "status warning";


    status.textContent =
      "🟡 TCP ONLY";


    details.innerHTML = \`

      <div class="row">

        <span class="label">
          TCP
        </span>

        <span class="online">

          🟢
          \${data.tcpLatency}
          ms

        </span>

      </div>


      <div class="row">

        <span class="label">
          RTSP
        </span>

        <span class="warning">

          ⚠ No response

        </span>

      </div>

    \`;

    return;
  }


  status.className =
    "status online";


  status.textContent =
    "🟢 ONLINE";


  details.innerHTML = \`

    <div class="row">

      <span class="label">
        TCP
      </span>

      <span>

        \${data.tcpLatency}
        ms

      </span>

    </div>


    <div class="row">

      <span class="label">
        RTSP
      </span>

      <span class="online">

        🟢
        \${data.rtspCode}
        \${escapeHtml(
          data.rtspStatus || ""
        )}

      </span>

    </div>


    <div class="row">

      <span class="label">
        RTSP latency
      </span>

      <span>

        \${data.rtspLatency ?? "—"}
        ms

      </span>

    </div>

  \`;
}


// ==========================================================
// 							Check all
// ==========================================================

async function checkAll() {

  if (checkingAll) {

    return;
  }


  checkingAll = true;


  try {

    setCheckingState(
      true
    );


    const response =
      await fetch(
        "/api/check-all"
      );


    if (response.status === 401) {

      window.location.href =
        "/login";

      return;
    }


    if (!response.ok) {

      throw new Error(
        "Check all request failed"
      );

    }


    const data =
      await response.json();


    for (
      const result
      of data.cameras
    ) {

      renderCameraResult(
        result
      );

    }


    updateSummary();


    updateLastCheck(
      data.checkedAt,
      data.duration
    );


  } catch (error) {

    console.error(
      "Check all failed:",
      error
    );


  } finally {

    setCheckingState(
      false
    );


    checkingAll = false;

  }
}


// ==========================================================
// 							Button state
// ==========================================================

function setCheckingState(
  checking
) {

  const buttons =
    document.querySelectorAll(
      "button[data-check-all]"
    );


  buttons.forEach(
    (button) => {

      button.disabled =
        checking;


      button.textContent =
        checking
          ? "Checking..."
          : "Check all";

    },
  );
}


// ==========================================================
// 							Last check
// ==========================================================

function updateLastCheck(
  timestamp,
  duration
) {

  const element =
    document.getElementById(
      "last-check"
    );


  const date =
    new Date(timestamp);


  element.textContent =
    "Last check: " +
    date.toLocaleTimeString() +
    " • " +
    duration +
    " ms";
}


// ==========================================================
// 							Summary
// ==========================================================

function updateSummary() {

  let online = 0;

  let offline = 0;


  for (
    const camera
    of cameraList
  ) {

    const status =
      document.getElementById(
        "status-" +
        camera.id
      );


    if (
      status &&
      status.textContent
        .includes("ONLINE")
    ) {

      online++;

    } else if (
      status &&
      status.textContent
        .includes("OFFLINE")
    ) {

      offline++;

    }

  }


  document
    .getElementById("online")
    .textContent =
      online;


  document
    .getElementById("offline")
    .textContent =
      offline;
}


// ==========================================================
// 						HTML escaping
// ==========================================================

function escapeHtml(
  value
) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


// ==========================================================
// 						Start monitor
// ==========================================================

async function startMonitor() {

  try {

    await loadCameras();

    await checkAll();


    setInterval(
      checkAll,
      60000
    );


  } catch (error) {

    console.error(
      "Monitor startup failed:",
      error
    );

  }

}


startMonitor();

</script>

</body>

</html>
`,
    {
      headers: {
        "Content-Type":
          "text/html; charset=UTF-8",
      },
    },
  );
}


// ============================================================
// 							Worker
// ============================================================

export default {

  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {

    const url =
      new URL(request.url);


    // ========================================================
    // 						LOGIN
    // ========================================================

    if (
      url.pathname ===
      "/login"
    ) {

      // Already logged in

      if (
        await isAuthenticated(
          request,
          env,
        )
      ) {

        return Response.redirect(
          `${url.origin}/`,
          302,
        );
      }


      // POST login

      if (
        request.method ===
        "POST"
      ) {

        const formData =
          await request.formData();


        const password =
          formData.get(
            "password",
          );


        if (
          typeof password !==
          "string"
        ) {

          return loginPage(
            "Invalid password",
          );

        }


        if (
          password !==
          env.ADMIN_PASSWORD
        ) {

          return loginPage(
            "Invalid password",
          );

        }


        const session =
          await createSession(
            env,
          );


        return new Response(
          null,
          {
            status: 302,

            headers: {

              "Location":
                "/",

              "Set-Cookie":
                `${SESSION_COOKIE}=${encodeURIComponent(session)}; ` +
                `Path=/; ` +
                `HttpOnly; ` +
                `Secure; ` +
                `SameSite=Lax; ` +
                `Max-Age=${SESSION_TTL}`,

            },
          },
        );
      }


      return loginPage();
    }


    // ========================================================
    // 							LOGOUT
    // ========================================================

    if (
      url.pathname ===
      "/logout"
    ) {

      await destroySession(
        request,
        env,
      );


      return new Response(
        null,
        {
          status: 302,

          headers: {

            "Location":
              "/login",

            "Set-Cookie":
              `${SESSION_COOKIE}=; ` +
              `Path=/; ` +
              `HttpOnly; ` +
              `Secure; ` +
              `SameSite=Lax; ` +
              `Max-Age=0`,

          },
        },
      );
    }


    // ========================================================
    // 				API / Dashboard authorization
    // ========================================================

    const authenticated =
      await isAuthenticated(
        request,
        env,
      );


    if (!authenticated) {

      if (
        url.pathname.startsWith(
          "/api/"
        )
      ) {

        return unauthorizedResponse();
      }


      return redirectToLogin(
        request,
      );
    }


    // ========================================================
    // 						GET /api/cameras
    // ========================================================

    if (
      url.pathname ===
      "/api/cameras"
    ) {

      return Response.json(
        cameras,
      );
    }


    // ========================================================
    // 					GET /api/check?id=camera-01
    // ========================================================

    if (
      url.pathname ===
      "/api/check"
    ) {

      const id =
        url.searchParams.get(
          "id",
        );


      if (!id) {

        return Response.json(
          {
            error:
              "Camera ID is required",
          },
          {
            status: 400,
          },
        );
      }


      const camera =
        cameras.find(
          (camera) =>
            camera.id === id,
        );


      if (!camera) {

        return Response.json(
          {
            error:
              "Camera not found",
          },
          {
            status: 404,
          },
        );
      }


      const result =
        await checkRTSP(
          camera.host,
          camera.port,
        );


      return Response.json({

        camera: {

          id:
            camera.id,

          name:
            camera.name,

          host:
            camera.host,

          port:
            camera.port,

        },

        ...result,

      });
    }


    // ========================================================
    // 						GET /api/check-all
    // ========================================================

    if (
      url.pathname ===
      "/api/check-all"
    ) {

      const startedAt =
        Date.now();


      const results =
        await checkAllCameras(
          env,
        );


      return Response.json({

        checkedAt:
          new Date()
            .toISOString(),

        duration:
          Date.now() -
          startedAt,

        cameras:
          results.map(
            (item) => ({

              camera: {

                id:
                  item.camera.id,

                name:
                  item.camera.name,

                host:
                  item.camera.host,

                port:
                  item.camera.port,

              },

              ...item.result,

            }),
          ),
      });
    }


    // ========================================================
    // 							Dashboard
    // ========================================================

    return dashboardPage();
  },


  // ==========================================================
  // 						Scheduled Worker
  // ==========================================================

  async scheduled(
    controller:
      ScheduledController,

    env:
      Env,

    ctx:
      ExecutionContext,
  ) {

    await runScheduledCheck(
      env,
    );

  },

};